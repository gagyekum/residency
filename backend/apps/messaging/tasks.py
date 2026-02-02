import logging
import threading
import time
from collections import defaultdict

from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections, models, transaction
from django.utils import timezone

from .models import Channel, EmailRecipient, MessageJob, SMSRecipient
from .sms_backends import get_sms_backend, SMSError

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


def get_recipient_phone(residence):
    """
    Get the best phone number for a residence.
    Priority: primary phone > first available phone.
    """
    phones = residence.phone_numbers.all()
    primary = phones.filter(is_primary=True).first()
    if primary:
        return primary.number
    first = phones.first()
    return first.number if first else None


def process_email_recipients(job_id):
    """
    Process email recipients for a job in a background thread.
    """
    close_old_connections()

    try:
        job = MessageJob.objects.get(id=job_id)

        batch_size = getattr(settings, 'EMAIL_BATCH_SIZE', DEFAULT_BATCH_SIZE)
        batch_delay = getattr(settings, 'EMAIL_BATCH_DELAY', DEFAULT_BATCH_DELAY)

        display_name = getattr(settings, 'DEFAULT_FROM_EMAIL_DISPLAY_NAME', 'Residency Administrator')
        email_address = settings.DEFAULT_FROM_EMAIL
        from_email = f'{display_name} <{email_address}>'

        pending_recipients = list(job.email_recipients.filter(status=EmailRecipient.Status.PENDING))
        total_recipients = len(pending_recipients)

        logger.info(f"Processing email recipients for job {job_id}: {total_recipients} recipients")

        for batch_num, i in enumerate(range(0, total_recipients, batch_size)):
            batch = pending_recipients[i:i + batch_size]

            if batch_num > 0 and batch_delay > 0:
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

                    MessageJob.objects.filter(id=job_id).update(
                        email_sent_count=models.F('email_sent_count') + 1,
                        sent_count=models.F('sent_count') + 1,
                    )

                except Exception as e:
                    logger.error(f"Failed to send email to {recipient.email_address}: {e}")
                    recipient.status = EmailRecipient.Status.FAILED
                    recipient.error_message = str(e)
                    recipient.save(update_fields=['status', 'error_message'])

                    MessageJob.objects.filter(id=job_id).update(
                        email_failed_count=models.F('email_failed_count') + 1,
                        failed_count=models.F('failed_count') + 1,
                    )

            logger.info(f"Job {job_id}: Completed email batch {batch_num + 1}")

        logger.info(f"Email processing completed for job {job_id}")

    except Exception as e:
        logger.error(f"Email processing failed for job {job_id}: {e}")
    finally:
        close_old_connections()


def process_sms_recipients(job_id):
    """
    Process SMS recipients for a job in a background thread.
    """
    close_old_connections()

    try:
        job = MessageJob.objects.get(id=job_id)

        batch_size = getattr(settings, 'SMS_BATCH_SIZE', DEFAULT_BATCH_SIZE)
        batch_delay = getattr(settings, 'SMS_BATCH_DELAY', DEFAULT_BATCH_DELAY)

        # Use sms_body if provided, otherwise fall back to main body
        message = job.sms_body if job.sms_body else job.body

        sms_backend = get_sms_backend()

        pending_recipients = list(job.sms_recipients.filter(status=SMSRecipient.Status.PENDING))
        total_recipients = len(pending_recipients)

        # Group recipients by phone number so we only send once per unique number.
        # Multiple residences may share the same phone number.
        phone_to_recipients = defaultdict(list)
        for recipient in pending_recipients:
            phone_to_recipients[recipient.phone_number].append(recipient)

        unique_numbers = list(phone_to_recipients.keys())

        logger.info(
            f"Processing SMS recipients for job {job_id}: "
            f"{total_recipients} recipients, {len(unique_numbers)} unique numbers"
        )

        for batch_num, i in enumerate(range(0, len(unique_numbers), batch_size)):
            batch_numbers = unique_numbers[i:i + batch_size]

            if batch_num > 0 and batch_delay > 0:
                time.sleep(batch_delay)

            for phone_number in batch_numbers:
                recipients_for_number = phone_to_recipients[phone_number]
                try:
                    sms_backend.send(phone_number, message)

                    now = timezone.now()
                    for recipient in recipients_for_number:
                        recipient.status = SMSRecipient.Status.SENT
                        recipient.sent_at = now
                        recipient.save(update_fields=['status', 'sent_at'])

                    MessageJob.objects.filter(id=job_id).update(
                        sms_sent_count=models.F('sms_sent_count') + len(recipients_for_number),
                    )

                except SMSError as e:
                    logger.error(f"Failed to send SMS to {phone_number}: {e}")
                    for recipient in recipients_for_number:
                        recipient.status = SMSRecipient.Status.FAILED
                        recipient.error_message = str(e)
                        recipient.save(update_fields=['status', 'error_message'])

                    MessageJob.objects.filter(id=job_id).update(
                        sms_failed_count=models.F('sms_failed_count') + len(recipients_for_number),
                    )

                except Exception as e:
                    logger.error(f"Unexpected error sending SMS to {phone_number}: {e}")
                    for recipient in recipients_for_number:
                        recipient.status = SMSRecipient.Status.FAILED
                        recipient.error_message = str(e)
                        recipient.save(update_fields=['status', 'error_message'])

                    MessageJob.objects.filter(id=job_id).update(
                        sms_failed_count=models.F('sms_failed_count') + len(recipients_for_number),
                    )

            logger.info(f"Job {job_id}: Completed SMS batch {batch_num + 1}")

        logger.info(f"SMS processing completed for job {job_id}")

    except Exception as e:
        logger.error(f"SMS processing failed for job {job_id}: {e}")
    finally:
        close_old_connections()


