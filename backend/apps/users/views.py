from django.db.models import Sum

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.emails.models import EmailJob
from apps.residences.models import Residence

from .serializers import UserSerializer


class CurrentUserView(APIView):
    """
    Get or update the current authenticated user's info.

    GET /api/v1/users/me/ - Returns user info with permissions
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardView(APIView):
    """
    Get dashboard statistics.

    GET /api/v1/users/dashboard/ - Returns residence and email stats
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Residence stats
        total_residences = Residence.objects.count()
        residences_with_email = Residence.objects.filter(
            email_addresses__isnull=False
        ).distinct().count()

        # Email stats
        email_stats = EmailJob.objects.aggregate(
            total_sent=Sum('sent_count'),
            total_failed=Sum('failed_count'),
        )
        total_email_jobs = EmailJob.objects.count()
        completed_jobs = EmailJob.objects.filter(status=EmailJob.Status.COMPLETED).count()

        return Response({
            'residences': {
                'total': total_residences,
                'with_email': residences_with_email,
            },
            'emails': {
                'total_jobs': total_email_jobs,
                'completed_jobs': completed_jobs,
                'total_sent': email_stats['total_sent'] or 0,
                'total_failed': email_stats['total_failed'] or 0,
            },
        })
