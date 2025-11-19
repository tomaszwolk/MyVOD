from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator

# Uwaga: Modele te zostały wygenerowane ręcznie na podstawie schematu SQL.
# UWAGA TYMCZASOWA: user_id jest obecnie UUIDField, ponieważ baza danych używa UUID.
# W przyszłości należy zmienić bazę danych na INTEGER i użyć ForeignKey(User).
# managed=False oznacza że tabele są zarządzane przez Supabase.


class Platform(models.Model):
    id = models.SmallAutoField(primary_key=True)
    platform_slug = models.TextField(unique=True)
    platform_name = models.TextField()

    class Meta:
        managed = False
        db_table = 'platform'


class Movie(models.Model):
    tconst = models.TextField(primary_key=True)
    primary_title = models.TextField()
    original_title = models.TextField(blank=True, null=True)
    start_year = models.SmallIntegerField(blank=True, null=True)
    genres = ArrayField(models.TextField(), blank=True, null=True)  # PostgreSQL text[] array
    avg_rating = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    num_votes = models.IntegerField(blank=True, null=True)
    poster_path = models.TextField(blank=True, null=True)
    poster_last_checked = models.DateTimeField(blank=True, null=True)
    tmdb_id = models.BigIntegerField(blank=True, null=True)
    watchmode_id = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'movie'


class UserPlatform(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField()
    platform = models.ForeignKey(Platform, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'user_platform'
        unique_together = (('user_id', 'platform'),)


class UserMovie(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField()
    tconst = models.ForeignKey(Movie, models.DO_NOTHING, db_column='tconst')
    watchlisted_at = models.DateTimeField(blank=True, null=True)
    watchlist_deleted_at = models.DateTimeField(blank=True, null=True)
    watched_at = models.DateTimeField(blank=True, null=True)
    added_from_ai_suggestion = models.BooleanField(default=False)
    user_rating = models.SmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = 'user_movie'
        # Note: unique constraint on (user_id, tconst) is enforced at database level
        # Don't define unique_together here as it can cause issues with managed=False


class MovieAvailability(models.Model):
    id = models.BigAutoField(primary_key=True)
    tconst = models.ForeignKey(Movie, models.DO_NOTHING, db_column='tconst', related_name='availability_entries')
    platform = models.ForeignKey(Platform, models.DO_NOTHING)
    is_available = models.BooleanField(blank=True, null=True)
    last_checked = models.DateTimeField()
    source = models.TextField()
    details = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'movie_availability'
        unique_together = (('tconst', 'platform'),)


class AiSuggestionBatch(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField()
    generated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    prompt = models.TextField(blank=True, null=True)
    response = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ai_suggestion_batch'


class Event(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField(blank=True, null=True)
    event_type = models.TextField()
    occurred_at = models.DateTimeField()
    properties = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'event'
        unique_together = (('id', 'occurred_at'),)


class IntegrationErrorLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    api_type = models.TextField()
    error_message = models.TextField()
    error_details = models.JSONField(blank=True, null=True)
    user_id = models.UUIDField(blank=True, null=True)
    occurred_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'integration_error_log'
        unique_together = (('id', 'occurred_at'),)


class Genre(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(unique=True)

    class Meta:
        managed = True
        db_table = 'genre'