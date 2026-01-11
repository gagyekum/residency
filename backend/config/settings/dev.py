import os

from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
]

# Add extra hosts from environment (e.g., ngrok URLs)
EXTRA_ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '')
if EXTRA_ALLOWED_HOSTS:
    ALLOWED_HOSTS.extend([host.strip() for host in EXTRA_ALLOWED_HOSTS.split(',') if host.strip()])

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Vite dev server URL for proxying
VITE_DEV_SERVER = os.environ.get('VITE_DEV_SERVER', 'http://localhost:5173')

# Force console email backend in development (emails print to terminal)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
