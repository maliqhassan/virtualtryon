import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStateStorage } from '@/lib/app-storage';
import { onIdentityChange } from '@/lib/identity-events';

type LaundryState = {
  /** Garment ids in the wash; they're left out of outfit suggestions. */
  garmentIds: string[];
  toggle: (garmentId: string) => void;
  clear: () => void;
};

/** The laundry basket, kept on the phone (no wear tracking on the server yet). */
export const useLaundry = create<LaundryState>()(
  persist(
    (set) => ({
      garmentIds: [],
      toggle: (garmentId) =>
        set((state) => ({
          garmentIds: state.garmentIds.includes(garmentId)
            ? state.garmentIds.filter((id) => id !== garmentId)
            : [...state.garmentIds, garmentId],
        })),
      clear: () => set({ garmentIds: [] }),
    }),
    {
      name: 'laundry',
      storage: appStateStorage,
      partialize: ({ garmentIds }) => ({ garmentIds }),
    },
  ),
);

// Another person's data must not carry over after signing in or out.
onIdentityChange(() => useLaundry.setState(useLaundry.getInitialState(), true));
