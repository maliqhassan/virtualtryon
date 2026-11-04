import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearSession } from '@/services/api/session';

import { continueWithEmail, getAccount } from '../services/auth-api';

const ACCOUNT_KEY = ['account'] as const;

export function useAccountQuery() {
  return useQuery({ queryKey: ACCOUNT_KEY, queryFn: getAccount });
}

/** Sign up or sign in with email. Every cached screen belongs to the old identity. */
export function useContinueWithEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      continueWithEmail(email, password),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Signs out on this phone and continues as a fresh guest. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearSession,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
