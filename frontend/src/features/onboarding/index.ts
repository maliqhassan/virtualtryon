// Public API of the onboarding feature, for other features to import.
export { BrandSplash } from './components/brand-splash';
export { OnboardingFrame } from './components/onboarding-frame';
export { StepHeader } from './components/step-header';
export { markOnboardingSeen, useOnboardingSeen } from './onboarding-flag';
export { GOALS, type GoalId, useOnboardingPreferences } from './preferences';
export {
  ANALYSING_HREF,
  EMAIL_HREF,
  GOAL_HREF,
  ONBOARDING_PLANS_HREF,
  SIGN_IN_HREF,
  WELCOME_HREF,
} from './routes';
