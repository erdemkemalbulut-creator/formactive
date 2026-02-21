'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FormConfig, Question } from '@/lib/types';
import { useReducedMotion } from '@/components/cross-dissolve-background';
import { compileToneContract, DEFAULT_TONE_CONFIG } from '@/lib/tone';
import { applyTonePhrasing, getPlaceholderText, getValidationMessage, applyToneToEnd } from '@/lib/phrasing';
import {
  validateAnswer as validateFieldAnswer,
  generateRepromptMessage,
  isSkipRequest,
  isEndRequest,
  getAttemptLimit,
} from '@/lib/field-validation';

export type PreviewTarget = 'welcome' | 'end' | { step: number } | null;

export interface ConversationalFormProps {
  config: FormConfig;
  formName: string;
  onSubmit?: (answers: Record<string, any>) => Promise<void>;
  isPreview?: boolean;
  previewStepIndex?: number;
  previewTarget?: PreviewTarget;
  onPhaseChange?: (phase: 'welcome' | 'questions' | 'submitting' | 'done') => void;
  onStepChange?: (stepIndex: number) => void;
  heroWelcome?: boolean;
}

function mapQuestionTypeToFieldType(questionType: string): string {
  const mapping: Record<string, string> = {
    short_text: 'text',
    long_text: 'textarea',
    single_choice: 'select',
    multiple_choice: 'select',
    yes_no: 'select',
    date: 'date',
    number: 'number',
    email: 'email',
    phone: 'phone',
  };
  return mapping[questionType] || 'text';
}

function validateAnswerBase(value: any, question: Question): { isValid: boolean; errorType?: string } {
  if (question.required) {
    if (value === undefined || value === null || value === '') return { isValid: false, errorType: 'required' };
    if (Array.isArray(value) && value.length === 0) return { isValid: false, errorType: 'select_required' };
  }
  if (value && question.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(value))) return { isValid: false, errorType: 'email_invalid' };
  }
  if (value && question.type === 'phone') {
    const phoneRegex = /^[+]?[\d\s\-().]{7,}$/;
    if (!phoneRegex.test(String(value))) return { isValid: false, errorType: 'phone_invalid' };
  }
  return { isValid: true };
}

