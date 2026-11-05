import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api/client';
import { saveSessionToken } from '@/services/api/session';

import type { Account } from '../types';
import { getGoogleIdToken, GoogleSignInError } from './google-sign-in';

type AccountDto = {
  email: string | null;
  auth_provider: Account['authProvider'];
  plan: Account['plan'];
};

function toAccount(dto: AccountDto): Account {
  return { email: dto.email, authProvider: dto.auth_provider, plan: dto.plan };
}

export type SignInErrorCode = 'too_many_attempts' | 'unavailable' | 'failed' | 'network';

const MESSAGES: Record<SignInErrorCode, string> = {
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  unavailable: 'Google sign-in isn’t available right now. Please try again later.',
  failed: 'Google sign-in didn’t go through. Please try again.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
};

/** Our server refused or couldn't be reached; Google's own problems are
 * GoogleSignInError. Both have a message that's safe to show. */
export class SignInError extends Error {
  constructor(readonly code: SignInErrorCode) {
    super(MESSAGES[code]);
    this.name = 'SignInError';
  }
}

export type SignInResult = { account: Account; created: boolean };

async function exchangeGoogleToken(idToken: string, isRetry = false): Promise<SignInResult> {
  try {
    const response = await apiClient.post<{
      token: string;
      created: boolean;
      account: AccountDto;
    }>('/api/v1/auth/google', { id_token: idToken });
    await saveSessionToken(response.data.token);
    return { account: toAccount(response.data.account), created: response.data.created };
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const code = (error.response.data as { detail?: { code?: string } } | undefined)?.detail
        ?.code;
      // An old token on this phone expired; the session interceptor has
      // dropped it, so the same request now goes through. Once.
      if (code === 'session_expired' && !isRetry) return exchangeGoogleToken(idToken, true);
      if (error.response.status === 429) throw new SignInError('too_many_attempts');
      if (error.response.status === 503) throw new SignInError('unavailable');
      throw new SignInError('failed');
    }
    throw new SignInError('network');
  }
}

/** Opens Google's account picker, then signs in (or up) on our server and
 * keeps the session. Null when the user closes the picker. */
export async function continueWithGoogle(): Promise<SignInResult | null> {
  const idToken = await getGoogleIdToken();
  if (idToken === null) return null;
  return exchangeGoogleToken(idToken);
}

export function signInErrorMessage(error: unknown): string | null {
  if (error instanceof SignInError || error instanceof GoogleSignInError) return error.message;
  return error ? MESSAGES.failed : null;
}

export async function getAccount(): Promise<Account> {
  const response = await apiClient.get<AccountDto>('/api/v1/auth/me');
  return toAccount(response.data);
}
