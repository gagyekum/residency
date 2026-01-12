import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or update superuser from environment variables'

    def handle(self, *_, **__):
        print('=== Running ensure_superuser ===', flush=True)

        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')

        # Debug: show which vars are set (not values for security)
        print(f'  DJANGO_SUPERUSER_EMAIL: {"set" if email else "NOT SET"}', flush=True)
        print(f'  DJANGO_SUPERUSER_PASSWORD: {"set" if password else "NOT SET"}', flush=True)
        print(f'  DJANGO_SUPERUSER_USERNAME: {"set" if username else "NOT SET"}', flush=True)

        if not all([email, password, username]):
            print('WARNING: Missing superuser environment variables', flush=True)
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

        action = "created" if created else "updated"
        print(f'Superuser {action}: {email}', flush=True)
        print(f'  Username: {user.username}', flush=True)
        print(f'  is_staff: {user.is_staff}', flush=True)
        print(f'  is_superuser: {user.is_superuser}', flush=True)
