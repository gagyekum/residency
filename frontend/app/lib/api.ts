import { getStoredTokens, refreshToken, storeTokens, clearTokens, isTokenExpired } from './auth';
import { getApiUrl } from './config';

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

  const response = await fetch(`${getApiUrl()}${endpoint}`, {
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

// Messaging permissions
export const MESSAGING_PERMISSIONS = {
  view: 'messaging.view_messagejob',
  add: 'messaging.add_messagejob',
} as const;

// Legacy alias for backward compatibility
export const EMAIL_PERMISSIONS = MESSAGING_PERMISSIONS;

// Channel type
export type Channel = 'email' | 'sms';

// Email recipient type
export interface EmailRecipient {
  id: number;
  residence: number;
  residence_name: string;
  house_number: string;
  email_address: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string;
  sent_at: string | null;
}

// SMS recipient type
export interface SMSRecipient {
  id: number;
  residence: number;
  residence_name: string;
  house_number: string;
  phone_number: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string;
  sent_at: string | null;
}

// Message job type (unified for email and SMS)
export interface MessageJob {
  id: number;
  subject: string;
  body: string;
  sms_body: string;
  channels: Channel[];
  sender: number;
  sender_email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  // Email stats
  email_total_recipients: number;
  email_sent_count: number;
  email_failed_count: number;
  // SMS stats
  sms_total_recipients: number;
  sms_sent_count: number;
  sms_failed_count: number;
  // Legacy fields
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  error_message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Progress
  email_progress_percent: number;
  sms_progress_percent: number;
  overall_progress_percent: number;
  progress_percent: number;
}

// Legacy alias
export type EmailJob = MessageJob;

export interface RecipientsResponse<T> {
  count: number;
  next: boolean;
  page: number;
  results: T[];
}

export type EmailRecipientsResponse = RecipientsResponse<EmailRecipient>;
export type SMSRecipientsResponse = RecipientsResponse<SMSRecipient>;

export interface MessageJobListItem {
  id: number;
  subject: string;
  channels: Channel[];
  sender_email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  // Email stats
  email_total_recipients: number;
  email_sent_count: number;
  email_failed_count: number;
  // SMS stats
  sms_total_recipients: number;
  sms_sent_count: number;
  sms_failed_count: number;
  // Legacy
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
  // Progress
  email_progress_percent: number;
  sms_progress_percent: number;
  overall_progress_percent: number;
  progress_percent: number;
}

// Legacy alias
export type EmailJobListItem = MessageJobListItem;

export interface MessageJobInput {
  subject?: string;
  body: string;
  sms_body?: string;
  channels?: Channel[];
}

// Legacy alias
export type EmailJobInput = MessageJobInput;

export interface MessageJobStatus {
  id: number;
  status: string;
  channels: Channel[];
  // Email stats
  email_total_recipients: number;
  email_sent_count: number;
  email_failed_count: number;
  email_progress_percent: number;
  // SMS stats
  sms_total_recipients: number;
  sms_sent_count: number;
  sms_failed_count: number;
  sms_progress_percent: number;
  // Overall
  overall_progress_percent: number;
  // Legacy
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  progress_percent: number;
}

// Legacy alias
export type EmailJobStatus = MessageJobStatus;

// Messaging API functions
export async function getMessageJobs(page = 1): Promise<PaginatedResponse<MessageJobListItem>> {
  return apiFetch<PaginatedResponse<MessageJobListItem>>(`/messaging/?page=${page}`);
}

export async function getMessageJob(id: number): Promise<MessageJob> {
  return apiFetch<MessageJob>(`/messaging/${id}/`);
}

export async function getMessageJobStatus(id: number): Promise<MessageJobStatus> {
  return apiFetch<MessageJobStatus>(`/messaging/${id}/status/`);
}

export async function createMessageJob(data: MessageJobInput): Promise<MessageJob> {
  return apiFetch<MessageJob>('/messaging/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMessageJobEmailRecipients(jobId: number, page = 1): Promise<EmailRecipientsResponse> {
  return apiFetch<EmailRecipientsResponse>(`/messaging/${jobId}/email-recipients/?page=${page}`);
}

export async function getMessageJobSMSRecipients(jobId: number, page = 1): Promise<SMSRecipientsResponse> {
  return apiFetch<SMSRecipientsResponse>(`/messaging/${jobId}/sms-recipients/?page=${page}`);
}

export async function retryMessageJob(jobId: number): Promise<MessageJobStatus> {
  return apiFetch<MessageJobStatus>(`/messaging/${jobId}/retry/`, {
    method: 'POST',
  });
}

// Legacy aliases for backward compatibility
export const getEmailJobs = getMessageJobs;
export const getEmailJob = getMessageJob;
export const getEmailJobStatus = getMessageJobStatus;
export const createEmailJob = createMessageJob;
export const getEmailJobRecipients = getMessageJobEmailRecipients;
export const retryEmailJob = retryMessageJob;

// Dashboard types and API
export interface DashboardStats {
  residences: {
    total: number;
    with_email: number;
    with_phone: number;
  };
  messaging: {
    total_jobs: number;
    completed_jobs: number;
    email_sent: number;
    email_failed: number;
    sms_sent: number;
    sms_failed: number;
  };
  // Legacy field for backward compatibility
  emails: {
    total_jobs: number;
    completed_jobs: number;
    total_sent: number;
    total_failed: number;
  };
}

export async function getDashboard(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/users/dashboard/');
}
