-- Przykładowe rekordy dla tabeli integration_error_log do testów
-- Tabela jest partycjonowana miesięcznie po occurred_at
-- Użyj dat z różnych miesięcy aby pokryć różne partycje

-- UWAGA: Przed wstawieniem sprawdź czy partycje dla tych miesięcy istnieją w bazie
-- Jeśli nie, możesz użyć dat z bieżącego roku (2025)

-- ============================================
-- REKORDY DLA RÓŻNYCH TYPÓW API
-- ============================================

-- 1. TMDB - błąd połączenia (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Connection timeout after 30 seconds',
    '{"status_code": 504, "endpoint": "/search/movie", "timeout": 30}'::jsonb,
    NULL,
    '2024-01-15 10:30:00+00'::timestamptz
);

-- 2. TMDB - rate limit (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'API rate limit exceeded. Retry after 60 seconds',
    '{"status_code": 429, "retry_after": 60, "endpoint": "/movie/12345"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-01-16 14:20:00+00'::timestamptz
);

-- 3. TMDB - invalid API key (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Invalid API key provided',
    '{"status_code": 401, "endpoint": "/search/movie", "query": "Inception"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-01-17 09:15:00+00'::timestamptz
);

-- 4. Watchmode - błąd network (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Network error: Failed to connect to watchmode.io',
    '{"error_type": "NetworkError", "endpoint": "/title/movie/12345"}'::jsonb,
    NULL,
    '2024-02-05 16:45:00+00'::timestamptz
);

-- 5. Watchmode - invalid response format (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Invalid JSON response from Watchmode API',
    '{"status_code": 200, "response_preview": "{\"error\":\"malformed\"}", "endpoint": "/search/title"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-02-10 11:30:00+00'::timestamptz
);

-- 6. Watchmode - quota exceeded (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'API quota exceeded for this month',
    '{"status_code": 429, "quota_limit": 1000, "quota_used": 1000}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2024-02-15 13:20:00+00'::timestamptz
);

-- 7. Gemini - authentication error (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Google AI API authentication failed',
    '{"status_code": 401, "error_type": "AuthenticationError", "model": "gemini-pro"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-03-01 08:00:00+00'::timestamptz
);

-- 8. Gemini - invalid request format (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Invalid request format: missing required field "prompt"',
    '{"status_code": 400, "error_type": "ValidationError", "missing_fields": ["prompt"]}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2024-03-05 15:30:00+00'::timestamptz
);

-- 9. Gemini - content filter triggered (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Content filter blocked the request',
    '{"status_code": 400, "error_type": "SafetyError", "safety_ratings": [{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "HIGH"}]}'::jsonb,
    NULL,
    '2024-03-10 12:00:00+00'::timestamptz
);

-- 10. Gemini - timeout (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Request timeout after 60 seconds',
    '{"status_code": 504, "timeout": 60, "model": "gemini-pro", "tokens_generated": 500}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2024-03-20 10:15:00+00'::timestamptz
);

-- ============================================
-- DODATKOWE REKORDY DLA RÓŻNYCH SCENARIUSZY
-- ============================================

-- 11. TMDB - movie not found (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Movie not found: tmdb_id=999999',
    '{"status_code": 404, "endpoint": "/movie/999999"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-04-01 14:00:00+00'::timestamptz
);

-- 12. Watchmode - server error (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Internal server error from Watchmode API',
    '{"status_code": 500, "endpoint": "/title/movie/12345"}'::jsonb,
    NULL,
    '2024-04-10 09:30:00+00'::timestamptz
);

-- 13. Gemini - rate limit (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Rate limit exceeded: 60 requests per minute',
    '{"status_code": 429, "rate_limit": 60, "rate_limit_window": "per_minute"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-04-15 16:45:00+00'::timestamptz
);

-- 14. TMDB - invalid movie ID format (z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Invalid movie ID format: expected integer, got "abc123"',
    '{"status_code": 400, "endpoint": "/movie/abc123", "error_type": "ValidationError"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2024-05-01 11:20:00+00'::timestamptz
);

-- 15. Watchmode - timeout (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Request timeout: No response after 45 seconds',
    '{"status_code": 504, "timeout": 45, "endpoint": "/search/title"}'::jsonb,
    NULL,
    '2024-05-10 13:15:00+00'::timestamptz
);

-- ============================================
-- REKORDY Z BIEŻĄCEGO ROKU (2025) - jeśli partycje istnieją
-- ============================================

-- 16. TMDB - recent error (z user_id) - użyj jeśli partycja 2025-01 istnieje
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Connection reset by peer',
    '{"status_code": 0, "error_type": "ConnectionError"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2025-01-15 10:00:00+00'::timestamptz
);

-- 17. Watchmode - recent error (z user_id) - użyj jeśli partycja 2025-01 istnieje
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'API key expired',
    '{"status_code": 401, "error_type": "AuthenticationError"}'::jsonb,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2025-01-20 14:30:00+00'::timestamptz
);

-- ============================================
-- REKORDY Z MINIMALNYMI DANYMI (bez error_details)
-- ============================================

-- 18. TMDB - minimal error (bez error_details)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Unknown error occurred',
    NULL,
    NULL,
    '2024-06-01 08:00:00+00'::timestamptz
);

-- 19. Gemini - minimal error (bez error_details, z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Unexpected error response',
    NULL,
    (SELECT id FROM public.users_user WHERE username = 'user1_errorlogs' LIMIT 1),
    '2024-06-05 12:00:00+00'::timestamptz
);

-- 20. Watchmode - minimal error (bez error_details, z user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Service temporarily unavailable',
    NULL,
    (SELECT id FROM public.users_user WHERE username = 'user2_errorlogs' LIMIT 1),
    '2024-06-10 15:00:00+00'::timestamptz
);

-- ============================================
-- UWAGI:
-- ============================================
-- 1. Jeśli tabela users_user nie zawiera użytkowników 'user1_errorlogs' lub 'user2_errorlogs',
--    możesz użyć NULL dla user_id lub wstawić konkretne UUID użytkowników z Twojej bazy.
--
-- 2. Jeśli partycje dla 2024 nie istnieją, zmień daty na bieżący rok (2025) lub sprawdź
--    jakie partycje są dostępne w bazie:
--    SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
--    FROM pg_tables WHERE tablename LIKE 'integration_error_log%';
--
-- 3. Jeśli chcesz użyć konkretnych UUID użytkowników:
--    SELECT id FROM public.users_user LIMIT 5;  -- wybierz istniejące UUID
--    Następnie zamień (SELECT id FROM...) na konkretne UUID, np. '123e4567-e89b-12d3-a456-426614174000'::uuid
--
-- 4. Możesz też wstawić wszystkie rekordy z jedną datą (np. bieżącą) jeśli masz partycję dla bieżącego miesiąca:
--    occurred_at = NOW() - INTERVAL '1 day' * n  -- gdzie n to różne wartości dla różnych rekordów

