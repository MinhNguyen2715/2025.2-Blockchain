# Diploma Frontend (scaffold)

Minimal Vite + React + TypeScript scaffold. Single page, one ping button per
backend endpoint, used to verify the dev server boots and the NestJS API is
reachable through CORS before any real UI work begins.

## Setup

```bash
cd frontend
cp .env.example .env       # edit if your backend isn't on localhost:3000
npm install
npm run dev                # http://localhost:5173
```

The backend (`backend/src/main.ts`) already CORS-whitelists
`http://localhost:5173`, so no extra config is needed if you keep the default
port.

## What you should see

Open http://localhost:5173 with the backend running (`cd backend && npm run start:dev`).
You'll get one card per route, grouped by `verify` / `student` / `university`.
Each card has a **Ping** button.

The smoke test passes when **every card shows a status badge** (any HTTP code
is fine — a 4xx still proves the route is reachable). The university routes
will return 401 until you put your `ADMIN_API_KEY` into the
`x-admin-api-key` field at the top.

If every card shows `error · …ms`, the browser couldn't reach the backend —
check that NestJS is running, that the API base in the header is correct,
and that the backend's `FRONTEND_URL` (if you set one) matches the port
Vite is on.

## Files

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── main.tsx           # React entry point
    ├── App.tsx            # smoke-test page
    ├── endpoints.ts       # one source of truth for all /api/* routes
    ├── styles.css
    └── vite-env.d.ts
```

## Scripts

- `npm run dev` — dev server with HMR
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — TS only, no emit
