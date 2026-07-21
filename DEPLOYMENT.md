# Déploiement Cloudflare Pages — Rayzk Dashboard

## 1. Sauvegarder Supabase

Exportez les tables listées dans [SUPABASE_SETUP.md](SUPABASE_SETUP.md), y compris `notes` si elle existe déjà. Conservez les CSV hors du dépôt.

## 2. Appliquer Notes V1.2

1. Vérifiez que les migrations jusqu’à `20260720_v11_management.sql` sont déjà présentes.
2. Dans SQL Editor, copiez puis exécutez `supabase/migrations/20260722_v12_notes.sql`.
3. Exécutez ensuite `supabase/migrations/20260722_v12_notes_permissions.sql`.
4. Exécutez `supabase/verify_production_schema.sql`.
5. Vérifiez la table, ses privilèges, le trigger, `ON DELETE SET NULL` et les quatre politiques RLS.
6. Effectuez le test manuel Notes décrit dans `SUPABASE_SETUP.md` avant tout push.

## 3. Variables Cloudflare Pages

| Nom | Action | Environnement | Valeur |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Conserver | Production + Preview | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Conserver | Production + Preview | Clé anon/publishable du même projet |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supprimer si présente | Production + Preview | Non lue par ce dépôt |
| `VITE_DAY_ROLLOVER_HOUR` | Supprimer | Production + Preview | Valeur stockée dans `app_settings` |
| `VITE_SUMMER_START` | Supprimer | Production + Preview | Ancien dashboard retiré |
| `VITE_SUMMER_END` | Supprimer | Production + Preview | Ancien dashboard retiré |
| `VITE_ENABLE_INTERNAL_LABS` | Supprimer | Production + Preview | Laboratoires retirés |

Ne placez jamais de secret serveur dans une variable `VITE_*`.

## 4. Configuration Cloudflare Pages

| Réglage | Valeur |
| --- | --- |
| Framework preset | React (Vite) ou Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js | `22.12.0` ou version 22 compatible plus récente |
| Production branch | `main` |

`public/_redirects` assure le fallback SPA, notamment pour `/notes/:noteId`.

## 5. Vérifications avant push

```bash
npm run typecheck
npm run test
npm run build
git status
```

Vérifiez que `.env.local`, `dist`, les exports CSV et les données personnelles ne sont pas inclus.

## 6. Checklist après déploiement

- [ ] Connexion, actualisation et navigation existante.
- [ ] Habitudes, Freelance, Personnel et Réglages inchangés.
- [ ] Ouverture directe de `/notes` et `/notes/:noteId` sans 404.
- [ ] Création d’une note globale et d’une note client.
- [ ] Autosave jusqu’à `Enregistré`, puis actualisation.
- [ ] Titres, listes, checklist, liens, code inline et bloc de code.
- [ ] Aperçus de `#FFF`, `#0A84FF` et `#FFFFFF80`.
- [ ] Recherche, filtres et déplacement Global/client.
- [ ] Création depuis la fiche client et retour vers l’onglet Notes.
- [ ] Suppression d’une note temporaire.
- [ ] Navigation mobile à cinq onglets sur 375, 390 et 430 px.

En cas de problème frontend, redéployez le déploiement Cloudflare précédent. La migration Notes est additive ; ne supprimez la table ou des données qu’après sauvegarde et analyse explicite.
