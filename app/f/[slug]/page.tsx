'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FormConfig } from '@/lib/types';
import { ConversationalForm } from '@/components/conversational-form';

interface FormData {
  id: string;
  name: string;
  published_config: FormConfig;
}

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (answers: Record<string, any>) => {
    if (!form) return;

    const res = await fetch(`/api/forms/${form.id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) throw new Error('Submission failed');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form not found</h2>
          <p className="text-gray-500">This form doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const theme = form.published_config.theme;
  const bgStyle: React.CSSProperties = {
    backgroundColor: theme?.backgroundType === 'solid' ? (theme?.backgroundColor || '#ffffff') : '#ffffff',
    backgroundImage: theme?.backgroundType === 'gradient' ? theme?.backgroundGradient :
                      theme?.backgroundType === 'image' ? `url(${theme?.backgroundImage})` : undefined,
    backgroundSize: theme?.backgroundType === 'image' ? 'cover' : undefined,
  };

  return (
    <div className="min-h-screen" style={bgStyle}>
      <ConversationalForm
        config={form.published_config}
        formName={form.name}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
