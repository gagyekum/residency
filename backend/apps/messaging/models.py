from django.conf import settings
from django.db import models


class Channel(models.TextChoices):
    """Available messaging channels."""
    EMAIL = 'email', 'Email'
    SMS = 'sms', 'SMS'
    # Future channels can be added here
    # WHATSAPP = 'whatsapp', 'WhatsApp'
    # PUSH = 'push', 'Push Notification'


class MessageJob(models.Model):
    """
    Represents a batch messaging job (campaign) that can send emails and/or SMS.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    subject = models.CharField(max_length=255, blank=True)  # Optional for SMS-only
    body = models.TextField()
    sms_body = models.TextField(blank=True)  # Optional separate SMS message
    channels = models.JSONField(default=list)  # List of Channel values, e.g., ["email", "sms"]
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='message_jobs'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    # Email tracking
    email_total_recipients = models.PositiveIntegerField(default=0)
    email_sent_count = models.PositiveIntegerField(default=0)
    email_failed_count = models.PositiveIntegerField(default=0)
    # SMS tracking
    sms_total_recipients = models.PositiveIntegerField(default=0)
    sms_sent_count = models.PositiveIntegerField(default=0)
    sms_failed_count = models.PositiveIntegerField(default=0)
    # Legacy fields for backward compatibility (mapped from email counts)
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)

    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'message_jobs'
        ordering = ['-created_at']

    def __str__(self):
        channels_str = ', '.join(self.channels) if self.channels else 'none'
        return f"MessageJob #{self.id}: {self.subject[:50] if self.subject else '(no subject)'} [{channels_str}]"

    def has_channel(self, channel: str) -> bool:
        """Check if a specific channel is enabled for this job."""
        return channel in self.channels

    def get_overall_progress(self):
        """Calculate overall progress across all channels."""
        total = self.email_total_recipients + self.sms_total_recipients
        processed = (self.email_sent_count + self.email_failed_count +
                     self.sms_sent_count + self.sms_failed_count)
        if total == 0:
            return 0
        return int(processed / total * 100)


class EmailRecipient(models.Model):
    """
    Tracks individual email recipients for a job.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    job = models.ForeignKey(
        MessageJob,
        on_delete=models.CASCADE,
        related_name='email_recipients'
    )
    residence = models.ForeignKey(
        'residences.Residence',
        on_delete=models.CASCADE,
        related_name='message_email_recipients'
    )
    email_address = models.EmailField()  # Snapshot of email used
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'message_email_recipients'
        ordering = ['id']

    def __str__(self):
        return f"{self.email_address} - {self.status}"


class SMSRecipient(models.Model):
    """
    Tracks individual SMS recipients for a job.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    job = models.ForeignKey(
        MessageJob,
        on_delete=models.CASCADE,
        related_name='sms_recipients'
    )
    residence = models.ForeignKey(
        'residences.Residence',
        on_delete=models.CASCADE,
        related_name='message_sms_recipients'
    )
    phone_number = models.CharField(max_length=20)  # Snapshot of phone used
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'message_sms_recipients'
        ordering = ['id']

    def __str__(self):
        return f"{self.phone_number} - {self.status}"
