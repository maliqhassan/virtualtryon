import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/secure-token-store';

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
      storage: createJSONStorage(() => ({
        getItem: getStoredToken,
        setItem: setStoredToken,
        removeItem: deleteStoredToken,
      })),
      partialize: ({ garmentIds }) => ({ garmentIds }),
    },
  ),
);
