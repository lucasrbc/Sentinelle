/**
 * Seed OpenStreetMap — import des lieux de patrimoine religieux/rural via
 * l'API Overpass, configurable par département (Bretagne : 22, 29, 35, 56).
 *
 *   DEPT=29 pnpm db:seed
 *
 * Remarques (SPEC §11 — « À enrichir après le seed, ne pas se fier à OSM seul ») :
 *   - Le département n'est pas porté au niveau de l'objet OSM → ici on annote
 *     simplement avec le DEPT importé ; un recalcul par jointure spatiale
 *     (ST_Within sur les contours administratifs) viendra plus tard.
 *   - Le statut Monument Historique doit être croisé avec la base POP/Mérimée,
 *     pas les tags OSM (peu fiables) → laissé à NONE ici.
 *   - Les enclos paroissiaux n'ont pas de tag OSM unique → regroupement manuel.
 *
 * La colonne `location` (geometry) est écrite en SQL BRUT (Prisma Client ne
 * sait pas manipuler la géométrie PostGIS).
 */
import { PrismaClient, HeritageType, ProtectionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEPT = process.env.DEPT ?? '29';
const OVERPASS_URL =
  process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

// Bretagne — départements pris en charge par le pilote.
const DEPT_NAMES: Record<string, string> = {
  '22': "Côtes-d'Armor",
  '29': 'Finistère',
  '35': 'Ille-et-Vilaine',
  '56': 'Morbihan',
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/** Construit la requête Overpass : édifices religieux/ruraux du département. */
function buildQuery(dept: string): string {
  const deptName = DEPT_NAMES[dept];
  if (!deptName) {
    throw new Error(
      `Département "${dept}" non pris en charge. Valeurs Bretagne : ${Object.keys(
        DEPT_NAMES,
      ).join(', ')}.`,
    );
  }
  // Zone administrative du département (admin_level=6), puis les édifices à l'intérieur.
  return `
    [out:json][timeout:120];
    area["boundary"="administrative"]["admin_level"="6"]["name"="${deptName}"]->.dept;
    (
      nwr["amenity"="place_of_worship"]["religion"="christian"](area.dept);
      nwr["historic"="church"](area.dept);
      nwr["historic"="chapel"](area.dept);
      nwr["historic"="wayside_cross"](area.dept);
      nwr["man_made"="lavoir"](area.dept);
      nwr["historic"="manor"](area.dept);
    );
    out center tags;
  `;
}

/** Déduit le HeritageType à partir des tags OSM. */
function mapType(tags: Record<string, string>): HeritageType {
  const building = tags.building ?? '';
  const historic = tags.historic ?? '';
  const manMade = tags.man_made ?? '';

  if (historic === 'wayside_cross' || tags.man_made === 'cross') {
    return HeritageType.CALVARY;
  }
  if (manMade === 'lavoir') return HeritageType.WASHHOUSE;
  if (historic === 'manor' || building === 'manor') return HeritageType.MANOR;
  if (building === 'chapel' || historic === 'chapel') return HeritageType.CHAPEL;
  if (building === 'cathedral' || building === 'church' || historic === 'church') {
    return HeritageType.CHURCH;
  }
  if (building === 'monastery' || tags.amenity === 'monastery') {
    return HeritageType.ABBEY;
  }
  return HeritageType.OTHER;
}

/** Slug stable et unique (basé sur l'identifiant OSM). */
function makeSlug(name: string, osmId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${base || 'site'}-${osmId}`;
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass a répondu ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as OverpassResponse;
}

async function main(): Promise<void> {
  const deptName = DEPT_NAMES[DEPT];
  console.log(`[seed-osm] Import OSM — département ${DEPT} (${deptName})`);

  const data = await fetchOverpass(buildQuery(DEPT));
  console.log(`[seed-osm] ${data.elements.length} éléments reçus d'Overpass.`);

  let imported = 0;
  let skipped = 0;

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['name:fr'];
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    // On ignore les objets sans nom ou sans coordonnées exploitables.
    if (!name || lat === undefined || lon === undefined) {
      skipped++;
      continue;
    }

    const osmId = `${el.type}/${el.id}`;
    const type = mapType(tags);
    const slug = makeSlug(name, osmId.replace('/', '-'));

    // 1) Upsert des champs scalaires via Prisma Client (gestion de l'id cuid).
    const site = await prisma.heritageSite.upsert({
      where: { osmId },
      create: {
        osmId,
        slug,
        name,
        type,
        commune: tags['addr:city'] ?? null,
        department: DEPT,
        protectionStatus: ProtectionStatus.NONE, // à croiser avec POP/Mérimée
        photos: [],
      },
      update: {
        name,
        type,
        commune: tags['addr:city'] ?? undefined,
        department: DEPT,
      },
    });

    // 2) Écriture de la géométrie en SQL brut (colonne non gérée par Prisma).
    await prisma.$executeRaw`
      UPDATE "HeritageSite"
      SET "location" = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      WHERE "id" = ${site.id};
    `;
    imported++;
  }

  console.log(
    `[seed-osm] Terminé : ${imported} sites importés, ${skipped} ignorés (sans nom/coordonnées).`,
  );
}

main()
  .catch((err) => {
    console.error('[seed-osm] Échec :', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
