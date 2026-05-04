"""
Command to update movie availability for titles that have changed in the last 24 hours.
IMPORTANT: Don't use. It is available only for paid API. Won't work for free API.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

from movies.models import Movie, MovieAvailability, Platform
from services.watchmode_service import WatchmodeService
from django.conf import settings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Updates movie availability for titles that have changed in the last 24 hours."
    )

    def handle(self, *args, **options):
        self.stdout.write("Starting daily availability update...")
        service = WatchmodeService()

        end_date = (timezone.now() - timedelta(days=1)).strftime("%Y%m%d")
        start_date = (timezone.now() - timedelta(days=2)).strftime("%Y%m%d")

        self.stdout.write(f"Fetching changes from {start_date} to {end_date}...")

        page = 1
        processed_titles = set()

        while True:
            response = service.get_source_changes(start_date, end_date, page=page)

            if not response or "titles" not in response:
                self.stderr.write(
                    self.style.ERROR("Failed to fetch changes from Watchmode API.")
                )
                break

            title_ids = response["titles"]
            if not title_ids:
                self.stdout.write("No title changes found for the period.")
                break

            for watchmode_id in title_ids:
                if watchmode_id in processed_titles:
                    continue

                self.process_title_update(watchmode_id, service)
                processed_titles.add(watchmode_id)

            if page >= response.get("total_pages", 1):
                break
            page += 1

        self.stdout.write(self.style.SUCCESS("Finished daily availability update."))

    def process_title_update(self, watchmode_id, service):
        details = service.get_title_details(watchmode_id)
        if not details or "imdb_id" not in details:
            logger.warning(
                f"No IMDB ID found for watchmode_id {watchmode_id}. Skipping."
            )
            return

        imdb_id = details.get('imdb_id')

        # Check if movie exists in our database (loaded from IMDB)
        try:
            movie = Movie.objects.get(tconst=imdb_id)
        except Movie.DoesNotExist:
            logger.info(
                f"Movie with IMDB ID {imdb_id} (watchmode_id: {watchmode_id}) not in IMDB database. Skipping."
            )
            return

        self.stdout.write(f"Updating availability for: {movie.primary_title}")

        if "sources" not in details:
            logger.warning(
                f"No sources found for movie {movie.tconst} with watchmode_id {watchmode_id}"
            )
            return

        if details.get('type') != 'movie':
            logger.info(f"Skipping non-movie update: {details.get('title', 'Unknown')} (type: {details.get('type')})")
            return

        # Get all platforms we track from DB
        platforms = {
            p.platform_name: p
            for p in Platform.objects.filter(
                platform_slug__in=settings.VOD_PLATFORMS.values()
            )
        }

        found_sources_names = {source["name"] for source in details["sources"]}
        now = timezone.now()

        # Update availability for all tracked platforms for this movie
        for platform_name, platform_obj in platforms.items():
            is_available = platform_name in found_sources_names

            MovieAvailability.objects.update_or_create(
                tconst=movie,
                platform=platform_obj,
                defaults={
                    "is_available": is_available,
                    "last_checked": now,
                    "source": "watchmode",
                },
            )
