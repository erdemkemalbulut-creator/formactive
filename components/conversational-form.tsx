'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FormConfig, Question } from '@/lib/types';

export interface ConversationalFormProps {
  config: FormConfig;
  formName: string;
  onSubmit?: (answers: Record<string, any>) => Promise<void>;
  isPreview?: boolean;
  previewStepIndex?: number;
}

function validateAnswer(value: any, question: Question): string | null {
  if (question.required) {
    if (value === undefined || value === null || value === '') return 'This field is required';
    if (Array.isArray(value) && value.length === 0) return 'Please select at least one option';
  }
  if (value && question.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(value))) return 'Please enter a valid email address';
  }
  if (value && question.type === 'phone') {
    const phoneRegex = /^[+]?[\d\s\-().]{7,}$/;
    if (!phoneRegex.test(String(value))) return 'Please enter a valid phone number';
  }
  return null;
}

function resolveTemplate(template: string, answers: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = answers[key];
    return val !== undefined && val !== null ? encodeURIComponent(String(val)) : '';
  });
}

const FONT_MAP: Record<string, string> = {
  'Inter': "'Inter', system-ui, sans-serif",
  'System': "system-ui, -apple-system, sans-serif",
  'Serif': "'Georgia', 'Times New Roman', serif",
};

export function ConversationalForm({ config, formName, onSubmit, isPreview = false, previewStepIndex }: ConversationalFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [inputValue, setInputValue] = useState<any>('');
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [phase, setPhase] = useState<'welcome' | 'questions' | 'submitting' | 'done'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);
  const primaryColor = config.theme?.primaryColor || '#111827';
  const cardStyle = config.theme?.cardStyle || 'light';
  const isDark = cardStyle === 'dark';
  const fontFamily = FONT_MAP[config.theme?.fontFamily || 'Inter'] || FONT_MAP['Inter'];

  const textColor = isDark ? '#f1f5f9' : '#111827';
  const subtextColor = isDark ? '#94a3b8' : '#6b7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#f9fafb';
  const inputBorder = isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb';
  const inputText = isDark ? '#f1f5f9' : '#111827';

  const startForm = useCallback(() => {
    if (sortedQuestions.length === 0) {
      if (!isPreview) {
        setPhase('submitting');
        const doSubmit = async () => {
          if (onSubmit) {
            try { await onSubmit({}); } catch {}
          }
          setPhase('done');
        };
        doSubmit();
      }
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setPhase('questions');
      setCurrentStepIndex(0);
      setInputValue('');
      setMultiSelectValues([]);
      setError(null);
      setTransitioning(false);
    }, 300);
  }, [sortedQuestions, onSubmit, isPreview]);

  useEffect(() => {
    if (isPreview) {
      if (previewStepIndex !== undefined && previewStepIndex >= 0 && sortedQuestions.length > 0) {
        setPhase('questions');
        setCurrentStepIndex(previewStepIndex);
      }
      return;
    }
    if (!config.welcomeEnabled) {
      startForm();
    }
  }, []);

  useEffect(() => {
    if (!isPreview) return;
    if (previewStepIndex !== undefined && previewStepIndex !== null && previewStepIndex >= 0 && previewStepIndex < sortedQuestions.length) {
      setPhase('questions');
      setCurrentStepIndex(previewStepIndex);
    } else if (previewStepIndex === undefined || previewStepIndex === null || previewStepIndex < 0) {
      if (config.welcomeEnabled) {
        setPhase('welcome');
      }
      setCurrentStepIndex(-1);
    }
  }, [previewStepIndex, isPreview, sortedQuestions.length]);

  useEffect(() => {
    if (phase === 'questions' && !transitioning && currentStepIndex >= 0 && !isPreview) {
      const q = sortedQuestions[currentStepIndex];
      if (q?.type !== 'cta') {
        setTimeout(() => {
          inputRef.current?.focus();
          textareaRef.current?.focus();
        }, 100);
      }
    }
  }, [currentStepIndex, phase, transitioning, isPreview]);

  const advanceToStep = (nextIndex: number) => {
    setTransitioning(true);
    setTimeout(() => {
      if (nextIndex >= sortedQuestions.length) {
        setPhase('submitting');
        setTransitioning(false);
      } else {
        setCurrentStepIndex(nextIndex);
        setInputValue('');
        setMultiSelectValues([]);
        setError(null);
        setTransitioning(false);
      }
    }, 300);
  };

  const handleSubmitAnswer = useCallback(() => {
    if (isPreview) return;
    if (currentStepIndex < 0 || currentStepIndex >= sortedQuestions.length) return;

    const q = sortedQuestions[currentStepIndex];
    let value: any = inputValue;

    if (q.type === 'multiple_choice') {
      value = multiSelectValues;
    }

    const validationError = validateAnswer(value, q);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newAnswers = { ...answers, [q.key]: value };
    setAnswers(newAnswers);

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= sortedQuestions.length) {
      setPhase('submitting');
      const doSubmit = async () => {
        if (onSubmit) {
          try { await onSubmit(newAnswers); } catch {}
        }
        setPhase('done');
      };
      doSubmit();
    } else {
      advanceToStep(nextIndex);
    }
  }, [currentStepIndex, sortedQuestions, inputValue, multiSelectValues, answers, isPreview, onSubmit]);

  const handleDirectAnswer = useCallback((value: any) => {
    if (isPreview) return;
    if (currentStepIndex < 0 || currentStepIndex >= sortedQuestions.length) return;

    const q = sortedQuestions[currentStepIndex];
    const validationError = validateAnswer(value, q);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newAnswers = { ...answers, [q.key]: value };
    setAnswers(newAnswers);

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= sortedQuestions.length) {
      setPhase('submitting');
      const doSubmit = async () => {
        if (onSubmit) {
          try { await onSubmit(newAnswers); } catch {}
        }
        setPhase('done');
      };
      doSubmit();
    } else {
      advanceToStep(nextIndex);
    }
  }, [currentStepIndex, sortedQuestions, answers, isPreview, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const currentQuestion = currentStepIndex >= 0 && currentStepIndex < sortedQuestions.length
    ? sortedQuestions[currentStepIndex]
    : null;

  const progress = sortedQuestions.length > 0
    ? Math.round((currentStepIndex / sortedQuestions.length) * 100)
    : 0;

  const optionBtnClass = (selected: boolean) => {
    if (isDark) {
      return selected
        ? 'bg-white/15 border-white/30 text-slate-100'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-200';
    }
    return selected
      ? 'bg-blue-50 border-blue-300 text-blue-700'
      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300';
  };

  const renderWelcome = () => (
    <div className={`flex flex-col items-center justify-center text-center px-8 py-12 transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-6"
        style={{ backgroundColor: primaryColor }}
      >
        {formName.charAt(0).toUpperCase()}
      </div>
      {config.welcomeTitle && (
        <h1 className="text-2xl font-bold mb-3" style={{ color: textColor }}>{config.welcomeTitle}</h1>
      )}
      {config.welcomeMessage && (
        <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: subtextColor }}>{config.welcomeMessage}</p>
      )}
      {!config.welcomeTitle && !config.welcomeMessage && (
        <h1 className="text-2xl font-bold mb-8" style={{ color: textColor }}>Welcome to {formName}</h1>
      )}
      <button
        onClick={!isPreview ? startForm : undefined}
        className={`px-8 py-3 text-white text-sm font-medium rounded-full transition-all hover:opacity-90 hover:shadow-lg ${isPreview ? 'cursor-default' : ''}`}
        style={{ backgroundColor: primaryColor }}
      >
        {config.welcomeCta || 'Start'}
      </button>
    </div>
  );

  const renderStepInput = (q: Question) => {
    switch (q.type) {
      case 'cta': {
        const resolvedUrl = resolveTemplate(q.cta?.url || '', answers);
        return (
          <div className="mt-6 space-y-3">
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => advanceToStep(currentStepIndex + 1)}
              className="inline-block px-6 py-3 text-white text-sm font-medium rounded-full transition-all hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {q.cta?.text || 'Continue'} &rarr;
            </a>
          </div>
        );
      }

      case 'yes_no':
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => handleDirectAnswer('Yes')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(false)}`}
              >
                Yes
              </button>
              <button
                onClick={() => handleDirectAnswer('No')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(false)}`}
              >
                No
              </button>
            </div>
          </div>
        );

      case 'single_choice':
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="space-y-2">
              {(q.options || []).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleDirectAnswer(opt.value)}
                  className={`w-full text-left py-3 px-4 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(false)}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="space-y-2">
              {(q.options || []).map(opt => {
                const selected = multiSelectValues.includes(opt.value);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setMultiSelectValues(prev =>
                        prev.includes(opt.value)
                          ? prev.filter(v => v !== opt.value)
                          : [...prev, opt.value]
                      );
                      setError(null);
                    }}
                    className={`w-full text-left py-3 px-4 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(selected)}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                        selected
                          ? (isDark ? 'border-white bg-white/20' : 'border-blue-500 bg-blue-500')
                          : (isDark ? 'border-white/30' : 'border-gray-300')
                      }`}>
                        {selected && (
                          <svg className={`w-3 h-3 ${isDark ? 'text-white' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleSubmitAnswer}
              disabled={multiSelectValues.length === 0 && q.required}
              className="w-full py-3 text-white text-sm font-medium rounded-xl transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </button>
          </div>
        );

      case 'long_text':
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <textarea
              ref={textareaRef}
              value={inputValue || ''}
              onChange={(e) => { setInputValue(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
              placeholder="Type your answer..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none border"
              style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
            />
            <button
              onClick={handleSubmitAnswer}
              className="w-full py-3 text-white text-sm font-medium rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </button>
          </div>
        );

      case 'date':
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <input
              ref={inputRef}
              type="date"
              value={inputValue || ''}
              onChange={(e) => { setInputValue(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border"
              style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
            />
            <button
              onClick={handleSubmitAnswer}
              className="w-full py-3 text-white text-sm font-medium rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </button>
          </div>
        );

      default: {
        const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text';
        const placeholder = q.type === 'email' ? 'name@example.com' : q.type === 'phone' ? '+1 (555) 000-0000' : q.type === 'number' ? '0' : 'Type your answer...';
        return (
          <div className="mt-6 space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <input
              ref={inputRef}
              type={inputType}
              value={inputValue || ''}
              onChange={(e) => {
                setInputValue(q.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border"
              style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
            />
            <button
              onClick={handleSubmitAnswer}
              className="w-full py-3 text-white text-sm font-medium rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue
            </button>
          </div>
        );
      }
    }
  };

  const renderCurrentStep = () => {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const promptText = q.message || q.label || 'Untitled step';

    return (
      <div className={`flex flex-col items-center justify-center px-8 py-12 transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full max-w-md">
          <p className="text-lg font-medium leading-relaxed" style={{ color: textColor }}>{promptText}</p>
          {renderStepInput(q)}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (phase === 'done' && config.endRedirectEnabled && config.endRedirectUrl && !isPreview) {
      const timer = setTimeout(() => {
        window.location.href = config.endRedirectUrl;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, config.endRedirectEnabled, config.endRedirectUrl, isPreview]);

  const renderEndScreen = () => {
    const showEnd = config.endEnabled !== false;
    const endMessage = config.endMessage || 'Thank you for your response!';

    return (
      <div className="flex flex-col items-center justify-center text-center px-8 py-12">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {showEnd ? (
          <>
            <p className="text-lg font-medium mb-2" style={{ color: textColor }}>{endMessage}</p>
            {config.endCtaText && config.endCtaUrl && (
              <a
                href={config.endCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-6 py-3 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {config.endCtaText}
              </a>
            )}
          </>
        ) : (
          <p className="text-lg font-medium" style={{ color: textColor }}>All set!</p>
        )}
      </div>
    );
  };

  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center text-center px-8 py-12">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
      <p className="text-sm" style={{ color: subtextColor }}>Submitting your response...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
      {config.theme?.customCss && <style>{config.theme.customCss}</style>}

      {isPreview ? (
        <div className="px-8 pt-5 pb-1">
          <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: subtextColor, opacity: 0.7 }}>
            {phase === 'welcome' && config.welcomeEnabled ? 'Welcome' : phase === 'done' ? 'Done' : phase === 'questions' && sortedQuestions.length > 0 ? `Question ${currentStepIndex + 1} of ${sortedQuestions.length}` : '\u00A0'}
          </p>
        </div>
      ) : (
        phase === 'questions' && sortedQuestions.length > 0 && (
          <div className="px-8 pt-6">
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: subtextColor }}>{currentStepIndex + 1} of {sortedQuestions.length}</p>
          </div>
        )
      )}

      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        {phase === 'welcome' && config.welcomeEnabled && renderWelcome()}
        {phase === 'welcome' && !config.welcomeEnabled && isPreview && (
          <div className="text-center px-8">
            <p className="text-sm" style={{ color: subtextColor }}>Click a journey step to preview it</p>
          </div>
        )}
        {phase === 'questions' && renderCurrentStep()}
        {phase === 'submitting' && renderSubmitting()}
        {phase === 'done' && renderEndScreen()}
      </div>
    </div>
  );
}

export default ConversationalForm;
