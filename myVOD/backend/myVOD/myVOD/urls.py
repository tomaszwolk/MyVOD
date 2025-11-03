"""
URL configuration for myVOD project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from . import views

urlpatterns = [
    # Admin Analytics API (under /admin/analytics/api/)
    # Must be BEFORE admin.site.urls to avoid being caught by Django Admin
    path("admin/analytics/api/", include("analytics.urls")),
    
    # Admin panel
    path("admin/", admin.site.urls),

    # Root redirect to API documentation
    path("", views.root_redirect, name="root"),

    # API Documentation (drf-spectacular)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # JWT Authentication (uses email instead of username)
    path("api/token/", views.EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # User Movies (Watchlist & Watched History)
    path("api/user-movies/", include("user_movies.urls")),

    # Movie Search (Public)
    path("api/movies/", include("movies.urls")),

    # Platforms (Public)
    path("api/platforms/", views.PlatformListView.as_view(), name="platforms"),

    # User Profile (Authenticated)
    path("api/me/", views.UserProfileView.as_view(), name="user-profile"),
    path("api/me/change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    # User Registration (Public)
    path("api/register/", views.RegisterView.as_view(), name="register"),

    # AI Movie Suggestions (Authenticated)
    path("api/suggestions/", views.AISuggestionsView.as_view(), name="suggestions"),
]
