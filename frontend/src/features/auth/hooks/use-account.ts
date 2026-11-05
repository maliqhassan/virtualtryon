import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitIdentityChange } from '@/lib/identity-events';
import { clearSession } from '@/services/api/session';

import { continueWithGoogle, getAccount } from '../services/auth-api';
import { signOutOfGoogle } from '../services/google-sign-in';

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
