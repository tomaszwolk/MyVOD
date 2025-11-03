"""
URLs for analytics admin endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('metrics/', views.AdminMetricsView.as_view(), name='admin-metrics'),
    path('top-movies/', views.TopMoviesView.as_view(), name='admin-top-movies'),
    path('top-movies/export.csv', views.TopMoviesExportView.as_view(), name='admin-top-movies-export'),
    path('error-logs/', views.ErrorLogsView.as_view(), name='admin-error-logs'),
    path('error-logs/export.csv', views.ErrorLogsExportView.as_view(), name='admin-error-logs-export'),
]

