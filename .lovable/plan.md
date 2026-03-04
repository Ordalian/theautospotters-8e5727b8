

## Problem

The friend's garage page (`FriendGarage.tsx`) displays car photos using raw storage URLs without any optimization. On weak mobile networks, these full-resolution images fail to load (as shown in the screenshot where only alt text appears). The same optimization already applied to the friends carousel in `FriendsGarages.tsx` is missing here.

There are 3 places in `FriendGarage.tsx` where images are rendered without optimization:
1. **Car list items** (line 174) -- the main car grid when viewing a type filter
2. **"All" tile background** (line 220) -- the vehicle type menu
3. **Vehicle type tile backgrounds** (line 251) -- each category tile

## Plan

### 1. Add image optimization helper

Create a small utility function (or inline) that converts raw Supabase storage URLs to the render/transform endpoint with appropriate size and quality parameters:
- Car list thumbnails: `width=600&quality=60`
- Menu tile backgrounds: `width=400&quality=50`

### 2. Apply to all 3 image locations in FriendGarage.tsx

For each `<img>` tag:
- Use the transform URL instead of raw `image_url`
- Add `loading="lazy"`
- Add `onError` fallback handler (hide image, show fallback icon)
- Add `bg-muted` class for loading state

### 3. Add fallback elements

For the car list view (line 173-179), add a hidden fallback `<div>` with `img-fallback` class that becomes visible on image error -- same pattern already used in `FriendsGarages.tsx`.

For tile backgrounds, on error hide the image so the gradient+icon fallback shows through.

