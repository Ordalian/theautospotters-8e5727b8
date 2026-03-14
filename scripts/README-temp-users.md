# Temporary access (temp users)

## Setup

1. Run the migration that adds `temp_access`, `profiles.is_temp` / `temp_expires_at` and `get_temp_login`:
   ```bash
   supabase db push
   ```
   or apply `supabase/migrations/20260324100000_temp_access.sql`.

2. Create the 50 temp accounts (from project root):
   ```bash
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/create-temp-users.mjs
   ```
   Optional: `FOUNDER_USER_ID=uuid` if you want to use a specific founder; otherwise the script uses the first profile with `role = 'founder'`.

3. The script writes **temp-users-list.csv** (username, password) and prints the list. Share the codes with the 50 users and keep the CSV secure.

## Behaviour

- **Login**: On the auth page, "Temporary access" → user enters only their access code (password). No email.
- **Restrictions**: Temp users cannot change username or password (username locked in profile).
- **Premium**: They can upgrade via the store like any user.
- **Map markers**: tempuser1..tempuser25 are map markers; tempuser26..50 are not.
- **Friends**: Founder is friends with all 50; all 50 are friends with each other.

## After 72 hours

Run the invalidation script so temp users can no longer sign in:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/invalidate-temp-users.mjs
```

This sets `temp_expires_at` and `temp_access.expires_at` to now. The app will sign out any temp user on next load and the "Temporary access" form will reject their code.
