"""
SMS Backend Abstraction Layer

Provides a pluggable interface for SMS providers, similar to Django's email backend system.
Configure the backend via the SMS_BACKEND setting.

Example:
    SMS_BACKEND = 'apps.messaging.sms_backends.ConsoleSMSBackend'  # Development
    SMS_BACKEND = 'apps.messaging.sms_backends.MNotifyBackend'     # Production (MNotify)
"""

import importlib
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class SMSError(Exception):
    """Base exception for SMS sending errors."""
    pass


class BaseSMSBackend:
    """
    Abstract base class for SMS backends.

    All SMS backends should inherit from this class and implement the send() method.
    """

    def __init__(self, fail_silently=False, **kwargs):
        self.fail_silently = fail_silently

    def send(self, to: str, message: str, **kwargs) -> dict:
        """
        Send an SMS message.

        Args:
            to: The recipient phone number (international format preferred)
            message: The message content
            **kwargs: Additional provider-specific options

        Returns:
            dict: Provider response with at least 'status' key

        Raises:
            SMSError: If sending fails and fail_silently is False
        """
        raise NotImplementedError("Subclasses must implement send()")

    def send_bulk(self, recipients: list[str], message: str, **kwargs) -> list[dict]:
        """
        Send the same SMS message to multiple recipients.

        Default implementation iterates over recipients. Override for providers
        that support native bulk sending.

        Args:
            recipients: List of phone numbers
            message: The message content
            **kwargs: Additional provider-specific options

        Returns:
            list[dict]: List of responses, one per recipient
        """
        results = []
        for recipient in recipients:
            try:
                result = self.send(recipient, message, **kwargs)
                results.append(result)
            except SMSError as e:
                if not self.fail_silently:
                    raise
                results.append({'status': 'failed', 'error': str(e), 'to': recipient})
        return results


class ConsoleSMSBackend(BaseSMSBackend):
    """
    Development backend that prints SMS messages to the console.

    Useful for testing without sending actual SMS messages.
    """

    def send(self, to: str, message: str, **kwargs) -> dict:
        """Print SMS to console instead of sending."""
        output = f"""
{'='*60}
SMS MESSAGE
{'='*60}
To: {to}
Message ({len(message)} chars):
{message}
{'='*60}
"""
        print(output)
        logger.info(f"[Console SMS] To: {to}, Length: {len(message)} chars")
        return {
            'status': 'sent',
            'provider': 'console',
            'to': to,
            'message_length': len(message),
        }


class MNotifyBackend(BaseSMSBackend):
    """
    MNotify SMS provider backend.

    Required settings:
        MNOTIFY_API_KEY: Your MNotify API key
        MNOTIFY_SENDER_ID: The sender ID to display
    """

    API_URL = 'https://api.mnotify.com/api/sms/quick'

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'MNOTIFY_API_KEY', '')
        self.sender_id = getattr(settings, 'MNOTIFY_SENDER_ID', '')

        if not all([self.api_key, self.sender_id]):
            logger.warning(
                "MNotify backend not fully configured. "
                "Set MNOTIFY_API_KEY and MNOTIFY_SENDER_ID."
            )

    def send(self, to: str, message: str, **kwargs) -> dict:
        """Send SMS via MNotify API."""
        import requests

        if not all([self.api_key, self.sender_id]):
            raise SMSError("MNotify backend not configured. Check settings.")

        try:
            payload = {
                'recipient': [to],
                'sender': self.sender_id,
                'message': message,
                'is_schedule': False,
                'schedule_date': '',
            }

            response = requests.post(
                self.API_URL,
                json=payload,
                params={'key': self.api_key},
                headers={'Content-Type': 'application/json'},
                timeout=30,
            )
            response.raise_for_status()

            result = response.json()

            if str(result.get('code')) != '2000':
                raise SMSError(
                    f"MNotify API error: {result.get('message', 'Unknown error')} "
                    f"(code: {result.get('code')})"
                )

            logger.info(f"[MNotify] SMS sent to {to}: {result}")

            return {
                'status': 'sent',
                'provider': 'mnotify',
                'to': to,
                'response': result,
            }

        except requests.RequestException as e:
            logger.error(f"[MNotify] Failed to send SMS to {to}: {e}")
            if not self.fail_silently:
                raise SMSError(f"Failed to send SMS: {e}") from e
            return {
                'status': 'failed',
                'provider': 'mnotify',
                'to': to,
                'error': str(e),
            }

    def send_bulk(self, recipients: list[str], message: str, **kwargs) -> list[dict]:
        """
        Send the same SMS to multiple recipients in a single MNotify API call.

        Overrides the base implementation to use MNotify's native multi-recipient
        support instead of sending one request per recipient.
        """
        import requests

        if not all([self.api_key, self.sender_id]):
            raise SMSError("MNotify backend not configured. Check settings.")

        if not recipients:
            return []

        try:
            payload = {
                'recipient': recipients,
                'sender': self.sender_id,
                'message': message,
                'is_schedule': False,
                'schedule_date': '',
            }

            response = requests.post(
                self.API_URL,
                json=payload,
                params={'key': self.api_key},
                headers={'Content-Type': 'application/json'},
                timeout=30,
            )
            response.raise_for_status()

            result = response.json()

            if str(result.get('code')) != '2000':
                raise SMSError(
                    f"MNotify API error: {result.get('message', 'Unknown error')} "
                    f"(code: {result.get('code')})"
                )

            logger.info(
                f"[MNotify] Bulk SMS sent to {len(recipients)} recipients: {result}"
            )

            return [
                {
                    'status': 'sent',
                    'provider': 'mnotify',
                    'to': r,
                    'response': result,
                }
                for r in recipients
            ]

        except requests.RequestException as e:
            logger.error(
                f"[MNotify] Failed to send bulk SMS to "
                f"{len(recipients)} recipients: {e}"
            )
            if not self.fail_silently:
                raise SMSError(f"Failed to send bulk SMS: {e}") from e
            return [
                {
                    'status': 'failed',
                    'provider': 'mnotify',
                    'to': r,
                    'error': str(e),
                }
                for r in recipients
            ]


def get_sms_backend(fail_silently=False) -> BaseSMSBackend:
    """
    Factory function to get the configured SMS backend.

    Uses the SMS_BACKEND setting to determine which backend to instantiate.
    Defaults to ConsoleSMSBackend if not configured.

    Args:
        fail_silently: Whether to suppress exceptions during sending

    Returns:
        BaseSMSBackend: An instance of the configured SMS backend
    """
    backend_path = getattr(
        settings,
        'SMS_BACKEND',
        'apps.messaging.sms_backends.ConsoleSMSBackend'
    )

    try:
        # Split the path into module and class name
        module_path, class_name = backend_path.rsplit('.', 1)
        module = importlib.import_module(module_path)
        backend_class = getattr(module, class_name)

        if not issubclass(backend_class, BaseSMSBackend):
            raise SMSError(f"{backend_path} is not a valid SMS backend")

        return backend_class(fail_silently=fail_silently)

    except (ImportError, AttributeError, ValueError) as e:
        raise SMSError(f"Could not load SMS backend '{backend_path}': {e}") from e


def send_sms(to: str, message: str, fail_silently=False, **kwargs) -> dict:
    """
    Convenience function to send an SMS using the configured backend.

    Args:
        to: The recipient phone number
        message: The message content
        fail_silently: Whether to suppress exceptions
        **kwargs: Additional provider-specific options

    Returns:
        dict: Provider response
    """
    backend = get_sms_backend(fail_silently=fail_silently)
    return backend.send(to, message, **kwargs)
