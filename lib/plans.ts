export type PlanId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export type BillingPeriod = 'monthly' | 'yearly';

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceUSD: number | null;
  annualPriceUSD: number | null;
  includedConversationsPerMonth: number;
  formsLimit: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
  isCustom?: boolean;
};

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out FormFlow',
    monthlyPriceUSD: 0,
    annualPriceUSD: 0,
    includedConversationsPerMonth: 50,
    formsLimit: 2,
    features: [
      'Up to 2 forms',
      '50 conversations/month',
      'Basic analytics',
      'Email notifications',
      '7-day conversation history',
    ],
    cta: 'Get started',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small projects and testing',
    monthlyPriceUSD: 29,
    annualPriceUSD: 29 * 12 * 0.8,
    includedConversationsPerMonth: 100,
    formsLimit: 5,
    features: [
      'Up to 5 forms',
      '100 conversations/month',
      'Basic analytics',
      'Email notifications',
      '30-day conversation history',
      'CSV export',
    ],
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams with higher volume',
    monthlyPriceUSD: 99,
    annualPriceUSD: 99 * 12 * 0.8,
    includedConversationsPerMonth: 500,
    formsLimit: 999999,
    features: [
      'Unlimited forms',
      '500 conversations/month',
      'Advanced analytics & exports',
      'Custom branding',
      'Priority support',
      'Unlimited conversation history',
      'Webhook integrations',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For organizations at scale',
    monthlyPriceUSD: 299,
    annualPriceUSD: 299 * 12 * 0.8,
    includedConversationsPerMonth: 2000,
    formsLimit: 999999,
    features: [
      'Unlimited forms',
      '2,000 conversations/month',
      'Everything in Pro',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security controls',
      'Team collaboration tools',
    ],
    cta: 'Start free trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for high-volume needs',
    monthlyPriceUSD: null,
    annualPriceUSD: null,
    includedConversationsPerMonth: 999999,
    formsLimit: 999999,
    features: [
      'Unlimited forms',
      'Unlimited conversations',
      'Everything in Business',
      'Custom AI training',
      'White-label solution',
      'Dedicated infrastructure',
      '99.99% uptime SLA',
      'HIPAA compliance',
    ],
    cta: 'Contact sales',
    isCustom: true,
  },
];

export function getPlanById(id: PlanId): Plan | undefined {
  return plans.find((plan) => plan.id === id);
}

export function getPrice(plan: Plan, period: BillingPeriod): number | null {
  if (plan.isCustom) return null;
  return period === 'monthly' ? plan.monthlyPriceUSD : plan.annualPriceUSD;
}

export function formatPrice(price: number | null, period: BillingPeriod = 'monthly'): string {
  if (price === null) return 'Custom';
  if (price === 0) return '$0';

  if (period === 'yearly') {
    const monthlyEquivalent = Math.round(price / 12);
    return `$${monthlyEquivalent}`;
  }

  return `$${price}`;
}

export function calculateAnnualSavings(monthlyPrice: number): number {
  const annualWithoutDiscount = monthlyPrice * 12;
  const annualWithDiscount = monthlyPrice * 12 * 0.8;
  return Math.round(annualWithoutDiscount - annualWithDiscount);
}
