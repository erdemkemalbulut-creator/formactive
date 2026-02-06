'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type ConversationDetail = {
  id: string;
  form_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  form_name: string;
  form_slug: string;
};

type Response = {
  id: string;
  extracted_data: Record<string, any>;
  field_metadata?: Record<string, { confirmed: boolean; attempts: number }>;
  completed_at: string;
};

type DataField = {
  id: string;
  name: string;
  type: string;
  required: boolean;
};

export default function ConversationDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [response, setResponse] = useState<Response | null>(null);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && params.id) {
      loadConversationData();
    }
  }, [user, params.id]);

  const loadConversationData = async () => {
    try {
      const conversationId = params.id as string;

      const [conversationResult, messagesResult, responseResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, forms!inner(name, slug, data_fields, user_id)')
          .eq('id', conversationId)
          .eq('forms.user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        supabase
          .from('responses')
          .select('*')
          .eq('conversation_id', conversationId)
          .maybeSingle(),
      ]);

      if (conversationResult.error) throw conversationResult.error;
      if (messagesResult.error) throw messagesResult.error;

      if (!conversationResult.data) {
        toast({
          title: 'Not Found',
          description: 'Conversation not found',
          variant: 'destructive',
        });
        router.push('/dashboard/conversations');
        return;
      }

      const convData = conversationResult.data as any;
      setConversation({
        id: convData.id,
        form_id: convData.form_id,
        status: convData.status,
        started_at: convData.started_at,
        completed_at: convData.completed_at,
        form_name: convData.forms.name,
        form_slug: convData.forms.slug,
      });

      setMessages(messagesResult.data || []);
      setResponse(responseResult.data);
      setDataFields(convData.forms.data_fields || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      in_progress: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
      abandoned: { className: 'bg-slate-100 text-slate-600 border-slate-200' },
    };

    const config = variants[status as keyof typeof variants] || variants.in_progress;
    const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <Badge variant="secondary" className={config.className}>
        {label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return null;

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes === 0) {
      return `${seconds} seconds`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  const handleExportPDF = () => {
    if (!conversation || !response) return;

    window.print();
  };

  const handleExportCSV = () => {
    if (!conversation || !response) return;

    const headers = ['Field', 'Value'];
    const rows = Object.entries(response.extracted_data).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.id.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Data exported as CSV',
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const duration = calculateDuration(conversation.started_at, conversation.completed_at);

  return (
    <div className="min-h-screen bg-slate-50">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <header className="bg-white border-b border-slate-200 no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/conversations')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Conversations
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8" id="print-area">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">
                  {conversation.form_name}
                </h1>
                {getStatusBadge(conversation.status)}
              </div>
              <p className="text-sm text-slate-600">
                Conversation ID: <span className="font-mono text-slate-500">{conversation.id}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Started</div>
              <div className="text-base font-semibold text-slate-900">
                {formatDate(conversation.started_at)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Completed</div>
              <div className="text-base font-semibold text-slate-900">
                {conversation.completed_at ? formatDate(conversation.completed_at) : '—'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Duration</div>
              <div className="text-base font-semibold text-slate-900">
                {duration || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-slate-200 flex flex-col bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">
                Conversation Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 print:max-h-none">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No messages in this conversation
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            message.role === 'assistant'
                              ? 'text-blue-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {message.role === 'assistant' ? 'Assistant' : 'User'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <div
                        className={`p-4 rounded-lg text-sm leading-relaxed ${
                          message.role === 'assistant'
                            ? 'bg-blue-50 text-slate-800 border border-blue-100'
                            : 'bg-slate-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 flex flex-col bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Extracted Data
                </CardTitle>
                {response?.field_metadata && Object.values(response.field_metadata).some(m => !m.confirmed) && (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    Needs review
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {!response || Object.keys(response.extracted_data).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {conversation.status === 'completed'
                    ? 'No data extracted from this conversation'
                    : 'Data will be extracted when the conversation is completed'}
                </div>
              ) : (
                <>
                  {response.field_metadata && Object.values(response.field_metadata).some(m => !m.confirmed) && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-900 leading-relaxed">
                        <strong className="font-semibold">Note:</strong> Some fields are marked "Needs review" because they couldn't be extracted after 2 attempts. Please verify these values manually.
                      </p>
                    </div>
                  )}
                  <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 print:max-h-none">
                    {dataFields.map((field) => {
                      const value = response.extracted_data[field.name];
                      const metadata = response.field_metadata?.[field.name];
                      const isUnconfirmed = metadata && !metadata.confirmed;

                      return (
                        <div key={field.id}>
                          <div className="flex items-baseline justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {field.name}
                              </label>
                              {isUnconfirmed && (
                                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                  Needs review
                                </Badge>
                              )}
                            </div>
                            {field.required && (
                              <span className="text-xs text-slate-400">Required</span>
                            )}
                          </div>
                          <div className={`p-4 border rounded-lg ${isUnconfirmed ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                            {value !== undefined && value !== null ? (
                              <span className="text-sm text-slate-900 leading-relaxed break-words">
                                {typeof value === 'object'
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400 italic">
                                Not provided
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {Object.keys(response.extracted_data).length > dataFields.length && (
                      <>
                        <Separator className="my-6" />
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-3">
                            Additional Data
                          </h4>
                          <div className="space-y-4">
                            {Object.entries(response.extracted_data)
                              .filter(
                                ([key]) =>
                                  !dataFields.some((f) => f.name === key)
                              )
                              .map(([key, value]) => (
                                <div key={key}>
                                  <label className="text-sm font-medium text-slate-700 block mb-2">
                                    {key}
                                  </label>
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-sm text-slate-900">
                                      {typeof value === 'object'
                                        ? JSON.stringify(value, null, 2)
                                        : String(value)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {response && Object.keys(response.extracted_data).length > 0 && (
          <Card className="border-slate-200 bg-white no-print">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Export Options
                  </h3>
                  <p className="text-sm text-slate-600">
                    Download conversation data in your preferred format
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
