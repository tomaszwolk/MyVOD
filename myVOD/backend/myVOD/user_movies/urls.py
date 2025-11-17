from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserMovieViewSet, OnVODMoviesView

router = DefaultRouter()
router.register(r'', UserMovieViewSet, basename='usermovie')

urlpatterns = [
    path('', include(router.urls)),
]
