# Etap 1: Konfiguracja środowiska Python
FROM python:3.12-slim AS python-base

# Ustawienie zmiennych środowiskowych
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Ustawienie ścieżki dla venv
    VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Instalacja uv i utworzenie venv
RUN pip install uv \
    && python -m venv $VIRTUAL_ENV

WORKDIR /app

# Etap 2: Instalacja zależności
FROM python-base AS builder

# Kopiowanie plików zależności z podfolderu myVOD
COPY myVOD/pyproject.toml myVOD/uv.lock ./

# Instalacja zależności przy pomocy uv
# Używamy `uv pip install .`, aby uv rozwiązał wszystkie zależności z pyproject.toml.
# Jest to bardziej niezawodne niż `sync`, który opiera się wyłącznie na uv.lock.
RUN uv pip install .

# Etap 3: Budowanie finalnego obrazu
FROM python-base

# Kopiowanie venv z zależnościami
COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

# Kopiowanie plików aplikacji
COPY . .

# Ustawienie poprawnego katalogu roboczego
WORKDIR /app/myVOD

# Uruchomienie aplikacji
EXPOSE 8000
CMD ["gunicorn", "myVOD.wsgi:application", "--bind", "0.0.0.0:8000"]
