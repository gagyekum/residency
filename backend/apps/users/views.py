from django.db.models import Sum

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messaging.models import MessageJob
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

    GET /api/v1/users/dashboard/ - Returns residence and messaging stats
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Residence stats
        total_residences = Residence.objects.count()
        residences_with_email = Residence.objects.filter(
            email_addresses__isnull=False
        ).distinct().count()
        residences_with_phone = Residence.objects.filter(
            phone_numbers__isnull=False
        ).distinct().count()

        # Messaging stats
        messaging_stats = MessageJob.objects.aggregate(
            email_total_sent=Sum('email_sent_count'),
            email_total_failed=Sum('email_failed_count'),
            sms_total_sent=Sum('sms_sent_count'),
            sms_total_failed=Sum('sms_failed_count'),
        )
        total_message_jobs = MessageJob.objects.count()
        completed_jobs = MessageJob.objects.filter(status=MessageJob.Status.COMPLETED).count()

        return Response({
            'residences': {
                'total': total_residences,
                'with_email': residences_with_email,
                'with_phone': residences_with_phone,
            },
            'messaging': {
                'total_jobs': total_message_jobs,
                'completed_jobs': completed_jobs,
                'email_sent': messaging_stats['email_total_sent'] or 0,
                'email_failed': messaging_stats['email_total_failed'] or 0,
                'sms_sent': messaging_stats['sms_total_sent'] or 0,
                'sms_failed': messaging_stats['sms_total_failed'] or 0,
            },
            # Legacy field for backward compatibility
            'emails': {
                'total_jobs': total_message_jobs,
                'completed_jobs': completed_jobs,
                'total_sent': messaging_stats['email_total_sent'] or 0,
                'total_failed': messaging_stats['email_total_failed'] or 0,
            },
        })
