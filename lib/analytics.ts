const SESSION_KEY = 'fa_session_id';

function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export interface AnalyticsEvent {
  event_type: 'form_view' | 'form_start' | 'step_reached' | 'form_complete' | 'form_submit';
  step_id?: string;
  step_type?: string;
  step_index?: number;
  duration_ms?: number;
}

let startTimestamp: number | null = null;

export function markStart() {
  startTimestamp = Date.now();
}

export function getElapsedMs(): number {
  if (!startTimestamp) return 0;
  return Date.now() - startTimestamp;
}

const firedEvents = new Set<string>();

function eventKey(formId: string, ev: AnalyticsEvent): string {
  return `${formId}:${ev.event_type}:${ev.step_id || ''}:${ev.step_index ?? ''}`;
}

export async function trackEvent(formId: string, event: AnalyticsEvent) {
  const key = eventKey(formId, event);
  if (event.event_type !== 'form_submit' && firedEvents.has(key)) return;
  firedEvents.add(key);

  try {
    const body = {
      ...event,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    };

    await fetch(`/api/forms/${formId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
  }
}
