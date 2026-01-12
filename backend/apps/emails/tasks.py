import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections
from django.utils import timezone

from .models import EmailJob, EmailRecipient

logger = logging.getLogger(__name__)


def get_recipient_email(residence):
    """
    Get the best email address for a residence.
    Priority: primary email > first available email.
    """
    emails = residence.email_addresses.all()
    primary = emails.filter(is_primary=True).first()
    if primary:
        return primary.email
    first = emails.first()
    return first.email if first else None


def process_email_job(job_id):
    """
    Process an email job in a background thread.
    This function runs in a separate thread.
    """
    # Close any stale database connections for this thread
    close_old_connections()

    try:
        job = EmailJob.objects.get(id=job_id)
        job.status = EmailJob.Status.PROCESSING
        job.started_at = timezone.now()
        job.save(update_fields=['status', 'started_at'])

        display_name = getattr(settings, 'DEFAULT_FROM_EMAIL_DISPLAY_NAME', 'Residency Administrator')
        email_address = settings.DEFAULT_FROM_EMAIL
        from_email = f'{display_name} <{email_address}>'

        for recipient in job.recipients.filter(status=EmailRecipient.Status.PENDING):
            try:
                send_mail(
                    subject=job.subject,
                    message=job.body,
                    from_email=from_email,
                    recipient_list=[recipient.email_address],
                    fail_silently=False,
                )
                recipient.status = EmailRecipient.Status.SENT
                recipient.sent_at = timezone.now()
                recipient.save(update_fields=['status', 'sent_at'])

                job.sent_count += 1
                job.save(update_fields=['sent_count'])

            except Exception as e:
                logger.error(f"Failed to send email to {recipient.email_address}: {e}")
                recipient.status = EmailRecipient.Status.FAILED
                recipient.error_message = str(e)
                recipient.save(update_fields=['status', 'error_message'])

                job.failed_count += 1
                job.save(update_fields=['failed_count'])

        job.status = EmailJob.Status.COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'completed_at'])

    except Exception as e:
        logger.error(f"Email job {job_id} failed: {e}")
        try:
            job = EmailJob.objects.get(id=job_id)
            job.status = EmailJob.Status.FAILED
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
        except Exception:
            pass
    finally:
        close_old_connections()


def start_email_job(job_id):
    """
    Start processing an email job in a background thread.
    Returns immediately, allowing the API to respond.
    """
    thread = threading.Thread(target=process_email_job, args=(job_id,), daemon=True)
    thread.start()
    return thread
