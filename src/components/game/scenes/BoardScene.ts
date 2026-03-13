import Phaser from "phaser";
import type { TileType } from "@/lib/boardGenerator";
import type { PlacedCard, Position } from "@/types/board";
import {
  TILE_W,
  TILE_H,
  TILE_DEPTH,
  gridToScreen,
  getTileVariant,
  getBoardDimensions,
  BOARD_SIZE,
} from "@/lib/isometricUtils";
import { getTileVariants } from "@/lib/tileAssets";

/* ── Into the Breach colour palette ─────────────────────────── */
const TOP_COLORS: Record<TileType, number> = {
  road:        0x5a6577,
  city:        0x7b8a9e,
  countryside: 0x4a8c3f,
  mountain:    0x8b7355,
  desert:      0xc9a84c,
  blocked:     0x2d2d3a,
};

const SIDE_L: Record<TileType, number> = {
  road:        0x3d4554,
  city:        0x566378,
  countryside: 0x2e6b27,
  mountain:    0x6b5640,
  desert:      0x9e8139,
  blocked:     0x1a1a24,
};

const SIDE_R: Record<TileType, number> = {
  road:        0x4a5265,
  city:        0x647588,
  countryside: 0x3c7a33,
  mountain:    0x7a644a,
  desert:      0xb49042,
  blocked:     0x222230,
};

const GRID_LINE = 0x1a1e2e;
const GRID_LINE_ALPHA = 0.6;

const OWNER_COLORS = {
  player1: 0x4a9eff,
  player2: 0xff5252,
};

/* ── State interface ────────────────────────────────────────── */
interface BoardState {
  board: TileType[][];
  placedCards: PlacedCard[];
  selectedCard: PlacedCard | null;
  reachableSet: Set<string>;
  flags: { player1: Position; player2: Position };
  currentTurn: "player1" | "player2";
}

/* ── Scene ──────────────────────────────────────────────────── */
export class BoardScene extends Phaser.Scene {
  private boardState!: BoardState;
  private highlightLayer!: Phaser.GameObjects.Container;
  private unitLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private dims = getBoardDimensions();
  private tileTextureMap = new Map<string, string[]>();
  private ready = false;
  private cardSprites = new Map<string, Phaser.GameObjects.Container>();
  private dragStartX = 0;
  private dragStartY = 0;

  constructor() {
    super({ key: "BoardScene" });
  }

  /* ── Public API (called from React wrapper) ─────────────── */
  setInitialState(state: BoardState) {
    this.boardState = state;
    if (this.ready) this.buildBoard();
  }

  updateState(state: BoardState) {
    if (!this.ready) return;
    this.boardState = state;
    this.refreshHighlights();
    this.refreshUnits();
  }

  /* ── Phaser lifecycle ───────────────────────────────────── */
  preload() {
    const types: TileType[] = ["road", "city", "countryside", "mountain", "desert", "blocked"];
    for (const t of types) {
      const urls = getTileVariants(t);
      const keys: string[] = [];
      urls.forEach((u, i) => {
        const k = `tile-${t}-${i}`;
        keys.push(k);
        this.load.image(k, u);
      });
      this.tileTextureMap.set(t, keys);
    }
  }

  create() {
    const pad = 200;
    this.cameras.main.setBounds(
      -pad, -pad,
      this.dims.totalW + pad * 2,
      this.dims.totalH + pad * 2
    );

    // Background
    this.cameras.main.setBackgroundColor("#0d1117");

    // Layers
    this.highlightLayer = this.add.container(0, 0).setDepth(1000);
    this.unitLayer = this.add.container(0, 0).setDepth(2000);
    this.uiLayer = this.add.container(0, 0).setDepth(3000);

    this.setupCamera();
    this.ready = true;

    if (this.boardState) this.buildBoard();

    // Center camera
    this.cameras.main.scrollX = (this.dims.totalW - this.cameras.main.width) / 2;
    this.cameras.main.scrollY = (this.dims.totalH - this.cameras.main.height) / 2;
  }

