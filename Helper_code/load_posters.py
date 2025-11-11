import os
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone


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


def get_poster_url_for_movie(tconst: str, tmdb_api_key: str) -> str | None:
    """
    Gets the poster URL for a movie from TMDB using its IMDB ID (tconst).

    Args:
        tconst: IMDB movie identifier (e.g., 'tt0111161')
        tmdb_api_key: TMDB API key

    Returns:
        Poster URL if found, None otherwise
    """
    try:
        # Get TMDB ID from IMDB ID
        tmdb_lookup_url = f'https://api.themoviedb.org/3/find/{tconst}?api_key={tmdb_api_key}&external_source=imdb_id'
        tmdb_result = requests.get(tmdb_lookup_url, timeout=10).json()

        if not tmdb_result.get('movie_results'):
            print(f"No TMDB results found for {tconst}")
            return None

        tmdb_id = tmdb_result['movie_results'][0]['id']

        # Get images for TMDB ID
        images_url = f'https://api.themoviedb.org/3/movie/{tmdb_id}/images?api_key={tmdb_api_key}'
        images_result = requests.get(images_url, timeout=10).json()

        # Filter posters by language (None, Polish, English) and get the first one
        posters = [
            poster for poster in images_result.get('posters', [])
            if poster.get('iso_639_1') in [None, 'pl', 'en']
        ]

        if not posters:
            print(f"No suitable posters found for {tconst} (TMDB ID: {tmdb_id})")
            return None

        # Use the first poster from the filtered list
        poster_path = posters[0]['file_path']
        base_url = 'https://image.tmdb.org/t/p/original'
        poster_url = base_url + poster_path

        return poster_url

    except requests.RequestException as e:
        print(f"Request error for {tconst}: {e}")
        return None
    except (KeyError, IndexError) as e:
        print(f"Data parsing error for {tconst}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error for {tconst}: {e}")
        return None


def load_posters_for_movies():
    """
    Loads poster URLs from TMDB for movies in the database that don't have posters yet.
    Updates the movie table with poster_path and poster_last_checked.
    """
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        print("Supabase client initialized.")

        # Load TMDB API key
        env_path = Path(__file__).parent.parent / "myVOD" / "backend" / ".env"
        if os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path)
        else:
            load_dotenv()

        tmdb_api_key = os.getenv('TMDB_API_KEY')
        if not tmdb_api_key:
            raise ValueError("TMDB_API_KEY must be set in your .env file.")

        print("Fetching movies without posters...")

        # Get movies that don't have poster_path set or haven't been checked recently
        # Using a query to get movies where poster_path is null
        response = supabase.table('movie').select('tconst').is_('poster_path', 'null').execute()

        if not response.data:
            print("No movies found without posters.")
            return

        movies_to_update = response.data
        print(f"Found {len(movies_to_update)} movies without posters.")

        # Process in batches to avoid overwhelming the API
        batch_size = 50  # Smaller batch size due to API rate limits
        total_updated = 0
        total_errors = 0

        for i in range(0, len(movies_to_update), batch_size):
            batch = movies_to_update[i:i + batch_size]
            batch_updates = []
            batch_num = (i // batch_size) + 1

            print(f"Processing batch {batch_num} with {len(batch)} movies...")

            for movie in batch:
                tconst = movie['tconst']
                poster_url = get_poster_url_for_movie(tconst, tmdb_api_key)

                if poster_url:
                    # Prepare update data
                    update_data = {
                        'poster_path': poster_url,
                        'poster_last_checked': datetime.now(timezone.utc).isoformat()
                    }
                    batch_updates.append({
                        'tconst': tconst,
                        **update_data
                    })
                    print(f"Found poster for {tconst}: {poster_url}")
                else:
                    total_errors += 1
                    print(f"No poster found for {tconst}")

                # Small delay to respect TMDB API rate limits (4 requests per second for free tier)
                time.sleep(0.3)

            # Update batch in database
            if batch_updates:
                try:
                    response = supabase.table('movie').upsert(batch_updates).execute()
                    if response.data:
                        batch_count = len(response.data)
                        total_updated += batch_count
                        print(f"Successfully updated {batch_count} movies in batch {batch_num}.")
                    else:
                        print(f"No data returned for batch {batch_num} update.")
                except Exception as e:
                    print(f"Error updating batch {batch_num}: {e}")
            else:
                print(f"No updates to make for batch {batch_num}.")

            # Longer delay between batches
            if i + batch_size < len(movies_to_update):
                print("Waiting between batches...")
                time.sleep(2)

        print("Poster loading completed.")
        print(f"Total movies updated: {total_updated}")
        print(f"Total movies with errors/no posters: {total_errors}")

    except Exception as e:
        print(f"An error occurred in the main process: {e}")


if __name__ == "__main__":
    load_posters_for_movies()
