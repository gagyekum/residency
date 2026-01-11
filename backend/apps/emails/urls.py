from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmailJobViewSet

app_name = 'emails'

router = DefaultRouter()
router.register('', EmailJobViewSet, basename='emailjob')

urlpatterns = [
    path('', include(router.urls)),
]
