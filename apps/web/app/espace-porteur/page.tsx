'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/client-api';
import { formatEuros, projectStatusLabel } from '@/lib/format';
import type { OwnerProject } from '@/lib/types';

export default function PorteurHomePage(): React.JSX.Element {
  const [projects, setProjects] = useState<OwnerProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authedFetch('/projects/mine')
      .then(async (res) => {
        if (res.status === 403) {
          setError(
            "Votre compte n'est pas (encore) porteur de projet. Créez d'abord votre organisation depuis « Mon compte ».",
          );
          setProjects([]);
          return;
        }
        if (!res.ok) throw new Error();
        setProjects((await res.json()) as OwnerProject[]);
      })
      .catch((e) => {
        setError(
          e?.message === 'NOT_AUTHENTICATED'
            ? 'Veuillez vous connecter pour accéder à votre espace.'
            : "Impossible de charger vos projets.",
        );
      });
  }, []);

  return (
    <main className="container">
      <h1>Espace porteur de projet</h1>
      <p>
        <Link href="/espace-porteur/nouveau" className="btn">
          + Nouveau projet
        </Link>
      </p>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      {projects && projects.length === 0 && !error ? (
        <p className="muted">Vous n'avez pas encore de projet.</p>
      ) : null}

      <ul className="map-list">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/espace-porteur/${p.id}`}>{p.title}</Link>
            <span className="badge" style={{ marginLeft: 8 }}>
              {projectStatusLabel(p.status)}
            </span>
            <span className="muted">
              {' '}
              — objectif {formatEuros(p.targetAmount)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
