# Etap 1: Konfiguracja środowiska Python
FROM python:3.11-slim as python-base

# Ustawienie zmiennych środowiskowych
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    # Poetry-specific
    POETRY_VERSION=1.8.2 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    # Ustawienie ścieżki dla venv
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

# Aktualizacja i instalacja zależności systemowych
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
       build-essential \
       curl

# Instalacja Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

WORKDIR /app

# Etap 2: Instalacja zależności
FROM python-base as builder
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --no-dev

# Etap 3: Budowanie finalnego obrazu
FROM python-base
COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}
COPY . .

# Uruchomienie aplikacji
EXPOSE 8000
CMD ["gunicorn", "myVOD.wsgi:application", "--bind", "0.0.0.0:8000"]
