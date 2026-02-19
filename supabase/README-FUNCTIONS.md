# Edge Functions – Configuration

## Une seule fonction : car-api

Reconnaissance de voiture, liste des moteurs et description utilisent **une seule** Edge Function : **car-api**, avec **une seule** clé.

## Secret requis (Supabase)

Dans **Supabase** → **Edge Functions** → **Secrets** :

- **Nom :** `GEMINI_API_KEY`
- **Valeur :** ta clé API Gemini (gratuite : [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

## Déploiement

1. Dans Supabase, crée une nouvelle Edge Function nommée **car-api** (ou renomme une existante).
2. Copie tout le contenu de **`supabase/functions/car-api/index.ts`** dans l’éditeur.
3. Clique sur **Deploy** (ou **Deploy updates**).

Les anciennes fonctions **identify-car** et **car-info** ont été supprimées du projet ; seule **car-api** est utilisée.
