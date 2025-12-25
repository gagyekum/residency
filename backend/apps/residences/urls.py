from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ResidenceViewSet

app_name = 'residences'

router = DefaultRouter()
router.register('', ResidenceViewSet, basename='residence')

urlpatterns = [
    path('', include(router.urls)),
]
