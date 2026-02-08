'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FormConfig, Question, QuestionType } from '@/lib/types';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  isWelcome?: boolean;
  isEnd?: boolean;
  welcomeCta?: string;
}

export interface ConversationalFormProps {
  config: FormConfig;
  formName: string;
  onSubmit?: (answers: Record<string, any>) => Promise<void>;
  isPreview?: boolean;
}

const SAMPLE_ANSWERS: Record<QuestionType, string> = {
  short_text: 'Sample answer',
  long_text: 'This is a longer sample answer for preview.',
  email: 'user@example.com',
  phone: '+1 (555) 123-4567',
  number: '42',
  date: '2026-01-15',
  time: '14:30',
  dropdown: '',
  multi_select: '',
  checkbox: 'Yes',
  yes_no: 'Yes',
  rating: '⭐⭐⭐⭐⭐',
  file_upload: 'document.pdf',
  consent: 'I agree',
};

function getSampleAnswer(question: Question): string {
  if (question.type === 'dropdown' && question.options.length > 0) {
    return question.options[0].label;
  }
  if (question.type === 'multi_select' && question.options.length > 0) {
    return question.options.slice(0, 2).map(o => o.label).join(', ');
  }
  return SAMPLE_ANSWERS[question.type] || 'Sample';
}

function getSampleValue(question: Question): any {
  if (question.type === 'dropdown' && question.options.length > 0) {
    return question.options[0].value;
  }
  if (question.type === 'multi_select' && question.options.length > 0) {
    return question.options.slice(0, 2).map(o => o.value);
  }
  if (question.type === 'checkbox' || question.type === 'consent') return true;
  if (question.type === 'yes_no') return 'Yes';
  if (question.type === 'rating') return 5;
  if (question.type === 'number') return 42;
  return SAMPLE_ANSWERS[question.type] || 'Sample';
}

