'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType, StepVisual } from '@/lib/types';
import { ConversationalForm } from '@/components/conversational-form';
import { CrossDissolveBackground, VisualLayer } from '@/components/cross-dissolve-background';
import { trackEvent, markStart, getElapsedMs } from '@/lib/analytics';

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
      videoUrl: q.videoUrl,
      internalName: q.internalName,
      visual: q.visual,
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
  const [currentPhase, setCurrentPhase] = useState<'welcome' | 'questions' | 'submitting' | 'done'>('welcome');
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const viewTracked = useRef(false);

  useEffect(() => {
    loadForm();
  }, [slug]);

  useEffect(() => {
    if (form && !viewTracked.current) {
      viewTracked.current = true;
      markStart();
      trackEvent(form.id, { event_type: 'form_view' });
    }
  }, [form]);

  const handlePhaseChange = useCallback((phase: 'welcome' | 'questions' | 'submitting' | 'done') => {
    setCurrentPhase(phase);
    if (!form) return;

    if (phase === 'questions') {
      markStart();
      trackEvent(form.id, { event_type: 'form_start' });
    }
    if (phase === 'done') {
      trackEvent(form.id, {
        event_type: 'form_complete',
        duration_ms: getElapsedMs(),
      });
    }
  }, [form]);

  const handleStepChange = useCallback((stepIndex: number) => {
    setCurrentStepIdx(stepIndex);
    if (!form) return;
    const sorted = [...form.published_config.questions].sort((a, b) => a.order - b.order);
    const q = sorted[stepIndex];
    if (q) {
      trackEvent(form.id, {
        event_type: 'step_reached',
        step_id: q.id,
        step_type: q.type,
        step_index: stepIndex,
      });
    }
  }, [form]);

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

  const handleSubmit = useCallback(async (answers: Record<string, any>) => {
    if (!form) return;

    const res = await fetch(`/api/forms/${form.id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) throw new Error('Submission failed');

    trackEvent(form.id, {
      event_type: 'form_submit',
      duration_ms: getElapsedMs(),
    });
  }, [form]);

  const theme = form?.published_config?.theme;
  const globalVisuals = form?.published_config?.visuals;
  const fontFamily = FONT_MAP[theme?.fontFamily || 'Inter'] || FONT_MAP['Inter'];

  const DEFAULT_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const sortedQuestions = useMemo(() => {
    if (!form) return [];
    return [...form.published_config.questions].sort((a, b) => a.order - b.order);
  }, [form]);

  const activeVisualLayer: VisualLayer | null = useMemo(() => {
    if (!form) return null;
    const resolve = (): StepVisual | null => {
      if (currentPhase === 'welcome' && form.published_config.welcomeVisual) {
        const wv = form.published_config.welcomeVisual;
        if (wv.kind && wv.kind !== 'none' && wv.url?.trim()) return wv;
      }
      if (currentPhase === 'done' && form.published_config.endVisual) {
        const ev = form.published_config.endVisual;
        if (ev.kind && ev.kind !== 'none' && ev.url?.trim()) return ev;
      }
      if (currentPhase === 'questions' && sortedQuestions[currentStepIdx]?.visual) {
        const sv = sortedQuestions[currentStepIdx].visual!;
        if (sv.kind && sv.kind !== 'none' && sv.url?.trim()) return sv;
      }
      if (globalVisuals?.kind && globalVisuals.kind !== 'none' && globalVisuals?.url?.trim()) {
        return { kind: globalVisuals.kind as 'image' | 'video', url: globalVisuals.url, source: globalVisuals.source || 'url', layout: 'fill', opacity: 100 };
      }
      return null;
    };
    const sv = resolve();
    if (!sv) return null;
    return { kind: sv.kind as 'image' | 'video', url: sv.url, opacity: sv.opacity, layout: sv.layout };
  }, [currentPhase, currentStepIdx, form, globalVisuals, sortedQuestions]);

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

  return (
    <div className="min-h-screen relative" style={{ fontFamily }}>
      <div className="fixed inset-0">
        <CrossDissolveBackground
          visual={activeVisualLayer}
          defaultGradient={DEFAULT_GRADIENT}
          duration={500}
          overlayClass="bg-black/40"
        />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <ConversationalForm
          config={form.published_config}
          formName={form.name}
          onSubmit={handleSubmit}
          onPhaseChange={handlePhaseChange}
          onStepChange={handleStepChange}
        />
      </div>
    </div>
  );
}
