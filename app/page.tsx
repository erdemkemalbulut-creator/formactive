'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowRight,
  Check,
  Sparkles,
  Bot,
  BarChart3,
  Globe,
  Palette,
  Shield,
  Zap,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

/* ── AI Orb ─────────────────────────────────────────── */
function AiOrb() {
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <div className="absolute inset-0 animate-orb-morph bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80 blur-sm" />
      <div className="absolute inset-2 animate-orb-morph bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-90" style={{ animationDelay: '-2s' }} />
      <div className="absolute inset-4 animate-orb-morph bg-gradient-to-br from-indigo-300 via-purple-300 to-fuchsia-300 opacity-60 blur-md" style={{ animationDelay: '-4s' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}

/* ── Live chat demo ─────────────────────────────────── */
function ChatDemo() {
  const lines = [
    { role: 'bot' as const, text: "Hey! What's your name?" },
    { role: 'user' as const, text: 'Sarah' },
    { role: 'bot' as const, text: "Nice to meet you, Sarah! What brings you here today?" },
    { role: 'user' as const, text: "What pricing plans do you offer?" },
    { role: 'bot' as const, text: "We have 3 plans starting at $29/mo. Want me to continue with the form?" },
    { role: 'user' as const, text: "Yes please!" },
    { role: 'bot' as const, text: "Great! What's the best email to reach you?" },
    { role: 'user' as const, text: 'sarah@company.com' },
    { role: 'bot' as const, text: "Perfect, thanks Sarah! We'll be in touch." },
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          setTimeout(() => setVisibleLines(0), 2500);
          return prev;
        }
        return prev + 1;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />
      <div className="relative glass-dark rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white/50">AI Conversation</span>
          <span className="ml-auto text-[10px] text-white/30 font-mono">LIVE</span>
        </div>
        <div className="p-4 space-y-3 min-h-[340px]">
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                line.role === 'user'
                  ? 'bg-indigo-500/80 text-white rounded-br-md'
                  : 'bg-white/10 text-white/80 rounded-bl-md'
              }`}>
                {line.text}
              </div>
            </div>
          ))}
          {visibleLines < lines.length && visibleLines > 0 && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Bot,
    title: 'AI Conversations',
    description: 'Natural, adaptive conversations that ask follow-ups and validate answers in real time.',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Sparkles,
    title: 'Instant Generation',
    description: 'Describe your goal. AI builds the entire form — questions, tone, and flow — in seconds.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageSquare,
    title: 'Two-Way Dialogue',
    description: 'Respondents can ask questions mid-form and get AI answers from your training data.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Palette,
    title: 'Brand Customization',
    description: '6 tone presets, custom colors, fonts, logos. Every form matches your identity.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    description: 'Track views, completions, engagement time. Export structured data with one click.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Smart Validation',
    description: 'Semantic sufficiency checks ensure meaningful answers. No more garbage data.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const STEPS = [
  { step: '01', title: 'Describe your form', description: 'Tell the AI what you need. Audience, tone, and goals.' },
  { step: '02', title: 'AI builds it instantly', description: 'Get a complete conversational form with smart questions.' },
  { step: '03', title: 'Customize & publish', description: 'Adjust tone, visuals, and brand. Publish with one click.' },
  { step: '04', title: 'Collect & analyze', description: 'Watch responses flow in. Export data, track engagement.' },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with AI forms',
    features: ['3 active forms', '50 responses/month', 'AI conversation engine', 'Basic analytics', 'Formactive branding'],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams',
    features: ['Unlimited forms', '1,000 responses/month', 'AI conversation engine', 'Advanced analytics & CSV', 'Custom branding', 'Remove badge', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$79',
    period: '/month',
    description: 'For teams that need more',
    features: ['Everything in Pro', '10,000 responses/month', 'Team collaboration (5 seats)', 'Custom domain', 'Webhooks', 'Dedicated support'],
    cta: 'Contact us',
    highlighted: false,
  },
];

/* ── Page ────────────────────────────────────────────── */
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
      {/* ── Nav ────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/70 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-gradient">formactive</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/40 hover:text-white/80 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-white/40 hover:text-white/80 transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-white/40 hover:text-white/80 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/signin')} className="text-sm text-white/50 hover:text-white transition-colors">
              Sign in
            </button>
            <button onClick={() => router.push('/signin')} className="text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-full transition-all hover:shadow-lg hover:shadow-indigo-500/25">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-mesh-dark">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark text-xs font-medium text-indigo-300 mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                AI-native form builder
              </div>
              <h1 className="font-bold leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4rem)' }}>
                Forms that feel like{' '}
                <span className="text-gradient">conversations</span>
              </h1>
              <p className="mt-6 text-lg text-white/40 leading-relaxed max-w-lg">
                Stop losing leads to boring forms. Formactive uses AI to create
                natural, two-way conversations that engage respondents and collect better data.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/signin')}
                  className="group inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-xl hover:shadow-indigo-500/25 gap-2"
                >
                  Start building free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white/60 glass-dark rounded-full hover:text-white/80 transition-all"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-white/25">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  Free to start
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  60s setup
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <ChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────── */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10x', label: 'Higher completion' },
              { value: '60s', label: 'Setup time' },
              { value: '98%', label: 'Data quality' },
              { value: '6', label: 'Tone presets' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-white/30 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to collect <span className="text-gradient">better data</span>
            </h2>
            <p className="mt-4 text-lg text-white/35">
              Powerful AI features that make data collection effortless.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl glass-dark hover:bg-white/[0.08] transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────── */}
      <section id="how-it-works" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              From idea to live form in <span className="text-gradient">minutes</span>
            </h2>
            <p className="mt-4 text-lg text-white/35">
              Four steps. Zero complexity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl glass-dark">
                <div className="text-4xl font-bold text-gradient opacity-40 mb-3">{step.step}</div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{step.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{step.description}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-10 -right-4 w-4 h-4 text-white/15" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Orb section ─────────────────────── */}
      <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <AiOrb />
          <h2 className="mt-10 text-3xl sm:text-4xl font-bold tracking-tight">
            AI that <span className="text-gradient">answers questions</span> too
          </h2>
          <p className="mt-4 text-lg text-white/35 max-w-xl mx-auto">
            Train the AI on your data. When respondents ask questions mid-form,
            they get instant, contextual answers — turning forms into real conversations.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-8 inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-xl hover:shadow-indigo-500/25 gap-2"
          >
            Try it free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, <span className="text-gradient">transparent</span> pricing
            </h2>
            <p className="mt-4 text-lg text-white/35">Start free. Scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl relative ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 glow-sm'
                    : 'glass-dark'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-brand text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white/90">{plan.name}</h3>
                <p className="text-sm text-white/35 mt-1">{plan.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/30 ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-white/50">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full h-10 rounded-full text-sm font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to build forms people <span className="text-gradient">actually enjoy</span>?
          </h2>
          <p className="mt-4 text-lg text-white/35">
            Join teams using Formactive to turn data collection into real conversations.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-8 group inline-flex items-center justify-center h-12 px-8 text-base font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all hover:shadow-xl hover:shadow-indigo-500/25 gap-2"
          >
            Get started for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold tracking-tight text-gradient">formactive</span>
              <p className="mt-3 text-sm text-white/25 max-w-xs leading-relaxed">
                AI-powered conversational forms that engage respondents and collect meaningful data.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/50 mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-white/25 hover:text-white/50 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-white/25 hover:text-white/50 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-white/25 hover:text-white/50 transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/50 mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-white/25 hover:text-white/50 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-white/25 hover:text-white/50 transition-colors">Terms</a></li>
                <li><a href="mailto:support@formactive.ai" className="text-sm text-white/25 hover:text-white/50 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-sm text-white/15">
            &copy; {new Date().getFullYear()} Formactive. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
