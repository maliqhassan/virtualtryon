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

const DELETE_MESSAGES = {
  // A different Google account, or the confirmation took too long.
  confirmation_required:
    'Please confirm with the Google account you’re signed in with, then try again.',
  unavailable: 'We can’t check your Google sign-in right now. Please try again.',
  failed: 'Couldn’t delete your account. Please try again.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
} as const;

export class DeleteAccountError extends Error {
  constructor(readonly code: keyof typeof DELETE_MESSAGES) {
    super(DELETE_MESSAGES[code]);
    this.name = 'DeleteAccountError';
  }
}

/** Deletes the account and everything in it on our server (backend ADR 0015).
 * A Google account sends the token from a Google sign-in made just now. */
export async function deleteAccount(idToken: string | null): Promise<void> {
  try {
    await apiClient.delete('/api/v1/account', {
      data: idToken ? { id_token: idToken } : undefined,
    });
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const code = (error.response.data as { detail?: { code?: string } } | undefined)?.detail
        ?.code;
      if (code === 'confirmation_required') throw new DeleteAccountError('confirmation_required');
      if (error.response.status === 503) throw new DeleteAccountError('unavailable');
      throw new DeleteAccountError('failed');
    }
    throw new DeleteAccountError('network');
  }
}

export function deleteAccountErrorMessage(error: unknown): string | null {
  if (error instanceof DeleteAccountError || error instanceof GoogleSignInError) {
    return error.message;
  }
  return error ? DELETE_MESSAGES.failed : null;
}
