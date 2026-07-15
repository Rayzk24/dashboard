# Rayzk Dashboard V0.9

Dashboard personnel privé pour les habitudes, le suivi freelance et les achats. La version V0.9 utilise exclusivement Supabase au runtime et le thème final Bleu minuit raffiné.

## Prérequis

- Node.js `22.12.0` ou plus récent dans la branche 22 (voir `.nvmrc`).
- Un projet Supabase configuré selon [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Installation locale

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Renseignez uniquement ces deux variables dans `.env.local` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

La clé anonyme/publishable est une clé frontend. Elle ne remplace pas Supabase Auth et les politiques RLS. Ne mettez jamais une clé `service_role`, une clé secrète ou un mot de passe de base dans une variable `VITE_*`.

## Commandes

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

Le build Vite est créé dans `dist`. `public/_redirects` et `public/_headers` sont copiés dans ce dossier.

## Architecture

- `src/app` : session Supabase, routage et état de données partagé.
- `src/services/data.ts` : unique repository frontend Supabase.
- `src/features` : les quatre espaces produit (Accueil, Habitudes, Freelance, Personnel) et Réglages.
- `supabase/schema.sql` : bootstrap Auth/admin historique.
- `supabase/migrations` : évolutions additives et versionnées du schéma produit.

## Fonctionnalités présentes

- Connexion Supabase mono-administrateur, persistance de session et déconnexion.
- Habitudes : création, modification, archivage, validation, vues semaine/mois et statistiques.
- Freelance : clients, missions, sessions titrées, tarifs hérités, commissions, règlements, allocations et rapport PDF existant.
- Personnel : ajout, modification, changement de statut et suppression des achats.
- Réglages persistants : nom, site, tarif global, changement de jour et export JSON.

## Fonctionnalités prévues pour V1.1

- Détail et modification complets d’une session.
- Suppression définitive des habitudes, missions et sessions.
- Historique, modification et suppression avancés des règlements.

Ces actions ne sont pas présentées comme disponibles dans l’interface V0.9.

## Déploiement

Suivez [DEPLOYMENT.md](DEPLOYMENT.md) pour les étapes Supabase et Cloudflare Pages. Aucune donnée de démonstration ni route de laboratoire ne fait partie du produit V0.9.
