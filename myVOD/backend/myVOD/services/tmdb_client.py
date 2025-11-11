import logging
import os
import requests
from dotenv import load_dotenv
logger = logging.getLogger(__name__)


class TMDBClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv('TMDB_API_KEY')
        if not self.api_key:
            raise ValueError("TMDB_API_KEY is not configured in settings.")
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/original"

    def _make_request(self, endpoint, params=None):
        if params is None:
            params = {}
        params['api_key'] = self.api_key
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"TMDB API request failed for endpoint {endpoint}: {e}")
            return None

    def get_tmdb_id_from_imdb_id(self, imdb_id):
        data = self._make_request(f'find/{imdb_id}', {'external_source': 'imdb_id'})
        if data and data.get('movie_results'):
            return data['movie_results'][0].get('id')
        return None

    def get_poster_url_for_tmdb_id(self, tmdb_id):
        data = self._make_request(f'movie/{tmdb_id}/images')
        if not data or not data.get('posters'):
            return None

        posters = data['posters']
        # Prioritize Polish, then English, then any other poster
        for lang in ['pl', 'en', None]:
            for poster in posters:
                if poster.get('iso_639_1') == lang:
                    return f"{self.image_base_url}{poster.get('file_path')}"
        return None

def fetch_poster_for_movie(movie):
    client = TMDBClient()
    tmdb_id = movie.tmdb_id
    if not tmdb_id:
        tmdb_id = client.get_tmdb_id_from_imdb_id(movie.tconst)
        if tmdb_id:
            movie.tmdb_id = tmdb_id
            # We don't save here, the task will do it.

    if tmdb_id:
        return client.get_poster_url_for_tmdb_id(tmdb_id)

    return None
