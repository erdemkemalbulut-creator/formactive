'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  created_at: string;
};

type Form = {
  id: string;
  name: string;
  conversation_rules: string;
  business_info: any[];
  data_fields: any[];
};

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ collected: 0, total: 0, percentage: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadForm();
  }, [slug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) {
        console.error('[Form] Database error loading form:', error);
        throw new Error('FORM_NOT_FOUND');
      }
      if (!data) {
        throw new Error('FORM_NOT_FOUND');
      }

      setForm(data);
      await startConversation(data.id);
    } catch (error: any) {
      console.error('[Form] Failed to load form:', error);
      toast({
        title: 'Form Unavailable',
        description: 'This form is not available. Please check the link and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (formId: string) => {
    try {
      console.log('[Form] Starting conversation for form:', formId);

      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Form] Start conversation error:', {
          status: response.status,
          error: errorData.error
        });
        throw new Error('START_FAILED');
      }

      const data = await response.json();

      if (!data.conversationId || !data.message) {
        console.error('[Form] Invalid response from server:', data);
        throw new Error('INVALID_RESPONSE');
      }

      console.log('[Form] Conversation started:', data.conversationId);
      setConversationId(data.conversationId);

      const assistantMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: data.message,
        created_at: new Date().toISOString(),
      };

      setMessages([assistantMessage]);

      if (data.progress) {
        setProgress(data.progress);
      }

      console.log('[Form] Conversation started successfully');
    } catch (error: any) {
      console.error('[Form] Failed to start conversation:', error);

      toast({
        title: 'Unable to Start',
        description: 'We couldn\'t start the conversation. Please refresh the page and try again.',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          formId: form!.id,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Form] Send message error:', {
          status: response.status,
          error: errorData.error
        });
        throw new Error('SEND_FAILED');
      }

      const data = await response.json();

      if (!data.message) {
        console.error('[Form] No message in response:', data);
        throw new Error('NO_RESPONSE');
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.progress) {
        setProgress(data.progress);
      }

      if (data.completed) {
        setCompleted(true);
      }
    } catch (error: any) {
      console.error('[Form] Error sending message:', error);
      toast({
        title: 'Message Not Sent',
        description: 'Your message couldn\'t be sent. Please try again.',
        variant: 'destructive',
      });
      // Remove the user message from UI since it failed
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Form Not Found</h2>
            <p className="text-slate-600">This form is not available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredFieldsCount = form.data_fields.filter((f: any) => f.required).length;
  const showProgress = !completed && messages.length > 0 && requiredFieldsCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{form.name}</h1>
            {showProgress && (
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>
                    {progress.total > 0
                      ? `Step ${Math.min(progress.collected + 1, progress.total)} of ${progress.total}`
                      : 'In Progress'
                    }
                  </span>
                  <span className="font-medium">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.length === 0 && !loading && (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm">Starting conversation...</p>
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-lg px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {completed ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12 text-center">
                <div className="relative inline-block mb-4">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                  <Sparkles className="w-6 h-6 text-green-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  All Set!
                </h2>
                <p className="text-slate-700 text-lg mb-2">
                  Thank you for completing the form.
                </p>
                <p className="text-slate-600 text-sm">
                  Your responses have been received and saved.
                </p>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
