# LearnMate

A peer-to-peer tutoring platform for a college community: students find peer tutors, book
sessions, chat, share study materials, and leave reviews. Tutors manage session requests and
build a rating. Admins oversee users and sessions.

This repo has two parts:

- **`frontend/`** - the original React 19 + Vite app (kept intact - see `frontend/README.md`)
- **`backend/`** - a new Express + PostgreSQL (via Prisma) + Socket.IO API that the frontend now
  talks to over HTTP, with real-time updates pushed over WebSockets

Everything in this document is about how the two fit together and how to run the whole thing.

## 1. Project overview

| Role | Can do |
|---|---|
| **Student** | Search/browse tutors, book a session, chat, upload/download study materials, review a tutor after a *completed* session, send **MateUp** connection requests, open other members' profiles, see their own dashboard/notifications |
| **Tutor** | Accept/decline/complete session requests, chat, upload/download materials, see their rating and session history, connect with students through MateUp |
| **Admin** | View/edit/delete any user, view/delete any session, delete any review, see a global activity feed and platform-wide stats |

Everything a role can do in the UI is also enforced on the backend (not just hidden in the
frontend) - see [Section 13](#13-business-rules-enforced-server-side).

## 2. Technology stack

- **Frontend:** React 19, React Router 7, Vite, `socket.io-client`. No CSS framework - hand-written
  design tokens in `frontend/src/styles`.
- **Backend:** Node.js, Express 4
- **Database:** PostgreSQL, accessed through **Prisma** (`backend/prisma/schema.prisma`)
- **Real-time:** Socket.IO (JWT-authenticated WebSocket connections)
- **Auth:** JWT (`jsonwebtoken`) + password hashing with `bcryptjs`
- **Validation:** Zod (`backend/src/validators/schemas.js`)
- **File uploads:** Multer, stored on disk under `backend/uploads/materials/`, validated by
  extension and size
- **Security middleware:** Helmet, CORS (restricted to the frontend's origin), rate limiting

## 3. Architecture

```
Browser (React app, :5173)
   │  HTTP fetch() with "Authorization: Bearer <JWT>"
   │  Socket.IO WebSocket (auth: { token })
   ▼
Express API + Socket.IO server (:4000)
   │  Prisma Client
   ▼
PostgreSQL
```

Request flow for a normal action (e.g. booking a session):
`Frontend form → api.js → fetch POST /api/bookings → Express route → Zod validation →
bookingController → bookingService (Prisma) → PostgreSQL → response → Socket.IO event
"bookings:changed" broadcast → every connected client's socket.js calls notify(KEYS.bookings) →
useAsync() on any open page re-fetches automatically → UI updates with no manual refresh`.

### Why the frontend pages didn't need to change

The original app already stored all of its data behind a single file, `frontend/src/services/api.js`,
with one `async` function per operation (`listTutors`, `createBooking`, `sendMessage`, ...), and a
small pub-sub helper in `services/storage.js` (`notify(key)` / `subscribe(keys, callback)`) that
pages use via a `useAsync(fn, [KEYS.x])` hook to reload when relevant data changes. That data layer
originally read/wrote `localStorage`.

Migrating to a real backend meant:
1. Rewriting the **body** of every function in `api.js` to call the real HTTP API - same function
   names, same parameters, same return shapes.
2. Adding `frontend/src/services/socket.js`, which listens for Socket.IO events from the backend
   and calls the *existing* `notify(KEYS.x)` - so every page's existing `useAsync` reload logic now
   fires from real server push events instead of `localStorage`'s same-browser `storage` event.
3. One small, unavoidable change to `frontend/src/pages/Materials.jsx`: files are now real uploads
   served by the backend, not in-browser Blobs, so opening/downloading a file does an authenticated
   fetch first.

No other page, component, or hook changed.

## 4. Prerequisites

- **Node.js 18+** (Node 20/22 both work)
- **PostgreSQL 14+** running locally (or a connection string to a remote instance)
- npm (comes with Node)

### Installing PostgreSQL locally

- **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
- **Windows:** install from https://www.postgresql.org/download/windows/ (the installer sets up
  the service for you)
- **Linux (Debian/Ubuntu):** `sudo apt install postgresql postgresql-contrib && sudo service postgresql start`

Then create a database and a user for this app (adjust the password):

```bash
psql -U postgres
```
```sql
CREATE USER learnmate WITH PASSWORD 'learnmate_dev_pw';
CREATE DATABASE learnmate OWNER learnmate;
GRANT ALL PRIVILEGES ON DATABASE learnmate TO learnmate;
\q
```

## 5. Environment variables

Copy the example file and adjust as needed:

```bash
cd backend
cp .env.example .env
```

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://learnmate:learnmate_dev_pw@localhost:5432/learnmate?schema=public` |
| `PORT` | Port the API + Socket.IO server listens on (default `4000`) |
| `CLIENT_URL` | The frontend's origin, for CORS (default `http://localhost:5173`) |
| `JWT_SECRET` | Long random string used to sign login tokens - **change this** for anything beyond local dev |
| `JWT_EXPIRES_IN` | How long a login session lasts (default `7d`) |
| `ADMIN_EMAILS` | Comma-separated emails that get the **Admin** role automatically on registration |
| `MAX_UPLOAD_MB` | Max study-material file size (default `25`) |
| `RESET_TOKEN_TTL_MINUTES` | How long a password-reset link stays valid (default `30`) |
| `RESET_RATE_LIMIT_MAX` | Max forgot/reset-password requests per IP per 15 minutes (default `10`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional outgoing email for password-reset links. Leave `SMTP_HOST` empty to run without email (see **Password reset** below). Never commit real credentials |
| `DEV_RETURN_RESET_LINK` | **Development only.** `true` makes the API return the reset link when no SMTP server is configured so you can test the flow. Ignored when `NODE_ENV=production` |

The frontend has its own `.env` (`frontend/.env`, copy from `frontend/.env.example`):

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Base URL of the backend (default `http://localhost:4000`) |

## 6. Installation

```bash
# Backend
cd backend
npm install

# Frontend (separate terminal)
cd frontend
npm install
```

## 7. Database setup (migrations)

From `backend/`, with `.env` pointing at your running PostgreSQL instance:

```bash
npx prisma generate       # generates the Prisma Client from schema.prisma
npx prisma migrate deploy # applies the included migration, creating all tables
```

(`migrate deploy` applies existing migrations as-is; use `npx prisma migrate dev` instead if you
plan to edit `schema.prisma` yourself and want Prisma to generate new migrations interactively.)

To inspect the database visually at any point: `npx prisma studio`.

### Migrations

| Migration | What it does |
|---|---|
| `20260101000000_init` | Original tables |
| `20261006000000_mateup_reset_review_booking_chat` | Adds `MateUpRequest` and `PasswordResetToken`; `Review.bookingId` (unique); `Message.recipientEmail` + `Message.readAt`; `User.passwordChangedAt`; and a **partial unique index** on `Booking(tutorId, date, time)` for `Pending`/`Confirmed` bookings |

The second migration is additive and preserves existing data, with three things worth knowing when
you upgrade an existing database:

- **Existing reviews** keep working: their `bookingId` stays empty (only *new* reviews must reference a completed session).
- **Existing chat messages** are marked as already read, so nobody is greeted by a wall of "unread" on upgrade.
- **Duplicate active bookings:** if your data already contains two `Pending`/`Confirmed` sessions for the same tutor at the same date and time, the migration keeps the earliest and sets the later ones to `Cancelled` (rows are kept) so the double-booking index can be created.

> The double-booking rule is a PostgreSQL *partial* unique index, which Prisma's schema language
> cannot express, so it lives in the migration SQL (a comment in `schema.prisma` points to it).
> Keep it when you squash or regenerate migrations.

### No fake seed data

This app intentionally ships with **no seed/demo data**. Your first Admin account is created the
normal way: register through the app UI using an email address listed in `ADMIN_EMAILS` in your
`.env`, and that account is automatically granted the Admin role. Everything else you see in the
running app (tutors, sessions, reviews, materials) is data you actually create by using it.

## 8. Running it

```bash
# Terminal 1 - backend
cd backend
npm run dev          # http://localhost:4000

# Terminal 2 - frontend
cd frontend
npm run dev           # http://localhost:5173
```

Open **http://localhost:5173** in your browser. Register an account, then open a second
browser/incognito window and register another (e.g. one Tutor, one Student) to see real-time
updates between two users.

## 9. API reference

All endpoints are prefixed with `/api`. All responses use the shape:
```json
{ "success": true, "message": "...", "data": { } }
```
or on failure:
```json
{ "success": false, "message": "..." }
```
Endpoints marked 🔒 require an `Authorization: Bearer <token>` header. 🔒👑 requires the Admin role.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account (Student or Tutor; Admin is auto-assigned by email) |
| POST | `/auth/login` | Log in, returns `{ user, token }` |
| POST | `/auth/forgot-password` | Request a password-reset link (identical response whether or not the email exists; rate limited) |
| POST | `/auth/reset-password` | Set a new password with a reset token (single use, expires; signs out older sessions) |
| GET | `/auth/me` 🔒 | Current user |
| PUT | `/users/me` 🔒 | Update your own profile |
| GET | `/users/:id/profile` 🔒 | Another member's **public** profile (no mobile number or private data), with your MateUp status with them |
| GET | `/mateup` 🔒 | Your mates plus incoming/outgoing MateUp requests |
| POST | `/mateup/requests/:userId` 🔒 | Send a MateUp request (if they already asked you, this connects you) |
| POST | `/mateup/requests/:requestId/accept` 🔒 | Accept a request (receiver only) |
| POST | `/mateup/requests/:requestId/decline` 🔒 | Decline a request (receiver only) |
| DELETE | `/mateup/:userId` 🔒 | Remove a mate, or cancel a request you sent |
| GET | `/users` 🔒👑 | List all users |
| PATCH | `/users/:id` 🔒👑 | Edit a user's name/department/year/role |
| DELETE | `/users/:id` 🔒👑 | Delete a user |
| GET | `/tutors?exclude=<email>` 🔒 | List tutors with computed rating/review count/sessions taught |
| GET | `/bookings/mine` 🔒 | Your sessions, split into `{ asStudent, asTutor }` |
| GET | `/bookings` 🔒👑 | All sessions |
| POST | `/bookings` 🔒 | Request a session |
| PATCH | `/bookings/:id/status` 🔒 | Confirm / Decline / Complete / Cancel (role- and state-checked) |
| DELETE | `/bookings/:id` 🔒👑 | Delete a session |
| GET | `/reviews` 🔒 | All reviews |
| GET | `/reviews/eligible` 🔒 | Your completed sessions, each flagged as already reviewed or not |
| POST | `/reviews` 🔒 | Review one **completed** session (`{ bookingId, rating, comment }`); tutor and subject come from the booking |
| DELETE | `/reviews/:id` 🔒 | Delete a review (your own, or any as Admin) |
| GET | `/materials` 🔒 | List study materials |
| POST | `/materials` 🔒 | Upload a material (multipart: `title`, `subject`, `description`, `file`) |
| DELETE | `/materials/:id` 🔒 | Delete a material (your own, or any as Admin) |
| GET | `/materials/:id/file` 🔒 | Download/view a material's file |
| GET | `/chats` 🔒 | List conversation partners with last-message preview |
| GET | `/chats/:convId/messages` 🔒 | Messages in a conversation |
| POST | `/chats/:convId/messages` 🔒 | Send a message (also notifies the recipient in real time) |
| POST | `/chats/:convId/read` 🔒 | Mark everything you received in this conversation as read |
| PATCH | `/chats/:convId/messages/:id/pin` 🔒 | Toggle pin on a message |
| DELETE | `/chats/:convId/messages` 🔒 | Delete messages (body: `{ ids: [...] }`) |
| GET | `/notifications` 🔒 | Your notification feed (sessions, reviews, MateUp requests, unread chat messages) + unread counts |
| POST | `/notifications/seen` 🔒 | Mark notifications as read |
| GET | `/activity?mine=true\|false` 🔒 | Activity feed (yours, or global for Admin) |
| GET | `/public-stats` | Student/tutor/material counts, for the logged-out landing page |
| GET | `/health` | Health check |

`:convId` is `email1|email2` sorted alphabetically (URL-encode it) - the same helper
(`conversationId(a, b)`) the frontend already used.

## 10. Authentication

- Passwords are hashed with `bcryptjs` (10 salt rounds) - never stored or logged in plain text.
- Login returns a JWT (`JWT_EXPIRES_IN`-day expiry) containing `{ userId, email, role }`, signed
  with `JWT_SECRET`.
- The frontend stores the token in `localStorage` (`learnmateToken`) and sends it as
  `Authorization: Bearer <token>` on every request, and as `auth: { token }` when opening the
  Socket.IO connection.
- If a token is invalid/expired, or the account behind it no longer exists, the backend returns
  401, and the frontend automatically clears the local session so the user is sent back to the
  login page.
- Route-level authorization: `requireAuth` (must be logged in) and `requireRole("Admin")`
  (Admin-only) middleware guard every protected route.
- **Password rule:** at least 8 characters, enforced by Zod on the backend (`PASSWORD_MIN_LENGTH` in
  `validators/schemas.js`) and mirrored on the frontend (`utils/password.js`). Login does not apply
  the length rule, so accounts created under an older rule can still sign in.

### Password reset

1. **Login → Forgot password?** → enter the registered email → `POST /auth/forgot-password`.
2. The API always answers the same way, so it can't be used to discover which emails are registered.
3. For a registered email it creates a random 256-bit token and stores **only its SHA-256 hash**
   (`PasswordResetToken`). The link `…/reset-password?token=…` is valid for `RESET_TOKEN_TTL_MINUTES`.
   Requesting a new link invalidates earlier ones.
4. The link is emailed when SMTP is configured (`SMTP_*`). **Without SMTP**, the link is printed to
   the backend console (non-production), and with `DEV_RETURN_RESET_LINK=true` it is also shown in the
   UI, clearly labelled as development mode. In production without SMTP, nothing is exposed.
5. `POST /auth/reset-password` consumes the token atomically (single use), stores the new bcrypt
   hash and signs out every earlier session (JWTs carry a password version; live sockets are closed).

## 11. Real-time functionality

The backend maintains three kinds of Socket.IO rooms per connected client:
- `user:<id>` - for events aimed at one specific account
- `email:<email>` - used for private chat delivery (chat identifies people by email)
- `app` - every connected, authenticated client (used for broadly-relevant changes: new users,
  new/changed bookings, new reviews, new materials)

| Server event | Room | Meaning |
|---|---|---|
| `users:changed` | `app` | A profile changed, or admin edited/deleted a user |
| `bookings:changed` | `app` | A session was requested, its status changed, or it was deleted |
| `reviews:changed` | `app` | A review was created or deleted |
| `materials:changed` | `app` | A material was uploaded or deleted |
| `messages:new` | both participants' `email:` rooms | A chat message was sent, pinned, or deleted |
| `notifications:seen` | your own `user:` room | You marked notifications read (syncs your other tabs/devices) |
| `notifications:new` | recipient's `user:` / `email:` room | Push for a new chat message, MateUp request/acceptance, session request or review (the UI shows a toast and updates badges) |
| `notifications:changed` | `user:` room | Your unread state changed (e.g. you opened a conversation in another tab) |
| `mateup:changed` | both people's `user:` rooms | A MateUp request was sent, answered, cancelled or removed |

The frontend's `services/socket.js` listens for these and calls the app's existing
`notify(KEYS.x)` (from `services/storage.js`), which is exactly what every page already listens to
via `useAsync(fn, [KEYS.x])` - so real updates reach the UI with **no polling and no manual
refresh**, and no page-level code needed to change to support it.

## 12. File uploads

Study materials are validated on the backend (never trust the frontend alone):
- **Extension whitelist:** `.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`
- **Size limit:** `MAX_UPLOAD_MB` (default 25 MB)
- Files are renamed to a random id on disk (`backend/uploads/materials/`) - the original filename
  is preserved only in the database, for display/download purposes
- Downloads/views go through an authenticated controller route
  (`GET /api/materials/:id/file`), not a static file server, so only logged-in users can fetch them

## 13. Business rules enforced server-side

These are checked in the backend regardless of what the frontend sends:
- A session's status can only move: `Pending → Confirmed/Declined` (tutor only),
  `Confirmed → Completed` (tutor only), or `Pending/Confirmed → Cancelled` (either party).
- You can't book a session with yourself, and you can't review yourself.
- **Reviews:** a review must reference one booking that belongs to you (as the student), with that
  tutor, in status `Completed`; each session can be reviewed once (also a unique index). Tutor and
  subject are taken from the booking, never from the client.
- **No tutor double-booking:** a tutor can't have two `Pending`/`Confirmed` sessions at the same
  date and time. The API checks first (clear 409 message) and a partial unique index guarantees it
  even for simultaneous requests. Declined, cancelled and completed sessions don't block a slot.
- **MateUp:** no self-requests, one row per pair of people (so no duplicate or reverse-duplicate
  requests), only the receiver can accept/decline, admins aren't connectable, and someone who was
  declined must wait 24 hours before asking the same person again.
- **Chat unread state** is stored per message (`readAt`) and cleared only when the recipient opens
  the conversation.
- A booking's date/time must be in the future.
- A review can be deleted by its author or an Admin; a material can be deleted by its uploader or
  an Admin; a user can't delete their own account via the admin panel.
- A chat conversation can only be read/written by its two participants (checked against the
  authenticated user's email, not a client-supplied value).

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to PostgreSQL` on backend startup | Check PostgreSQL is running and `DATABASE_URL` in `backend/.env` is correct |
| `prisma generate` or `migrate` fails to download a binary | Check your internet connection/firewall - Prisma needs to download a small binary the first time. Corporate proxies sometimes block `binaries.prisma.sh`; try from a different network if so |
| Frontend shows "Something went wrong" on every request | Confirm the backend is running on the port in `frontend/.env`'s `VITE_API_URL`, and that `CLIENT_URL` in `backend/.env` matches the frontend's actual origin (CORS) |
| Real-time updates aren't arriving | Open the browser console - Socket.IO logs connection errors there; also confirm you're logged in (the socket needs a valid token) |
| File upload rejected | Only `.pdf .doc .docx .ppt .pptx` under `MAX_UPLOAD_MB` are accepted |
| "This account no longer exists" right after logging in | The JWT is valid but the user was deleted (e.g., by an Admin) - log in again with a different account |

## 15. Project structure

```
backend/
  src/
    config/       env.js, prisma.js (Prisma Client singleton)
    controllers/  one per resource - thin, calls services, emits socket events
    middleware/    auth.js (JWT + role guard), validate.js (Zod), upload.js (Multer), errorHandler.js
    routes/         Express routers, one per resource + index.js combining them
    services/      all business logic + Prisma queries live here
    sockets/       Socket.IO server setup, room helpers
    validators/    Zod schemas
    utils/         apiResponse.js, asyncHandler.js, jwt.js, uid.js
    app.js         Express app (middleware + routes)
    server.js      HTTP server + Socket.IO + DB-connectivity check + startup
  prisma/
    schema.prisma  data model
    migrations/    SQL migration(s)
    seed.js        optional - just verifies the DB is migrated (no fake data, see Section 7)
  uploads/materials/  uploaded files live here
frontend/
  src/
    services/      api.js (real API calls), socket.js (new), storage.js (unchanged pub-sub), dashboardAPI.js (unchanged)
    pages/, components/, hooks/, context/, layouts/, styles/  (all unchanged from the original app)
```
