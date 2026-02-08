'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2, Copy, ExternalLink, BarChart3, CheckCircle2, AlertCircle, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DataField = {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date';
  required: boolean;
};

type BusinessInfo = {
  id: string;
  key: string;
  value: string;
};

export default function FormBuilderPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formName, setFormName] = useState('');
  const [conversationRules, setConversationRules] = useState('');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && formId) {
      loadForm();
    }
  }, [user, formId]);

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setFormName(data.name);
      setConversationRules(data.conversation_rules);

      let businessInfoArray = [];
      if (data.business_info) {
        if (Array.isArray(data.business_info)) {
          businessInfoArray = data.business_info;
        } else if (typeof data.business_info === 'object') {
          businessInfoArray = Object.entries(data.business_info).map(([key, value], index) => ({
            id: `${index}`,
            key: key,
            value: String(value),
          }));
        }
      }

      setBusinessInfo(businessInfoArray);
      setDataFields(data.data_fields || []);
      setIsPublished(data.is_published);
      setSlug(data.slug);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load form',
        variant: 'destructive',
      });
      router.push('/dashboard');
    } finally {
      setLoadingForm(false);
    }
  };

  const saveForm = async (shouldPublish = false) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('forms')
        .update({
          name: formName,
          conversation_rules: conversationRules,
          business_info: businessInfo,
          data_fields: dataFields,
          is_published: shouldPublish ? true : isPublished,
        })
        .eq('id', formId);

      if (error) throw error;

      if (shouldPublish && !isPublished) {
        setIsPublished(true);
      }

      toast({
        title: 'Success',
        description: shouldPublish ? 'Form published successfully' : 'Draft saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canPublish = () => {
    return (
      formName.trim() !== '' &&
      dataFields.length > 0 &&
      dataFields.every(f => f.name.trim() !== '') &&
      conversationRules.trim() !== ''
    );
  };

  const getPublishIssues = () => {
    const issues = [];
    if (formName.trim() === '') issues.push('Form name is required');
    if (dataFields.length === 0) issues.push('At least one data field is required');
    if (dataFields.some(f => f.name.trim() === '')) issues.push('All data fields must have a name');
    if (conversationRules.trim() === '') issues.push('Conversation rules are required');
    return issues;
  };

  const addBusinessInfo = () => {
    setBusinessInfo([...businessInfo, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const updateBusinessInfo = (id: string, field: 'key' | 'value', value: string) => {
    setBusinessInfo(businessInfo.map(info =>
      info.id === id ? { ...info, [field]: value } : info
    ));
  };

  const removeBusinessInfo = (id: string) => {
    setBusinessInfo(businessInfo.filter(info => info.id !== id));
  };

  const addDataField = () => {
    setDataFields([...dataFields, {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: true,
    }]);
  };

  const updateDataField = (id: string, field: keyof DataField, value: any) => {
    setDataFields(dataFields.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const removeDataField = (id: string) => {
    setDataFields(dataFields.filter(f => f.id !== id));
  };

  const copyFormUrl = () => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied',
      description: 'Form URL copied to clipboard',
    });
  };

  if (loading || loadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  const formUrl = `${window.location.origin}/f/${slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{formName || 'Untitled Form'}</h1>
                  {isPublished ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                      Draft
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPublished && (
                <>
                  <Button variant="outline" size="sm" onClick={copyFormUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(formUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/forms/${formId}/results`)}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Results
                  </Button>
                </>
              )}
              <Button onClick={() => saveForm(false)} disabled={saving}>
                {saving ? 'Saving...' : 'Save draft'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="conversation">Conversation Rules</TabsTrigger>
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="fields">Data Fields</TabsTrigger>
            <TabsTrigger value="publish">Review & Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
                <CardDescription>Configure basic form settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="formName">Form Name</Label>
                  <Input
                    id="formName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Customer Intake Form"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Form URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      value={slug}
                      disabled
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    Public URL: {formUrl}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversation">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Rules</CardTitle>
                <CardDescription>
                  Define how the conversation should flow and what tone to use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={conversationRules}
                  onChange={(e) => setConversationRules(e.target.value)}
                  placeholder="Example: You are a friendly assistant helping customers with our service. Be conversational and ask one question at a time. Keep responses brief and engaging."
                  className="min-h-[300px]"
                />
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Tips for writing great conversation rules:</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Specify the tone (friendly, professional, casual, formal)</li>
                    <li>Mention asking one question at a time for better engagement</li>
                    <li>Include guidance on handling unclear or off-topic responses</li>
                    <li>Define how to acknowledge when all information is collected</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Add context about your business that may be relevant to the conversation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessInfo.map((info) => (
                  <div key={info.id} className="flex gap-2">
                    <Input
                      placeholder="Key (e.g., Company Name)"
                      value={info.key}
                      onChange={(e) => updateBusinessInfo(info.id, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value (e.g., Acme Corp)"
                      value={info.value}
                      onChange={(e) => updateBusinessInfo(info.id, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBusinessInfo(info.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addBusinessInfo} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business Info
                </Button>
                <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">What to include in business info:</p>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>Company name, website, or contact information</li>
                    <li>Product or service details that help provide context</li>
                    <li>Hours of operation, locations, or availability</li>
                    <li>Any information the assistant might need to reference</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields">
            <Card>
              <CardHeader>
                <CardTitle>Data Fields</CardTitle>
                <CardDescription>
                  Define the information you want to collect from each conversation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataFields.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg py-12">
                    <div className="text-center max-w-xs mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <ListChecks className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">No fields yet</h4>
                      <p className="text-sm text-slate-500 mb-4">
                        Fields define what information the conversation will collect.
                      </p>
                      <Button onClick={addDataField} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add your first field
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {dataFields.map((field) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Field name (e.g., Full Name)"
                            value={field.name}
                            onChange={(e) => updateDataField(field.id, 'name', e.target.value)}
                          />
                        </div>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateDataField(field.id, 'type', value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateDataField(field.id, 'required', checked)}
                          />
                          <span className="text-sm text-slate-600">Required</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDataField(field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={addDataField} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Data Field
                    </Button>
                  </>
                )}
                <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-900 mb-2">Understanding data fields:</p>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li><strong>Field Name:</strong> What you're asking for (e.g., Full Name, Email, Phone)</li>
                    <li><strong>Type:</strong> Helps validate and format the data correctly</li>
                    <li><strong>Required:</strong> The conversation won't complete until all required fields are collected</li>
                    <li>The AI will ask questions naturally to collect each field</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publish">
            <Card>
              <CardHeader>
                <CardTitle>Review & Publish</CardTitle>
                <CardDescription>
                  Review your form and publish it to make it publicly accessible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Form Overview</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Form Name</span>
                        <span className="font-medium text-slate-900">{formName || '—'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Public URL</span>
                        <span className="font-mono text-xs text-slate-700">/f/{slug}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Data Fields</span>
                        <span className="font-medium text-slate-900">{dataFields.length} field{dataFields.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Business Info Items</span>
                        <span className="font-medium text-slate-900">{businessInfo.length} item{businessInfo.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Status</span>
                        {isPublished ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {!canPublish() && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <p className="font-semibold mb-2">This form cannot be published yet</p>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          {getPublishIssues().map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {isPublished && (
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-900">
                        <p className="font-semibold mb-1">This form is live</p>
                        <p className="text-sm">Your form is publicly accessible and collecting responses.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isPublished && canPublish() && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <p className="font-semibold mb-1">Ready to publish</p>
                        <p className="text-sm">Your form is configured and ready to go live.</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  {!isPublished ? (
                    <Button
                      onClick={() => saveForm(true)}
                      disabled={!canPublish() || saving}
                      size="lg"
                      className="w-full"
                    >
                      {saving ? 'Publishing...' : 'Publish form'}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        onClick={copyFormUrl}
                        size="lg"
                        className="w-full"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy form link
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(formUrl, '_blank')}
                        size="lg"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View live form
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
