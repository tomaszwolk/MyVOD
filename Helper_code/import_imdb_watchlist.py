import os
import csv
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone
from supabase import create_client, Client


# --- CONFIGURATION ---
# UUID or ID of the user in the Django `users_user` table to whom the watchlist will be assigned.
# Can be either: UUID (direct) or integer Django user ID (will be resolved to UUID)
DJANGO_USER_ID = "f37d6a22-6362-4a0d-808b-fde7e7faa1d7"

# Filename of the IMDb watchlist CSV export.
# This file should be placed in the IMDB_DATA_SET_LITE_DIR directory.
WATCHLIST_FILENAME = 'watchlist_tw.csv'

# Directory containing the IMDb dataset.
IMDB_DATA_SET_LITE_DIR = Path(__file__).parent.parent / "IMDB_data_set_lite"
# --- END CONFIGURATION ---


def get_supabase_client() -> Client:
    """Initializes and returns the Supabase client."""
    env_path = Path(__file__).parent.parent / "myVOD" / "backend" / ".env"

    if not os.path.exists(env_path):
        print(f"Warning: .env file not found at {env_path}")
        load_dotenv()
    else:
        load_dotenv(dotenv_path=env_path)

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.")

    return create_client(supabase_url, supabase_key)


def get_user_uuid(supabase: Client, user_id: str) -> str | None:
    """
    Retrieves the user UUID from Django's users_user table.
    Since the app uses Django Auth + JWT (not Supabase Auth),
    the user UUID is stored directly in the Django users table.
    """
    try:
        # Check if the input looks like a UUID (36 characters with dashes)
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if re.match(uuid_pattern, user_id):
            # Input is already a UUID - verify it exists in Django users table
            user_response = supabase.table('users_user').select('id').eq('id', user_id).execute()
            if user_response.data:
                print(f"Using provided UUID directly: {user_id}")
                return user_id
            else:
                print(f"UUID {user_id} not found in users_user table")
                return None

        # Otherwise, treat as integer Django user ID
        try:
            django_user_id = int(user_id)
        except ValueError:
            print(f"Invalid user identifier: {user_id}. Must be UUID or integer.")
            return None

        # Get UUID from Django's users_user table
        user_response = supabase.table('users_user').select('id').eq('id', django_user_id).execute()

        if not user_response.data:
            print(f"No user found in users_user with ID {django_user_id}")
            return None

        uuid = user_response.data[0]['id']
        print(f"Resolved Django user ID {django_user_id} to UUID: {uuid}")
        return uuid

    except Exception as e:
        print(f"An error occurred while fetching user UUID: {e}")
        return None


