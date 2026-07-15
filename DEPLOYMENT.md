# Déploiement Cloudflare Pages — Rayzk Dashboard V0.9

Suivez les étapes dans cet ordre. Ne placez jamais une clé serveur Supabase dans Cloudflare Pages ni dans le dépôt.

## 1. Sauvegarder puis préparer Supabase

1. Dans Supabase, ouvrez **Table Editor**.
2. Exportez en CSV les tables utilisées : `app_settings`, `habits`, `habit_entries`, `daily_notes`, `clients`, `projects`, `work_sessions`, `payments`, `payment_allocations`, `tasks`, `purchases`, `reports`, `report_sessions` et `admin_profile`.
3. Conservez les exports hors du dépôt Git.
4. Suivez les instructions pas à pas de [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
5. Dans SQL Editor, exécutez `supabase/verify_production_schema.sql` et vérifiez le résultat avant le déploiement.

## 2. Variables Cloudflare Pages

Ajoutez les variables dans **Settings > Environment variables** pour **Production** et **Preview**. La clé anonyme est une valeur frontend et doit rester protégée par Auth/RLS ; ne l’enregistrez pas comme secret serveur.

| Nom | Action | Type Cloudflare | Environnement | Valeur |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | CONSERVER | Plaintext | Production + Preview | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | CONSERVER | Plaintext | Production + Preview | Clé anon/publishable du même projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | SUPPRIMER | — | Production + Preview | Non lue par ce dépôt V0.9 |
| `VITE_DAY_ROLLOVER_HOUR` | SUPPRIMER | — | Production + Preview | Le changement de jour est stocké dans `app_settings` (secours interne : 5) |
| `VITE_SUMMER_START` | SUPPRIMER | — | Production + Preview | Ancien dashboard Summer retiré du runtime |
| `VITE_SUMMER_END` | SUPPRIMER | — | Production + Preview | Ancien dashboard Summer retiré du runtime |
| `VITE_ENABLE_INTERNAL_LABS` | SUPPRIMER | — | Production + Preview | Laboratoires retirés du produit |

Ne créez pas de variable `VITE_*` pour `service_role`, `sb_secret_*`, JWT secret ou mot de passe de base.

## 3. Configuration Cloudflare Pages

| Réglage | Valeur |
| --- | --- |
| Framework preset | React (Vite), ou Vite selon l’interface Cloudflare |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js | `22.12.0` ou une version 22 plus récente compatible |
| Production branch | Votre branche principale (souvent `main`) |

`public/_redirects` contient le fallback SPA et `public/_headers` règle le cache des assets hashés. Ils sont copiés dans `dist` par Vite.

## 4. Push et déploiement

1. Exécutez localement `npm run typecheck`, `npm run test` et `npm run build`.
2. Vérifiez `git status` et assurez-vous que `.env.local`, les exports CSV et `dist` n’apparaissent pas.
3. Poussez votre branche vers GitHub.
4. Attendez le build Cloudflare Pages, puis ouvrez l’URL de production.
5. Testez la checklist ci-dessous.

Pour revenir en arrière, redéployez le déploiement Cloudflare précédent. Ne restaurez Supabase qu’à partir de la sauvegarde si une migration a réellement échoué ou produit un résultat inattendu.

## 5. Checklist après déploiement

- [ ] Ouvrir le site, se connecter et actualiser la page : la session persiste.
- [ ] Vérifier Accueil et valider une habitude.
- [ ] Créer/modifier un client, une mission et une session.
- [ ] Enregistrer un règlement existant et vérifier les montants.
- [ ] Créer/modifier un achat et changer son statut.
- [ ] Modifier les réglages puis actualiser la page.
- [ ] Ouvrir directement `/habits`, `/freelance`, `/personnel` et `/settings` : aucune 404.
- [ ] Se déconnecter puis vérifier que l’accès revient à la connexion.
- [ ] Vérifier l’affichage mobile.
