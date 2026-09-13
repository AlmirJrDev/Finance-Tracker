'use client';

import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { LoginScreen } from '@/components/login-screen';
import { Dashboard } from '@/components/dashboard';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!session?.backendToken) {
    return <LoginScreen error={session?.error} />;
  }

  return <Dashboard />;
}
