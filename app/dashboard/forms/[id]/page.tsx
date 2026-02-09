'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType, QUESTION_TYPES, ToneType, createDefaultCTA, FormTheme, DEFAULT_THEME, AIContext, FormVisuals } from '@/lib/types';
import { ConversationalForm, PreviewTarget } from '@/components/conversational-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  BarChart3,
  Sparkles,
  Loader2,
  Share2,
  Image,
  Video,
  Send,
  Upload,
  X,
  Link,
  RefreshCw,
  Check,
  Settings,
  Youtube,
} from 'lucide-react';

function generateKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
    .slice(0, 40);
}

function makeDefaultConfig(): FormConfig {
  return {
    questions: [],
    welcomeEnabled: true,
    welcomeTitle: '',
    welcomeMessage: '',
    welcomeCta: 'Start',
    endEnabled: true,
    endMessage: 'Thank you for your submission!',
    endCtaText: '',
    endCtaUrl: '',
    endRedirectEnabled: false,
    endRedirectUrl: '',
    theme: { buttonStyle: 'rounded', spacing: 'normal' },
  };
}

const TONE_OPTIONS: { value: ToneType; label: string; description: string }[] = [
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate' },
  { value: 'luxury', label: 'Luxury', description: 'Refined and elegant' },
  { value: 'playful', label: 'Playful', description: 'Fun and casual' },
];

const CONTEXT_MAX_CHARS = 2000;

