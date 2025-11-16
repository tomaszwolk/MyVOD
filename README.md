## MyVOD

![python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white) ![django](https://img.shields.io/badge/Django-5.0%2B-092E20?logo=django&logoColor=white) ![react](https://img.shields.io/badge/React-18-blue?logo=react) ![license](https://img.shields.io/badge/License-TBD-lightgrey)

### Project description
MyVOD is a web application that helps movie enthusiasts manage a personal watchlist and instantly see where those movies are available across major VOD platforms. The MVP focuses on a streamlined workflow: search IMDb-sourced movies, add up to 10 to your watchlist, track availability on Netflix, HBO Max, Disney+, Prime Video, and Apple TV+, mark movies as watched, and optionally generate personalized AI suggestions using Gemini.

For the full product specification, refer to the PRD: [./.ai/prd.md](./.ai/prd.md)

---

### Table of Contents
- [MyVOD](#myvod)
  - [Project description](#project-description)
  - [Table of Contents](#table-of-contents)
  - [Tech stack](#tech-stack)
  - [Hosting and Deployment](#hosting-and-deployment)
  - [Getting started locally](#getting-started-locally)
  - [Available scripts](#available-scripts)
  - [Project scope](#project-scope)
  - [Project status](#project-status)
  - [Future Roadmap](#future-roadmap)
  - [Known Issues](#known-issues)
  - [License](#license)

---

### Tech stack

- Backend
  - Django 5.0+ and Django REST Framework (DRF)
  - Celery 5.3+ with Redis 7+ (worker + beat)
  - PostgreSQL 15 (via Supabase or self-managed)
  - API documentation with drf-spectacular
  - JWT auth with djangorestframework-simplejwt

- Frontend
  - React 18 + Vite 5+
  - Tailwind CSS + shadcn/ui
  - TanStack Query, React Router v6, Axios

- External Services
  - Watchmode.com API (VOD availability)
  - TMDB API (movie posters)
  - Google Gemini (gemini-1.5-flash) for AI suggestions

- Tooling & DevOps
  - Python 3.12+ with [uv](https://github.com/astral-sh/uv)
  - Linting/formatting with Ruff
  - Testing: 
    - Backend (Unit/Integration): pytest (+ pytest-django)
    - Frontend (Unit/Component): Vitest, React Testing Library
    - E2E: Playwright
  - Containerization: Docker + Docker Compose
  - CI/CD: GitHub Actions
  - Hosting: Render.com (PaaS)

See tech stack details: [./.ai/tech-stack.md](./.ai/tech-stack.md)

---

### Hosting and Deployment

The application is designed for a containerized multi-service architecture and is hosted on [Render](https://render.com/), a unified cloud platform (PaaS).

**Production URL**: [https://myvod.onrender.com](https://myvod.onrender.com)

The key components of the production environment on Render include:
- **Web Service**: Runs the Dockerized Django + Gunicorn application. ([DockerHub Repository](https://hub.docker.com/repository/docker/tomaszwolk/10xmovies-backend/general))
- **Static Site**: Serves the compiled React frontend application, providing fast, global delivery via Render's CDN. ([DockerHub Repository](https://hub.docker.com/repository/docker/tomaszwolk/myvod/general))
- **Background Worker**: Runs the Celery worker for asynchronous tasks.
- **Managed PostgreSQL**: A dedicated, managed database instance.
- **Managed Redis**: A managed instance for Celery's message broker and caching.

This setup benefits from features like automated deployments from Git, infrastructure-as-code via a `render.yaml` file, and automatic Preview Environments for pull requests.

---

### Getting started locally

Prerequisites
- Python 3.12+
- [uv](https://github.com/astral-sh/uv) for dependency management
- Redis 7+ (for Celery)
- PostgreSQL 15 (local or a hosted instance like Supabase)
- API keys: Watchmode, TMDB, Gemini (optional for AI during MVP)

1) Clone the repository
```bash
git clone <your-fork-or-repo-url>
cd 10xMovies
```

2) Backend setup (Django + DRF)
```bash
cd myVOD
uv sync
```

Create a `.env` file (example values shown):
```bash
DJANGO_SECRET_KEY=replace-me
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (choose one)
DATABASE_URL=postgresql://postgres:password@localhost:5432/myvod
# or Supabase connection string
# DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# External APIs
WATCHMODE_API_KEY=your-watchmode-api-key
TMDB_API_KEY=your-tmdb-api-key
GEMINI_API_KEY=your-gemini-api-key
```

Run the application (when the Django project scaffolding is present):
```bash
# Apply migrations (run if you change models)
uv run python manage.py makemigrations

# Apply migrations
uv run python manage.py migrate

# Start the dev server (API available at http://localhost:8000/api/)
uv run python manage.py runserver 8000

# In separate terminals, start Celery worker and beat
uv run celery -A myvod worker -l info
uv run celery -A myvod beat -l info
```

3) Frontend setup

The frontend lives in `./frontend` (React + Vite). Once committed:
```bash
cd frontend
npm install
npm run dev
```

Notes
- Example environment variables are provided for local development. Adjust for your environment.
- For Docker-based workflows, Dockerfiles and compose definitions will be added in a future iteration.

---

### Available scripts

Backend (run from `myVOD/`):
- Install deps: `uv sync`
- Run tests: `uv run pytest`
- Run server: `uv run python manage.py runserver 8000` (after Django scaffolding)
- Migrations: `uv run python manage.py makemigrations` / `uv run python manage.py migrate`
- Celery worker: `uv run celery -A myvod worker -l info`
- Celery beat: `uv run celery -A myvod beat -l info`

Package references (see [myVOD/pyproject.toml](./myVOD/pyproject.toml)) include: Django 5+, DRF, SimpleJWT, drf-spectacular, Celery, Redis, httpx/requests, psycopg2-binary, pytest (+ plugins), pandas (for data processing), and Google Generative AI SDK.

---

### Project scope

In scope for MVP
- IMDb-backed movie database (one-time TSV import)
- Search with autocomplete (title, poster via TMDB)
- Watchlist management
- VOD availability via Watchmode for 5 platforms (Netflix, HBO Max, Disney+, Prime Video, Apple TV+)
- Accounts (email + password), JWT-based authentication, basic profile with platform preferences
- Mark as watched + history
- AI suggestions (Gemini-flash-lite) with 24h cache and daily usage limit
- Onboarding flow (3 steps)
- Basic analytics and admin dashboard
- GDPR-compliant data deletion
- User and IMDB ratings

Out of scope for MVP (planned later)
- TV series; localized titles; email verification
- edit watch date
- >5 platforms; more frequent availability updates
- Advanced recommendations; automatic IMDb import; sharing watchlists
- Mobile apps; IMDb imports; region selection; social integrations; trailers/reviews
- Push notifications; premium/subscription model

For detailed acceptance criteria and user stories, see the PRD: [./.ai/prd.md](./.ai/prd.md)

---

### Project status

- **Status**: MVP Completed.
- **Live Application**: [https://myvod.onrender.com](https://myvod.onrender.com)
- **Code**: Both the backend and frontend are feature-complete for the MVP scope.
- **Deployment**: The application is containerized with Docker, has an active CI/CD pipeline using GitHub Actions, and is deployed to production on Render.
  - **Backend Docker Image**: [tomaszwolk/10xmovies-backend](https://hub.docker.com/repository/docker/tomaszwolk/10xmovies-backend/general)
  - **Frontend Docker Image**: [tomaszwolk/myvod](https://hub.docker.com/repository/docker/tomaszwolk/myvod/general)

---

### Future Roadmap

The project is actively developed. Key features planned for future releases include:

- **Advanced Filtering & Search**: Enhanced filtering by VOD platforms and significant improvements to search speed.
- **IMDb Integration**: Automatic import of watchlist and rated movies directly from a user's public IMDb profile.
- **Enriched Movie Data**: Addition of localized titles, director/actor information, and making movie titles direct links to their IMDb pages.
- **Demo Mode**: A "login as demo user" option to quickly explore the app's features without registration.
- **Initial Recommendations**: A carousel of popular movies for new users to get started.

---

### Known Issues

- **Initial Page Load**: The first page load, especially with many movies on user lists, may be slower due to fetching posters.
- **Search Performance**: The search functionality is undergoing optimization to provide faster results.
- **Session Handling**: In rare cases, after a long period of inactivity, a manual re-login might be necessary.

---

### License

TBD. If you intend to use this code, please review the repository for an eventual `LICENSE` file and update this section accordingly.


