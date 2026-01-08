"""
Proxy view to forward requests to Vite dev server.
This allows running both Django and Vite through the same origin.
"""

import requests
from django.conf import settings
from django.http import HttpResponse, StreamingHttpResponse


VITE_SERVER = getattr(settings, 'VITE_DEV_SERVER', 'http://localhost:5173')

# Headers to skip when proxying
HOP_BY_HOP_HEADERS = {
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade',
}


def proxy_to_vite(request, path=''):
    """Proxy request to Vite dev server."""
    url = f"{VITE_SERVER}/{path}"

    # Build headers, excluding hop-by-hop headers
    headers = {}
    for key, value in request.headers.items():
        if key.lower() not in HOP_BY_HOP_HEADERS:
            headers[key] = value

    # Update host header
    headers['Host'] = VITE_SERVER.replace('http://', '').replace('https://', '')

    try:
        # Forward the request to Vite
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.body if request.method in ('POST', 'PUT', 'PATCH') else None,
            params=request.GET,
            allow_redirects=False,
            stream=True,
            timeout=30,
        )

        # Build response headers
        response_headers = {}
        for key, value in resp.headers.items():
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != 'content-encoding':
                response_headers[key] = value

        # Stream the response
        response = StreamingHttpResponse(
            resp.iter_content(chunk_size=8192),
            status=resp.status_code,
            content_type=resp.headers.get('Content-Type', 'text/html'),
        )

        for key, value in response_headers.items():
            response[key] = value

        return response

    except requests.exceptions.ConnectionError:
        return HttpResponse(
            "<h1>Vite dev server not running</h1>"
            "<p>Start the frontend with: <code>cd frontend && npm run dev</code></p>",
            status=503,
            content_type='text/html',
        )
    except requests.exceptions.Timeout:
        return HttpResponse("Vite server timeout", status=504)
