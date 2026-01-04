import { getStoredTokens, refreshToken, storeTokens, clearTokens, isTokenExpired } from './auth';

const API_URL = 'http://localhost:8000/api/v1';

// Custom error class for permission errors
export class PermissionError extends Error {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'PermissionError';
  }
}

async function getValidToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (!isTokenExpired(tokens.access)) {
    return tokens.access;
  }

  // Try to refresh the token
  if (!isTokenExpired(tokens.refresh)) {
    try {
      const newTokens = await refreshToken(tokens.refresh);
      storeTokens(newTokens);
      return newTokens.access;
    } catch {
      clearTokens();
      return null;
    }
  }

  clearTokens();
  return null;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    clearTokens();
    throw new Error('Not authenticated');
  }

  if (response.status === 403) {
    throw new PermissionError();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// User types and API
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  permissions: string[];
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/users/me/');
}

// Permission helper
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

// Residence permissions
export const RESIDENCE_PERMISSIONS = {
  view: 'residences.view_residence',
  add: 'residences.add_residence',
  change: 'residences.change_residence',
  delete: 'residences.delete_residence',
} as const;

export interface Residence {
  id: number;
  house_number: string;
  name: string;
  phone_numbers: PhoneNumber[];
  email_addresses: EmailAddress[];
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: number;
  number: string;
  label: string;
  is_primary: boolean;
}

export interface EmailAddress {
  id: number;
  email: string;
  label: string;
  is_primary: boolean;
}

// Input types for create/update operations (without id fields)
export interface PhoneNumberInput {
  number: string;
  label: string;
  is_primary: boolean;
}

export interface EmailAddressInput {
  email: string;
  label: string;
  is_primary: boolean;
}

export interface ResidenceInput {
  house_number: string;
  name: string;
  phone_numbers: PhoneNumberInput[];
  email_addresses: EmailAddressInput[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getResidences(page = 1): Promise<PaginatedResponse<Residence>> {
  return apiFetch<PaginatedResponse<Residence>>(`/residences/?page=${page}`);
}

export async function searchResidences(search: string, page = 1): Promise<PaginatedResponse<Residence>> {
  return apiFetch<PaginatedResponse<Residence>>('/residences/search/', {
    method: 'POST',
    body: JSON.stringify({ search, page }),
  });
}

export async function getResidence(id: number): Promise<Residence> {
  return apiFetch<Residence>(`/residences/${id}/`);
}

export async function createResidence(data: ResidenceInput): Promise<Residence> {
  return apiFetch<Residence>('/residences/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateResidence(id: number, data: ResidenceInput): Promise<Residence> {
  return apiFetch<Residence>(`/residences/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteResidence(id: number): Promise<void> {
  await apiFetch(`/residences/${id}/`, {
    method: 'DELETE',
  });
}
