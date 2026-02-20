

# Utiliser Wikipedia comme source d'information pour les fiches voitures

## Objectif
Remplacer la generation purement IA des descriptions, moteurs, editions et finitions par une approche hybride : recuperer le contenu Wikipedia du modele, puis utiliser l'IA pour en extraire les informations structurees.

## Avantages
- Informations factuelles et sourcees
- Moins d'hallucinations de l'IA
- Donnees plus completes (motorisations, finitions, series speciales)

## Limites a anticiper
- Tous les modeles n'ont pas de page Wikipedia
- Les articles sont en texte libre, pas structures de maniere uniforme
- Fallback sur l'IA pure si aucun article n'est trouve

---

## Plan d'implementation

### Etape 1 : Ajouter la recherche Wikipedia dans l'edge function

Modifier `supabase/functions/car-api/index.ts` pour ajouter une fonction qui :
1. Recherche l'article Wikipedia correspondant via l'API Wikipedia (pas besoin de cle API)
2. Recupere le contenu en texte brut de l'article
3. L'API Wikipedia est gratuite et sans authentification

Endpoints utilises :
- Recherche : `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=...&format=json`
- Contenu : `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=...&format=json`

La recherche se ferait d'abord en francais (`fr.wikipedia.org`), avec fallback sur l'anglais (`en.wikipedia.org`).

### Etape 2 : Modifier l'action `car-info`

Actuellement, l'action `car-info` demande a l'IA d'inventer description + moteurs. Le nouveau flux serait :

1. Chercher sur Wikipedia : `{year} {brand} {model}` (ex: "Peugeot 208")
2. Si un article est trouve, recuperer son contenu texte (limite aux premiers ~4000 caracteres pour rester dans les limites du prompt)
3. Envoyer ce contenu a l'IA avec un prompt du type : "Voici l'article Wikipedia de ce modele. Extrais-en la description et la liste des moteurs au format JSON."
4. Si aucun article n'est trouve, fallback sur le comportement actuel (IA pure)

### Etape 3 : Modifier l'action `editions`

Meme approche :
1. Recuperer l'article Wikipedia
2. Demander a l'IA d'extraire les editions/series speciales/finitions depuis le contenu Wikipedia
3. Fallback sur l'IA pure si pas d'article

### Etape 4 : Modifier l'action `engines`

1. Recuperer l'article Wikipedia
2. Demander a l'IA d'extraire les motorisations (nom, cylindree, carburant, puissance) depuis le contenu
3. Fallback sur l'IA pure si pas d'article

---

## Details techniques

### Fonction de recherche Wikipedia (a ajouter dans l'edge function)

```text
async function fetchWikipediaContent(brand, model, year):
  1. Construire la requete de recherche : "{brand} {model}" 
  2. Appeler l'API search Wikipedia FR
  3. Si resultats, prendre le premier titre pertinent
  4. Appeler l'API extracts pour recuperer le texte brut
  5. Si echec FR, retenter avec EN Wikipedia
  6. Retourner le texte ou null
```

### Modification du prompt IA

Au lieu de :
> "Tu es un expert automobile. Decris la {year} {brand} {model}..."

On enverrait :
> "Voici le contenu de l'article Wikipedia pour la {brand} {model}. A partir de ce texte, extrais : 1) une description courte en francais, 2) la liste des moteurs disponibles. Reponds en JSON."

### Caching

Les articles Wikipedia ne changent pas souvent. Le cache existant cote client (`staleTime: 30min`) reste suffisant. Pas besoin de cache serveur supplementaire pour une v1.

### Aucune cle API requise

L'API Wikipedia est entierement gratuite et publique. Aucun secret a configurer.

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/car-api/index.ts` | Ajout fonction `fetchWikipediaContent()`, modification des actions `car-info`, `editions`, `engines` pour utiliser Wikipedia comme source |

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Pas d'article Wikipedia pour un modele rare | Fallback automatique sur l'IA pure |
| Article trop long depassant la limite du prompt | Tronquer a ~4000 caracteres, privilegier les sections "Motorisations" et "Caracteristiques" |
| Rate limiting Wikipedia | Ajouter un User-Agent correct (requis par Wikipedia) et un delai entre requetes |