def load_valid_tconsts(basics_path: Path) -> set[str]:
    """Loads all tconst from title.basics.tsv into a set for quick lookup."""
    tconsts = set()
    try:
        with open(basics_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            next(reader)  # Skip header
            for row in reader:
                if row and len(row) > 0:
                    tconsts.add(row[0])
        print(f"Loaded {len(tconsts)} valid tconsts from title.basics.tsv.")
    except Exception as e:
        print(f"Error loading title.basics.tsv: {e}")
    return tconsts


def get_movies_from_watchlist(watchlist_path: Path) -> dict[str, str]:
    """Reads the IMDb watchlist CSV and returns a dict of tconst -> created_date."""
    movies = {}
    try:
        with open(watchlist_path, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                if 'Const' in row and 'Created' in row:
                    tconst = row['Const']
                    created_date = row['Created']
                    if created_date and created_date.strip():
                        # Convert YYYY-MM-DD to ISO timestamp format
                        try:
                            # Parse the date and create a full timestamp
                            from datetime import datetime
                            date_obj = datetime.strptime(created_date.strip(), '%Y-%m-%d')
                            # Create ISO format timestamp with midnight time and UTC timezone
                            iso_timestamp = date_obj.strftime('%Y-%m-%dT00:00:00.000Z')
                            movies[tconst] = iso_timestamp
                        except ValueError:
                            print(f"Warning: Invalid date format '{created_date}' for movie {tconst}, using current timestamp")
                            movies[tconst] = None
                    else:
                        print(f"Warning: Empty created date for movie {tconst}, will use current timestamp")
                        movies[tconst] = None
    except FileNotFoundError:
        print(f"Watchlist file not found at: {watchlist_path}")
    return movies


def filter_existing_movies(supabase: Client, movies_dict: dict[str, str]) -> dict[str, str]:
    """
    Filters a dict of tconst -> created_date, returning only those that exist in the 'movie' table.
    """
    if not movies_dict:
        return {}

    tconsts = list(movies_dict.keys())
    try:
        response = supabase.table('movie').select('tconst').in_('tconst', tconsts).execute()
        if response.data:
            existing_tconsts = {row['tconst'] for row in response.data}
            return {tconst: created_date for tconst, created_date in movies_dict.items() if tconst in existing_tconsts}
        return {}
    except Exception as e:
        print(f"An error occurred while filtering movies: {e}")
        return {}


def main():
    """
    Main function to import IMDb watchlist into the user_movie table.
    """
    print("Starting IMDb watchlist import process...")

    try:
        supabase = get_supabase_client()
        print("Supabase client initialized.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
        return

    # Get user UUID for the configured Django user ID
    user_uuid = get_user_uuid(supabase, DJANGO_USER_ID)
    if not user_uuid:
        print(f"Could not resolve user UUID for {DJANGO_USER_ID}. Aborting.")
        return

    print(f"Successfully resolved user ID {DJANGO_USER_ID} to UUID: {user_uuid}")

    # Read movie tconsts and created dates from the watchlist CSV
    watchlist_path = IMDB_DATA_SET_LITE_DIR / WATCHLIST_FILENAME
    watchlist_movies = get_movies_from_watchlist(watchlist_path)
    if not watchlist_movies:
        print("No movies found in the watchlist file. Aborting.")
        return

    print(f"Found {len(watchlist_movies)} movies in '{WATCHLIST_FILENAME}'.")

    # Filter tconsts to only those in title.basics.tsv
    basics_path = IMDB_DATA_SET_LITE_DIR / 'title.basics.tsv'
    valid_tconst_set = load_valid_tconsts(basics_path)
    filtered_movies = {tconst: created_date for tconst, created_date in watchlist_movies.items() if tconst in valid_tconst_set}

    if len(filtered_movies) < len(watchlist_movies):
        skipped = len(watchlist_movies) - len(filtered_movies)
        print(f"Skipped {skipped} movies not in title.basics.tsv.")

    if not filtered_movies:
        print("No valid movies found after filtering. Aborting.")
        return

    # Check which of these movies already exist in our 'movie' table
    existing_movies = filter_existing_movies(supabase, filtered_movies)

    not_found_count = len(filtered_movies) - len(existing_movies)
    if not_found_count > 0:
        print(f"Warning: {not_found_count} movies from the watchlist were not found in the 'movie' table and will be skipped.")

    if not existing_movies:
        print("None of the movies from the watchlist exist in the database. Nothing to import.")
        return

    # Prepare data for insertion
    movies_to_insert = []
    for tconst, created_date in existing_movies.items():
        # Use the actual created date if available, otherwise use current timestamp
        watchlisted_at = created_date if created_date is not None else datetime.now(timezone.utc).isoformat()

        movies_to_insert.append({
            "user_id": user_uuid,
            "tconst": tconst,
            "watchlisted_at": watchlisted_at,
            "added_from_ai_suggestion": False,
        })

    # Insert data into user_movie in batches
    batch_size = 500
    total_upserted = 0
    for i in range(0, len(movies_to_insert), batch_size):
        batch = movies_to_insert[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1} with {len(batch)} movies...")
        try:
            response = (
                supabase.table("user_movie")
                .upsert(
                    batch,
                    on_conflict="user_id,tconst"
                )
                .execute()
            )
            # API response for upsert doesn't reliably tell us how many were inserted vs updated.
            # We just confirm the call was successful.
            if response.data:
                total_upserted += len(response.data)

        except Exception as e:
            print(f"An error occurred during batch upsert: {e}")

    print(f"Successfully processed {len(existing_movies)} movies for the user's watchlist.")
    print("Note: Movies already on the user's watchlist were updated with new timestamps.")
    print("Import process finished.")


if __name__ == "__main__":
    main()
