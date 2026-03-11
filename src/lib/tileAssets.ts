/**
 * Chargement dynamique des assets de tuiles isométriques.
 * Utilise import.meta.glob pour charger toutes les images du dossier tiles/.
 * Les fichiers doivent suivre le format : [type]-[variant].png
 */

const modules = import.meta.glob<string>('/src/assets/tiles/*.png', {
  eager: true,
  import: 'default',
});

const tileMap: Record<string, string[]> = {};

for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/\/([a-z]+)-(\d+)\.png$/);
  if (match) {
    const type = match[1];
    if (!tileMap[type]) tileMap[type] = [];
    tileMap[type].push(url);
  }
}

/** Retourne les URLs des variantes pour un type de tuile donné. */
export function getTileVariants(type: string): string[] {
  return tileMap[type] || [];
}
