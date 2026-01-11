from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.residences.models import Residence

from .models import EmailJob, EmailRecipient
from .permissions import EmailJobPermissions
from .serializers import (
    EmailJobCreateSerializer,
    EmailJobListSerializer,
    EmailJobSerializer,
)
from .tasks import get_recipient_email, start_email_job


class EmailJobViewSet(viewsets.ModelViewSet):
    """
    Email job management.

    list: GET /api/v1/emails/ (requires: view_emailjob)
    create: POST /api/v1/emails/ (requires: add_emailjob)
    retrieve: GET /api/v1/emails/{id}/ (requires: view_emailjob)
    """
    queryset = EmailJob.objects.prefetch_related('recipients__residence')
    permission_classes = [IsAuthenticated, EmailJobPermissions]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmailJobListSerializer
        if self.action == 'create':
            return EmailJobCreateSerializer
        return EmailJobSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new email job and start processing in background.

        POST body: { "subject": "...", "body": "..." }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Find all residences with at least one email address
        residences_with_email = Residence.objects.filter(
            email_addresses__isnull=False
        ).distinct().prefetch_related('email_addresses')

        if not residences_with_email.exists():
            return Response(
                {'detail': 'No residences with email addresses found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the job
        job = EmailJob.objects.create(
            subject=serializer.validated_data['subject'],
            body=serializer.validated_data['body'],
            sender=request.user,
            total_recipients=0,
        )

        # Create recipient records
        recipients = []
        for residence in residences_with_email:
            email = get_recipient_email(residence)
            if email:
                recipients.append(EmailRecipient(
                    job=job,
                    residence=residence,
                    email_address=email,
                ))

        EmailRecipient.objects.bulk_create(recipients)
        job.total_recipients = len(recipients)
        job.save(update_fields=['total_recipients'])

        # Start background processing
        start_email_job(job.id)

        # Return job details
        response_serializer = EmailJobSerializer(job)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get lightweight status update for a job (for polling).
        GET /api/v1/emails/{id}/status/
        """
        job = self.get_object()
        return Response({
            'id': job.id,
            'status': job.status,
            'total_recipients': job.total_recipients,
            'sent_count': job.sent_count,
            'failed_count': job.failed_count,
            'progress_percent': (
                int((job.sent_count + job.failed_count) / job.total_recipients * 100)
                if job.total_recipients > 0 else 0
            ),
        })
