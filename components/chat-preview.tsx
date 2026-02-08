'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

type DataField = {
  name: string;
  type: string;
  required: boolean;
  label: string;
  helpText: string;
  exampleAnswer?: string;
};

type ChatPreviewProps = {
  dataFields: DataField[];
  activeQuestionIndex: number;
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  tone: string;
  formName: string;
  welcomeMessage?: string;
  endMessage?: string;
};

function getGreeting(tone: string, companyName: string): string {
  const name = companyName || 'us';
  switch (tone) {
    case 'professional':
      return `Thank you for reaching out to ${name}. I'll walk you through a few quick questions so we can get started.`;
    case 'luxury':
      return `Welcome to ${name}. We're delighted to begin curating your experience. Let's start with a few details.`;
    case 'friendly':
    default:
      return `Hi there! Welcome to ${name}. I'll ask a few quick questions so we can help you with your request — let's go!`;
  }
}

function getQuestionPrompt(tone: string, label: string, helpText: string): string {
  const hint = helpText ? ` (${helpText})` : '';
  switch (tone) {
    case 'professional':
      return `Could you please share your ${label.toLowerCase()}?${hint}`;
    case 'luxury':
      return `May I kindly ask for your ${label.toLowerCase()}?${hint}`;
    case 'friendly':
    default:
      return `What's your ${label.toLowerCase()}?${hint}`;
  }
}

function getInputPlaceholder(field: DataField): string {
  if (field.exampleAnswer) return field.exampleAnswer;
  switch (field.type) {
    case 'email':
      return 'name@example.com';
    case 'phone':
      return '+1 (555) 123-4567';
    case 'number':
      return '0';
    case 'date':
      return 'MM/DD/YYYY';
    default:
      return 'Type your response...';
  }
}

function getInputType(fieldType: string): string {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'phone':
      return 'tel';
    default:
      return 'text';
  }
}

function TypingIndicator({ color }: { color?: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-4 py-3 bg-slate-100">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: color || '#64748b', animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: color || '#64748b', animationDelay: '200ms', animationDuration: '1s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: color || '#64748b', animationDelay: '400ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}

type MessageEntry = {
  type: 'assistant' | 'user';
  text: string;
  key: string;
};

export function ChatPreview({
  dataFields,
  activeQuestionIndex,
  companyName,
  logoUrl,
  primaryColor,
  tone,
  formName,
  welcomeMessage,
  endMessage,
}: ChatPreviewProps) {
  const currentField = dataFields[activeQuestionIndex] || dataFields[0];
  const previousFields = dataFields.slice(0, activeQuestionIndex);

  const defaultGreeting = useMemo(() => getGreeting(tone, companyName), [tone, companyName]);
  const greeting = welcomeMessage?.trim() || defaultGreeting;
  const currentPrompt = useMemo(
    () => currentField ? getQuestionPrompt(tone, currentField.label, currentField.helpText) : '',
    [tone, currentField?.label, currentField?.helpText]
  );

  const userBubbleColor = primaryColor || '#2563eb';
  const progressTotal = dataFields.filter((f) => f.required).length || dataFields.length;
  const progressCurrent = Math.min(activeQuestionIndex + 1, progressTotal);
  const progressPct = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  const completionText = endMessage?.trim() || 'Thanks for sharing those details! We\'ll be in touch soon.';
  const isComplete = activeQuestionIndex >= dataFields.length && dataFields.length > 0;

  const allMessages: MessageEntry[] = useMemo(() => {
    const msgs: MessageEntry[] = [{ type: 'assistant', text: greeting, key: 'greeting' }];
    previousFields.forEach((field, i) => {
      msgs.push({ type: 'assistant', text: getQuestionPrompt(tone, field.label, field.helpText), key: `q-${i}` });
      msgs.push({ type: 'user', text: field.exampleAnswer || getInputPlaceholder(field), key: `a-${i}` });
    });
    if (isComplete) {
      msgs.push({ type: 'assistant', text: completionText, key: 'completion' });
    } else if (currentField) {
      msgs.push({ type: 'assistant', text: currentPrompt, key: `q-current` });
    }
    return msgs;
  }, [greeting, previousFields, currentField, currentPrompt, tone, isComplete, completionText]);

  const [visibleCount, setVisibleCount] = useState(allMessages.length);
  const [showTyping, setShowTyping] = useState(false);
  const [newMessageStart, setNewMessageStart] = useState(-1);
  const prevLengthRef = useRef(allMessages.length);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const newLen = allMessages.length;
    prevLengthRef.current = newLen;

    if (newLen > prevLen) {
      setVisibleCount(prevLen);
      setShowTyping(true);
      setNewMessageStart(prevLen);

      const typingTimer = setTimeout(() => {
        setShowTyping(false);
        setVisibleCount(newLen);
      }, 400);

      return () => clearTimeout(typingTimer);
    } else {
      setVisibleCount(newLen);
      setShowTyping(false);
      setNewMessageStart(-1);
    }
  }, [allMessages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleCount, showTyping]);

  const visibleMessages = allMessages.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 flex flex-col overflow-hidden h-full">
        <div className="text-center px-4 pt-5 pb-3 border-b border-slate-100">
          {logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <h4 className="text-lg font-bold text-slate-900 mb-1 transition-all duration-300">
            {formName || 'Your conversation'}
          </h4>

          <div className="max-w-[200px] mx-auto mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Step {progressCurrent} of {progressTotal}</span>
              <span className="font-medium">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%`, backgroundColor: userBubbleColor }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-4 space-y-3">
              {visibleMessages.map((msg, i) => (
                <div
                  key={msg.key}
                  className="transition-all duration-300 ease-out"
                  style={{
                    animation: newMessageStart >= 0 && i >= newMessageStart ? 'chatFadeIn 0.3s ease-out' : undefined,
                  }}
                >
                  {msg.type === 'assistant' ? (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg px-4 py-3 bg-slate-100 text-slate-900">
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="max-w-[80%]">
                        <div
                          className="rounded-lg px-4 py-3 text-white"
                          style={{ backgroundColor: userBubbleColor }}
                        >
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showTyping && <TypingIndicator />}

              <div ref={chatEndRef} />
            </CardContent>
          </Card>
        </div>

        {currentField && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <Input
                type={getInputType(currentField.type)}
                placeholder={getInputPlaceholder(currentField)}
                disabled
                className="flex-1 bg-white text-sm"
              />
              <Button
                size="icon"
                disabled
                className="shrink-0"
                style={{ backgroundColor: userBubbleColor, borderColor: userBubbleColor }}
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes chatFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
