# Architecture

## Core loop

Open app → see your world → click a country → add a memory → see your progress → discover other travelers → follow → their world.

The map is the hero on Home, Profile and the full-screen Map tab. Everything else hangs off countries (the country sheet, country pages, trips, feed items).

## Data model (PostgreSQL, `src/server/db/schema.ts`)

| Table | Purpose |
| --- | --- |
| `users` | Profile, `public_id` (immutable `TW-XXXXXXX`), privacy flags, notification + theme prefs, `invited_by` (whose invite link they joined from), `is_test_user` (seeded demo accounts). Usernames/emails unique case-insensitively. |
| `sessions` | Server-side sessions. The id is the SHA-256 of the cookie token, so a DB leak doesn't leak live sessions. Enables “active sessions” and “log out everywhere”. |
| `password_resets` | One-time, 1-hour reset tokens (hashed). |
| `countries` | Reference data keyed by ISO 3166-1 alpha-2 (`JP`, `IL`…), with continent and `is_sovereign` (UN members + observers = 195, the “% of the world” denominator). |
| `user_countries` | One row per user × country: `VISITED` or `WANT_TO_VISIT`. |
| `trips` | Many per country. Title, description, cities, optional dates. Saving a trip marks the country visited. |
| `trip_photos` | Metadata + object-storage key. Files never live in the database. `trip_id` is null while an upload is pending. |
| `follows` | `PENDING` (request to a private profile) or `ACCEPTED`. |
| `notifications` | `FOLLOW`, `FOLLOW_REQUEST`, `FOLLOW_ACCEPTED`, `UNFOLLOW`, `TRIP`, `MESSAGE_REQUEST`. |
| `conversations` | One per pair of users (`user_low_id < user_high_id`). `REQUEST` until the recipient accepts, then `ACTIVE`. |
| `conversation_members` | Per-user chat state: `last_read_at` (unread / "Seen") and `cleared_at` ("Delete chat" for that user only). |
| `messages` | Text messages; `deleted_at` = unsent (body cleared for both people). |
| `blocks` | Who blocked whom. No messages or follows in either direction. |
| `message_reports` | Reports with a copy of the reported message, reviewed manually. |
| `activities` | Append-only log behind the Travel Feed. |

**Country geometry** lives in `src/data/world-110m.json` (TopoJSON, ~100 KB) with feature ids rewritten to ISO alpha-2, so the map and the database join on the same code. Keeping shapes out of the DB lets them be served from the CDN and cached forever.

