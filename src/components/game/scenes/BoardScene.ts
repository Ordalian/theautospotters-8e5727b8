import Phaser from "phaser";
import type { TileType } from "@/lib/boardGenerator";
import { TILE_CONFIG } from "@/lib/boardGenerator";
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

/** Couleurs fallback par type de tuile (hex sans alpha). */
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
  private tileSprites: (Phaser.GameObjects.Image | Phaser.GameObjects.Polygon)[][] = [];
  private highlightOverlays: Map<string, Phaser.GameObjects.Polygon> = new Map();
  private selectionOverlay: Phaser.GameObjects.Polygon | null = null;
  private cardSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private flagSprites: { player1?: Phaser.GameObjects.Text; player2?: Phaser.GameObjects.Text } = {};
  private dims = getBoardDimensions();
  private tileTextureMap: Map<string, string[]> = new Map();

  constructor() {
    super({ key: "BoardScene" });
  }

  init(data: { initialState: BoardState }) {
    this.boardState = data.initialState;
  }

  preload() {
    // Preload all tile variant images
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
    // Set world bounds
    this.cameras.main.setBounds(
      -100,
      -100,
      this.dims.totalW + 200,
      this.dims.totalH + 200
    );

    // Enable camera drag & zoom
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.button === 0 && !pointer.wasDragged) {
        // handled by drag below
      }
    });
    this.cameras.main.setZoom(1);

    // Drag to pan
    let dragStartX = 0;
    let dragStartY = 0;
    let camStartX = 0;
    let camStartY = 0;
    let isDragging = false;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartX = pointer.x;
      dragStartY = pointer.y;
      camStartX = this.cameras.main.scrollX;
      camStartY = this.cameras.main.scrollY;
      isDragging = false;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dx = pointer.x - dragStartX;
      const dy = pointer.y - dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true;
      if (isDragging) {
        this.cameras.main.scrollX = camStartX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = camStartY - dy / this.cameras.main.zoom;
      }
    });

    // Scroll to zoom
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gx: number[], _gy: number[], _gz: number, deltaY: number) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.3, 3);
      this.cameras.main.setZoom(newZoom);
    });

    this.renderBoard();
    this.renderFlags();
    this.updateState(this.boardState);

    // Center camera
    this.cameras.main.scrollX = (this.dims.totalW - this.cameras.main.width) / 2;
    this.cameras.main.scrollY = (this.dims.totalH - this.cameras.main.height) / 2;
  }

  private getDiamondPoints(): Phaser.Geom.Point[] {
    return [
      new Phaser.Geom.Point(TILE_W / 2, 0),
      new Phaser.Geom.Point(TILE_W, TILE_H / 2),
      new Phaser.Geom.Point(TILE_W / 2, TILE_H),
      new Phaser.Geom.Point(0, TILE_H / 2),
    ];
  }

  private renderBoard() {
    const board = this.boardState.board;
    this.tileSprites = [];

    for (let gy = 0; gy < BOARD_SIZE; gy++) {
      this.tileSprites[gy] = [];
      for (let gx = 0; gx < BOARD_SIZE; gx++) {
        const tileType = board[gy][gx];
        const { x: sx, y: sy } = gridToScreen(gx, gy);
        const px = sx + this.dims.offsetX;
        const py = sy + this.dims.offsetY;
        const depth = gx + gy;

        const textureKeys = this.tileTextureMap.get(tileType) || [];
        const variantIdx = getTileVariant(gx, gy, textureKeys.length || 1);
        const textureKey = textureKeys[variantIdx];

        let tileObj: Phaser.GameObjects.Image | Phaser.GameObjects.Polygon;

        if (textureKey && this.textures.exists(textureKey)) {
          const img = this.add.image(px + TILE_W / 2, py + TILE_H / 2, textureKey);
          img.setDisplaySize(TILE_W, TILE_H);
          img.setDepth(depth);
          tileObj = img;
        } else {
          // Fallback: colored diamond
          const points = this.getDiamondPoints();
          const poly = this.add.polygon(
            px + TILE_W / 2,
            py + TILE_H / 2,
            points,
            TILE_COLORS[tileType],
            0.9
          );
          poly.setDepth(depth);
          tileObj = poly;
        }

        // Make interactive with diamond hit area
        const hitArea = new Phaser.Geom.Polygon(this.getDiamondPoints());
        tileObj.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
        
        tileObj.on("pointerup", (pointer: Phaser.Input.Pointer) => {
          // Ignore if it was a drag
          const dx = Math.abs(pointer.x - dragStartXCapture);
          const dy = Math.abs(pointer.y - dragStartYCapture);
          if (dx > 6 || dy > 6) return;
          this.events.emit("tileClicked", { x: gx, y: gy });
        });

        this.tileSprites[gy][gx] = tileObj;
      }
    }

    // Capture drag start for click vs drag detection
    let dragStartXCapture = 0;
    let dragStartYCapture = 0;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartXCapture = pointer.x;
      dragStartYCapture = pointer.y;
    });
  }

  private renderFlags() {
    const flags = this.boardState.flags;

    const p1 = gridToScreen(flags.player1.x, flags.player1.y);
    this.flagSprites.player1 = this.add.text(
      p1.x + this.dims.offsetX + TILE_W / 2,
      p1.y + this.dims.offsetY + TILE_H / 2,
      "🚩",
      { fontSize: "16px" }
    ).setOrigin(0.5).setDepth(500);

    const p2 = gridToScreen(flags.player2.x, flags.player2.y);
    this.flagSprites.player2 = this.add.text(
      p2.x + this.dims.offsetX + TILE_W / 2,
      p2.y + this.dims.offsetY + TILE_H / 2,
      "🏁",
      { fontSize: "16px" }
    ).setOrigin(0.5).setDepth(500);
  }

  updateState(state: BoardState) {
    this.boardState = state;
    this.updateHighlights();
    this.updateSelection();
    this.updateCards();
  }

  private updateHighlights() {
    // Remove old highlights
    for (const overlay of this.highlightOverlays.values()) {
      overlay.destroy();
    }
    this.highlightOverlays.clear();

    // Add new highlights for reachable positions
    for (const key of this.boardState.reachableSet) {
      const [gxStr, gyStr] = key.split(",");
      const gx = parseInt(gxStr);
      const gy = parseInt(gyStr);
      const { x: sx, y: sy } = gridToScreen(gx, gy);
      const px = sx + this.dims.offsetX;
      const py = sy + this.dims.offsetY;

      const points = this.getDiamondPoints();
      const overlay = this.add.polygon(
        px + TILE_W / 2,
        py + TILE_H / 2,
        points,
        0x4ade80,
        0.4
      );
      overlay.setDepth(gx + gy + 50);

      // Pulse animation
      this.tweens.add({
        targets: overlay,
        alpha: { from: 0.4, to: 0.15 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      this.highlightOverlays.set(key, overlay);
    }
  }

  private updateSelection() {
    if (this.selectionOverlay) {
      this.selectionOverlay.destroy();
      this.selectionOverlay = null;
    }

    const sel = this.boardState.selectedCard;
    if (!sel) return;

    const { x: sx, y: sy } = gridToScreen(sel.position.x, sel.position.y);
    const px = sx + this.dims.offsetX;
    const py = sy + this.dims.offsetY;
    const points = this.getDiamondPoints();
    this.selectionOverlay = this.add.polygon(
      px + TILE_W / 2,
      py + TILE_H / 2,
      points,
      0xfbbf24,
      0.5
    );
    this.selectionOverlay.setDepth(sel.position.x + sel.position.y + 90);
    this.selectionOverlay.setStrokeStyle(2, 0xfbbf24);
  }

  private updateCards() {
    const currentIds = new Set(this.boardState.placedCards.map(c => c.id));

    // Remove cards no longer on the board
    for (const [id, container] of this.cardSprites.entries()) {
      if (!currentIds.has(id)) {
        container.destroy();
        this.cardSprites.delete(id);
      }
    }

    for (const card of this.boardState.placedCards) {
      const { x: sx, y: sy } = gridToScreen(card.position.x, card.position.y);
      const targetX = sx + this.dims.offsetX + TILE_W / 2;
      const targetY = sy + this.dims.offsetY + TILE_H / 2;
      const depth = card.position.x + card.position.y + 100;

      let container = this.cardSprites.get(card.id);
      if (container) {
        // Animate movement
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 250,
          ease: "Power2",
        });
        container.setDepth(depth);
        // Update HP bar
        this.updateCardHP(container, card);
      } else {
        // Create new card sprite
        container = this.createCardContainer(card, targetX, targetY, depth);
        this.cardSprites.set(card.id, container);
      }
    }
  }

  private createCardContainer(
    card: PlacedCard,
    x: number,
    y: number,
    depth: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(depth);

    const color = OWNER_COLORS[card.owner];

    // Car body - small diamond
    const body = this.add.polygon(0, 0, [
      new Phaser.Geom.Point(0, -8),
      new Phaser.Geom.Point(12, 0),
      new Phaser.Geom.Point(0, 8),
      new Phaser.Geom.Point(-12, 0),
    ], color, 0.9);
    body.setStrokeStyle(1.5, 0xffffff, 0.8);

    // Label
    const label = this.add.text(0, -14, card.card.model.slice(0, 6), {
      fontSize: "8px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);

    // HP bar background
    const hpBg = this.add.rectangle(0, 12, 20, 3, 0x000000, 0.6);
    // HP bar fill
    const maxHP = card.card.hp ?? 10;
    const hpRatio = card.currentHP / maxHP;
    const hpFill = this.add.rectangle(-10 + (20 * hpRatio) / 2, 12, 20 * hpRatio, 3, hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xeab308 : 0xef4444);
    hpFill.setName("hpFill");
    hpBg.setName("hpBg");

    container.add([body, label, hpBg, hpFill]);

    // Make container interactive
    container.setSize(24, 24);
    container.setInteractive();
    container.on("pointerup", () => {
      this.events.emit("cardSelected", card);
    });

    return container;
  }

  private updateCardHP(container: Phaser.GameObjects.Container, card: PlacedCard) {
    const hpFill = container.getByName("hpFill") as Phaser.GameObjects.Rectangle;
    if (hpFill) {
      const maxHP = card.card.hp ?? 10;
      const hpRatio = card.currentHP / maxHP;
      hpFill.width = 20 * hpRatio;
      hpFill.x = -10 + (20 * hpRatio) / 2;
      hpFill.fillColor = hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xeab308 : 0xef4444;
    }
  }
}
