'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

interface Question {
  id: string;
  key: string;
  type: 'short_text' | 'long_text' | 'email' | 'phone' | 'number' | 'date' | 'time' | 'dropdown' | 'multi_select' | 'checkbox' | 'yes_no' | 'rating' | 'file_upload' | 'consent';
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  validation: any;
  options: QuestionOption[];
  order: number;
}

interface FormConfig {
  questions: Question[];
  welcomeEnabled: boolean;
  welcomeTitle: string;
  welcomeMessage: string;
  welcomeCta: string;
  endMessage: string;
  endRedirectEnabled: boolean;
  endRedirectUrl: string;
  theme: { buttonStyle?: string; spacing?: string };
}

interface FormData {
  id: string;
  name: string;
  published_config: FormConfig;
}

type Phase = 'welcome' | 'form' | 'end';

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [phase, setPhase] = useState<Phase>('welcome');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, name, published_config')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !data || !data.published_config) {
        setNotFound(true);
        return;
      }

      setForm(data);
      const config = data.published_config as FormConfig;
      if (!config.welcomeEnabled) {
        setPhase('form');
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    if (!form) return false;
    const config = form.published_config;
    const newErrors: Record<string, string> = {};

    for (const q of config.questions) {
      if (q.required) {
        const val = answers[q.key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.key] = 'This field is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error('Submission failed');

      setPhase('end');

      const config = form.published_config;
      if (config.endRedirectEnabled && config.endRedirectUrl) {
        setTimeout(() => {
          window.location.href = config.endRedirectUrl;
        }, 3000);
      }
    } catch {
      setErrors({ _form: 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleMultiSelect = (key: string, value: string) => {
    const current: string[] = answers[key] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    updateAnswer(key, updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading form...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form not found</h2>
          <p className="text-gray-500">This form doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const config = form.published_config;
  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);

  if (phase === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.welcomeTitle || form.name}</h1>
          {config.welcomeMessage && (
            <p className="text-gray-600 mb-6 whitespace-pre-wrap">{config.welcomeMessage}</p>
          )}
          <button
            onClick={() => setPhase('form')}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {config.welcomeCta || 'Start'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'end') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank you!</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{config.endMessage || 'Your response has been recorded.'}</p>
          {config.endRedirectEnabled && config.endRedirectUrl && (
            <p className="text-gray-400 text-sm mt-4">Redirecting in a few seconds...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{form.name}</h1>

          {errors._form && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors._form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {sortedQuestions.map((question) => (
              <div key={question.id} className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">
                  {question.label}
                  {question.required && <span className="text-red-500 ml-1">(required)</span>}
                </label>

                <QuestionInput
                  question={question}
                  value={answers[question.key]}
                  onChange={(val) => updateAnswer(question.key, val)}
                  onToggleMulti={(val) => toggleMultiSelect(question.key, val)}
                />

                {question.helpText && (
                  <p className="text-xs text-gray-400">{question.helpText}</p>
                )}

                {errors[question.key] && (
                  <p className="text-xs text-red-500">{errors[question.key]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onToggleMulti,
}: {
  question: Question;
  value: any;
  onChange: (val: any) => void;
  onToggleMulti: (val: string) => void;
}) {
  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  switch (question.type) {
    case 'short_text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={inputClasses}
        />
      );

    case 'long_text':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className={inputClasses + ' resize-y'}
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || 'email@example.com'}
          className={inputClasses}
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || '+1 (555) 000-0000'}
          className={inputClasses}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={question.placeholder}
          className={inputClasses}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      );

    case 'time':
      return (
        <input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      );

    case 'dropdown':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">{question.placeholder || 'Select an option'}</option>
          {(question.options || []).map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'multi_select':
      return (
        <div className="space-y-2">
          {(question.options || []).map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(value || []).includes(opt.value)}
                onChange={() => onToggleMulti(opt.value)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{question.placeholder || 'Yes'}</span>
        </label>
      );

    case 'yes_no':
      return (
        <div className="flex gap-4">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`q_${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none transition-colors"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <svg
                className={`w-8 h-8 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
      );

    case 'file_upload':
      return (
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file.name);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      );

    case 'consent':
      return (
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
          />
          <span className="text-sm text-gray-700">{question.label}</span>
        </label>
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={inputClasses}
        />
      );
  }
}
