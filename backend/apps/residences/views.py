from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
    search: POST /api/v1/residences/search/ (requires: view_residence)
    """

    queryset = Residence.objects.prefetch_related('phone_numbers', 'email_addresses')
    serializer_class = ResidenceSerializer
    permission_classes = [IsAuthenticated, ResidencePermissions]

    @action(detail=False, methods=['post'])
    def search(self, request):
        """
        Search residences by house number or phone number.
        POST body: { "search": "term", "page": 1 }
        """
        search = request.data.get('search', '').strip()
        page = int(request.data.get('page', 1))
        page_size = 10

        queryset = self.get_queryset()
        if search:
            queryset = queryset.filter(
                Q(house_number__icontains=search) |
                Q(name__icontains=search) |
                Q(phone_numbers__number__icontains=search)
            ).distinct()

        # Manual pagination
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        residences = queryset[start:end]

        serializer = self.get_serializer(residences, many=True)
        return Response({
            'count': total_count,
            'next': None if end >= total_count else f'page={page + 1}',
            'previous': None if page <= 1 else f'page={page - 1}',
            'results': serializer.data,
        })
