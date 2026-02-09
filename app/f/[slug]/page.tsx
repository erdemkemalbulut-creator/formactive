'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType } from '@/lib/types';
import { ConversationalForm } from '@/components/conversational-form';

interface FormData {
  id: string;
  name: string;
  published_config: FormConfig;
}

function normalizePublishedConfig(config: any): FormConfig {
  const legacyTypeMap: Record<string, QuestionType> = {
    dropdown: 'single_choice',
    multi_select: 'multiple_choice',
    checkbox: 'yes_no',
    consent: 'yes_no',
    rating: 'number',
    file_upload: 'short_text',
    time: 'short_text',
  };

  const questions = (config.questions || []).map((q: any, i: number) => {
    const rawType = q.type || q.ui_type || 'short_text';
    const type: QuestionType = legacyTypeMap[rawType] || rawType;

    let options = q.options || [];
    if (Array.isArray(options)) {
      options = options.map((opt: any, j: number) => {
        if (typeof opt === 'string') {
          return { id: `o_${j}`, label: opt, value: opt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') };
        }
        return { id: opt.id || `o_${j}`, label: opt.label || String(opt), value: opt.value || String(opt) };
      });
    }

    return {
      id: q.id || `q_${i}`,
      key: q.key || q.field_key || `q_${i}`,
      type,
      label: q.label || q.intent || '',
      message: q.message || q.user_prompt || '',
      required: Boolean(q.required),
      options,
      order: q.order ?? i,
      cta: q.cta,
    };
  });

  const visuals = config.visuals;
  let normalizedVisuals = visuals;
  if (visuals && !visuals.kind && visuals.type) {
    normalizedVisuals = {
      kind: visuals.type,
      url: visuals.url,
      source: 'url',
    };
  }

  return {
    ...config,
    questions,
    visuals: normalizedVisuals,
    endEnabled: config.endEnabled ?? true,
    endCtaText: config.endCtaText || '',
    endCtaUrl: config.endCtaUrl || '',
    aboutYou: config.aboutYou || '',
    trainAI: config.trainAI || '',
  };
}

const FONT_MAP: Record<string, string> = {
  'Inter': "'Inter', system-ui, sans-serif",
  'System': "system-ui, -apple-system, sans-serif",
  'Serif': "'Georgia', 'Times New Roman', serif",
};

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, name, published_config')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !data || !data.published_config) {
        setNotFound(true);
        return;
      }

      setForm({
        ...data,
        published_config: normalizePublishedConfig(data.published_config),
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (answers: Record<string, any>) => {
    if (!form) return;

    const res = await fetch(`/api/forms/${form.id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) throw new Error('Submission failed');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form not found</h2>
          <p className="text-gray-500">This form doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const theme = form.published_config.theme;
  const visuals = form.published_config.visuals;
  const hasVisual = visuals?.kind && visuals.kind !== 'none' && visuals?.url?.trim();
  const isVideo = visuals?.kind === 'video';
  const cardStyle = theme?.cardStyle || 'light';
  const isDark = cardStyle === 'dark';
  const fontFamily = FONT_MAP[theme?.fontFamily || 'Inter'] || FONT_MAP['Inter'];

  const cardBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';

  const DEFAULT_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  if (hasVisual) {
    return (
      <div className="min-h-screen relative" style={{ fontFamily }}>
        {isVideo ? (
          <video
            src={visuals!.url}
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="fixed inset-0 w-full h-full"
            style={{ backgroundImage: `url(${visuals!.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        )}
        <div className="fixed inset-0 bg-black/30" />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '90vh', backgroundColor: cardBg }}
          >
            <ConversationalForm
              config={form.published_config}
              formName={form.name}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: DEFAULT_GRADIENT, fontFamily }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', backgroundColor: cardBg }}
      >
        <ConversationalForm
          config={form.published_config}
          formName={form.name}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
