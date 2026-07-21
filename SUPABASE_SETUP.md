# Supabase — Rayzk Dashboard

Toutes les migrations sont additives. Ne modifiez jamais une migration déjà appliquée et sauvegardez les données avant toute nouvelle étape.

## Sauvegarde préalable

Dans **Supabase > Table Editor**, exportez en CSV les tables présentes :

`admin_profile`, `app_settings`, `habits`, `habit_entries`, `daily_notes`, `notes`, `clients`, `projects`, `work_sessions`, `payments`, `payment_allocations`, `tasks`, `purchases`, `reports`, `report_sessions`, `daily_entries`, `summer_goals`.

Conservez les exports hors du dépôt Git. Notez aussi le compte existant dans **Authentication > Users**.

## Ordre des migrations

Dans **Supabase > SQL Editor > New query**, copiez chaque fichier complet et exécutez-les dans cet ordre :

1. `supabase/schema.sql` — bootstrap historique, uniquement si `admin_profile`, `is_admin()` et les tables Summer sont absents.
2. `supabase/migrations/20260715_v05.sql` — tables produit initiales, index, triggers et RLS.
3. `supabase/migrations/20260716_v051.sql` — changement de journée persistant.
4. `supabase/migrations/20260717_v053.sql` — période effective des habitudes.
5. `supabase/migrations/20260718_v054.sql` — titres des sessions, sans perte de description.
6. `supabase/migrations/20260719_v09_production_stability.sql` — réglages par défaut des administrateurs.
7. `supabase/migrations/20260720_v11_management.sql` — RPC de gestion transactionnelles.
8. `supabase/migrations/20260722_v12_notes.sql` — Notes V1.2.
9. `supabase/migrations/20260722_v12_notes_permissions.sql` — droit d’accès de la table au rôle authentifié.

Pour un projet Rayzk déjà en production, les étapes 1 à 7 sont probablement appliquées. Vérifiez-les avec `supabase/verify_production_schema.sql`, puis exécutez les étapes 8 et 9 dans cet ordre.

## Migration Notes V1.2

`20260722_v12_notes.sql` crée uniquement :

- la table privée `notes` ;
- les index `user_id/updated_at` et `client_id` ;
- le trigger `touch_notes_updated_at` réutilisant `public.touch_updated_at()` ;
- quatre politiques RLS distinctes pour `SELECT`, `INSERT`, `UPDATE` et `DELETE` ;
- une clé étrangère client avec `ON DELETE SET NULL`.

Le contenu riche est enregistré en JSONB et son texte de recherche dans `plain_text`. `client_name_snapshot` conserve le nom d’un ancien client. Une suppression de client ne supprime donc jamais ses notes.

Les politiques vérifient `user_id = auth.uid()`, le compte administrateur et, lorsqu’un client est choisi, que ce client appartient au même utilisateur. Aucune note n’est accessible sans authentification.

`20260722_v12_notes_permissions.sql` accorde explicitement `SELECT`, `INSERT`, `UPDATE` et `DELETE` au rôle `authenticated`. Les politiques RLS ci-dessus continuent de limiter chaque opération aux notes du propriétaire. Le rôle `anon` ne reçoit aucun accès à la table.

## Vérification après migration

1. Exécutez `supabase/verify_production_schema.sql` dans une nouvelle requête.
2. Vérifiez que `notes` apparaît avec `rowsecurity = true`.
3. Vérifiez les colonnes `content jsonb`, `plain_text`, `client_name_snapshot`, `created_at` et `updated_at`.
4. Vérifiez que la contrainte de `client_id` indique `ON DELETE SET NULL`.
5. Vérifiez le trigger `touch_notes_updated_at`.
6. Vérifiez les quatre politiques `notes ... own` destinées à `authenticated`.
7. Vérifiez que `authenticated` possède les quatre privilèges de table et que `anon` n’en possède aucun.

## Test manuel avant push

Avec le compte connecté :

1. créez une note globale ;
2. créez une note liée à un client ;
3. écrivez du texte, une checklist, du code et plusieurs couleurs HEX ;
4. attendez l’état `Enregistré`, puis actualisez ;
5. recherchez et filtrez la note ;
6. déplacez-la vers un autre client puis vers Global ;
7. supprimez uniquement une note temporaire ;
8. confirmez qu’un utilisateur non authentifié ne peut lire aucune note.

N’utilisez jamais de clé `service_role`, de clé `sb_secret_*`, de JWT secret ou de mot de passe de base dans le frontend.
