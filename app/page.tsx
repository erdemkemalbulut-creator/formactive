'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Check, ChevronRight, Sparkles, Bot, BarChart3, Zap, MessageSquare, Users, Send } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   USE CASE PILLS
   ───────────────────────────────────────────────────── */

const USE_CASES = [
  'Lead capture',
  'Customer feedback',
  'Survey',
  'Job application',
  'Quiz',
];

/* ─────────────────────────────────────────────────────
   INTERACTIVE DEMO — mini conversational form
   ───────────────────────────────────────────────────── */

const DEMO_MESSAGES: { role: 'ai' | 'user'; text: string }[] = [
  { role: 'ai', text: "Hey! What's your use case?" },
];

const DEMO_FOLLOW_UPS: Record<string, string> = {
  default: "Interesting! Tell me more — who's the target audience for this?",
};

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

function InteractiveDemo() {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: DEMO_FOLLOW_UPS.default }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-soft-lg border border-[#E5E7EB] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
        <span className="text-xs font-medium text-[#6B7280]">Formactive Demo</span>
      </div>
      <div className="h-64 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'ai'
                ? 'bg-[#F3F0FF] text-[#111111]'
                : 'bg-[#111111] text-white'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#F3F0FF] px-4 py-2.5 rounded-2xl text-sm text-[#6B7280]">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#7C3AED]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#7C3AED]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#7C3AED]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your answer..."
          className="flex-1 text-sm bg-transparent outline-none placeholder-[#6B7280]/40 text-[#111111]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center hover:bg-[#222222] transition-colors disabled:opacity-30"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────── */

const STEPS = [
  { n: '01', title: 'Describe your goal', desc: 'Tell us what you want to collect and who it\'s for.' },
  { n: '02', title: 'AI builds your form', desc: 'Smart questions, follow-ups, and logic — instantly.' },
  { n: '03', title: 'Customize your experience', desc: 'Tone, branding, and behavior — all adjustable.' },
  { n: '04', title: 'Launch and collect insights', desc: 'Engage users and capture richer, more meaningful data.' },
];

const TRADITIONAL = [
  'Static fields',
  'High drop-off',
  'Shallow answers',
];

const FORMACTIVE_BENEFITS = [
  'Dynamic conversation',
  'AI follow-ups',
  'Deeper insights',
];

const WHY_SWITCH = [
  { icon: MessageSquare, title: 'Conversations, not checkboxes', desc: 'Forms adapt in real time. Ask better questions automatically.' },
  { icon: Users, title: 'Higher completion rates', desc: 'People respond more when it feels human.' },
  { icon: BarChart3, title: 'Better data, instantly', desc: 'No more useless answers. AI validates and digs deeper.' },
  { icon: Zap, title: 'Built in seconds', desc: 'No logic trees. No manual setup. Just describe and go.' },
];

const BUILD_LIST = [
  'Lead qualification flows',
  'Customer feedback forms',
  'Research interviews',
  'Onboarding experiences',
  'Surveys that actually get completed',
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: '', desc: '',
    features: ['3 forms', '50 responses/month', 'AI-powered conversations'],
    cta: 'Try it free', hl: false,
  },
  {
    name: 'Pro', price: '$29', period: '/month', desc: '',
    features: ['Unlimited forms', '1,000 responses', 'Advanced analytics', 'Custom branding'],
    cta: 'Start free trial', hl: true,
  },
  {
    name: 'Business', price: '$79', period: '/month', desc: '',
    features: ['10,000 responses', 'Team collaboration', 'Webhooks + integrations'],
    cta: 'Contact us', hl: false,
  },
];

