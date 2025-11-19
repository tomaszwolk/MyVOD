# Database Schema for myVOD

This document outlines the database schema for the myVOD application, based on the planning session summary.

## 1. Tables

### Users and Identity

Single user concept (source of truth):

- Django application users with UUID primary key in table `public.users_user`
- Managed by Django Auth + SimpleJWT; used for login and permissions
- Domain tables (`user_platform`, `user_movie`, `ai_suggestion_batch`, `event`, `integration_error_log`) store a `user_id UUID` that references `public.users_user(id)`

---

### `platform`
Stores VOD platforms.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `smallint` | **Primary Key**, Identity | Unique identifier for the platform. |
| `platform_slug` | `text` | **Unique**, Not Null | URL-friendly slug (e.g., "netflix"). |
| `platform_name` | `text` | Not Null | User-friendly name (e.g., "Netflix"). |

---

### `genre`
Stores unique movie genres. This table is populated via a Django management command.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | **Primary Key** | Unique identifier for the genre. |
| `name` | `text` | **Unique**, Not Null | The name of the genre (e.g., "Action"). |

---

### `user_platform`
Links users to their subscribed VOD platforms (M:N relationship).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | **Primary Key**, Identity | Surrogate key for the row. |
| `user_id` | `uuid` | **Foreign Key** -> `public.users_user(id)` ON DELETE CASCADE, Not Null | User's identifier. |
| `platform_id` | `smallint` | **Foreign Key** -> `platform(id)` ON DELETE CASCADE, Not Null | Platform's identifier. |
| | | **Unique** (`user_id`, `platform_id`) | Ensures a user can only subscribe to each platform once. |

---

### `movie`
Stores movie information imported from IMDb and enriched with other sources.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `tconst` | `text` | **Primary Key** | IMDb unique identifier for the title (e.g., "tt0111161"). |
| `primary_title`| `text` | Not Null | The primary title of the movie. |
| `original_title`| `text` | | The original title of the movie, if different. |
| `start_year` | `smallint` | | The release year of the movie. |
| `genres` | `text[]` | | Array of movie genres. |
| `avg_rating` | `numeric(3, 1)` | | Average user rating. |
| `num_votes` | `integer` | | Number of votes for the rating. |
| `poster_path` | `text` | | URL path to the movie poster (from TMDB). |
| `poster_last_checked` | `timestamptz` | | When the poster path was last checked/updated. |
| `tmdb_id` | `bigint` | Indexed (partial, non-unique) | The Movie Database (TMDB) ID. |
| `watchmode_id` | `bigint` | Indexed (partial, non-unique) | Watchmode.com ID. |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of record creation. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of last record update. |

---

### `user_movie`
Tracks a user's interaction with a movie (watchlist, watched history).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | **Primary Key**, Identity | Unique identifier for the interaction. |
| `user_id` | `uuid` | **Foreign Key** -> `public.users_user(id)` ON DELETE CASCADE, Not Null | The user associated with this interaction. References Django User table. |
| `tconst` | `text` | **Foreign Key** -> `movie(tconst)` ON DELETE CASCADE, Not Null | The movie associated with this interaction. |
| `watchlisted_at`| `timestamptz` | | Timestamp when the movie was added to the watchlist. |
| `watchlist_deleted_at`| `timestamptz` | | Timestamp for soft-deleting from the watchlist. |
| `watched_at` | `timestamptz` | | Timestamp when the user marked the movie as watched. |
| `user_rating` | `smallint` | `CHECK (user_rating >= 1 AND user_rating <= 10)` | User's personal rating for the movie (1-10). |
| `added_from_ai_suggestion`| `boolean` | Not Null, `default false` | Flag indicating if it was added from an AI suggestion. |
| | | **Unique** (`user_id`, `tconst`) | Ensures a single interaction record per user per movie. |

**Important:** The `user_id` foreign key must reference `public.users_user(id)` (Django User table), NOT `auth.users` (Supabase Auth table). This was corrected from the initial migration.

---

