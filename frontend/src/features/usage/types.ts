export type PlanId = 'free' | 'pro' | 'pro_plus';

/** Mirrors backend/app/schemas/usage.py. */
export type Usage = {
  plan: PlanId;
  period: 'lifetime' | 'day';
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string | null;
};

/** What the upgrade screen shows. The server decides the real limits
 * (backend/app/services/plans.py); these must match it. */
export type PlanOffer = {
  id: PlanId;
  name: string;
  price: string;
  allowance: string;
  highlight?: boolean;
};

export const PLAN_OFFERS: PlanOffer[] = [
  { id: 'free', name: 'Free', price: '$0', allowance: '1 free try-on' },
  { id: 'pro', name: 'Pro', price: '$6.99 / month', allowance: '2 try-ons every day' },
  {
    id: 'pro_plus',
    name: 'Pro Plus',
    price: '$9.99 / month',
    allowance: '3 try-ons every day',
    highlight: true,
  },
];
