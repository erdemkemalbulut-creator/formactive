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
  Globe,
  MoreVertical,
  Trash2,
} from 'lucide-react';
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

      const formsWithCounts = (formsResult.data || []).map((form: any) => ({
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
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .eq('form_id', deleteTarget.id);
      if (responsesError) throw responsesError;

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

  const totalResponses = forms.reduce((sum, f) => sum + (f._count?.responses || 0), 0);
  const publishedCount = forms.filter(f => f.is_published).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-700" />
              <span className="text-lg font-semibold text-slate-900">FormActive</span>
            </div>
            <AuthActions />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {forms.length === 0 ? (
          <div className="py-12">
            <div className="max-w-lg mx-auto text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Welcome to FormActive
              </h1>
              <p className="text-slate-600 leading-relaxed mb-2">
                Create a guided conversation to collect information from your guests.
                Instead of a long form, they'll have a natural back-and-forth that feels personal.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                You'll choose a starting point, customize the questions, and get a shareable link.
              </p>
              <Button
                size="lg"
                onClick={createNewForm}
                className="bg-slate-900 hover:bg-slate-800 h-12 px-8 text-base"
              >
                Create your first conversation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Pick a starting point</h3>
                <p className="text-xs text-slate-500">Choose from travel, group, or premium templates</p>
              </div>
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Customize questions</h3>
                <p className="text-xs text-slate-500">Set the tone and see a live preview as you build</p>
              </div>
              <div className="text-center p-5 rounded-lg bg-white border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Collect responses</h3>
                <p className="text-xs text-slate-500">Share a link and review structured results here</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Your conversations</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {forms.length} conversation{forms.length !== 1 ? 's' : ''}
                  {publishedCount > 0 && ` · ${publishedCount} published`}
                  {totalResponses > 0 && ` · ${totalResponses} response${totalResponses !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button onClick={createNewForm} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                New conversation
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
                        {form.is_published ? (
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
                        <span>{form._count?.responses || 0} responses</span>
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
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete conversation</h3>
              <p className="text-sm text-slate-600 mb-1">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              </p>
              <p className="text-sm text-slate-500 mb-6">
                This will permanently remove the form and all {deleteTarget._count?.responses || 0} response{(deleteTarget._count?.responses || 0) !== 1 ? 's' : ''}. This action cannot be undone.
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
