# Comment voir les améliorations

## 1. Redémarrer l’app et vider le cache
- Arrête le serveur de dev puis relance : `npm run dev`
- Dans le navigateur : rechargement forcé (Ctrl+Shift+R ou Cmd+Shift+R)

## 2. Nom d’affichage sur la page d’accueil
- Va dans **Profil** (icône utilisateur en haut à droite)
- Renseigne le champ **Nom d’affichage** et clique sur **Sauvegarder**
- Retourne sur l’accueil : le message doit afficher **Hey, [ton pseudo] 👋** au lieu de l’email

## 3. Notifications sur la carte Friends' Garages
- Un autre compte doit t’envoyer une **demande d’ami** (via Garages d’amis → rechercher ton pseudo)
- Tant que la demande est **en attente**, sur l’accueil la carte **Friends' Garages** affiche :
  - l’icône remplie qui clignote
  - un badge avec le nombre de demandes

## 4. Carte (2 km + glissement + recherche)
- **Mini-carte sur l’accueil** : elle se centre à 2 km autour de ta **dernière position** seulement si au moins une voiture a été ajoutée **avec une position** (localisation capturée à l’ajout).
- **Clic sur la carte** : ouvre la page **Spot Map** avec un glissement depuis la droite.
- **Recherche** : sur la page Spot Map, utilise la barre **Rechercher (ex: Clio V)**. Rayon 50 km, flèches pour passer d’un point à l’autre.

## 5. Leaderboard (4 tris)
- Il faut avoir exécuté la **migration Supabase** qui met à jour la fonction `get_leaderboard`.
- Dans le projet Supabase : **SQL Editor** → exécuter le contenu de  
  `supabase/migrations/20260219200000_leaderboard_avg_ratings.sql`
- Ou en local : `supabase db push` (ou `supabase migration up`)
- Ensuite, sur la page **Leaderboard**, le menu **Trier par** en haut à droite propose : Nombre de spots, Qualité moyenne, Rareté moyenne, Car level.
