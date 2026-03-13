

# Plan: Phaser 3 Board with Fresh AI-Generated Tile Assets

## Summary
Replace the current 12 placeholder tile PNGs with **new AI-generated isometric pixel-art tiles** (4-5 variants each, ~28 images total), and integrate **Phaser 3** as the board renderer. The existing `src/assets/tiles/` images will be deleted.

## 1. Delete existing tile assets
Remove all 12 current PNGs from `src/assets/tiles/`.

## 2. Generate new isometric tile art via AI image generation
Use the Nano banana pro model (`google/gemini-3-pro-image-preview`) to generate 28 tile images in a consistent pixel-art isometric style (diamond shape, 128×64px logical, transparent background):

| Type | Variants | Visual ideas |
|------|----------|-------------|
| **road** | 5 | Straight asphalt, curve, intersection, crosswalk, cracked highway |
| **city** | 5 | Office building, parking lot, gas station, shops, urban park |
| **countryside** | 5 | Green grass, wheat field, wooden fence, trees, pond |
| **mountain** | 4 | Rocky terrain, snowy peak, tunnel entrance, scree slope |
| **desert** | 5 | Sand dunes, cactus patch, cracked earth, oasis, dusty trail |
| **blocked** | 4 | Barricade, river, construction zone, collapsed wall |

Each image saved to `src/assets/tiles/{type}-{n}.png`. The existing `tileAssets.ts` glob loader picks them up automatically.

## 3. Install Phaser & create renderer

### New files
- **`src/components/game/PhaserBoard.tsx`** — React wrapper: mounts a `Phaser.Game` in a div ref, syncs React state via scene events, destroys on unmount.
- **`src/components/game/scenes/BoardScene.ts`** — Phaser scene: loads tile textures, renders 20×20 isometric grid with depth sorting, draws car sprites (colored diamond + HP bar), highlights reachable tiles with pulsing tweens, handles click input with diamond hit areas, provides drag-to-pan and scroll-to-zoom camera.

### Edited files
- **`package.json`** — add `phaser` dependency
- **`src/components/game/BoardGame.tsx`** — swap `<Board>` for `<PhaserBoard>` with same props interface
- **`src/lib/tileAssets.ts`** — no change needed (glob already works)

### Kept as fallback
- `src/components/game/Board.tsx` — not deleted, just unused

## 4. State sync pattern
- React → Phaser: `scene.events.emit('stateUpdate', { placedCards, selectedCard, reachableSet })` on every React state change
- Phaser → React: `scene.events.on('tileClicked', pos)` and `scene.events.on('cardSelected', card)` forwarded to React callbacks
- Card movement animated with Phaser tweens (smooth slide between tiles)

