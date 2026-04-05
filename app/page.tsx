'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Check, ChevronRight, Sparkles, Bot, BarChart3, Palette, Shield, MessageSquare } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   IMMERSIVE HERO — full-screen conversational experience
   No bubbles. No cards. Just dialogue on the page.
   ───────────────────────────────────────────────────── */

interface ConversationStep {
  speaker: 'ai' | 'human';
  text: string;
  inputPlaceholder?: string;
}

const CONVERSATION: ConversationStep[] = [
  { speaker: 'ai', text: "Hey there.\nWhat's your name?" , inputPlaceholder: 'Type your name...' },
  { speaker: 'human', text: 'Sarah' },
  { speaker: 'ai', text: "Nice to meet you, Sarah.\nWhat brings you here today?", inputPlaceholder: 'Type your answer...' },
  { speaker: 'human', text: "I need a better way to collect leads" },
  { speaker: 'ai', text: "I can help with that.\nWhat's the best email to reach you?" , inputPlaceholder: 'your@email.com' },
  { speaker: 'human', text: 'sarah@company.com' },
  { speaker: 'ai', text: "Perfect.\nWe'll be in touch, Sarah." },
];

function useTypewriter(text: string, speed: number, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
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

  const { displayed, done } = useTypewriter(
    current?.text || '',
    isAI ? 30 : 20,
    phase === 'typing'
  );

  // Advance conversation
  useEffect(() => {
    if (!done) return;

    if (step >= CONVERSATION.length - 1) {
      // End — hold last message, then show CTA
      const t = setTimeout(() => setPhase('waiting'), 2000);
      return () => clearTimeout(t);
    }

    const delay = isAI ? 1800 : 800;
    const t = setTimeout(() => {
      setPhase('transition');
      setTimeout(() => {
        setStep(s => s + 1);
        setPhase('typing');
      }, 400);
    }, delay);
    return () => clearTimeout(t);
  }, [done, step, isAI]);

  // Loop
  useEffect(() => {
    if (step >= CONVERSATION.length - 1 && phase === 'waiting') {
      const t = setTimeout(() => {
        setPhase('transition');
        setTimeout(() => { setStep(0); setPhase('typing'); }, 600);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [step, phase]);

  const showInput = isAI && done && current?.inputPlaceholder && step < CONVERSATION.length - 1;
  const showFinalCTA = step >= CONVERSATION.length - 1 && phase === 'waiting';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[150px] animate-subtle-drift" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-[130px] animate-subtle-drift" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-1/2 right-1/5 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px] animate-subtle-drift" style={{ animationDelay: '-14s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-8 text-center">
        {/* Speaker indicator */}
        <div className={`mb-8 transition-opacity duration-500 ${phase === 'transition' ? 'opacity-0' : 'opacity-100'}`}>
          <span className={`inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase ${
            isAI ? 'text-indigo-400/60' : 'text-white/20'
          }`}>
            {isAI ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Formactive
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                You
              </>
            )}
          </span>
        </div>

        {/* Main dialogue text */}
        <div className={`transition-all duration-500 ${phase === 'transition' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <h1
            className={`font-bold leading-[1.15] tracking-tight whitespace-pre-line ${
              isAI ? 'text-white' : 'text-white/50'
            }`}
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            {displayed}
            {!done && phase === 'typing' && (
              <span className="inline-block w-[3px] h-[0.9em] bg-indigo-400 ml-1 align-baseline animate-cursor-blink" />
            )}
          </h1>
        </div>

        {/* Minimal input (appears after AI finishes) */}
        {showInput && (
          <div className="mt-12 animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            <div className="max-w-md mx-auto">
              <input
                type="text"
                readOnly
                placeholder={current.inputPlaceholder}
                className="w-full bg-transparent border-0 border-b border-white/15 text-white text-xl text-center py-3 placeholder-white/20 focus:outline-none focus:border-indigo-400/40 transition-colors cursor-default"
              />
              <p className="mt-3 text-xs text-white/15">press Enter ↵</p>
            </div>
          </div>
        )}

        {/* Final CTA */}
        {showFinalCTA && (
          <div className="mt-16 animate-fade-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <button
              onClick={onCTA}
              className="group inline-flex items-center justify-center h-14 px-8 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-2xl hover:shadow-indigo-500/30 gap-2"
            >
              Create your first form
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-4 text-sm text-white/20">Free to start. No credit card required.</p>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '3s', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-center gap-2 text-white/15">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/15 to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   FEATURES / CONTENT SECTIONS
   ───────────────────────────────────────────────────── */

const FEATURES = [
  { icon: Bot, title: 'AI Conversations', desc: 'Natural, adaptive dialogue that validates and follows up in real time.', gradient: 'from-indigo-500 to-blue-500' },
  { icon: Sparkles, title: 'Instant Generation', desc: 'Describe your goal. AI builds the entire form in seconds.', gradient: 'from-purple-500 to-pink-500' },
  { icon: MessageSquare, title: 'Two-Way Dialogue', desc: 'Respondents ask questions mid-form and get instant AI answers.', gradient: 'from-pink-500 to-rose-500' },
  { icon: Palette, title: 'Brand Customization', desc: '6 tones, custom colors, fonts, logos. Every form is yours.', gradient: 'from-violet-500 to-purple-500' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Track views, completions, engagement. Export with one click.', gradient: 'from-blue-500 to-cyan-500' },
  { icon: Shield, title: 'Smart Validation', desc: 'Semantic checks ensure meaningful answers. No garbage data.', gradient: 'from-emerald-500 to-teal-500' },
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
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-white overflow-x-hidden">
      {/* ── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-gradient">formactive</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/30 hover:text-white/70 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-white/30 hover:text-white/70 transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-white/30 hover:text-white/70 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/signin')} className="text-sm text-white/40 hover:text-white transition-colors">Sign in</button>
            <button onClick={() => router.push('/signin')} className="text-sm font-medium text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full transition-all border border-white/10">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Immersive Hero ─── */}
      <ImmersiveHero onCTA={() => router.push('/signin')} />

      {/* ── Statement ─── */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-bold tracking-tight leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
            Forms shouldn't feel like forms.
            <br />
            <span className="text-gradient">They should feel like conversations.</span>
          </h2>
          <p className="mt-6 text-lg text-white/30 max-w-xl mx-auto leading-relaxed">
            Formactive replaces static fields with AI-powered dialogue. Respondents engage naturally.
            You get better data. Everyone wins.
          </p>
        </div>
      </section>

      {/* ── Features ─── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-medium text-indigo-400/60 uppercase tracking-widest mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            {FEATURES.map((f, i) => (
              <div key={i} className="group bg-[#0d0d20] p-8 hover:bg-[#12122a] transition-colors duration-300">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 opacity-70 group-hover:opacity-100 transition-opacity`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white/85 mb-2">{f.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─── */}
      <section id="how-it-works" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-medium text-indigo-400/60 uppercase tracking-widest mb-4">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Four steps. Zero complexity.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                <span className="text-5xl font-bold text-gradient opacity-30">{s.n}</span>
                <h3 className="text-lg font-semibold text-white/85 mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-5 w-4 h-4 text-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─── */}
      <section id="pricing" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-medium text-indigo-400/60 uppercase tracking-widest mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden max-w-4xl mx-auto">
            {PLANS.map((p, i) => (
              <div key={i} className={`p-7 relative ${p.hl ? 'bg-indigo-500/[0.08]' : 'bg-[#0d0d20]'}`}>
                {p.hl && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                )}
                <h3 className="text-lg font-semibold text-white/85">{p.name}</h3>
                <p className="text-sm text-white/30 mt-1">{p.desc}</p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-bold text-white">{p.price}</span>
                  <span className="text-sm text-white/25 ml-1">{p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-white/40">
                      <Check className="w-3.5 h-3.5 text-indigo-400/60 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full h-10 rounded-full text-sm font-medium transition-all ${
                    p.hl
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─── */}
      <section className="py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            Ready to build forms people<br /><span className="text-gradient">actually enjoy?</span>
          </h2>
          <button
            onClick={() => router.push('/signin')}
            className="mt-10 group inline-flex items-center justify-center h-14 px-8 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-2xl hover:shadow-indigo-500/30 gap-2"
          >
            Get started for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-sm text-white/20">No credit card. No setup fee. No catch.</p>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold tracking-tight text-gradient">formactive</span>
              <p className="mt-3 text-sm text-white/20 max-w-xs leading-relaxed">
                AI-powered conversational forms that engage respondents and collect meaningful data.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-white/20 hover:text-white/50 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-white/20 hover:text-white/50 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-white/20 hover:text-white/50 transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-white/20 hover:text-white/50 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-white/20 hover:text-white/50 transition-colors">Terms</a></li>
                <li><a href="mailto:support@formactive.ai" className="text-sm text-white/20 hover:text-white/50 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-sm text-white/10">
            &copy; {new Date().getFullYear()} Formactive. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
