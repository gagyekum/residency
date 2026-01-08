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

# Vite dev server URL for proxying
VITE_DEV_SERVER = os.environ.get('VITE_DEV_SERVER', 'http://localhost:5173')