### `movie_availability`
Stores the availability of movies on different VOD platforms for the 'PL' region.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | **Primary Key**, Identity | Surrogate key for the row. |
| `tconst` | `text` | **Foreign Key** -> `movie(tconst)` ON DELETE CASCADE, Not Null | Movie identifier. |
| `platform_id` | `smallint` | **Foreign Key** -> `platform(id)` ON DELETE CASCADE, Not Null | Platform identifier. |
| `is_available` | `boolean` | | Tri-state: `true` (available), `false` (unavailable), `null` (unknown). |
| `last_checked` | `timestamptz` | Not Null | Timestamp of the last availability check. |
| `source` | `text` | Not Null | The source of the availability data (e.g., "watchmode"). |
| `details` | `jsonb` | | Additional details from the source API (e.g., deep links). |
| | | **Unique** (`tconst`, `platform_id`) | Ensures one row per movie+platform. |

---

### `ai_suggestion_batch`
Caches AI-generated movie suggestions for users.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | **Primary Key**, Identity | Unique identifier for the suggestion batch. |
| `user_id` | `uuid` | **Foreign Key** -> `public.users_user(id)` ON DELETE CASCADE, Not Null | The user who received the suggestions. |
| `generated_at` | `timestamptz` | Not Null, `default now()` | Timestamp when the suggestions were generated. Used for calendar-day rate limiting. |
| `expires_at` | `timestamptz` | Not Null | Expiration time for the cached suggestions (set to end of calendar day: 23:59:59). |
| `prompt` | `text` | | The user prompt that generated the suggestions. |
| `response` | `jsonb` | | The full JSON response from the AI model. |

**Rate Limiting**: Suggestions are limited to once per calendar day (server timezone). Rate limit is enforced by checking if the date portion of `generated_at` matches the current server date.

---

### `event`
A partitioned table for analytics events.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | Identity | Unique identifier for the event. |
| `user_id` | `uuid` | **Foreign Key** -> `public.users_user(id)` ON DELETE SET NULL | The user who triggered the event. |
| `event_type` | `text` | Not Null | Type of event (e.g., "search", "availability_refresh"). |
| `occurred_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the event. |
| `properties` | `jsonb` | | Additional event data (e.g., `{ "query": "...", "results_count": 5 }`). |

**Partitioning:** Partition by `RANGE(occurred_at)` monthly.
**Primary Key:** Composite (`id`, `occurred_at`) to include the partition key as required for partitioned tables.

---

### `integration_error_log`
A partitioned table for logging errors from external API integrations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | Identity | Unique identifier for the log entry. |
| `api_type` | `text` | Not Null | The external API that produced the error (e.g., "tmdb", "watchmode"). |
| `error_message`| `text` | Not Null | The error message. |
| `error_details`| `jsonb` | | Detailed error information (e.g., stack trace, request body). |
| `user_id` | `uuid` | **Foreign Key** -> `public.users_user(id)` ON DELETE SET NULL | The user associated with the request, if any. |
| `occurred_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the error. |

**Partitioning:** Partition by `RANGE(occurred_at)` monthly.
**Primary Key:** Composite (`id`, `occurred_at`) to include the partition key as required for partitioned tables.

## 2. Relationships

- **`users` to `user_platform`**: One-to-Many. A user can have multiple platform subscriptions.
- **`platform` to `user_platform`**: One-to-Many. A platform can be subscribed to by many users.
- **`users` to `user_movie`**: One-to-Many. A user can have many movie interactions.
- **`movie` to `user_movie`**: One-to-Many. A movie can be on many users' watchlists.
- **`movie` to `movie_availability`**: One-to-Many. A movie can have availability status on multiple platforms.
- **`platform` to `movie_availability`**: One-to-Many. A platform can list many movies.
- **`users` to `ai_suggestion_batch`**: One-to-Many. A user can have multiple suggestion batches over time.
- **`users` to `event` / `integration_error_log`**: One-to-Many. A user can be associated with multiple events or errors.

## 3. Indexes

