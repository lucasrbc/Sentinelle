import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DonateForm } from '@/components/DonateForm';
import { Gauge } from '@/components/Gauge';
import { apiGet } from '@/lib/api';
import {
  heritageTypeLabel,
  protectionLabel,
  urgencyLabel,
} from '@/lib/format';
import type { ProjectUpdate, SiteDetail } from '@/lib/types';

// Rendu côté serveur : pages indexables (SEO).
export const dynamic = 'force-dynamic';

async function fetchSite(slug: string): Promise<SiteDetail | null> {
  try {
    return await apiGet<SiteDetail>(`/sites/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchSite(slug);
  if (!site) {
    return { title: 'Lieu introuvable — Sentinelle' };
  }

  const title = `${site.name}${site.commune ? ` — ${site.commune}` : ''} | Sentinelle`;
  const description =
    site.description ??
    `${heritageTypeLabel(site.type)}${
      site.commune ? ` à ${site.commune}` : ''
    } — découvrez ce lieu de patrimoine et soutenez sa restauration.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: site.photos.length ? [{ url: site.photos[0] }] : undefined,
    },
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const site = await fetchSite(slug);
  if (!site) {
    notFound();
  }

  // Actualités de chantier + transparence (uniquement si un projet publié existe).
  let updates: ProjectUpdate[] = [];
  let transparency: {
    donationsCount: number;
    monthlyCount: number;
  } | null = null;
  if (site.project) {
    updates = await apiGet<ProjectUpdate[]>(
      `/projects/${site.project.id}/updates`,
    ).catch(() => []);
    transparency = await apiGet<{ donationsCount: number; monthlyCount: number }>(
      `/transparency/${site.project.id}`,
    ).catch(() => null);
  }

  // Données structurées schema.org (référencement).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LandmarksOrHistoricalBuildings',
    name: site.name,
    description: site.description ?? undefined,
    image: site.photos.length ? site.photos : undefined,
    address: site.commune
      ? { '@type': 'PostalAddress', addressLocality: site.commune }
      : undefined,
    geo:
      site.latitude != null && site.longitude != null
        ? {
            '@type': 'GeoCoordinates',
            latitude: site.latitude,
            longitude: site.longitude,
          }
        : undefined,
  };

  return (
    <main className="container">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p>
        <Link href="/carte">← Retour à la carte</Link>
      </p>

      <h1>{site.name}</h1>
      <p className="muted">
        {heritageTypeLabel(site.type)}
        {site.commune ? ` · ${site.commune}` : ''}
        {site.department ? ` (${site.department})` : ''}
      </p>
      <p>
        <span className="badge">{protectionLabel(site.protectionStatus)}</span>
      </p>

      {site.photos.length ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={site.photos[0]}
          alt={`Photographie de ${site.name}`}
          style={{ width: '100%', borderRadius: 8, marginBottom: '1rem' }}
        />
      ) : null}

      {site.description ? <p>{site.description}</p> : null}

      {site.project ? (
        <section className="project-box" aria-label="Projet de restauration">
          <h2>{site.project.title}</h2>
          {site.project.urgencyLevel ? (
            <p>
              <strong>Urgence :</strong>{' '}
              {urgencyLabel(site.project.urgencyLevel)}
            </p>
          ) : null}
          {site.project.summary ? <p>{site.project.summary}</p> : null}
          <Gauge
            collected={site.project.collectedAmount}
            target={site.project.targetAmount}
          />
          {site.project.quoteUrl ? (
            <p>
              <a href={site.project.quoteUrl}>Télécharger le devis (PDF)</a>
            </p>
          ) : null}
          <p className="muted">
            La plateforme finance et documente la restauration ; elle n'autorise
            aucun travaux (les monuments classés relèvent de la DRAC / ABF).
          </p>

          <DonateForm projectId={site.project.id} />

          <section className="transparency" aria-label="Transparence">
            <h3>Où va votre argent</h3>
            <p className="muted">
              Chaque euro est tracé et destiné à ce projet de restauration. Les
              fonds appartiennent au projet, pas à la plateforme. Un reçu fiscal
              est émis pour chaque don.
            </p>
            {transparency ? (
              <p>
                <strong>{transparency.donationsCount}</strong> don(s) reçus, dont{' '}
                <strong>{transparency.monthlyCount}</strong> mensuel(s).
              </p>
            ) : null}
          </section>
        </section>
      ) : (
        <p className="muted">
          Aucun projet de restauration n'est encore ouvert pour ce lieu.
        </p>
      )}

      {updates.length ? (
        <section aria-label="Actualités de chantier" style={{ marginTop: '2rem' }}>
          <h2>Actualités de chantier</h2>
          {updates.map((u) => (
            <article key={u.id} style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: 4 }}>{u.title}</h3>
              <p style={{ margin: 0 }}>{u.body}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
