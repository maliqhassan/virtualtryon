import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStateStorage } from '@/lib/app-storage';
import { onIdentityChange } from '@/lib/identity-events';

import { dayNumber } from './lib/pick-outfit';

/** Plans from today on; nothing reads a day that has passed. */
function upcoming(plans: Record<number, string[]>): Record<number, string[]> {
  const today = dayNumber(new Date());
  return Object.fromEntries(Object.entries(plans).filter(([day]) => Number(day) >= today));
}

type CalendarState = {
  /** Planned outfits: garment ids by day number (see lib/pick-outfit's dayNumber). */
  plans: Record<number, string[]>;
  plan: (day: number, garmentIds: string[]) => void;
  clear: (day: number) => void;
};

/** Outfits planned for upcoming days, kept on the phone. */
export const useCalendar = create<CalendarState>()(
  persist(
    (set) => ({
      plans: {},
      // Each change also drops days that have passed, so the store stays small.
      plan: (day, garmentIds) =>
        set((state) => ({ plans: upcoming({ ...state.plans, [day]: garmentIds }) })),
      clear: (day) =>
        set((state) => {
          const plans = upcoming(state.plans);
          delete plans[day];
          return { plans };
        }),
    }),
    {
      name: 'calendar_plans',
      storage: appStateStorage,
      partialize: ({ plans }) => ({ plans }),
    },
  ),
);

// Another person's data must not carry over after signing in or out.
onIdentityChange(() => useCalendar.setState(useCalendar.getInitialState(), true));
