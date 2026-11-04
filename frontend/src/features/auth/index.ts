// Public API of the auth feature, for other features to import.
export { useAccountQuery, useContinueWithEmail, useSignOut } from './hooks/use-account';
export { EmailAuthError } from './services/auth-api';
export type { Account } from './types';
