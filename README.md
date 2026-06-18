# Sentinelle

Plateforme web pour **découvrir un lieu de patrimoine** (religieux/rural) sur une
carte, **comprendre son besoin de restauration** et **faire un don en toute
confiance**, avec un suivi public de l'avancement.

> MVP — région pilote : **Bretagne**. La confiance et la transparence sont le
> cœur du produit : chaque euro doit être traçable.

Ce dépôt est un **monorepo** (pnpm + Turborepo). Cette première étape (PR n°1)
pose les **fondations** : structure du monorepo, câblage Prisma + PostGIS de
bout en bout, et infrastructure locale (PostGIS + Redis).

## Architecture

```
sentinelle/
├── apps/
│   ├── api/        # API NestJS (monolithe modulaire)
│   └── web/        # Front Next.js (App Router, SSR/SSG)
├── packages/
│   ├── db/         # Schéma Prisma + migrations PostGIS + seed OSM
│   └── ui/         # Composants partagés (placeholder)
├── docker-compose.yml   # PostGIS + Redis
├── turbo.json           # pipeline build / lint / test / dev
└── tsconfig.base.json   # config TypeScript partagée
```

### Stack

| Domaine        | Choix                                                   |
| -------------- | ------------------------------------------------------- |
| Web            | Next.js (React, App Router) — SSR/SSG, SEO prioritaire  |
| Backend        | NestJS (Node.js) — monolithe modulaire                  |
| Base de données| PostgreSQL + **PostGIS** (requêtes « autour de moi »)   |
| Cache          | Redis                                                   |
| ORM            | Prisma (géométrie gérée en SQL brut)                    |
| Hébergement    | **Union Européenne** (RGPD)                             |

## Prérequis

- **Node.js >= 20**
- **pnpm 9** (`corepack enable` puis `corepack prepare pnpm@9.12.0 --activate`)
- **Docker** + Docker Compose (PostGIS & Redis)

## Démarrage local

```bash
# 1. Dépendances
pnpm install

# 2. Variables d'environnement
cp .env.example .env

# 3. Infrastructure (PostGIS + Redis)
docker compose up -d

# 4. Client Prisma + application des migrations (extension PostGIS, tables,
#    colonne geometry, index spatial GIST)
pnpm db:generate
pnpm db:deploy        # applique la migration 000_init_postgis en l'état
# (en développement, `pnpm db:migrate` crée/applique les migrations)

# 5. Seed OpenStreetMap (Bretagne) — choisir le département (22, 29, 35, 56)
DEPT=29 pnpm db:seed

# 6. Lancer en développement
pnpm --filter @sentinelle/db build   # build du package db consommé par l'API
pnpm dev                              # web (3000) + api (4000)
```

### Vérifier le bout-en-bout (API → Prisma → PostGIS)

```bash
curl http://localhost:4000/health
# → { "status": "ok", "database": true, "postgis": "3.4 USE_GEOS=1 ..." }

# Recherche « autour de moi » (Brest), rayon 10 km, via PostGIS
curl "http://localhost:4000/sites/around?lat=48.39&lng=-4.49&radius=10000"

# Recherche par emprise (bounding box)
curl "http://localhost:4000/sites/bbox?minLng=-4.6&minLat=48.3&maxLng=-4.3&maxLat=48.5"
```

## Scripts (racine)

| Commande            | Effet                                              |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Lance web + api en watch (Turborepo)               |
| `pnpm build`        | Build de tous les packages                         |
| `pnpm lint`         | Lint de tous les packages                          |
| `pnpm test`         | Tests de tous les packages                         |
| `pnpm typecheck`    | Vérification de types                              |
| `pnpm db:generate`  | Génère le client Prisma                            |
| `pnpm db:migrate`   | Crée/applique les migrations (dev)                 |
| `pnpm db:deploy`    | Applique les migrations existantes (prod/CI)       |
| `pnpm db:seed`      | Importe les sites OSM (`DEPT=29` par défaut)        |
| `pnpm db:studio`    | Ouvre Prisma Studio                                |

## Variables d'environnement

Voir [`.env.example`](./.env.example) (DB, Redis, API, Auth, Stripe, S3, seed).
Aucun secret n'est versionné. Hébergement et stockage en **UE** (RGPD).

## Modèle de données

Défini dans [`packages/db/prisma/schema.prisma`](./packages/db/prisma/schema.prisma).
Conventions imposées :

- **Montants en centimes** (`Int`) partout — jamais de flottant sur l'argent.
- `Project.collectedAmount` **dénormalisé** (jauge) ; source de vérité = somme
  des dons `SUCCEEDED` (recalcul sur webhook Stripe, PR n°5).
- Un `Project` n'est public qu'au statut **`PUBLISHED`** (modération).
- `HeritageSite.location` = `geometry(Point, 4326)`, lue/écrite en **SQL brut**
  (cf. `apps/api/src/sites/sites.service.ts` : `searchAround`, `searchInBbox`,
  `upsertWithPoint`). Extension PostGIS + index GIST créés par la migration
  `000_init_postgis`.

