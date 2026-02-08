'use client';

import { useMemo } from 'react';
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
};

function getGreeting(tone: string, companyName: string): string {
  const name = companyName || 'us';
  switch (tone) {
    case 'professional':
      return `Thank you for reaching out to ${name}. I'll walk you through a few quick questions so we can start planning your trip.`;
    case 'luxury':
      return `Welcome to ${name}. We're delighted to begin curating your experience. Let's start with a few details.`;
    case 'friendly':
    default:
      return `Hi there! Welcome to ${name}. I'd love to help plan your perfect trip — let's get started!`;
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

export function ChatPreview({
  dataFields,
  activeQuestionIndex,
  companyName,
  logoUrl,
  primaryColor,
  tone,
  formName,
}: ChatPreviewProps) {
  const currentField = dataFields[activeQuestionIndex] || dataFields[0];
  const previousFields = dataFields.slice(0, activeQuestionIndex);

  const greeting = useMemo(() => getGreeting(tone, companyName), [tone, companyName]);
  const currentPrompt = useMemo(
    () => currentField ? getQuestionPrompt(tone, currentField.label, currentField.helpText) : '',
    [tone, currentField?.label, currentField?.helpText]
  );

  const userBubbleColor = primaryColor || '#2563eb';
  const progressTotal = dataFields.filter((f) => f.required).length || dataFields.length;
  const progressCurrent = Math.min(activeQuestionIndex + 1, progressTotal);
  const progressPct = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

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
          <h4 className="text-lg font-bold text-slate-900 mb-1">
            {formName || 'Your Form'}
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
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-4 py-3 bg-slate-100 text-slate-900">
                  <p className="text-sm whitespace-pre-wrap">{greeting}</p>
                </div>
              </div>

              {previousFields.map((field, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-4 py-3 bg-slate-100 text-slate-900">
                      <p className="text-sm whitespace-pre-wrap">
                        {getQuestionPrompt(tone, field.label, field.helpText)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div
                        className="rounded-lg px-4 py-3 text-white"
                        style={{ backgroundColor: userBubbleColor }}
                      >
                        <p className="text-sm">{field.exampleAnswer || getInputPlaceholder(field)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {currentField && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-4 py-3 bg-slate-100 text-slate-900">
                    <p className="text-sm whitespace-pre-wrap">{currentPrompt}</p>
                  </div>
                </div>
              )}
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
    </div>
  );
}
