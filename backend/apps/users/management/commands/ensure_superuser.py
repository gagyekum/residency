import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or update superuser from environment variables'

    def handle(self, *_, **__):
        self.stdout.write('=== Running ensure_superuser ===')

        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')

        # Debug: show which vars are set (not values for security)
        self.stdout.write(f'  DJANGO_SUPERUSER_EMAIL: {"set" if email else "NOT SET"}')
        self.stdout.write(f'  DJANGO_SUPERUSER_PASSWORD: {"set" if password else "NOT SET"}')
        self.stdout.write(f'  DJANGO_SUPERUSER_USERNAME: {"set" if username else "NOT SET"}')

        if not all([email, password, username]):
            self.stdout.write(
                self.style.WARNING('Missing superuser environment variables. Required: '
                                   'DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD, '
                                   'DJANGO_SUPERUSER_USERNAME')
            )
            return

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'is_staff': True,
                'is_superuser': True,
            }
        )

        # Always ensure superuser privileges and update password
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action_performed = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f'Superuser {action_performed}: {email}'))

        self.stdout.write(f'  Username: {user.username}')
        self.stdout.write(f'  is_staff: {user.is_staff}')
        self.stdout.write(f'  is_superuser: {user.is_superuser}')
