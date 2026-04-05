'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FORM_TEMPLATES, TEMPLATE_CATEGORIES, FormTemplate } from '@/lib/templates';
import { AuthActions } from '@/components/auth-actions';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Briefcase,
  Calendar,
  TrendingUp,
  Mail,
  HelpCircle,
  LifeBuoy,
  FileText,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Users, MessageSquare, Briefcase, Calendar, TrendingUp, Mail, HelpCircle, LifeBuoy, FileText,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  'lead-gen': 'from-blue-500 to-indigo-500',
  'feedback': 'from-emerald-500 to-teal-500',
  'survey': 'from-cyan-500 to-blue-500',
  'application': 'from-violet-500 to-purple-500',
  'event': 'from-rose-500 to-pink-500',
  'quiz': 'from-amber-500 to-orange-500',
  'support': 'from-indigo-500 to-violet-500',
};

export default function TemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? FORM_TEMPLATES.filter(t => t.category === selectedCategory)
    : FORM_TEMPLATES;

  const createFromTemplate = async (template: FormTemplate) => {
    if (!user || creating) return;
    setCreating(template.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: template.name,
          template_id: template.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create form');
      }

      const newForm = await res.json();
      toast({
        title: 'Form created',
        description: `"${template.name}" is ready to customize.`,
      });
      router.push(`/dashboard/forms/${newForm.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create form',
        variant: 'destructive',
      });
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
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
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl glass-dark hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="text-sm text-white/30 mt-0.5">
              Start with a template and customize it
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedCategory
                ? 'bg-indigo-500 text-white'
                : 'glass-dark text-white/40 hover:text-white/60'
            }`}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-indigo-500 text-white'
                  : 'glass-dark text-white/40 hover:text-white/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Blank form */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 bg-transparent hover:bg-white/[0.03] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-white/30" />
            </div>
            <h3 className="text-base font-semibold text-white/70 mb-1">Blank form</h3>
            <p className="text-sm text-white/30">Start from scratch or use AI to generate</p>
          </button>

          {/* Template cards */}
          {filteredTemplates.map(template => {
            const Icon = ICON_MAP[template.icon] || FileText;
            const categoryLabel = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || '';
            const gradient = CATEGORY_GRADIENTS[template.category] || 'from-indigo-500 to-purple-500';
            const questionCount = template.config.questions.length;

            return (
              <div
                key={template.id}
                className="group p-6 rounded-2xl glass-dark hover:bg-white/[0.08] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/30 border border-white/10">
                    {categoryLabel}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white/80 mb-1">{template.name}</h3>
                <p className="text-xs text-white/30 leading-relaxed mb-4">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/20">{questionCount} questions</span>
                  <button
                    onClick={() => createFromTemplate(template)}
                    disabled={creating === template.id}
                    className="h-8 px-4 text-xs font-medium text-white bg-indigo-500/80 hover:bg-indigo-500 rounded-full transition-all disabled:opacity-50"
                  >
                    {creating === template.id ? 'Creating...' : 'Use template'}
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
