'use client';

import { useState, type FormEvent } from 'react';
import { apiUrl } from '@/lib/api';

const PRESETS = [20, 50, 100];

export function DonateForm({ projectId }: { projectId: string }): React.JSX.Element {
  const [euros, setEuros] = useState('50');
  const [type, setType] = useState<'ONE_TIME' | 'MONTHLY'>('ONE_TIME');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const amount = Math.round(Number(euros) * 100);
    if (!Number.isFinite(amount) || amount < 100) {
      setError('Montant minimum : 1 €.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/donations/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, amount, type, donorEmail: email }),
      });
      if (!res.ok) throw new Error();
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };
      window.location.href = checkoutUrl; // redirection vers le paiement
    } catch {
      setError('Le don n’a pas pu être initié. Réessayez.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="donate-form" noValidate>
      <h3>Faire un don</h3>
      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="field">
        <span id="preset-label" className="sr-only">
          Montants suggérés
        </span>
        <div className="filters" role="group" aria-labelledby="preset-label">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className="btn btn-secondary"
              onClick={() => setEuros(String(p))}
            >
              {p} €
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="euros">Montant (en euros)</label>
        <input
          id="euros"
          type="text"
          inputMode="numeric"
          value={euros}
          onChange={(e) => setEuros(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="sr-only" id="freq">
          Fréquence
        </span>
        <div className="filters" role="radiogroup" aria-labelledby="freq">
          <label className="chip">
            <input
              type="radio"
              name="freq"
              checked={type === 'ONE_TIME'}
              onChange={() => setType('ONE_TIME')}
            />
            Don ponctuel
          </label>
          <label className="chip">
            <input
              type="radio"
              name="freq"
              checked={type === 'MONTHLY'}
              onChange={() => setType('MONTHLY')}
            />
            Don mensuel
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="donor-email">Votre email (pour le reçu fiscal)</label>
        <input
          id="donor-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-block" disabled={loading}>
        {loading ? 'Redirection…' : 'Donner'}
      </button>
    </form>
  );
}
