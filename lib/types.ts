export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'date'
  | 'number'
  | 'email'
  | 'phone'
  | 'cta'
  | 'statement'
  | 'file_upload';

export type ToneType = 'friendly' | 'professional' | 'luxury' | 'playful';

export type DirectnessType = 'casual' | 'balanced' | 'precise';

export interface ToneConfig {
  preset: 'energetic' | 'sassy' | 'witty' | 'professional' | 'casual' | 'concise';
  custom: string;
  chattiness: number | null;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface CTAConfig {
  text: string;
  url: string;
  openInNewTab: boolean;
}

export interface Question {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  message: string;
  required: boolean;
  options: QuestionOption[];
  order: number;
  cta?: CTAConfig;
  videoUrl?: string;
  internalName?: string;
  visual?: StepVisual;
  journeyInstruction?: string;
  intent?: string;
  examples?: string[];
  vagueAnswers?: string[];
}

export interface FormTheme {
  buttonStyle?: 'rounded' | 'square' | 'pill';
  spacing?: 'compact' | 'normal' | 'relaxed';
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundType?: 'solid' | 'gradient' | 'image';
  backgroundGradient?: string;
  backgroundImage?: string;
  fontFamily?: string;
  cardStyle?: 'light' | 'dark';
  logoUrl?: string;
  bubbleStyle?: 'rounded' | 'minimal';
  botBubbleColor?: string;
  userBubbleColor?: string;
  customCss?: string;
}

export interface AIContext {
  context: string;
  tone: ToneType;
  audience: string;
  toneConfig?: ToneConfig;
}

export interface FormVisuals {
  kind: 'none' | 'image' | 'video';
  source?: 'upload' | 'url';
  url?: string;
  storagePath?: string;
  updatedAt?: string;
}

export type VisualLayout = 'center' | 'left' | 'right' | 'fill';

export interface StepVisual {
  kind: 'none' | 'image' | 'video';
  source?: 'upload' | 'url';
  url?: string;
  storagePath?: string;
  layout?: VisualLayout;
  opacity?: number;
}

export interface ConversationMeta {
  currentFieldKey?: string;
  currentFieldIndex?: number;
  attempts?: Record<string, number>;
  abandoned?: boolean;
  abandonedReason?: 'max_attempts' | 'user_quit' | 'timeout';
  lastActivity?: string;
}

export interface FormSettings {
  colors?: {
    background?: string;
    text?: string;
    button?: string;
  };
  textSize?: 'small' | 'medium' | 'large';
  hideBranding?: boolean;
  isClosed?: boolean;
  tracking?: {
    enabled?: boolean;
    excludeBuilderPreview?: boolean;
    anonymize?: boolean;
  };
  legalDisclaimer?: {
    enabled?: boolean;
    text?: string;
  };
  notifications?: {
    enabled?: boolean;
    email?: string;
  };
  skipWelcome?: boolean;
  restoreChat?: boolean;
  strictDataCollection?: boolean;
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  colors: { background: '#667eea', text: '#ffffff', button: '#111827' },
  textSize: 'medium',
  hideBranding: false,
  isClosed: false,
  tracking: { enabled: true, excludeBuilderPreview: true, anonymize: false },
  legalDisclaimer: { enabled: false, text: '' },
  notifications: { enabled: false, email: '' },
  skipWelcome: false,
  restoreChat: false,
  strictDataCollection: true,
};

export interface FormConfig {
  questions: Question[];
  welcomeEnabled: boolean;
  welcomeTitle: string;
  welcomeMessage: string;
  welcomeCta: string;
  endEnabled: boolean;
  endMessage: string;
  endCtaText: string;
  endCtaUrl: string;
  endRedirectEnabled: boolean;
  endRedirectUrl: string;
  theme: FormTheme;
  aiContext?: AIContext;
  visuals?: FormVisuals;
  welcomeVisual?: StepVisual;
  endVisual?: StepVisual;
  aboutYou?: string;
  trainAI?: string;
  settings?: FormSettings;
  tone?: ToneConfig;
}

export interface Form {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: 'draft' | 'live';
  current_config: FormConfig;
  published_config: FormConfig | null;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  form_id: string;
  answers: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

export interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  config_snapshot: FormConfig;
  created_at: string;
}

export interface GenerateConversationRequest {
  context: string;
  tone: ToneType;
  audience?: string;
}

export interface GenerateConversationItem {
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[] | null;
}

export interface GenerateWordingRequest {
  description: string;
  tone: ToneType;
  journeyItems: { label: string; type: string }[];
  currentItem: { label: string; type: string };
}

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'short_text', label: 'Short text', icon: 'Type' },
  { value: 'long_text', label: 'Long text', icon: 'AlignLeft' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'single_choice', label: 'Single choice', icon: 'ChevronDown' },
  { value: 'multiple_choice', label: 'Multiple choice', icon: 'CheckSquare' },
  { value: 'yes_no', label: 'Yes / No', icon: 'ToggleLeft' },
  { value: 'cta', label: 'Call to Action', icon: 'ExternalLink' },
  { value: 'statement', label: 'Statement', icon: 'MessageSquare' },
  { value: 'file_upload', label: 'File upload', icon: 'Upload' },
];

export function createDefaultQuestion(order: number): Question {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: '',
    type: 'short_text',
    label: '',
    message: '',
    required: false,
    options: [],
    order,
  };
}

export function createDefaultCTA(order: number): Question {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: `cta_${order}`,
    type: 'cta',
    label: 'Call to Action',
    message: '',
    required: false,
    options: [],
    order,
    cta: {
      text: 'Learn More',
      url: 'https://example.com',
      openInNewTab: true,
    },
  };
}

export function createDefaultConfig(): FormConfig {
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
    theme: {
      buttonStyle: 'rounded',
      spacing: 'normal',
      primaryColor: '#111827',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      backgroundType: 'solid',
      fontFamily: 'Inter',
      cardStyle: 'light',
      bubbleStyle: 'rounded',
      botBubbleColor: '#f1f5f9',
      userBubbleColor: '#2563eb',
    },
    aboutYou: '',
    trainAI: '',
  };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7);
}

export const DEFAULT_THEME: FormTheme = {
  buttonStyle: 'rounded',
  spacing: 'normal',
  primaryColor: '#111827',
  secondaryColor: '#64748b',
  backgroundColor: '#ffffff',
  backgroundType: 'solid',
  fontFamily: 'Inter',
  cardStyle: 'light',
  bubbleStyle: 'rounded',
  botBubbleColor: '#f1f5f9',
  userBubbleColor: '#2563eb',
};