function formatAnswer(value: any, question: Question): string {
  if (value === undefined || value === null || value === '') return '';
  if (question.type === 'multi_select' && Array.isArray(value)) {
    const labels = value.map(v => {
      const opt = question.options.find(o => o.value === v);
      return opt ? opt.label : v;
    });
    return labels.join(', ');
  }
  if (question.type === 'dropdown') {
    const opt = question.options.find(o => o.value === value);
    return opt ? opt.label : String(value);
  }
  if (question.type === 'checkbox') return value ? 'Yes' : 'No';
  if (question.type === 'consent') return value ? 'I agree' : 'I disagree';
  if (question.type === 'rating') return '⭐'.repeat(Number(value));
  return String(value);
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

function TypingIndicator({ formName }: { formName: string }) {
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {formName.charAt(0).toUpperCase()}
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function BotBubble({ message, formName }: { message: ChatMessage; formName: string }) {
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {formName.charAt(0).toUpperCase()}
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function ConversationalForm({ config, formName, onSubmit, isPreview = false }: ConversationalFormProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [inputValue, setInputValue] = useState<any>('');
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showTyping, setShowTyping] = useState(false);
  const [phase, setPhase] = useState<'welcome' | 'questions' | 'submitting' | 'done'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTyping, scrollToBottom]);

  useEffect(() => {
    if (phase === 'questions' && currentQuestionIndex >= 0 && !showTyping) {
      setTimeout(() => {
        inputRef.current?.focus();
        textareaRef.current?.focus();
      }, 100);
    }
  }, [currentQuestionIndex, phase, showTyping]);

  const addBotMessage = useCallback((content: string, extra?: Partial<ChatMessage>) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: 'bot',
      content,
      ...extra,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const addUserMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: 'user',
      content,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const showNextQuestion = useCallback((index: number) => {
    if (index >= sortedQuestions.length) {
      setPhase('submitting');
      setShowTyping(true);
      const doSubmit = async () => {
        if (onSubmit) {
          try {
            await onSubmit(answers);
          } catch {}
        }
        setTimeout(() => {
          setShowTyping(false);
          addBotMessage(config.endMessage || 'Thank you for your submission!', { isEnd: true });
          setPhase('done');
        }, 400);
      };
      doSubmit();
      return;
    }
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      const q = sortedQuestions[index];
      let content = q.label;
      if (q.helpText) content += `\n${q.helpText}`;
      addBotMessage(content);
      setCurrentQuestionIndex(index);
      setInputValue('');
      setMultiSelectValues([]);
      setError(null);
    }, 400);
  }, [sortedQuestions, answers, onSubmit, config.endMessage, addBotMessage]);

  const startForm = useCallback(() => {
    setIsStarted(true);
    setPhase('questions');
    if (sortedQuestions.length === 0) {
      setPhase('submitting');
      setShowTyping(true);
      const doSubmit = async () => {
        if (onSubmit) {
          try { await onSubmit({}); } catch {}
        }
        setTimeout(() => {
          setShowTyping(false);
          addBotMessage(config.endMessage || 'Thank you!', { isEnd: true });
          setPhase('done');
        }, 400);
      };
      doSubmit();
      return;
    }
    showNextQuestion(0);
  }, [sortedQuestions, showNextQuestion, onSubmit, config.endMessage, addBotMessage]);

  useEffect(() => {
    if (config.welcomeEnabled) {
      const welcomeContent = config.welcomeTitle
        ? `${config.welcomeTitle}${config.welcomeMessage ? '\n' + config.welcomeMessage : ''}`
        : config.welcomeMessage || `Welcome to ${formName}!`;
      addBotMessage(welcomeContent, { isWelcome: true, welcomeCta: config.welcomeCta || 'Start' });
    } else {
      startForm();
    }
  }, []);

  useEffect(() => {
    if (!isPreview) return;
    if (!isStarted && config.welcomeEnabled) {
      const timer = setTimeout(() => {
        startForm();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPreview, isStarted, config.welcomeEnabled]);

  useEffect(() => {
    if (!isPreview || phase !== 'questions' || showTyping) return;
    if (currentQuestionIndex < 0 || currentQuestionIndex >= sortedQuestions.length) return;

    const maxPreviewQuestions = Math.min(3, sortedQuestions.length);
    if (currentQuestionIndex >= maxPreviewQuestions) return;

    const q = sortedQuestions[currentQuestionIndex];
    const timer = setTimeout(() => {
      const sampleDisplay = getSampleAnswer(q);
      const sampleVal = getSampleValue(q);
      addUserMessage(sampleDisplay);
      const newAnswers = { ...answers, [q.key]: sampleVal };
      setAnswers(newAnswers);

      if (currentQuestionIndex + 1 >= maxPreviewQuestions) {
        setShowTyping(true);
        setTimeout(() => {
          setShowTyping(false);
          addBotMessage(config.endMessage || 'Thank you for your submission!', { isEnd: true });
          setPhase('done');
        }, 400);
      } else {
        showNextQuestion(currentQuestionIndex + 1);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isPreview, phase, currentQuestionIndex, showTyping, sortedQuestions]);

  const handleSubmitAnswer = useCallback(() => {
    if (isPreview) return;
    if (currentQuestionIndex < 0 || currentQuestionIndex >= sortedQuestions.length) return;

    const q = sortedQuestions[currentQuestionIndex];
    let value: any = inputValue;

    if (q.type === 'multi_select') {
      value = multiSelectValues;
    }

    const validationError = validateAnswer(value, q);
    if (validationError) {
      setError(validationError);
      return;
    }

    const displayText = formatAnswer(value, q);
    addUserMessage(displayText);

    const newAnswers = { ...answers, [q.key]: value };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(-1);

    if (nextIndex >= sortedQuestions.length) {
      setPhase('submitting');
      setShowTyping(true);
      const doSubmit = async () => {
        if (onSubmit) {
          try { await onSubmit(newAnswers); } catch {}
        }
        setTimeout(() => {
          setShowTyping(false);
          addBotMessage(config.endMessage || 'Thank you for your submission!', { isEnd: true });
          setPhase('done');
        }, 400);
      };
      doSubmit();
    } else {
      showNextQuestion(nextIndex);
    }
  }, [currentQuestionIndex, sortedQuestions, inputValue, multiSelectValues, answers, isPreview, onSubmit, config.endMessage, addBotMessage, addUserMessage, showNextQuestion]);

  const handleDirectAnswer = useCallback((value: any, displayText: string) => {
    if (isPreview) return;
    if (currentQuestionIndex < 0 || currentQuestionIndex >= sortedQuestions.length) return;

    const q = sortedQuestions[currentQuestionIndex];

    const validationError = validateAnswer(value, q);
    if (validationError) {
      setError(validationError);
      return;
    }

    addUserMessage(displayText);

    const newAnswers = { ...answers, [q.key]: value };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(-1);

    if (nextIndex >= sortedQuestions.length) {
      setPhase('submitting');
      setShowTyping(true);
      const doSubmit = async () => {
        if (onSubmit) {
          try { await onSubmit(newAnswers); } catch {}
        }
        setTimeout(() => {
          setShowTyping(false);
          addBotMessage(config.endMessage || 'Thank you for your submission!', { isEnd: true });
          setPhase('done');
        }, 400);
      };
      doSubmit();
    } else {
      showNextQuestion(nextIndex);
    }
  }, [currentQuestionIndex, sortedQuestions, answers, isPreview, onSubmit, config.endMessage, addBotMessage, addUserMessage, showNextQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const currentQuestion = currentQuestionIndex >= 0 && currentQuestionIndex < sortedQuestions.length
    ? sortedQuestions[currentQuestionIndex]
    : null;

  const renderInputArea = () => {
    if (isPreview) return null;
    if (phase === 'done' || phase === 'submitting') return null;
    if (!isStarted && config.welcomeEnabled) return null;
    if (!currentQuestion || showTyping) return null;

    const q = currentQuestion;

    switch (q.type) {
      case 'yes_no':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectAnswer('Yes', 'Yes')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleDirectAnswer('No', 'No')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium transition-colors"
              >
                No
              </button>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectAnswer(true, 'Yes')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleDirectAnswer(false, 'No')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium transition-colors"
              >
                No
              </button>
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectAnswer(true, 'I agree')}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
              >
                I agree
              </button>
              <button
                onClick={() => handleDirectAnswer(false, 'I disagree')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-full text-sm font-medium transition-colors"
              >
                I disagree
              </button>
            </div>
          </div>
        );

      case 'dropdown':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {(q.options || []).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleDirectAnswer(opt.value, opt.label)}
                  className="py-2 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-full text-sm font-medium transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'multi_select':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex flex-wrap gap-2 mb-3">
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
                    className={`py-2 px-4 rounded-full text-sm font-medium transition-colors border ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleSubmitAnswer}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        );

      case 'rating':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleDirectAnswer(star, '⭐'.repeat(star))}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-10 h-10 ${star <= (inputValue || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
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
          </div>
        );

      case 'file_upload':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 border-dashed rounded-xl cursor-pointer transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-600 font-medium">Upload a file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDirectAnswer(file.name, file.name);
                  }
                }}
              />
            </label>
          </div>
        );

      case 'date':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="date"
                value={inputValue || ''}
                onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitAnswer}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="time"
                value={inputValue || ''}
                onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitAnswer}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );

      case 'long_text':
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2 items-end">
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
                placeholder={q.placeholder || 'Type your answer...'}
                rows={2}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSubmitAnswer}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 border-t border-gray-200 bg-white">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text'}
                value={inputValue || ''}
                onChange={(e) => { setInputValue(q.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={q.placeholder || 'Type your answer...'}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitAnswer}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          if (msg.type === 'bot' && msg.isWelcome && !isStarted && !isPreview) {
            return (
              <div key={msg.id} className="flex items-start gap-2 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {formName.charAt(0).toUpperCase()}
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                  <button
                    onClick={startForm}
                    className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors"
                  >
                    {msg.welcomeCta || 'Start'}
                  </button>
                </div>
              </div>
            );
          }
          if (msg.type === 'bot') {
            return <BotBubble key={msg.id} message={msg} formName={formName} />;
          }
          return <UserBubble key={msg.id} message={msg} />;
        })}

        {showTyping && <TypingIndicator formName={formName} />}

        <div ref={chatEndRef} />
      </div>

      {renderInputArea()}
    </div>
  );
}

export default ConversationalForm;
