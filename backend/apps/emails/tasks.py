import logging
import threading
import time

from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections, transaction
from django.utils import timezone

from .models import EmailJob, EmailRecipient

logger = logging.getLogger(__name__)

# Batch processing defaults
DEFAULT_BATCH_SIZE = 50
DEFAULT_BATCH_DELAY = 1.0  # seconds


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
    Process an email job in a background thread with batch processing.
    Sends emails in batches with delays to avoid rate limits.
    """
    # Close any stale database connections for this thread
    close_old_connections()

    try:
        # Use select_for_update to prevent race conditions
        with transaction.atomic():
            job = EmailJob.objects.select_for_update().get(id=job_id)

            # Idempotency check: skip if already completed
            if job.status == EmailJob.Status.COMPLETED:
                logger.info(f"Email job {job_id} already completed, skipping")
                return

            # Allow re-processing of PENDING, PROCESSING (crashed), or FAILED jobs
            if job.status not in [EmailJob.Status.PENDING, EmailJob.Status.PROCESSING, EmailJob.Status.FAILED]:
                logger.warning(f"Email job {job_id} has unexpected status {job.status}, skipping")
                return

            job.status = EmailJob.Status.PROCESSING
            job.started_at = job.started_at or timezone.now()  # Preserve original start time on retry
            job.save(update_fields=['status', 'started_at'])

        # Get batch settings
        batch_size = getattr(settings, 'EMAIL_BATCH_SIZE', DEFAULT_BATCH_SIZE)
        batch_delay = getattr(settings, 'EMAIL_BATCH_DELAY', DEFAULT_BATCH_DELAY)

        display_name = getattr(settings, 'DEFAULT_FROM_EMAIL_DISPLAY_NAME', 'Residency Administrator')
        email_address = settings.DEFAULT_FROM_EMAIL
        from_email = f'{display_name} <{email_address}>'

        # Get all pending recipients
        pending_recipients = list(job.recipients.filter(status=EmailRecipient.Status.PENDING))
        total_recipients = len(pending_recipients)

        logger.info(f"Processing email job {job_id}: {total_recipients} recipients, batch size {batch_size}")

        # Process in batches
        for batch_num, i in enumerate(range(0, total_recipients, batch_size)):
            batch = pending_recipients[i:i + batch_size]

            # Add delay between batches (not before the first batch)
            if batch_num > 0 and batch_delay > 0:
                logger.debug(f"Batch {batch_num + 1}: waiting {batch_delay}s before processing")
                time.sleep(batch_delay)

            for recipient in batch:
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

            logger.info(f"Job {job_id}: Completed batch {batch_num + 1}, sent {job.sent_count}/{total_recipients}")

        job.status = EmailJob.Status.COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'completed_at'])

        logger.info(f"Email job {job_id} completed: {job.sent_count} sent, {job.failed_count} failed")

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
