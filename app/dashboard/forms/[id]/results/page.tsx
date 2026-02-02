'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, Eye, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Response = {
  id: string;
  conversation_id: string;
  extracted_data: any;
  completed_at: string;
};

type Message = {
  role: string;
  content: string;
  created_at: string;
};

type Subscription = {
  plan: string;
  responses_limit: number;
  current_period_responses: number;
};

export default function ResultsPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formName, setFormName] = useState('');
  const [responses, setResponses] = useState<Response[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && formId) {
      loadResults();
    }
  }, [user, formId]);

  const loadResults = async () => {
    try {
      const [subscriptionResult, formResult, responsesResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan, responses_limit, current_period_responses')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('forms')
          .select('name')
          .eq('id', formId)
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('responses')
          .select('*')
          .eq('form_id', formId)
          .order('completed_at', { ascending: false }),
      ]);

      if (subscriptionResult.error) throw subscriptionResult.error;
      if (formResult.error) throw formResult.error;
      if (responsesResult.error) throw responsesResult.error;

      setSubscription(subscriptionResult.data);
      setFormName(formResult.data.name);
      setResponses(responsesResult.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const isOverGrace = () => {
    if (!subscription) return false;
    const graceLimit = subscription.responses_limit * 1.1;
    return subscription.current_period_responses > graceLimit;
  };

  const viewConversation = async (conversationId: string) => {
    if (isOverGrace()) {
      toast({
        title: 'Access Restricted',
        description: 'Please upgrade your plan to view conversation details.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedConversation(conversationId);
    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setConversationMessages(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const exportToCSV = () => {
    if (isOverGrace()) {
      toast({
        title: 'Access Restricted',
        description: 'Please upgrade your plan to export conversation data.',
        variant: 'destructive',
      });
      return;
    }

    if (responses.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no conversations to export',
        variant: 'destructive',
      });
      return;
    }

    const allKeys = new Set<string>();
    responses.forEach((response) => {
      Object.keys(response.extracted_data || {}).forEach((key) => allKeys.add(key));
    });

    const headers = ['Completed At', ...Array.from(allKeys)];
    const rows = responses.map((response) => {
      const row = [new Date(response.completed_at).toLocaleString()];
      allKeys.forEach((key) => {
        row.push(response.extracted_data?.[key] || '');
      });
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName.replace(/\s+/g, '-')}-conversations-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Conversations exported to CSV',
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const allDataKeys = new Set<string>();
  responses.forEach((response) => {
    Object.keys(response.extracted_data || {}).forEach((key) => allDataKeys.add(key));
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/forms/${formId}`)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{formName} - Results</h1>
                <p className="text-sm text-slate-600">{responses.length} conversations</p>
              </div>
            </div>
            <Button onClick={exportToCSV} disabled={responses.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isOverGrace() && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <Lock className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-900 font-semibold">
              Data Access Restricted
            </AlertTitle>
            <AlertDescription className="text-red-800">
              You've exceeded your monthly limit. Your forms continue accepting submissions, but detailed data viewing and exports are restricted. Upgrade your plan to restore full access.
              <Button
                variant="outline"
                size="sm"
                className="mt-3 bg-white border-red-300 text-red-900 hover:bg-red-50"
                onClick={() => router.push('/dashboard/subscription')}
              >
                View Plans
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {responses.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Conversations Yet</h3>
                <p className="text-slate-600">
                  Completed conversations will appear here once people finish your form
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Completed Conversations</CardTitle>
              <CardDescription>View and analyze all completed conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Completed</TableHead>
                      {Array.from(allDataKeys).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(response.completed_at).toLocaleDateString()}{' '}
                          {new Date(response.completed_at).toLocaleTimeString()}
                        </TableCell>
                        {Array.from(allDataKeys).map((key) => (
                          <TableCell key={key}>
                            {response.extracted_data?.[key] || '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewConversation(response.conversation_id)}
                            disabled={isOverGrace()}
                            className={isOverGrace() ? 'text-slate-400 cursor-not-allowed' : ''}
                          >
                            {isOverGrace() ? <Lock className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            View Chat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation History</DialogTitle>
            <DialogDescription>Complete conversation transcript</DialogDescription>
          </DialogHeader>
          {loadingMessages ? (
            <div className="py-8 text-center">Loading...</div>
          ) : (
            <div className="space-y-4">
              {conversationMessages.map((message, index) => (
                <div
                  key={index}
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
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
