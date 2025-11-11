from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from movies.models import Movie
from services.tmdb_client import fetch_poster_for_movie


logger = logging.getLogger(__name__)

@shared_task(rate_limit="10/m")
def update_movie_poster(tconst):
    try:
        movie = Movie.objects.get(tconst=tconst)
    except Movie.DoesNotExist:
        logger.warning(f"Movie with tconst {tconst} not found for poster update.")
        return

    # To avoid repeated checks for movies without posters
    thirty_days_ago = timezone.now() - timedelta(days=30)
    if not movie.poster_path and movie.poster_last_checked and movie.poster_last_checked > thirty_days_ago:
        logger.info(f"Skipping poster check for {tconst}, recently checked and no poster was found.")
        return

    poster_url = fetch_poster_for_movie(movie)
    update_fields = ['poster_last_checked']

    if poster_url:
        movie.poster_path = poster_url
        update_fields.append('poster_path')
    
    if movie.tmdb_id and 'tmdb_id' not in update_fields:
        # If tmdb_id was found but not yet saved
        if Movie.objects.filter(tconst=movie.tconst, tmdb_id__isnull=True).exists():
             update_fields.append('tmdb_id')


    movie.poster_last_checked = timezone.now()
    movie.save(update_fields=update_fields)
    
    if poster_url:
        logger.info(f"Successfully updated poster for movie {tconst}.")
    else:
        logger.info(f"No poster found for movie {tconst}. Marked as checked.")
