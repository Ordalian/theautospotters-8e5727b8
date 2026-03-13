import Phaser from "phaser";
import type { TileType } from "@/lib/boardGenerator";
import type { PlacedCard, Position } from "@/types/board";
import {
  TILE_W,
  TILE_H,
  gridToScreen,
  getTileVariant,
  getBoardDimensions,
  BOARD_SIZE,
} from "@/lib/isometricUtils";
import { getTileVariants } from "@/lib/tileAssets";

const TILE_COLORS: Record<TileType, number> = {
  road: 0x4b5563,
  city: 0x64748b,
  countryside: 0x15803d,
  mountain: 0x57534e,
  desert: 0xa16207,
  blocked: 0x1c1917,
};

const OWNER_COLORS = {
  player1: 0x3b82f6,
  player2: 0xef4444,
};

interface BoardState {
  board: TileType[][];
  placedCards: PlacedCard[];
  selectedCard: PlacedCard | null;
  reachableSet: Set<string>;
  flags: { player1: Position; player2: Position };
  currentTurn: "player1" | "player2";
}

export class BoardScene extends Phaser.Scene {
  private boardState!: BoardState;
  private highlightOverlays: Map<string, Phaser.GameObjects.Polygon> = new Map();
  private selectionOverlay: Phaser.GameObjects.Polygon | null = null;
  private cardSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private dims = getBoardDimensions();
  private tileTextureMap: Map<string, string[]> = new Map();
  private ready = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private wasDrag = false;

  constructor() {
    super({ key: "BoardScene" });
  }

  /** Called from React wrapper once scene is active. */
  setInitialState(state: BoardState) {
    this.boardState = state;
    if (this.ready) {
      this.renderBoard();
      this.renderFlags();
      this.updateState(state);
    }
  }

  preload() {
    const tileTypes: TileType[] = ["road", "city", "countryside", "mountain", "desert", "blocked"];
    for (const type of tileTypes) {
      const variants = getTileVariants(type);
      const keys: string[] = [];
      variants.forEach((url, i) => {
        const key = `tile-${type}-${i}`;
        keys.push(key);
        this.load.image(key, url);
      });
      this.tileTextureMap.set(type, keys);
    }
  }

