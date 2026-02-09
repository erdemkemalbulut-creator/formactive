'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType, QUESTION_TYPES, ToneType, createDefaultCTA, FormTheme, DEFAULT_THEME, AIContext } from '@/lib/types';
import { ConversationalForm } from '@/components/conversational-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  Eye,
  Check,
  X,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  CheckSquare,
  ToggleLeft,
  BarChart3,
  Settings,
  MessageSquare,
  Sparkles,
  Wand2,
  Palette,
  Link2,
  Loader2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Type: <Type className="w-4 h-4" />,
  AlignLeft: <AlignLeft className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  Phone: <Phone className="w-4 h-4" />,
  Hash: <Hash className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  ChevronDown: <ChevronDown className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  ToggleLeft: <ToggleLeft className="w-4 h-4" />,
  ExternalLink: <ExternalLink className="w-4 h-4" />,
};

function makeDefaultConfig(): FormConfig {
  return {
    questions: [],
    welcomeEnabled: true,
    welcomeTitle: '',
    welcomeMessage: '',
    welcomeCta: 'Start',
    endMessage: 'Thank you for your submission!',
    endRedirectEnabled: false,
    endRedirectUrl: '',
    theme: { buttonStyle: 'rounded', spacing: 'normal' },
  };
}

function makeDefaultQuestion(order: number, type: QuestionType = 'short_text'): Question {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: '',
    type,
    label: '',
    message: '',
    required: false,
    options: type === 'single_choice' || type === 'multiple_choice'
      ? [{ id: `o_${Date.now()}`, label: 'Option 1', value: 'option_1' }]
      : [],
    order,
  };
}

function generateKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
    .slice(0, 40);
}

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
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [generatingConversation, setGeneratingConversation] = useState(false);
  const [generatingWording, setGeneratingWording] = useState<string | null>(null);
  const [generatingAllWording, setGeneratingAllWording] = useState(false);

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
      file_upload: 'short_text',
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
    };
  };

  const normalizeConfig = (config: FormConfig): FormConfig => {
    const normalized = {
      ...config,
      aiContext: config.aiContext || { context: '', tone: 'friendly' as ToneType, audience: '' },
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

  const addQuestion = (type: QuestionType) => {
    const order = currentConfig.questions.length;
    const q = makeDefaultQuestion(order, type);
    updateConfig({ questions: [...currentConfig.questions, q] });
    setExpandedQuestions((prev) => new Set(prev).add(q.id));
    setShowTypePicker(false);
  };

  const addCTA = () => {
    const order = currentConfig.questions.length;
    const q = createDefaultCTA(order);
    updateConfig({ questions: [...currentConfig.questions, q] });
    setExpandedQuestions((prev) => new Set(prev).add(q.id));
    setShowTypePicker(false);
  };

  const duplicateQuestion = (questionId: string) => {
    const original = currentConfig.questions.find((q) => q.id === questionId);
    if (!original) return;
    const dup: Question = {
      ...original,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: original.key ? `${original.key}_copy` : '',
      order: currentConfig.questions.length,
    };
    updateConfig({ questions: [...currentConfig.questions, dup] });
  };

  const deleteQuestion = (questionId: string) => {
    const newQuestions = currentConfig.questions
      .filter((q) => q.id !== questionId)
      .map((q, i) => ({ ...q, order: i }));
    updateConfig({ questions: newQuestions });
  };

  const addOption = (questionId: string) => {
    const q = currentConfig.questions.find((q) => q.id === questionId);
    if (!q) return;
    const newOpt = {
      id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: `Option ${q.options.length + 1}`,
      value: `option_${q.options.length + 1}`,
    };
    updateQuestion(questionId, { options: [...q.options, newOpt] });
  };

  const updateOption = (questionId: string, optionId: string, updates: { label?: string; value?: string }) => {
    const q = currentConfig.questions.find((q) => q.id === questionId);
    if (!q) return;
    const newOptions = q.options.map((o) =>
      o.id === optionId ? { ...o, ...updates } : o
    );
    updateQuestion(questionId, { options: newOptions });
  };

  const removeOption = (questionId: string, optionId: string) => {
    const q = currentConfig.questions.find((q) => q.id === questionId);
    if (!q) return;
    updateQuestion(questionId, { options: q.options.filter((o) => o.id !== optionId) });
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
      toast({ title: 'Done!', description: 'Wording generated for this question.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate wording', variant: 'destructive' });
    } finally {
      setGeneratingWording(null);
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
      setExpandedQuestions(new Set());
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

  const updateAIContext = (updates: Partial<AIContext>) => {
    const current = currentConfig.aiContext || { context: '', tone: 'friendly' as ToneType, audience: '' };
    updateConfig({ aiContext: { ...current, ...updates } });
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

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const publicUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${slug}` : '';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
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
                className="text-lg font-semibold text-slate-900 truncate cursor-pointer hover:text-slate-600"
                onClick={() => {
                  setEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
              >
                {formName || 'Untitled Form'}
              </h1>
            )}

            <Badge className={statusDisplay.className} variant="outline">
              {statusDisplay.label}
            </Badge>

            {saving && <span className="text-xs text-slate-400">Saving...</span>}
          </div>

          <div className="flex items-center gap-2">
            {status === 'live' && slug && (
              <span className="hidden md:flex items-center gap-1 text-xs text-slate-500 max-w-[200px] truncate">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">/f/{slug}</span>
                <button onClick={copyPublicUrl} className="flex-shrink-0 hover:text-slate-700">
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            )}

            <Button
              onClick={handlePublish}
              disabled={isCTADisabled()}
              size="sm"
            >
              {publishing ? 'Publishing...' : getCTALabel()}
            </Button>

            <div className="relative" ref={overflowRef}>
              <Button variant="ghost" size="icon" onClick={() => setOverflowOpen(!overflowOpen)}>
                <MoreVertical className="w-4 h-4" />
              </Button>
              {overflowOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                  {status === 'live' && slug && (
                    <button
                      onClick={copyPublicUrl}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Share (copy URL)
                    </button>
                  )}
                  <button
                    onClick={() => {
                      router.push(`/dashboard/forms/${formId}/results`);
                      setOverflowOpen(false);
                    }}
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

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[45%] border-r border-slate-200 bg-white overflow-y-auto">
          <Accordion type="multiple" defaultValue={['ai-context', 'questions', 'screens', 'settings']} className="px-4">
            <AccordionItem value="ai-context">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">AI Context</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-blue-700">Describe your situation</Label>
                    <Textarea
                      value={currentConfig.aiContext?.context || ''}
                      onChange={(e) => updateAIContext({ context: e.target.value })}
                      placeholder={"e.g., I'm organizing my wedding and want to send this form to my guests to know who will attend, which dates work for them, and their meal preferences.\n\nor: I'm a travel agent organizing a trip. Everything is planned, and I want to communicate the details and collect participant info."}
                      className="text-sm min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">Tone</Label>
                      <Select
                        value={currentConfig.aiContext?.tone || 'friendly'}
                        onValueChange={(val) => updateAIContext({ tone: val as ToneType })}
                      >
                        <SelectTrigger className="h-8 text-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                          <SelectItem value="playful">Playful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">Audience</Label>
                      <Input
                        value={currentConfig.aiContext?.audience || ''}
                        onChange={(e) => updateAIContext({ audience: e.target.value })}
                        placeholder="e.g., wedding guests"
                        className="h-8 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={generateFullConversation}
                    disabled={generatingConversation || generatingAllWording || !currentConfig.aiContext?.context?.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {generatingConversation || generatingAllWording ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {generatingAllWording ? 'Generating wording...' : 'Generating questions...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Full Conversation
                      </>
                    )}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="questions">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Journey ({currentConfig.questions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {currentConfig.questions.map((q, i) => {
                    const isExpanded = expandedQuestions.has(q.id);
                    const typeInfo = QUESTION_TYPES.find((t) => t.value === q.type);
                    const isCTA = q.type === 'cta';

                    return (
                      <div key={q.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleQuestionExpanded(q.id)}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-400 font-mono w-5">{i + 1}</span>
                          {typeInfo && ICON_MAP[typeInfo.icon] && (
                            <span className="text-slate-500 flex-shrink-0">{ICON_MAP[typeInfo.icon]}</span>
                          )}
                          <span className="text-sm text-slate-700 truncate flex-1">
                            {q.label || (isCTA ? 'Call to Action' : 'Untitled question')}
                          </span>
                          {q.message && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Has conversational wording" />}
                          {q.required && <Badge className="text-[9px] bg-red-50 text-red-600 border-red-200 flex-shrink-0" variant="outline">req</Badge>}
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>

                        {isExpanded && (
                          <div className="px-3 py-3 space-y-3 bg-white">
                            {isCTA ? (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">Button text</Label>
                                  <Input
                                    value={q.cta?.text || ''}
                                    onChange={(e) => updateQuestion(q.id, { cta: { ...(q.cta || { text: '', url: '', openInNewTab: true }), text: e.target.value } })}
                                    placeholder="Learn More"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">URL</Label>
                                  <Input
                                    value={q.cta?.url || ''}
                                    onChange={(e) => updateQuestion(q.id, { cta: { ...(q.cta || { text: '', url: '', openInNewTab: true }), url: e.target.value } })}
                                    placeholder="https://example.com"
                                    className="h-8 text-sm font-mono"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">Open in new tab</Label>
                                  <Switch
                                    checked={q.cta?.openInNewTab ?? true}
                                    onCheckedChange={(checked) => updateQuestion(q.id, { cta: { ...(q.cta || { text: '', url: '', openInNewTab: true }), openInNewTab: checked } })}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">What to ask (label)</Label>
                                  <Input
                                    value={q.label}
                                    onChange={(e) => {
                                      const updates: Partial<Question> = { label: e.target.value };
                                      if (!q.key || q.key === generateKeyFromLabel(q.label)) {
                                        updates.key = generateKeyFromLabel(e.target.value);
                                      }
                                      updateQuestion(q.id, updates);
                                    }}
                                    placeholder="e.g., Full name, Email address, Meal preference..."
                                    className="h-8 text-sm"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Conversational message</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => generateWordingForQuestion(q.id)}
                                      disabled={generatingWording === q.id || !q.label}
                                      className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                                    >
                                      {generatingWording === q.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                      ) : (
                                        <Wand2 className="w-3 h-3 mr-1" />
                                      )}
                                      Generate
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={q.message || ''}
                                    onChange={(e) => updateQuestion(q.id, { message: e.target.value })}
                                    placeholder="The conversational wording shown to the respondent..."
                                    className="text-sm min-h-[50px]"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select
                                      value={q.type}
                                      onValueChange={(val) => {
                                        const updates: Partial<Question> = { type: val as QuestionType };
                                        if ((val === 'single_choice' || val === 'multiple_choice') && q.options.length === 0) {
                                          updates.options = [{ id: `o_${Date.now()}`, label: 'Option 1', value: 'option_1' }];
                                        }
                                        updateQuestion(q.id, updates);
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {QUESTION_TYPES.filter(t => t.value !== 'cta').map((t) => (
                                          <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2">
                                              {ICON_MAP[t.icon]}
                                              {t.label}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Field key</Label>
                                    <Input
                                      value={q.key}
                                      onChange={(e) => updateQuestion(q.id, { key: e.target.value })}
                                      placeholder="field_key"
                                      className="h-8 text-xs font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">Required</Label>
                                  <Switch
                                    checked={q.required}
                                    onCheckedChange={(checked) => updateQuestion(q.id, { required: checked })}
                                  />
                                </div>

                                {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">Options</Label>
                                    {q.options.map((opt) => (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        <Input
                                          value={opt.label}
                                          onChange={(e) => {
                                            updateOption(q.id, opt.id, {
                                              label: e.target.value,
                                              value: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''),
                                            });
                                          }}
                                          className="h-7 text-sm flex-1"
                                        />
                                        <button onClick={() => removeOption(q.id, opt.id)} className="text-slate-400 hover:text-red-500">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={() => addOption(q.id)} className="text-xs h-7">
                                      <Plus className="w-3 h-3 mr-1" /> Add option
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}

                            <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                              <Button variant="ghost" size="sm" onClick={() => duplicateQuestion(q.id)} className="text-xs h-7 text-slate-500">
                                <Copy className="w-3 h-3 mr-1" /> Duplicate
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="text-xs h-7 text-red-500 hover:text-red-700">
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {showTypePicker ? (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <p className="text-xs text-slate-500 font-medium mb-2">Choose question type:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {QUESTION_TYPES.filter(t => t.value !== 'cta').map((t) => (
                          <button
                            key={t.value}
                            onClick={() => addQuestion(t.value)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors text-left"
                          >
                            {ICON_MAP[t.icon]}
                            {t.label}
                          </button>
                        ))}
                        <button
                          onClick={addCTA}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors text-left"
                        >
                          {ICON_MAP['ExternalLink']}
                          Call to Action
                        </button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowTypePicker(false)} className="w-full mt-2 text-xs">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowTypePicker(true)} className="w-full text-sm">
                      <Plus className="w-4 h-4 mr-1" /> Add question
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="screens">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Welcome & End Screen
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show welcome screen</Label>
                    <Switch
                      checked={currentConfig.welcomeEnabled}
                      onCheckedChange={(checked) => updateConfig({ welcomeEnabled: checked })}
                    />
                  </div>

                  {currentConfig.welcomeEnabled && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Welcome title</Label>
                        <Input
                          value={currentConfig.welcomeTitle}
                          onChange={(e) => updateConfig({ welcomeTitle: e.target.value })}
                          placeholder="Welcome to our form"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Welcome message</Label>
                        <Textarea
                          value={currentConfig.welcomeMessage}
                          onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                          placeholder="A short description..."
                          className="text-sm min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CTA button label</Label>
                        <Input
                          value={currentConfig.welcomeCta}
                          onChange={(e) => updateConfig({ welcomeCta: e.target.value })}
                          placeholder="Start"
                          className="h-8 text-sm"
                        />
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <Label className="text-xs">End screen message</Label>
                      <Textarea
                        value={currentConfig.endMessage}
                        onChange={(e) => updateConfig({ endMessage: e.target.value })}
                        placeholder="Thank you!"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Redirect after submission</Label>
                    <Switch
                      checked={currentConfig.endRedirectEnabled}
                      onCheckedChange={(checked) => updateConfig({ endRedirectEnabled: checked })}
                    />
                  </div>

                  {currentConfig.endRedirectEnabled && (
                    <div className="space-y-1">
                      <Label className="text-xs">Redirect URL</Label>
                      <Input
                        value={currentConfig.endRedirectUrl}
                        onChange={(e) => updateConfig({ endRedirectUrl: e.target.value })}
                        placeholder="https://example.com/thank-you"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="theme">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Theme
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Logo URL</Label>
                    <Input
                      value={currentConfig.theme.logoUrl || ''}
                      onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, logoUrl: e.target.value } })}
                      placeholder="https://example.com/logo.png"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentConfig.theme.primaryColor || '#2563eb'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, primaryColor: e.target.value } })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={currentConfig.theme.primaryColor || '#2563eb'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, primaryColor: e.target.value } })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Secondary color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentConfig.theme.secondaryColor || '#64748b'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, secondaryColor: e.target.value } })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={currentConfig.theme.secondaryColor || '#64748b'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, secondaryColor: e.target.value } })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Bot bubble color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentConfig.theme.botBubbleColor || '#f1f5f9'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, botBubbleColor: e.target.value } })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={currentConfig.theme.botBubbleColor || '#f1f5f9'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, botBubbleColor: e.target.value } })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">User bubble color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentConfig.theme.userBubbleColor || '#2563eb'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, userBubbleColor: e.target.value } })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={currentConfig.theme.userBubbleColor || '#2563eb'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, userBubbleColor: e.target.value } })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Background</Label>
                    <Select
                      value={currentConfig.theme.backgroundType || 'solid'}
                      onValueChange={(val) => updateConfig({ theme: { ...currentConfig.theme, backgroundType: val as any } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="image">Image URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {currentConfig.theme.backgroundType === 'solid' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Background color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentConfig.theme.backgroundColor || '#ffffff'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, backgroundColor: e.target.value } })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={currentConfig.theme.backgroundColor || '#ffffff'}
                          onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, backgroundColor: e.target.value } })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {currentConfig.theme.backgroundType === 'gradient' && (
                    <div className="space-y-1">
                      <Label className="text-xs">CSS gradient</Label>
                      <Input
                        value={currentConfig.theme.backgroundGradient || ''}
                        onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, backgroundGradient: e.target.value } })}
                        placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {currentConfig.theme.backgroundType === 'image' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Background image URL</Label>
                      <Input
                        value={currentConfig.theme.backgroundImage || ''}
                        onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, backgroundImage: e.target.value } })}
                        placeholder="https://example.com/bg.jpg"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Font family</Label>
                    <Select
                      value={currentConfig.theme.fontFamily || 'Inter'}
                      onValueChange={(val) => updateConfig({ theme: { ...currentConfig.theme, fontFamily: val } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="system-ui">System UI</SelectItem>
                        <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                        <SelectItem value="Courier New">Courier New (Mono)</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Bubble style</Label>
                    <Select
                      value={currentConfig.theme.bubbleStyle || 'rounded'}
                      onValueChange={(val) => updateConfig({ theme: { ...currentConfig.theme, bubbleStyle: val as any } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Custom CSS (advanced)</Label>
                    <Textarea
                      value={currentConfig.theme.customCss || ''}
                      onChange={(e) => updateConfig({ theme: { ...currentConfig.theme, customCss: e.target.value } })}
                      placeholder=".chat-bubble { ... }"
                      className="text-xs font-mono min-h-[60px]"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Button style</Label>
                    <Select
                      value={currentConfig.theme.buttonStyle || 'rounded'}
                      onValueChange={(val) => updateConfig({ theme: { ...currentConfig.theme, buttonStyle: val } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="pill">Pill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Spacing</Label>
                    <Select
                      value={currentConfig.theme.spacing || 'normal'}
                      onValueChange={(val) => updateConfig({ theme: { ...currentConfig.theme, spacing: val } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="relaxed">Relaxed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="w-[55%] bg-slate-950 overflow-y-auto">
          <FormPreview
            config={currentConfig}
            formName={formName}
          />
        </div>
      </div>
    </div>
  );
}

function FormPreview({
  config,
  formName,
}: {
  config: FormConfig;
  formName: string;
}) {
  const [previewKey, setPreviewKey] = useState(0);

  const restartPreview = () => {
    setPreviewKey(k => k + 1);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-center gap-4 py-3 px-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Live preview</span>
        </div>
        <button
          onClick={restartPreview}
          className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Restart preview"
        >
          Restart
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white rounded-t-xl mx-2 mt-2 overflow-hidden">
          {config.questions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No questions yet</p>
                <p className="text-xs mt-1">Describe your situation in the AI Context panel to generate a conversation</p>
              </div>
            </div>
          ) : (
            <ConversationalForm
              key={previewKey}
              config={config}
              formName={formName || 'Form'}
              isPreview={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
