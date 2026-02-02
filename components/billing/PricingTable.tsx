'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Check, HelpCircle } from 'lucide-react';
import { plans, type BillingPeriod, type Plan, getPrice, formatPrice } from '@/lib/plans';

type PricingTableProps = {
  onSelectPlan?: (planId: string, period: BillingPeriod) => void;
  currentPlan?: string;
  showFreePlan?: boolean;
};

export function PricingTable({ onSelectPlan, currentPlan, showFreePlan = false }: PricingTableProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [billingModalOpen, setBillingModalOpen] = useState(false);

  const displayPlans = showFreePlan ? plans : plans.filter((p) => p.id !== 'free');

  const handleSelectPlan = (plan: Plan) => {
    if (onSelectPlan) {
      onSelectPlan(plan.id, billingPeriod);
    }
  };

  return (
    <div>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-lg text-slate-600 mb-6">
          Pay for what you use. A conversation is counted when someone completes your form.
        </p>

        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
              billingPeriod === 'yearly'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yearly
            <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs">
              Save 20%
            </Badge>
          </button>
        </div>

        <Dialog open={billingModalOpen} onOpenChange={setBillingModalOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">How billing works</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>How billing works</DialogTitle>
              <DialogDescription className="text-left space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Definition</h4>
                  <p className="text-slate-600">
                    A conversation is counted when someone completes your form and you receive a finished submission.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">What doesn't count</h4>
                  <ul className="text-slate-600 list-disc list-inside space-y-1">
                    <li>Page views</li>
                    <li>Partial / abandoned starts (no completed submission)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Monthly limits</h4>
                  <p className="text-slate-600">
                    Each plan includes a number of completed conversations per month. Your counter resets at the start of each billing period.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Yearly billing</h4>
                  <p className="text-slate-600">
                    Yearly plans are billed upfront and include a 20% discount compared to paying monthly.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Grace period</h4>
                  <p className="text-slate-600">
                    If you exceed your monthly limit, we continue collecting new submissions for a short grace period so you don't lose leads. If you go beyond the grace amount, some features for NEW submissions (exports/integrations) may pause until you upgrade.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-500 text-xs">
                    Billing alerts are shown to admins only. Your customers never see your plan or limits.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      <div className={`grid gap-8 max-w-6xl mx-auto mb-16 ${
        showFreePlan ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {displayPlans.map((plan) => {
          const price = getPrice(plan, billingPeriod);
          const isCurrentPlan = currentPlan?.toLowerCase() === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.highlighted
                  ? 'border-2 border-slate-900 shadow-xl scale-105 bg-white'
                  : isCurrentPlan
                  ? 'border-2 border-blue-600 bg-white'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most popular
                </div>
              )}

              {isCurrentPlan && !plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Current plan
                </div>
              )}

              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-slate-900">
                      {formatPrice(price, billingPeriod)}
                    </span>
                    {price !== null && (
                      <span className="text-slate-600">
                        /month
                        {billingPeriod === 'yearly' && (
                          <span className="text-xs block text-slate-500">
                            billed annually
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {plan.includedConversationsPerMonth === 999999
                      ? 'Unlimited conversations'
                      : `${plan.includedConversationsPerMonth.toLocaleString()} conversations/month`}
                  </p>
                </div>

                {!isCurrentPlan && (
                  <Button
                    className={`w-full mb-6 ${
                      plan.highlighted
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.cta}
                  </Button>
                )}

                {isCurrentPlan && (
                  <Button
                    className="w-full mb-6"
                    variant="outline"
                    disabled
                  >
                    Current plan
                  </Button>
                )}

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="max-w-3xl mx-auto">
        <Card className="border-slate-200 bg-slate-50">
          <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Need more conversations?
            </h3>
            <p className="text-slate-600 mb-4">
              Talk to our team about custom plans for high-volume needs.
            </p>
            <Button
              variant="outline"
              className="border-slate-300"
              onClick={() => handleSelectPlan(plans[plans.length - 1])}
            >
              Contact sales
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-500 text-sm">
          All plans include SSL encryption, SOC 2 compliance, and 99.9% uptime guarantee
        </p>
      </div>
    </div>
  );
}
