'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, FileText, Users, LogOut, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Form = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  created_at: string;
  _count?: { responses: number };
};

type Subscription = {
  plan: string;
  forms_limit: number;
  responses_limit: number;
  current_period_responses: number;
};

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [formsResult, subscriptionResult, responsesResult] = await Promise.all([
        supabase
          .from('forms')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle(),
        supabase.from('responses').select('form_id'),
      ]);

      if (formsResult.error) throw formsResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      const responseCounts = (responsesResult.data || []).reduce((acc: any, r: any) => {
        acc[r.form_id] = (acc[r.form_id] || 0) + 1;
        return acc;
      }, {});

      const formsWithCounts = (formsResult.data || []).map((form) => ({
        ...form,
        _count: { responses: responseCounts[form.id] || 0 },
      }));

      setForms(formsWithCounts);
      setSubscription(subscriptionResult.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const createNewForm = () => {
    if (!subscription) return;

    if (forms.length >= subscription.forms_limit) {
      toast({
        title: 'Limit Reached',
        description: `You've reached your plan's limit of ${subscription.forms_limit} forms. Upgrade to create more.`,
        variant: 'destructive',
      });
      return;
    }

    router.push('/dashboard/forms/new');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getUsagePercentage = () => {
    if (!subscription) return 0;
    return Math.min(
      100,
      (subscription.current_period_responses / subscription.responses_limit) * 100
    );
  };

  const getRemainingText = () => {
    if (!subscription) return '';
    const remaining = subscription.responses_limit - subscription.current_period_responses;
    if (remaining <= 0) {
      const overage = Math.abs(remaining);
      return overage > 0
        ? `${overage.toLocaleString()} over limit (grace period active)`
        : 'Limit reached';
    }
    return `${remaining.toLocaleString()} remaining this period`;
  };

  const renderUsageAlert = () => {
    if (!subscription) return null;

    const percentage = getUsagePercentage();
    const isOverLimit = subscription.current_period_responses > subscription.responses_limit;
    const isAtLimit = subscription.current_period_responses >= subscription.responses_limit;
    const isApproaching = percentage >= 80 && percentage < 100;

    const graceLimit = subscription.responses_limit * 1.1;
    const isOverGrace = subscription.current_period_responses > graceLimit;

    if (isOverGrace) {
      return (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">
            Access Restricted
          </AlertTitle>
          <AlertDescription className="text-red-800">
            You've exceeded your monthly limit and grace allowance. New form submissions are currently paused.
            Please upgrade your plan to restore access.
          </AlertDescription>
        </Alert>
      );
    }

    if (isOverLimit) {
      return (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 font-semibold">
            Monthly Limit Reached
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            You've reached your monthly conversation limit. You have a 10% grace allowance, but we recommend
            upgrading your plan to avoid service interruption.
          </AlertDescription>
        </Alert>
      );
    }

    if (isApproaching) {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">
            Approaching Monthly Limit
          </AlertTitle>
          <AlertDescription className="text-blue-800">
            You're at {Math.round(percentage)}% of your monthly conversation limit. Consider upgrading
            to avoid interruptions.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">FormFlow</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/subscription')}
              >
                <span className="font-medium">{subscription?.plan || 'Free'}</span> Plan
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {subscription && (
          <>
            {renderUsageAlert()}

            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Monthly Usage
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Current billing period
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/subscription')}
                  >
                    View Plans
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        Completed Conversations
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {subscription.current_period_responses.toLocaleString()} / {subscription.responses_limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          getUsagePercentage() >= 100
                            ? 'bg-red-600'
                            : getUsagePercentage() >= 80
                            ? 'bg-amber-600'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${getUsagePercentage()}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      {getRemainingText()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Your Forms</h2>
              <p className="text-slate-600 mt-1">
                {forms.length} of {subscription?.forms_limit || 0} forms created
              </p>
            </div>
            <Button onClick={createNewForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          </div>

          {forms.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No forms yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Create your first conversational form to get started
                  </p>
                  <Button onClick={createNewForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {form.is_published ? (
                            <span className="text-green-600">Published</span>
                          ) : (
                            <span className="text-slate-500">Draft</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{form._count?.responses || 0} conversations</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
