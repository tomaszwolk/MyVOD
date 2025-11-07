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
  - [License](#license)

---

### Tech stack

- Backend
  - Django 5.0+ and Django REST Framework (DRF)
  - Celery 5.3+ with Redis 7+ (worker + beat)
  - PostgreSQL 15 (via Supabase or self-managed)
  - API documentation with drf-spectacular
  - JWT auth with djangorestframework-simplejwt

- Frontend (planned)
  - React 18 + Vite 5+
  - Tailwind CSS + shadcn/ui
  - TanStack Query, React Router v6, Axios

- External Services
  - Watchmode.com API (VOD availability)
  - TMDB API (movie posters)
  - Google Gemini (gemini-1.5-flash) for AI suggestions

- Tooling & DevOps
  - Python 3.12+ with [uv](https://github.com/astral-sh/uv)
  - Linting/formatting with Ruff (planned)
  - Testing: 
    - Backend (Unit/Integration): pytest (+ pytest-django)
    - Frontend (Unit/Component): Vitest, React Testing Library (planned)
    - E2E: Playwright (planned)
  - Containerization: Docker + Docker Compose (planned)
  - CI/CD: GitHub Actions (planned)
  - Hosting: Render.com (PaaS)

See tech stack details: [./.ai/tech-stack.md](./.ai/tech-stack.md)

---

### Hosting and Deployment

The application is designed for a containerized multi-service architecture and will be hosted on [Render](https://render.com/), a unified cloud platform (PaaS).

The key components of the production environment on Render include:
- **Web Service**: Runs the Dockerized Django + Gunicorn application.
- **Background Worker**: Runs the Celery worker for asynchronous tasks.
- **Managed PostgreSQL**: A dedicated, managed database instance.
- **Managed Redis**: A managed instance for Celery's message broker and caching.
- **Static Site**: Serves the compiled React frontend application, providing fast, global delivery via Render's CDN.

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
# Apply migrations
uv run python manage.py migrate

# Start the dev server
uv run python manage.py runserver 8000

# In separate terminals, start Celery worker and beat
uv run celery -A myvod worker -l info
uv run celery -A myvod beat -l info
```

3) Frontend setup (planned)

The frontend will live in `./frontend` (React + Vite). Once committed:
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
- Watchlist management (limit 10 movies)
- VOD availability via Watchmode for 5 platforms (Netflix, HBO Max, Disney+, Prime Video, Apple TV+)
- Accounts (email + password), sessions, basic profile with platform preferences
- Mark as watched + history
- AI suggestions (Gemini-flash-lite) with 24h cache and daily usage limit
- Onboarding flow (3 steps)
- Basic analytics and admin dashboard
- GDPR-compliant data deletion

Out of scope for MVP (planned later)
- TV series; localized titles; email verification; forgotten password
- Ratings/notes; edit watch date
- >5 platforms; more frequent availability updates
- Advanced recommendations; automatic IMDb import; sharing watchlists
- Mobile apps; IMDb imports; region selection; social integrations; trailers/reviews
- Push notifications; premium/subscription model

For detailed acceptance criteria and user stories, see the PRD: [./.ai/prd.md](./.ai/prd.md)

---

### Project status

- Status: Work in progress (MVP planning and early backend setup)
- Documents: PRD and tech stack finalized for MVP direction
- Code: Backend dependencies declared; Django/DRF scaffolding and frontend app will be committed incrementally
- CI/CD, Docker, and production deployment are planned but not yet committed

---

### License

TBD. If you intend to use this code, please review the repository for an eventual `LICENSE` file and update this section accordingly.


