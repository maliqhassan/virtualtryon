import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/secure-token-store';

type TodayState = {
  /** Which day `shuffles` and `wearing` belong to (see dayNumber). */
  day: number;
  /** How many times "Shuffle" was tapped today. */
  shuffles: number;
  /** The outfit the user chose to wear today, by garment id. */
  wearing: string[];
  shuffle: (day: number) => void;
  setWearing: (day: number, garmentIds: string[]) => void;
};

/**
 * Today's choices, kept on the phone and reset each day. Client state: the
 * server has no daily outfit or wear tracking yet (04-react-native.md §9).
 */
export const useTodayStore = create<TodayState>()(
  persist(
    (set) => ({
      day: 0,
      shuffles: 0,
      wearing: [],
      shuffle: (day) =>
        set((state) =>
          state.day === day
            ? { shuffles: state.shuffles + 1, wearing: [] }
            : { day, shuffles: 1, wearing: [] },
        ),
      setWearing: (day, garmentIds) =>
        set((state) => ({
          day,
          shuffles: state.day === day ? state.shuffles : 0,
          wearing: garmentIds,
        })),
    }),
    {
      name: 'today_state',
      storage: createJSONStorage(() => ({
        getItem: getStoredToken,
        setItem: setStoredToken,
        removeItem: deleteStoredToken,
      })),
      partialize: ({ day, shuffles, wearing }) => ({ day, shuffles, wearing }),
    },
  ),
);
