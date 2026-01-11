from django.conf import settings
from django.db import models


class EmailJob(models.Model):
    """
    Represents a batch email job (campaign).
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    subject = models.CharField(max_length=255)
    body = models.TextField()
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='email_jobs'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'email_jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"EmailJob #{self.id}: {self.subject[:50]}"


class EmailRecipient(models.Model):
    """
    Tracks individual email recipients for a job.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    job = models.ForeignKey(
        EmailJob,
        on_delete=models.CASCADE,
        related_name='recipients'
    )
    residence = models.ForeignKey(
        'residences.Residence',
        on_delete=models.CASCADE,
        related_name='email_recipients'
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
        db_table = 'email_recipients'
        ordering = ['id']

    def __str__(self):
        return f"{self.email_address} - {self.status}"
