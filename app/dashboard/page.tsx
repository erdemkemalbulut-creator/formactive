'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { AuthActions } from '@/components/auth-actions';
import { Plus, Users, ArrowRight, FileText, BarChart3, MoreVertical, Trash2, LayoutGrid, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Form = { id: string; name: string; slug: string; status: 'draft' | 'live'; created_at: string; updated_at: string; _count?: { submissions: number } };

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

  useEffect(() => { if (!loading && !user) router.push('/'); }, [user, loading, router]);
  useEffect(() => { if (user) loadDashboardData(); }, [user]);

  const loadDashboardData = async () => {
    try {
      const { data: formsData, error } = await supabase.from('forms').select('*').eq('user_id', user?.id).order('updated_at', { ascending: false });
      if (error) throw error;
      const formsWithCounts = await Promise.all(
        (formsData || []).map(async (form: any) => {
          const { count } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('form_id', form.id);
          return { ...form, _count: { submissions: count || 0 } };
        })
      );
      setForms(formsWithCounts);
    } catch { toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' }); }
    finally { setLoadingData(false); }
  };

  const createNewForm = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ name: 'Untitled form' }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const newForm = await res.json();
      router.push(`/dashboard/forms/${newForm.id}`);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); setIsCreating(false); }
  };

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const handleDeleteForm = async () => {
    if (!deleteTarget || !user) return;
    setIsDeleting(true);
    try {
      await supabase.from('submissions').delete().eq('form_id', deleteTarget.id);
      const { error } = await supabase.from('forms').delete().eq('id', deleteTarget.id).eq('user_id', user.id);
      if (error) throw error;
      setForms(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast({ title: 'Deleted', description: `"${deleteTarget.name}" has been removed.` });
    } catch { toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' }); }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  };

  if (loading || loadingData) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#7C3AED] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">Loading...</p>
      </div>
    </div>
  );

  const totalSubmissions = forms.reduce((s, f) => s + (f._count?.submissions || 0), 0);
  const liveCount = forms.filter(f => f.status === 'live').length;

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-bold tracking-tight text-[#111111] hover:opacity-70 transition-opacity">formactive</button>
          <AuthActions />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {forms.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/8 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-[#7C3AED]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#111111] mb-2">Welcome to Formactive</h1>
            <p className="text-[#6B7280] mb-8 max-w-sm mx-auto">Create AI-powered conversational forms that collect better data.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={createNewForm} disabled={isCreating}
                className="inline-flex items-center h-11 px-6 text-sm font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-xl shadow-soft hover:shadow-soft-md transition-all gap-2 disabled:opacity-50">
                {isCreating ? 'Creating...' : 'Create from scratch'} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => router.push('/dashboard/templates')}
                className="inline-flex items-center h-11 px-6 text-sm font-medium text-[#6B7280] bg-white border border-[#E5E7EB] hover:border-[#7C3AED]/20 rounded-xl hover:shadow-soft transition-all gap-2">
                <LayoutGrid className="w-4 h-4" /> Browse templates
              </button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-14">
              {[
                { icon: FileText, title: 'Build', desc: 'Add questions & customize' },
                { icon: Zap, title: 'Generate', desc: 'AI builds from a description' },
                { icon: BarChart3, title: 'Analyze', desc: 'Track results & export' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 rounded-2xl bg-white border border-[#E5E7EB]">
                  <item.icon className="w-5 h-5 text-[#6B7280]/40 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-[#111111] mb-0.5">{item.title}</h3>
                  <p className="text-xs text-[#6B7280]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="text-xl font-semibold text-[#111111]">Forms</h1>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  {forms.length} form{forms.length !== 1 ? 's' : ''}
                  {liveCount > 0 && ` \u00b7 ${liveCount} live`}
                  {totalSubmissions > 0 && ` \u00b7 ${totalSubmissions} submission${totalSubmissions !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/dashboard/templates')}
                  className="inline-flex items-center h-9 px-3.5 text-sm text-[#6B7280] bg-white border border-[#E5E7EB] hover:border-[#7C3AED]/20 rounded-xl hover:shadow-soft transition-all gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" /> Templates
                </button>
                <button onClick={createNewForm} disabled={isCreating}
                  className="inline-flex items-center h-9 px-3.5 text-sm font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-xl shadow-soft hover:shadow-soft-md transition-all gap-1.5 disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" /> {isCreating ? 'Creating...' : 'New form'}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {forms.map(form => (
                <div key={form.id} onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                  className="group p-5 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#7C3AED]/20 hover:shadow-soft-md transition-all duration-200 cursor-pointer relative">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[#111111] leading-snug">{form.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {form.status === 'live' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAFAFB] text-[#6B7280] border border-[#E5E7EB]">Draft</span>
                      )}
                      <div className="relative" ref={openMenuId === form.id ? menuRef : undefined}>
                        <button type="button" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === form.id ? null : form.id); }}
                          className="p-1 rounded-lg text-[#6B7280]/30 hover:text-[#6B7280] hover:bg-[#FAFAFB] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === form.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#E5E7EB] rounded-xl shadow-soft-lg py-1 z-20">
                            <button type="button" onClick={e => { e.stopPropagation(); setOpenMenuId(null); setDeleteTarget(form); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#6B7280]/60">
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {form._count?.submissions || 0}</div>
                    <span>{new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <div className="relative bg-white rounded-2xl border border-[#E5E7EB] shadow-soft-lg max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-[#111111] mb-2">Delete form</h3>
              <p className="text-sm text-[#6B7280] mb-5">
                Delete <strong className="text-[#111111]">{deleteTarget.name}</strong> and all {deleteTarget._count?.submissions || 0} submissions? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                  className="h-9 px-4 text-sm text-[#6B7280] bg-[#FAFAFB] border border-[#E5E7EB] rounded-xl hover:bg-[#F0F0F2] transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleDeleteForm} disabled={isDeleting}
                  className="h-9 px-4 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
