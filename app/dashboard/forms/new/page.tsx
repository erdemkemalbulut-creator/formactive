'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatPreview } from '@/components/chat-preview';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plane,
  Users,
  Sparkles,
  FileText,
  Info,
  Copy,
  ExternalLink,
  Code,
  CheckCircle2,
  Eye,
  BarChart3,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  PenLine,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type DataField = {
  name: string;
  type: string;
  required: boolean;
  label: string;
  helpText: string;
  exampleAnswer?: string;
};

type Preset = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  dataFields: DataField[];
  defaultRules: string;
  tags?: string[];
};

const presets: Preset[] = [
  {
    id: 'trip-request',
    name: 'General travel inquiry',
    description: 'A flexible starting point for trips, events, concierge, and more.',
    icon: Plane,
    tags: ['Trip', 'Event', 'Concierge', 'Other'],
    dataFields: [
      { name: 'traveler_name', type: 'text', required: true, label: 'Traveler name', helpText: 'Full name of the traveler', exampleAnswer: 'John Smith' },
      { name: 'destination', type: 'text', required: true, label: 'Destination', helpText: 'Where they want to travel', exampleAnswer: 'Santorini, Greece' },
      { name: 'travel_dates', type: 'text', required: true, label: 'Travel dates', helpText: 'Preferred departure and return dates', exampleAnswer: 'Sep 15 – Sep 22' },
      { name: 'budget', type: 'text', required: true, label: 'Budget', helpText: 'Total budget for the trip', exampleAnswer: '$5,000' },
      { name: 'email', type: 'email', required: true, label: 'Email', helpText: 'Contact email address', exampleAnswer: 'john@example.com' },
    ],
    defaultRules: 'Guide the conversation naturally to understand their trip requirements. Be helpful and ask one question at a time.',
  },
  {
    id: 'group-itinerary',
    name: 'Group / multi-person planning',
    description: 'Ideal for groups, retreats, weddings, and corporate travel.',
    icon: Users,
    tags: ['Group', 'Retreat', 'Wedding', 'Corporate'],
    dataFields: [
      { name: 'organizer_name', type: 'text', required: true, label: 'Organizer name', helpText: 'Name of the group organizer', exampleAnswer: 'Sarah Chen' },
      { name: 'group_size', type: 'number', required: true, label: 'Group size', helpText: 'Total number of travelers', exampleAnswer: '8' },
      { name: 'destination', type: 'text', required: true, label: 'Destination', helpText: 'Where the group wants to travel', exampleAnswer: 'Costa Rica' },
      { name: 'travel_dates', type: 'text', required: true, label: 'Travel dates', helpText: 'Preferred travel period', exampleAnswer: 'July 2026' },
      { name: 'trip_purpose', type: 'text', required: true, label: 'Trip purpose', helpText: 'What type of trip (family reunion, corporate, celebration)', exampleAnswer: 'Family reunion' },
      { name: 'email', type: 'email', required: true, label: 'Email', helpText: 'Primary contact email', exampleAnswer: 'sarah@example.com' },
      { name: 'phone', type: 'phone', required: true, label: 'Phone', helpText: 'Contact phone number', exampleAnswer: '+1 (555) 987-6543' },
    ],
    defaultRules: 'Help coordinate group travel details. Ask about the group dynamics and special requirements naturally.',
  },
  {
    id: 'luxury-brief',
    name: 'Premium / VIP request',
    description: 'More detail for high-touch, premium service.',
    icon: Sparkles,
    tags: ['Luxury', 'Concierge', 'High-touch'],
    dataFields: [
      { name: 'client_name', type: 'text', required: true, label: 'Client name', helpText: 'Full name of the client', exampleAnswer: 'Alexandra Monroe' },
      { name: 'destination_preferences', type: 'text', required: true, label: 'Destination preferences', helpText: 'Desired destinations or regions', exampleAnswer: 'Maldives or Seychelles' },
      { name: 'travel_style', type: 'text', required: true, label: 'Travel style', helpText: 'Adventure, relaxation, cultural, culinary', exampleAnswer: 'Relaxation & culinary' },
      { name: 'accommodations', type: 'text', required: true, label: 'Accommodation preferences', helpText: '5-star hotels, private villas, boutique properties', exampleAnswer: 'Overwater villa' },
      { name: 'duration', type: 'text', required: true, label: 'Trip duration', helpText: 'How long they want to travel', exampleAnswer: '10 days' },
      { name: 'budget_range', type: 'text', required: true, label: 'Budget range', helpText: 'Investment level for this experience', exampleAnswer: '$15,000 – $25,000' },
      { name: 'special_requests', type: 'text', required: true, label: 'Special requests', helpText: 'Private tours, dining experiences, exclusive access', exampleAnswer: 'Private yacht dinner' },
      { name: 'email', type: 'email', required: true, label: 'Email', helpText: 'Preferred contact email', exampleAnswer: 'alexandra@example.com' },
    ],
    defaultRules: 'Use refined, elegant language that reflects premium service. Understand their vision for an exceptional experience.',
  },
  {
    id: 'blank',
    name: 'Start from scratch',
    description: 'Build a custom conversation from a blank slate.',
    icon: FileText,
    tags: ['Custom'],
    dataFields: [
      { name: 'name', type: 'text', required: true, label: 'Name', helpText: 'Customer name', exampleAnswer: 'Jane Doe' },
      { name: 'email', type: 'email', required: true, label: 'Email', helpText: 'Contact email', exampleAnswer: 'jane@example.com' },
    ],
    defaultRules: 'Have a friendly, natural conversation. Ask questions one at a time and keep responses brief.',
  },
];

