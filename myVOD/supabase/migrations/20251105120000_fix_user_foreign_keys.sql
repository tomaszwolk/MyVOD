-- migration: 20251105120000_fix_user_foreign_keys.sql
-- description: corrects the user_id foreign key constraints to reference the Django users table (public.users_user) instead of the Supabase auth table (auth.users).

-- Table: user_platform
ALTER TABLE "public"."user_platform" DROP CONSTRAINT "user_platform_user_id_fkey";
ALTER TABLE "public"."user_platform" ADD CONSTRAINT "user_platform_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "public"."users_user"(id) ON DELETE CASCADE;

-- Table: user_movie
ALTER TABLE "public"."user_movie" DROP CONSTRAINT "user_movie_user_id_fkey";
ALTER TABLE "public"."user_movie" ADD CONSTRAINT "user_movie_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "public"."users_user"(id) ON DELETE CASCADE;

-- Table: ai_suggestion_batch
ALTER TABLE "public"."ai_suggestion_batch" DROP CONSTRAINT "ai_suggestion_batch_user_id_fkey";
ALTER TABLE "public"."ai_suggestion_batch" ADD CONSTRAINT "ai_suggestion_batch_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "public"."users_user"(id) ON DELETE CASCADE;

-- Table: event
ALTER TABLE "public"."event" DROP CONSTRAINT "event_user_id_fkey";
ALTER TABLE "public"."event" ADD CONSTRAINT "event_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "public"."users_user"(id) ON DELETE SET NULL;

-- Table: integration_error_log
ALTER TABLE "public"."integration_error_log" DROP CONSTRAINT "integration_error_log_user_id_fkey";
ALTER TABLE "public"."integration_error_log" ADD CONSTRAINT "integration_error_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "public"."users_user"(id) ON DELETE SET NULL;