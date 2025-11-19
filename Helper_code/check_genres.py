"""
Standalone script to check for genre discrepancies between the project and the database.

This script connects to the Django database, fetches all unique movie genres,
and compares them against a hardcoded set within this file.

If the sets are identical, it confirms that everything is up to date.
If there are differences, it prints the added/removed genres and provides
a new, complete set declaration that can be copied into the
ai_suggestions_service.py to keep it synchronized.

With implementing filters new table in database was added: genre table with unique genres.
With changing AI suggestions, we should use this table to get all available genres.
"""

import os
import sys

import django

# --- Django Setup ---
# This setup is necessary to run the script as a standalone file that can
# access the Django models and database configuration.

# Get the absolute path to the directory containing this script (Helper_code)
script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the absolute path to the project root (one level up from Helper_code)
project_root = os.path.abspath(os.path.join(script_dir, ".."))
# Construct the path to the Django project directory
django_project_path = os.path.join(project_root, "myVOD", "backend", "myVOD")
# Construct the path to the backend root where dependencies are managed
backend_root_path = os.path.join(project_root, "myVOD", "backend")


# Add the Django project path and backend root to the system path
sys.path.append(django_project_path)
sys.path.append(backend_root_path)

# Set the DJANGO_SETTINGS_MODULE environment variable
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myVOD.settings")

# Initialize Django
django.setup()

from movies.models import Movie  # noqa: E402

# --- Genre Checking Logic ---

# This set should be manually kept in sync with the one in ai_suggestions_service.py.
# The purpose of this script is to tell you when and how to update it.
# On the first run, it is intentionally empty to discover all genres.
CURRENT_PROJECT_GENRES = {
    "Action",
    "Adult",
    "Adventure",
    "Animation",
    "Biography",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "Film-Noir",
    "Game-Show",
    "History",
    "Horror",
    "Music",
    "Musical",
    "Mystery",
    "News",
    "Reality-TV",
    "Romance",
    "Sci-Fi",
    "Short",
    "Sport",
    "Talk-Show",
    "Thriller",
    "War",
    "Western",
}


def check_genres():
    """
    Fetches genres from the DB, compares them with the hardcoded set,
    and reports any differences.
    """
    print("Łączenie z bazą danych w celu pobrania wszystkich gatunków filmowych...")

    # Fetch all 'genres' arrays from the Movie model
    all_genres_nested = Movie.objects.values_list("genres", flat=True)

    # Flatten the list of lists and create a set of unique genres
    db_genres = set(
        g for genres_list in all_genres_nested if genres_list for g in genres_list
    )

    print(f"Znaleziono {len(db_genres)} unikalnych gatunków w bazie danych.")

    # Compare the set from the database with the hardcoded one
    if CURRENT_PROJECT_GENRES == db_genres:
        print("\nNic się nie zmieniło. Zbiór gatunków jest aktualny.")
        return

    print("\n! Zidentyfikowano różnice między projektem a bazą danych !")

    # Find and report added/removed genres
    added = db_genres - CURRENT_PROJECT_GENRES
    removed = CURRENT_PROJECT_GENRES - db_genres

    if added:
        print(f"\nNowe gatunki w bazie danych: {sorted(list(added))}")
    if removed:
        print(f"\nGatunki usunięte z bazy danych: {sorted(list(removed))}")

    # Prepare the new set string for easy copy-pasting
    genres_str = ", ".join(sorted(f'"{g}"' for g in db_genres))
    new_set_declaration = f"ALL_AVAILABLE_GENRES = {{{genres_str}}}"

    print("\n---")
    print("AKCJA WYMAGANA: Zaktualizuj zbiór w pliku 'ai_suggestions_service.py'.")
    print("Skopiuj poniższą linię i wklej ją w odpowiednie miejsce:")
    print("\n" + new_set_declaration)
    print("---")


if __name__ == "__main__":
    check_genres()
