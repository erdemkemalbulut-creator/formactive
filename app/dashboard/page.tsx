'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Users, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Form = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  created_at: string;
  _count?: { responses: number };
};

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
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
      const [formsResult, responsesResult] = await Promise.all([
        supabase
          .from('forms')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase.from('responses').select('form_id'),
      ]);

      if (formsResult.error) throw formsResult.error;

      const responseCounts = (responsesResult.data || []).reduce((acc: any, r: any) => {
        acc[r.form_id] = (acc[r.form_id] || 0) + 1;
        return acc;
      }, {});

      const formsWithCounts = (formsResult.data || []).map((form) => ({
        ...form,
        _count: { responses: responseCounts[form.id] || 0 },
      }));

      setForms(formsWithCounts);
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
    router.push('/dashboard/forms/new');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
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
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Your Forms</h2>
              <p className="text-slate-600 mt-1">
                {forms.length} form{forms.length !== 1 ? 's' : ''} created
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
