'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plane,
  Users,
  Sparkles,
  FileText,
  Upload,
  Info,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  Code,
  CheckCircle2,
  Eye,
  BarChart3,
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
  icon: any;
  dataFields: DataField[];
  defaultRules: string;
};

const presets: Preset[] = [
  {
    id: 'trip-request',
    name: 'Trip request',
    description: 'Capture trip details for individual travelers',
    icon: Plane,
    dataFields: [
      {
        name: 'traveler_name',
        type: 'text',
        required: true,
        label: 'Traveler name',
        helpText: 'Full name of the traveler',
      },
      {
        name: 'destination',
        type: 'text',
        required: true,
        label: 'Destination',
        helpText: 'Where they want to travel',
      },
      {
        name: 'travel_dates',
        type: 'text',
        required: true,
        label: 'Travel dates',
        helpText: 'Preferred departure and return dates',
      },
      {
        name: 'budget',
        type: 'text',
        required: true,
        label: 'Budget',
        helpText: 'Total budget for the trip',
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        label: 'Email',
        helpText: 'Contact email address',
      },
    ],
    defaultRules: 'Guide the conversation naturally to understand their trip requirements. Be helpful and ask one question at a time.',
  },
  {
    id: 'group-itinerary',
    name: 'Group itinerary',
    description: 'Plan trips for groups and families',
    icon: Users,
    dataFields: [
      {
        name: 'organizer_name',
        type: 'text',
        required: true,
        label: 'Organizer name',
        helpText: 'Name of the group organizer',
      },
      {
        name: 'group_size',
        type: 'number',
        required: true,
        label: 'Group size',
        helpText: 'Total number of travelers',
      },
      {
        name: 'destination',
        type: 'text',
        required: true,
        label: 'Destination',
        helpText: 'Where the group wants to travel',
      },
      {
        name: 'travel_dates',
        type: 'text',
        required: true,
        label: 'Travel dates',
        helpText: 'Preferred travel period',
      },
      {
        name: 'trip_purpose',
        type: 'text',
        required: true,
        label: 'Trip purpose',
        helpText: 'What type of trip (family reunion, corporate, celebration)',
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        label: 'Email',
        helpText: 'Primary contact email',
      },
      {
        name: 'phone',
        type: 'phone',
        required: true,
        label: 'Phone',
        helpText: 'Contact phone number',
      },
    ],
    defaultRules: 'Help coordinate group travel details. Ask about the group dynamics and special requirements naturally.',
  },
  {
    id: 'luxury-brief',
    name: 'Luxury travel brief',
    description: 'High-end travel consultation and planning',
    icon: Sparkles,
    dataFields: [
      {
        name: 'client_name',
        type: 'text',
        required: true,
        label: 'Client name',
        helpText: 'Full name of the client',
      },
      {
        name: 'destination_preferences',
        type: 'text',
        required: true,
        label: 'Destination preferences',
        helpText: 'Desired destinations or regions',
      },
      {
        name: 'travel_style',
        type: 'text',
        required: true,
        label: 'Travel style',
        helpText: 'Adventure, relaxation, cultural, culinary',
      },
      {
        name: 'accommodations',
        type: 'text',
        required: true,
        label: 'Accommodation preferences',
        helpText: '5-star hotels, private villas, boutique properties',
      },
      {
        name: 'duration',
        type: 'text',
        required: true,
        label: 'Trip duration',
        helpText: 'How long they want to travel',
      },
      {
        name: 'budget_range',
        type: 'text',
        required: true,
        label: 'Budget range',
        helpText: 'Investment level for this experience',
      },
      {
        name: 'special_requests',
        type: 'text',
        required: true,
        label: 'Special requests',
        helpText: 'Private tours, dining experiences, exclusive access',
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        label: 'Email',
        helpText: 'Preferred contact email',
      },
    ],
    defaultRules: 'Use refined, elegant language that reflects premium service. Understand their vision for an exceptional experience.',
  },
  {
    id: 'blank',
    name: 'Blank form',
    description: 'Start from scratch with no preset fields',
    icon: FileText,
    dataFields: [
      {
        name: 'name',
        type: 'text',
        required: true,
        label: 'Name',
        helpText: 'Customer name',
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        label: 'Email',
        helpText: 'Contact email',
      },
    ],
    defaultRules: 'Have a friendly, natural conversation. Ask questions one at a time and keep responses brief.',
  },
];

const toneOptions = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clear, polished, business-appropriate',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, conversational, approachable',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Refined, elegant, premium service',
  },
];

