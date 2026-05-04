from django.conf import settings
from django.utils import timezone
from movies.models import Movie, MovieAvailability, Platform
from services.watchmode_service import WatchmodeService
import logging
import os
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Define the directory for saving API responses
LOG_DIR = os.path.join(settings.BASE_DIR, 'services', 'availability_sync')


class AvailabilitySyncService:
    def _save_response_to_file(self, platform_slug, page, response):
        """Saves the API response to a JSON file."""
        try:
            os.makedirs(LOG_DIR, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{timestamp}_{platform_slug}_page_{page}.json"
            filepath = os.path.join(LOG_DIR, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(response, f, indent=4, ensure_ascii=False)
            return f"Saved API response for page {page} to {filename}\n"
        except Exception as e:
            return f"ERROR: Failed to save API response for page {page}. Reason: {e}\n"

    def sync_platform(self, platform_slug):
        """
        Synchronizes movie availability for a single platform.
        This is a generator that yields log messages.
        """
        yield f"Starting synchronization for platform: {platform_slug}\n"
        service = WatchmodeService()

        # Get platform details
        try:
            platform_obj = Platform.objects.get(platform_slug=platform_slug)
        except Platform.DoesNotExist:
            yield f"ERROR: Platform '{platform_slug}' not found in the database.\n"
            return

        platform_name_map = {v: k for k, v in settings.VOD_PLATFORMS.items()}
        source_ids_map = {
            'netflix': 203, 'hbomax': 387, 'disneyplus': 372,
            'primevideo': 26, 'appletvplus': 371,
        }
        source_id = source_ids_map.get(platform_slug)

        if not source_id:
            yield f"ERROR: Watchmode source ID for '{platform_slug}' is not defined.\n"
            return

        yield f"Processing platform: {platform_name_map[platform_slug]} (Source ID: {source_id})\n"

        # 1. Fetch all titles from Watchmode API
        api_imdb_to_watchmode_map = {}
        page = 1
        while True:
            yield f"Fetching page {page} for {platform_name_map[platform_slug]}...\n"
            response = service.list_titles(source_ids=[source_id], types=['movie'], page=page)  # types=['movie', 'tv_series', 'tv_special']
            
            # Save response to file
            if response:
                log_message = self._save_response_to_file(platform_slug, page, response)
                yield log_message

            if not response or 'titles' not in response:
                yield f"ERROR: Failed to fetch titles on page {page}. Stopping.\n"
                break

            titles = response['titles']
            if not titles:
                yield "No more titles found for this platform.\n"
                break

            for title in titles:
                imdb_id = title.get('imdb_id')
                watchmode_id = title.get('id')
                if imdb_id and watchmode_id:
                    api_imdb_to_watchmode_map[imdb_id] = watchmode_id

            if page >= response.get('total_pages', 1):
                break
            page += 1

        yield f"Found {len(api_imdb_to_watchmode_map)} unique titles on Watchmode.\n"

        # 2. Get current state from local DB
        db_tconsts = set(
            MovieAvailability.objects.filter(
                platform=platform_obj, is_available=True
            ).values_list('tconst__tconst', flat=True)
        )
        yield f"Found {len(db_tconsts)} available titles in the local database for this platform.\n"

        # 3. Compare and process changes
        api_tconsts = set(api_imdb_to_watchmode_map.keys())
        tconsts_to_mark_unavailable = db_tconsts - api_tconsts
        tconsts_to_add_or_update = api_tconsts - db_tconsts

        yield f"Marking {len(tconsts_to_mark_unavailable)} titles as unavailable...\n"
        if tconsts_to_mark_unavailable:
            updated_count = MovieAvailability.objects.filter(
                platform=platform_obj, tconst__tconst__in=tconsts_to_mark_unavailable
            ).update(is_available=False, last_checked=timezone.now())
            yield f"Successfully marked {updated_count} titles as unavailable.\n"
        else:
            yield "No titles to mark as unavailable.\n"

        yield f"Adding or updating {len(tconsts_to_add_or_update)} titles...\n"
        added_count = 0
        if tconsts_to_add_or_update:
            for tconst in tconsts_to_add_or_update:
                try:
                    movie = Movie.objects.get(tconst=tconst)
                    watchmode_id = api_imdb_to_watchmode_map[tconst]

                    # Update watchmode_id if missing
                    if not movie.watchmode_id:
                        movie.watchmode_id = watchmode_id
                        movie.save(update_fields=['watchmode_id'])

                    MovieAvailability.objects.update_or_create(
                        tconst=movie,
                        platform=platform_obj,
                        defaults={
                            'is_available': True,
                            'source': 'watchmode',
                            'last_checked': timezone.now()
                        }
                    )
                    added_count += 1
                except Movie.DoesNotExist:
                    continue
        yield f"Successfully added or updated {added_count} titles.\n"
        yield f"Synchronization for {platform_slug} completed successfully.\n"
        
    def sync_all_platforms(self):
        """
        Synchronizes movie availability for all configured platforms.
        This is a generator that yields log messages from sync_platform.
        """
        yield "========== STARTING FULL SYNCHRONIZATION ==========\n\n"
        
        all_slugs = settings.VOD_PLATFORMS.values()
        total_platforms = len(all_slugs)

        for i, slug in enumerate(all_slugs):
            yield f"--- ({i+1}/{total_platforms}) Starting sync for: {slug.upper()} ---\n"
            yield from self.sync_platform(platform_slug=slug)
            yield f"--- Finished sync for: {slug.upper()} ---\n\n"
        
        yield "========== FULL SYNCHRONIZATION COMPLETED ==========\n"
