'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Check, ChevronRight, Sparkles, Bot, BarChart3, Palette, Shield, MessageSquare } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   IMMERSIVE HERO — cinematic conversation on a calm canvas
   ───────────────────────────────────────────────────── */

interface ConversationStep {
  speaker: 'ai' | 'human';
  text: string;
  inputPlaceholder?: string;
}

const CONVERSATION: ConversationStep[] = [
  { speaker: 'ai', text: "Hey there.\nWhat's your name?", inputPlaceholder: 'Type your name...' },
  { speaker: 'human', text: 'Sarah' },
  { speaker: 'ai', text: "Nice to meet you, Sarah.\nWhat brings you here today?", inputPlaceholder: 'Type your answer...' },
  { speaker: 'human', text: 'I need a better way to collect leads' },
  { speaker: 'ai', text: "I can help with that.\nWhat's the best email to reach you?", inputPlaceholder: 'your@email.com' },
  { speaker: 'human', text: 'sarah@company.com' },
  { speaker: 'ai', text: "Perfect.\nWe'll be in touch, Sarah." },
];

function useTypewriter(text: string, speed: number, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return; }
    setDisplayed(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return { displayed, done };
}

function ImmersiveHero({ onCTA }: { onCTA: () => void }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'waiting' | 'transition'>('typing');
  const current = CONVERSATION[step];
  const isAI = current?.speaker === 'ai';
  const { displayed, done } = useTypewriter(current?.text || '', isAI ? 30 : 20, phase === 'typing');

  useEffect(() => {
    if (!done) return;
    if (step >= CONVERSATION.length - 1) {
      const t = setTimeout(() => setPhase('waiting'), 2000);
      return () => clearTimeout(t);
    }
    const delay = isAI ? 1800 : 800;
    const t = setTimeout(() => {
      setPhase('transition');
      setTimeout(() => { setStep(s => s + 1); setPhase('typing'); }, 400);
    }, delay);
    return () => clearTimeout(t);
  }, [done, step, isAI]);

  useEffect(() => {
    if (step >= CONVERSATION.length - 1 && phase === 'waiting') {
      const t = setTimeout(() => {
        setPhase('transition');
        setTimeout(() => { setStep(0); setPhase('typing'); }, 500);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [step, phase]);

  const showInput = isAI && done && current?.inputPlaceholder && step < CONVERSATION.length - 1;
  const showFinalCTA = step >= CONVERSATION.length - 1 && phase === 'waiting';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      {/* Subtle ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#7C3AED]/[0.04] rounded-full blur-[120px] animate-subtle-drift" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#7C3AED]/[0.03] rounded-full blur-[100px] animate-subtle-drift" style={{ animationDelay: '-8s' }} />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-8 text-center">
        {/* Speaker label */}
        <div className={`mb-6 transition-opacity duration-400 ${phase === 'transition' ? 'opacity-0' : 'opacity-100'}`}>
          <span className={`inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase ${
            isAI ? 'text-[#7C3AED]/60' : 'text-[#6B7280]/40'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAI ? 'bg-[#7C3AED]/60' : 'bg-[#6B7280]/30'}`} />
            {isAI ? 'Formactive' : 'You'}
          </span>
        </div>

        {/* Dialogue */}
        <div className={`transition-all duration-400 ${phase === 'transition' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
          <h1
            className={`font-semibold leading-[1.2] tracking-tight whitespace-pre-line ${
              isAI ? 'text-[#111111]' : 'text-[#6B7280]'
            }`}
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
          >
            {displayed}
            {!done && phase === 'typing' && (
              <span className="inline-block w-[2px] h-[0.85em] bg-[#7C3AED] ml-1 align-baseline animate-cursor-blink" />
            )}
          </h1>
        </div>

        {/* Input */}
        {showInput && (
          <div className="mt-10 animate-fade-up" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards' }}>
            <div className="max-w-sm mx-auto">
              <input
                type="text"
                readOnly
                placeholder={current.inputPlaceholder}
                className="w-full bg-transparent border-0 border-b border-[#E5E7EB] text-[#111111] text-lg text-center py-3 placeholder-[#6B7280]/30 focus:outline-none focus:border-[#7C3AED]/40 transition-colors cursor-default"
              />
              <p className="mt-3 text-xs text-[#6B7280]/30">press Enter ↵</p>
            </div>
          </div>
        )}

        {/* CTA */}
        {showFinalCTA && (
          <div className="mt-14 animate-fade-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <button
              onClick={onCTA}
              className="group inline-flex items-center justify-center h-12 px-7 text-[15px] font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-xl transition-all shadow-soft-md hover:shadow-soft-lg gap-2"
            >
              Create your first form
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="mt-4 text-sm text-[#6B7280]/50">Free to start. No credit card.</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '3s', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-center gap-2 text-[#6B7280]/20">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-[#6B7280]/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────── */

const FEATURES = [
  { icon: Bot, title: 'AI Conversations', desc: 'Natural, adaptive dialogue that validates and follows up in real time.' },
  { icon: Sparkles, title: 'Instant Generation', desc: 'Describe your goal. AI builds the entire form in seconds.' },
  { icon: MessageSquare, title: 'Two-Way Dialogue', desc: 'Respondents ask questions mid-form and get instant AI answers.' },
  { icon: Palette, title: 'Brand Customization', desc: '6 tones, custom colors, fonts, logos. Every form is yours.' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Track views, completions, engagement. Export with one click.' },
  { icon: Shield, title: 'Smart Validation', desc: 'Semantic checks ensure meaningful answers. No garbage data.' },
];

const STEPS = [
  { n: '01', title: 'Describe', desc: 'Tell the AI what you need — audience, tone, goals.' },
  { n: '02', title: 'Generate', desc: 'Get a complete conversational form with smart questions.' },
  { n: '03', title: 'Customize', desc: 'Adjust tone, visuals, brand. Publish with one click.' },
  { n: '04', title: 'Collect', desc: 'Watch responses flow in. Export data, track engagement.' },
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: 'forever', desc: 'Get started with AI forms',
    features: ['3 active forms', '50 responses/mo', 'AI engine', 'Basic analytics', 'Formactive badge'],
    cta: 'Get started free', hl: false,
  },
  {
    name: 'Pro', price: '$29', period: '/month', desc: 'For growing teams',
    features: ['Unlimited forms', '1,000 responses/mo', 'AI engine', 'Advanced analytics', 'Custom branding', 'Remove badge', 'Priority support'],
    cta: 'Start free trial', hl: true,
  },
  {
    name: 'Business', price: '$79', period: '/month', desc: 'Scale without limits',
    features: ['Everything in Pro', '10,000 responses/mo', 'Team (5 seats)', 'Custom domain', 'Webhooks', 'Dedicated support'],
    cta: 'Contact us', hl: false,
  },
];

/* ─────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────── */

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E5E7EB] border-t-[#7C3AED] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-[#111111]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFB]/80 backdrop-blur-xl border-b border-[#E5E7EB]/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-[#111111]">formactive</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/signin')} className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Sign in</button>
            <button onClick={() => router.push('/signin')} className="text-sm font-medium text-white bg-[#111111] hover:bg-[#222222] px-4 py-2 rounded-xl transition-all shadow-soft hover:shadow-soft-md">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <ImmersiveHero onCTA={() => router.push('/signin')} />

      {/* Statement */}
      <section className="py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-semibold tracking-tight leading-snug text-[#111111]" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)' }}>
            Forms shouldn't feel like forms.{' '}
            <span className="text-[#7C3AED]">They should feel like conversations.</span>
          </h2>
          <p className="mt-5 text-[#6B7280] leading-relaxed max-w-lg mx-auto">
            Formactive replaces static fields with AI-powered dialogue. Respondents engage naturally. You get better data.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Everything you need</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {FEATURES.map((f, i) => (
              <div key={i} className="group">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/8 flex items-center justify-center mb-4 group-hover:bg-[#7C3AED]/12 transition-colors">
                  <f.icon className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#111111] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Four steps. Zero complexity.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative text-center md:text-left">
                <span className="text-4xl font-bold text-[#7C3AED]/15">{s.n}</span>
                <h3 className="text-base font-semibold text-[#111111] mt-1 mb-1.5">{s.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-5 -right-5 w-4 h-4 text-[#E5E7EB]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Simple, transparent pricing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {PLANS.map((p, i) => (
              <div key={i} className={`relative ${p.hl ? 'md:-mt-4 md:mb-4' : ''}`}>
                {p.hl && (
                  <div className="mb-4">
                    <span className="text-[11px] font-medium text-[#7C3AED] uppercase tracking-widest">Most popular</span>
                  </div>
                )}
                <h3 className="text-base font-semibold text-[#111111]">{p.name}</h3>
                <p className="text-sm text-[#6B7280] mt-0.5">{p.desc}</p>
                <div className="mt-4 mb-5">
                  <span className="text-3xl font-bold text-[#111111]">{p.price}</span>
                  <span className="text-sm text-[#6B7280] ml-1">{p.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#6B7280]">
                      <Check className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full h-10 rounded-xl text-sm font-medium transition-all ${
                    p.hl
                      ? 'bg-[#111111] text-white hover:bg-[#222222] shadow-soft hover:shadow-soft-md'
                      : 'text-[#111111] hover:text-[#7C3AED] underline underline-offset-4 decoration-[#E5E7EB] hover:decoration-[#7C3AED]/30'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-semibold tracking-tight text-[#111111]" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}>
            Ready to build forms people{' '}
            <span className="text-[#7C3AED]">actually enjoy</span>?
          </h2>
          <button
            onClick={() => router.push('/signin')}
            className="mt-8 group inline-flex items-center justify-center h-12 px-7 text-[15px] font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-xl transition-all shadow-soft-md hover:shadow-soft-lg gap-2"
          >
            Get started for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="mt-4 text-sm text-[#6B7280]/60">No credit card. No setup fee.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-12 px-6 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold tracking-tight text-[#111111]">formactive</span>
              <p className="mt-3 text-sm text-[#6B7280] max-w-xs leading-relaxed">
                AI-powered conversational forms that engage respondents and collect meaningful data.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-[#6B7280] uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-[#6B7280] uppercase tracking-widest mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Terms</a></li>
                <li><a href="mailto:support@formactive.ai" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#E5E7EB] text-sm text-[#6B7280]/50">
            &copy; {new Date().getFullYear()} Formactive. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
