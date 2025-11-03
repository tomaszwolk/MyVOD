-- ============================================
-- BEZPIECZNA WERSJA - UŻYWA DAT WZGLĘDNYCH (NOW())
-- Ta wersja działa niezależnie od istniejących partycji
-- ============================================

-- 1. TMDB - błąd połączenia (bez user_id)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Connection timeout after 30 seconds',
    '{"status_code": 504, "endpoint": "/search/movie", "timeout": 30}'::jsonb,
    NULL,
    NOW() - INTERVAL '1 day'
);

-- 2. TMDB - rate limit
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'API rate limit exceeded. Retry after 60 seconds',
    '{"status_code": 429, "retry_after": 60, "endpoint": "/movie/12345"}'::jsonb,
    NULL,
    NOW() - INTERVAL '2 days'
);

-- 3. TMDB - invalid API key
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Invalid API key provided',
    '{"status_code": 401, "endpoint": "/search/movie", "query": "Inception"}'::jsonb,
    NULL,
    NOW() - INTERVAL '3 days'
);

-- 4. Watchmode - błąd network
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Network error: Failed to connect to watchmode.io',
    '{"error_type": "NetworkError", "endpoint": "/title/movie/12345"}'::jsonb,
    NULL,
    NOW() - INTERVAL '5 days'
);

-- 5. Watchmode - invalid response format
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Invalid JSON response from Watchmode API',
    '{"status_code": 200, "response_preview": "{\"error\":\"malformed\"}", "endpoint": "/search/title"}'::jsonb,
    NULL,
    NOW() - INTERVAL '7 days'
);

-- 6. Watchmode - quota exceeded
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'API quota exceeded for this month',
    '{"status_code": 429, "quota_limit": 1000, "quota_used": 1000}'::jsonb,
    NULL,
    NOW() - INTERVAL '10 days'
);

-- 7. Gemini - authentication error
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Google AI API authentication failed',
    '{"status_code": 401, "error_type": "AuthenticationError", "model": "gemini-pro"}'::jsonb,
    NULL,
    NOW() - INTERVAL '12 days'
);

-- 8. Gemini - invalid request format
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Invalid request format: missing required field "prompt"',
    '{"status_code": 400, "error_type": "ValidationError", "missing_fields": ["prompt"]}'::jsonb,
    NULL,
    NOW() - INTERVAL '15 days'
);

-- 9. Gemini - content filter triggered
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Content filter blocked the request',
    '{"status_code": 400, "error_type": "SafetyError", "safety_ratings": [{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "HIGH"}]}'::jsonb,
    NULL,
    NOW() - INTERVAL '18 days'
);

-- 10. Gemini - timeout
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Request timeout after 60 seconds',
    '{"status_code": 504, "timeout": 60, "model": "gemini-pro", "tokens_generated": 500}'::jsonb,
    NULL,
    NOW() - INTERVAL '20 days'
);

-- 11. TMDB - movie not found
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Movie not found: tmdb_id=999999',
    '{"status_code": 404, "endpoint": "/movie/999999"}'::jsonb,
    NULL,
    NOW() - INTERVAL '22 days'
);

-- 12. Watchmode - server error
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Internal server error from Watchmode API',
    '{"status_code": 500, "endpoint": "/title/movie/12345"}'::jsonb,
    NULL,
    NOW() - INTERVAL '25 days'
);

-- 13. Gemini - rate limit
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Rate limit exceeded: 60 requests per minute',
    '{"status_code": 429, "rate_limit": 60, "rate_limit_window": "per_minute"}'::jsonb,
    NULL,
    NOW() - INTERVAL '27 days'
);

-- 14. TMDB - invalid movie ID format
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Invalid movie ID format: expected integer, got "abc123"',
    '{"status_code": 400, "endpoint": "/movie/abc123", "error_type": "ValidationError"}'::jsonb,
    NULL,
    NOW() - INTERVAL '28 days'
);

-- 15. Watchmode - timeout
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Request timeout: No response after 45 seconds',
    '{"status_code": 504, "timeout": 45, "endpoint": "/search/title"}'::jsonb,
    NULL,
    NOW() - INTERVAL '29 days'
);

-- 16. TMDB - minimal error (bez error_details)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'tmdb',
    'Unknown error occurred',
    NULL,
    NULL,
    NOW() - INTERVAL '30 days'
);

-- 17. Gemini - minimal error (bez error_details)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'gemini',
    'Unexpected error response',
    NULL,
    NULL,
    NOW() - INTERVAL '31 days'
);

-- 18. Watchmode - minimal error (bez error_details)
INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES (
    'watchmode',
    'Service temporarily unavailable',
    NULL,
    NULL,
    NOW() - INTERVAL '32 days'
);

-- ============================================
-- UWAGI:
-- ============================================
-- Ta wersja używa dat względnych (NOW() - INTERVAL), więc:
-- - Działa niezależnie od istniejących partycji
-- - Automatycznie używa bieżącego okresu
-- - Idealna do testów - rekordy będą w aktualnej partycji
-- - Jeśli chcesz dodać user_id, znajdź istniejące UUID:
--   SELECT id FROM public.users_user LIMIT 5;
--   Następnie zamień NULL na konkretne UUID

