'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType, QUESTION_TYPES, ToneType, createDefaultCTA, FormTheme, DEFAULT_THEME, AIContext, FormVisuals, StepVisual, VisualLayout, FormSettings } from '@/lib/types';
import { SettingsDialog } from '@/components/settings-dialog';
import { ConversationalForm, PreviewTarget } from '@/components/conversational-form';
import { CrossDissolveBackground, VisualLayer } from '@/components/cross-dissolve-background';
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
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
      visual: q.visual,
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

  const updateSettings = (updates: Partial<FormSettings>) => {
    const current = currentConfig.settings || {};
    updateConfig({ settings: { ...current, ...updates } });
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

            <button
              onClick={() => setSettingsDialogOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

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
                    <StepVisualManager
                        config={currentConfig}
                        formId={formId!}
                        previewTarget={previewTarget}
                        onSelectStep={(target) => setPreviewTarget(target)}
                        onUpdateWelcomeVisual={(v) => updateConfig({ welcomeVisual: v })}
                        onUpdateEndVisual={(v) => updateConfig({ endVisual: v })}
                        onUpdateQuestionVisual={(qId, v) => updateQuestion(qId, { visual: v })}
                      />
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

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        formName={formName}
        config={currentConfig}
        onFormNameChange={updateFormName}
        onThemeChange={updateTheme}
        onSettingsChange={updateSettings}
      />
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

const LAYOUT_OPTIONS: { value: VisualLayout; label: string }[] = [
  { value: 'fill', label: 'Fill' },
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

function StepVisualEditor({
  visual,
  formId,
  onUpdate,
}: {
  visual: StepVisual | undefined;
  formId: string;
  onUpdate: (v: StepVisual) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const { toast } = useToast();
  const { session } = useAuth();

  const hasVisual = visual?.kind && visual.kind !== 'none' && visual?.url?.trim();
  const layout = visual?.layout || 'fill';
  const opacity = visual?.opacity ?? 100;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'image');
      const res = await fetch(`/api/forms/${formId}/visual`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      onUpdate({
        ...(visual || { kind: 'none' }),
        kind: data.kind,
        source: 'upload',
        url: data.url,
        storagePath: data.storagePath,
        layout: visual?.layout || 'fill',
        opacity: visual?.opacity ?? 100,
      });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      {hasVisual ? (
        <div className="relative group">
          {visual!.kind === 'video' ? (
            <video src={visual!.url} autoPlay loop muted playsInline className="w-full h-24 object-cover rounded-md" />
          ) : (
            <div className="w-full h-24 rounded-md bg-cover bg-center border border-slate-200" style={{ backgroundImage: `url(${visual!.url})`, opacity: opacity / 100 }} />
          )}
          <button
            onClick={() => onUpdate({ kind: 'none', layout, opacity })}
            className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-md border-2 border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            {uploading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>) : (<><Upload className="w-3.5 h-3.5" /> Upload image</>)}
          </button>
          {!showUrlInput ? (
            <button onClick={() => setShowUrlInput(true)} className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 mt-1.5">
              <Link className="w-2.5 h-2.5" /> Use a link instead
            </button>
          ) : (
            <div className="mt-1.5 flex gap-1">
              <Input value={urlInputValue} onChange={(e) => setUrlInputValue(e.target.value)} placeholder="https://..." className="h-7 text-xs flex-1" onKeyDown={(e) => { if (e.key === 'Enter' && urlInputValue.trim()) { onUpdate({ kind: 'image', source: 'url', url: urlInputValue.trim(), layout, opacity }); setUrlInputValue(''); setShowUrlInput(false); } }} />
              <button onClick={() => { if (urlInputValue.trim()) { onUpdate({ kind: 'image', source: 'url', url: urlInputValue.trim(), layout, opacity }); setUrlInputValue(''); setShowUrlInput(false); } }} className="px-2 h-7 bg-slate-800 text-white text-xs rounded-md hover:bg-slate-700">Go</button>
            </div>
          )}
        </div>
      )}

      {hasVisual && (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Layout</label>
            <div className="grid grid-cols-4 gap-1">
              {LAYOUT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => onUpdate({ ...visual!, layout: opt.value })} className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors ${layout === opt.value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Opacity</label>
              <span className="text-[10px] text-slate-400">{opacity}%</span>
            </div>
            <input type="range" min={10} max={100} value={opacity} onChange={(e) => onUpdate({ ...visual!, opacity: Number(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
        </>
      )}
    </div>
  );
}

function StepVisualManager({
  config,
  formId,
  previewTarget,
  onSelectStep,
  onUpdateWelcomeVisual,
  onUpdateEndVisual,
  onUpdateQuestionVisual,
}: {
  config: FormConfig;
  formId: string;
  previewTarget: PreviewTarget;
  onSelectStep: (target: PreviewTarget) => void;
  onUpdateWelcomeVisual: (v: StepVisual) => void;
  onUpdateEndVisual: (v: StepVisual) => void;
  onUpdateQuestionVisual: (qId: string, v: StepVisual) => void;
}) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const stepRows: { id: string; label: string; visual: StepVisual | undefined; target: PreviewTarget; onUpdate: (v: StepVisual) => void }[] = [];

  if (config.welcomeEnabled) {
    stepRows.push({
      id: '_welcome',
      label: 'Welcome',
      visual: config.welcomeVisual,
      target: 'welcome',
      onUpdate: onUpdateWelcomeVisual,
    });
  }

  config.questions.forEach((q, i) => {
    stepRows.push({
      id: q.id,
      label: q.label || q.message || `Step ${i + 1}`,
      visual: q.visual,
      target: { step: i },
      onUpdate: (v) => onUpdateQuestionVisual(q.id, v),
    });
  });

  if (config.endEnabled) {
    stepRows.push({
      id: '_end',
      label: 'End screen',
      visual: config.endVisual,
      target: 'end',
      onUpdate: onUpdateEndVisual,
    });
  }

  return (
    <div className="space-y-1">
      {stepRows.length === 0 && (
        <p className="text-xs text-slate-400 italic py-2">Add steps to attach visuals</p>
      )}
      {stepRows.map((row) => {
        const hasVis = row.visual?.kind && row.visual.kind !== 'none' && row.visual?.url?.trim();
        const isExpanded = expandedStep === row.id;
        const isSelected = previewTarget === row.target || (typeof previewTarget === 'object' && typeof row.target === 'object' && previewTarget !== null && row.target !== null && 'step' in previewTarget && 'step' in row.target && previewTarget.step === row.target.step);

        return (
          <div key={row.id}>
            <button
              onClick={() => { onSelectStep(row.target); setExpandedStep(isExpanded ? null : row.id); }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
            >
              {hasVis ? (
                <div className="w-8 h-8 rounded-md bg-cover bg-center border border-slate-200 flex-shrink-0" style={{ backgroundImage: `url(${row.visual!.url})`, opacity: (row.visual!.opacity ?? 100) / 100 }} />
              ) : (
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Image className="w-3 h-3 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{row.label}</p>
                <p className="text-[10px] text-slate-400">{hasVis ? 'Visual set' : 'No visual'}</p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            {isExpanded && (
              <div className="mt-1 mb-2 ml-2">
                <StepVisualEditor visual={row.visual} formId={formId} onUpdate={row.onUpdate} />
              </div>
            )}
          </div>
        );
      })}
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

  const previewVisualLayer: VisualLayer | null = (() => {
    const resolveActiveVisual = (): StepVisual | undefined => {
      if (previewTarget === 'welcome') return config.welcomeVisual;
      if (previewTarget === 'end') return config.endVisual;
      if (previewTarget && typeof previewTarget === 'object' && 'step' in previewTarget) {
        const q = config.questions[previewTarget.step];
        if (q?.visual?.kind && q.visual.kind !== 'none') return q.visual;
      }
      if (config.visuals?.kind && config.visuals.kind !== 'none') {
        return { kind: config.visuals.kind, url: config.visuals.url, source: config.visuals.source, storagePath: config.visuals.storagePath, layout: 'fill', opacity: 100 };
      }
      return undefined;
    };
    const sv = resolveActiveVisual();
    if (!sv || !sv.kind || sv.kind === 'none' || !sv.url?.trim()) return null;
    return { kind: sv.kind as 'image' | 'video', url: sv.url, opacity: sv.opacity, layout: sv.layout };
  })();

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
        <CrossDissolveBackground
          visual={previewVisualLayer}
          defaultGradient={PREVIEW_DEFAULT_GRADIENT}
          duration={400}
          overlayClass="bg-black/30"
        />

        <div className="relative z-10 flex items-center justify-center h-full" key={previewKey}>
          {showEmptyState ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center px-8">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30 text-white" />
                <p className="text-sm font-medium text-white/60">No steps yet</p>
                <p className="text-xs mt-1.5 text-white/30">Add a step to preview your conversation</p>
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
  );
}
