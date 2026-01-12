// API URL configuration that works in both SSR and client environments

declare global {
  interface Window {
    ENV?: { API_URL: string };
  }
}

export function getApiUrl(): string {
  // Client-side: read from window.ENV (injected by root.tsx)
  if (typeof window !== 'undefined' && window.ENV?.API_URL) {
    return window.ENV.API_URL;
  }

  // Server-side: read from process.env
  if (typeof process !== 'undefined') {
    const url = process.env.VITE_API_URL || process.env.API_URL;
    if (url) return url;
  }

  // Fallback for development (proxy handles /api)
  return '/api/v1';
}
