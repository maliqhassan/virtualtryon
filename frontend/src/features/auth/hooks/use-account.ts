import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { emitIdentityChange } from '@/lib/identity-events';
import { clearSession } from '@/services/api/session';

import { continueWithEmail, getAccount } from '../services/auth-api';

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

/** Sign up or sign in with email. */
export function useContinueWithEmail() {
  const identityChanged = useIdentityChanged();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      continueWithEmail(email, password),
    onSuccess: identityChanged,
  });
}

/** Signs out on this phone and continues as a fresh guest. */
export function useSignOut() {
  const identityChanged = useIdentityChanged();
  return useMutation({
    mutationFn: clearSession,
    onSuccess: identityChanged,
  });
}
