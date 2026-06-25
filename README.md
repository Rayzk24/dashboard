# Rayzk Dashboard

Dashboard personnel privé, séparé du portfolio, construit avec Vite, React, TypeScript, Tailwind CSS et Supabase.

## Stack

- Vite + React + TypeScript
- Tailwind CSS avec les tokens visuels du portfolio Rayzk
- Framer Motion pour les micro-animations
- Supabase Auth + Postgres + Row Level Security
- Déploiement statique sur Cloudflare Pages

## Lancer en local

```bash
cd C:\Users\95ray\Desktop\Code\rayzk-dashboard
npm install
```

Créer le fichier local d'environnement :

```powershell
Copy-Item .env.example .env.local
```

Remplir `.env.local` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUMMER_START=2026-06-14
VITE_SUMMER_END=2026-08-20
```

Démarrer :

```bash
npm run dev
```

Build de vérification :

```bash
npm run build
```

## Configurer Supabase

1. Créer un projet sur [Supabase](https://supabase.com/).
2. Ouvrir `Project Settings > API`.
3. Copier `Project URL` dans `VITE_SUPABASE_URL`.
4. Copier la clé publique `anon` / `publishable` dans `VITE_SUPABASE_ANON_KEY`.
5. Ouvrir `SQL Editor`.
6. Coller et exécuter tout le contenu de `supabase/schema.sql`.
7. Dans `Authentication > Providers`, vérifier que le provider Email est actif.
8. Dans `Authentication > URL Configuration`, ajouter les URLs utilisées :
   - `http://localhost:5173`
   - l'URL Cloudflare Pages après déploiement

Le SQL crée :

- une table `admin_profile` limitée à une seule ligne ;
- un trigger sur `auth.users` qui refuse toute création d'utilisateur après le premier compte ;
- les tables `daily_entries` et `summer_goals` ;
- les policies RLS pour que seul l'admin authentifié lise et modifie ses données ;
- la fonction publique `has_admin()` utilisée uniquement pour savoir si l'écran de premier lancement doit s'afficher.

## Créer le premier compte administrateur

1. Lancer le projet avec `npm run dev`.
2. Ouvrir l'app.
3. Si aucun admin n'existe, l'écran `Premier lancement` apparaît.
4. Entrer l'email et le mot de passe du compte admin.
5. Si la confirmation email Supabase est active, confirmer l'email puis se connecter.

Après cette première création, l'app n'affiche plus d'inscription et le trigger SQL bloque les nouvelles créations de comptes.

## Déployer sur Cloudflare Pages

1. Pousser ce dossier dans un repository GitHub.
2. Ouvrir [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Aller dans `Workers & Pages`.
4. Créer une application Pages et importer le repository.
5. Configurer :
   - Framework preset : `React (Vite)` ou `Vite`
   - Build command : `npm run build`
   - Build output directory : `dist`
   - Root directory : laisser vide si le repository contient seulement ce projet, sinon `rayzk-dashboard`
6. Ajouter les variables d'environnement dans `Settings > Environment variables` :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUMMER_START`
   - `VITE_SUMMER_END`
7. Lancer le déploiement.
8. Ajouter l'URL Pages finale dans `Authentication > URL Configuration` côté Supabase.

Cloudflare documente `npm run build` et `dist` comme configuration standard pour React/Vite sur Pages.

## Variables

| Variable | Exemple | Role |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | URL publique du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | `ey...` | Clé publique anon/publishable Supabase |
| `VITE_SUMMER_START` | `2026-06-14` | Début de la période Summer '26 |
| `VITE_SUMMER_END` | `2026-08-20` | Fin de la période Summer '26 |

## Sources utiles

- [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Supabase password auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
