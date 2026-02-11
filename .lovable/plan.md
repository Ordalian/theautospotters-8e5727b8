

# Plan: White Theme, Shared Map, and Friends System

## 1. White Background Theme

Change the dark theme to a white/light background while keeping the Italian flag diagonal stripes.

**Changes:**
- Update `src/index.css` CSS variables to a light color scheme (white background, dark text, adjusted card/border/muted colors)
- Keep `ItalianFlagBg` component as-is (the stripes will look great on white)
- Update the Leaflet map tiles from CARTO dark to CARTO light (`light_all` instead of `dark_all`) in both `DashboardMap.tsx` and `SpotMap.tsx`

---

## 2. Shared Map with 1-Week Auto-Cleanup

Currently the map already shows all users' spots. The new behavior: spots older than 7 days are automatically removed from the map view.

**Database changes:**
- Add a new RLS policy on `cars` table: allow all authenticated users to SELECT `id, brand, model, year, latitude, longitude, location_name, image_url, user_id, created_at` (needed for the shared map and friends' garages). Currently only owners can view their own cars -- we need a broader read policy for the social features.
- Create a `pg_cron` job to DELETE cars older than 7 days from the map by setting their `latitude`/`longitude` to NULL (preserving the car in the garage but removing it from the map). Alternatively, filter client-side to only show spots from the last 7 days.

**Recommended approach:** Filter on the client side (`created_at > now() - 7 days`) rather than deleting data. This keeps the garage intact and only hides old spots from the map.

**Code changes:**
- Update `SpotMap.tsx` and `DashboardMap.tsx` queries to filter with `.gte("created_at", sevenDaysAgo)`

**RLS update needed:** Add a SELECT policy so all authenticated users can read all cars (for the shared map and friends' garages).

---

## 3. Friends System

### 3.1 Database Schema (Migration)

New table: `friendships`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| requester_id | uuid | NOT NULL, the user who sent the request |
| addressee_id | uuid | NOT NULL, the user who receives the request |
| status | text | 'pending' or 'accepted' |
| created_at | timestamptz | default now() |
| UNIQUE(requester_id, addressee_id) | | prevents duplicates |

**RLS policies on `friendships`:**
- SELECT: authenticated users can see rows where they are requester or addressee
- INSERT: authenticated users can insert where `requester_id = auth.uid()`
- UPDATE: addressee can update status (accept/decline)
- DELETE: either party can delete (unfriend or cancel request)

**New RLS policy on `cars`:**
- Add a SELECT policy allowing authenticated users to read cars of their accepted friends (using a subquery on `friendships`)

### 3.2 Profile Page -- Friend Notifications

Update `Profile.tsx` to show pending friend requests with Accept/Decline buttons.

- Query `friendships` where `addressee_id = auth.uid()` and `status = 'pending'`
- Join with `profiles` to show the requester's username
- Accept button updates status to `'accepted'`
- Decline button deletes the row

### 3.3 Friends' Garages Page

Create new page `src/pages/FriendsGarages.tsx`:

- **Add Friend section:** Input field to search by username, button to send request
- Query `profiles` by username, then insert into `friendships`
- **Friends list:** Show all accepted friends
- When clicking a friend, show their garage (query `cars` where `user_id = friend_id`)
- **Recent spots carousel:** At the top, an Embla carousel showing the latest cars spotted by all friends (last 7 days), using the existing `Carousel` UI components

### 3.4 Routing

- Add route `/friends` in `App.tsx`
- Update Dashboard tile "Friends' Garages" to navigate to `/friends` (remove `disabled: true`)

---

## Technical Details

### Migration SQL

```sql
-- Allow all authenticated users to view all cars (for shared map + friends)
CREATE POLICY "Authenticated users can view all cars"
ON public.cars FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Drop the restrictive owner-only SELECT policy
DROP POLICY "Users can view own cars" ON public.cars;

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can update friendship"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = addressee_id);

CREATE POLICY "Either party can delete friendship"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
```

### Files to Create
- `src/pages/FriendsGarages.tsx` -- main friends page with add friend, friends list, friend garage view, and recent spots carousel

### Files to Modify
- `src/index.css` -- switch to light theme colors
- `src/components/DashboardMap.tsx` -- light tiles, 7-day filter
- `src/pages/SpotMap.tsx` -- light tiles, 7-day filter
- `src/pages/Dashboard.tsx` -- enable Friends tile, link to `/friends`
- `src/pages/Profile.tsx` -- add pending friend requests section
- `src/App.tsx` -- add `/friends` route

