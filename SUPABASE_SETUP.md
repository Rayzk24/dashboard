# Supabase — préparation de Rayzk Dashboard V0.9

Ce guide utilise uniquement des migrations additives. Elles ne suppriment pas les anciennes tables Summer ni les données existantes. Ne modifiez pas `.env.local` depuis le SQL Editor.

## Avant toute migration : sauvegarde

1. Ouvrez **Supabase > Table Editor**.
2. Exportez ces tables au format CSV lorsqu’elles existent :
   `admin_profile`, `app_settings`, `habits`, `habit_entries`, `daily_notes`, `clients`, `projects`, `work_sessions`, `payments`, `payment_allocations`, `tasks`, `purchases`, `reports`, `report_sessions`, `daily_entries`, `summer_goals`.
3. Enregistrez les exports dans un dossier hors du dépôt et ne les poussez pas vers Git.
4. Notez le compte admin existant dans **Authentication > Users**.

## Schéma attendu par le frontend V0.9

| Domaine | Tables runtime |
| --- | --- |
| Auth / profil | `admin_profile`, `app_settings` |
| Habitudes | `habits`, `habit_entries`, `daily_notes` |
| Freelance | `clients`, `projects`, `work_sessions`, `payments`, `payment_allocations`, `reports`, `report_sessions` |
| Personnel / compatibilité | `purchases`, `tasks` |

Les tables `daily_entries` et `summer_goals` peuvent rester présentes : elles ne sont plus appelées par le frontend V0.9.

## Ordre exact dans SQL Editor

Avant chaque fichier : ouvrez **Supabase > SQL Editor > New query**, copiez le fichier complet indiqué, exécutez-le, puis passez à l’étape suivante seulement si l’exécution se termine sans erreur inattendue.

### Étape 1 — Bootstrap historique (seulement si absent)

Fichier : `supabase/schema.sql`

Appliquez-le uniquement si ce projet Supabase ne possède pas encore `admin_profile`, `daily_entries`, `summer_goals`, `has_admin()` et `is_admin()`. Sur l’ancien projet Rayzk il est probablement déjà appliqué.

Il ajoute le premier compte administrateur via un trigger Auth et active RLS sur les tables historiques. Si une table ou un trigger existe déjà, les clauses `if not exists` / `drop ... if exists` rendent la réexécution généralement sûre. N’exécutez toutefois pas cette étape aveuglément sur un projet qui utilise un système d’admin différent.

### Étape 2 — Tables produit V0.5

Fichier : `supabase/migrations/20260715_v05.sql`

À appliquer si les tables `app_settings`, `habits`, `clients`, `projects` et `work_sessions` n’existent pas encore. Ce fichier ajoute les tables V0.5, les index, les triggers de date, RLS et une migration non destructive depuis les tables Summer. Il ne supprime pas les anciennes tables.

### Étape 3 — Changement de journée persistant

Fichier : `supabase/migrations/20260716_v051.sql`

À appliquer si `app_settings.day_rollover_hour` est absent. Il ajoute cette colonne, avec la valeur par défaut `5`.

### Étape 4 — Période effective des habitudes

Fichier : `supabase/migrations/20260717_v053.sql`

À appliquer si `habits.starts_on` ou `habits.ends_on` est absent. Il complète les lignes existantes sans les effacer et ajoute le trigger d’archivage.

### Étape 5 — Titres des sessions

Fichier : `supabase/migrations/20260718_v054.sql`

À appliquer si `work_sessions.title` est absent. Les titres des anciennes sessions sont dérivés de la première ligne de la description ou d’un libellé neutre. La description publique est conservée intégralement.

### Étape 6 — Stabilité V0.9

Fichier : `supabase/migrations/20260719_v09_production_stability.sql`

Appliquez toujours ce fichier après les étapes précédentes. Il ajoute uniquement un trigger qui crée les réglages par défaut pour un futur premier administrateur et remplit les réglages manquants des administrateurs existants. Il n’écrase aucune ligne `app_settings` existante.

## Vérifier le résultat

1. Ouvrez une nouvelle requête SQL.
2. Copiez le contenu complet de `supabase/verify_production_schema.sql`.
3. Exécutez les requêtes sans les modifier.
4. Vérifiez que chaque table runtime apparaît avec `rowsecurity = true`.
5. Vérifiez que `work_sessions.title` est non nullable, et que les politiques des tables runtime s’adressent au rôle `authenticated` avec la vérification de propriétaire.
6. Vérifiez la présence du trigger `ensure_app_settings_for_admin_on_profile`.

Les messages indiquant qu’un index, une table ou une colonne existe déjà sont normaux uniquement si vous savez qu’une migration a déjà été appliquée. En cas de doute, arrêtez-vous, lancez d’abord le fichier de vérification et comparez le résultat à ce guide.

## RLS et sécurité attendues

La migration V0.5 active RLS sur toutes les tables runtime. Les politiques `owner access` limitent la lecture, l’insertion, la mise à jour et la suppression aux utilisateurs authentifiés qui sont aussi l’administrateur, avec `user_id = auth.uid()`.

`admin_profile` est créé par le trigger Auth sécurisé. L’inscription n’est pas une fonctionnalité publique : dans **Authentication > Providers > Email**, désactivez les inscriptions publiques après la création/vérification du compte personnel si elles ne sont pas nécessaires. Dans **Authentication > URL Configuration**, ajoutez l’URL locale et l’URL Cloudflare Pages autorisées.

N’utilisez jamais `service_role`, une clé `sb_secret_*`, le JWT secret ou un mot de passe de base dans le frontend.

## Test après migration

Avec les deux variables frontend configurées, connectez-vous avec le compte admin existant. Vérifiez au minimum : chargement des habitudes, validation, ajout d’un client, mission, session, règlement, achat, réglages puis actualisation. Une erreur RLS doit rester visible dans l’interface ; elle ne doit jamais être contournée par une clé serveur dans le navigateur.
