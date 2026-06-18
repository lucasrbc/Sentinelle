# Mise en ligne de Sentinelle

Ce guide déploie Sentinelle sur **un serveur (VPS) en Union européenne** avec
Docker. À la fin, le site est accessible depuis n'importe quel appareil
(ordinateur **ou téléphone**) en HTTPS.

> Architecture déployée : un reverse proxy **Caddy** (HTTPS automatique) devant
> le **site** (Next.js) et l'**API** (NestJS), avec **PostgreSQL + PostGIS**,
> **Redis**, et un conteneur de **migrations** exécuté une fois au démarrage.

## 1. Prérequis

- **Un serveur (VPS) chez un hébergeur UE** (ex. Scaleway, OVH, Hetzner) avec
  **Docker** + **Docker Compose** installés. 2 Go de RAM minimum.
- **Un nom de domaine** (ex. `exemple.fr`).
- Comptes **Supabase** (auth, région UE) et **Stripe** (paiements).

## 2. DNS

Créer deux enregistrements **A** pointant vers l'IP du serveur :

| Sous-domaine        | Type | Valeur          |
| ------------------- | ---- | --------------- |
| `app.exemple.fr`    | A    | IP du serveur   |
| `api.exemple.fr`    | A    | IP du serveur   |

## 3. Configuration

Sur le serveur, récupérer le code puis :

```bash
cp .env.production.example .env
# Éditer .env : DOMAIN, mots de passe, clés Supabase et Stripe, ADMIN_EMAILS…
```

Points importants dans `.env` :
- `DOMAIN`, `WEB_ORIGIN=https://app.exemple.fr`, `API_PUBLIC_URL=https://api.exemple.fr`
- `POSTGRES_PASSWORD` **et** le même mot de passe dans `DATABASE_URL`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAILS` (votre email, pour devenir administrateur)

## 4. Lancement

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Au démarrage : les migrations s'appliquent automatiquement (extension PostGIS,
tables, index), puis l'API et le site démarrent, et Caddy obtient les
certificats HTTPS. Le site est alors sur **https://app.exemple.fr**.

## 5. Après le déploiement

1. **Webhook Stripe** : dans le tableau de bord Stripe, ajouter un endpoint
   `https://api.exemple.fr/webhooks/stripe` (événement
   `checkout.session.completed`) et reporter le secret dans
   `STRIPE_WEBHOOK_SECRET`, puis `docker compose -f docker-compose.prod.yml up -d`.
2. **Supabase** : autoriser l'URL `https://app.exemple.fr` dans les redirections
   Auth ; activer la connexion Email.
3. **Importer les lieux** (Bretagne) :
   ```bash
   docker compose -f docker-compose.prod.yml run --rm \
     -e DEPT=29 migrate pnpm --filter @sentinelle/db seed
   ```
   (répéter pour 22, 35, 56).
4. **Devenir administrateur** : connectez-vous une fois sur le site avec l'email
   listé dans `ADMIN_EMAILS` ; le rôle ADMIN est attribué automatiquement.
5. **Compléter** les mentions légales (`/mentions-legales`).

## 6. Recommandations production

- **Stockage** : passer `STORAGE_PROVIDER=s3` avec un object storage UE
  (OVH/Scaleway) plutôt que le volume local, pour les devis et reçus.
- **Sauvegardes** : sauvegarder régulièrement le volume `pg_data`.
- **Mises à jour** : `git pull` puis `docker compose -f docker-compose.prod.yml up -d --build`.

> ⚠️ Les images Docker n'ont pas pu être construites dans l'environnement de
> développement (pas de démon Docker) : valider la première construction sur le
> serveur. Les manifestes (Dockerfiles, compose, Caddy) sont prêts à l'emploi.
