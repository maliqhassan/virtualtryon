import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/secure-token-store';

type CalendarState = {
  /** Planned outfits: garment ids by day number (see today's dayNumber). */
  plans: Record<number, string[]>;
  plan: (day: number, garmentIds: string[]) => void;
  clear: (day: number) => void;
};

/** Outfits planned for upcoming days, kept on the phone. */
export const useCalendar = create<CalendarState>()(
  persist(
    (set) => ({
      plans: {},
      plan: (day, garmentIds) => set((state) => ({ plans: { ...state.plans, [day]: garmentIds } })),
      clear: (day) =>
        set((state) => {
          const plans = { ...state.plans };
          delete plans[day];
          return { plans };
        }),
    }),
    {
      name: 'calendar_plans',
      storage: createJSONStorage(() => ({
        getItem: getStoredToken,
        setItem: setStoredToken,
        removeItem: deleteStoredToken,
      })),
      partialize: ({ plans }) => ({ plans }),
    },
  ),
);
