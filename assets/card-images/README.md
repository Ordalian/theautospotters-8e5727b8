# Images des cartes (pixel-art garage)

Place ici les images PNG des voitures. Le **nom du fichier** (sans chemin) doit correspondre à la clé générée par `getCardImageKey(brand, model)` + `.png`.

## 5 véhicules mythiques (images fournies)

| Fichier à utiliser | Marque + Modèle dans le jeu |
|--------------------|-----------------------------|
| `lamborghini-huracan-evo.png` | Lamborghini Huracán EVO |
| `mclaren-720s.png` | McLaren 720S |
| `ferrari-f8-tributo.png` | Ferrari F8 Tributo |
| `bugatti-chiron.png` | Bugatti Chiron |
| `porsche-911-gt3-rs.png` | Porsche 911 GT3 RS |

**Note :** Pour la Lamborghini, le fichier doit s’appeler `lamborghini-huracan-evo.png` (avec un "a" dans "huracan"), pour correspondre au nom du jeu "Huracán EVO".

## Upload vers Supabase

**Toutes les images du dossier :**
```bash
node scripts/uploadCardImages.mjs
```

**Une seule image** (ex. Bugatti Chiron) :
1. Copie ton fichier dans ce dossier en le renommant exactement `bugatti-chiron.png`.
2. À la racine du projet :
```bash
node scripts/uploadCardImages.mjs assets/card-images/bugatti-chiron.png
```

Variables d’environnement : `VITE_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY` si le bucket autorise l’upload).