const toneOptions = [
  { id: 'professional', name: 'Professional', description: 'Clear, confident, consultation-style' },
  { id: 'friendly', name: 'Friendly', description: 'Warm, welcoming, easy to answer', recommended: true },
  { id: 'luxury', name: 'Luxury', description: 'Polished, elevated, premium experience' },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function NewFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [entryChoice, setEntryChoice] = useState<'template' | 'scratch' | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [dataFields, setDataFields] = useState<DataField[]>(presets[0].dataFields);
  const [tone, setTone] = useState('friendly');
  const [formName, setFormName] = useState(presets[0].name);
  const [isCreating, setIsCreating] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  const [isPublished, setIsPublished] = useState(false);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [createdFormSlug, setCreatedFormSlug] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const changeStep = useCallback((newStep: number) => {
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobilePreviewOpen(false);
  }, []);

  useEffect(() => {
    if (step === 4 && !createdFormId && !isCreating) {
      handleCreateDraft();
    }
  }, [step]);

  const handleEntryChoice = (choice: 'template' | 'scratch') => {
    setEntryChoice(choice);
    if (choice === 'scratch') {
      const blankPreset = presets.find((p) => p.id === 'blank')!;
      setSelectedPreset(blankPreset);
      setDataFields(blankPreset.dataFields);
      setFormName(blankPreset.name);
      setActiveQuestionIndex(0);
      changeStep(2);
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    setDataFields(preset.dataFields);
    setFormName(preset.name);
    setActiveQuestionIndex(0);
  };

  const handleFieldUpdate = (index: number, field: string, value: string | boolean) => {
    const updated = [...dataFields];
    updated[index] = { ...updated[index], [field]: value };
    setDataFields(updated);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreateDraft = async () => {
    if (!user || !selectedPreset) return;
    setIsCreating(true);
    try {
      const slug = `${generateSlug(formName)}-${Date.now()}`;
      const toneInstructions: Record<string, string> = {
        professional: 'Maintain a professional and business-appropriate tone throughout the conversation.',
        friendly: 'Use a warm, friendly, and conversational tone. Make the experience feel personal and welcoming.',
        luxury: 'Use refined, elegant language that reflects premium service and attention to detail.',
      };
      const conversationRules = `${selectedPreset.defaultRules}\n\n${toneInstructions[tone] || ''}`;
      const businessInfo = { companyName, logoUrl, primaryColor, contactEmail, whatsappLink, tone };

      const { data, error } = await supabase
        .from('forms')
        .insert({
          user_id: user.id,
          name: formName,
          slug,
          conversation_rules: conversationRules,
          data_fields: dataFields,
          business_info: businessInfo,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      setCreatedFormId(data.id);
      setCreatedFormSlug(data.slug);
      setIsPublished(false);
    } catch (error: any) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePublishForm = async () => {
    if (!createdFormId) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('forms').update({ is_published: true }).eq('id', createdFormId);
      if (error) throw error;
      setIsPublished(true);
      toast({ title: 'You\'re live!', description: 'Your request is ready to receive responses.' });
    } catch (error: any) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const getFormUrl = () => {
    if (typeof window === 'undefined' || !createdFormSlug) return '';
    return `${window.location.origin}/f/${createdFormSlug}`;
  };

  const getEmbedCode = () => {
    const url = getFormUrl();
    return `<iframe src="${url}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const canProceedToStep2 = selectedPreset !== null;

  const step2HasEmptyLabels = dataFields.some((f) => !f.label.trim());

  const step3MissingFields: string[] = [];
  if (!formName.trim()) step3MissingFields.push('Internal name');
  if (!companyName.trim()) step3MissingFields.push('Company name');
  if (!contactEmail.trim()) step3MissingFields.push('Contact email');
  else if (!isValidEmail(contactEmail)) step3MissingFields.push('Valid contact email');

  const canProceedToStep3 = !step2HasEmptyLabels;
  const canProceedToStep4 = step3MissingFields.length === 0;

  const stepLabels = ['Start', 'Questions', 'Tone & branding', 'Review'];

  const previewPane = (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live preview</span>
      </div>
      <p className="text-xs text-slate-400 mb-2">Updates as you make changes — this is what your guest will see.</p>
      <div className="lg:sticky lg:top-4">
        <ChatPreview
          dataFields={dataFields}
          activeQuestionIndex={activeQuestionIndex}
          companyName={companyName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          tone={tone}
          formName={formName}
        />
      </div>
    </div>
  );

  const mobilePreviewToggle = (
    <div className="lg:hidden mt-6">
      <button
        type="button"
        onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          {mobilePreviewOpen ? 'Hide preview' : 'Show live preview'}
        </span>
        {mobilePreviewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {mobilePreviewOpen && <div className="mt-4">{previewPane}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" ref={containerRef}>
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (step === 1 && !entryChoice) {
                    router.push('/dashboard');
                  } else if (step === 1 && entryChoice) {
                    setEntryChoice(null);
                    setSelectedPreset(null);
                    setDataFields(presets[0].dataFields);
                    setFormName(presets[0].name);
                    setActiveQuestionIndex(0);
                  } else {
                    changeStep(step - 1);
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">New conversation</h1>
                <p className="text-sm text-slate-500">Step {step} of 4 — {stepLabels[step - 1]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex items-center flex-1 gap-1">
                  <div className="flex flex-col items-center flex-1 gap-1">
                    <div
                      className={`h-2 rounded-full w-full transition-colors ${
                        s <= step ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    />
                    <span className={`text-xs hidden sm:block ${s <= step ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 && !entryChoice && (
          <div className="max-w-xl mx-auto text-center">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">How would you like to start?</h2>
              <p className="text-slate-500 text-lg">You can always change everything later.</p>
            </div>

            <div className="space-y-4">
              <Card
                className="p-6 cursor-pointer transition-all hover:shadow-md border-slate-200 hover:border-slate-300 text-left"
                onClick={() => handleEntryChoice('template')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-900">
                    <LayoutTemplate className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">Use a starting point</h3>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-sm text-slate-500">Pick a pre-built set of questions and customize from there.</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer transition-all hover:shadow-md border-slate-200 hover:border-slate-300 text-left"
                onClick={() => handleEntryChoice('scratch')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-100">
                    <PenLine className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Start from scratch</h3>
                    <p className="text-sm text-slate-500">Begin with an empty conversation and add your own questions.</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 1 && entryChoice === 'template' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose a starting point</h2>
              <p className="text-slate-500">Pick a starting point — you can customize everything next.</p>
            </div>

            <div className="space-y-3">
              {presets.filter((p) => p.id !== 'blank').map((preset) => {
                const Icon = preset.icon;
                const requiredCount = preset.dataFields.filter((f) => f.required).length;
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <Card
                    key={preset.id}
                    className={`p-5 cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-2 border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg transition-colors ${isSelected ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 mb-0.5">{preset.name}</h3>
                        <p className="text-sm text-slate-500 mb-2">{preset.description}</p>
                        {preset.tags && preset.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {preset.tags.map((tag) => (
                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between items-center">
              <Button variant="ghost" className="text-slate-500" onClick={() => {
                setEntryChoice(null);
                setSelectedPreset(null);
                setDataFields(presets[0].dataFields);
                setFormName(presets[0].name);
                setActiveQuestionIndex(0);
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button size="lg" disabled={!canProceedToStep2} onClick={() => changeStep(2)}>
                Next: Questions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && selectedPreset && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Define your questions</h2>
                <p className="text-slate-500">Each question is asked one at a time during the conversation.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>You can edit:</strong> Question wording, helper text, and example answers.{' '}
                  <strong>Coming soon:</strong> Adding or removing questions and changing answer types.
                </p>
              </div>

              {dataFields.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg py-14 mb-4">
                  <div className="text-center max-w-xs mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1">No questions yet</h4>
                    <p className="text-sm text-slate-500 mb-4">
                      Questions define what information your conversation will collect.
                    </p>
                    <Button variant="outline" onClick={() => {
                      toast({ title: 'Coming soon', description: 'Adding questions will be available in the next update.' });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add a question
                    </Button>
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                {dataFields.map((field, index) => (
                  <Card
                    key={index}
                    className={`p-5 cursor-pointer transition-all ${
                      activeQuestionIndex === index ? 'border-2 border-slate-900 shadow-sm' : 'border-slate-200'
                    }`}
                    onClick={() => setActiveQuestionIndex(index)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            activeQuestionIndex === index
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-sm font-mono text-slate-500">{field.name}</span>
                        {field.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      </div>
                    </div>

                    {activeQuestionIndex === index && (
                      <div className="space-y-4 mt-4 border-t border-slate-100 pt-4">
                        <div>
                          <Label htmlFor={`label-${index}`}>
                            Question <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={`label-${index}`}
                            value={field.label}
                            onChange={(e) => handleFieldUpdate(index, 'label', e.target.value)}
                            onBlur={() => markTouched(`label-${index}`)}
                            placeholder="e.g. What are you planning?"
                            className="mt-1.5"
                          />
                          {touched[`label-${index}`] && !field.label.trim() && (
                            <p className="text-xs text-red-500 mt-1">Question is required</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">This is the main question the AI will ask</p>
                        </div>
                        <div>
                          <Label htmlFor={`help-${index}`}>Helper text</Label>
                          <Textarea
                            id={`help-${index}`}
                            value={field.helpText}
                            onChange={(e) => handleFieldUpdate(index, 'helpText', e.target.value)}
                            placeholder="Optional: add context to help the guest answer accurately."
                            className="mt-1.5"
                            rows={2}
                          />
                          <p className="text-xs text-slate-500 mt-1">Shown under the question to guide the guest.</p>
                        </div>
                        <div>
                          <Label htmlFor={`example-${index}`}>Example answer</Label>
                          <Input
                            id={`example-${index}`}
                            value={field.exampleAnswer || ''}
                            onChange={(e) => handleFieldUpdate(index, 'exampleAnswer', e.target.value)}
                            placeholder="Optional: show a sample answer for the preview."
                            className="mt-1.5"
                          />
                          <p className="text-xs text-slate-500 mt-1">Used only for the preview.</p>
                        </div>
                      </div>
                    )}

                    {activeQuestionIndex !== index && (
                      <p className="text-sm text-slate-600 ml-8 truncate">
                        {field.label || <span className="italic text-slate-400">No question text</span>}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
              )}

              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: 'Coming soon',
                      description: 'AI-powered question suggestions will be available in the next update.',
                    });
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate suggestions
                </Button>
              </div>

              {mobilePreviewToggle}

              <div className="mt-8 flex justify-between items-start gap-4">
                <Button variant="outline" onClick={() => changeStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="lg" disabled={!canProceedToStep3} onClick={() => changeStep(3)}>
                    Next: Tone & branding
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {step2HasEmptyLabels && (
                    <p className="text-xs text-amber-600">Fill in all questions to continue.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:block">{previewPane}</div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Tone & branding</h2>
                <p className="text-slate-500">Shape how the conversation looks and feels.</p>
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Form details</h3>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="form-name">
                        Internal name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="form-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        onBlur={() => markTouched('formName')}
                        placeholder="e.g., New Request"
                        className={`mt-1.5 ${touched.formName && !formName.trim() ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      />
                      {touched.formName && !formName.trim() ? (
                        <p className="text-xs text-red-500 mt-1">Add an internal name to continue.</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">Only you see this in your dashboard.</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company-name">
                        Company name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        onBlur={() => markTouched('companyName')}
                        placeholder="e.g., Atlas Travel"
                        className={`mt-1.5 ${touched.companyName && !companyName.trim() ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      />
                      {touched.companyName && !companyName.trim() ? (
                        <p className="text-xs text-red-500 mt-1">Company name is required</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">Shown to guests during the conversation.</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Branding</h3>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="logo-url">Logo URL</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="logo-url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="flex-1"
                        />
                        {logoUrl && (
                          <div className="w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={logoUrl}
                              alt="Logo preview"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Optional — displayed at the top of the conversation.</p>
                    </div>

                    <div>
                      <Label htmlFor="primary-color">Brand color</Label>
                      <div className="flex gap-3 mt-1.5 items-center">
                        <input
                          type="color"
                          id="primary-color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded border border-slate-200 cursor-pointer p-0.5"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#0f172a"
                          className="w-32"
                        />
                        <div
                          className="w-6 h-6 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Used for buttons and highlights.</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Conversation tone</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Tone affects phrasing, not what data is collected. The same information will be gathered regardless of tone.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="space-y-3">
                    {toneOptions.map((option) => {
                      const isSelected = tone === option.id;
                      return (
                        <div
                          key={option.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={() => setTone(option.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setTone(option.id);
                            }
                          }}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {option.name}
                                </span>
                                {option.recommended && (
                                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5">{option.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Contact information</h3>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="contact-email">
                        Contact email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        onBlur={() => markTouched('contactEmail')}
                        placeholder="e.g., hello@atlastravel.com"
                        className={`mt-1.5 ${
                          touched.contactEmail && (!contactEmail.trim() || !isValidEmail(contactEmail))
                            ? 'border-red-300 focus-visible:ring-red-200'
                            : ''
                        }`}
                      />
                      {touched.contactEmail && !contactEmail.trim() ? (
                        <p className="text-xs text-red-500 mt-1">Contact email is required</p>
                      ) : touched.contactEmail && !isValidEmail(contactEmail) ? (
                        <p className="text-xs text-red-500 mt-1">Enter a valid email address.</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">Guests can use this if they need help.</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="whatsapp-link">WhatsApp link</Label>
                      <Input
                        id="whatsapp-link"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        placeholder="e.g., https://wa.me/441234567890"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-slate-500 mt-1">Optional alternative contact method</p>
                    </div>
                  </div>
                </Card>
              </div>

              {mobilePreviewToggle}

              <div className="mt-8 flex justify-between items-start gap-4">
                <Button variant="outline" onClick={() => changeStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="lg" disabled={!canProceedToStep4} onClick={() => changeStep(4)}>
                    Next: Review
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {step3MissingFields.length > 0 && (
                    <p className="text-xs text-amber-600 text-right">
                      Missing: {step3MissingFields.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:block">{previewPane}</div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-5xl mx-auto">
            {isCreating ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
                  <p className="text-slate-600">Creating...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">Ready to share?</h2>
                    <Badge variant={isPublished ? 'default' : 'secondary'}>
                      {isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-slate-600">
                    {isPublished
                      ? 'Your conversation is live and accepting responses.'
                      : 'Review everything before publishing.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Request details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Internal name</span>
                          <span className="text-sm font-medium text-slate-900">{formName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Company</span>
                          <span className="text-sm font-medium text-slate-900">{companyName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Starting point</span>
                          <span className="text-sm font-medium text-slate-900">{selectedPreset?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Tone</span>
                          <span className="text-sm font-medium text-slate-900 capitalize">{tone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Contact email</span>
                          <span className="text-sm font-medium text-slate-900 text-right break-all">{contactEmail}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Questions to ask</h3>
                      <div className="space-y-3">
                        {dataFields.map((field, index) => (
                          <div key={index} className="flex items-start gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-slate-600">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-slate-900 font-medium">{field.label}</p>
                                {field.required && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">Required</Badge>
                                )}
                              </div>
                              {field.helpText && (
                                <p className="text-slate-600 text-xs mt-0.5">{field.helpText}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">Share link</h3>
                        {!isPublished && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Create your request to activate the share link</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className={`flex gap-2 ${!isPublished ? 'opacity-50' : ''}`}>
                        <Input
                          value={isPublished ? getFormUrl() : 'Create request to activate link'}
                          readOnly
                          disabled={!isPublished}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button variant="outline" size="icon" disabled={!isPublished} onClick={() => copyToClipboard(getFormUrl(), 'Link')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {!isPublished && (
                        <p className="text-xs text-slate-500 mt-2">Your request is saved as a draft. Publish to share it.</p>
                      )}
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="p-6 bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Guest preview</h3>
                      </div>
                      <ChatPreview
                        dataFields={dataFields}
                        activeQuestionIndex={0}
                        companyName={companyName}
                        logoUrl={logoUrl}
                        primaryColor={primaryColor}
                        tone={tone}
                        formName={formName}
                      />
                      <p className="text-xs text-slate-500 mt-3">
                        This shows how the conversation starts. The AI will naturally guide guests through each question.
                      </p>
                    </Card>
                  </div>
                </div>

                {!isPublished ? (
                  <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => changeStep(3)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button size="lg" onClick={handlePublishForm} disabled={isPublishing}>
                      {isPublishing ? 'Creating...' : 'Create request'}
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <Card className="mt-8 p-6 bg-green-50 border-green-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-2">Request published successfully!</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Your request is now live. Share it with guests or embed it on your website.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="default" onClick={() => router.push('/dashboard')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                          </Button>
                          <Button variant="outline" onClick={() => copyToClipboard(getFormUrl(), 'Link')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy link
                          </Button>
                          <Button variant="outline" onClick={() => copyToClipboard(getEmbedCode(), 'Embed code')}>
                            <Code className="w-4 h-4 mr-2" />
                            Embed
                          </Button>
                          <Button variant="outline" onClick={() => window.open(getFormUrl(), '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View request
                          </Button>
                          <Button variant="outline" onClick={() => router.push(`/dashboard/forms/${createdFormId}/results`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View results
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
