'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { apiUrl } from '@/lib/api';
import { heritageTypeLabel } from '@/lib/format';
import type { SiteFilters, SiteSummary } from '@/lib/types';

// La carte utilise `window` → chargée uniquement côté navigateur.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const TYPE_OPTIONS = ['CHURCH', 'CHAPEL', 'CALVARY', 'WASHHOUSE', 'MANOR'];
const PROTECTION_OPTIONS = [
  { value: 'CLASSE', label: 'Classé' },
  { value: 'INSCRIT', label: 'Inscrit' },
];

const EMPTY_FILTERS: SiteFilters = {
  type: [],
  protectionStatus: [],
  urgency: [],
  onlyWithActiveCollection: false,
};

export default function MapPage(): React.JSX.Element {
  const [filters, setFilters] = useState<SiteFilters>(EMPTY_FILTERS);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [flyTo, setFlyTo] = useState<{
    lng: number;
    lat: number;
    nonce: number;
  } | null>(null);
  const [query, setQuery] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);

  const onSitesChange = useCallback((next: SiteSummary[]) => {
    setSites(next);
  }, []);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function locateMe(): void {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFlyTo({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          nonce: Date.now(),
        }),
      () =>
        setGeoError(
          "Localisation refusée. Vous pouvez rechercher une commune à la place.",
        ),
    );
  }

  async function onSearch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (query.trim().length < 2) return;
    try {
      const res = await fetch(apiUrl('/sites/search', { q: query.trim() }), {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const results = (await res.json()) as SiteSummary[];
      const first = results[0];
      if (first) {
        setFlyTo({ lng: first.longitude, lat: first.latitude, nonce: Date.now() });
      }
    } catch {
      // réseau indisponible
    }
  }

  const sortedSites = useMemo(
    () => [...sites].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [sites],
  );

  return (
    <div className="map-page">
      <section className="map-controls" aria-label="Recherche et filtres">
        <form onSubmit={onSearch} className="search-row" role="search">
          <label htmlFor="q" className="sr-only">
            Rechercher une commune ou un lieu
          </label>
          <input
            id="q"
            type="text"
            placeholder="Rechercher une commune ou un lieu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn">
            Rechercher
          </button>
          <button type="button" className="btn btn-secondary" onClick={locateMe}>
            Autour de moi
          </button>
        </form>
        <p className="muted geo-note">
          « Autour de moi » utilise votre position uniquement pour centrer la
          carte. Elle n'est ni enregistrée ni partagée.
        </p>
        {geoError ? (
          <p className="alert-error" role="alert">
            {geoError}
          </p>
        ) : null}

        <fieldset className="filters">
          <legend>Type d'édifice</legend>
          {TYPE_OPTIONS.map((t) => (
            <label key={t} className="chip">
              <input
                type="checkbox"
                checked={filters.type.includes(t)}
                onChange={() =>
                  setFilters((f) => ({ ...f, type: toggle(f.type, t) }))
                }
              />
              {heritageTypeLabel(t)}
            </label>
          ))}
        </fieldset>

        <fieldset className="filters">
          <legend>Protection</legend>
          {PROTECTION_OPTIONS.map((p) => (
            <label key={p.value} className="chip">
              <input
                type="checkbox"
                checked={filters.protectionStatus.includes(p.value)}
                onChange={() =>
                  setFilters((f) => ({
                    ...f,
                    protectionStatus: toggle(f.protectionStatus, p.value),
                  }))
                }
              />
              {p.label}
            </label>
          ))}
          <label className="chip">
            <input
              type="checkbox"
              checked={filters.onlyWithActiveCollection}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  onlyWithActiveCollection: e.target.checked,
                }))
              }
            />
            Collecte en cours
          </label>
        </fieldset>
      </section>

      <MapView filters={filters} flyTo={flyTo} onSitesChange={onSitesChange} />

      <section className="map-list" aria-label="Liste des lieux visibles">
        <h2>{sortedSites.length} lieu(x) dans la zone affichée</h2>
        <ul>
          {sortedSites.map((s) => (
            <li key={s.id}>
              <Link href={`/lieux/${s.slug}`}>{s.name}</Link>
              {s.commune ? <span className="muted"> — {s.commune}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
