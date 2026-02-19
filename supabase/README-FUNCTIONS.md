# Edge Functions – Configuration

## Clés requises (Secrets Supabase)

Dans **Supabase** → **Edge Functions** → **Secrets**, ajoute **2 secrets** (clés API Gemini gratuites sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) :

| Nom du secret            | Utilisation                          |
|--------------------------|--------------------------------------|
| `IDENTIFY_CAR_API_KEY`   | Reconnaissance de voiture (AutoSpotter) |
| `CAR_INFO_API_KEY`      | Moteurs + description (fiche voiture, ajout au garage) |

## Déploiement

1. Copier le contenu de `supabase/functions/identify-car/index.ts` dans l’éditeur Supabase (identify-car) → **Deploy**.
2. Copier le contenu de `supabase/functions/car-info/index.ts` dans l’éditeur Supabase (car-info) → **Deploy**.

Les deux fonctions n’exigent **pas** d’authentification (pas de 401). Elles utilisent uniquement les clés ci-dessus.
