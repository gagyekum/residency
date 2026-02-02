from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.residences.models import Residence

from .models import Channel, EmailRecipient, MessageJob, SMSRecipient
from .permissions import MessageJobPermissions
from .serializers import (
    EmailRecipientSerializer,
    MessageJobCreateSerializer,
    MessageJobListSerializer,
    MessageJobSerializer,
    SMSRecipientSerializer,
)
from .tasks import get_recipient_email, get_recipient_phone, start_message_job


class MessageJobViewSet(viewsets.ModelViewSet):
    """
    Message job management for sending emails and/or SMS.

    list: GET /api/v1/messaging/ (requires: view_messagejob)
    create: POST /api/v1/messaging/ (requires: add_messagejob)
    retrieve: GET /api/v1/messaging/{id}/ (requires: view_messagejob)
    """
    queryset = MessageJob.objects.prefetch_related(
        'email_recipients__residence',
        'sms_recipients__residence'
    )
    permission_classes = [IsAuthenticated, MessageJobPermissions]

    def get_serializer_class(self):
        if self.action == 'list':
            return MessageJobListSerializer
        if self.action == 'create':
            return MessageJobCreateSerializer
        return MessageJobSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new message job and start processing in background.

        POST body: {
            "subject": "...",      # Required for email
            "body": "...",         # Required
            "sms_body": "...",     # Optional, defaults to body
            "channels": ["email", "sms"]  # Defaults to both
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        channels = data.get('channels', [Channel.EMAIL, Channel.SMS])

        # Find residences with required contact info based on channels
        email_residences = []
        sms_residences = []

        if Channel.EMAIL in channels:
            email_residences = list(
                Residence.objects.filter(
                    email_addresses__isnull=False
                ).distinct().prefetch_related('email_addresses')
            )

        if Channel.SMS in channels:
            sms_residences = list(
                Residence.objects.filter(
                    phone_numbers__isnull=False
                ).distinct().prefetch_related('phone_numbers')
            )

        # Validate that we have at least some recipients
        if not email_residences and not sms_residences:
            return Response(
                {'detail': 'No residences with contact information found for the selected channels.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the job
        job = MessageJob.objects.create(
            subject=data.get('subject', ''),
            body=data['body'],
            sms_body=data.get('sms_body', ''),
            channels=channels,
            sender=request.user,
        )

        # Create email recipients
        email_recipients = []
        for residence in email_residences:
            email = get_recipient_email(residence)
            if email:
                email_recipients.append(EmailRecipient(
                    job=job,
                    residence=residence,
                    email_address=email,
                ))

        if email_recipients:
            EmailRecipient.objects.bulk_create(email_recipients)
            job.email_total_recipients = len(email_recipients)
            job.total_recipients = len(email_recipients)  # Legacy field

        # Create SMS recipients
        sms_recipients = []
        for residence in sms_residences:
            phone = get_recipient_phone(residence)
            if phone:
                sms_recipients.append(SMSRecipient(
                    job=job,
                    residence=residence,
                    phone_number=phone,
                ))

        if sms_recipients:
            SMSRecipient.objects.bulk_create(sms_recipients)
            job.sms_total_recipients = len(sms_recipients)

        job.save(update_fields=['email_total_recipients', 'sms_total_recipients', 'total_recipients'])

        # Start background processing
        start_message_job(job.id)

        # Return job details
        response_serializer = MessageJobSerializer(job)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get lightweight status update for a job (for polling).
        GET /api/v1/messaging/{id}/status/
        """
        job = self.get_object()
        return Response({
            'id': job.id,
            'status': job.status,
            'channels': job.channels,
            # Email stats
            'email_total_recipients': job.email_total_recipients,
            'email_sent_count': job.email_sent_count,
            'email_failed_count': job.email_failed_count,
            'email_progress_percent': (
                int((job.email_sent_count + job.email_failed_count) / job.email_total_recipients * 100)
                if job.email_total_recipients > 0 else 0
            ),
            # SMS stats
            'sms_total_recipients': job.sms_total_recipients,
            'sms_sent_count': job.sms_sent_count,
            'sms_failed_count': job.sms_failed_count,
            'sms_progress_percent': (
                int((job.sms_sent_count + job.sms_failed_count) / job.sms_total_recipients * 100)
                if job.sms_total_recipients > 0 else 0
            ),
            # Overall
            'overall_progress_percent': job.get_overall_progress(),
            # Legacy fields
            'total_recipients': job.total_recipients,
            'sent_count': job.sent_count,
            'failed_count': job.failed_count,
            'progress_percent': (
                int((job.sent_count + job.failed_count) / job.total_recipients * 100)
                if job.total_recipients > 0 else 0
            ),
        })

    @action(detail=True, methods=['get'], url_path='email-recipients')
    def email_recipients(self, request, pk=None):
        """
        Get paginated email recipients for a job.
        GET /api/v1/messaging/{id}/email-recipients/?page=1
        """
        job = self.get_object()
        recipients = job.email_recipients.select_related('residence').all()

        # Manual pagination
        page = int(request.query_params.get('page', 1))
        page_size = 10
        start = (page - 1) * page_size
        end = start + page_size

        total_count = recipients.count()
        paginated_recipients = recipients[start:end]

        serializer = EmailRecipientSerializer(paginated_recipients, many=True)

        return Response({
            'count': total_count,
            'next': page * page_size < total_count,
            'page': page,
            'results': serializer.data,
        })

    @action(detail=True, methods=['get'], url_path='sms-recipients')
    def sms_recipients(self, request, pk=None):
        """
        Get paginated SMS recipients for a job.
        GET /api/v1/messaging/{id}/sms-recipients/?page=1
        """
        job = self.get_object()
        recipients = job.sms_recipients.select_related('residence').all()

        # Manual pagination
        page = int(request.query_params.get('page', 1))
        page_size = 10
        start = (page - 1) * page_size
        end = start + page_size

        total_count = recipients.count()
        paginated_recipients = recipients[start:end]

        serializer = SMSRecipientSerializer(paginated_recipients, many=True)

        return Response({
            'count': total_count,
            'next': page * page_size < total_count,
            'page': page,
            'results': serializer.data,
        })

    # Legacy endpoint for backward compatibility
    @action(detail=True, methods=['get'])
    def recipients(self, request, pk=None):
        """
        Legacy endpoint - returns email recipients.
        GET /api/v1/messaging/{id}/recipients/?page=1
        """
        return self.email_recipients(request, pk)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """
        Retry sending to failed recipients (both email and SMS).
        POST /api/v1/messaging/{id}/retry/
        """
        job = self.get_object()

        # Check if there are failed recipients
        email_failed = job.email_recipients.filter(status=EmailRecipient.Status.FAILED).count()
        sms_failed = job.sms_recipients.filter(status=SMSRecipient.Status.FAILED).count()

        if email_failed == 0 and sms_failed == 0:
            return Response(
                {'detail': 'No failed recipients to retry.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset failed email recipients to pending
        if email_failed > 0:
            job.email_recipients.filter(status=EmailRecipient.Status.FAILED).update(
                status=EmailRecipient.Status.PENDING,
                error_message='',
                sent_at=None,
            )
            job.email_failed_count = 0
            job.failed_count = 0  # Legacy

        # Reset failed SMS recipients to pending
        if sms_failed > 0:
            job.sms_recipients.filter(status=SMSRecipient.Status.FAILED).update(
                status=SMSRecipient.Status.PENDING,
                error_message='',
                sent_at=None,
            )
            job.sms_failed_count = 0

        # Update job status
        job.status = MessageJob.Status.PROCESSING
        job.error_message = ''
        job.completed_at = None
        job.save(update_fields=[
            'email_failed_count', 'sms_failed_count', 'failed_count',
            'status', 'error_message', 'completed_at'
        ])

        # Start background processing
        start_message_job(job.id)

        return Response({
            'id': job.id,
            'status': job.status,
            'channels': job.channels,
            'email_total_recipients': job.email_total_recipients,
            'email_sent_count': job.email_sent_count,
            'email_failed_count': job.email_failed_count,
            'sms_total_recipients': job.sms_total_recipients,
            'sms_sent_count': job.sms_sent_count,
            'sms_failed_count': job.sms_failed_count,
            'overall_progress_percent': job.get_overall_progress(),
        })


# Backward compatibility alias
EmailJobViewSet = MessageJobViewSet
