// Public API of the auth feature, for other features to import.
export {
  useAccountQuery,
  useContinueWithGoogle,
  useDeleteAccount,
  useSignOut,
} from './hooks/use-account';
export { deleteAccountErrorMessage, signInErrorMessage } from './services/auth-api';
export type { Account } from './types';