### `movie`
- **Partial Index (non-unique)** on `tmdb_id` WHERE `tmdb_id` IS NOT NULL.
- **Partial Index (non-unique)** on `watchmode_id` WHERE `watchmode_id` IS NOT NULL.
- **GIN Index** on `public.immutable_unaccent(lower(primary_title))` using `extensions.gin_trgm_ops` for fast, case-insensitive, accent-insensitive search.
- **B-Tree Index** on `start_year` for filtering by year.
- **GIN Index** on `genres` for filtering by genre.

### `user_movie`
- **Partial Index** on `(user_id)` WHERE `watchlisted_at` IS NOT NULL AND `watchlist_deleted_at` IS NULL for efficiently fetching a user's active watchlist.
- **Partial Index** on `(user_id)` WHERE `watched_at` IS NOT NULL for efficiently fetching a user's watched history.

### `movie_availability`
- **Partial Index** on `(tconst, platform_id)` WHERE `is_available` IS TRUE for quickly finding available movies.

## 4. PostgreSQL Policies (Row-Level Security)

**Important**: This application uses **Django Auth + JWT**. Therefore:
- Django connects as a single application user to Postgres (no per-user DB sessions)
- Row ownership and authorization are enforced in the Django application layer

**RLS Configuration:**
- **User-owned tables** (`user_platform`, `user_movie`, `ai_suggestion_batch`, `event`): RLS disabled; authorization in Django views/services
- **Read-Only Data** (`movie`, `platform`, `movie_availability`): RLS enabled to prevent writes
- **Admin-Only** (`integration_error_log`): RLS enabled; accessible to admin role only

## 5. Extensions

The following PostgreSQL extensions need to be enabled:
- `unaccent`: For removing accents from text during search.
- `pg_trgm`: For trigram-based text similarity, improving search results.

## 6. Additional Notes

- **Data Retention**:
  - `event` and `integration_error_log` records will be kept for 90 days. Old partitions will be dropped by a daily job.
  - `ai_suggestion_batch` records will be deleted 30 days after `expires_at`.
- **Soft Deletes**: The `user_movie` table uses a `watchlist_deleted_at` timestamp for soft-deleting items from a user's watchlist, preserving history.
- **Region**: All availability data is for the 'PL' (Poland) region in the MVP. This is handled in the application logic, not with a dedicated column.
- **External ID Mapping**: Mappings between external service names (e.g., Watchmode's "HBO Max") and internal `platform_slug` values (e.g., "hbomax") are managed in the Django `settings.py` file under the `VOD_PLATFORMS` dictionary. This allows for flexible integration without hardcoding values in the business logic.

### Migration Notes

**Foreign Key Correction (user_movie.user_id):**
During initial setup, the `user_movie` table's foreign key constraint may have been created pointing to `auth.users` (Supabase Auth). This must be corrected to point to `public.users_user` (Django User table):

```sql
-- Remove incorrect foreign key constraint
ALTER TABLE public.user_movie 
DROP CONSTRAINT IF EXISTS user_movie_user_id_fkey;

-- Add correct foreign key constraint
ALTER TABLE public.user_movie 
ADD CONSTRAINT user_movie_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users_user(id) 
ON DELETE CASCADE;
```

This ensures that user_movie records are properly linked to Django-managed users, not Supabase Auth users.

---

## 7. Django Tables

In addition to the tables defined above, the database will also contain standard tables created and managed by Django's migration system. These are essential for the framework's operation. Key tables include:

- `auth_user`, `auth_group`, `auth_permission`, `auth_user_groups`, `auth_user_user_permissions`: For handling authentication and authorization.
- `django_session`: For storing session data. **Note**: With JWT authentication, this table is not used for API authentication (stateless), but may be used for Django admin panel sessions.
- `django_admin_log`: For logging actions taken in the Django admin panel.
- `django_content_type`: A core part of Django's content type framework.
- `django_migrations`: Tracks which migrations have been applied.

### Authentication Model

The application uses **JWT (JSON Web Tokens)** via `djangorestframework-simplejwt`:
- **Access Token**: 1 hour (configurable)
- **Refresh Token**: 1 day (configurable)
- **Blacklisting**: Enabled after rotation (refresh tokens are blacklisted on rotation/logout)