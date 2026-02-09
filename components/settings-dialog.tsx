'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormConfig, FormTheme, FormSettings, DEFAULT_FORM_SETTINGS } from '@/lib/types';
import { Lock, Globe, Link2 } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  config: FormConfig;
  onFormNameChange: (name: string) => void;
  onThemeChange: (updates: Partial<FormTheme>) => void;
  onSettingsChange: (updates: Partial<FormSettings>) => void;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'System', label: 'System' },
  { value: 'Serif', label: 'Serif' },
];

const TEXT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export function SettingsDialog({
  open,
  onOpenChange,
  formName,
  config,
  onFormNameChange,
  onThemeChange,
  onSettingsChange,
}: SettingsDialogProps) {
  const settings = { ...DEFAULT_FORM_SETTINGS, ...config.settings };
  const colors = { ...DEFAULT_FORM_SETTINGS.colors, ...settings.colors };
  const tracking = { ...DEFAULT_FORM_SETTINGS.tracking, ...settings.tracking };
  const legalDisclaimer = { ...DEFAULT_FORM_SETTINGS.legalDisclaimer, ...settings.legalDisclaimer };

  const updateColors = (key: 'background' | 'text' | 'button', value: string) => {
    onSettingsChange({
      colors: { ...colors, [key]: value },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
          <DialogDescription className="sr-only">Configure your form settings</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <div className="px-6 pt-3">
            <TabsList className="w-full h-9 bg-slate-100">
              <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1 text-xs">Advanced</TabsTrigger>
              <TabsTrigger value="tracking" className="flex-1 text-xs">Tracking</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="px-6 pb-6 pt-4 space-y-5 mt-0">
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Title</label>
              <Input
                value={formName}
                onChange={(e) => onFormNameChange(e.target.value)}
                placeholder="My form"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-1 block">Colors</label>
              <p className="text-[11px] text-slate-400 mb-2.5">Background, text & button colors</p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <input
                      type="color"
                      value={colors.background}
                      onChange={(e) => updateColors('background', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Background</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <input
                      type="color"
                      value={colors.text}
                      onChange={(e) => updateColors('text', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Text</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <input
                      type="color"
                      value={colors.button}
                      onChange={(e) => {
                        updateColors('button', e.target.value);
                        onThemeChange({ primaryColor: e.target.value });
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Button</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Font</label>
              <Select
                value={config.theme?.fontFamily || 'Inter'}
                onValueChange={(v) => onThemeChange({ fontFamily: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-sm">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Text size</label>
              <Select
                value={settings.textSize || 'medium'}
                onValueChange={(v) => onSettingsChange({ textSize: v as 'small' | 'medium' | 'large' })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-[13px] font-medium text-slate-700 block">Hide FormActive logo</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Remove branding from your form</p>
              </div>
              <Switch
                checked={settings.hideBranding || false}
                onCheckedChange={(v) => onSettingsChange({ hideBranding: v })}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-[13px] font-medium text-slate-700 block">Close form</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Stop accepting additional responses</p>
              </div>
              <Switch
                checked={settings.isClosed || false}
                onCheckedChange={(v) => onSettingsChange({ isClosed: v })}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-[13px] font-medium text-slate-700 block">Show legal disclaimer</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Display fine print at the bottom of your form</p>
              </div>
              <Switch
                checked={legalDisclaimer.enabled || false}
                onCheckedChange={(v) => onSettingsChange({ legalDisclaimer: { ...legalDisclaimer, enabled: v } })}
              />
            </div>
            {legalDisclaimer.enabled && (
              <div>
                <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Disclaimer text</label>
                <textarea
                  value={legalDisclaimer.text || ''}
                  onChange={(e) => onSettingsChange({ legalDisclaimer: { ...legalDisclaimer, text: e.target.value } })}
                  placeholder="By continuing, you agree to our Terms of Service and Privacy Policy."
                  rows={3}
                  className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 resize-none"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="px-6 pb-6 pt-4 space-y-5 mt-0">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <Globe className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-600">Share settings</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Control who can view and fill out this form. Coming soon.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <Lock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-600">Access control</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Restrict access with passwords or allowed email domains. Coming soon.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <Link2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-600">Custom domain</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Host your form on your own domain. Coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="px-6 pb-6 pt-4 space-y-5 mt-0">
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-[13px] font-medium text-slate-700 block">Collect basic analytics</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Track views, completions, and drop-off rates</p>
              </div>
              <Switch
                checked={tracking.enabled !== false}
                onCheckedChange={(v) => onSettingsChange({ tracking: { ...tracking, enabled: v } })}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-[13px] font-medium text-slate-700 block">Exclude preview activity</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Don't count editor previews in your analytics</p>
              </div>
              <Switch
                checked={tracking.excludeBuilderPreview !== false}
                onCheckedChange={(v) => onSettingsChange({ tracking: { ...tracking, excludeBuilderPreview: v } })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
