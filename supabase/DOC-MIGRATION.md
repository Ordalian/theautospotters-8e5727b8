# Migrations à appliquer

Ce document liste les migrations SQL à exécuter sur la base Supabase pour que l’application fonctionne correctement.

---

## Migration : `vehicle_type` sur la table `cars`

**Fichier :** `supabase/migrations/20260224120000_add_vehicle_type.sql`

### Objectif

Ajouter le type de véhicule (voiture, camion, moto, bateau, avion, train, Hot Wheels) pour filtrer le garage et classifier les spots.

### Modifications

| Action | Détail |
|--------|--------|
| **Colonne** | `public.cars.vehicle_type` (TEXT NOT NULL DEFAULT `'car'`) |
| **Contrainte** | `cars_vehicle_type_check` : valeurs autorisées `car`, `truck`, `motorcycle`, `boat`, `plane`, `train`, `hot_wheels` |
| **Index** | `idx_cars_vehicle_type` sur `(user_id, vehicle_type)` |

### Comportement

- Les **lignes existantes** reçoivent automatiquement `vehicle_type = 'car'`.
- Les **nouvelles lignes** peuvent avoir n’importe quelle valeur autorisée (défaut : `car`).

### Comment migrer

**Option 1 – CLI Supabase (recommandé)**

```bash
# À la racine du projet
npx supabase db push
```

ou, si tu utilises les migrations locales :

```bash
npx supabase migration up
```

**Option 2 – Supabase Dashboard**

1. Ouvrir le projet sur [app.supabase.com](https://app.supabase.com).
2. Aller dans **SQL Editor**.
3. Copier-coller le contenu de `supabase/migrations/20260224120000_add_vehicle_type.sql`.
4. Exécuter la requête.

**Option 3 – Une seule fois, script brut**

```sql
-- Add vehicle_type to cars: car | truck | motorcycle | boat | plane | train | hot_wheels
-- Existing rows default to 'car'.
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car';

ALTER TABLE public.cars
  ADD CONSTRAINT cars_vehicle_type_check
  CHECK (vehicle_type IN ('car', 'truck', 'motorcycle', 'boat', 'plane', 'train', 'hot_wheels'));

CREATE INDEX IF NOT EXISTS idx_cars_vehicle_type ON public.cars(user_id, vehicle_type);

COMMENT ON COLUMN public.cars.vehicle_type IS 'Type of spotted vehicle: car, truck, motorcycle, boat, plane, train, hot_wheels';
```

### À noter

- Si la colonne `vehicle_type` existe déjà, `ADD COLUMN IF NOT EXISTS` ne fait rien.
- Si la contrainte `cars_vehicle_type_check` existe déjà, la deuxième exécution du script échouera sur `ADD CONSTRAINT` ; dans ce cas, ignorer cette migration ou supprimer d’abord la contrainte si tu dois la recréer.

---

## Vérification après migration

En SQL (Supabase SQL Editor ou `psql`) :

```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'vehicle_type';

-- Vérifier que les lignes existantes ont 'car'
SELECT vehicle_type, COUNT(*) FROM public.cars GROUP BY vehicle_type;
```

Après migration, l’app peut utiliser le menu « Mon garage » par type et enregistrer le `vehicle_type` pour chaque nouveau spot.
