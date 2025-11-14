from django.core.management.base import BaseCommand
from movies.models import Movie


class Command(BaseCommand):
    help = (
        "Checks for genre discrepancies between a hardcoded set and the database."
    )

    # This set should be manually updated based on this command's output.
    # It's a placeholder to compare against the database.
    CURRENT_PROJECT_GENRES = set()

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.HTTP_INFO(
                "Łączenie z bazą danych w celu pobrania wszystkich gatunków filmowych..."
            )
        )

        # Fetch all 'genres' arrays from the Movie model
        all_genres_nested = Movie.objects.values_list("genres", flat=True)

        # Flatten the list of lists and create a set of unique genres
        db_genres = set(
            g for genres_list in all_genres_nested if genres_list for g in genres_list
        )

        self.stdout.write(
            f"Znaleziono {len(db_genres)} unikalnych gatunków w bazie danych."
        )

        # Compare the set from the database with the hardcoded one
        if self.CURRENT_PROJECT_GENRES == db_genres:
            self.stdout.write(
                self.style.SUCCESS("\nNic się nie zmieniło. Zbiór gatunków jest aktualny.")
            )
            return

        self.stdout.write(
            self.style.WARNING(
                "\n! Zidentyfikowano różnice między projektem a bazą danych !"
            )
        )

        # Find and report added/removed genres
        added = db_genres - self.CURRENT_PROJECT_GENRES
        removed = self.CURRENT_PROJECT_GENRES - db_genres

        if added:
            self.stdout.write(f"\nNowe gatunki w bazie danych: {sorted(list(added))}")
        if removed:
            self.stdout.write(
                f"\nGatunki usunięte z bazy danych: {sorted(list(removed))}"
            )

        # Prepare the new set string for easy copy-pasting
        genres_str = ", ".join(sorted(f'"{g}"' for g in db_genres))
        new_set_declaration = f"ALL_AVAILABLE_GENRES = {{{genres_str}}}"

        self.stdout.write("\n" + self.style.HTTP_REDIRECT("---"))
        self.stdout.write(
            self.style.HTTP_NOT_MODIFIED(
                "AKCJA WYMAGANA: Zaktualizuj zbiór w pliku 'ai_suggestions_service.py'."
            )
        )
        self.stdout.write(
            "Skopiuj poniższą linię i wklej ją w odpowiednie miejsce:"
        )
        self.stdout.write(self.style.SQL_KEYWORD("\n" + new_set_declaration))
        self.stdout.write(self.style.HTTP_REDIRECT("---"))
