/**
 * Utilitaires pour le rendu isométrique du plateau (Into the Breach style).
 */

export const TILE_W = 80;
export const TILE_H = 40;
export const TILE_DEPTH = 16; // Height of the block sides
export const BOARD_SIZE = 8;

/** Convertit une position grille (gx, gy) en coordonnées écran (px). */
export function gridToScreen(gx: number, gy: number) {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Convertit des coordonnées écran en position grille (approx). */
export function screenToGrid(sx: number, sy: number) {
  const gx = Math.floor((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
  const gy = Math.floor((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
  return { x: gx, y: gy };
}

/** Choisit un index de variante déterministe pour une position. */
export function getTileVariant(x: number, y: number, variantCount: number): number {
  if (variantCount <= 0) return 0;
  return Math.abs(((x * 31 + y * 37 + 13) * 7) % variantCount);
}

/** Calcule les dimensions totales du plateau isométrique et les offsets. */
export function getBoardDimensions() {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let gy = 0; gy < BOARD_SIZE; gy++) {
    for (let gx = 0; gx < BOARD_SIZE; gx++) {
      const { x, y } = gridToScreen(gx, gy);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + TILE_W);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + TILE_H + TILE_DEPTH);
    }
  }
  return {
    offsetX: -minX,
    offsetY: -minY,
    totalW: maxX - minX,
    totalH: maxY - minY + TILE_DEPTH,
  };
}
