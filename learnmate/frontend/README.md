# LearnMate (frontend)

A student-to-student learning platform: find peer tutors, book sessions, chat, share study materials and leave reviews.
Built with React 19, React Router 7, Vite and `react-icons` (Lucide set). No other UI dependencies.

> **This app now has a real backend** (Express + PostgreSQL via Prisma + Socket.IO) in `../backend`.
> See the root [`README.md`](../README.md) for full setup, architecture, and API docs. The notes
> below describe this frontend package specifically; a few lines from the original (localStorage-only)
> version have been updated to match.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 - requires the backend running on :4000, see ../README.md
npm run build      # production build in dist/
npm run lint
```

### Try the roles
1. Register a **Tutor** (add skills, level, availability in *Profile*).
2. Register a **Student**, then *Find tutors → Book session*.
3. Log in as the tutor → *Sessions → Requests* → Accept → Mark completed.
4. Log in as the student → write a review.
5. Register with the email listed in the **backend's** `ADMIN_EMAILS` setting (default `admin@learnmate.edu`)
   to get the **Admin** role - role assignment now happens server-side.


## Project structure

```
src/
  config.js            roles, statuses, subject lists, upload limits
  services/
    api.js             THE data layer (see below)
    dashboardAPI.js    dashboard/admin summaries, derived from real records
    storage.js         localStorage session + change-notification pub/sub (no app data lives in the browser)
    socket.js          Socket.IO client: turns server events into notify() calls and live toasts
  context/, hooks/     auth, toast and notifications providers, useAsync (loading/error/live refresh)
  components/ui/       Button, Field (Input/Select/Textarea), Modal, Toast, Badge, Avatar,
                       Stars, DataTable, Pagination, Feedback (Skeleton/Empty/Error state)
  components/          Sidebar, BottomNav, NotificationPanel, MateUpButton, UserLink, SessionCard, ResourceCard, ...
  layouts/AppLayout    app shell (full sidebar / compact icon rail / phone header + bottom navigation)
  pages/               Home, Login, Register, ForgotPassword, ResetPassword, Dashboard, Search,
                       Booking, Chat, Materials, Reviews, Profile, PublicProfile, AdminDashboard,
                       Students, NotFound
  styles/              tokens.css (colour/type/spacing) → base → components → layout → pages
```

## Data layer: now backed by a real server

`src/services/api.js` now calls the real Express + PostgreSQL backend in `../backend` over HTTP,
instead of storing data in the browser. Every exported function keeps its **original name,
parameters, and return shape** from the original localStorage-only version, so no page in this
app needed to change - only the body of each `api.js` function did. The mapping that guided this
migration (now implemented, not just suggested):

| api.js function | Real endpoint |
|---|---|
| `registerUser`, `loginUser` | `POST /api/auth/register`, `POST /api/auth/login` (JWT) |
| `getSessionUser`, `updateProfile` | cached locally / `PUT /api/users/me` |
| `listUsers`, `adminUpdateUser`, `adminDeleteUser` | `GET /api/users`, `PATCH/DELETE /api/users/:id` (admin) |
| `listTutors` | `GET /api/tutors?exclude=` |
| `listMyBookings`, `createBooking`, `updateBookingStatus`, `deleteBooking` | `GET/POST /api/bookings`, `PATCH /api/bookings/:id/status` |
| `listReviews`, `createReview`, `deleteReview` | `GET/POST /api/reviews`, `DELETE /api/reviews/:id` |
| `listMaterials`, `addMaterial`, `removeMaterial`, `fetchMaterialFile` | `GET/POST /api/materials` (multipart), `DELETE/GET /api/materials/:id` |
| `listChatPartners`, `listMessages`, `sendMessage`, `togglePin`, `deleteMessages` | `/api/chats/...` + Socket.IO for live delivery |
| `getNotifications`, `markNotificationsSeen` | `GET /api/notifications`, `POST /api/notifications/seen` |

**Live updates** still work exactly as before from every page's point of view: `useAsync(fn, [storageKeys])`
re-fetches when data changes. The only thing that changed is *what* triggers that re-fetch - a new
`services/socket.js` listens for Socket.IO events pushed by the backend and calls the existing
`notify(KEYS.x)` from `services/storage.js`, so real-time updates now work **across different users'
browsers**, not just other tabs of the same browser like the original localStorage version.

One page needed a small, unavoidable change: `pages/Materials.jsx`'s file open/download logic, since
files are now real uploads served by the backend instead of in-browser Blobs (see `fetchMaterialFile`
in `api.js`).

## Design system & responsive behaviour
- Every colour comes from CSS variables in `styles/tokens.css` (`--primary`, `--primary-dark`,
  `--secondary`, `--background`, `--surface`, `--text-primary`, `--text-secondary`, `--border`,
  `--success`, `--warning`, `--danger`, plus shades). Text/background pairs meet WCAG AA.
- **Desktop** (1200px+): full sidebar. **Tablet** (768-1199px): compact icon sidebar.
  **Phone** (<768px): top header, bottom navigation, and a "More" drawer; tables become stacked cards.
- Each page passes its own content to `components/ui/PageHeader` (breadcrumbs, description, live
  stats, search or actions) instead of sharing one generic banner.

## Where data lives
All application data (accounts, sessions, chat, reviews, MateUp connections, materials) is stored by
the backend in PostgreSQL. The browser only keeps the signed-in session (JWT + user) in
`localStorage`. Passwords are hashed with bcrypt on the server and roles are assigned by the server.
