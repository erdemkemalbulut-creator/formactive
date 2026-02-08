'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FormConfig, Question, QuestionType, QUESTION_TYPES } from '@/lib/types';
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
  Clock,
  CheckSquare,
  ToggleLeft,
  Star,
  Upload,
  Shield,
  BarChart3,
  Settings,
  MessageSquare,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Type: <Type className="w-4 h-4" />,
  AlignLeft: <AlignLeft className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  Phone: <Phone className="w-4 h-4" />,
  Hash: <Hash className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  ChevronDown: <ChevronDown className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  CheckCircle: <Check className="w-4 h-4" />,
  ToggleLeft: <ToggleLeft className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Upload: <Upload className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
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
    placeholder: '',
    helpText: '',
    required: false,
    validation: {},
    options: type === 'dropdown' || type === 'multi_select'
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
  const [previewMode, setPreviewMode] = useState<'welcome' | 'form' | 'end'>('form');

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
      setCurrentConfig(form.current_config || makeDefaultConfig());
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
      {/* Top Bar */}
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

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Editor */}
        <div className="w-[45%] border-r border-slate-200 bg-white overflow-y-auto">
          <Accordion type="multiple" defaultValue={['questions', 'screens', 'settings']} className="px-4">
            {/* Panel 1: Questions */}
            <AccordionItem value="questions">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Questions ({currentConfig.questions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {currentConfig.questions.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                      <p className="text-slate-500 text-sm mb-3">Add your first question</p>
                      <Button variant="outline" size="sm" onClick={() => setShowTypePicker(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Add question
                      </Button>
                    </div>
                  )}

                  {currentConfig.questions.map((question) => {
                    const isExpanded = expandedQuestions.has(question.id);
                    const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type);

                    return (
                      <div key={question.id} className="border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2 p-3">
                          <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 cursor-grab" />
                          <Input
                            value={question.label}
                            onChange={(e) => {
                              const label = e.target.value;
                              const updates: Partial<Question> = { label };
                              if (!question.key || question.key === generateKeyFromLabel(question.label)) {
                                updates.key = generateKeyFromLabel(label);
                              }
                              updateQuestion(question.id, updates);
                            }}
                            placeholder="Question label"
                            className="flex-1 h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
                          />
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {typeInfo?.label || question.type}
                          </Badge>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Switch
                              checked={question.required}
                              onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                              className="scale-75"
                            />
                            <span className="text-[10px] text-slate-400">Req</span>
                          </div>
                          <button
                            onClick={() => toggleQuestionExpanded(question.id)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/50">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(val: QuestionType) => {
                                  const updates: Partial<Question> = { type: val };
                                  if ((val === 'dropdown' || val === 'multi_select') && question.options.length === 0) {
                                    updates.options = [{ id: `o_${Date.now()}`, label: 'Option 1', value: 'option_1' }];
                                  }
                                  updateQuestion(question.id, updates);
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUESTION_TYPES.map((qt) => (
                                    <SelectItem key={qt.value} value={qt.value}>
                                      <span className="flex items-center gap-2">
                                        {ICON_MAP[qt.icon]}
                                        {qt.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Key / Slug</Label>
                              <Input
                                value={question.key}
                                onChange={(e) => updateQuestion(question.id, { key: e.target.value })}
                                placeholder="auto_generated_key"
                                className="h-8 text-sm font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                value={question.placeholder}
                                onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                                placeholder="Placeholder text..."
                                className="h-8 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Help text</Label>
                              <Input
                                value={question.helpText}
                                onChange={(e) => updateQuestion(question.id, { helpText: e.target.value })}
                                placeholder="Additional context..."
                                className="h-8 text-sm"
                              />
                            </div>

                            {(question.type === 'dropdown' || question.type === 'multi_select') && (
                              <div className="space-y-2">
                                <Label className="text-xs">Options</Label>
                                {question.options.map((opt) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <Input
                                      value={opt.label}
                                      onChange={(e) => updateOption(question.id, opt.id, { label: e.target.value })}
                                      placeholder="Label"
                                      className="h-7 text-xs flex-1"
                                    />
                                    <Input
                                      value={opt.value}
                                      onChange={(e) => updateOption(question.id, opt.id, { value: e.target.value })}
                                      placeholder="Value"
                                      className="h-7 text-xs flex-1 font-mono"
                                    />
                                    <button
                                      onClick={() => removeOption(question.id, opt.id)}
                                      className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOption(question.id)}
                                  className="h-7 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Add option
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => duplicateQuestion(question.id)}
                                className="h-7 text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1" /> Duplicate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteQuestion(question.id)}
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {currentConfig.questions.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowTypePicker(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add question
                    </Button>
                  )}

                  {showTypePicker && (
                    <div className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Choose question type</p>
                        <button onClick={() => setShowTypePicker(false)} className="p-1 hover:bg-slate-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {QUESTION_TYPES.map((qt) => (
                          <button
                            key={qt.value}
                            onClick={() => addQuestion(qt.value)}
                            className="flex items-center gap-2 p-2 text-left text-sm rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-slate-500">{ICON_MAP[qt.icon]}</span>
                            {qt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Panel 2: Welcome & End Screen */}
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

            {/* Panel 3: Settings */}
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

        {/* Right Column - Live Preview */}
        <div className="w-[55%] bg-slate-950 overflow-y-auto">
          <FormPreview
            config={currentConfig}
            formName={formName}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />
        </div>
      </div>
    </div>
  );
}

function FormPreview({
  config,
  formName,
  previewMode,
  onPreviewModeChange,
}: {
  config: FormConfig;
  formName: string;
  previewMode: 'welcome' | 'form' | 'end';
  onPreviewModeChange: (mode: 'welcome' | 'form' | 'end') => void;
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
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No questions yet</p>
                <p className="text-xs mt-1">Add questions in the editor to see the conversation</p>
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

