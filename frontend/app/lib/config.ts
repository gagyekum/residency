// API URL configuration that works in both SSR and client environments
// - Vite replaces import.meta.env.VITE_* at build time for client code
// - process.env is available on the server at runtime

function getApiUrl(): string {
  // Try Vite env var (client-side, build-time)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Try process.env (server-side, runtime)
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }

  // Fallback for development (proxy handles /api)
  return '/api/v1';
}

export const API_URL = getApiUrl();
