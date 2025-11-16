import logging
import os
import time
from threading import Lock

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

load_dotenv()


class TMDBClient:
    """
    Lightweight TMDB client with connection pooling, caching and retries.
    The client is intentionally stateful so repeated poster lookups don't
    hammer the external API while users scroll through long lists.
    """

    _session: requests.Session | None = None
    _session_lock: Lock = Lock()
    _cache_lock: Lock = Lock()
    _tmdb_id_cache: dict[str, tuple[float, int | None]] = {}
    _poster_cache: dict[str, tuple[float, str | None]] = {}

    def __init__(self):
        self.api_key = os.getenv("TMDB_API_KEY")
        if not self.api_key:
            raise ValueError("TMDB_API_KEY is not configured in settings.")

        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/original"
        self.timeout_seconds = float(os.getenv("TMDB_TIMEOUT_SECONDS", "5"))
        self.cache_ttl_seconds = int(
            os.getenv("TMDB_CACHE_TTL_SECONDS", 60 * 60 * 6)  # default 6 hours
        )
        self.session = self._get_session()

    @classmethod
    def _get_session(cls) -> requests.Session:
        if cls._session is not None:
            return cls._session

        with cls._session_lock:
            if cls._session is None:
                session = requests.Session()
                retries = Retry(
                    total=3,
                    connect=3,
                    read=3,
                    backoff_factor=0.3,
                    status_forcelist=[429, 500, 502, 503, 504],
                    raise_on_status=False,
                )
                adapter = HTTPAdapter(
                    max_retries=retries, pool_connections=25, pool_maxsize=25
                )
                session.mount("https://", adapter)
                session.mount("http://", adapter)
                cls._session = session
        return cls._session

    def _make_request(self, endpoint: str, params: dict | None = None):
        if params is None:
            params = {}
        params["api_key"] = self.api_key
        url = f"{self.base_url}/{endpoint}"

        try:
            response = self.session.get(
                url,
                params=params,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            logger.warning("TMDB request timed out for endpoint %s", endpoint)
        except requests.exceptions.HTTPError as exc:
            logger.warning(
                "TMDB HTTP error for endpoint %s: %s", endpoint, exc.response.status_code
            )
        except requests.exceptions.RequestException as exc:
            logger.error("TMDB request failed for endpoint %s: %s", endpoint, exc)
        return None

    def _get_cached_value(
        self, cache: dict[str, tuple[float, object | None]], key: str
    ) -> tuple[object | None, bool]:
        now = time.monotonic()
        with self._cache_lock:
            entry = cache.get(key)
            if not entry:
                return None, False
            expires_at, value = entry
            if expires_at < now:
                cache.pop(key, None)
                return None, False
            return value, True

    def _set_cached_value(
        self, cache: dict[str, tuple[float, object | None]], key: str, value: object | None
    ) -> None:
        expires_at = time.monotonic() + self.cache_ttl_seconds
        with self._cache_lock:
            cache[key] = (expires_at, value)

    def get_tmdb_id_from_imdb_id(self, imdb_id: str | None) -> int | None:
        if not imdb_id:
            return None

        cached_value, found = self._get_cached_value(
            self._tmdb_id_cache, imdb_id
        )
        if found:
            return cached_value  # type: ignore[return-value]

        data = self._make_request(
            f"find/{imdb_id}", {"external_source": "imdb_id"}
        )
        tmdb_id = None
        if data and data.get("movie_results"):
            tmdb_id = data["movie_results"][0].get("id")

        self._set_cached_value(self._tmdb_id_cache, imdb_id, tmdb_id)
        return tmdb_id

    def get_poster_url_for_tmdb_id(self, tmdb_id: int | None) -> str | None:
        if not tmdb_id:
            return None

        cache_key = str(tmdb_id)
        cached_value, found = self._get_cached_value(
            self._poster_cache, cache_key
        )
        if found:
            return cached_value  # type: ignore[return-value]

        data = self._make_request(f"movie/{tmdb_id}/images")
        poster_url = None
        if data and data.get("posters"):
            posters = data["posters"]
            for lang in ["pl", "en", None]:
                for poster in posters:
                    if poster.get("iso_639_1") == lang:
                        file_path = poster.get("file_path")
                        if file_path:
                            poster_url = f"{self.image_base_url}{file_path}"
                            break
                if poster_url:
                    break

        self._set_cached_value(self._poster_cache, cache_key, poster_url)
        return poster_url


_tmdb_client: TMDBClient | None = None
_tmdb_client_lock: Lock = Lock()


def _get_tmdb_client() -> TMDBClient:
    global _tmdb_client
    if _tmdb_client is not None:
        return _tmdb_client

    with _tmdb_client_lock:
        if _tmdb_client is None:
            _tmdb_client = TMDBClient()
    return _tmdb_client


def fetch_poster_for_movie(movie):
    client = _get_tmdb_client()
    tmdb_id = movie.tmdb_id
    if not tmdb_id:
        tmdb_id = client.get_tmdb_id_from_imdb_id(movie.tconst)
        if tmdb_id:
            movie.tmdb_id = tmdb_id
            # We don't save here, the task will do it.

    if tmdb_id:
        return client.get_poster_url_for_tmdb_id(tmdb_id)

    return None
