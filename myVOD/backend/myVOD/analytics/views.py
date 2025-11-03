"""
Analytics views for admin dashboard.
Provides metrics, top movies, and error logs endpoints.
"""

import logging
import csv
from datetime import datetime, timedelta
from django.utils import timezone as django_timezone
from django.db.models import Count, Avg
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from movies.models import UserMovie, IntegrationErrorLog, AiSuggestionBatch
from users.models import User
from .serializers import (
    AdminMetricsSerializer,
    TopMoviesSerializer,
    ErrorLogsSerializer,
)

logger = logging.getLogger(__name__)


class IsStaffUser(IsAuthenticated):
    """
    Permission class that checks if user is authenticated and is staff.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if not request.user.is_staff:
            return False

        return True


class AdminMetricsView(APIView):
    """
    Get admin metrics including user counts, retention, and timeseries data.
    
    GET /admin/analytics/api/metrics/
    
    Requires staff permissions.
    """
    permission_classes = [IsStaffUser]
    
    @extend_schema(
        summary="Get admin metrics",
        description="Retrieves aggregated metrics for admin dashboard",
        responses={
            200: AdminMetricsSerializer,
            403: OpenApiTypes.OBJECT,
        },
        tags=['Admin Analytics'],
    )
    def get(self, request):
        """Calculate and return admin metrics."""
        try:
            now = django_timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            seven_days_ago = now - timedelta(days=7)
            thirty_days_ago = now - timedelta(days=30)
            
            # Total users
            total_users = User.objects.filter(is_active=True).count()
            
            # New users
            new_users_today = User.objects.filter(
                date_joined__gte=today_start,
                is_active=True
            ).count()
            
            new_users_7d = User.objects.filter(
                date_joined__gte=seven_days_ago,
                is_active=True
            ).count()
            
            new_users_30d = User.objects.filter(
                date_joined__gte=thirty_days_ago,
                is_active=True
            ).count()
            
            # Retention calculations (simplified - users active after N days)
            # Retention 7d: users who registered more than 7 days ago and have activity
            users_7d_ago = User.objects.filter(
                date_joined__lte=seven_days_ago,
                is_active=True
            )
            users_7d_retained = User.objects.filter(
                id__in=UserMovie.objects.filter(
                    user_id__in=users_7d_ago.values_list('id', flat=True)
                ).values_list('user_id', flat=True).distinct()
            ).distinct().count()
            retention_7d_percent = (
                (users_7d_retained / users_7d_ago.count() * 100)
                if users_7d_ago.exists() else 0
            )
            
            # Retention 30d: users who registered more than 30 days ago and have activity
            users_30d_ago = User.objects.filter(
                date_joined__lte=thirty_days_ago,
                is_active=True
            )
            users_30d_retained = User.objects.filter(
                id__in=UserMovie.objects.filter(
                    user_id__in=users_30d_ago.values_list('id', flat=True)
                ).values_list('user_id', flat=True).distinct()
            ).distinct().count()
            retention_30d_percent = (
                (users_30d_retained / users_30d_ago.count() * 100)
                if users_30d_ago.exists() else 0
            )
            
            # Users with >= 10 movies
            user_ids_with_10_movies = UserMovie.objects.filter(
                watchlist_deleted_at__isnull=True
            ).values('user_id').annotate(
                movie_count=Count('id')
            ).filter(movie_count__gte=10).values_list('user_id', flat=True)
            
            users_with_10_movies = User.objects.filter(id__in=user_ids_with_10_movies).count()
            pct_users_with_min_10_movies = (
                (users_with_10_movies / total_users * 100) if total_users > 0 else 0
            )
            
            # Users who used AI (have ai_suggestion_batch)
            users_used_ai_ids = AiSuggestionBatch.objects.values_list('user_id', flat=True).distinct()
            users_used_ai = User.objects.filter(id__in=users_used_ai_ids).count()
            pct_users_used_ai = (
                (users_used_ai / total_users * 100) if total_users > 0 else 0
            )
            
            # Users who added movies from AI suggestions
            users_added_ai_movies_ids = UserMovie.objects.filter(
                added_from_ai_suggestion=True
            ).values_list('user_id', flat=True).distinct()
            users_added_ai_movies = User.objects.filter(id__in=users_added_ai_movies_ids).count()
            pct_users_added_ai_movies = (
                (users_added_ai_movies / total_users * 100) if total_users > 0 else 0
            )
            
            # Average movies per user
            user_movie_counts = UserMovie.objects.filter(
                watchlist_deleted_at__isnull=True
            ).values('user_id').annotate(
                movie_count=Count('id')
            ).aggregate(
                avg_count=Avg('movie_count')
            )
            avg_movies_per_user = user_movie_counts['avg_count'] or 0
            
            # Retention timeseries (last 8 weeks)
            retention_timeseries = []
            for i in range(8):
                week_start = now - timedelta(weeks=i+1)
                week_end = week_start + timedelta(weeks=1)
                
                users_in_week = User.objects.filter(
                    date_joined__gte=week_start,
                    date_joined__lt=week_end,
                    is_active=True
                )
                
                if users_in_week.exists():
                    user_ids_in_week = list(users_in_week.values_list('id', flat=True))
                    
                    # Users who added movies within 7 days
                    users_retained_7d_ids = UserMovie.objects.filter(
                        user_id__in=user_ids_in_week,
                        watchlisted_at__isnull=False,
                        watchlisted_at__lte=week_start + timedelta(days=7)
                    ).values_list('user_id', flat=True).distinct()
                    
                    # Users who added movies within 30 days
                    users_retained_30d_ids = UserMovie.objects.filter(
                        user_id__in=user_ids_in_week,
                        watchlisted_at__isnull=False,
                        watchlisted_at__lte=week_start + timedelta(days=30)
                    ).values_list('user_id', flat=True).distinct()
                    
                    users_retained_7d = len(set(users_retained_7d_ids))
                    users_retained_30d = len(set(users_retained_30d_ids))
                    
                    retention_7d_val = (
                        (users_retained_7d / users_in_week.count() * 100)
                        if users_in_week.exists() else 0
                    )
                    retention_30d_val = (
                        (users_retained_30d / users_in_week.count() * 100)
                        if users_in_week.exists() else 0
                    )
                    
                    retention_timeseries.append({
                        'date': week_start.date().isoformat(),
                        'retention_7d': round(retention_7d_val, 1),
                        'retention_30d': round(retention_30d_val, 1),
                    })
            
            retention_timeseries.reverse()
            
            # New users timeseries (last 30 days)
            new_users_timeseries = []
            for i in range(30):
                day = now.date() - timedelta(days=i)
                day_start = django_timezone.make_aware(datetime.combine(day, datetime.min.time()))
                day_end = day_start + timedelta(days=1)
                
                count = User.objects.filter(
                    date_joined__gte=day_start,
                    date_joined__lt=day_end,
                    is_active=True
                ).count()
                
                new_users_timeseries.append({
                    'date': day.isoformat(),
                    'count': count,
                })
            
            new_users_timeseries.reverse()
            
            data = {
                'total_users': total_users,
                'new_users': {
                    'today': new_users_today,
                    'last_7_days': new_users_7d,
                    'last_30_days': new_users_30d,
                },
                'retention_7d_percent': round(retention_7d_percent, 1),
                'retention_30d_percent': round(retention_30d_percent, 1),
                'pct_users_with_min_10_movies': round(pct_users_with_min_10_movies, 1),
                'pct_users_used_ai': round(pct_users_used_ai, 1),
                'pct_users_added_ai_movies': round(pct_users_added_ai_movies, 1),
                'avg_movies_per_user': round(avg_movies_per_user, 2),
                'retention_timeseries': retention_timeseries,
                'new_users_timeseries': new_users_timeseries,
                'last_updated_at': now.isoformat(),
            }
            
            # Return data directly (serializers are for validation, not output transformation)
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error calculating admin metrics: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to calculate metrics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TopMoviesView(APIView):
    """
    Get top movies by watchlist or watched count.
    
    GET /admin/analytics/api/top-movies/?type=watchlist&range=7d
    
    Requires staff permissions.
    """
    permission_classes = [IsStaffUser]
    
    @extend_schema(
        summary="Get top movies",
        description="Retrieves top 10 movies by watchlist or watched count",
        responses={
            200: TopMoviesSerializer,
            400: OpenApiTypes.OBJECT,
            403: OpenApiTypes.OBJECT,
        },
        tags=['Admin Analytics'],
    )
    def get(self, request):
        """Get top movies based on type and range."""
        try:
            movie_type = request.query_params.get('type', 'watchlist')
            range_param = request.query_params.get('range', '7d')
            
            # Validate parameters
            if movie_type not in ['watchlist', 'watched']:
                return Response(
                    {'error': 'Invalid type parameter. Must be "watchlist" or "watched"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if range_param not in ['7d', '30d', 'all']:
                return Response(
                    {'error': 'Invalid range parameter. Must be "7d", "30d", or "all"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate date filter
            now = django_timezone.now()
            if range_param == '7d':
                date_filter = now - timedelta(days=7)
            elif range_param == '30d':
                date_filter = now - timedelta(days=30)
            else:  # all
                date_filter = None
            
            # Build queryset based on type
            if movie_type == 'watchlist':
                queryset = UserMovie.objects.filter(
                    watchlist_deleted_at__isnull=True,
                    watchlisted_at__isnull=False
                )
                if date_filter:
                    queryset = queryset.filter(watchlisted_at__gte=date_filter)
            else:  # watched
                queryset = UserMovie.objects.filter(
                    watched_at__isnull=False
                )
                if date_filter:
                    queryset = queryset.filter(watched_at__gte=date_filter)
            
            # Aggregate by movie
            top_movies = (
                queryset.values('tconst__tconst', 'tconst__primary_title', 'tconst__start_year')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            )
            
            items = [
                {
                    'tconst': item['tconst__tconst'],
                    'primary_title': item['tconst__primary_title'],
                    'start_year': item['tconst__start_year'],
                    'count': item['count'],
                }
                for item in top_movies
            ]
            
            data = {
                'type': movie_type,
                'range': range_param,
                'items': items,
            }
            
            # Return data directly
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting top movies: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to get top movies'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TopMoviesExportView(APIView):
    """
    Export top movies as CSV.
    
    GET /admin/analytics/api/top-movies/export.csv
    """
    permission_classes = [IsStaffUser]
    
    def get(self, request):
        """Export top movies as CSV."""
        try:
            movie_type = request.query_params.get('type', 'watchlist')
            range_param = request.query_params.get('range', '7d')
            
            # Validate parameters
            if movie_type not in ['watchlist', 'watched']:
                return Response(
                    {'error': 'Invalid type parameter'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if range_param not in ['7d', '30d', 'all']:
                return Response(
                    {'error': 'Invalid range parameter'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate date filter (same logic as TopMoviesView)
            now = django_timezone.now()
            if range_param == '7d':
                date_filter = now - timedelta(days=7)
            elif range_param == '30d':
                date_filter = now - timedelta(days=30)
            else:
                date_filter = None
            
            # Build queryset
            if movie_type == 'watchlist':
                queryset = UserMovie.objects.filter(
                    watchlist_deleted_at__isnull=True,
                    watchlisted_at__isnull=False
                )
                if date_filter:
                    queryset = queryset.filter(watchlisted_at__gte=date_filter)
            else:
                queryset = UserMovie.objects.filter(
                    watched_at__isnull=False
                )
                if date_filter:
                    queryset = queryset.filter(watched_at__gte=date_filter)
            
            # Aggregate by movie
            top_movies = (
                queryset.values('tconst__tconst', 'tconst__primary_title', 'tconst__start_year')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            )
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="top-movies-{movie_type}-{range_param}.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Pozycja', 'Tytuł', 'Rok', 'Liczba'])
            
            for idx, item in enumerate(top_movies, 1):
                writer.writerow([
                    idx,
                    item['tconst__primary_title'],
                    item['tconst__start_year'] or '',
                    item['count'],
                ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting top movies: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to export top movies'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ErrorLogsView(APIView):
    """
    Get paginated error logs with optional filters.
    
    GET /admin/analytics/api/error-logs/
    
    Requires staff permissions.
    """
    permission_classes = [IsStaffUser]
    
    @extend_schema(
        summary="Get error logs",
        description="Retrieves paginated error logs with filters",
        responses={
            200: ErrorLogsSerializer,
            400: OpenApiTypes.OBJECT,
            403: OpenApiTypes.OBJECT,
        },
        tags=['Admin Analytics'],
    )
    def get(self, request):
        """Get error logs with filters and pagination."""
        try:
            # Get query parameters
            api_types = request.query_params.getlist('api_type', [])
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            user_id = request.query_params.get('user_id')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            sort = request.query_params.get('sort', '-occurred_at')
            
            # Validate sort
            if sort not in ['occurred_at', '-occurred_at']:
                return Response(
                    {'error': 'Invalid sort parameter. Must be "occurred_at" or "-occurred_at"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Build queryset
            queryset = IntegrationErrorLog.objects.all()
            
            # Apply filters
            if api_types:
                queryset = queryset.filter(api_type__in=api_types)
            
            if date_from:
                try:
                    date_from_dt = django_timezone.make_aware(
                        datetime.strptime(date_from, '%Y-%m-%d')
                    )
                    queryset = queryset.filter(occurred_at__gte=date_from_dt)
                except ValueError:
                    return Response(
                        {'error': 'Invalid date_from format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if date_to:
                try:
                    date_to_dt = django_timezone.make_aware(
                        datetime.strptime(date_to, '%Y-%m-%d')
                    )
                    # Include the entire day
                    date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59)
                    queryset = queryset.filter(occurred_at__lte=date_to_dt)
                except ValueError:
                    return Response(
                        {'error': 'Invalid date_to format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if user_id:
                try:
                    from uuid import UUID
                    user_uuid = UUID(user_id)
                    queryset = queryset.filter(user_id=user_uuid)
                except ValueError:
                    return Response(
                        {'error': 'Invalid user_id format. Must be a valid UUID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Apply sorting
            queryset = queryset.order_by(sort)
            
            # Calculate pagination
            total = queryset.count()
            total_pages = (total + page_size - 1) // page_size if total > 0 else 1
            
            # Get paginated results
            offset = (page - 1) * page_size
            items = queryset[offset:offset + page_size]
            
            items_data = [
                {
                    'id': item.id,
                    'occurred_at': item.occurred_at.isoformat() if item.occurred_at else None,
                    'api_type': item.api_type,
                    'error_message': item.error_message,
                    'user_id': str(item.user_id) if item.user_id else None,
                }
                for item in items
            ]
            
            data = {
                'items': items_data,
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
            }
            
            # Return data directly
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting error logs: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to get error logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ErrorLogsExportView(APIView):
    """
    Export error logs as CSV.
    
    GET /admin/analytics/api/error-logs/export.csv
    """
    permission_classes = [IsStaffUser]
    
    def get(self, request):
        """Export error logs as CSV."""
        try:
            # Get query parameters (same as ErrorLogsView)
            api_types = request.query_params.getlist('api_type', [])
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            user_id = request.query_params.get('user_id')
            sort = request.query_params.get('sort', '-occurred_at')
            
            # Build queryset (same logic as ErrorLogsView)
            queryset = IntegrationErrorLog.objects.all()
            
            if api_types:
                queryset = queryset.filter(api_type__in=api_types)
            
            if date_from:
                date_from_dt = django_timezone.make_aware(
                    datetime.strptime(date_from, '%Y-%m-%d')
                )
                queryset = queryset.filter(occurred_at__gte=date_from_dt)
            
            if date_to:
                date_to_dt = django_timezone.make_aware(
                    datetime.strptime(date_to, '%Y-%m-%d')
                )
                date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(occurred_at__lte=date_to_dt)
            
            if user_id:
                from uuid import UUID
                user_uuid = UUID(user_id)
                queryset = queryset.filter(user_id=user_uuid)
            
            if sort not in ['occurred_at', '-occurred_at']:
                sort = '-occurred_at'
            queryset = queryset.order_by(sort)
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="error-logs-{datetime.now().strftime("%Y-%m-%d")}.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Data', 'Typ API', 'Komunikat', 'ID użytkownika'])
            
            for item in queryset:
                writer.writerow([
                    item.occurred_at.strftime('%Y-%m-%d %H:%M:%S'),
                    item.api_type,
                    item.error_message,
                    item.user_id or '',
                ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting error logs: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to export error logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
