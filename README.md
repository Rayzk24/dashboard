# Rayzk Dashboard

Dashboard personnel privé basé sur React, Vite et Supabase, avec la direction artistique Apple Dark Glass.

## Prérequis

- Node.js `22.12.0` ou une version 22 plus récente compatible.
- Un projet Supabase préparé selon [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Installation locale

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Variables locales attendues :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

N’utilisez jamais de clé `service_role`, de clé `sb_secret_*` ou de secret serveur dans une variable `VITE_*`.

## Commandes

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## Architecture

- `src/app` : session Supabase, routage et état partagé.
- `src/services` : accès Supabase centralisé, dont le repository typé des notes.
- `src/features` : Accueil, Habitudes, Freelance, Notes, Personnel et Réglages.
- `src/features/notes` : page Notes, éditeur Tiptap et aperçu des couleurs HEX.
- `src/lib` : règles métier pures et autosave sérialisé.
- `supabase/migrations` : migrations additives et versionnées.

## Fonctionnalités

- Authentification Supabase privée et réglages persistants.
- Habitudes hebdomadaires, calendrier et statistiques.
- Clients, missions, sessions, règlements, allocations et rapports PDF.
- Notes globales ou liées à un client, recherche, filtres, éditeur riche léger, autosave et aperçu HEX.
- Achats personnels avec filtres et statuts.

## Notes V1.2

Les migrations `supabase/migrations/20260722_v12_notes.sql` puis `supabase/migrations/20260722_v12_notes_permissions.sql` doivent être appliquées avant de lancer une version contenant l’onglet Notes. Elles créent la table privée, ses index, son trigger `updated_at`, ses politiques RLS et les droits du rôle `authenticated`. Les notes client sont conservées lors d’une suppression de client grâce à `ON DELETE SET NULL` et `client_name_snapshot`.

Suivez [DEPLOYMENT.md](DEPLOYMENT.md) avant tout push de cette version.