def finalize_job(job_id):
    """
    Finalize a job after all channel processing is complete.
    """
    close_old_connections()

    try:
        job = MessageJob.objects.get(id=job_id)
        job.refresh_from_db()

        # Check if all recipients have been processed
        email_pending = job.email_recipients.filter(status=EmailRecipient.Status.PENDING).exists()
        sms_pending = job.sms_recipients.filter(status=SMSRecipient.Status.PENDING).exists()

        if not email_pending and not sms_pending:
            # All done - mark as completed
            job.status = MessageJob.Status.COMPLETED
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'completed_at'])

            logger.info(
                f"Message job {job_id} completed: "
                f"Email ({job.email_sent_count} sent, {job.email_failed_count} failed), "
                f"SMS ({job.sms_sent_count} sent, {job.sms_failed_count} failed)"
            )

    except Exception as e:
        logger.error(f"Failed to finalize job {job_id}: {e}")
        try:
            job = MessageJob.objects.get(id=job_id)
            job.status = MessageJob.Status.FAILED
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
        except Exception:
            pass
    finally:
        close_old_connections()


def process_message_job(job_id):
    """
    Process a message job, spawning threads for each enabled channel.
    Waits for all channels to complete before finalizing.
    """
    close_old_connections()

    try:
        with transaction.atomic():
            job = MessageJob.objects.select_for_update().get(id=job_id)

            if job.status == MessageJob.Status.COMPLETED:
                logger.info(f"Message job {job_id} already completed, skipping")
                return

            if job.status not in [MessageJob.Status.PENDING, MessageJob.Status.PROCESSING, MessageJob.Status.FAILED]:
                logger.warning(f"Message job {job_id} has unexpected status {job.status}, skipping")
                return

            job.status = MessageJob.Status.PROCESSING
            job.started_at = job.started_at or timezone.now()
            job.save(update_fields=['status', 'started_at'])

        threads = []

        # Start email processing thread
        if job.has_channel(Channel.EMAIL):
            email_thread = threading.Thread(
                target=process_email_recipients,
                args=(job_id,),
                daemon=True
            )
            threads.append(email_thread)
            email_thread.start()
            logger.info(f"Started email processing thread for job {job_id}")

        # Start SMS processing thread
        if job.has_channel(Channel.SMS):
            sms_thread = threading.Thread(
                target=process_sms_recipients,
                args=(job_id,),
                daemon=True
            )
            threads.append(sms_thread)
            sms_thread.start()
            logger.info(f"Started SMS processing thread for job {job_id}")

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Finalize the job
        finalize_job(job_id)

    except Exception as e:
        logger.error(f"Message job {job_id} failed: {e}")
        try:
            job = MessageJob.objects.get(id=job_id)
            job.status = MessageJob.Status.FAILED
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
        except Exception:
            pass
    finally:
        close_old_connections()


def start_message_job(job_id):
    """
    Start processing a message job in a background thread.
    Returns immediately, allowing the API to respond.
    """
    thread = threading.Thread(target=process_message_job, args=(job_id,), daemon=True)
    thread.start()
    return thread


# Backward compatibility aliases


def start_email_job(job_id):
    """Backward compatibility alias for start_message_job."""
    return start_message_job(job_id)


def process_email_job(job_id):
    """Backward compatibility alias for process_message_job."""
    return process_message_job(job_id)
