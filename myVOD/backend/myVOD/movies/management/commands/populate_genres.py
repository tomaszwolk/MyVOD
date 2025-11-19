from django.core.management.base import BaseCommand
from django.db import transaction
from movies.models import Movie, Genre

class Command(BaseCommand):
    help = 'Populates the Genre table with unique genres from the Movie table.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fetching unique genres from movies...'))

        # Fetch all 'genres' arrays from the Movie model
        all_genres_nested = Movie.objects.values_list("genres", flat=True)

        # Flatten the list of lists and create a set of unique genres
        db_genres = set(
            g for genres_list in all_genres_nested if genres_list for g in genres_list
        )

        self.stdout.write(f"Found {len(db_genres)} unique genres in the Movie table.")

        # Get genres that are already in the Genre table
        existing_genres = set(Genre.objects.values_list('name', flat=True))
        
        # Determine which genres are new
        new_genres = db_genres - existing_genres

        if not new_genres:
            self.stdout.write(self.style.SUCCESS('Genre table is already up to date.'))
            return

        self.stdout.write(f"Found {len(new_genres)} new genres to add.")

        # Create new Genre objects in a single batch operation
        genres_to_create = [Genre(name=name) for name in new_genres]
        
        try:
            with transaction.atomic():
                Genre.objects.bulk_create(genres_to_create)
            self.stdout.write(self.style.SUCCESS(f'Successfully added {len(new_genres)} new genres to the database.'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'An error occurred: {e}'))
