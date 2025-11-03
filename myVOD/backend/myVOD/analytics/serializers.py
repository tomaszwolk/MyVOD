"""
Serializers for admin analytics endpoints.
"""

from rest_framework import serializers


class RetentionPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    retention_7d = serializers.FloatField()
    retention_30d = serializers.FloatField()


class UsersGrowthPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class NewUsersSerializer(serializers.Serializer):
    today = serializers.IntegerField(default=0)
    last_7_days = serializers.IntegerField(default=0)
    last_30_days = serializers.IntegerField(default=0)


class AdminMetricsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField(default=0)
    new_users = NewUsersSerializer()
    retention_7d_percent = serializers.FloatField(default=0.0)
    retention_30d_percent = serializers.FloatField(default=0.0)
    pct_users_with_min_10_movies = serializers.FloatField(default=0.0)
    pct_users_used_ai = serializers.FloatField(default=0.0)
    pct_users_added_ai_movies = serializers.FloatField(default=0.0)
    avg_movies_per_user = serializers.FloatField(default=0.0)
    retention_timeseries = RetentionPointSerializer(many=True, required=False, allow_null=True)
    new_users_timeseries = UsersGrowthPointSerializer(many=True, required=False, allow_null=True)
    last_updated_at = serializers.DateTimeField()


class TopMoviesItemSerializer(serializers.Serializer):
    tconst = serializers.CharField()
    primary_title = serializers.CharField()
    start_year = serializers.IntegerField(allow_null=True)
    count = serializers.IntegerField()


class TopMoviesSerializer(serializers.Serializer):
    type = serializers.CharField()
    range = serializers.CharField()
    items = TopMoviesItemSerializer(many=True)


class ErrorLogItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    occurred_at = serializers.DateTimeField()
    api_type = serializers.CharField()
    error_message = serializers.CharField()
    user_id = serializers.UUIDField(allow_null=True)


class ErrorLogsSerializer(serializers.Serializer):
    items = ErrorLogItemSerializer(many=True)
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total = serializers.IntegerField()
    total_pages = serializers.IntegerField()

