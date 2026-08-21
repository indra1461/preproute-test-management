# PrepRoute Test Management

An admin panel for creating and publishing tests (chapterwise / PYQ / mock) — cascading subject → topic → sub-topic selection, a marking scheme, bulk question authoring, and a preview-before-publish flow.

- **Live app**: https://preproute-test-management-pink.vercel.app/
- **GitHub repo**: https://github.com/indra1461/preproute-test-management

## Tech Stack

- **React 19** + **TypeScript** + **Vite** — app shell and dev/build tooling
- **Redux Toolkit** + **RTK Query** — global state and all data fetching/caching (one `api` slice, per-domain endpoints via `injectEndpoints`)
- **React Router v7** — routing, with a `ProtectedRoute` guard for authenticated pages
- **React Hook Form** + **Zod** (`@hookform/resolvers`) — form state and schema validation
- **TanStack React Table** — the tests table on the Dashboard
- **Tailwind CSS v4** (`@tailwindcss/vite`) — styling
- **react-hot-toast** — toast notifications
- **lucide-react** — icons
- **oxlint** — linting

## Project Structure

```
preproute-test-management/
├── public/                      # Static files served as-is (favicon, icons, hero image)
├── src/
│   ├── api/                     # RTK Query endpoint slices (all injected into api/baseApi.ts)
│   │   ├── baseApi.ts           # Base api instance: fetchBaseQuery + auth header + 401 → logout
│   │   ├── authApi.ts           # Login
│   │   ├── testsApi.ts          # Tests: list / get / create / update / delete
│   │   ├── questionsApi.ts      # Questions: bulk create / bulk fetch
│   │   ├── subjectsApi.ts       # Subjects
│   │   ├── topicsApi.ts         # Topics by subject
│   │   └── subTopicsApi.ts      # Sub-topics by topic / by multiple topics
│   ├── app/
│   │   ├── store.ts             # Redux store (api reducer + auth reducer)
│   │   └── hooks.ts             # Typed useAppSelector / useAppDispatch
│   ├── assets/                  # Bundled images (hero.png, react.svg, vite.svg)
│   ├── components/
│   │   ├── ProtectedRoute.tsx   # Redirects to /login when there's no auth token
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Sidebar + Topbar shell with a routed <Outlet />
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── ui/                  # Reusable form/UI primitives (Button, Input, Select, MultiSelect)
│   ├── features/
│   │   └── auth/
│   │       └── authSlice.ts     # Auth state; persists token + user to localStorage
│   ├── lib/
│   │   └── utils.ts             # cn() classname helper, getErrorMessage() for API errors
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx        # Test list, search, delete
│   │   ├── CreateEditTestPage.tsx   # Step 1: test details + cascading subject/topic/sub-topic
│   │   ├── AddQuestionsPage.tsx     # Step 2: bulk question authoring
│   │   └── PreviewPublishPage.tsx   # Step 3: preview + publish (sets status to "live")
│   ├── types/
│   │   └── index.ts             # Shared domain types (Test, Question, Subject, Topic, ...)
│   ├── App.tsx                  # Route definitions
│   ├── main.tsx                 # App entry point (ReactDOM root, Redux Provider)
│   ├── index.css                # Tailwind entry + global styles
│   └── App.css
├── .env.example                 # Sample env file (copy to .env)
├── vercel.json                  # Production /api/* rewrite to the backend
├── vite.config.ts               # Path alias (@ → src), Tailwind plugin, dev /api proxy
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── package.json
└── README.md
```

## Getting Started

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL if needed
npm run dev
```

Other available scripts (from `package.json`):

```bash
npm run build     # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # preview the production build locally
```

## Environment Variables

| Variable            | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL the app makes API calls against. See `.env.example`. |

## CORS

The backend (an admin-moderator API hosted on Railway) doesn't allow direct
cross-origin calls from the app's origins, so the app never talks to it
directly from the browser — it always goes through a same-origin `/api`
path that gets proxied/rewritten to the real backend:

- **Dev**: `vite.config.ts` proxies `/api` → the Railway backend
  (`server.proxy["/api"]`), so requests from `localhost` never leave the
  browser as cross-origin.
- **Production (Vercel)**: `vercel.json` rewrites `/api/:path*` to the same
  backend, keeping the browser's request same-origin there too.

Because of this, `VITE_API_BASE_URL` is set to the relative `/api` (see
`.env` / `.env.example`) rather than the backend's absolute URL — the actual
cross-origin hop happens server-side (Vite dev server / Vercel), not in the
browser, so no CORS headers are needed on the backend for this app to work.

## Known Limitations

- No automated tests (no test runner is configured in `package.json`).
- No pagination on the Dashboard — `useGetTestsQuery` fetches the full test
  list in one call.
- Auth token is stored in `localStorage` with no refresh-token flow; a 401
  response clears the token (`baseApi.ts`) and `ProtectedRoute` redirects to
  `/login` on the next render.
- "Media URL" on a question is a plain text field — there's no file upload.
- The backend base URL is hardcoded in `vite.config.ts` and `vercel.json`
  (both point at the same Railway staging URL), rather than being driven by
  an environment variable at that layer.

## Technical Decisions

- **One RTK Query `api` instance, split by domain.** `baseApi.ts` defines a
  single `createApi` instance; `testsApi`, `questionsApi`, `authApi`,
  `subjectsApi`, `topicsApi`, and `subTopicsApi` all extend it via
  `injectEndpoints`, so caching, tag invalidation (`Test`, `Question`), and
  the auth header/401 handling live in one place.
- **Zod + React Hook Form for every form.** Login, Create/Edit Test, and Add
  Questions all validate through a `zodResolver`-backed schema; numeric
  fields use `z.coerce.number()`, which is why forms that need it split
  `z.input<>` (raw input types) from `z.output<>` (parsed types).
- **Multi-step test creation across three pages**, matching the routes in
  `App.tsx`: `/tests/new` (or `/tests/:id/edit`) → `/tests/:id/questions` →
  `/tests/:id/preview`, rather than one large form.
- **`@` path alias** for `src/`, configured in both `vite.config.ts` and the
  `tsconfig` files, so imports don't rely on relative `../../..` paths.
- **Publishing is a partial update.** `PreviewPublishPage` publishes a test
  by sending `{ status: "live" }` through `updateTest` (a `PUT` that only
  touches the fields provided) instead of resending the full test payload.
