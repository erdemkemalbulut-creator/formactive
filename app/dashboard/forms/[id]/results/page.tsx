'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Question, FormConfig } from '@/lib/types';

interface Submission {
  id: string;
  form_id: string;
  answers: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

export default function ResultsPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formName, setFormName] = useState('');
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
      const [formResult, submissionsResult] = await Promise.all([
        supabase
          .from('forms')
          .select('name, current_config')
          .eq('id', formId)
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('submissions')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false }),
      ]);

      if (formResult.error) throw formResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      setFormName(formResult.data.name);
      setConfig(formResult.data.current_config);
      setSubmissions(submissionsResult.data || []);
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

  const exportCSV = () => {
    if (!config || submissions.length === 0) return;
    const questions = config.questions;
    const headers = ['#', 'Submitted', ...questions.map(q => q.label || q.key)];
    const rows = submissions.map((s, i) => [
      i + 1,
      new Date(s.created_at).toLocaleString(),
      ...questions.map(q => {
        const val = s.answers[q.key];
        if (Array.isArray(val)) return val.join(', ');
        return String(val ?? '');
      })
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
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

  const questions = config?.questions || [];
  const previewQuestions = questions.slice(0, 4);

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
                <h1 className="text-2xl font-bold text-slate-900">{formName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={exportCSV} disabled={submissions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-white">
            <CardContent className="py-20">
              <div className="text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No submissions yet
                </h3>
                <p className="text-sm text-slate-500">
                  Share your form to start collecting submissions. They will appear here as they come in.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Submitted</TableHead>
                      {previewQuestions.map((q) => (
                        <TableHead key={q.id}>{q.label || q.key}</TableHead>
                      ))}
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission, index) => (
                      <Fragment key={submission.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleRow(submission.id)}
                        >
                          <TableCell className="font-medium text-slate-500">
                            {index + 1}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(submission.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          {previewQuestions.map((q) => {
                            const val = submission.answers[q.key];
                            const display = Array.isArray(val)
                              ? val.join(', ')
                              : String(val ?? '—');
                            return (
                              <TableCell key={q.id} className="max-w-[200px] truncate">
                                {display}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {expandedRow === submission.id ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRow === submission.id && (
                          <TableRow key={`${submission.id}-expanded`}>
                            <TableCell colSpan={previewQuestions.length + 3} className="bg-slate-50 p-0">
                              <div className="p-6">
                                <h4 className="text-sm font-semibold text-slate-700 mb-4">All Answers</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {questions.map((q) => {
                                    const val = submission.answers[q.key];
                                    const display = Array.isArray(val)
                                      ? val.join(', ')
                                      : String(val ?? '—');
                                    return (
                                      <div key={q.id} className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                          {q.label || q.key}
                                        </p>
                                        <p className="text-sm text-slate-900">{display}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                                {submission.metadata && Object.keys(submission.metadata).length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Metadata</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(submission.metadata).map(([key, value]) => (
                                        <Badge key={key} variant="secondary" className="text-xs">
                                          {key}: {String(value)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
