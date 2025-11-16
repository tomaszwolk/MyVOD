import os
import csv
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone
from supabase import create_client, Client


# --- CONFIGURATION ---
# UUID or ID of the user in the Django `users_user` table to whom the ratings will be assigned.
# Can be either: UUID (direct) or integer Django user ID (will be resolved to UUID)
DJANGO_USER_ID = "bfc2e697-8da8-42ae-9883-93ae4e34ac6c"
# DJANGO_USER_ID = "f37d6a22-6362-4a0d-808b-fde7e7faa1d7"

# Filename of the IMDb ratings CSV export.
# This file should be placed in the IMDB_DATA_SET_LITE_DIR directory.
RATINGS_FILENAME = 'ratings_tw.csv'

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


def get_movies_from_ratings_file(ratings_path: Path) -> dict[str, str]:
    """Reads the IMDb ratings CSV and returns a dict of tconst -> date_rated."""
    movies = {}
    try:
        with open(ratings_path, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                if 'Const' in row and 'Date Rated' in row:
                    tconst = row['Const']
                    date_rated = row['Date Rated']
                    if date_rated and date_rated.strip():
                        # Convert YYYY-MM-DD to ISO timestamp format
                        try:
                            # Parse the date and create a full timestamp
                            from datetime import datetime
                            date_obj = datetime.strptime(date_rated.strip(), '%Y-%m-%d')
                            # Create ISO format timestamp with midnight time and UTC timezone
                            iso_timestamp = date_obj.strftime('%Y-%m-%dT00:00:00.000Z')
                            movies[tconst] = iso_timestamp
                        except ValueError:
                            print(f"Warning: Invalid date format '{date_rated}' for movie {tconst}, using current timestamp")
                            movies[tconst] = None
                    else:
                        print(f"Warning: Empty date rated for movie {tconst}, will use current timestamp")
                        movies[tconst] = None
    except FileNotFoundError:
        print(f"Ratings file not found at: {ratings_path}")
    return movies


def get_ratings_from_ratings_file(ratings_path: Path) -> dict[str, int]:
    """Reads the IMDb ratings CSV and returns a dictionary of tconst -> user rating."""
    ratings = {}
    try:
        with open(ratings_path, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                if 'Const' in row and 'Your Rating' in row:
                    tconst = row['Const']
                    try:
                        rating = int(row['Your Rating'])
                        ratings[tconst] = rating
                    except (ValueError, TypeError):
                        print(f"Warning: Invalid rating '{row['Your Rating']}' for movie {tconst}, skipping.")
    except FileNotFoundError:
        print(f"Ratings file not found at: {ratings_path}")
    return ratings


def filter_existing_movies(supabase: Client, movies_dict: dict[str, str]) -> dict[str, str]:
    """
    Filters a dict of tconst -> date_rated, returning only those that exist in the 'movie' table.
    """
    if not movies_dict:
        return {}

    tconsts = list(movies_dict.keys())
    try:
        response = supabase.table('movie').select('tconst').in_('tconst', tconsts).execute()
        if response.data:
            existing_tconsts = {row['tconst'] for row in response.data}
            return {tconst: date_rated for tconst, date_rated in movies_dict.items() if tconst in existing_tconsts}
        return {}
    except Exception as e:
        print(f"An error occurred while filtering movies: {e}")
        return {}


def update_user_ratings(supabase: Client, user_uuid: str, ratings: dict[str, int]) -> int:
    """
    Updates user ratings for movies in the user_movie table.
    Only updates ratings for movies that were successfully imported.
    """
    if not ratings:
        print("No ratings to update.")
        return 0

    # Filter ratings to only include movies that exist in user_movie for this user
    try:
        existing_movies_response = supabase.table('user_movie').select('tconst').eq('user_id', user_uuid).execute()
        existing_tconsts = {row['tconst'] for row in existing_movies_response.data} if existing_movies_response.data else set()

        ratings_to_update = {tconst: rating for tconst, rating in ratings.items() if tconst in existing_tconsts}

        if not ratings_to_update:
            print("No ratings to update (no matching movies found in user_movie table).")
            return 0

        print(f"Updating ratings for {len(ratings_to_update)} movies...")

        # Update ratings in batches
        batch_size = 500
        total_updated = 0

        for i in range(0, len(ratings_to_update), batch_size):
            batch_items = list(ratings_to_update.items())[i:i + batch_size]
            batch_updates = [
                {"user_id": user_uuid, "tconst": tconst, "user_rating": rating}
                for tconst, rating in batch_items
            ]

            try:
                (
                    supabase.table("user_movie")
                    .upsert(
                        batch_updates,
                        on_conflict="user_id,tconst"
                    )
                    .execute()
                )
                total_updated += len(batch_updates)
                print(f"Updated ratings for batch {i//batch_size + 1} ({len(batch_updates)} movies)")
            except Exception as e:
                print(f"An error occurred during rating update batch: {e}")

        return total_updated

    except Exception as e:
        print(f"An error occurred while updating ratings: {e}")
        return 0


def main():
    """
    Main function to import IMDb ratings as watched movies into the user_movie table.
    First marks movies as watched, then updates their user ratings.
    """
    print("Starting IMDb user ratings import process...")

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

    # Read movie tconsts and date rated from the ratings CSV
    ratings_path = IMDB_DATA_SET_LITE_DIR / RATINGS_FILENAME
    rated_movies = get_movies_from_ratings_file(ratings_path)
    if not rated_movies:
        print("No movies found in the ratings file. Aborting.")
        return

    print(f"Found {len(rated_movies)} rated movies in '{RATINGS_FILENAME}'.")

    # Filter tconsts to only those in title.basics.tsv
    basics_path = IMDB_DATA_SET_LITE_DIR / 'title.basics.tsv'
    valid_tconst_set = load_valid_tconsts(basics_path)
    filtered_movies = {tconst: date_rated for tconst, date_rated in rated_movies.items() if tconst in valid_tconst_set}

    if len(filtered_movies) < len(rated_movies):
        skipped = len(rated_movies) - len(filtered_movies)
        print(f"Skipped {skipped} movies not in title.basics.tsv.")

    if not filtered_movies:
        print("No valid movies found after filtering. Aborting.")
        return

    # Check which of these movies already exist in our 'movie' table
    existing_movies = filter_existing_movies(supabase, filtered_movies)

    not_found_count = len(filtered_movies) - len(existing_movies)
    if not_found_count > 0:
        print(f"Warning: {not_found_count} movies from the ratings file were not found in the 'movie' table and will be skipped.")

    if not existing_movies:
        print("None of the movies from the ratings file exist in the database. Nothing to import.")
        return

    # STEP 1: Mark movies as watched
    print("\n--- STEP 1: Marking movies as watched ---")
    movies_to_upsert = []
    for tconst, date_rated in existing_movies.items():
        # Use the actual date rated if available, otherwise use current timestamp
        watched_at = date_rated if date_rated is not None else datetime.now(timezone.utc).isoformat()

        movies_to_upsert.append({
            "user_id": user_uuid,
            "tconst": tconst,
            "watched_at": watched_at,
            "added_from_ai_suggestion": False,
        })

    # Upsert data into user_movie in batches
    batch_size = 500
    total_processed = 0
    for i in range(0, len(movies_to_upsert), batch_size):
        batch = movies_to_upsert[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1} with {len(batch)} movies...")
        try:
            (
                supabase.table("user_movie")
                .upsert(
                    batch,
                    on_conflict="user_id,tconst"
                )
                .execute()
            )
            total_processed += len(batch)
        except Exception as e:
            print(f"An error occurred during batch upsert: {e}")

    print(f"Successfully processed {total_processed} movies to be marked as watched.")

    # STEP 2: Update user ratings
    print("\n--- STEP 2: Updating user ratings ---")
    ratings = get_ratings_from_ratings_file(ratings_path)
    if ratings:
        ratings_updated = update_user_ratings(supabase, user_uuid, ratings)
        print(f"Successfully updated ratings for {ratings_updated} movies.")
    else:
        print("No ratings found in the file.")

    print("\nImport process finished.")


if __name__ == "__main__":
    main()
