// Use relative URL - works when proxied through Django
const API_URL = '/api/v1';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await fetch(`${API_URL}/users/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function refreshToken(refresh: string): Promise<AuthTokens> {
  const response = await fetch(`${API_URL}/users/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json();
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;

  const access = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');

  if (!access || !refresh) return null;

  return { access, refresh };
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
