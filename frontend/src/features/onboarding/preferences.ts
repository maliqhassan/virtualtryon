import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStateStorage } from '@/lib/app-storage';
import { onIdentityChange } from '@/lib/identity-events';

/** Onboarding goals (step 1). The order of `GOALS` is the order shown. */
export const GOALS = [
  { id: 'style', icon: 'face_retouching_natural', label: 'Find my personal style' },
  { id: 'events', icon: 'celebration', label: 'Outfits for weddings & events' },
  { id: 'tryon', icon: 'checkroom', label: 'See clothes on me before I buy' },
  { id: 'wardrobe', icon: 'dresser', label: 'Get more out of my wardrobe' },
  { id: 'bold', icon: 'bolt', label: 'Try a bolder look' },
  { id: 'inspiration', icon: 'auto_awesome', label: 'Just here for inspiration' },
] as const;

export type GoalId = (typeof GOALS)[number]['id'];
export type StyleFor = 'women' | 'men';

type OnboardingPreferences = {
  goals: GoalId[];
  styleFor: StyleFor;
  styles: string[];
  toggleGoal: (goal: GoalId) => void;
  setStyleFor: (styleFor: StyleFor) => void;
  toggleStyle: (style: string) => void;
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * What the user told us during onboarding. Client state (Zustand), kept on
 * the phone: no screen needs it on the server yet. Today reads `goals` to
 * order its quick actions.
 */
export const useOnboardingPreferences = create<OnboardingPreferences>()(
  persist(
    (set) => ({
      goals: [],
      styleFor: 'women',
      styles: [],
      toggleGoal: (goal) => set((state) => ({ goals: toggle(state.goals, goal) })),
      setStyleFor: (styleFor) => set({ styleFor }),
      toggleStyle: (style) => set((state) => ({ styles: toggle(state.styles, style) })),
    }),
    {
      name: 'onboarding_preferences',
      storage: appStateStorage,
      partialize: ({ goals, styleFor, styles }) => ({ goals, styleFor, styles }),
    },
  ),
);

// Another person's data must not carry over after signing in or out.
onIdentityChange(() =>
  useOnboardingPreferences.setState(useOnboardingPreferences.getInitialState(), true),
);
