

# Plan: Full PWA + Push Notifications for Autospotter

## Summary

Transform Autospotter into an installable PWA with offline support and real-time push notifications for key social events.

---

## Part 1: PWA Setup

### 1.1 Install `vite-plugin-pwa`
- Add dependency
- Configure in `vite.config.ts` with manifest (name: "Autospotter", theme: black/gold, display: standalone)
- Service worker with runtime caching (stale-while-revalidate for images, network-first for API)
- `navigateFallbackDenylist: [/^\/~oauth/]`

### 1.2 App Icons & Meta Tags
- Create PWA icons in `public/` (192x192, 512x512)
- Add to `index.html`: `apple-mobile-web-app-capable`, `apple-touch-icon`, `theme-color` meta tags

### 1.3 Install Prompt Component
- `InstallPrompt.tsx` — captures `beforeinstallprompt`, shows dismissable install banner
- iOS detection with "Add to Home Screen" instructions
- Mount in `App.tsx`

### 1.4 Update Available Toast
- Use `registerSW({ onNeedRefresh })` from vite-plugin-pwa to show "Update available — tap to refresh" toast

---

## Part 2: Push Notifications Infrastructure

### 2.1 Database
New table: `push_subscriptions`
- `id` (uuid, PK)
- `user_id` (uuid, not null)
- `endpoint` (text, not null)
- `p256dh` (text, not null)
- `auth_key` (text, not null)
- `created_at` (timestamptz, default now())
- Unique constraint on `(user_id, endpoint)`
- RLS: users can manage own subscriptions

### 2.2 New Notification Triggers (database)
Currently missing triggers for these events — will add SQL triggers that insert into the `notifications` table:

1. **Friend request received** — trigger on `friendships` INSERT (status='pending'), notify `addressee_id`
2. **Friend request accepted** — trigger on `friendships` UPDATE to 'accepted', notify `requester_id`
3. **DM received** — trigger on `direct_messages` INSERT, notify `receiver_id`
4. **Group chat message** — trigger on `group_chat_messages` INSERT, notify all members except sender
5. **Friend spotted a vehicle** — trigger on `cars` INSERT, notify all accepted friends of the spotter
6. **Vehicle delivered** — trigger on `cars` INSERT where `delivered_by_user_id` is set, notify `user_id`

(Topic replies and car likes already have triggers.)

### 2.3 Edge Function: `web-push-subscribe`
- Receives push subscription JSON from browser
- Stores/updates in `push_subscriptions` table
- Handles unsubscribe (DELETE)

### 2.4 Edge Function: `send-push-notification`
- Called by a database webhook or from other edge functions
- Reads `push_subscriptions` for target user
- Sends Web Push using VAPID keys via the `web-push` protocol
- Removes stale/expired subscriptions on 410 responses

### 2.5 Database Webhook
- On INSERT to `notifications` table, trigger the `send-push-notification` edge function to deliver the push to the user's subscribed devices

### 2.6 Secrets Required
- `VAPID_PUBLIC_KEY` — generated once, also used client-side (will be stored in `app_config` table for client access)
- `VAPID_PRIVATE_KEY` — edge function secret only
- `VAPID_SUBJECT` — mailto: or URL identifier

---

## Part 3: Client-Side Push Integration

### 3.1 Push Subscription Helper
- `src/lib/pushNotifications.ts` — functions to subscribe/unsubscribe the browser
- Registers with service worker, sends subscription to `web-push-subscribe` edge function
- Stores VAPID public key from `app_config`

### 3.2 Notification Permission UI
- Add "Enable push notifications" toggle in `NotificationPreferences` component (ProfileSettings)
- On enable: `Notification.requestPermission()` → subscribe → store
- On disable: unsubscribe → remove from DB
- Show iOS PWA requirement hint when not in standalone mode

### 3.3 Service Worker Push Handler
- Custom service worker code to handle `push` events and show `self.registration.showNotification()` with appropriate title/body based on notification type
- Handle `notificationclick` to navigate to relevant page

---

## Technical Details

**New files:**
- `public/icons/icon-192.png`, `icon-512.png` (generated placeholder icons)
- `src/components/InstallPrompt.tsx`
- `src/lib/pushNotifications.ts`
- `public/sw-push.js` (push event handler, imported by vite-plugin-pwa)
- `supabase/functions/web-push-subscribe/index.ts`
- `supabase/functions/send-push-notification/index.ts`

**Modified files:**
- `package.json` — add `vite-plugin-pwa`
- `vite.config.ts` — PWA plugin config
- `index.html` — PWA meta tags
- `src/App.tsx` — mount InstallPrompt, register SW
- `src/pages/ProfileSettings.tsx` — push notification toggle

**Database migrations:**
- Create `push_subscriptions` table with RLS
- 6 new notification triggers (friend request, friend accepted, DM, group message, friend spot, delivery)
- Database webhook on `notifications` INSERT → `send-push-notification`

**Secrets to configure:**
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

