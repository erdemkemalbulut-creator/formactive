import { FormConfig, Question } from './types';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lead-gen' | 'feedback' | 'quiz' | 'application' | 'event' | 'survey' | 'support';
  icon: string;
  config: FormConfig;
}

function q(
  id: string,
  key: string,
  type: Question['type'],
  label: string,
  required: boolean,
  order: number,
  options?: { id: string; label: string; value: string }[],
  extras?: Partial<Question>
): Question {
  return {
    id,
    key,
    type,
    label,
    message: '',
    required,
    options: options || [],
    order,
    ...extras,
  };
}

function opt(label: string): { id: string; label: string; value: string } {
  return { id: `opt_${Math.random().toString(36).slice(2, 7)}`, label, value: label };
}

export const TEMPLATE_CATEGORIES: { value: FormTemplate['category']; label: string }[] = [
  { value: 'lead-gen', label: 'Lead Generation' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'survey', label: 'Survey' },
  { value: 'application', label: 'Application' },
  { value: 'event', label: 'Event' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'support', label: 'Support' },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Collect leads with a friendly, conversational flow. Great for landing pages.',
    category: 'lead-gen',
    icon: 'Users',
    config: {
      questions: [
        q('q1', 'name', 'short_text', 'Full name', true, 0, undefined, {
          intent: 'Get the person\'s full name',
        }),
        q('q2', 'email', 'email', 'Email address', true, 1, undefined, {
          intent: 'Collect their work email',
        }),
        q('q3', 'company', 'short_text', 'Company name', false, 2, undefined, {
          intent: 'Know which company they work for',
        }),
        q('q4', 'interest', 'single_choice', 'What are you most interested in?', true, 3, [
          opt('Product demo'),
          opt('Pricing info'),
          opt('Partnership'),
          opt('General inquiry'),
        ]),
        q('q5', 'message', 'long_text', 'Anything else you\'d like us to know?', false, 4),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Let\'s get to know you',
      welcomeMessage: 'We\'d love to learn more about you and how we can help. This will only take a minute.',
      welcomeCta: 'Let\'s go',
      endEnabled: true,
      endMessage: 'Thanks! We\'ll be in touch within 24 hours.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'casual', custom: '', chattiness: 60 },
    },
  },
  {
    id: 'customer-feedback',
    name: 'Customer Feedback',
    description: 'Gather product feedback and satisfaction scores from customers.',
    category: 'feedback',
    icon: 'MessageSquare',
    config: {
      questions: [
        q('q1', 'satisfaction', 'single_choice', 'How satisfied are you with our product?', true, 0, [
          opt('Very satisfied'),
          opt('Satisfied'),
          opt('Neutral'),
          opt('Dissatisfied'),
          opt('Very dissatisfied'),
        ]),
        q('q2', 'best_feature', 'short_text', 'What do you like most about our product?', true, 1, undefined, {
          intent: 'Understand what they value most',
        }),
        q('q3', 'improvement', 'long_text', 'What could we improve?', true, 2, undefined, {
          intent: 'Get specific improvement suggestions',
        }),
        q('q4', 'recommend', 'single_choice', 'How likely are you to recommend us to a friend?', true, 3, [
          opt('Definitely'),
          opt('Probably'),
          opt('Maybe'),
          opt('Probably not'),
          opt('Definitely not'),
        ]),
        q('q5', 'email', 'email', 'Email (optional, for follow-up)', false, 4),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'We value your feedback',
      welcomeMessage: 'Help us improve by sharing your experience. It takes less than 2 minutes.',
      welcomeCta: 'Share feedback',
      endEnabled: true,
      endMessage: 'Thank you for your feedback! It helps us improve every day.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#059669',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'professional', custom: '', chattiness: 50 },
    },
  },
  {
    id: 'job-application',
    name: 'Job Application',
    description: 'Screen candidates with a conversational interview-style form.',
    category: 'application',
    icon: 'Briefcase',
    config: {
      questions: [
        q('q1', 'name', 'short_text', 'Full name', true, 0),
        q('q2', 'email', 'email', 'Email address', true, 1),
        q('q3', 'phone', 'phone', 'Phone number', true, 2),
        q('q4', 'position', 'single_choice', 'Which position are you applying for?', true, 3, [
          opt('Software Engineer'),
          opt('Product Designer'),
          opt('Marketing Manager'),
          opt('Sales Representative'),
          opt('Other'),
        ]),
        q('q5', 'experience', 'single_choice', 'Years of relevant experience', true, 4, [
          opt('0-1 years'),
          opt('2-3 years'),
          opt('4-6 years'),
          opt('7-10 years'),
          opt('10+ years'),
        ]),
        q('q6', 'why_us', 'long_text', 'Why do you want to work with us?', true, 5, undefined, {
          intent: 'Understand their motivation and culture fit',
        }),
        q('q7', 'portfolio', 'short_text', 'Link to portfolio or LinkedIn (optional)', false, 6),
        q('q8', 'start_date', 'date', 'Earliest start date', true, 7),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Apply to join our team',
      welcomeMessage: 'We\'re excited you\'re interested! Let\'s learn a bit about you.',
      welcomeCta: 'Start application',
      endEnabled: true,
      endMessage: 'Application received! We\'ll review it and get back to you within a week.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#7c3aed',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'professional', custom: '', chattiness: 40 },
    },
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Register attendees for events, webinars, or workshops.',
    category: 'event',
    icon: 'Calendar',
    config: {
      questions: [
        q('q1', 'name', 'short_text', 'Full name', true, 0),
        q('q2', 'email', 'email', 'Email address', true, 1),
        q('q3', 'company', 'short_text', 'Company / Organization', false, 2),
        q('q4', 'role', 'short_text', 'Job title', false, 3),
        q('q5', 'dietary', 'single_choice', 'Dietary requirements', false, 4, [
          opt('None'),
          opt('Vegetarian'),
          opt('Vegan'),
          opt('Gluten-free'),
          opt('Other'),
        ]),
        q('q6', 'topics', 'multiple_choice', 'Which topics interest you most?', true, 5, [
          opt('Keynote presentations'),
          opt('Workshops'),
          opt('Networking'),
          opt('Panel discussions'),
          opt('Product demos'),
        ]),
        q('q7', 'questions', 'long_text', 'Any questions for the speakers?', false, 6),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Register for the event',
      welcomeMessage: 'Secure your spot! Quick registration — takes under a minute.',
      welcomeCta: 'Register now',
      endEnabled: true,
      endMessage: 'You\'re registered! Check your email for confirmation details.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'pill',
        spacing: 'normal',
        primaryColor: '#dc2626',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'energetic', custom: '', chattiness: 70 },
    },
  },
  {
    id: 'nps-survey',
    name: 'NPS Survey',
    description: 'Measure Net Promoter Score with follow-up questions.',
    category: 'survey',
    icon: 'TrendingUp',
    config: {
      questions: [
        q('q1', 'nps_score', 'single_choice', 'On a scale of 1-10, how likely are you to recommend us?', true, 0, [
          opt('1'), opt('2'), opt('3'), opt('4'), opt('5'),
          opt('6'), opt('7'), opt('8'), opt('9'), opt('10'),
        ]),
        q('q2', 'reason', 'long_text', 'What\'s the main reason for your score?', true, 1, undefined, {
          intent: 'Understand the driver behind their rating',
        }),
        q('q3', 'improve', 'long_text', 'What\'s one thing we could do better?', false, 2),
        q('q4', 'follow_up', 'yes_no', 'Can we follow up with you about your feedback?', false, 3),
        q('q5', 'email', 'email', 'Email address', false, 4),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Quick feedback',
      welcomeMessage: 'One question to start — then a couple of follow-ups. Takes 30 seconds.',
      welcomeCta: 'Start',
      endEnabled: true,
      endMessage: 'Thank you! Your feedback helps us improve.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#0891b2',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'concise', custom: '', chattiness: 30 },
    },
  },
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'A simple, conversational contact form for your website.',
    category: 'lead-gen',
    icon: 'Mail',
    config: {
      questions: [
        q('q1', 'name', 'short_text', 'Your name', true, 0),
        q('q2', 'email', 'email', 'Email address', true, 1),
        q('q3', 'subject', 'single_choice', 'What can we help with?', true, 2, [
          opt('General inquiry'),
          opt('Product question'),
          opt('Support request'),
          opt('Partnership'),
          opt('Other'),
        ]),
        q('q4', 'message', 'long_text', 'Your message', true, 3, undefined, {
          intent: 'Get the details of their request',
        }),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Get in touch',
      welcomeMessage: 'We\'d love to hear from you. Send us a message and we\'ll respond shortly.',
      welcomeCta: 'Send message',
      endEnabled: true,
      endMessage: 'Message sent! We\'ll get back to you within 24 hours.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#111827',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'casual', custom: '', chattiness: 50 },
    },
  },
  {
    id: 'quiz',
    name: 'Quiz / Assessment',
    description: 'Create engaging quizzes or personality assessments.',
    category: 'quiz',
    icon: 'HelpCircle',
    config: {
      questions: [
        q('q1', 'q1_answer', 'single_choice', 'How do you prefer to work?', true, 0, [
          opt('Independently'),
          opt('In a small team'),
          opt('In a large group'),
          opt('It depends on the task'),
        ]),
        q('q2', 'q2_answer', 'single_choice', 'What motivates you most?', true, 1, [
          opt('Learning new things'),
          opt('Achieving goals'),
          opt('Helping others'),
          opt('Creative expression'),
        ]),
        q('q3', 'q3_answer', 'single_choice', 'How do you handle challenges?', true, 2, [
          opt('Head-on, immediately'),
          opt('Plan carefully first'),
          opt('Ask for help'),
          opt('Sleep on it'),
        ]),
        q('q4', 'q4_answer', 'single_choice', 'What\'s your ideal weekend?', true, 3, [
          opt('Outdoor adventure'),
          opt('Reading & relaxing'),
          opt('Social gathering'),
          opt('Working on a project'),
        ]),
        q('q5', 'email', 'email', 'Email to get your results', true, 4),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'Take the quiz',
      welcomeMessage: '5 quick questions to discover your profile. Ready?',
      welcomeCta: 'Let\'s go!',
      endEnabled: true,
      endMessage: 'Quiz complete! Check your email for results.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'pill',
        spacing: 'normal',
        primaryColor: '#f59e0b',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'energetic', custom: '', chattiness: 80 },
    },
  },
  {
    id: 'support-request',
    name: 'Support Request',
    description: 'Triage customer support tickets with smart follow-ups.',
    category: 'support',
    icon: 'LifeBuoy',
    config: {
      questions: [
        q('q1', 'name', 'short_text', 'Your name', true, 0),
        q('q2', 'email', 'email', 'Email address', true, 1),
        q('q3', 'category', 'single_choice', 'What do you need help with?', true, 2, [
          opt('Account issue'),
          opt('Billing'),
          opt('Technical problem'),
          opt('Feature request'),
          opt('Other'),
        ]),
        q('q4', 'urgency', 'single_choice', 'How urgent is this?', true, 3, [
          opt('Critical — blocking my work'),
          opt('High — need help soon'),
          opt('Medium — can wait a day'),
          opt('Low — just a question'),
        ]),
        q('q5', 'description', 'long_text', 'Describe the issue in detail', true, 4, undefined, {
          intent: 'Get enough detail to triage the request',
        }),
      ],
      welcomeEnabled: true,
      welcomeTitle: 'How can we help?',
      welcomeMessage: 'Tell us what\'s going on and we\'ll get you to the right person.',
      welcomeCta: 'Get help',
      endEnabled: true,
      endMessage: 'Got it! A support agent will reach out to you shortly.',
      endCtaText: '',
      endCtaUrl: '',
      endRedirectEnabled: false,
      endRedirectUrl: '',
      theme: {
        buttonStyle: 'rounded',
        spacing: 'normal',
        primaryColor: '#4f46e5',
        backgroundColor: '#ffffff',
        backgroundType: 'solid',
        fontFamily: 'Inter',
        cardStyle: 'light',
        bubbleStyle: 'rounded',
      },
      tone: { preset: 'professional', custom: '', chattiness: 40 },
    },
  },
];

export function getTemplateById(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: FormTemplate['category']): FormTemplate[] {
  return FORM_TEMPLATES.filter(t => t.category === category);
}