  /* ── Camera controls ────────────────────────────────────── */
  private setupCamera() {
    let camStartX = 0, camStartY = 0;
    let wasDrag = false;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      camStartX = this.cameras.main.scrollX;
      camStartY = this.cameras.main.scrollY;
      wasDrag = false;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDrag = true;
      if (wasDrag) {
        this.cameras.main.scrollX = camStartX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = camStartY - dy / this.cameras.main.zoom;
      }
    });

    this.input.on("wheel", (_: unknown, __: unknown, ___: unknown, ____: unknown, dy: number) => {
      const z = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.25, 2.5);
      this.cameras.main.setZoom(z);
    });
  }

  /* ── Board rendering (Into the Breach blocks) ───────────── */
  private buildBoard() {
    const board = this.boardState.board;

    // Draw back-to-front for proper depth (row by row)
    for (let gy = 0; gy < BOARD_SIZE; gy++) {
      for (let gx = 0; gx < BOARD_SIZE; gx++) {
        const tt = board[gy][gx];
        const { x: sx, y: sy } = gridToScreen(gx, gy);
        const px = sx + this.dims.offsetX;
        const py = sy + this.dims.offsetY;
        const depth = (gx + gy) * 10;

        this.drawIsometricBlock(px, py, tt, depth, gx, gy);
      }
    }

    // Flags
    this.drawFlag(this.boardState.flags.player1, "🚩");
    this.drawFlag(this.boardState.flags.player2, "🏁");

    this.refreshHighlights();
    this.refreshUnits();
  }

  private drawIsometricBlock(px: number, py: number, tt: TileType, depth: number, gx: number, gy: number) {
    const g = this.add.graphics().setDepth(depth);

    const topColor = TOP_COLORS[tt];
    const sideL = SIDE_L[tt];
    const sideR = SIDE_R[tt];

    // Top face (diamond)
    const topPts = [
      TILE_W / 2, 0,
      TILE_W,     TILE_H / 2,
      TILE_W / 2, TILE_H,
      0,          TILE_H / 2,
    ];

    // Check for texture
    const keys = this.tileTextureMap.get(tt) || [];
    const vi = getTileVariant(gx, gy, keys.length || 1);
    const texKey = keys[vi];
    const hasTexture = texKey && this.textures.exists(texKey);

    // Left side face
    g.fillStyle(sideL, 1);
    g.fillPoints([
      new Phaser.Geom.Point(px, py + TILE_H / 2),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H + TILE_DEPTH),
      new Phaser.Geom.Point(px, py + TILE_H / 2 + TILE_DEPTH),
    ], true);

    // Right side face
    g.fillStyle(sideR, 1);
    g.fillPoints([
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2 + TILE_DEPTH),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H + TILE_DEPTH),
    ], true);

    // Top face
    if (hasTexture) {
      // Draw color base first
      g.fillStyle(topColor, 1);
      g.fillPoints([
        new Phaser.Geom.Point(px + TILE_W / 2, py),
        new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
        new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
        new Phaser.Geom.Point(px, py + TILE_H / 2),
      ], true);

      // Overlay texture on top face with diamond mask
      const img = this.add.image(px + TILE_W / 2, py + TILE_H / 2, texKey!)
        .setDisplaySize(TILE_W, TILE_H)
        .setDepth(depth + 1)
        .setAlpha(0.6);

      // Diamond clip via geometry mask
      const maskGraphics = this.make.graphics({ x: 0, y: 0 });
      maskGraphics.fillStyle(0xffffff);
      maskGraphics.fillPoints([
        new Phaser.Geom.Point(px + TILE_W / 2, py),
        new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
        new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
        new Phaser.Geom.Point(px, py + TILE_H / 2),
      ], true);
      img.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics));
    } else {
      g.fillStyle(topColor, 1);
      g.fillPoints([
        new Phaser.Geom.Point(px + TILE_W / 2, py),
        new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
        new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
        new Phaser.Geom.Point(px, py + TILE_H / 2),
      ], true);
    }

    // Grid border on top face
    g.lineStyle(1, GRID_LINE, GRID_LINE_ALPHA);
    g.strokePoints([
      new Phaser.Geom.Point(px + TILE_W / 2, py),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
      new Phaser.Geom.Point(px, py + TILE_H / 2),
    ], true);

    // Bottom edge lines for depth
    g.lineStyle(1, 0x000000, 0.3);
    g.strokePoints([
      new Phaser.Geom.Point(px, py + TILE_H / 2 + TILE_DEPTH),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H + TILE_DEPTH),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2 + TILE_DEPTH),
    ], false);

    // Interactive hit area on top face
    const hitZone = this.add.zone(px + TILE_W / 2, py + TILE_H / 2, TILE_W, TILE_H)
      .setDepth(depth + 2);
    const hitPoly = new Phaser.Geom.Polygon([
      new Phaser.Geom.Point(TILE_W / 2, 0),
      new Phaser.Geom.Point(TILE_W, TILE_H / 2),
      new Phaser.Geom.Point(TILE_W / 2, TILE_H),
      new Phaser.Geom.Point(0, TILE_H / 2),
    ]);
    hitZone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
    hitZone.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.x - this.dragStartX) > 6 || Math.abs(ptr.y - this.dragStartY) > 6) return;
      this.events.emit("tileClicked", { x: gx, y: gy });
    });
  }

  private drawFlag(pos: Position, emoji: string) {
    const { x, y } = gridToScreen(pos.x, pos.y);
    const px = x + this.dims.offsetX + TILE_W / 2;
    const py = y + this.dims.offsetY + TILE_H / 2 - 4;
    this.add.text(px, py, emoji, { fontSize: "20px" })
      .setOrigin(0.5)
      .setDepth((pos.x + pos.y) * 10 + 500);
  }

  /* ── Highlights (reachable tiles) ───────────────────────── */
  private refreshHighlights() {
    this.highlightLayer.removeAll(true);

    // Selection highlight
    const sel = this.boardState.selectedCard;
    if (sel) {
      this.drawTileOverlay(sel.position.x, sel.position.y, 0xfbbf24, 0.45, true);
    }

    // Reachable highlights
    for (const key of this.boardState.reachableSet) {
      const [xs, ys] = key.split(",");
      const gx = +xs, gy = +ys;
      this.drawTileOverlay(gx, gy, 0x4ade80, 0.35, false);
    }
  }

  private drawTileOverlay(gx: number, gy: number, color: number, alpha: number, isSelection: boolean) {
    const { x: sx, y: sy } = gridToScreen(gx, gy);
    const px = sx + this.dims.offsetX;
    const py = sy + this.dims.offsetY;

    const g = this.add.graphics();

    // Fill
    g.fillStyle(color, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(px + TILE_W / 2, py),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
      new Phaser.Geom.Point(px, py + TILE_H / 2),
    ], true);

    // Border
    g.lineStyle(isSelection ? 2.5 : 1.5, color, isSelection ? 1 : 0.8);
    g.strokePoints([
      new Phaser.Geom.Point(px + TILE_W / 2, py),
      new Phaser.Geom.Point(px + TILE_W, py + TILE_H / 2),
      new Phaser.Geom.Point(px + TILE_W / 2, py + TILE_H),
      new Phaser.Geom.Point(px, py + TILE_H / 2),
    ], true);

    this.highlightLayer.add(g);

    // Pulse for reachable
    if (!isSelection) {
      this.tweens.add({
        targets: g,
        alpha: { from: 1, to: 0.4 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  /* ── Units ──────────────────────────────────────────────── */
  private refreshUnits() {
    const ids = new Set(this.boardState.placedCards.map(c => c.id));

    // Remove stale
    for (const [id, c] of this.cardSprites.entries()) {
      if (!ids.has(id)) {
        c.destroy();
        this.cardSprites.delete(id);
      }
    }

    for (const card of this.boardState.placedCards) {
      const { x: sx, y: sy } = gridToScreen(card.position.x, card.position.y);
      const tx = sx + this.dims.offsetX + TILE_W / 2;
      const ty = sy + this.dims.offsetY + TILE_H / 2 - 6; // Slight up offset to sit on tile

      let existing = this.cardSprites.get(card.id);
      if (existing) {
        // Animate move
        this.tweens.add({
          targets: existing,
          x: tx,
          y: ty,
          duration: 300,
          ease: "Back.easeOut",
        });
        this.updateUnitVisual(existing, card);
      } else {
        existing = this.createUnit(card, tx, ty);
        this.cardSprites.set(card.id, existing);
      }
      existing.setDepth((card.position.x + card.position.y) * 10 + 200);
    }
  }

  private createUnit(card: PlacedCard, x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    this.unitLayer.add(c);

    const color = OWNER_COLORS[card.owner];
    const isP1 = card.owner === "player1";

    // Unit body — raised isometric "mech" block
    const bodyG = this.add.graphics();

    // Shadow on ground
    bodyG.fillStyle(0x000000, 0.25);
    bodyG.fillEllipse(0, 6, 22, 8);

    // Main body block (small isometric cube)
    const bw = 18, bh = 10, bd = 12;
    // Top
    bodyG.fillStyle(color, 1);
    bodyG.fillPoints([
      new Phaser.Geom.Point(0, -bd - bh / 2),
      new Phaser.Geom.Point(bw / 2, -bd),
      new Phaser.Geom.Point(0, -bd + bh / 2),
      new Phaser.Geom.Point(-bw / 2, -bd),
    ], true);
    // Left side
    bodyG.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color, 1);
    bodyG.fillPoints([
      new Phaser.Geom.Point(-bw / 2, -bd),
      new Phaser.Geom.Point(0, -bd + bh / 2),
      new Phaser.Geom.Point(0, bh / 2),
      new Phaser.Geom.Point(-bw / 2, 0),
    ], true);
    // Right side
    bodyG.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(15).color, 1);
    bodyG.fillPoints([
      new Phaser.Geom.Point(bw / 2, -bd),
      new Phaser.Geom.Point(0, -bd + bh / 2),
      new Phaser.Geom.Point(0, bh / 2),
      new Phaser.Geom.Point(bw / 2, 0),
    ], true);

    // Outline
    bodyG.lineStyle(1, 0xffffff, 0.4);
    bodyG.strokePoints([
      new Phaser.Geom.Point(0, -bd - bh / 2),
      new Phaser.Geom.Point(bw / 2, -bd),
      new Phaser.Geom.Point(bw / 2, 0),
      new Phaser.Geom.Point(0, bh / 2),
      new Phaser.Geom.Point(-bw / 2, 0),
      new Phaser.Geom.Point(-bw / 2, -bd),
    ], true);

    // Player indicator dot
    bodyG.fillStyle(isP1 ? 0x60a5fa : 0xf87171, 1);
    bodyG.fillCircle(0, -bd - bh / 2 - 3, 2.5);

    c.add(bodyG);

    // Name label
    const label = this.add.text(0, -bd - bh / 2 - 12, card.card.model.slice(0, 8), {
      fontSize: "9px",
      fontFamily: "monospace",
      color: "#e2e8f0",
      fontStyle: "bold",
      stroke: "#0d1117",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5);
    c.add(label);

    // HP bar
    this.addHPBar(c, card);

    // Interactive
    c.setSize(30, 30).setInteractive();
    c.on("pointerup", () => this.events.emit("cardSelected", card));

    return c;
  }

  private addHPBar(container: Phaser.GameObjects.Container, card: PlacedCard) {
    const maxHP = card.card.hp ?? 10;
    const ratio = Math.max(0, card.currentHP / maxHP);
    const barW = 22, barH = 3;
    const barY = 10;

    const bg = this.add.rectangle(0, barY, barW, barH, 0x000000, 0.7)
      .setName("hpBg");
    const fill = this.add.rectangle(
      -barW / 2 + (barW * ratio) / 2,
      barY,
      barW * ratio,
      barH,
      this.hpColor(ratio)
    ).setName("hpFill");

    container.add([bg, fill]);
  }

  private updateUnitVisual(container: Phaser.GameObjects.Container, card: PlacedCard) {
    const f = container.getByName("hpFill") as Phaser.GameObjects.Rectangle;
    if (!f) return;
    const maxHP = card.card.hp ?? 10;
    const ratio = Math.max(0, card.currentHP / maxHP);
    const barW = 22;
    f.width = barW * ratio;
    f.x = -barW / 2 + (barW * ratio) / 2;
    f.fillColor = this.hpColor(ratio);
  }

  private hpColor(r: number): number {
    return r > 0.6 ? 0x22c55e : r > 0.3 ? 0xeab308 : 0xef4444;
  }
}
