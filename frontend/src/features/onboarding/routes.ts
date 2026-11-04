import type { Href } from 'expo-router';

/** The first-run flow, in order (design_handoff_ai_stylist/04-react-native.md §2). */
export const WELCOME_HREF = '/welcome' as Href;
export const SIGN_IN_HREF = '/sign-in' as Href;
export const EMAIL_HREF = '/email' as Href;
export const GOAL_HREF = '/goal' as Href;
export const QUIZ_HREF = '/quiz' as Href;
export const HOW_IT_WORKS_HREF = '/how-it-works' as Href;
export const PHOTO_TIPS_HREF = '/photo-tips' as Href;
export const ONBOARDING_PHOTO_HREF = {
  pathname: '/my-photo',
  params: { from: 'onboarding' },
} as Href;
export const ANALYSING_HREF = '/analysing' as Href;
export const PROFILE_HREF = '/profile' as Href;
export const FIRST_PIECES_HREF = '/first-pieces' as Href;
export const READY_HREF = '/ready' as Href;
export const ONBOARDING_PLANS_HREF = {
  pathname: '/upgrade',
  params: { from: 'onboarding' },
} as Href;
