import requests
import os

TMDB_API_KEY = os.getenv('TMDB_API_KEY')

API_KEY = 'twoj_klucz_api'
IMDB_ID = 'tt0111161'  # przykładowe tconst z IMDb

# Pobranie TMDB_ID na podstawie IMDB_ID
tmdb_lookup_url = f'https://api.themoviedb.org/3/find/{IMDB_ID}?api_key={API_KEY}&external_source=imdb_id'
tmdb_result = requests.get(tmdb_lookup_url).json()
tmdb_id = tmdb_result['movie_results'][0]['id']

# Pobieranie plakatów dla TMDB_ID
images_url = f'https://api.themoviedb.org/3/movie/{tmdb_id}/images?api_key={API_KEY}'
images_result = requests.get(images_url).json()

# Lista URL-i plakatów (w rozmiarze 'original')
base_url = 'https://image.tmdb.org/t/p/original'
posters = [
    base_url + poster['file_path'] 
    for poster in images_result.get('posters', [])
    if poster.get('iso_639_1') in [None, 'pl', 'en']  # filtry językowe
]
print(posters)
