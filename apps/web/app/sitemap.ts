import type { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const revalidate = 3600; // régénéré au plus une fois par heure

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/carte',
    '/comment-ca-marche',
    '/confidentialite',
    '/mentions-legales',
  ].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: 'weekly' }));

  let sites: { slug: string; updatedAt: string }[] = [];
  try {
    const res = await fetch(`${API_URL}/sites/sitemap`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) sites = await res.json();
  } catch {
    // API indisponible au build : on renvoie au moins les routes statiques.
  }

  const siteRoutes: MetadataRoute.Sitemap = sites.map((s) => ({
    url: `${siteUrl}/lieux/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'weekly',
  }));

  return [...staticRoutes, ...siteRoutes];
}
