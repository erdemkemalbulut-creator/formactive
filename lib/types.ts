export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'multi_select'
  | 'checkbox'
  | 'yes_no'
  | 'rating'
  | 'file_upload'
  | 'consent'
  | 'cta';

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'categorical' | 'rating';

export type ToneType = 'friendly' | 'professional' | 'luxury' | 'playful';

export type DirectnessType = 'casual' | 'balanced' | 'precise';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  fileTypes?: string[];
  maxFileSize?: number;
  allowedValues?: string[];
}

export interface FollowUpCondition {
  field_key: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'empty' | 'not_empty';
  value?: string;
}

export interface FollowUpNode {
  id: string;
  condition: FollowUpCondition;
  prompt: string;
  field_key: string;
  data_type: DataType;
  ui_type: QuestionType;
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
  placeholder: string;
  helpText: string;
  required: boolean;
  validation: QuestionValidation;
  options: QuestionOption[];
  order: number;

  intent?: string;
  field_key?: string;
  data_type?: DataType;
  user_prompt?: string;
  transition_before?: string;
  extraction?: Record<string, any>;
  followups?: FollowUpNode[];

  tone?: ToneType;
  directness?: DirectnessType;
  audience?: string;

  cta?: CTAConfig;
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
  logoUrl?: string;
  bubbleStyle?: 'rounded' | 'minimal';
  botBubbleColor?: string;
  userBubbleColor?: string;
  customCss?: string;
}

export interface AIContext {
  context: string;
  tone: ToneType;
  directness: DirectnessType;
  audience: string;
}

export interface FormConfig {
  questions: Question[];
  welcomeEnabled: boolean;
  welcomeTitle: string;
  welcomeMessage: string;
  welcomeCta: string;
  endMessage: string;
  endRedirectEnabled: boolean;
  endRedirectUrl: string;
  theme: FormTheme;
  aiContext?: AIContext;
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

export interface GenerateNodeRequest {
  intent: string;
  tone: ToneType;
  directness: DirectnessType;
  audience?: string;
  existing_fields: string[];
}

export interface GenerateConversationRequest {
  context: string;
  tone: ToneType;
  directness: DirectnessType;
  audience?: string;
}

export interface GenerateNodeResponse {
  field_key: string;
  data_type: DataType;
  ui_type: QuestionType;
  user_prompt: string;
  transition_before: string;
  required: boolean;
  validation: QuestionValidation;
  options?: QuestionOption[];
  extraction: Record<string, any>;
  followups: FollowUpNode[];
}

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'short_text', label: 'Short text', icon: 'Type' },
  { value: 'long_text', label: 'Long text', icon: 'AlignLeft' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'time', label: 'Time', icon: 'Clock' },
  { value: 'dropdown', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'multi_select', label: 'Multi-select', icon: 'CheckSquare' },
  { value: 'checkbox', label: 'Checkbox', icon: 'CheckCircle' },
  { value: 'yes_no', label: 'Yes / No', icon: 'ToggleLeft' },
  { value: 'rating', label: 'Rating', icon: 'Star' },
  { value: 'file_upload', label: 'File upload', icon: 'Upload' },
  { value: 'consent', label: 'Consent', icon: 'Shield' },
  { value: 'cta', label: 'Call to Action', icon: 'ExternalLink' },
];

export function createDefaultQuestion(order: number): Question {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: '',
    type: 'short_text',
    label: '',
    placeholder: '',
    helpText: '',
    required: false,
    validation: {},
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
    placeholder: '',
    helpText: '',
    required: false,
    validation: {},
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
    endMessage: 'Thank you for your submission!',
    endRedirectEnabled: false,
    endRedirectUrl: '',
    theme: {
      buttonStyle: 'rounded',
      spacing: 'normal',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      backgroundType: 'solid',
      fontFamily: 'Inter',
      bubbleStyle: 'rounded',
      botBubbleColor: '#f1f5f9',
      userBubbleColor: '#2563eb',
    },
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
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  backgroundColor: '#ffffff',
  backgroundType: 'solid',
  fontFamily: 'Inter',
  bubbleStyle: 'rounded',
  botBubbleColor: '#f1f5f9',
  userBubbleColor: '#2563eb',
};
