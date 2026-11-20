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
  price: string;
  allowance: string;
  highlight?: boolean;
};

/** The free credits every account starts with (FREE_CREDITS on the server). */
export const FREE_CREDITS = 5;

export const PLAN_OFFERS: PlanOffer[] = [
  { id: 'free', name: 'Free', price: '$0', allowance: `${FREE_CREDITS} free credits` },
  { id: 'weekly', name: 'Weekly', price: '$3.99 / week', allowance: '20 credits every week' },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$19.99 / month',
    allowance: '100 credits every month',
    highlight: true,
  },
];
