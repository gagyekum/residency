import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or update superuser from environment variables'

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')

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
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Superuser created: {email}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Superuser updated: {email}'))
