import { useMutation } from '@tanstack/react-query';

import { detectCategory } from '../services/garments-api';

/** Guesses a new piece's category from its photo, while the user types its name. */
export function useDetectCategory() {
  return useMutation({ mutationFn: detectCategory });
}
