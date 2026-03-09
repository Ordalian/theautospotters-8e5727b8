

# Fix Card Game: Seeding, Full Catalog, Friend Collections

## Problems Identified

1. **`game_cards` table is empty** (0 rows) — client-side seeding fails because `game_cards` has no INSERT RLS policy (by design). Must seed via SQL migration.
2. **Collection only shows owned cards** — should show all 200 cards, greyed out when not owned, colored when owned, with a count badge for duplicates.
3. **No way to view friends' collections.**

## Changes

### 1. Database Migration — Seed 200 cards

Insert all 200 cards from `gameCards.ts` into `game_cards` via a SQL migration. This runs with admin privileges, bypassing RLS.

Also add an RLS policy on `user_game_cards` for friends to view each other's cards:
```sql
CREATE POLICY "Friends can view friend game cards"
ON user_game_cards FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
    AND ((f.requester_id = auth.uid() AND f.addressee_id = user_game_cards.user_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = user_game_cards.user_id))
  )
);
```

### 2. `CardGame.tsx` — Major rework

- **Remove `ensureMasterCards()` seeding logic** — just fetch from DB.
- **Collection tab**: Show all 200 master cards. For each card, check if the user owns it (and how many copies). Unowned cards render greyed out (`GameCard` gets a `greyed` prop). Owned cards show full colors + a count badge if >1.
- **Add a third tab "Friends"**: List friends, tap a friend to see their collection (same catalog view but with their owned cards highlighted).
- **Tabs**: Collection | Booster | Friends

### 3. `GameCard.tsx` — Add `greyed` prop

When `greyed={true}`, apply a grayscale filter + reduced opacity over the card. The card still shows name/stats but looks locked/unavailable.

### 4. Translation keys

Add keys for friend collection viewing (`game_friends`, `game_friend_collection`, etc.)

### Files Modified
- **New migration SQL** — seed 200 cards + friend RLS policy
- `src/pages/CardGame.tsx` — full catalog view, friend tab, remove seeding
- `src/components/game/GameCard.tsx` — add `greyed` prop
- `src/i18n/translations/fr.ts` + `en.ts` — new keys

