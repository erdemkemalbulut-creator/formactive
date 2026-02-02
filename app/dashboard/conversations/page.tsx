'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, LogOut, Share2, Eye, ArrowLeft, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ConversationWithForm = {
  id: string;
  form_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  form_name: string;
  form_slug: string;
};

type Form = {
  id: string;
  name: string;
};

type Subscription = {
  plan: string;
  responses_limit: number;
  current_period_responses: number;
};

export default function ConversationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationWithForm[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('completed');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load subscription, forms, and conversations in parallel
      const [subscriptionResult, formsResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan, responses_limit, current_period_responses')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('forms')
          .select('id, name')
          .eq('user_id', user!.id)
          .order('name', { ascending: true }),
      ]);

      if (subscriptionResult.error) throw subscriptionResult.error;
      if (formsResult.error) throw formsResult.error;

      const userFormIds = (formsResult.data || []).map(f => f.id);

      // Only fetch conversations for the user's forms
      const conversationsResult = await supabase
        .from('conversations')
        .select('*, forms!inner(name, slug)')
        .in('form_id', userFormIds.length > 0 ? userFormIds : ['00000000-0000-0000-0000-000000000000'])
        .order('started_at', { ascending: false });

      if (conversationsResult.error) throw conversationsResult.error;

      const conversationsWithForms = (conversationsResult.data || []).map((conv: any) => ({
        id: conv.id,
        form_id: conv.form_id,
        status: conv.status,
        started_at: conv.started_at,
        completed_at: conv.completed_at,
        form_name: conv.forms.name,
        form_slug: conv.forms.slug,
      }));

      setConversations(conversationsWithForms);
      setForms(formsResult.data || []);
      setSubscription(subscriptionResult.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: 'default' as const, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
      in_progress: { variant: 'secondary' as const, className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' },
      abandoned: { variant: 'secondary' as const, className: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100' },
    };

    const config = variants[status as keyof typeof variants] || variants.in_progress;
    const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <Badge variant={config.variant} className={config.className}>
        {label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return '—';

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes === 0) {
      return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const filteredConversations = conversations.filter((conv) => {
    // Handle status filter
    if (statusFilter !== 'all' && conv.status !== statusFilter) {
      return false;
    }

    // Handle form filter
    if (formFilter !== 'all' && conv.form_id !== formFilter) return false;

    // Handle date filter
    if (dateFilter !== 'all') {
      const convDate = new Date(conv.started_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today' && daysDiff > 0) return false;
      if (dateFilter === 'last7' && daysDiff > 7) return false;
      if (dateFilter === 'last30' && daysDiff > 30) return false;
    }

    return true;
  });

  const isOverGrace = () => {
    if (!subscription) return false;
    const graceLimit = subscription.responses_limit * 1.1;
    return subscription.current_period_responses > graceLimit;
  };

  const handleViewConversation = (conversationId: string) => {
    if (isOverGrace()) {
      toast({
        title: 'Access Restricted',
        description: 'Please upgrade your plan to view conversation details.',
        variant: 'destructive',
      });
      return;
    }
    router.push(`/dashboard/conversations/${conversationId}`);
  };

  const handleShareForm = (formSlug: string) => {
    const url = `${window.location.origin}/f/${formSlug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied',
      description: 'Form link has been copied to clipboard',
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-slate-900">FormFlow</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await router.push('/');
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Conversations</h2>
              <p className="text-slate-600 mt-1">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
          </div>

          {isOverGrace() && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <Lock className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-semibold">
                Conversation Access Restricted
              </AlertTitle>
              <AlertDescription className="text-red-800">
                You've exceeded your monthly limit. Your forms continue accepting submissions, but detailed conversation data is restricted. Upgrade your plan to restore full access.
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

          {conversations.length === 0 ? (
            <Card className="border-slate-200">
              <div className="py-16 px-6">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Once someone completes one of your forms, their conversation will appear here.
                  </p>
                  <Button onClick={() => router.push('/dashboard')}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share a form
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-white border-slate-200">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                      <SelectItem value="all">All Statuses</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={formFilter} onValueChange={setFormFilter}>
                    <SelectTrigger className="w-[200px] bg-white border-slate-200">
                      <SelectValue placeholder="Filter by form" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px] bg-white border-slate-200">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7">Last 7 days</SelectItem>
                      <SelectItem value="last30">Last 30 days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-slate-500">
                  Note: Abandoned conversations have had no user activity for 24+ hours
                </p>
              </div>

              <Card className="border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="font-semibold text-slate-700">Conversation ID</TableHead>
                      <TableHead className="font-semibold text-slate-700">Form</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Started</TableHead>
                      <TableHead className="font-semibold text-slate-700">Completed</TableHead>
                      <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConversations.map((conversation) => (
                      <TableRow key={conversation.id} className="border-slate-200">
                        <TableCell className="font-mono text-xs text-slate-600">
                          {conversation.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {conversation.form_name}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(conversation.status)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {formatDate(conversation.started_at)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {conversation.completed_at ? formatDate(conversation.completed_at) : '—'}
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">
                          {calculateDuration(conversation.started_at, conversation.completed_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewConversation(conversation.id)}
                              className={isOverGrace() ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'}
                              disabled={isOverGrace()}
                            >
                              {isOverGrace() ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShareForm(conversation.form_slug)}
                              className="text-slate-600 hover:text-slate-900"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