export default function NewFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(presets[0]);
  const [dataFields, setDataFields] = useState<DataField[]>(presets[0].dataFields);
  const [tone, setTone] = useState('friendly');
  const [formName, setFormName] = useState(presets[0].name);
  const [isCreating, setIsCreating] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  const [isPublished, setIsPublished] = useState(false);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [createdFormSlug, setCreatedFormSlug] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (step === 4 && !createdFormId && !isCreating) {
      handleCreateDraft();
    }
  }, [step]);

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    setDataFields(preset.dataFields);
    setFormName(preset.name);
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

      const toneInstructions = {
        professional: 'Maintain a professional and business-appropriate tone throughout the conversation.',
        friendly: 'Use a warm, friendly, and conversational tone. Make the experience feel personal and welcoming.',
        luxury: 'Use refined, elegant language that reflects premium service and attention to detail.',
      };

      const conversationRules = `${selectedPreset.defaultRules}\n\n${toneInstructions[tone as keyof typeof toneInstructions]}`;

      const businessInfo = {
        companyName,
        logoUrl,
        primaryColor,
        contactEmail,
        whatsappLink,
        tone,
      };

      const { data, error } = await supabase
        .from('forms')
        .insert({
          user_id: user.id,
          name: formName,
          slug: slug,
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
      toast({
        title: 'Error creating form',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePublishForm = async () => {
    if (!createdFormId) return;

    setIsPublishing(true);

    try {
      const { error } = await supabase
        .from('forms')
        .update({ is_published: true })
        .eq('id', createdFormId);

      if (error) throw error;

      setIsPublished(true);

      toast({
        title: 'Form published',
        description: 'Your form is now live and ready to receive responses.',
      });
    } catch (error: any) {
      toast({
        title: 'Error publishing form',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
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
  const canProceedToStep3 = true;
  const canProceedToStep4 = formName.trim() !== '' && companyName.trim() !== '' && contactEmail.trim() !== '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step === 1 ? router.push('/dashboard') : setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Create New Form</h1>
                <p className="text-sm text-slate-600">Step {step} of 4</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`h-2 rounded-full flex-1 transition-colors ${
                    s <= step ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Start from a preset
              </h2>
              <p className="text-slate-600">
                Choose a template designed for your use case
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {presets.slice(0, 3).map((preset) => {
                const Icon = preset.icon;
                const requiredCount = preset.dataFields.filter(f => f.required).length;
                return (
                  <Card
                    key={preset.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                      selectedPreset?.id === preset.id
                        ? 'border-2 border-slate-900 bg-slate-50'
                        : 'border-slate-200'
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        selectedPreset?.id === preset.id
                          ? 'bg-slate-900'
                          : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          selectedPreset?.id === preset.id
                            ? 'text-white'
                            : 'text-slate-700'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {preset.name}
                        </h3>
                        <p className="text-sm text-slate-600 mb-2">
                          {preset.description}
                        </p>
                        <p className="text-xs text-slate-500">
                          Includes: {requiredCount} required field{requiredCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {selectedPreset?.id === preset.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="border-t border-slate-200 pt-6">
              {presets.slice(3).map((preset) => {
                const Icon = preset.icon;
                return (
                  <Card
                    key={preset.id}
                    className={`p-4 cursor-pointer transition-all hover:border-slate-300 ${
                      selectedPreset?.id === preset.id
                        ? 'border-2 border-slate-400 bg-slate-50'
                        : 'border-slate-200 bg-white'
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          {preset.name}
                        </p>
                      </div>
                      {selectedPreset?.id === preset.id && (
                        <Check className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                disabled={!canProceedToStep2}
                onClick={() => setStep(2)}
              >
                Next: Questions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && selectedPreset && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Questions
              </h2>
              <p className="text-slate-600">
                Customize how each question is asked during the conversation
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>You can edit:</strong> Question text, helper text, and example answers. <strong>Locked in v1:</strong> Field names, types, and required/optional status ensure data consistency.
              </p>
            </div>

            <div className="space-y-6">
              {dataFields.map((field, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-slate-500">
                          {field.name}
                        </span>
                        {field.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Field name and type cannot be changed
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`label-${index}`}>
                        Question text <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`label-${index}`}
                        value={field.label}
                        onChange={(e) =>
                          handleFieldUpdate(index, 'label', e.target.value)
                        }
                        placeholder="Write the question exactly as you want clients to see it."
                        className="mt-1.5"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        This is the main question the AI will ask
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`help-${index}`}>
                        Helper text
                      </Label>
                      <Textarea
                        id={`help-${index}`}
                        value={field.helpText}
                        onChange={(e) =>
                          handleFieldUpdate(index, 'helpText', e.target.value)
                        }
                        placeholder="Optional: add context to help the client answer accurately."
                        className="mt-1.5"
                        rows={2}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Guides the AI on how to frame or explain the question
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`example-${index}`}>
                        Example answer
                      </Label>
                      <Input
                        id={`example-${index}`}
                        value={field.exampleAnswer || ''}
                        onChange={(e) =>
                          handleFieldUpdate(index, 'exampleAnswer', e.target.value)
                        }
                        placeholder="Optional: show a sample answer to guide clients."
                        className="mt-1.5"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Shows users what format you expect
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

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

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                Next: Brand & tone
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Brand & tone
              </h2>
              <p className="text-slate-600">
                Customize your form's appearance and conversation style
              </p>
            </div>

            <div className="space-y-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">
                  Form details
                </h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="form-name">
                      Form name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="form-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Trip Request Form"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      For your reference in the dashboard
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="company-name">
                      Company name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Atlas Travel"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Shown to customers during the conversation
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">
                  Branding
                </h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="logo-url">
                      Logo URL
                    </Label>
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
                    <p className="text-xs text-slate-500 mt-1">
                      PNG or JPG. Recommended: 512×512.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="primary-color">
                      Primary color
                    </Label>
                    <div className="flex gap-3 mt-1.5">
                      <input
                        type="color"
                        id="primary-color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-10 rounded border border-slate-200 cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#0f172a"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Used for buttons and accents
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Conversation tone
                  </h3>
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

                <RadioGroup value={tone} onValueChange={setTone} className="space-y-3">
                  {toneOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={`p-4 cursor-pointer transition-all ${
                        tone === option.id
                          ? 'border-2 border-slate-900 bg-slate-50'
                          : 'border-slate-200'
                      }`}
                      onClick={() => setTone(option.id)}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                        <div className="flex-1">
                          <Label
                            htmlFor={option.id}
                            className="font-semibold text-slate-900 cursor-pointer"
                          >
                            {option.name}
                          </Label>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </RadioGroup>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">
                  Contact information
                </h3>
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
                      placeholder="e.g., hello@atlastravel.com"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      For customer support inquiries
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="whatsapp-link">
                      WhatsApp link
                    </Label>
                    <Input
                      id="whatsapp-link"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="e.g., https://wa.me/441234567890"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Optional alternative contact method
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button size="lg" disabled={!canProceedToStep4} onClick={() => setStep(4)}>
                Next: Review & publish
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            {isCreating ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
                  <p className="text-slate-600">Creating your form...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Review & publish
                    </h2>
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-slate-600">
                    {isPublished
                      ? 'Your form is live and accepting responses'
                      : 'Review your form and publish to make it live'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Form details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Form name</span>
                          <span className="text-sm font-medium text-slate-900">{formName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Company</span>
                          <span className="text-sm font-medium text-slate-900">{companyName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Template</span>
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
                      <h3 className="font-semibold text-slate-900 mb-4">Data to collect</h3>
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
                        <h3 className="font-semibold text-slate-900">Public link</h3>
                        {!isPublished && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Publish your form to activate the public link</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      <div className={`flex gap-2 ${!isPublished ? 'opacity-50' : ''}`}>
                        <Input
                          value={isPublished ? getFormUrl() : 'Publish to activate link'}
                          readOnly
                          disabled={!isPublished}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={!isPublished}
                          onClick={() => copyToClipboard(getFormUrl(), 'Link')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      {!isPublished && (
                        <p className="text-xs text-slate-500 mt-2">
                          Your form is saved as a draft. Publish to make it accessible.
                        </p>
                      )}
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="p-6 bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Conversation preview</h3>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
                        {logoUrl && (
                          <div className="flex justify-center pb-4 border-b border-slate-100">
                            <img
                              src={logoUrl}
                              alt="Company logo"
                              className="max-h-12 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <div className="text-center">
                          <h4 className="text-lg font-semibold text-slate-900 mb-2">
                            {companyName}
                          </h4>
                          <p className="text-sm text-slate-600">
                            Hi! I'll help you get started. Let's have a quick conversation.
                          </p>
                        </div>

                        <div className="space-y-3 pt-4">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="flex-1 bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                              <p className="text-sm text-slate-900">
                                {tone === 'professional' && "Thank you for your interest. To provide you with accurate information, may I have your name?"}
                                {tone === 'friendly' && "Hi there! I'd love to help you out. What's your name?"}
                                {tone === 'luxury' && "Welcome. We're delighted to assist you. May I have the pleasure of knowing your name?"}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <div className="max-w-[80%]">
                              <div className="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-3" style={{ backgroundColor: primaryColor }}>
                                <p className="text-sm">
                                  {dataFields[0]?.exampleAnswer || 'John Smith'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-3">
                        This shows how the conversation starts. The AI will naturally guide users through all required fields.
                      </p>
                    </Card>
                  </div>
                </div>

                {!isPublished ? (
                  <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      size="lg"
                      onClick={handlePublishForm}
                      disabled={isPublishing}
                    >
                      {isPublishing ? 'Publishing...' : 'Publish form'}
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
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Form published successfully!
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Your form is now live. Share it with your audience or embed it on your website.
                        </p>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="default"
                            onClick={() => router.push('/dashboard')}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(getFormUrl(), 'Link')}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy link
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(getEmbedCode(), 'Embed code')}
                          >
                            <Code className="w-4 h-4 mr-2" />
                            Embed
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => window.open(getFormUrl(), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View form
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/forms/${createdFormId}/results`)}
                          >
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
