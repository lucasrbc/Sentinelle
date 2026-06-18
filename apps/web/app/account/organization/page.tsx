'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export default function CreateOrganizationPage(): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'COMMUNE' | 'ASSOCIATION'>('COMMUNE');
  const [siret, setSiret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const res = await apiFetch('/organizations', session.access_token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        siret: siret.trim() || undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError(
        "La création a échoué. Vérifiez les informations (le SIRET doit comporter 14 chiffres).",
      );
      return;
    }
    router.push('/account');
    router.refresh();
  }

  return (
    <main className="container">
      <h1>Créer votre organisation</h1>
      <p className="muted">
        Votre organisation sera vérifiée par notre équipe avant publication
        (gage de confiance). Vous deviendrez alors porteur de projet.
      </p>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Nom de l'organisation</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'COMMUNE' | 'ASSOCIATION')
            }
            style={{ minHeight: 48, width: '100%', fontSize: '1.05rem' }}
          >
            <option value="COMMUNE">Commune</option>
            <option value="ASSOCIATION">Association</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="siret">SIRET (facultatif, 14 chiffres)</label>
          <input
            id="siret"
            type="text"
            inputMode="numeric"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-block" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon organisation'}
        </button>
      </form>
    </main>
  );
}
