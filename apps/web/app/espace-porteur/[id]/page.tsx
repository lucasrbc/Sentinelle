'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { apiUrl } from '@/lib/api';
import { authedFetch } from '@/lib/client-api';
import { projectStatusLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { OwnerProject } from '@/lib/types';

export default function EditProjectPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [project, setProject] = useState<OwnerProject | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<void> {
    try {
      const res = await authedFetch(`/projects/${id}`);
      if (!res.ok) throw new Error();
      setProject((await res.json()) as OwnerProject);
    } catch {
      setError('Projet introuvable ou accès refusé.');
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveDetails(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!project) return;
    setMessage(null);
    setError(null);
    const res = await authedFetch(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: project.title,
        summary: project.summary ?? undefined,
      }),
    });
    if (res.ok) setMessage('Modifications enregistrées.');
    else setError("L'enregistrement a échoué.");
  }

  async function submitForReview(): Promise<void> {
    const res = await authedFetch(`/projects/${id}/submit`, { method: 'POST' });
    if (res.ok) {
      setMessage('Projet soumis à la validation de l’équipe.');
      void reload();
    } else {
      setError('Seul un brouillon peut être soumis.');
    }
  }

  async function uploadQuote(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      'file',
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (!session) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(apiUrl(`/projects/${id}/quote`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    });
    if (res.ok) {
      setMessage('Devis téléversé.');
      void reload();
    } else {
      setError('Le téléversement du devis a échoué (PDF requis).');
    }
  }

  async function addUpdate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    const res = await authedFetch(`/projects/${id}/updates`, {
      method: 'POST',
      body: JSON.stringify({
        title: String(data.get('title') ?? ''),
        body: String(data.get('body') ?? ''),
      }),
    });
    if (res.ok) {
      setMessage('Actualité publiée.');
      formEl.reset();
    } else {
      setError("L'ajout de l'actualité a échoué.");
    }
  }

  if (error && !project) {
    return (
      <main className="container">
        <p className="alert-error" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (!project) {
    return (
      <main className="container">
        <p>Chargement…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>{project.title}</h1>
      <p>
        <span className="badge">{projectStatusLabel(project.status)}</span>
      </p>

      {message ? <p className="muted">{message}</p> : null}
      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={saveDetails} noValidate>
        <div className="field">
          <label htmlFor="title">Titre</label>
          <input
            id="title"
            type="text"
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="summary">Résumé</label>
          <input
            id="summary"
            type="text"
            value={project.summary ?? ''}
            onChange={(e) => setProject({ ...project, summary: e.target.value })}
          />
        </div>
        <button type="submit" className="btn">
          Enregistrer
        </button>
      </form>

      {project.status === 'DRAFT' ? (
        <p style={{ marginTop: '1rem' }}>
          <button type="button" className="btn" onClick={submitForReview}>
            Soumettre à validation
          </button>
        </p>
      ) : null}

      <hr style={{ margin: '2rem 0' }} />

      <h2>Devis (PDF)</h2>
      {project.quoteUrl ? (
        <p>
          <a href={project.quoteUrl}>Devis actuel</a>
        </p>
      ) : null}
      <form onSubmit={uploadQuote}>
        <input type="file" name="file" accept="application/pdf" />
        <button type="submit" className="btn btn-secondary">
          Téléverser
        </button>
      </form>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Actualité de chantier</h2>
      <form onSubmit={addUpdate} noValidate>
        <div className="field">
          <label htmlFor="up-title">Titre</label>
          <input id="up-title" name="title" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="up-body">Message</label>
          <input id="up-body" name="body" type="text" required />
        </div>
        <button type="submit" className="btn">
          Publier l'actualité
        </button>
      </form>
    </main>
  );
}
