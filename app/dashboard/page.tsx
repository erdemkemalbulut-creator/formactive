'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthActions } from '@/components/auth-actions';
import {
  Plus,
  Users,
  MessageSquare,
  ArrowRight,
  FileText,
  BarChart3,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Form = {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'live';
  created_at: string;
  updated_at: string;
  _count?: { submissions: number };
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (formsError) throw formsError;

      const formsWithCounts = await Promise.all(
        (formsData || []).map(async (form: any) => {
          const { count } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);
          return {
            ...form,
            _count: { submissions: count || 0 },
          };
        })
      );

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

  const createNewForm = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: 'Untitled form' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create form');
      }

      const newForm = await res.json();
      router.push(`/dashboard/forms/${newForm.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create form',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const handleDeleteForm = async () => {
    if (!deleteTarget || !user) return;
    setIsDeleting(true);
    try {
      const { error: submissionsError } = await supabase
        .from('submissions')
        .delete()
        .eq('form_id', deleteTarget.id);
      if (submissionsError) throw submissionsError;

      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast({ title: 'Deleted', description: `"${deleteTarget.name}" has been removed.` });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete the form. Please try again.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900 mb-4"></div>
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalSubmissions = forms.reduce((sum, f) => sum + (f._count?.submissions || 0), 0);
  const liveCount = forms.filter(f => f.status === 'live').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-lg font-bold text-slate-900 tracking-tight hover:opacity-70 transition-opacity"
            >
              formactive
            </button>
            <AuthActions />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {forms.length === 0 ? (
          <div className="py-12">
            <div className="max-w-lg mx-auto text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Welcome to FormActive
              </h1>
              <p className="text-slate-600 leading-relaxed mb-2">
                Create forms to collect information from your users.
                Build custom forms with a visual editor and get a shareable link.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                You'll design your questions, customize the look, and start collecting submissions.
              </p>
              <Button
                size="lg"
                onClick={createNewForm}
                disabled={isCreating}
                className="bg-slate-900 hover:bg-slate-800 h-12 px-8 text-base"
              >
                {isCreating ? 'Creating...' : 'Create your first form'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Build your form</h3>
                <p className="text-xs text-slate-500">Add questions and customize the design</p>
              </div>
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Preview & publish</h3>
                <p className="text-xs text-slate-500">See a live preview and publish when ready</p>
              </div>
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Collect submissions</h3>
                <p className="text-xs text-slate-500">Share a link and review structured results here</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Forms</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {forms.length} form{forms.length !== 1 ? 's' : ''}
                  {liveCount > 0 && ` · ${liveCount} live`}
                  {totalSubmissions > 0 && ` · ${totalSubmissions} submission${totalSubmissions !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button onClick={createNewForm} disabled={isCreating} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? 'Creating...' : '+ New form'}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="hover:shadow-md transition-all cursor-pointer border-slate-200 hover:border-slate-300 relative group"
                  onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{form.name}</CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {form.status === 'live' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            Draft
                          </span>
                        )}
                        <div className="relative" ref={openMenuId === form.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === form.id ? null : form.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === form.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setDeleteTarget(form);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{form._count?.submissions || 0} submissions</span>
                      </div>
                      <span>
                        Created {new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete form</h3>
              <p className="text-sm text-slate-600 mb-1">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              </p>
              <p className="text-sm text-slate-500 mb-6">
                This will permanently remove the form and all {deleteTarget._count?.submissions || 0} submission{(deleteTarget._count?.submissions || 0) !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteForm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
