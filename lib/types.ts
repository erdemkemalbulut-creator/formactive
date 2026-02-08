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
  | 'consent';

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
}

export interface FormTheme {
  buttonStyle?: 'rounded' | 'square' | 'pill';
  spacing?: 'compact' | 'normal' | 'relaxed';
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
    theme: { buttonStyle: 'rounded', spacing: 'normal' },
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
