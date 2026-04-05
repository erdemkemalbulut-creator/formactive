'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FORM_TEMPLATES, TEMPLATE_CATEGORIES, FormTemplate } from '@/lib/templates';
import { AuthActions } from '@/components/auth-actions';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, MessageSquare, Briefcase, Calendar, TrendingUp, Mail, HelpCircle, LifeBuoy, FileText, Sparkles } from 'lucide-react';

const ICON_MAP: Record<string, any> = { Users, MessageSquare, Briefcase, Calendar, TrendingUp, Mail, HelpCircle, LifeBuoy, FileText };

export default function TemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const filtered = selectedCategory ? FORM_TEMPLATES.filter(t => t.category === selectedCategory) : FORM_TEMPLATES;

  const createFromTemplate = async (template: FormTemplate) => {
    if (!user || creating) return;
    setCreating(template.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ name: template.name, template_id: template.id }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const newForm = await res.json();
      toast({ title: 'Form created', description: `"${template.name}" is ready.` });
      router.push(`/dashboard/forms/${newForm.id}`);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); setCreating(null); }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-bold tracking-tight text-[#111111] hover:opacity-70 transition-opacity">formactive</button>
          <AuthActions />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#7C3AED]/20 hover:shadow-soft transition-all">
            <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#111111]">Templates</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Start with a template and customize</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-7">
          <button onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedCategory ? 'bg-[#111111] text-white' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#7C3AED]/20'}`}>
            All
          </button>
          {TEMPLATE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setSelectedCategory(selectedCategory === c.value ? null : c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === c.value ? 'bg-[#111111] text-white' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#7C3AED]/20'}`}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="group p-6 rounded-2xl border-2 border-dashed border-[#E5E7EB] hover:border-[#7C3AED]/25 bg-white hover:shadow-soft transition-all text-left">
            <Sparkles className="w-5 h-5 text-[#6B7280]/30 mb-3" />
            <h3 className="text-sm font-semibold text-[#111111] mb-1">Blank form</h3>
            <p className="text-xs text-[#6B7280]">Start from scratch or use AI</p>
          </button>

          {filtered.map(t => {
            const Icon = ICON_MAP[t.icon] || FileText;
            const cat = TEMPLATE_CATEGORIES.find(c => c.value === t.category)?.label || '';
            return (
              <div key={t.id} className="group p-6 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#7C3AED]/20 hover:shadow-soft-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/8 group-hover:bg-[#7C3AED]/12 flex items-center justify-center transition-colors">
                    <Icon className="w-4.5 h-4.5 text-[#7C3AED]" />
                  </div>
                  <span className="text-[10px] font-medium text-[#6B7280]/60 bg-[#FAFAFB] border border-[#E5E7EB] px-2 py-0.5 rounded-full">{cat}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#111111] mb-1">{t.name}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{t.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280]/40">{t.config.questions.length} questions</span>
                  <button onClick={() => createFromTemplate(t)} disabled={creating === t.id}
                    className="h-8 px-3.5 text-xs font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-lg shadow-soft transition-all disabled:opacity-50">
                    {creating === t.id ? 'Creating...' : 'Use template'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
