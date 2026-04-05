'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FORM_TEMPLATES, TEMPLATE_CATEGORIES, FormTemplate } from '@/lib/templates';
import { AuthActions } from '@/components/auth-actions';
import { Button } from '@/components/ui/button';
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
  Users,
  MessageSquare,
  Briefcase,
  Calendar,
  TrendingUp,
  Mail,
  HelpCircle,
  LifeBuoy,
  FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  'lead-gen': 'bg-blue-50 text-blue-600 border-blue-200',
  'feedback': 'bg-green-50 text-green-600 border-green-200',
  'survey': 'bg-cyan-50 text-cyan-600 border-cyan-200',
  'application': 'bg-purple-50 text-purple-600 border-purple-200',
  'event': 'bg-red-50 text-red-600 border-red-200',
  'quiz': 'bg-amber-50 text-amber-600 border-amber-200',
  'support': 'bg-indigo-50 text-indigo-600 border-indigo-200',
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
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Start with a template and customize it to your needs
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedCategory
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Blank form card */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Blank form</h3>
            <p className="text-sm text-slate-500">Start from scratch or use AI to generate questions</p>
          </button>

          {/* Template cards */}
          {filteredTemplates.map(template => {
            const Icon = ICON_MAP[template.icon] || FileText;
            const categoryLabel = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || '';
            const colorClass = CATEGORY_COLORS[template.category] || 'bg-slate-50 text-slate-600 border-slate-200';
            const questionCount = template.config.questions.length;

            return (
              <div
                key={template.id}
                className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClass}`}>
                    {categoryLabel}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{questionCount} questions</span>
                  <Button
                    size="sm"
                    onClick={() => createFromTemplate(template)}
                    disabled={creating === template.id}
                    className="bg-slate-900 hover:bg-slate-800 text-xs h-8 px-3"
                  >
                    {creating === template.id ? 'Creating...' : 'Use template'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
