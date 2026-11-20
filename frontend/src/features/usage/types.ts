export type PlanId = 'free' | 'weekly' | 'monthly';

/** Mirrors backend/app/schemas/usage.py. */
export type Usage = {
  plan: PlanId;
  period: 'lifetime' | 'week' | 'month';
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string | null;
  /** Limits are switched off on the server (testing). */
  unlimited: boolean;
};

/** What the plans screen shows. One credit is one try-on. The server decides the real limits
 * (backend/app/services/plans.py); these must match it. */
export type PlanOffer = {
  id: PlanId;
  name: string;
  /** "$3.99"; shown with "/ week" from `per`. */
  price: string;
  credits: number;
  /** How often the credits renew; null for the one-off free credits. */
  per: 'week' | 'month' | null;
  highlight?: boolean;
};

/** The free credits every account starts with (FREE_CREDITS on the server). */
export const FREE_CREDITS = 5;

export const PLAN_OFFERS: PlanOffer[] = [
  { id: 'free', name: 'Free', price: '$0', credits: FREE_CREDITS, per: null },
  { id: 'weekly', name: 'Weekly', price: '$3.99', credits: 20, per: 'week' },
  { id: 'monthly', name: 'Monthly', price: '$19.99', credits: 100, per: 'month', highlight: true },
];