export default function FormBuilderPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loadingForm, setLoadingForm] = useState(true);
  const [formName, setFormName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [status, setStatus] = useState<'draft' | 'live'>('draft');
  const [slug, setSlug] = useState('');
  const [version, setVersion] = useState(0);
  const [currentConfig, setCurrentConfig] = useState<FormConfig>(makeDefaultConfig());
  const [publishedConfig, setPublishedConfig] = useState<FormConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatingConversation, setGeneratingConversation] = useState(false);
  const [generatingWording, setGeneratingWording] = useState<string | null>(null);
  const [generatingAllWording, setGeneratingAllWording] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>(null);
  const [settingsStepId, setSettingsStepId] = useState<string | null>(null);
  const [uploadingVisual, setUploadingVisual] = useState(false);
  const [showVisualUrlInput, setShowVisualUrlInput] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'analytics'>('editor');
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));

  const toggleSection = (num: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  const isDirty = publishedConfig !== null &&
    JSON.stringify(currentConfig) !== JSON.stringify(publishedConfig);

  const getStatusDisplay = () => {
    if (status === 'draft') return { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (status === 'live' && !isDirty) return { label: 'Live', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: 'Edited', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const getCTALabel = () => {
    if (status === 'draft') return 'Publish';
    if (isDirty) return 'Republish';
    return 'Published';
  };

  const isCTADisabled = () => {
    if (publishing) return true;
    if (status === 'live' && !isDirty) return true;
    return false;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && formId) {
      loadForm();
    }
  }, [user, formId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    };
  };

  const normalizeQuestion = (q: any): Question => {
    const legacyTypeMap: Record<string, QuestionType> = {
      dropdown: 'single_choice',
      multi_select: 'multiple_choice',
      checkbox: 'yes_no',
      consent: 'yes_no',
      rating: 'number',
      time: 'short_text',
    };
    const rawType = q.type || q.ui_type || 'short_text';
    const type: QuestionType = legacyTypeMap[rawType] || rawType;
    const message = q.message || q.user_prompt || '';
    const label = q.label || q.intent || '';

    let options = q.options || [];
    if (Array.isArray(options)) {
      options = options.map((opt: any, j: number) => {
        if (typeof opt === 'string') {
          return { id: `o_${Date.now()}_${j}`, label: opt, value: opt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') };
        }
        return { id: opt.id || `o_${Date.now()}_${j}`, label: opt.label || String(opt), value: opt.value || String(opt) };
      });
    }

    return {
      id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: q.key || q.field_key || '',
      type,
      label,
      message,
      required: Boolean(q.required),
      options,
      order: q.order ?? 0,
      cta: q.cta,
      videoUrl: q.videoUrl,
      internalName: q.internalName,
    };
  };

  const normalizeConfig = (config: FormConfig): FormConfig => {
    let visuals = config.visuals;
    if (visuals && !(visuals as any).kind && (visuals as any).type) {
      visuals = {
        kind: (visuals as any).type,
        url: (visuals as any).url,
        source: 'url',
      };
    }

    const normalized = {
      ...config,
      visuals,
      aiContext: config.aiContext || { context: '', tone: 'friendly' as ToneType, audience: '' },
      endEnabled: config.endEnabled ?? true,
      endCtaText: config.endCtaText || '',
      endCtaUrl: config.endCtaUrl || '',
      aboutYou: config.aboutYou || '',
      trainAI: config.trainAI || '',
    };
    if (normalized.questions) {
      normalized.questions = normalized.questions.map(normalizeQuestion);
    }
    return normalized;
  };

  const loadForm = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/forms/${formId}`, { headers });
      if (!res.ok) throw new Error('Failed to load form');
      const form = await res.json();

      setFormName(form.name || '');
      setStatus(form.status || 'draft');
      setSlug(form.slug || '');
      setVersion(form.version || 0);
      setCurrentConfig(normalizeConfig(form.current_config || makeDefaultConfig()));
      setPublishedConfig(form.published_config || null);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load form', variant: 'destructive' });
      router.push('/dashboard');
    } finally {
      setLoadingForm(false);
    }
  };

  const saveForm = useCallback(async (name: string, config: FormConfig) => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name, current_config: config }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [formId]);

  const triggerAutosave = useCallback((name: string, config: FormConfig) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveForm(name, config);
    }, 1500);
  }, [saveForm]);

  const updateConfig = (updates: Partial<FormConfig>) => {
    const newConfig = { ...currentConfig, ...updates };
    setCurrentConfig(newConfig);
    triggerAutosave(formName, newConfig);
  };

  const updateFormName = (name: string) => {
    setFormName(name);
    triggerAutosave(name, currentConfig);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    const newQuestions = currentConfig.questions.map((q) =>
      q.id === questionId ? { ...q, ...updates } : q
    );
    updateConfig({ questions: newQuestions });
  };

  const updateAIContext = (updates: Partial<AIContext>) => {
    const current = currentConfig.aiContext || { context: '', tone: 'friendly' as ToneType, audience: '' };
    updateConfig({ aiContext: { ...current, ...updates } });
  };

  const updateTheme = (updates: Partial<FormTheme>) => {
    const current = currentConfig.theme || {};
    updateConfig({ theme: { ...current, ...updates } });
  };

  const handleVisualUpload = async (file: File, kind: 'image' | 'video') => {
    setUploadingVisual(true);
    try {
      const headers = await getAuthHeaders();
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('kind', kind);

      const res = await fetch(`/api/forms/${formId}/visual`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formDataObj,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      updateConfig({
        visuals: {
          kind: data.kind,
          source: 'upload',
          url: data.url,
          storagePath: data.storagePath,
          updatedAt: new Date().toISOString(),
        },
      });
      toast({ title: 'Uploaded', description: 'Visual background updated' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingVisual(false);
    }
  };

  const clearVisual = () => {
    updateConfig({ visuals: { kind: 'none' } });
    setShowVisualUrlInput(false);
  };

  const addJourneyItem = () => {
    const order = currentConfig.questions.length;
    const q: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: '',
      type: 'short_text',
      label: '',
      message: '',
      required: true,
      options: [],
      order,
    };
    updateConfig({ questions: [...currentConfig.questions, q] });
  };

  const duplicateJourneyItem = (questionId: string) => {
    const original = currentConfig.questions.find((q) => q.id === questionId);
    if (!original) return;
    const dup: Question = {
      ...original,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: original.key ? `${original.key}_copy` : '',
      order: currentConfig.questions.length,
      message: '',
    };
    updateConfig({ questions: [...currentConfig.questions, dup] });
  };

  const generateWordingForQuestion = async (questionId: string) => {
    const question = currentConfig.questions.find(q => q.id === questionId);
    if (!question || !question.label) return;

    const aiCtx = currentConfig.aiContext;
    setGeneratingWording(questionId);
    try {
      const journeyItems = currentConfig.questions.map(q => ({ label: q.label, type: q.type }));
      const res = await fetch('/api/ai/generate-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiCtx?.context || '',
          tone: aiCtx?.tone || 'friendly',
          journeyItems,
          currentItem: { label: question.label, type: question.type },
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      updateQuestion(questionId, { message: data.message });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate wording', variant: 'destructive' });
    } finally {
      setGeneratingWording(null);
    }
  };

  const deleteJourneyItem = (questionId: string) => {
    if (settingsStepId === questionId) setSettingsStepId(null);
    const newQuestions = currentConfig.questions
      .filter((q) => q.id !== questionId)
      .map((q, i) => ({ ...q, order: i }));
    updateConfig({ questions: newQuestions });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const questions = [...currentConfig.questions];
      const [removed] = questions.splice(dragIndex, 1);
      questions.splice(dragOverIndex, 0, removed);
      const reordered = questions.map((q, i) => ({ ...q, order: i }));
      updateConfig({ questions: reordered });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const generateFullConversation = async () => {
    const aiCtx = currentConfig.aiContext;
    if (!aiCtx?.context?.trim()) {
      toast({ title: 'Missing context', description: 'Please describe your situation first.', variant: 'destructive' });
      return;
    }

    const hasExisting = currentConfig.questions.length > 0;
    if (hasExisting && !confirm('This will replace your existing questions with a new AI-generated conversation. Continue?')) {
      return;
    }

    setGeneratingConversation(true);
    try {
      const res = await fetch('/api/ai/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: aiCtx.context,
          tone: aiCtx.tone || 'friendly',
          audience: aiCtx.audience || '',
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions were generated');
      }

      const newQuestions: Question[] = data.questions.map((item: any, i: number) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`,
        key: generateKeyFromLabel(item.label || `question_${i}`),
        type: item.type as QuestionType,
        label: item.label,
        message: '',
        required: item.required ?? true,
        options: Array.isArray(item.options)
          ? item.options.map((opt: string, j: number) => ({
              id: `o_${Date.now()}_${j}`,
              label: opt,
              value: opt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''),
            }))
          : [],
        order: i,
      }));

      updateConfig({ questions: newQuestions });
      toast({
        title: 'Conversation generated!',
        description: `${newQuestions.length} questions created. Generating conversational wording...`,
      });

      await generateAllWording(newQuestions);
      toast({
        title: 'All done!',
        description: 'Questions and conversational wording are ready.',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate conversation', variant: 'destructive' });
    } finally {
      setGeneratingConversation(false);
    }
  };

  const generateAllWording = async (questions: Question[]) => {
    const aiCtx = currentConfig.aiContext;
    setGeneratingAllWording(true);
    try {
      const journeyItems = questions.map(q => ({ label: q.label, type: q.type }));
      const updatedQuestions = [...questions];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.type === 'cta') continue;

        try {
          const res = await fetch('/api/ai/generate-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: aiCtx?.context || '',
              tone: aiCtx?.tone || 'friendly',
              journeyItems,
              currentItem: { label: q.label, type: q.type },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            updatedQuestions[i] = { ...updatedQuestions[i], message: data.message };
          }
        } catch {}
      }

      updateConfig({ questions: updatedQuestions });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to generate wording', variant: 'destructive' });
    } finally {
      setGeneratingAllWording(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: formName, current_config: currentConfig }),
      });
      const res = await fetch(`/api/forms/${formId}/publish`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error('Publish failed');
      const updated = await res.json();
      setStatus(updated.status);
      setSlug(updated.slug || slug);
      setVersion(updated.version);
      setPublishedConfig(updated.published_config);
      toast({ title: 'Published!', description: 'Your form is now live.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to publish', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)
        .eq('user_id', user?.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Form has been deleted.' });
      router.push('/dashboard');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete form', variant: 'destructive' });
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Public URL copied to clipboard' });
    setOverflowOpen(false);
  };

  if (authLoading || loadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4" />
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const contextLength = currentConfig.aiContext?.context?.length || 0;

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {editingTitle ? (
              <Input
                ref={titleInputRef}
                value={formName}
                onChange={(e) => updateFormName(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
                className="text-lg font-semibold h-9 max-w-xs"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-semibold text-slate-900 truncate cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => {
                  setEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
              >
                {formName || 'Untitled Conversation'}
              </h1>
            )}

            <Badge className={statusDisplay.className} variant="outline">
              {statusDisplay.label}
            </Badge>

            {saving && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
          </div>

          <div className="flex items-center gap-2">
            {status === 'live' && slug && (
              <Button variant="ghost" size="sm" onClick={copyPublicUrl} className="text-xs gap-1.5 text-slate-500 hover:text-slate-700">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            )}

            <Button
              onClick={handlePublish}
              disabled={isCTADisabled()}
              size="sm"
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {publishing ? 'Publishing...' : getCTALabel()}
            </Button>

            <div className="relative" ref={overflowRef}>
              <Button variant="ghost" size="icon" onClick={() => setOverflowOpen(!overflowOpen)} className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
              {overflowOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  {status === 'live' && slug && (
                    <button onClick={copyPublicUrl} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                      <Copy className="w-4 h-4" /> Copy public URL
                    </button>
                  )}
                  <button
                    onClick={() => { router.push(`/dashboard/forms/${formId}/results`); setOverflowOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" /> View submissions
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Builder Panel (Left) */}
        <div className="w-[440px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          {/* Editor / Analytics tabs */}
          <div className="flex border-b border-slate-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === 'editor'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Editor
              {activeTab === 'editor' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === 'analytics'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Analytics
              {activeTab === 'analytics' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          </div>

          {activeTab === 'analytics' ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Analytics coming soon</p>
                <p className="text-xs text-slate-400 mt-1">Publish your form to start collecting data</p>
              </div>
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-slate-100">

              {/* 1. Overview */}
              <div>
                <button
                  onClick={() => toggleSection(1)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">Overview</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(1) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(1) && (
                  <div className="px-5 pb-5 pt-1 pl-14 space-y-4">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">What is this conversation about?</label>
                      <div className="relative">
                        <Textarea
                          value={currentConfig.aiContext?.context || ''}
                          onChange={(e) => {
                            if (e.target.value.length <= CONTEXT_MAX_CHARS) {
                              updateAIContext({ context: e.target.value });
                            }
                          }}
                          placeholder={"Explain what this conversation is about...\n\ne.g., I'm organizing my wedding and want to send this form to my guests to know who will attend, which dates work for them, and their meal preferences."}
                          className="text-sm min-h-[100px] resize-none pr-16"
                        />
                        <span className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${contextLength > CONTEXT_MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-slate-300'}`}>
                          {contextLength}/{CONTEXT_MAX_CHARS}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Tone of voice */}
              <div>
                <button
                  onClick={() => toggleSection(2)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">Tone of voice</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(2) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(2) && (
                  <div className="px-5 pb-5 pt-1 pl-14 space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Tone</label>
                      {showTonePicker ? (
                        <div className="grid grid-cols-2 gap-2">
                          {TONE_OPTIONS.map((t) => (
                            <button
                              key={t.value}
                              onClick={() => {
                                updateAIContext({ tone: t.value });
                                setShowTonePicker(false);
                              }}
                              className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                                currentConfig.aiContext?.tone === t.value
                                  ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-200'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm font-medium text-slate-800">{t.label}</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">{t.description}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTonePicker(true)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-sm text-slate-700">
                            {TONE_OPTIONS.find(t => t.value === (currentConfig.aiContext?.tone || 'friendly'))?.label || 'Friendly'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Audience</label>
                      <Input
                        value={currentConfig.aiContext?.audience || ''}
                        onChange={(e) => updateAIContext({ audience: e.target.value })}
                        placeholder="e.g., wedding guests, clients, students"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Welcome & End screens */}
              <div>
                <button
                  onClick={() => toggleSection(3)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">Welcome & End screens</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(3) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(3) && (
                  <div className="px-5 pb-5 pt-1 pl-14 space-y-5">
                    <div className="space-y-3" onClick={() => setPreviewTarget('welcome')}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Welcome screen</label>
                        <Switch
                          checked={currentConfig.welcomeEnabled}
                          onCheckedChange={(checked) => { updateConfig({ welcomeEnabled: checked }); setPreviewTarget('welcome'); }}
                        />
                      </div>
                      {currentConfig.welcomeEnabled && (
                        <div className="space-y-2">
                          <Input
                            value={currentConfig.welcomeTitle}
                            onChange={(e) => updateConfig({ welcomeTitle: e.target.value })}
                            onFocus={() => setPreviewTarget('welcome')}
                            placeholder="Welcome title"
                            className="h-9 text-sm"
                          />
                          <Textarea
                            value={currentConfig.welcomeMessage}
                            onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                            onFocus={() => setPreviewTarget('welcome')}
                            placeholder="A short description for respondents..."
                            className="text-sm min-h-[50px] resize-none"
                          />
                          <Input
                            value={currentConfig.welcomeCta}
                            onChange={(e) => updateConfig({ welcomeCta: e.target.value })}
                            onFocus={() => setPreviewTarget('welcome')}
                            placeholder="CTA button label (e.g., Start)"
                            className="h-9 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-4 space-y-3" onClick={() => setPreviewTarget('end')}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">End screen</label>
                        <Switch
                          checked={currentConfig.endEnabled ?? true}
                          onCheckedChange={(checked) => { updateConfig({ endEnabled: checked }); setPreviewTarget('end'); }}
                        />
                      </div>
                      {(currentConfig.endEnabled ?? true) && (
                        <div className="space-y-2">
                          <Textarea
                            value={currentConfig.endMessage}
                            onChange={(e) => updateConfig({ endMessage: e.target.value })}
                            onFocus={() => setPreviewTarget('end')}
                            placeholder="Thank you message"
                            className="text-sm min-h-[50px] resize-none"
                          />
                          <Input
                            value={currentConfig.endCtaText || ''}
                            onChange={(e) => updateConfig({ endCtaText: e.target.value })}
                            onFocus={() => setPreviewTarget('end')}
                            placeholder="Optional CTA text"
                            className="h-9 text-sm"
                          />
                          {currentConfig.endCtaText && (
                            <Input
                              value={currentConfig.endCtaUrl || ''}
                              onChange={(e) => updateConfig({ endCtaUrl: e.target.value })}
                              onFocus={() => setPreviewTarget('end')}
                              placeholder="CTA URL (https://...)"
                              className="h-9 text-sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Journey */}
              <div>
                <button
                  onClick={() => toggleSection(4)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">
                    Journey
                    {currentConfig.questions.length > 0 && (
                      <span className="text-slate-400 font-normal ml-1">({currentConfig.questions.length})</span>
                    )}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(4) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(4) && (
                  <div className="px-5 pb-5 pt-1 space-y-3">
                    <div className="flex items-center justify-end">
                      <Button
                        onClick={generateFullConversation}
                        disabled={generatingConversation || generatingAllWording || !currentConfig.aiContext?.context?.trim()}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {generatingConversation || generatingAllWording ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {generatingAllWording ? 'Wording...' : 'Generating...'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {currentConfig.questions.map((q, i) => (
                        <JourneyItemRow
                          key={q.id}
                          question={q}
                          index={i}
                          isActive={previewTarget !== null && typeof previewTarget === 'object' && 'step' in previewTarget && previewTarget.step === i}
                          isDragging={dragIndex === i}
                          isDragOver={dragOverIndex === i}
                          isGenerating={generatingWording === q.id}
                          onUpdate={(updates) => updateQuestion(q.id, updates)}
                          onFocus={() => setPreviewTarget({ step: i })}
                          onDuplicate={() => duplicateJourneyItem(q.id)}
                          onDelete={() => deleteJourneyItem(q.id)}
                          onGenerateWording={() => generateWordingForQuestion(q.id)}
                          onOpenSettings={() => setSettingsStepId(q.id)}
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={(e) => handleDragOver(e, i)}
                          onDragEnd={handleDragEnd}
                        />
                      ))}

                      <button
                        onClick={addJourneyItem}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add step
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Visuals */}
              <div>
                <button
                  onClick={() => toggleSection(5)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">5</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">Visuals</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(5) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(5) && (
                  <div className="px-5 pb-5 pt-1 pl-14 space-y-5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Theme</label>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[11px] text-slate-500 mb-1 block">Primary color</label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="color"
                                value={currentConfig.theme?.primaryColor || '#111827'}
                                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                              />
                            </div>
                            <Input
                              value={currentConfig.theme?.primaryColor || '#111827'}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') {
                                  updateTheme({ primaryColor: v || '#111827' });
                                }
                              }}
                              placeholder="#111827"
                              className="h-8 text-sm font-mono flex-1"
                              maxLength={7}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 mb-1 block">Font</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Inter', 'System', 'Serif'] as const).map((font) => (
                              <button
                                key={font}
                                onClick={() => updateTheme({ fontFamily: font })}
                                className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                                  (currentConfig.theme?.fontFamily || 'Inter') === font
                                    ? 'border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                                style={{
                                  fontFamily: font === 'Serif' ? 'Georgia, serif' : font === 'System' ? 'system-ui, sans-serif' : 'Inter, sans-serif'
                                }}
                              >
                                {font}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 mb-1 block">Card style</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => updateTheme({ cardStyle: 'light' })}
                              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                                (currentConfig.theme?.cardStyle || 'light') === 'light'
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                              Light
                            </button>
                            <button
                              onClick={() => updateTheme({ cardStyle: 'dark' })}
                              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                                currentConfig.theme?.cardStyle === 'dark'
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="w-4 h-4 rounded border border-slate-600 bg-slate-800" />
                              Dark
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2 block">Background</label>
                      <VisualsSection
                        visuals={currentConfig.visuals}
                        uploadingVisual={uploadingVisual}
                        showVisualUrlInput={showVisualUrlInput}
                        onSetShowVisualUrlInput={setShowVisualUrlInput}
                        onUpload={handleVisualUpload}
                        onClear={clearVisual}
                        onUrlChange={(url, kind) => {
                          updateConfig({
                            visuals: {
                              kind,
                              source: 'url',
                              url,
                              updatedAt: new Date().toISOString(),
                            },
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. About you */}
              <div>
                <button
                  onClick={() => toggleSection(6)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">6</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">About you</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(6) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(6) && (
                  <div className="px-5 pb-5 pt-1 pl-14">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Brand / company</label>
                    <Textarea
                      value={currentConfig.aboutYou || ''}
                      onChange={(e) => updateConfig({ aboutYou: e.target.value })}
                      placeholder="Tell us about your brand or company. This helps AI match your voice..."
                      className="text-sm min-h-[60px] resize-none"
                    />
                  </div>
                )}
              </div>

              {/* 7. Train AI */}
              <div>
                <button
                  onClick={() => toggleSection(7)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">7</span>
                  <span className="text-[13px] font-semibold text-slate-800 flex-1 text-left">Train AI</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full mr-1">Optional</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.has(7) ? 'rotate-90' : ''}`} />
                </button>
                {openSections.has(7) && (
                  <div className="px-5 pb-5 pt-1 pl-14">
                    <p className="text-xs text-slate-500 mb-2">
                      Give extra instructions to guide how AI generates your conversation.
                    </p>
                    <Textarea
                      value={currentConfig.trainAI || ''}
                      onChange={(e) => updateConfig({ trainAI: e.target.value })}
                      placeholder={"e.g., Always ask for first name before last name.\nDon't mention competitors.\nKeep questions under 20 words."}
                      className="text-sm min-h-[80px] resize-none font-mono text-xs"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
          )}
        </div>

        {/* Live Preview Panel (Right) */}
        <div className="flex-1 overflow-hidden">
          <LivePreviewPanel
            config={currentConfig}
            formName={formName}
            previewTarget={previewTarget}
            slug={slug}
          />
        </div>
      </div>

      {settingsStepId && (() => {
        const q = currentConfig.questions.find(q => q.id === settingsStepId);
        const idx = currentConfig.questions.findIndex(q => q.id === settingsStepId);
        if (!q) return null;
        return (
          <StepSettingsDrawer
            question={q}
            stepNumber={idx + 1}
            open={true}
            onOpenChange={(open) => { if (!open) setSettingsStepId(null); }}
            onUpdate={(updates) => updateQuestion(settingsStepId, updates)}
          />
        );
      })()}
    </div>
  );
}

const SETTINGS_TYPE_GROUPS = [
  { label: 'Open ended', types: [
    { value: 'short_text' as const, label: 'Short text' },
    { value: 'long_text' as const, label: 'Long text' },
    { value: 'email' as const, label: 'Email' },
    { value: 'phone' as const, label: 'Phone' },
    { value: 'number' as const, label: 'Number' },
    { value: 'date' as const, label: 'Date' },
  ]},
  { label: 'Multiple choice', types: [
    { value: 'single_choice' as const, label: 'Single choice' },
    { value: 'multiple_choice' as const, label: 'Multiple choice' },
    { value: 'yes_no' as const, label: 'Yes / No' },
  ]},
  { label: 'Statement', types: [
    { value: 'statement' as const, label: 'Statement' },
    { value: 'cta' as const, label: 'Call to Action' },
  ]},
  { label: 'File upload', types: [
    { value: 'file_upload' as const, label: 'File upload' },
  ]},
];

function StepSettingsDrawer({
  question,
  stepNumber,
  open,
  onOpenChange,
  onUpdate,
}: {
  question: Question;
  stepNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Question>) => void;
}) {
  const promptText = question.message || question.label || 'Untitled step';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-base">Step {stepNumber} Settings</SheetTitle>
          <SheetDescription className="text-sm text-slate-500 line-clamp-2">{promptText}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-slate-800">Required</Label>
              <p className="text-xs text-slate-500">Respondent must answer this step to continue</p>
            </div>
            <Switch
              checked={question.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-800">Question type</Label>
            <Select
              value={question.type}
              onValueChange={(value) => onUpdate({ type: value as QuestionType })}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETTINGS_TYPE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</div>
                    {group.types.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              Attach a YouTube video
            </Label>
            <p className="text-xs text-slate-500">Optionally show a video alongside this step</p>
            <Input
              value={question.videoUrl || ''}
              onChange={(e) => onUpdate({ videoUrl: e.target.value || undefined })}
              placeholder="https://youtube.com/watch?v=..."
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-800">Internal name</Label>
            <p className="text-xs text-slate-500">Machine-readable key used in data exports</p>
            <Input
              value={question.internalName ?? question.key ?? ''}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/(^_|_$)/g, '');
                onUpdate({ internalName: val || undefined });
              }}
              placeholder="e.g. attendee_name"
              className="h-9 text-sm font-mono"
            />
          </div>

          {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Options</Label>
              <p className="text-xs text-slate-500">Set in the journey editor or via AI generation</p>
              <div className="space-y-1">
                {question.options.map((opt, i) => (
                  <div key={opt.id} className="text-sm text-slate-600 bg-slate-50 rounded px-2.5 py-1.5">{opt.label}</div>
                ))}
                {question.options.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No options yet — use AI wording to generate them</p>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JourneyItemRow({
  question,
  index,
  isActive,
  isDragging,
  isDragOver,
  isGenerating,
  onUpdate,
  onFocus,
  onDuplicate,
  onDelete,
  onGenerateWording,
  onOpenSettings,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  question: Question;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isGenerating: boolean;
  onUpdate: (updates: Partial<Question>) => void;
  onFocus: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGenerateWording: () => void;
  onOpenSettings: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const promptText = question.message || question.label || 'Untitled step';
  const typeLabel = QUESTION_TYPES.find(t => t.value === question.type)?.label || question.type;

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onFocus}
      className={`group relative rounded-lg border transition-all cursor-pointer ${
        isDragging
          ? 'opacity-40 border-blue-300 bg-blue-50'
          : isDragOver
          ? 'border-blue-300 bg-blue-50/50 border-dashed'
          : isActive
          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-200 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2.5">
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
        </div>

        <span className={`text-[11px] font-semibold flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${
          isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {index + 1}
        </span>

        {editing ? (
          <textarea
            autoFocus
            value={question.label}
            onChange={(e) => {
              const updates: Partial<Question> = { label: e.target.value };
              if (!question.key || question.key === generateKeyFromLabel(question.label)) {
                updates.key = generateKeyFromLabel(e.target.value);
              }
              onUpdate(updates);
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); setEditing(false); } }}
            placeholder="What should AI ask at this step?"
            rows={2}
            className="flex-1 min-w-0 text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex-1 min-w-0" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            <p className="text-sm text-slate-700 truncate leading-snug">{promptText}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400">{typeLabel}</span>
              {question.message && (
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                  AI
                </span>
              )}
            </div>
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateWording(); }}
              disabled={isGenerating || !question.label}
              className="p-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-40"
              title="Generate wording"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onFocus(); onOpenSettings(); }}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
              title="Step settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface VisualsSectionProps {
  visuals?: FormVisuals;
  uploadingVisual: boolean;
  showVisualUrlInput: boolean;
  onSetShowVisualUrlInput: (v: boolean) => void;
  onUpload: (file: File, kind: 'image' | 'video') => void;
  onClear: () => void;
  onUrlChange: (url: string, kind: 'image' | 'video') => void;
}

function VisualsSection(props: VisualsSectionProps) {
  const { visuals, uploadingVisual, showVisualUrlInput, onSetShowVisualUrlInput, onUpload, onClear, onUrlChange } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInputValue, setUrlInputValue] = useState('');
  const currentKind = visuals?.kind && visuals.kind !== 'none' ? visuals.kind : 'image';
  const hasVisual = visuals?.kind && visuals.kind !== 'none' && visuals?.url?.trim();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file, currentKind);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['image', 'video'] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => {
              if (hasVisual && visuals?.kind !== kind) {
                onUrlChange(visuals?.url || '', kind);
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors ${
              currentKind === kind
                ? 'border-pink-200 bg-pink-50 text-pink-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {kind === 'image' ? <Image className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </button>
        ))}
      </div>

      {hasVisual ? (
        <div className="relative group">
          {visuals!.kind === 'video' ? (
            <video
              src={visuals!.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <div
              className="w-full h-32 rounded-lg bg-cover bg-center border border-slate-200"
              style={{ backgroundImage: `url(${visuals!.url})` }}
            />
          )}
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={currentKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/gif,image/webp'}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingVisual}
            className="w-full flex items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            {uploadingVisual ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {currentKind}
              </>
            )}
          </button>
        </div>
      )}

      {!hasVisual && (
        <div>
          {showVisualUrlInput ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Link className="w-3 h-3" />
                Paste a URL instead
              </div>
              <Input
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onBlur={() => {
                  const url = urlInputValue.trim();
                  if (url) {
                    onUrlChange(url, currentKind);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = urlInputValue.trim();
                    if (url) {
                      onUrlChange(url, currentKind);
                    }
                  }
                }}
                placeholder={currentKind === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg'}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => onSetShowVisualUrlInput(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              Use a link instead (advanced)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PREVIEW_DEFAULT_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

const SPEED_OPTIONS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
] as const;

function LivePreviewPanel({
  config,
  formName,
  previewTarget,
  slug,
}: {
  config: FormConfig;
  formName: string;
  previewTarget: PreviewTarget;
  slug: string;
}) {
  const [previewSpeed, setPreviewSpeed] = useState(1);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const visuals = config.visuals;
  const hasVisual = visuals?.kind && visuals.kind !== 'none' && visuals?.url?.trim();
  const isVideo = visuals?.kind === 'video';
  const cardStyle = config.theme?.cardStyle || 'light';
  const isDark = cardStyle === 'dark';

  const bgStyle: React.CSSProperties = {};
  if (hasVisual && !isVideo) {
    bgStyle.backgroundImage = `url(${visuals!.url})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  const cardBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const showEmptyState = config.questions.length === 0 && !config.welcomeEnabled;

  const shareUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${slug}` : '';

  const handleCopyUrl = useCallback(() => {
    if (!shareUrl) return;
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [shareUrl]);

  const handleRefresh = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Preview top bar */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10 flex-shrink-0">
        {/* Left: shareable URL */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <div className="flex items-center flex-1 min-w-0 bg-slate-800/60 rounded-md border border-slate-700/50 px-2.5 py-1.5">
            <Link className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mr-2" />
            <span className="text-xs text-slate-400 truncate select-all font-mono">
              {shareUrl || 'Publish to get a shareable link'}
            </span>
          </div>
          {shareUrl && (
            <button
              onClick={handleCopyUrl}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Right: speed selector + refresh */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center bg-slate-800/60 rounded-md border border-slate-700/50 p-0.5">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreviewSpeed(opt.value)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  previewSpeed === opt.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 relative overflow-hidden">
        {hasVisual ? (
          <div className="absolute inset-0">
            {isVideo ? (
              <video
                src={visuals!.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" style={bgStyle} />
            )}
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: PREVIEW_DEFAULT_GRADIENT }} />
        )}

        <div className="relative z-10 flex items-center justify-center h-full p-6">
          <div
            key={previewKey}
            className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm"
            style={{ backgroundColor: cardBg, maxHeight: 'calc(100% - 2rem)' }}
          >
            {showEmptyState ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center px-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No steps yet</p>
                  <p className="text-xs mt-1.5 text-slate-400">Add a step to preview your conversation</p>
                </div>
              </div>
            ) : (
              <ConversationalForm
                config={config}
                formName={formName || 'Form'}
                isPreview={true}
                previewTarget={previewTarget}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
