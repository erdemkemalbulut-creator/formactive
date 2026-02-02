'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PricingTable } from '@/components/billing/PricingTable';
import type { BillingPeriod } from '@/lib/plans';

type Subscription = {
  plan: string;
  status: string;
  forms_limit: number;
  conversations_limit: number;
  current_period_conversations: number;
};

export default function SubscriptionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      setSubscription(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load subscription',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectPlan = (planId: string, period: BillingPeriod) => {
    toast({
      title: 'Plan selection',
      description: `Selected ${planId} plan with ${period} billing`,
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-slate-600">
              Currently on: <span className="font-semibold">{subscription?.plan || 'Free'}</span> plan
            </p>
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle>Monthly usage</CardTitle>
              <CardDescription>Your current usage for this billing period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Forms</span>
                    <span className="text-sm font-medium">
                      0 / {subscription?.forms_limit || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-900 h-2 rounded-full"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Completed conversations (this period)</span>
                    <span className="text-sm font-medium">
                      {subscription?.current_period_conversations || 0} / {subscription?.conversations_limit || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-900 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((subscription?.current_period_conversations || 0) /
                            (subscription?.conversations_limit || 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PricingTable
            onSelectPlan={handleSelectPlan}
            currentPlan={subscription?.plan}
            showFreePlan={true}
          />

          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready to upgrade with Stripe?
            </h3>
            <p className="text-slate-700 mb-4">
              To enable payment processing with Stripe, you'll need to configure your Stripe account
              and add your API keys to the application.
            </p>
            <Button variant="outline" asChild>
              <a
                href="https://bolt.new/setup/stripe"
                target="_blank"
                rel="noopener noreferrer"
              >
                Setup Stripe Integration
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
