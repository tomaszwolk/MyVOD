-- ============================================
-- SPRAWDZENIE PARTYCJI W POSTGRESQL
-- ============================================

-- 1. Sprawdź czy tabela jest partycjonowana (partitioned table)
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_inherits 
            WHERE inhrelid = (SELECT oid FROM pg_class WHERE relname = tablename AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = schemaname))
        ) THEN 'partition'
        WHEN EXISTS (
            SELECT 1 
            FROM pg_class 
            WHERE relname = tablename 
              AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = schemaname)
              AND relkind = 'p'
        ) THEN 'partitioned table'
        ELSE 'regular table'
    END AS table_type
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'integration_error_log%';

-- 2. Sprawdź wszystkie tabele związane z integration_error_log (w tym partycje)
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    CASE 
        WHEN c.relkind = 'p' THEN 'partitioned table (parent)'
        WHEN c.relkind = 'r' THEN 'regular table'
        ELSE 'other'
    END AS table_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'integration_error_log%'
ORDER BY c.relname;

-- 3. Sprawdź partycje poprzez pg_inherits (jeśli istnieją)
SELECT 
    pg_parent.relname AS parent_table,
    pg_child.relname AS partition_name
FROM pg_inherits
JOIN pg_class pg_parent ON pg_inherits.inhparent = pg_parent.oid
JOIN pg_class pg_child ON pg_inherits.inhrelid = pg_child.oid
JOIN pg_namespace ON pg_parent.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND pg_parent.relname = 'integration_error_log'
ORDER BY pg_child.relname;

-- 4. Sprawdź strukturę tabeli (czy jest PARTITION BY)
SELECT 
    tablename,
    pg_get_tabledef('public.' || tablename) AS table_definition
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'integration_error_log';

-- ============================================
-- JEŚLI PARTYCJE NIE ISTNIEJĄ - UTWÓRZ JE
-- ============================================

-- Tworzenie partycji dla różnych miesięcy (jeśli nie istnieją)
-- Uwaga: Wykonaj tylko jeśli tabela jest partycjonowana ale partycje nie istnieją

-- Przykładowe tworzenie partycji dla stycznia 2024:
-- CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_01
-- PARTITION OF public.integration_error_log
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Przykładowe tworzenie partycji dla lutego 2024:
-- CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_02
-- PARTITION OF public.integration_error_log
-- FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... itd. dla innych miesięcy

-- ============================================
-- ALTERNATYWA: UŻYJ DAT Z BIEŻĄCEGO ROKU/MIESIĄCA
-- ============================================

-- Jeśli partycje nie istnieją, możesz użyć dat z bieżącego okresu
-- Poniżej przykładowe rekordy z datami z ostatnich 30 dni

INSERT INTO public.integration_error_log (api_type, error_message, error_details, user_id, occurred_at)
VALUES 
    ('tmdb', 'Connection timeout after 30 seconds', '{"status_code": 504, "endpoint": "/search/movie"}'::jsonb, NULL, NOW() - INTERVAL '1 day'),
    ('tmdb', 'API rate limit exceeded', '{"status_code": 429, "retry_after": 60}'::jsonb, NULL, NOW() - INTERVAL '2 days'),
    ('watchmode', 'Network error: Failed to connect', '{"error_type": "NetworkError"}'::jsonb, NULL, NOW() - INTERVAL '3 days'),
    ('watchmode', 'Invalid JSON response', '{"status_code": 200}'::jsonb, NULL, NOW() - INTERVAL '5 days'),
    ('gemini', 'Authentication failed', '{"status_code": 401}'::jsonb, NULL, NOW() - INTERVAL '7 days'),
    ('gemini', 'Invalid request format', '{"status_code": 400}'::jsonb, NULL, NOW() - INTERVAL '10 days'),
    ('tmdb', 'Movie not found', '{"status_code": 404}'::jsonb, NULL, NOW() - INTERVAL '15 days'),
    ('watchmode', 'Server error', '{"status_code": 500}'::jsonb, NULL, NOW() - INTERVAL '20 days'),
    ('gemini', 'Rate limit exceeded', '{"status_code": 429}'::jsonb, NULL, NOW() - INTERVAL '25 days'),
    ('tmdb', 'Unknown error', NULL, NULL, NOW() - INTERVAL '30 days');

