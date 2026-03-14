

## Current State

The founder role does **not** automatically get premium benefits. All premium checks (AutoSpotter limits, booster cooldowns) only look at `is_premium` and `premium_until` columns — they ignore the `role` column entirely.

## Proposed Fix

Update the three database functions that check premium status to also treat `founder` (and optionally `admin`) as premium:

1. **`use_autospotter()`** — Add: `IF role = 'founder' OR (p_premium AND ...)` → unlimited usage
2. **`get_autospotter_status()`** — Same logic so the UI shows "Premium" for founders
3. **`claim_daily_boosters()`** — Founders get the 4h cooldown / 5 max stored

This is a single SQL migration updating these 3 functions. No frontend changes needed since the UI already reads the `is_premium` flag from these RPCs.

Alternatively, we could just set `is_premium = true` and `premium_until = NULL` (permanent) on the founder's profile row. This is simpler but less automatic if the founder account changes.

**Recommended approach**: Update the 3 RPCs to treat `role = 'founder'` as always-premium. This way it's automatic and doesn't depend on manually toggling a flag.