### Business rules
- A country stays **Visited** while it has at least one trip.
- Marking a wishlist country as Visited removes it from the wishlist (it's a single status per country).
- Onboarding bulk-marks never downgrade Visited → Want to Visit.
- Going public auto-accepts pending follow requests.
- Signing up from an invite link (`/register?ref=<username>`) sets `invited_by` and follows the inviter (a request if they're private).
- **Direct messages** (`src/server/services/messages.ts`): anyone may message a public account; a private one only by followers it approved. A first message from someone the recipient doesn't follow is a **request** (Requests folder, one message until accepted, no "Seen"); replying or accepting moves it to the Inbox. Blocking removes follows both ways. Chats poll every 4 s while open (no websockets on Vercel). The agents' read-only DB role has no access to any message table.

## API (`src/app/api/**`)

All handlers go through `route()` in `src/server/http/handler.ts`, which applies: session lookup, auth requirement, **CSRF origin check** on writes, **rate limiting**, zod **validation** errors → 422 with per-field messages, and safe error responses (no stack traces).

```
POST   /api/auth/register | login | logout | forgot-password | reset-password
GET    /api/auth/me | providers          GET /api/auth/google (+ /callback)

PATCH  /api/me                (profile)       DELETE /api/me   (account)
PATCH  /api/me/settings | email | password
POST   /api/me/avatar         DELETE /api/me/avatar
POST   /api/me/onboarding
POST   /api/me/countries      (set status)    PUT /api/me/countries (bulk)
DELETE /api/me/countries/:code
GET    /api/me/sessions       DELETE /api/me/sessions (others)   DELETE /api/me/sessions/:id
GET    /api/me/requests       POST|DELETE /api/me/requests/:username (accept|decline)
DELETE /api/me/followers/:username        GET /api/me/friends

GET    /api/users/:username   /map  /trips  /photos  /followers  /following  /share-image (1200×630 PNG)
POST|DELETE /api/users/:username/follow   POST|DELETE /api/users/:username/block   GET /api/me/blocked

GET    /api/messages?folder=inbox|requests
GET|POST|DELETE /api/messages/with/:username   (chat + mark read | send | delete for me)
POST   /api/messages/with/:username/accept | report        DELETE /api/messages/m/:id   (unsend)

POST   /api/uploads           DELETE /api/uploads/:id   (pending photos)
POST   /api/trips             GET|PATCH|DELETE /api/trips/:id
GET    /api/photos/:id[?size=thumb]        GET /api/media/avatar/:key

GET    /api/countries/:code   /api/explore   /api/feed   /api/search?q=   /api/notifications
POST   /api/notifications     (mark all read)
```

**Public profiles.** `/u/<username>` without a session is rewritten by `src/proxy.ts` to `src/app/share/[username]` — a server-rendered page with Open Graph tags whose image is `/share-image`. It shows only what the owner's privacy settings allow everyone to see, and its "Join" button carries `?ref=` for invites. Everything else stays behind sign-in.

Lists are paginated: keyset cursors on `(created_at, id)` for feeds/notifications/follows, offset cursors for date-ordered trips.

## Security

- **Passwords**: scrypt (N=2¹⁵), constant-time compare, dummy hash for unknown emails (no timing-based account enumeration). Forgot-password always returns 204.
- **Sessions**: random 256-bit token in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie. Password change/reset signs out other sessions.
- **CSRF**: SameSite cookies + Origin must match Host on every state-changing request. OAuth uses a `state` cookie.
- **Authorization**: every read goes through `services/privacy.ts` (`visibilityFor`). Private trips/photos return **404, not 403**, so IDs can't be probed. The bucket is private: `/api/photos/:id` checks access, then redirects to a **signed storage link** (valid ≤ 2 hours, stable within the hour so browsers cache it). Image bytes never pass through the app server. Avatars (public) use day-long links.
- **Uploads**: size limit before buffering, the image is decoded by sharp (not trusted by extension/MIME), then re-encoded to WebP, which strips EXIF/GPS and neutralizes polyglots. Pixel limit guards against decompression bombs.
- **Rate limits** (`http/rate-limit.ts`): auth 10/min, uploads 60/min, writes 120/min, reads 600/min per IP. In-memory — swap for Redis when running multiple instances.
- **XSS**: React escaping everywhere, no `dangerouslySetInnerHTML` on user data; user websites open with `rel="noopener noreferrer nofollow ugc"`; photo responses send `nosniff` and a restrictive CSP.

## Frontend

- **Data**: TanStack Query hooks per feature (`features/*/api.ts`). Optimistic updates for map status, follow and settings, with rollback on error. A 401 anywhere clears the session client-side.
- **UI state**: a small Zustand store (`lib/ui.ts`) for the country sheet, trip editor, map highlight and toasts.
- **Map** (`features/map`): d3-geo projection + d3-zoom (pan/zoom, pinch on trackpads), hover tooltips, "with photos" layer, highlight on status change. Code-split with `next/dynamic` so pages without a map never download d3 or the shapes.
- **States**: every data view has loading (skeletons), empty, error (retry) and success (toast) states.
- **Design system**: tokens in `globals.css` (Soft UI Evolution + AI-native accents, light/dark, reduced motion).

## Adding features later

The schema and services are organized so V2 features slot in without reshaping existing data:

- **Likes / comments / shares**: new tables keyed by `trip_id` (+ an activity type and notification type each).
- **Direct messages / groups / travel buddies**: new tables referencing `users`; reuse `privacy.ts` relationships.
- **Cities / places / map pins**: a `places` table with lat/lng linked to `trips`; render as a second SVG layer on the same projection.
- **Badges / challenges / leaderboards**: derive from `user_countries` + `trips`; `features/stats/compute.ts` already computes milestones and continents.
- **Email notifications**: `services/mailer.ts` is the single integration point (Resend when `RESEND_API_KEY` is set, console otherwise); `users.notify_email` is already stored.
- **AI travel assistant**: a service that reads a user's map, wishlist and trips through the same services (so it inherits privacy rules).

## Operations

- Migrations: edit `schema.ts` → `npm run db:generate` → commit the SQL → `npm run db:migrate` on deploy.
- Production storage: point `S3_*` at AWS S3, Cloudflare R2 or MinIO; keep the bucket private.
- Photos and avatars are downloaded straight from object storage via signed links, so app bandwidth stays low (and R2 has no egress fees). Set `S3_PUBLIC_ENDPOINT` if browsers reach storage at a different address than the server.
