'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormConfig, FormTheme, FormSettings, DEFAULT_FORM_SETTINGS } from '@/lib/types';

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

function ToggleRow({ label, helper, checked, onChange }: { label: string; helper: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <label className="text-[13px] font-medium text-slate-700 block">{label}</label>
        <p className="text-[11px] text-slate-400 mt-0.5">{helper}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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
  const notifications = { ...DEFAULT_FORM_SETTINGS.notifications, ...settings.notifications };

  const updateColors = (key: 'background' | 'text' | 'button', value: string) => {
    onSettingsChange({ colors: { ...colors, [key]: value } });
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

          {/* GENERAL — identity + look & feel */}
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
                {([
                  { key: 'background' as const, label: 'Background' },
                  { key: 'text' as const, label: 'Text' },
                  { key: 'button' as const, label: 'Button' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => {
                        updateColors(key, e.target.value);
                        if (key === 'button') onThemeChange({ primaryColor: e.target.value });
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <span className="text-[10px] text-slate-400">{label}</span>
                  </div>
                ))}
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
                    <SelectItem key={f.value} value={f.value} className="text-sm">{f.label}</SelectItem>
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
                    <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ToggleRow
              label="Hide FormActive logo"
              helper="Remove branding from your form"
              checked={settings.hideBranding || false}
              onChange={(v) => onSettingsChange({ hideBranding: v })}
            />
          </TabsContent>

          {/* ADVANCED — behavior */}
          <TabsContent value="advanced" className="px-6 pb-6 pt-4 space-y-5 mt-0">
            <ToggleRow
              label="Close form"
              helper="Stop accepting new responses"
              checked={settings.isClosed || false}
              onChange={(v) => onSettingsChange({ isClosed: v })}
            />

            <ToggleRow
              label="Skip welcome screen"
              helper="Jump straight to the first question"
              checked={settings.skipWelcome || false}
              onChange={(v) => onSettingsChange({ skipWelcome: v })}
            />

            <ToggleRow
              label="Enable restore chat"
              helper="Let returning visitors resume where they left off"
              checked={settings.restoreChat || false}
              onChange={(v) => onSettingsChange({ restoreChat: v })}
            />

            <ToggleRow
              label="Strict data collection"
              helper="Keep the chat natural, but don't move on until required fields are collected"
              checked={settings.strictDataCollection !== false}
              onChange={(v) => onSettingsChange({ strictDataCollection: v })}
            />

            <div className="border-t border-slate-100 pt-4">
              <ToggleRow
                label="Email notifications"
                helper="Get notified when someone completes your form"
                checked={notifications.enabled || false}
                onChange={(v) => onSettingsChange({ notifications: { ...notifications, enabled: v } })}
              />
              {notifications.enabled && (
                <div className="mt-3">
                  <Input
                    type="email"
                    value={notifications.email || ''}
                    onChange={(e) => onSettingsChange({ notifications: { ...notifications, email: e.target.value } })}
                    placeholder="you@example.com"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <ToggleRow
                label="Legal disclaimer"
                helper="Show fine print at the bottom of your form"
                checked={legalDisclaimer.enabled || false}
                onChange={(v) => onSettingsChange({ legalDisclaimer: { ...legalDisclaimer, enabled: v } })}
              />
              {legalDisclaimer.enabled && (
                <div className="mt-3">
                  <textarea
                    value={legalDisclaimer.text || ''}
                    onChange={(e) => onSettingsChange({ legalDisclaimer: { ...legalDisclaimer, text: e.target.value } })}
                    placeholder="By continuing, you agree to our Terms of Service and Privacy Policy."
                    rows={3}
                    className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 resize-none"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* TRACKING — analytics */}
          <TabsContent value="tracking" className="px-6 pb-6 pt-4 space-y-5 mt-0">
            <ToggleRow
              label="Collect analytics"
              helper="Track views, completions, and drop-off rates"
              checked={tracking.enabled !== false}
              onChange={(v) => onSettingsChange({ tracking: { ...tracking, enabled: v } })}
            />

            <ToggleRow
              label="Exclude preview activity"
              helper="Don't count editor previews in analytics"
              checked={tracking.excludeBuilderPreview !== false}
              onChange={(v) => onSettingsChange({ tracking: { ...tracking, excludeBuilderPreview: v } })}
            />

            <ToggleRow
              label="Anonymize responses"
              helper="Don't store IP addresses or device info"
              checked={tracking.anonymize || false}
              onChange={(v) => onSettingsChange({ tracking: { ...tracking, anonymize: v } })}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
