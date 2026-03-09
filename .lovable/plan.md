

# Card Game — Add Independent HP Pool

## Change to Card Design

Each card gets an **HP** stat that is independent from the 4 core stats (speed, resilience, adaptability, power). HP is determined by rarity tier, not by individual stats.

### HP by Rarity Tier

| Rarity | HP |
|---|---|
| Common (Weak) | 10 |
| Uncommon (Average) | 15 |
| Rare (Strong) | 22 |
| Mythic (Legendary) | 32 |

### What Changes from the Previous Plan

1. **`game_cards` DB table** — add `hp integer NOT NULL` column
2. **`src/data/gameCards.ts`** — each card definition includes an `hp` field set by its rarity tier
3. **`src/components/game/GameCard.tsx`** — display HP as a prominent heart/shield icon + value on the card face, separate from the 4 stat bars
4. **Game mechanics** — resilience no longer defines HP. Resilience now purely governs damage reduction or defensive ability. HP is the actual hit pool that gets depleted in combat.

### Stat Clarification (updated)

- **Speed** — turn order
- **Resilience** — damage reduction / defensive modifier
- **Adaptability** — copy neighbor passives
- **Power** — attack strength
- **HP** — hit points, independent pool based on rarity

Everything else from the previous plan (200 cards, 4 archetypes, 5 rarity tiers, booster system, DB tables, UI) remains the same.

