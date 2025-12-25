from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Residence
from .permissions import ResidencePermissions
from .serializers import ResidenceSerializer


class ResidenceViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for residences.

    list: GET /api/v1/residences/ (requires: view_residence)
    create: POST /api/v1/residences/ (requires: add_residence)
    retrieve: GET /api/v1/residences/{id}/ (requires: view_residence)
    update: PUT /api/v1/residences/{id}/ (requires: change_residence)
    partial_update: PATCH /api/v1/residences/{id}/ (requires: change_residence)
    destroy: DELETE /api/v1/residences/{id}/ (requires: delete_residence)
    """

    queryset = Residence.objects.prefetch_related('phone_numbers', 'email_addresses')
    serializer_class = ResidenceSerializer
    permission_classes = [IsAuthenticated, ResidencePermissions]
