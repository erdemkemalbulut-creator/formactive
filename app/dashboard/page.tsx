'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
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
  LayoutGrid,
  Sparkles,
  Zap,
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
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin mb-4" />
          <p className="text-sm text-white/30">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalSubmissions = forms.reduce((sum, f) => sum + (f._count?.submissions || 0), 0);
  const liveCount = forms.filter(f => f.status === 'live').length;

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a1a]/70 backdrop-blur-2xl sticky top-0 z-40">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-lg font-bold tracking-tight text-gradient hover:opacity-80 transition-opacity"
            >
              formactive
            </button>
            <AuthActions />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-5xl">
        {forms.length === 0 ? (
          /* ── Empty state ─────────────────────── */
          <div className="py-16">
            <div className="max-w-lg mx-auto text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                Welcome to <span className="text-gradient">Formactive</span>
              </h1>
              <p className="text-white/40 leading-relaxed mb-2">
                Create AI-powered conversational forms that collect better data.
              </p>
              <p className="text-sm text-white/25 mb-10">
                Design your questions, customize the look, and start collecting.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={createNewForm}
                  disabled={isCreating}
                  className="inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-lg hover:shadow-indigo-500/25 gap-2 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create from scratch'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/templates')}
                  className="inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white/60 glass-dark rounded-full hover:text-white/80 transition-all gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Browse templates
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
              {[
                { icon: FileText, title: 'Build your form', desc: 'Add questions and customize design' },
                { icon: Zap, title: 'AI generates it', desc: 'Or let AI build it from a description' },
                { icon: BarChart3, title: 'Collect & analyze', desc: 'Share a link and review results' },
              ].map((item, i) => (
                <div key={i} className="text-center p-5 rounded-2xl glass-dark">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5 text-white/30" />
                  </div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">{item.title}</h3>
                  <p className="text-xs text-white/30">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Forms list ──────────────────────── */
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
                <p className="text-sm text-white/30 mt-1">
                  {forms.length} form{forms.length !== 1 ? 's' : ''}
                  {liveCount > 0 && ` \u00b7 ${liveCount} live`}
                  {totalSubmissions > 0 && ` \u00b7 ${totalSubmissions} submission${totalSubmissions !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/dashboard/templates')}
                  className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium text-white/50 glass-dark rounded-full hover:text-white/80 transition-all gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Templates
                </button>
                <button
                  onClick={createNewForm}
                  disabled={isCreating}
                  className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-lg hover:shadow-indigo-500/25 gap-2 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreating ? 'Creating...' : 'New form'}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="group p-5 rounded-2xl glass-dark hover:bg-white/[0.08] transition-all duration-200 cursor-pointer relative"
                  onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-white/80 leading-snug">{form.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {form.status === 'live' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/30 border border-white/10">
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
                          className="p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === form.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 glass-dark rounded-xl py-1 z-20 shadow-xl">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setDeleteTarget(form);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/25">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{form._count?.submissions || 0} submissions</span>
                    </div>
                    <span>
                      {new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Delete modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <div className="relative glass-dark rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Delete form</h3>
              <p className="text-sm text-white/50 mb-1">
                Are you sure you want to delete <strong className="text-white/70">{deleteTarget.name}</strong>?
              </p>
              <p className="text-sm text-white/30 mb-6">
                This will permanently remove the form and all {deleteTarget._count?.submissions || 0} submission{(deleteTarget._count?.submissions || 0) !== 1 ? 's' : ''}.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="h-9 px-4 text-sm font-medium text-white/50 glass-dark rounded-lg hover:text-white/70 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteForm}
                  disabled={isDeleting}
                  className="h-9 px-4 text-sm font-medium text-white bg-red-500 hover:bg-red-400 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
