'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PricingTable } from '@/components/billing/PricingTable';

export default function PricingPage() {
  const router = useRouter();

  const handleSelectPlan = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">FormFlow</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <PricingTable onSelectPlan={handleSelectPlan} />
      </main>
    </div>
  );
}
