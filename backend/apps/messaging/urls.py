from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MessageJobViewSet

app_name = 'messaging'

router = DefaultRouter()
router.register('', MessageJobViewSet, basename='messagejob')

urlpatterns = [
    path('', include(router.urls)),
]
