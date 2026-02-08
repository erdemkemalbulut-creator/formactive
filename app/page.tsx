'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { AuthActions } from '@/components/auth-actions';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Eye,
  Send,
  ArrowRight,
  CheckCircle2,
  Globe,
  Clock,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-slate-700" />
              <span className="text-xl font-semibold text-slate-900">FormActive</span>
            </div>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  How It Works
                </a>
                <a href="#benefits" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Benefits
                </a>
              </nav>
              <AuthActions />
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                  Forms that feel like conversations
                </h1>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  FormActive turns your questions into a friendly chat experience. One question at a time, no overwhelming walls of fields. Build, preview, and publish — all from a single page.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="#get-started">
                    <Button size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                      Start building
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <a href="#how-it-works">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      See how it works
                    </Button>
                  </a>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Used for lead capture, intake forms, feedback, registrations, and more.
                </p>
              </div>

              <div className="relative">
                <Card className="p-0 bg-white border-slate-200 shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">T</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">Travel Inquiry</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Live</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[280px]">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-white">T</span>
                      </div>
                      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm text-slate-800">What's your name?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm">Jane Doe</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-white">T</span>
                      </div>
                      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm text-slate-800">Where are you dreaming of going?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm">Santorini, Greece</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-white">T</span>
                      </div>
                      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm text-slate-800">How many travelers?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[75%]">
                        <p className="text-sm">4</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-full px-4 flex items-center text-sm text-slate-400">
                        Type your answer...
                      </div>
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-50 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-slate-100 rounded-full opacity-50 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                How it works
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Build conversational forms from a single page. Your respondents get a friendly chat experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">1</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Add your questions
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Pick from 14 question types — text, email, dropdowns, ratings, file uploads, and more. Set required fields and validation rules.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">2</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Preview the conversation
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  See exactly how the chat experience looks as you build it. The live preview plays through the conversation — updating instantly as you edit.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">3</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Publish and share
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Hit publish to go live. Share the public link. Edit anytime and republish when you're ready — version history included.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                Everything in one place
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Build, preview, publish, and collect responses — all from one screen.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Conversational chat experience
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Your respondents answer one question at a time in a friendly chat flow. Higher completion rates, better experience.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>One question at a time, like a chat</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Higher completion rates vs classic forms</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Welcome message and thank-you screens</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Publish and republish
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  One click to go live. Make changes anytime and republish when ready. Every version is saved.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Draft → Live → Edit → Republish</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Version history with restore</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Public link stays the same</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Collect and export
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  View submissions in your dashboard. Export to CSV. Keep everything organized without extra tools.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Structured response data</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>CSV export with one click</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Expandable row details</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  14 question types
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  From simple text fields to star ratings, file uploads, and consent checkboxes — cover every use case.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Text, email, phone, number, date</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Dropdowns, multi-select, yes/no</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Rating, file upload, consent</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="get-started" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                  Get started today
                </h2>
                <p className="text-lg text-slate-600 mb-6">
                  Sign up and build your first form in minutes. No credit card, no complex setup.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>All question types and features included</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Build and publish from one page</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Works on all devices</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-600" />
                <span className="font-semibold text-slate-900">FormActive</span>
              </div>
              <div className="flex gap-8 text-sm text-slate-600">
                <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                  How It Works
                </a>
                <a href="#benefits" className="hover:text-slate-900 transition-colors">
                  Benefits
                </a>
              </div>
              <p className="text-sm text-slate-500">
                © 2026 FormActive. Build forms, preview live, publish instantly.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
