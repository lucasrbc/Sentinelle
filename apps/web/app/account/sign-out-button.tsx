'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton(): React.JSX.Element {
  const router = useRouter();

  async function signOut(): Promise<void> {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={signOut}>
      Se déconnecter
    </button>
  );
}
