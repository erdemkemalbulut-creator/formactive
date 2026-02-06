'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MessageSquare,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle2,
  Globe,
  Clock,
  Shield
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
              <span className="text-xl font-semibold text-slate-900">FormFlow</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#benefits" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Benefits
              </a>
            </nav>
          </div>
        </div>
      </header>

      <section className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                  Better conversations with your travel clients
                </h1>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Replace long booking forms with natural conversations. Collect trip details, preferences, and requirements while making your clients feel heard and understood.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="#get-started">
                    <Button size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                      Get started
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
                  Get started in minutes. No technical skills required.
                </p>
              </div>

              <div className="relative">
                <Card className="p-6 bg-white border-slate-200 shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 mb-2">
                          Hi! I'd love to help you plan your perfect getaway. Where are you dreaming of going?
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 justify-end">
                      <div className="flex-1 text-right">
                        <div className="inline-block bg-slate-900 text-white text-sm px-4 py-2 rounded-lg">
                          We're thinking Santorini in September
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 mb-2">
                          Wonderful choice! Santorini is absolutely stunning in September. How many travelers will be joining you?
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Destination and dates captured</span>
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
                Set up your first conversational form in minutes. No technical skills required.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">1</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Choose your form type
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Select from travel-focused templates like hotel bookings, vacation packages, or event inquiries. Each template comes pre-configured with relevant fields.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">2</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Customize the questions
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Edit the wording and tone to match your brand. Choose from professional, friendly, or luxury styles to fit your audience.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mx-auto mb-6">
                  <span className="text-lg font-bold text-slate-900">3</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Share and collect responses
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Get a unique link to embed on your website or share directly. View structured responses in your dashboard as conversations complete.
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
                Built for travel professionals
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Designed specifically for agencies, advisors, and creators who value meaningful client relationships.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Qualify leads naturally
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Let conversations flow naturally while capturing budget, timeline, and preferences without overwhelming clients with long forms.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Collect trip details conversationally</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Understand budget and preferences early</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Identify serious inquiries faster</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Save hours each week
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Reduce back-and-forth emails by collecting all necessary information upfront through guided conversations.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Gather complete information in one go</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Structured responses ready to review</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Export data to your CRM or spreadsheet</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center mb-6">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Provide better service
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Show clients you care about their unique needs with personalized, thoughtful interactions from the first touchpoint.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Personalized tone options</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Professional first impression</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Make clients feel heard</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Simple and reliable
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Focus on your clients, not technical setup. Everything works out of the box with clear, straightforward controls.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>No coding or complex setup</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Works on all devices</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Secure data handling</span>
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
                  Join travel professionals who are already using FormFlow to connect better with their clients.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>All templates and features included</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Set up in minutes</span>
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
                <span className="font-semibold text-slate-900">FormFlow</span>
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
                © 2026 FormFlow. Built for travel professionals.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
