import os

# Bind to PORT environment variable or default to 8000
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# Workers - default to 2 for containerized environments (Railway, etc.)
# multiprocessing.cpu_count() returns host CPU count, not container allocation
workers = int(os.environ.get('WEB_CONCURRENCY', 2))
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
