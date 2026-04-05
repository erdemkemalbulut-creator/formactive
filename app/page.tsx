'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  MessageSquare,
  Zap,
  BarChart3,
  Globe,
  Palette,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  Bot,
  FileText,
  Users,
  ChevronRight,
} from 'lucide-react';

function TypewriterDemo() {
  const lines = [
    { role: 'bot' as const, text: "Hey! What's your name?" },
    { role: 'user' as const, text: 'Sarah' },
    { role: 'bot' as const, text: "Nice to meet you, Sarah! What brings you here today?" },
    { role: 'user' as const, text: "I'm looking for a project management tool" },
    { role: 'bot' as const, text: "Great choice! How big is your team?" },
    { role: 'user' as const, text: 'About 15 people' },
    { role: 'bot' as const, text: "Perfect. What's the best email to reach you?" },
    { role: 'user' as const, text: 'sarah@company.com' },
    { role: 'bot' as const, text: "Thanks Sarah! We'll be in touch soon." },
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          setTimeout(() => setVisibleLines(0), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden max-w-md mx-auto">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-medium text-slate-500">Lead Capture Form</span>
      </div>
      <div className="p-4 space-y-3 min-h-[320px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                line.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-700 rounded-bl-md'
              }`}
            >
              {line.text}
            </div>
          </div>
        ))}
        {visibleLines < lines.length && visibleLines > 0 && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Bot,
    title: 'AI-Powered Conversations',
    description: 'Forms that talk. Our AI asks follow-up questions, validates answers, and adapts to every response in real time.',
  },
  {
    icon: Sparkles,
    title: 'Smart Generation',
    description: 'Describe what you need and AI generates a complete conversational form — questions, tone, and flow included.',
  },
  {
    icon: Palette,
    title: 'Full Customization',
    description: 'Choose from 6 tone presets, customize colors, fonts, logos, and make every form match your brand perfectly.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track views, completions, engagement time, and export structured data to CSV with one click.',
  },
  {
    icon: Shield,
    title: 'Smart Validation',
    description: 'Semantic sufficiency checks ensure answers are meaningful — not just filled in. No more garbage data.',
  },
  {
    icon: Globe,
    title: 'Share Anywhere',
    description: 'Every form gets a unique URL. Share via link, embed on your site, or send directly to respondents.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Describe your form',
    description: 'Tell our AI what information you need to collect, who your audience is, and what tone to use.',
  },
  {
    step: '02',
    title: 'AI generates your form',
    description: 'In seconds, get a complete conversational form with smart questions, validation, and natural flow.',
  },
  {
    step: '03',
    title: 'Customize & publish',
    description: 'Fine-tune questions, adjust tone and visuals, then publish with one click to get a shareable link.',
  },
  {
    step: '04',
    title: 'Collect & analyze',
    description: 'Watch responses come in on your dashboard. Export data, track completion rates, and iterate.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with AI forms',
    features: [
      '3 active forms',
      '50 responses/month',
      'AI conversation engine',
      'Basic analytics',
      'Formactive branding',
    ],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams and businesses',
    features: [
      'Unlimited forms',
      '1,000 responses/month',
      'AI conversation engine',
      'Advanced analytics & CSV export',
      'Custom branding',
      'Remove Formactive badge',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$79',
    period: '/month',
    description: 'For teams that need more',
    features: [
      'Everything in Pro',
      '10,000 responses/month',
      'Team collaboration (5 seats)',
      'Custom domain',
      'Webhook integrations',
      'Dedicated support',
    ],
    cta: 'Contact us',
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "We replaced our Typeform with Formactive and saw 3x higher completion rates. The conversational AI is incredible.",
    name: 'Emily Chen',
    role: 'Head of Growth, TechCorp',
  },
  {
    quote: "Setting up forms used to take hours. Now I describe what I need and the AI builds it in seconds. Game changer.",
    name: 'Marcus Rodriguez',
    role: 'Freelance Consultant',
  },
  {
    quote: "Our lead quality improved dramatically. The AI validates answers so we only get meaningful, usable data.",
    name: 'Aisha Patel',
    role: 'Marketing Director, StartupHQ',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900 tracking-tight">formactive</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/signin')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/signin')}
              className="text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-powered forms that convert
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                Forms that feel like{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  conversations
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-lg">
                Stop losing leads to boring forms. Formactive uses AI to create natural,
                conversational experiences that engage respondents and collect better data.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/signin')}
                  className="inline-flex items-center justify-center h-12 px-6 text-base font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors gap-2"
                >
                  Start building for free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center h-12 px-6 text-base font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Free to start
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Setup in 60 seconds
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <TypewriterDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900">10x</div>
              <div className="text-sm text-slate-500 mt-1">Higher completion rates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">60s</div>
              <div className="text-sm text-slate-500 mt-1">Average setup time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">98%</div>
              <div className="text-sm text-slate-500 mt-1">Data quality score</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">6</div>
              <div className="text-sm text-slate-500 mt-1">Tone presets</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Everything you need to collect better data
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Powerful features that make form building effortless and data collection meaningful.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center mb-4 transition-colors">
                  <feature.icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              From idea to live form in minutes
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Four simple steps to create forms that actually engage your audience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-slate-100 mb-4">{step.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-8 -right-5 w-5 h-5 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Loved by teams who care about data
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-slate-200 bg-white"
              >
                <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border ${
                  plan.highlighted
                    ? 'border-slate-900 bg-white shadow-xl shadow-slate-200/50 relative'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-400 ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/signin')}
                  className={`w-full h-10 rounded-lg text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Ready to build forms people actually enjoy?
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Join thousands of teams using Formactive to collect better data through conversations.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-8 inline-flex items-center justify-center h-12 px-8 text-base font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors gap-2"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold text-slate-900 tracking-tight">formactive</span>
              <p className="mt-3 text-sm text-slate-500 max-w-xs leading-relaxed">
                AI-powered conversational forms that engage respondents and collect structured, meaningful data.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Terms</a></li>
                <li><a href="mailto:support@formactive.ai" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100 text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Formactive. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
