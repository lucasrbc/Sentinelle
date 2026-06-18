'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { apiUrl } from '@/lib/api';
import { authedFetch } from '@/lib/client-api';
import type { SiteSummary } from '@/lib/types';

const URGENCIES = [
  { value: '', label: '— Non précisé —' },
  { value: 'LOW', label: 'Faible' },
  { value: 'MEDIUM', label: 'Modérée' },
  { value: 'HIGH', label: 'Élevée' },
  { value: 'CRITICAL', label: 'Critique' },
];

export default function NewProjectPage(): React.JSX.Element {
  const router = useRouter();
  const [siteQuery, setSiteQuery] = useState('');
  const [results, setResults] = useState<SiteSummary[]>([]);
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetEuros, setTargetEuros] = useState('');
  const [urgency, setUrgency] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function searchSites(): Promise<void> {
    if (siteQuery.trim().length < 2) return;
    const res = await fetch(apiUrl('/sites/search', { q: siteQuery.trim() }), {
      cache: 'no-store',
    });
    if (res.ok) setResults((await res.json()) as SiteSummary[]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!site) {
      setError('Choisissez d’abord le lieu concerné.');
      return;
    }
    const euros = Number(targetEuros);
    if (!Number.isFinite(euros) || euros < 1) {
      setError('Indiquez un montant nécessaire valide (en euros).');
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          heritageSiteId: site.id,
          title,
          summary: summary || undefined,
          urgencyLevel: urgency || undefined,
          targetAmount: Math.round(euros * 100), // euros → centimes
        }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as { id: string };
      router.push(`/espace-porteur/${created.id}`);
    } catch {
      setError("La création a échoué. Vérifiez vos informations et votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Nouveau projet</h1>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="site">Lieu concerné</label>
        <div className="search-row">
          <input
            id="site"
            type="text"
            placeholder="Rechercher une commune ou un lieu…"
            value={siteQuery}
            onChange={(e) => setSiteQuery(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={searchSites}>
            Rechercher
          </button>
        </div>
        {site ? (
          <p>
            Lieu sélectionné : <strong>{site.name}</strong>{' '}
            {site.commune ? `(${site.commune})` : ''}
          </p>
        ) : (
          <ul className="map-list">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSite(s)}
                >
                  Choisir
                </button>{' '}
                {s.name}
                {s.commune ? <span className="muted"> — {s.commune}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="title">Titre du projet</label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="summary">Résumé court</label>
          <input
            id="summary"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="target">Montant nécessaire (en euros)</label>
          <input
            id="target"
            type="text"
            inputMode="numeric"
            required
            value={targetEuros}
            onChange={(e) => setTargetEuros(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="urgency">Niveau d'urgence</label>
          <select
            id="urgency"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            style={{ minHeight: 48, width: '100%', fontSize: '1.05rem' }}
          >
            {URGENCIES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-block" disabled={loading}>
          {loading ? 'Création…' : 'Créer le brouillon'}
        </button>
      </form>
    </main>
  );
}
