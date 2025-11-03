-- ============================================
-- UTWORZENIE PARTYCJI DLA integration_error_log
-- Tabela jest partycjonowana miesięcznie po occurred_at
-- ============================================

-- Sprawdź czy partycje już istnieją przed utworzeniem
DO $$
DECLARE
    partition_exists BOOLEAN;
BEGIN
    -- Sprawdź czy istnieje partycja dla bieżącego miesiąca
    SELECT EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'integration_error_log_' || TO_CHAR(CURRENT_DATE, 'YYYY_MM')
    ) INTO partition_exists;
    
    IF NOT partition_exists THEN
        RAISE NOTICE 'Tworzenie partycji...';
    ELSE
        RAISE NOTICE 'Partycje już istnieją.';
    END IF;
END $$;

-- ============================================
-- PARTYCJE DLA BIEŻĄCEGO I POPRZEDNICH MIESIĘCY
-- ============================================

-- Partycja dla bieżącego miesiąca (2025-11 - listopad)
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_11
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');

-- Partycja dla października 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_10
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');

-- Partycja dla września 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_09
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');

-- Partycja dla sierpnia 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_08
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');

-- Partycja dla lipca 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_07
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');

-- Partycja dla czerwca 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_06
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

-- Partycja dla maja 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_05
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

-- Partycja dla kwietnia 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_04
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

-- Partycja dla marca 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_03
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

-- Partycja dla lutego 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_02
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

-- Partycja dla stycznia 2025
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_01
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

-- Partycja dla grudnia 2025 (przygotowanie na przyszłość)
CREATE TABLE IF NOT EXISTS public.integration_error_log_2025_12
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- Partycja dla poprzedniego miesiąca (2024-12) - dla danych historycznych
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_12
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- Partycja dla listopada 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_11
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-11-01 00:00:00+00') TO ('2024-12-01 00:00:00+00');

-- Partycja dla października 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_10
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');

-- Partycja dla września 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_09
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');

-- Partycja dla sierpnia 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_08
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');

-- Partycja dla lipca 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_07
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-07-01 00:00:00+00') TO ('2024-08-01 00:00:00+00');

-- Partycja dla czerwca 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_06
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-06-01 00:00:00+00') TO ('2024-07-01 00:00:00+00');

-- Partycja dla maja 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_05
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-05-01 00:00:00+00') TO ('2024-06-01 00:00:00+00');

-- Partycja dla kwietnia 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_04
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-04-01 00:00:00+00') TO ('2024-05-01 00:00:00+00');

-- Partycja dla marca 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_03
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-03-01 00:00:00+00') TO ('2024-04-01 00:00:00+00');

-- Partycja dla lutego 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_02
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-02-01 00:00:00+00') TO ('2024-03-01 00:00:00+00');

-- Partycja dla stycznia 2024
CREATE TABLE IF NOT EXISTS public.integration_error_log_2024_01
PARTITION OF public.integration_error_log
FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2024-02-01 00:00:00+00');

-- ============================================
-- WERYFIKACJA UTWORZONYCH PARTYCJI
-- ============================================

-- Sprawdź utworzone partycje
SELECT 
    pg_parent.relname AS parent_table,
    pg_child.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(pg_child.oid)) AS size
FROM pg_inherits
JOIN pg_class pg_parent ON pg_inherits.inhparent = pg_parent.oid
JOIN pg_class pg_child ON pg_inherits.inhrelid = pg_child.oid
JOIN pg_namespace ON pg_parent.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND pg_parent.relname = 'integration_error_log'
ORDER BY pg_child.relname;

-- ============================================
-- UWAGI:
-- ============================================
-- 1. Partycje zostały utworzone dla:
--    - Bieżącego miesiąca: listopad 2025 (2025-11)
--    - Całego roku 2025: styczeń-listopad (oraz grudzień przygotowany)
--    - Całego roku 2024: styczeń-grudzień (dla danych historycznych)
--
-- 2. Jeśli potrzebujesz partycji dla przyszłych miesięcy, możesz je dodać:
--    CREATE TABLE IF NOT EXISTS public.integration_error_log_2026_01
--    PARTITION OF public.integration_error_log
--    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
--
-- 3. Możesz również utworzyć funkcję, która automatycznie tworzy partycje:
--    - Sprawdza czy partycja dla następnego miesiąca istnieje
--    - Jeśli nie, tworzy ją automatycznie
--    - Można uruchomić ją jako scheduled job (np. przez pg_cron)
--
-- 4. Po utworzeniu partycji możesz użyć danych z datami względnymi 
--    (NOW() - INTERVAL) lub konkretnymi datami z zakresu 2024-01 do 2025-11
--
-- 5. Daty względne (NOW() - INTERVAL) będą automatycznie trafiać do 
--    odpowiedniej partycji w zależności od bieżącej daty