### À enrichir après le seed (ne pas se fier à OSM seul)

- **Département** : non porté par l'objet OSM → recalcul par jointure spatiale
  (`ST_Within` sur les contours administratifs) après import.
- **Statut Monument Historique** : à croiser avec la base POP / Mérimée (les
  tags OSM sont peu fiables).
- **Enclos paroissiaux** : pas de tag OSM unique → regroupement manuel.

## Authentification & rôles (PR n°2)

Les identifiants (mots de passe, vérification d'email, réinitialisation) sont
gérés par **Supabase Auth** (hébergé en région UE — RGPD). Sentinelle ne stocke
**aucun mot de passe** : elle conserve seulement une fiche `User` (rôle inclus).

- **Rôles** : `DONOR` (par défaut), `PROJECT_OWNER`, `ADMIN`.
- **Création de compte à la volée** : à la première requête authentifiée, l'API
  crée le `User` correspondant (lié à l'identifiant Supabase).
- **Amorçage admin** : tout email listé dans `ADMIN_EMAILS` est promu `ADMIN`.
- **Devenir porteur** : un utilisateur crée son `Organization` (commune/asso) et
  passe `PROJECT_OWNER` ; l'organisation reste **non vérifiée** jusqu'à
  validation par un admin (confiance).
- **Contrôle d'accès** côté serveur : gardes globales `JwtAuthGuard` +
  `RolesGuard`, décorateurs `@Public()`, `@Roles(...)`, `@CurrentUser()`.
- **Abstraction fournisseur** (`AuthProvider`) : `supabase` en production,
  `dev` pour les tests locaux/CI (jetons HS256 signés avec `DEV_AUTH_SECRET`,
  sans dépendre d'un compte Supabase réel).

Endpoints principaux : `GET/PATCH /me`, `GET /users` & `PATCH /users/:id/role`
(admin), `POST /organizations`, `GET /organizations` & `PATCH
/organizations/:id/verify` (admin). Pages web : `/login`, `/signup`,
`/account`, `/account/organization`.

### Tester l'auth en local sans Supabase (mode `dev`)

```bash
# API en mode dev-auth
AUTH_PROVIDER=dev DEV_AUTH_SECRET=ma-cle ADMIN_EMAILS=patron@sentinelle.fr \
  pnpm --filter @sentinelle/api dev

# Forger un jeton de test (donateur)
node -e "console.log(require('jsonwebtoken').sign({sub:'u1',email:'d@test.fr',aud:'authenticated'},'ma-cle',{algorithm:'HS256',expiresIn:'1h'}))"

curl -H "Authorization: Bearer <jeton>" http://localhost:4000/me
```

### Brancher un vrai projet Supabase

Supabase ne gère que **l'identité** (connexion) ; les données du site restent
dans notre PostgreSQL. Le moteur accepte les jetons Supabase **HS256 (legacy)**
comme **asymétriques (JWKS, nouveau défaut)**.

1. Créer un projet sur [supabase.com](https://supabase.com) en **région UE**
   (ex. *Frankfurt / eu-central*) — exigence RGPD.
2. Dans **Settings → API**, récupérer : *Project URL*, *anon public key*, et
   (si présent) le *JWT Secret* (section *JWT*).
3. Activer **Email** dans *Authentication → Providers* (et l'option de
   confirmation par email selon le besoin).
4. Renseigner les variables :
   - racine `.env` (API) : `AUTH_PROVIDER=supabase`, `SUPABASE_URL=...`,
     `SUPABASE_JWT_SECRET=...` (si fourni), `ADMIN_EMAILS=...`
   - `apps/web/.env.local` (copier depuis `apps/web/.env.local.example`) :
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `NEXT_PUBLIC_API_URL`
5. Lancer la base et les apps, puis tester sur `http://localhost:3000` :
   ```bash
   docker compose up -d && pnpm db:deploy
   pnpm --filter @sentinelle/api dev   # http://localhost:4000
   pnpm --filter @sentinelle/web dev   # http://localhost:3000
   ```
   S'inscrire sur `/signup`, confirmer l'email, se connecter sur `/login`,
   puis vérifier `/account` (le rôle vient de l'API via le jeton Supabase).

Vérifier que le projet répond (URL + clé anon, sans secret) :
```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | head -c 200
```

## Plan de PR

1. ✅ **Archi & fondations** (monorepo, Prisma + PostGIS, docker-compose)
2. ✅ **Auth + comptes + rôles** (DONOR / PROJECT_OWNER / ADMIN)
3. Carte + fiches indexables (`searchAround` / `searchInBbox`, MapLibre, SEO)
4. Espace porteur : projets + actualités + devis + modération
5. Dons Stripe : ponctuel + mensuel, webhook, reçus PDF, transparence
6. Durcissement : RGPD, sécurité, accessibilité, SEO, tests E2E
