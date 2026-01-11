"""
SPA (Single Page Application) serving for production.
Serves the React frontend built files.
"""

from django.conf import settings
from django.http import HttpResponse, Http404
from pathlib import Path


def serve_spa(request, path=''):
    """
    Serve the SPA index.html for all non-API, non-static routes.
    This enables client-side routing to work properly.
    """
    # Path to the frontend build directory
    frontend_dir = Path(settings.STATIC_ROOT) / 'frontend'

    # Try to serve the exact file if it exists (for assets like JS, CSS)
    if path:
        file_path = frontend_dir / path
        if file_path.is_file():
            content_type = _get_content_type(path)
            return HttpResponse(
                file_path.read_bytes(),
                content_type=content_type,
            )

    # Otherwise serve index.html (for SPA client-side routing)
    index_path = frontend_dir / 'index.html'
    if index_path.exists():
        return HttpResponse(
            index_path.read_text(),
            content_type='text/html',
        )

    raise Http404("Frontend not found. Run the build process first.")


def _get_content_type(path: str) -> str:
    """Get content type based on file extension."""
    extension_map = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
    }
    for ext, content_type in extension_map.items():
        if path.endswith(ext):
            return content_type
    return 'application/octet-stream'