/* ─────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────── */

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

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

  const handleGenerate = () => {
    router.push('/signin');
  };

  return (
    <div className="min-h-screen bg-surface text-[#111111]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFB]/80 backdrop-blur-xl border-b border-[#E5E7EB]/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-[#111111]">formactive</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">How it works</a>
            <a href="#features" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Features</a>
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface pt-14">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#7C3AED]/[0.04] rounded-full blur-[120px] animate-subtle-drift" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#7C3AED]/[0.03] rounded-full blur-[100px] animate-subtle-drift" style={{ animationDelay: '-8s' }} />
        </div>

        <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center">
          <h1
            className="font-semibold tracking-tight leading-[1.15] text-[#111111]"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}
          >
            Build AI forms that actually{' '}
            <span className="text-gradient">talk to your users</span>
          </h1>
          <p className="mt-5 text-lg text-[#6B7280] leading-relaxed max-w-xl mx-auto">
            Turn boring forms into real conversations. Ask better questions, follow up automatically, and get deeper answers — without writing a single field.
          </p>

          {/* Use case pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {USE_CASES.map((uc) => (
              <button
                key={uc}
                onClick={handleGenerate}
                className="px-4 py-2 text-sm font-medium rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#7C3AED]/40 hover:text-[#7C3AED] transition-all shadow-soft"
              >
                {uc}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm text-[#6B7280]/60">or</p>

          {/* Prompt input */}
          <div className="mt-4 max-w-lg mx-auto">
            <p className="text-sm font-medium text-[#111111] mb-3">
              Describe your form
            </p>
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 shadow-soft focus-within:border-[#7C3AED]/40 focus-within:shadow-soft-md transition-all">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder='"I want to qualify inbound leads for my SaaS"'
                className="flex-1 text-sm bg-transparent outline-none placeholder-[#6B7280]/40 text-[#111111]"
              />
              <button
                onClick={handleGenerate}
                className="shrink-0 inline-flex items-center gap-2 h-9 px-5 text-sm font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-lg transition-all"
              >
                Generate my form
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-5 text-xs text-[#6B7280]/50">No signup required · Try it in 30 seconds</p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 border-t border-[#E5E7EB]/60">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-[#6B7280] leading-relaxed">
            Used by product teams, marketers, and researchers to capture better data.
          </p>
          <blockquote className="mt-8">
            <p className="text-lg font-medium text-[#111111] italic leading-relaxed">
              &ldquo;Formactive doubled our form completion rate and gave us way better insights.&rdquo;
            </p>
            <cite className="mt-3 block text-sm text-[#6B7280] not-italic">— Early user</cite>
          </blockquote>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">
              From idea to live conversational form in seconds
            </h2>
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

      {/* See the difference */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Compare</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">See the difference</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Traditional */}
            <div className="rounded-2xl border border-[#E5E7EB] p-8">
              <h3 className="text-base font-semibold text-[#6B7280] mb-5">Traditional forms</h3>
              <ul className="space-y-3">
                {TRADITIONAL.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#6B7280]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Formactive */}
            <div className="rounded-2xl border-2 border-[#7C3AED]/20 bg-[#F3F0FF]/30 p-8">
              <h3 className="text-base font-semibold text-[#7C3AED] mb-5">Formactive</h3>
              <ul className="space-y-3">
                {FORMACTIVE_BENEFITS.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#111111]">
                    <Check className="w-4 h-4 text-[#7C3AED] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why teams switch */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Why Formactive</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Why teams switch to Formactive</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-14 max-w-3xl mx-auto">
            {WHY_SWITCH.map((f, i) => (
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

      {/* What you can build */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Use cases</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mb-10">What you can build</h2>
          <ul className="space-y-3">
            {BUILD_LIST.map((item, i) => (
              <li key={i} className="inline-flex items-center gap-2 text-[#111111] text-base">
                <Check className="w-4 h-4 text-[#7C3AED] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Try it</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Try a conversational form</h2>
            <p className="mt-3 text-sm text-[#6B7280]">See how Formactive feels from the respondent&apos;s side.</p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#7C3AED] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">Start free. Scale when you need.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {PLANS.map((p, i) => (
              <div key={i} className={`rounded-2xl border p-8 ${
                p.hl ? 'border-[#7C3AED]/30 bg-[#F3F0FF]/20 shadow-soft-md' : 'border-[#E5E7EB]'
              }`}>
                {p.hl && (
                  <div className="mb-3">
                    <span className="text-[11px] font-medium text-[#7C3AED] uppercase tracking-widest">Most popular</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-[#111111]">{p.name}</h3>
                <div className="mt-3 mb-5">
                  <span className="text-3xl font-bold text-[#111111]">{p.price}</span>
                  {p.period && <span className="text-sm text-[#6B7280] ml-1">{p.period}</span>}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-[#6B7280]">
                      <Check className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full h-11 rounded-xl text-sm font-medium transition-all ${
                    p.hl
                      ? 'bg-[#111111] text-white hover:bg-[#222222] shadow-soft hover:shadow-soft-md'
                      : 'border border-[#E5E7EB] text-[#111111] hover:border-[#7C3AED]/40 hover:text-[#7C3AED]'
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
            Build your first conversational form in{' '}
            <span className="text-gradient">30 seconds</span>
          </h2>
          <p className="mt-4 text-[#6B7280] leading-relaxed">
            No setup. No credit card. Just describe what you need.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-8 group inline-flex items-center justify-center h-12 px-7 text-[15px] font-medium text-white bg-[#111111] hover:bg-[#222222] rounded-xl transition-all shadow-soft-md hover:shadow-soft-lg gap-2"
          >
            Generate my form
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
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
