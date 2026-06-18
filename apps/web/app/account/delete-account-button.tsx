'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authedFetch } from '@/lib/client-api';
import { createClient } from '@/lib/supabase/client';

export function DeleteAccountButton(): React.JSX.Element {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(): Promise<void> {
    setError(null);
    try {
      const res = await authedFetch('/me', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await createClient().auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      setError('La suppression a échoué. Réessayez.');
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setConfirming(true)}
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div>
      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <p>
        <strong>Confirmer la suppression ?</strong> Cette action est définitive.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={remove}>
          Oui, supprimer
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setConfirming(false)}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