  create() {
    this.cameras.main.setBounds(-100, -100, this.dims.totalW + 200, this.dims.totalH + 200);

    // Drag-to-pan
    let camStartX = 0;
    let camStartY = 0;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      camStartX = this.cameras.main.scrollX;
      camStartY = this.cameras.main.scrollY;
      this.wasDrag = false;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.wasDrag = true;
      if (this.wasDrag) {
        this.cameras.main.scrollX = camStartX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = camStartY - dy / this.cameras.main.zoom;
      }
    });

    this.input.on("wheel", (_p: unknown, _gx: unknown, _gy: unknown, _gz: unknown, deltaY: number) => {
      const z = Phaser.Math.Clamp(this.cameras.main.zoom - deltaY * 0.001, 0.3, 3);
      this.cameras.main.setZoom(z);
    });

    this.ready = true;

    if (this.boardState) {
      this.renderBoard();
      this.renderFlags();
      this.updateState(this.boardState);
    }

    // Center camera
    this.cameras.main.scrollX = (this.dims.totalW - this.cameras.main.width) / 2;
    this.cameras.main.scrollY = (this.dims.totalH - this.cameras.main.height) / 2;
  }

  private diamondPts(): Phaser.Geom.Point[] {
    return [
      new Phaser.Geom.Point(TILE_W / 2, 0),
      new Phaser.Geom.Point(TILE_W, TILE_H / 2),
      new Phaser.Geom.Point(TILE_W / 2, TILE_H),
      new Phaser.Geom.Point(0, TILE_H / 2),
    ];
  }

  private renderBoard() {
    const board = this.boardState.board;
    for (let gy = 0; gy < BOARD_SIZE; gy++) {
      for (let gx = 0; gx < BOARD_SIZE; gx++) {
        const tileType = board[gy][gx];
        const { x: sx, y: sy } = gridToScreen(gx, gy);
        const px = sx + this.dims.offsetX;
        const py = sy + this.dims.offsetY;
        const depth = gx + gy;

        const keys = this.tileTextureMap.get(tileType) || [];
        const vi = getTileVariant(gx, gy, keys.length || 1);
        const texKey = keys[vi];

        let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Polygon;
        if (texKey && this.textures.exists(texKey)) {
          obj = this.add.image(px + TILE_W / 2, py + TILE_H / 2, texKey)
            .setDisplaySize(TILE_W, TILE_H)
            .setDepth(depth);
        } else {
          obj = this.add.polygon(px + TILE_W / 2, py + TILE_H / 2, this.diamondPts(), TILE_COLORS[tileType], 0.9)
            .setDepth(depth);
        }

        const hitArea = new Phaser.Geom.Polygon(this.diamondPts());
        obj.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
        obj.on("pointerup", (ptr: Phaser.Input.Pointer) => {
          if (Math.abs(ptr.x - this.dragStartX) > 6 || Math.abs(ptr.y - this.dragStartY) > 6) return;
          this.events.emit("tileClicked", { x: gx, y: gy });
        });
      }
    }
  }

  private renderFlags() {
    const f = this.boardState.flags;
    for (const [key, pos, emoji] of [["p1", f.player1, "🚩"], ["p2", f.player2, "🏁"]] as const) {
      const { x, y } = gridToScreen(pos.x, pos.y);
      this.add.text(x + this.dims.offsetX + TILE_W / 2, y + this.dims.offsetY + TILE_H / 2, emoji, { fontSize: "16px" })
        .setOrigin(0.5).setDepth(500);
    }
  }

  updateState(state: BoardState) {
    if (!this.ready) return;
    this.boardState = state;
    this.syncHighlights();
    this.syncSelection();
    this.syncCards();
  }

  private syncHighlights() {
    for (const o of this.highlightOverlays.values()) o.destroy();
    this.highlightOverlays.clear();

    for (const key of this.boardState.reachableSet) {
      const [xs, ys] = key.split(",");
      const gx = +xs, gy = +ys;
      const { x: sx, y: sy } = gridToScreen(gx, gy);
      const o = this.add.polygon(sx + this.dims.offsetX + TILE_W / 2, sy + this.dims.offsetY + TILE_H / 2, this.diamondPts(), 0x4ade80, 0.4)
        .setDepth(gx + gy + 50);
      this.tweens.add({ targets: o, alpha: { from: 0.4, to: 0.15 }, duration: 600, yoyo: true, repeat: -1 });
      this.highlightOverlays.set(key, o);
    }
  }

  private syncSelection() {
    this.selectionOverlay?.destroy();
    this.selectionOverlay = null;
    const sel = this.boardState.selectedCard;
    if (!sel) return;
    const { x: sx, y: sy } = gridToScreen(sel.position.x, sel.position.y);
    this.selectionOverlay = this.add.polygon(
      sx + this.dims.offsetX + TILE_W / 2,
      sy + this.dims.offsetY + TILE_H / 2,
      this.diamondPts(), 0xfbbf24, 0.5
    ).setDepth(sel.position.x + sel.position.y + 90).setStrokeStyle(2, 0xfbbf24);
  }

  private syncCards() {
    const ids = new Set(this.boardState.placedCards.map(c => c.id));
    for (const [id, cont] of this.cardSprites.entries()) {
      if (!ids.has(id)) { cont.destroy(); this.cardSprites.delete(id); }
    }

    for (const card of this.boardState.placedCards) {
      const { x: sx, y: sy } = gridToScreen(card.position.x, card.position.y);
      const tx = sx + this.dims.offsetX + TILE_W / 2;
      const ty = sy + this.dims.offsetY + TILE_H / 2;
      const depth = card.position.x + card.position.y + 100;

      let c = this.cardSprites.get(card.id);
      if (c) {
        this.tweens.add({ targets: c, x: tx, y: ty, duration: 250, ease: "Power2" });
        c.setDepth(depth);
        this.updateHP(c, card);
      } else {
        c = this.makeCard(card, tx, ty, depth);
        this.cardSprites.set(card.id, c);
      }
    }
  }

  private makeCard(card: PlacedCard, x: number, y: number, depth: number) {
    const c = this.add.container(x, y).setDepth(depth);
    const col = OWNER_COLORS[card.owner];

    const body = this.add.polygon(0, 0, [
      new Phaser.Geom.Point(0, -8),
      new Phaser.Geom.Point(12, 0),
      new Phaser.Geom.Point(0, 8),
      new Phaser.Geom.Point(-12, 0),
    ], col, 0.9).setStrokeStyle(1.5, 0xffffff, 0.8);

    const label = this.add.text(0, -14, card.card.model.slice(0, 6), {
      fontSize: "8px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5);

    const maxHP = card.card.hp ?? 10;
    const ratio = card.currentHP / maxHP;
    const hpBg = this.add.rectangle(0, 12, 20, 3, 0x000000, 0.6).setName("hpBg");
    const hpFill = this.add.rectangle(-10 + (20 * ratio) / 2, 12, 20 * ratio, 3, this.hpColor(ratio)).setName("hpFill");

    c.add([body, label, hpBg, hpFill]);
    c.setSize(24, 24).setInteractive();
    c.on("pointerup", () => this.events.emit("cardSelected", card));
    return c;
  }

  private updateHP(container: Phaser.GameObjects.Container, card: PlacedCard) {
    const f = container.getByName("hpFill") as Phaser.GameObjects.Rectangle;
    if (!f) return;
    const maxHP = card.card.hp ?? 10;
    const r = card.currentHP / maxHP;
    f.width = 20 * r;
    f.x = -10 + (20 * r) / 2;
    f.fillColor = this.hpColor(r);
  }

  private hpColor(ratio: number): number {
    return ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
  }
}
