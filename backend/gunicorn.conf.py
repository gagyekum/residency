import multiprocessing
import os

# Bind to PORT environment variable or default to 8000
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# Workers
workers = int(os.environ.get('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info')

# Process naming
proc_name = 'residency'

# Server mechanics
preload_app = True
max_requests = 1000
max_requests_jitter = 50
