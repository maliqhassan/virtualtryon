import type { Usage } from '@/features/usage';

/** Who the app is signed in as: a guest (email null) or an account. */
export type Account = {
  email: string | null;
  authProvider: 'guest' | 'email' | 'google' | 'apple';
  plan: Usage['plan'];
};