function validateAnswer(value: any, question: Question): string | null {
  const result = validateAnswerBase(value, question);
  if (!result.isValid && result.errorType) {
    return result.errorType;
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

function useTypewriter(text: string, speed: number = 25, enabled: boolean = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const prevTextRef = useRef('');
  const prevEnabledRef = useRef(enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      prevEnabledRef.current = false;
      return;
    }

    const becameEnabled = !prevEnabledRef.current && enabled;
    prevEnabledRef.current = true;

    if (text === prevTextRef.current && !becameEnabled) return;
    prevTextRef.current = text;
    setDisplayed('');
    setDone(false);
    if (!text) {
      setDone(true);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, done };
}

export function ConversationalForm({ config, formName, onSubmit, isPreview = false, previewStepIndex, previewTarget, onPhaseChange, onStepChange, heroWelcome = false }: ConversationalFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [inputValue, setInputValue] = useState<any>('');
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [phase, setPhase] = useState<'welcome' | 'questions' | 'submitting' | 'done'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [typewriterReady, setTypewriterReady] = useState(true);
  const [fieldAttempts, setFieldAttempts] = useState<Record<string, number>>({});
  const [isAbandoned, setIsAbandoned] = useState(false);
  const reducedMotion = useReducedMotion();

  const toneContract = useMemo(() => {
    return compileToneContract(config.tone || DEFAULT_TONE_CONFIG);
  }, [config.tone]);

  const FADE_DURATION = reducedMotion ? 0 : 300;

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (!isPreview && currentStepIndex >= 0) {
      onStepChange?.(currentStepIndex);
    }
  }, [currentStepIndex, isPreview, onStepChange]);

  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);
  const primaryColor = config.theme?.primaryColor || '#111827';
  const cardStyle = config.theme?.cardStyle || 'light';
  const isDark = cardStyle === 'dark';
  const fontFamily = FONT_MAP[config.theme?.fontFamily || 'Inter'] || FONT_MAP['Inter'];

  const textColor = isDark ? '#f1f5f9' : '#ffffff';
  const subtextColor = isDark ? '#94a3b8' : 'rgba(255,255,255,0.7)';

  const fadeTransition = useCallback((updateFn: () => void) => {
    if (reducedMotion) {
      updateFn();
      return;
    }
    setContentVisible(false);
    setTypewriterReady(false);
    setTimeout(() => {
      updateFn();
      setContentVisible(true);
      setTimeout(() => {
        setTypewriterReady(true);
      }, FADE_DURATION);
    }, FADE_DURATION);
  }, [FADE_DURATION, reducedMotion]);

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
    fadeTransition(() => {
      setPhase('questions');
      setCurrentStepIndex(0);
      setInputValue('');
      setMultiSelectValues([]);
      setError(null);
      setTransitioning(false);
    });
  }, [sortedQuestions, onSubmit, isPreview, fadeTransition]);

  useEffect(() => {
    if (isPreview) return;
    if (!config.welcomeEnabled) {
      startForm();
    }
  }, []);

  const prevPreviewTargetRef = useRef<PreviewTarget | undefined>(undefined);
  useEffect(() => {
    if (!isPreview) return;

    const applyPreview = () => {
      if (previewTarget === 'welcome') {
        setPhase('welcome');
        setCurrentStepIndex(-1);
      } else if (previewTarget === 'end') {
        setPhase('done');
        setCurrentStepIndex(-1);
      } else if (previewTarget && typeof previewTarget === 'object' && 'step' in previewTarget) {
        const idx = previewTarget.step;
        if (idx >= 0 && idx < sortedQuestions.length) {
          setPhase('questions');
          setCurrentStepIndex(idx);
        }
      } else if (previewStepIndex !== undefined && previewStepIndex !== null && previewStepIndex >= 0 && previewStepIndex < sortedQuestions.length) {
        setPhase('questions');
        setCurrentStepIndex(previewStepIndex);
      } else {
        if (config.welcomeEnabled) {
          setPhase('welcome');
        }
        setCurrentStepIndex(-1);
      }
    };

    const changed = JSON.stringify(previewTarget) !== JSON.stringify(prevPreviewTargetRef.current);
    prevPreviewTargetRef.current = previewTarget;

    if (changed && !reducedMotion) {
      fadeTransition(applyPreview);
    } else {
      applyPreview();
    }
  }, [previewStepIndex, previewTarget, isPreview, sortedQuestions.length]);

  const currentQuestion = currentStepIndex >= 0 && currentStepIndex < sortedQuestions.length
    ? sortedQuestions[currentStepIndex]
    : null;

  const questionText = currentQuestion
    ? applyTonePhrasing(currentQuestion.message, currentQuestion.label, currentQuestion.type, toneContract)
    : '';
  const { displayed: typedText, done: typingDone } = useTypewriter(questionText, 25, !isPreview && typewriterReady);

  useEffect(() => {
    if (phase === 'questions' && !transitioning && currentStepIndex >= 0 && !isPreview && typingDone) {
      const q = sortedQuestions[currentStepIndex];
      if (q?.type !== 'cta' && q?.type !== 'statement') {
        setTimeout(() => {
          inputRef.current?.focus();
          textareaRef.current?.focus();
        }, 100);
      }
    }
  }, [currentStepIndex, phase, transitioning, isPreview, typingDone]);

  const advanceToStep = (nextIndex: number) => {
    fadeTransition(() => {
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
    });
  };

  const handleSubmitAnswer = useCallback(() => {
    if (isPreview) return;
    if (currentStepIndex < 0 || currentStepIndex >= sortedQuestions.length) return;
    if (isAbandoned) return;

    const q = sortedQuestions[currentStepIndex];
    let value: any = inputValue;

    if (q.type === 'multiple_choice') {
      value = multiSelectValues;
    }

    const valueStr = Array.isArray(value) ? value.join(', ') : String(value || '');

    // Check for skip request
    if (isSkipRequest(valueStr) && !q.required) {
      const nextIndex = currentStepIndex + 1;
      setFieldAttempts(prev => ({ ...prev, [q.key]: 0 }));
      if (nextIndex >= sortedQuestions.length) {
        fadeTransition(() => {
          setPhase('submitting');
          const doSubmit = async () => {
            if (onSubmit) {
              try { await onSubmit(answers); } catch {}
            }
            setPhase('done');
          };
          doSubmit();
        });
      } else {
        advanceToStep(nextIndex);
      }
      return;
    }

    // Check for end request
    if (isEndRequest(valueStr)) {
      setIsAbandoned(true);
      fadeTransition(() => {
        setPhase('done');
      });
      return;
    }

    // Use new validation system
    const fieldType = mapQuestionTypeToFieldType(q.type);
    const validation = validateFieldAnswer(
      fieldType,
      valueStr,
      {
        required: q.required,
        selectOptions: q.options?.map(opt => opt.value),
      }
    );

    const currentAttempts = fieldAttempts[q.key] || 0;

    if (!validation.ok) {
      const newAttemptCount = currentAttempts + 1;
      const attemptLimit = getAttemptLimit(q.required);

      if (newAttemptCount >= attemptLimit && q.required) {
        // Max attempts reached on required field - end conversation
        setIsAbandoned(true);
        const endMessage = `I'm unable to continue without your ${q.label.toLowerCase()}. Thank you for your time.`;
        setError(endMessage);
        setTimeout(() => {
          fadeTransition(() => {
            setPhase('done');
          });
        }, 3000);
        return;
      }

      // Generate reprompt message
      const reprompt = generateRepromptMessage(
        q.label,
        fieldType,
        newAttemptCount,
        validation.reason,
        q.required,
        toneContract.preset
      );

      setError(reprompt);
      setFieldAttempts(prev => ({ ...prev, [q.key]: newAttemptCount }));
      return;
    }

    // Valid answer - advance
    const normalizedValue = validation.normalizedValue !== undefined ? validation.normalizedValue : value;
    const newAnswers = { ...answers, [q.key]: normalizedValue };
    setAnswers(newAnswers);
    setFieldAttempts(prev => ({ ...prev, [q.key]: 0 }));
    setError(null);

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= sortedQuestions.length) {
      fadeTransition(() => {
        setPhase('submitting');
        const doSubmit = async () => {
          if (onSubmit) {
            try { await onSubmit(newAnswers); } catch {}
          }
          setPhase('done');
        };
        doSubmit();
      });
    } else {
      advanceToStep(nextIndex);
    }
  }, [currentStepIndex, sortedQuestions, inputValue, multiSelectValues, answers, isPreview, onSubmit, fadeTransition, toneContract, fieldAttempts, isAbandoned]);

  const handleDirectAnswer = useCallback((value: any) => {
    if (isPreview) return;
    if (currentStepIndex < 0 || currentStepIndex >= sortedQuestions.length) return;
    if (isAbandoned) return;

    const q = sortedQuestions[currentStepIndex];
    const valueStr = Array.isArray(value) ? value.join(', ') : String(value || '');

    // Use new validation system
    const fieldType = mapQuestionTypeToFieldType(q.type);
    const validation = validateFieldAnswer(
      fieldType,
      valueStr,
      {
        required: q.required,
        selectOptions: q.options?.map(opt => opt.value),
      }
    );

    const currentAttempts = fieldAttempts[q.key] || 0;

    if (!validation.ok) {
      const newAttemptCount = currentAttempts + 1;
      const attemptLimit = getAttemptLimit(q.required);

      if (newAttemptCount >= attemptLimit && q.required) {
        // Max attempts reached on required field - end conversation
        setIsAbandoned(true);
        const endMessage = `I'm unable to continue without your ${q.label.toLowerCase()}. Thank you for your time.`;
        setError(endMessage);
        setTimeout(() => {
          fadeTransition(() => {
            setPhase('done');
          });
        }, 3000);
        return;
      }

      // Generate reprompt message
      const reprompt = generateRepromptMessage(
        q.label,
        fieldType,
        newAttemptCount,
        validation.reason,
        q.required,
        toneContract.preset
      );

      setError(reprompt);
      setFieldAttempts(prev => ({ ...prev, [q.key]: newAttemptCount }));
      return;
    }

    // Valid answer - advance
    const normalizedValue = validation.normalizedValue !== undefined ? validation.normalizedValue : value;
    const newAnswers = { ...answers, [q.key]: normalizedValue };
    setAnswers(newAnswers);
    setFieldAttempts(prev => ({ ...prev, [q.key]: 0 }));
    setError(null);

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= sortedQuestions.length) {
      fadeTransition(() => {
        setPhase('submitting');
        const doSubmit = async () => {
          if (onSubmit) {
            try { await onSubmit(newAnswers); } catch {}
          }
          setPhase('done');
        };
        doSubmit();
      });
    } else {
      advanceToStep(nextIndex);
    }
  }, [currentStepIndex, sortedQuestions, answers, isPreview, onSubmit, fadeTransition, toneContract, fieldAttempts, isAbandoned]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const progress = sortedQuestions.length > 0
    ? Math.round((currentStepIndex / sortedQuestions.length) * 100)
    : 0;

  const optionBtnClass = (selected: boolean) => {
    return selected
      ? 'bg-white/20 border-white/40 text-white'
      : 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/25 text-white/90';
  };

  const renderWelcome = () => {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-10" style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: reducedMotion ? 'none' : `opacity ${FADE_DURATION}ms ease-out, transform ${FADE_DURATION}ms ease-out`,
      }}>
        {config.welcomeTitle ? (
          <h1 className="font-bold mb-4 leading-tight text-white" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.5rem)' }}>{config.welcomeTitle}</h1>
        ) : (
          <h1 className="font-bold mb-4 leading-tight text-white" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.5rem)' }}>Welcome to {formName}</h1>
        )}
        {config.welcomeMessage && (
          <p className="leading-relaxed mb-10 max-w-md text-white/70" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>{config.welcomeMessage}</p>
        )}
        {!config.welcomeMessage && <div className="mb-10" />}
        <button
          disabled={isPreview}
          onClick={!isPreview ? startForm : undefined}
          className={`px-10 text-white font-semibold rounded-full transition-all ${isPreview ? 'cursor-default opacity-80' : 'hover:shadow-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'}`}
          style={{ backgroundColor: primaryColor, height: '52px', fontSize: '1rem' }}
        >
          {config.welcomeCta || 'Start'}
        </button>
      </div>
    );
  };

  const renderStepInput = (q: Question, typingDone: boolean) => {
    const inert = isPreview;
    const inputVisible = typingDone || inert;

    if (!inputVisible) return <div className="mt-8 h-12" />;

    const inputClasses = 'w-full bg-transparent border-0 border-b border-white/20 focus:border-white/50 text-white text-lg py-3 px-1 placeholder-white/30 focus:outline-none focus:ring-0 transition-colors';
    const submitBtnClasses = `mt-6 px-8 py-3 text-white text-sm font-medium rounded-full transition-all ${inert ? 'opacity-60 cursor-default' : 'hover:opacity-90 hover:shadow-lg'}`;

    switch (q.type) {
      case 'statement':
        return (
          <div className="mt-8 animate-cinematic-fade">
            {inert ? (
              <span className="inline-block px-8 py-3.5 text-white text-sm font-medium rounded-full opacity-60 cursor-default" style={{ backgroundColor: primaryColor }}>
                Continue &rarr;
              </span>
            ) : (
              <button
                onClick={() => advanceToStep(currentStepIndex + 1)}
                className="inline-block px-8 py-3.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Continue &rarr;
              </button>
            )}
          </div>
        );

      case 'file_upload':
        return (
          <div className="mt-8 animate-cinematic-fade">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center text-white/50 hover:border-white/30 transition-colors">
              <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-sm font-medium text-white/60">Drop a file here or click to browse</p>
              <p className="text-xs mt-1 text-white/30">PDF, images, documents up to 10MB</p>
            </div>
          </div>
        );

      case 'cta': {
        const resolvedUrl = resolveTemplate(q.cta?.url || '', answers);
        return (
          <div className="mt-8 animate-cinematic-fade">
            {inert ? (
              <span className="inline-block px-8 py-3.5 text-white text-sm font-medium rounded-full opacity-60 cursor-default" style={{ backgroundColor: primaryColor }}>
                {q.cta?.text || 'Continue'} &rarr;
              </span>
            ) : (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => advanceToStep(currentStepIndex + 1)}
                className="inline-block px-8 py-3.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {q.cta?.text || 'Continue'} &rarr;
              </a>
            )}
          </div>
        );
      }

      case 'yes_no':
        return (
          <div className="mt-8 animate-cinematic-fade">
            <div className="flex gap-3">
              <button
                disabled={inert}
                onClick={inert ? undefined : () => handleDirectAnswer('Yes')}
                className={`flex-1 py-3.5 px-6 rounded-full text-sm font-medium transition-all border ${optionBtnClass(false)} ${inert ? 'cursor-default opacity-60' : ''}`}
              >
                Yes
              </button>
              <button
                disabled={inert}
                onClick={inert ? undefined : () => handleDirectAnswer('No')}
                className={`flex-1 py-3.5 px-6 rounded-full text-sm font-medium transition-all border ${optionBtnClass(false)} ${inert ? 'cursor-default opacity-60' : ''}`}
              >
                No
              </button>
            </div>
          </div>
        );

      case 'single_choice':
        return (
          <div className="mt-8 space-y-2.5 animate-cinematic-fade">
            {(q.options || []).map(opt => (
              <button
                key={opt.id}
                disabled={inert}
                onClick={inert ? undefined : () => handleDirectAnswer(opt.value)}
                className={`w-full text-left py-3.5 px-5 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(false)} ${inert ? 'cursor-default opacity-60' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="mt-8 space-y-2.5 animate-cinematic-fade">
            {(q.options || []).map(opt => {
              const selected = multiSelectValues.includes(opt.value);
              return (
                <button
                  key={opt.id}
                  disabled={inert}
                  onClick={inert ? undefined : () => {
                    setMultiSelectValues(prev =>
                      prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                    );
                  }}
                  className={`w-full text-left py-3.5 px-5 rounded-xl text-sm font-medium transition-all border ${optionBtnClass(selected)} ${inert ? 'cursor-default opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${selected ? 'border-white bg-white/20' : 'border-white/30'}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    {opt.label}
                  </span>
                </button>
              );
            })}
            {!inert && (
              <button
                onClick={handleSubmitAnswer}
                disabled={multiSelectValues.length === 0 && q.required}
                className={submitBtnClasses}
                style={{ backgroundColor: primaryColor }}
              >
                Continue
              </button>
            )}
          </div>
        );

      case 'long_text':
        return (
          <div className="mt-8 space-y-4 animate-cinematic-fade">
            {!inert && error && <p className="text-xs text-red-300">{error}</p>}
            <textarea
              ref={inert ? undefined : textareaRef}
              readOnly={inert}
              tabIndex={inert ? -1 : undefined}
              value={inert ? '' : (inputValue || '')}
              onChange={inert ? undefined : (e) => { setInputValue(e.target.value); setError(null); }}
              onKeyDown={inert ? undefined : (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
              placeholder="Type here..."
              rows={3}
              className={`w-full bg-transparent border-0 border-b border-white/20 focus:border-white/50 text-white text-lg py-3 px-1 placeholder-white/30 focus:outline-none focus:ring-0 resize-none transition-colors ${inert ? 'cursor-default opacity-50' : ''}`}
            />
            {!inert && (
              <button onClick={handleSubmitAnswer} className={submitBtnClasses} style={{ backgroundColor: primaryColor }}>
                Continue
              </button>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="mt-8 space-y-4 animate-cinematic-fade">
            {!inert && error && <p className="text-xs text-red-300">{error}</p>}
            <input
              ref={inert ? undefined : inputRef}
              type="date"
              readOnly={inert}
              tabIndex={inert ? -1 : undefined}
              value={inert ? '' : (inputValue || '')}
              onChange={inert ? undefined : (e) => { setInputValue(e.target.value); setError(null); }}
              onKeyDown={inert ? undefined : handleKeyDown}
              className={`${inputClasses} ${inert ? 'cursor-default opacity-50' : ''}`}
              style={{ colorScheme: 'dark' }}
            />
            {!inert && (
              <button onClick={handleSubmitAnswer} className={submitBtnClasses} style={{ backgroundColor: primaryColor }}>
                Continue
              </button>
            )}
          </div>
        );

      default: {
        const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text';
        const placeholder = getPlaceholderText(q.type, toneContract);
        return (
          <div className="mt-8 space-y-4 animate-cinematic-fade">
            {!inert && error && <p className="text-xs text-red-300">{error}</p>}
            <input
              ref={inert ? undefined : inputRef}
              type={inputType}
              readOnly={inert}
              tabIndex={inert ? -1 : undefined}
              value={inert ? '' : (inputValue || '')}
              onChange={inert ? undefined : (e) => {
                setInputValue(q.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value);
                setError(null);
              }}
              onKeyDown={inert ? undefined : handleKeyDown}
              placeholder={placeholder}
              className={`${inputClasses} ${inert ? 'cursor-default opacity-50' : ''}`}
            />
            {!inert && (
              <div className="flex items-center gap-3">
                <button onClick={handleSubmitAnswer} className={submitBtnClasses} style={{ backgroundColor: primaryColor }}>
                  OK
                </button>
                <span className="text-xs text-white/30">press Enter ↵</span>
              </div>
            )}
          </div>
        );
      }
    }
  };

  const renderCurrentStep = () => {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const promptText = questionText;

    return (
      <div className="w-full max-w-2xl mx-auto px-8 sm:px-12" style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: reducedMotion ? 'none' : `opacity ${FADE_DURATION}ms ease-out, transform ${FADE_DURATION}ms ease-out`,
      }}>
        <p className="font-semibold leading-relaxed text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
          {isPreview ? promptText : typedText}
          {!isPreview && !typingDone && <span className="inline-block w-[2px] h-[1em] bg-white/70 ml-0.5 animate-blink align-baseline" />}
        </p>
        {renderStepInput(q, typingDone)}
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
    const endMessage = applyToneToEnd(config.endMessage, toneContract) || 'Thank you for your response!';

    return (
      <div className="flex flex-col items-center justify-center text-center px-8" style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: reducedMotion ? 'none' : `opacity ${FADE_DURATION}ms ease-out, transform ${FADE_DURATION}ms ease-out`,
      }}>
        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {showEnd ? (
          <>
            <p className="text-2xl font-semibold mb-3 text-white">{endMessage}</p>
            {config.endCtaText && config.endCtaUrl && (
              <a
                href={config.endCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-8 py-3.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {config.endCtaText}
              </a>
            )}
          </>
        ) : (
          <p className="text-2xl font-semibold text-white">Thank you!</p>
        )}
      </div>
    );
  };

  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center text-center px-8">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
      <p className="text-sm text-white/60">Sending your answers…</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full justify-center items-center relative" style={{ fontFamily }}>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s infinite;
        }
        @keyframes cinematicFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-cinematic-fade {
          animation: cinematicFade 0.5s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-blink { animation: none; }
          .animate-cinematic-fade { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      {config.theme?.customCss && <style>{config.theme.customCss}</style>}

      {phase === 'questions' && sortedQuestions.length > 0 && !isPreview && (
        <div className="absolute top-6 left-8 right-8 z-20">
          <div className="w-full h-[2px] rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-white/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] mt-2 text-white/40">{currentStepIndex + 1} of {sortedQuestions.length}</p>
        </div>
      )}

      {isPreview && (
        <div className="absolute top-4 left-8 right-8 z-20">
          <p className="text-[11px] font-medium tracking-wide uppercase text-white/40">
            {phase === 'welcome' ? '\u00A0' : phase === 'done' ? 'End screen' : phase === 'questions' && sortedQuestions.length > 0 ? `Step ${currentStepIndex + 1} of ${sortedQuestions.length}` : '\u00A0'}
          </p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center w-full">
        {phase === 'welcome' && config.welcomeEnabled && renderWelcome()}
        {phase === 'welcome' && !config.welcomeEnabled && isPreview && (
          <div className="text-center px-8">
            <p className="text-sm text-white/50">Select a step in the Journey panel to preview it here</p>
          </div>
        )}
        {phase === 'questions' && renderCurrentStep()}
        {phase === 'submitting' && renderSubmitting()}
        {phase === 'done' && renderEndScreen()}
      </div>

      {config.settings?.legalDisclaimer?.enabled && config.settings.legalDisclaimer.text && (
        <div className="absolute bottom-3 left-0 right-0 z-20 px-6 text-center pointer-events-none">
          <p className="text-[10px] leading-snug text-white/30 max-w-md mx-auto">
            {config.settings.legalDisclaimer.text}
          </p>
        </div>
      )}
    </div>
  );
}

export default ConversationalForm;
