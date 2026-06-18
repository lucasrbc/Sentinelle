'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/client-api';
import { formatEuros } from '@/lib/format';
import type { OwnerProject } from '@/lib/types';

export default function ModerationPage(): React.JSX.Element {
  const [projects, setProjects] = useState<OwnerProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<void> {
    try {
      const res = await authedFetch('/projects/moderation');
      if (res.status === 403) {
        setError('Accès réservé aux administrateurs.');
        setProjects([]);
        return;
      }
      if (!res.ok) throw new Error();
      setProjects((await res.json()) as OwnerProject[]);
    } catch {
      setError('Impossible de charger la file de modération.');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function act(id: string, action: 'publish' | 'reject'): Promise<void> {
    const res = await authedFetch(`/projects/${id}/${action}`, {
      method: 'POST',
    });
    if (res.ok) {
      void reload();
    } else {
      const body = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      setError(body?.message ?? "L'action a échoué.");
    }
  }

  return (
    <main className="container">
      <h1>Modération des projets</h1>
      <p className="muted">
        Projets en attente de validation. Publier les rend visibles du public
        (l'organisation porteuse doit être vérifiée).
      </p>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      {projects && projects.length === 0 && !error ? (
        <p className="muted">Aucun projet en attente.</p>
      ) : null}

      <ul className="map-list">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <strong>{p.title}</strong>
            <span className="muted"> — objectif {formatEuros(p.targetAmount)}</span>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => act(p.id, 'publish')}
              >
                Publier
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => act(p.id, 'reject')}
              >
                Renvoyer en brouillon
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
