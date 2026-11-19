import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { resetOnboardingSeen } from '@/features/onboarding';
import { emitIdentityChange } from '@/lib/identity-events';
import { clearSession } from '@/services/api/session';

import { continueWithGoogle, deleteAccount, getAccount } from '../services/auth-api';
import { confirmWithGoogle, signOutOfGoogle } from '../services/google-sign-in';
import type { Account } from '../types';

const ACCOUNT_KEY = ['account'] as const;

export function useAccountQuery() {
  return useQuery({ queryKey: ACCOUNT_KEY, queryFn: getAccount });
}

/**
 * Everything cached, on the server's side and the phone's, belongs to the
 * previous identity: reset it (not just mark it stale), so no screen shows
 * another person's wardrobe, photos or plans even for a moment.
 */
function useIdentityChanged() {
  const queryClient = useQueryClient();
  return () => {
    emitIdentityChange();
    return queryClient.resetQueries();
  };
}

/** Sign up or sign in with Google. Resolves to null when the picker is closed. */
export function useContinueWithGoogle() {
  const identityChanged = useIdentityChanged();
  return useMutation({
    mutationFn: continueWithGoogle,
    onSuccess: async (result) => {
      if (result) await identityChanged();
    },
  });
}

/** Signs out on this phone and continues as a fresh guest. The Google
 * account is forgotten too, so signing in again shows the picker. */
export function useSignOut() {
  const identityChanged = useIdentityChanged();
  return useMutation({
    mutationFn: async () => {
      await clearSession();
      await signOutOfGoogle();
    },
    onSuccess: identityChanged,
  });
}

/** Runs every step even if one fails: the account is already gone. */
async function forgetDeletedAccount(): Promise<void> {
  await Promise.allSettled([clearSession(), signOutOfGoogle(), resetOnboardingSeen()]);
}

/**
 * Deletes the account and everything in it (backend ADR 0015). A Google
 * account confirms with a fresh Google sign-in first (the server refuses
 * otherwise). Afterwards the phone forgets the session, the guest id and
 * the intro, so the app starts over. Resolves to false when the user
 * closes the Google picker (nothing deleted).
 */
export function useDeleteAccount() {
  const identityChanged = useIdentityChanged();
  return useMutation({
    mutationFn: async (account: Account): Promise<boolean> => {
      if (account.authProvider === 'google') {
        if (!(await confirmWithGoogle(deleteAccount))) return false;
      } else {
        await deleteAccount(null);
      }
      await forgetDeletedAccount();
      return true;
    },
    onSuccess: async (deleted) => {
      if (deleted) await identityChanged();
    },
  });
}
