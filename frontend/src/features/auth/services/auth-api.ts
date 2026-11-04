import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api/client';
import { saveSessionToken } from '@/services/api/session';

import type { Account } from '../types';

type AccountDto = {
  email: string | null;
  auth_provider: Account['authProvider'];
  plan: Account['plan'];
};

function toAccount(dto: AccountDto): Account {
  return { email: dto.email, authProvider: dto.auth_provider, plan: dto.plan };
}

export type EmailAuthErrorCode = 'wrong_password' | 'too_many_attempts' | 'invalid' | 'network';

const MESSAGES: Record<EmailAuthErrorCode, string> = {
  wrong_password: 'That password doesn’t match this email.',
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  invalid: 'Check the email format, and use a password of 8 or more characters.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
};

export class EmailAuthError extends Error {
  constructor(readonly code: EmailAuthErrorCode) {
    super(MESSAGES[code]);
  }
}

/** Signs up (new email) or signs in (known email), then keeps the session. */
export async function continueWithEmail(
  email: string,
  password: string,
  isRetry = false,
): Promise<{ account: Account; created: boolean }> {
  try {
    const response = await apiClient.post<{
      token: string;
      created: boolean;
      account: AccountDto;
    }>('/api/v1/auth/email', { email, password });
    await saveSessionToken(response.data.token);
    return { account: toAccount(response.data.account), created: response.data.created };
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const status = error.response.status;
      const code = (error.response.data as { detail?: { code?: string } } | undefined)?.detail
        ?.code;
      // An old token on this phone expired; the session interceptor has
      // dropped it, so the same request now goes through. Once.
      if (code === 'session_expired' && !isRetry) return continueWithEmail(email, password, true);
      if (code === 'wrong_password') throw new EmailAuthError('wrong_password');
      if (status === 429) throw new EmailAuthError('too_many_attempts');
      if (status === 422) throw new EmailAuthError('invalid');
    }
    throw new EmailAuthError('network');
  }
}

export async function getAccount(): Promise<Account> {
  const response = await apiClient.get<AccountDto>('/api/v1/auth/me');
  return toAccount(response.data);
}
