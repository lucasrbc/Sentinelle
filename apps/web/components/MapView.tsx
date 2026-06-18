'use client';

import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { apiUrl } from '@/lib/api';
import type { SiteFilters, SiteSummary } from '@/lib/types';

// Fond OpenStreetMap (open source, sans clé). À remplacer par un fournisseur
// de tuiles dédié avant la mise en ligne si le trafic grossit.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© contributeurs OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Centre par défaut : Bretagne.
const DEFAULT_CENTER: [number, number] = [-2.8, 48.2];
const DEFAULT_ZOOM = 7.5;

function filtersToParams(filters: SiteFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.type.length) params.type = filters.type.join(',');
  if (filters.protectionStatus.length)
    params.protectionStatus = filters.protectionStatus.join(',');
  if (filters.urgency.length) params.urgency = filters.urgency.join(',');
  if (filters.onlyWithActiveCollection) params.onlyWithActiveCollection = 'true';
  return params;
}

export default function MapView({
  filters,
  flyTo,
  onSitesChange,
}: {
  filters: SiteFilters;
  flyTo: { lng: number; lat: number; nonce: number } | null;
  onSitesChange: (sites: SiteSummary[]) => void;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Initialisation de la carte (une seule fois).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    async function refresh(): Promise<void> {
      const bounds = map.getBounds();
      const params: Record<string, string> = {
        minLng: String(bounds.getWest()),
        minLat: String(bounds.getSouth()),
        maxLng: String(bounds.getEast()),
        maxLat: String(bounds.getNorth()),
        limit: '200',
        ...filtersToParams(filtersRef.current),
      };
      try {
        const res = await fetch(apiUrl('/sites/bbox', params), {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const sites = (await res.json()) as SiteSummary[];
        renderMarkers(map, sites);
        onSitesChange(sites);
      } catch {
        // Réseau indisponible : on garde la carte affichée sans points.
      }
    }

    function renderMarkers(m: maplibregl.Map, sites: SiteSummary[]): void {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = sites.map((site) => {
        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          `<strong>${escapeHtml(site.name)}</strong><br/>` +
            `<a href="/lieux/${encodeURIComponent(site.slug)}">Voir la fiche</a>`,
        );
        return new maplibregl.Marker({ color: '#0b3d91' })
          .setLngLat([site.longitude, site.latitude])
          .setPopup(popup)
          .addTo(m);
      });
    }

    map.on('load', refresh);
    map.on('moveend', refresh);

    return () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // onSitesChange est stable (useCallback côté parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharger les points quand les filtres changent.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.fire('moveend');
  }, [filters]);

  // « Autour de moi » / recherche : recentrer la carte.
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 13 });
  }, [flyTo]);

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      role="application"
      aria-label="Carte des lieux de patrimoine"
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
