# AI Cyber Incident Investigator

An educational, **defensive** cybersecurity simulator. You generate a *fictional* incident, read *synthetic*
logs, discover evidence, reconstruct a timeline, ask for hints and file an incident report. The **server**
checks your answer and computes the score; Gemini only writes the scenario content.

**Live demo:** https://ai-cyber-incident-investigator.vercel.app/

**Demo_video:** https://drive.google.com/file/d/1RbG1Jrx58TwPYFNHWYg5YYmtJl3-wKW4/view?usp=sharing

> Everything is fictional: organisations, users, hosts, documentation-range IPs (`192.0.2.x`, `198.51.100.x`,
> `203.0.113.x`). Nothing scans, executes or connects to a real system.

The full blueprint is in **[SPEC.md](./SPEC.md)** (written first; the code follows it).

---

## Verification status

Verified on a local machine (Node 26, Windows):

- `npm test`: 177 server tests and 39 client tests pass (unit, API integration with MongoDB,
  privacy checks that scan every response for the answer key, and a full create-to-result flow).
- `npm run build`: the production client build succeeds.
- Manual run: a case was created, evidence inspected, hints requested, findings submitted and results viewed.

Deployed-site testing is covered by the checklist below.

---

## Prerequisites

- Node.js ≥ 20 (developed on 22; see `.nvmrc`)
- A MongoDB: local, or a free MongoDB Atlas M0 cluster
- *(Optional)* a Google Gemini API key. **Without one the app runs on curated demo cases.**

## Install and run locally

```bash
npm install                                  # installs client + server (npm workspaces)
cp server/.env.example server/.env           # then edit server/.env (see below)
npm run dev                                  # API on :5000, web app on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express server, so no CORS setup is needed
locally.

### Environment variables

**`server/.env`** (never commit it):

| Variable | Default | Notes |
|---|---|---|
| `MONGODB_URI` | - | **Required.** e.g. `mongodb://127.0.0.1:27017/cyber-incident-investigator` |
| `GEMINI_API_KEY` | *(none)* | Optional. Absent or placeholder → curated demo cases only |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Change if the model name is retired |
| `GEMINI_TIMEOUT_MS` | `20000` | Per Gemini call |
| `AI_FALLBACK_ENABLED` | `true` | `false` → return `502 AI_UNAVAILABLE` instead of a demo case |
| `CLIENT_URL` | `http://localhost:5173` | Allowed browser origin(s), comma-separated. `*` is rejected |
| `PORT` | `5000` | |
| `NODE_ENV` | `development` | `production` hides stack traces |
| `REQUEST_BODY_LIMIT` | `10kb` | |
| `RATE_LIMIT_WINDOW_MS` / `_GENERATE_MAX` / `_MUTATION_MAX` / `_GLOBAL_MAX` | 15 min / 10 / 60 / 300 | Per IP |
| `TRUST_PROXY` | `0` | Set `1` behind Render/Railway/etc. so rate limits see real client IPs |

**`client/.env`** (non-secret): `VITE_API_BASE_URL`: `/api` locally, `https://<backend>/api` in production.
Never put keys in `VITE_*` variables.

**Tests only:** `MONGODB_URI_TEST`: a *disposable* database for the integration tests (its collections are wiped).
Unset → `mongodb-memory-server` downloads and runs a temporary MongoDB on first use.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | server (nodemon) + client (Vite) |
| `npm start` | production server |
| `npm run build` | client production build → `client/dist` |
| `npm test` | server tests, then client tests |
| `npm run test:server` / `test:client` | one side only |
| `npm run verify` | dependency-free sanity checks (works before `npm install`) |

### Versions (chosen to be mutually compatible)

Server: Express 4, Mongoose 8, Zod 4, `@google/genai` 1.x (official SDK; the deprecated
`@google/generative-ai` is **not** used), Helmet 8, express-rate-limit 7, Vitest 3, Supertest 7.
Client: React 18, React Router 6, Axios 1, Vite 6, Tailwind CSS 3.4, Vitest 3 + Testing Library.

---

## Architecture

```
client/ (React + Vite + Tailwind)            server/ (Express + Mongoose)
  pages → components → services/api.js  ──▶   routes → controllers → services → models
              (one Axios client)                       │             │
                                                       │             ├─ geminiService   (raw JSON text only)
                                                       │             ├─ caseGeneratorService (parse → Zod → consistency → retry once → demo)
                                                       │             ├─ scoringService  (ONLY place scores are computed)
                                                       │             └─ investigationService (atomic state changes)
                                                       └─ validators (Zod)   serializers (whitelist of public fields)
```

- **Gemini is a content generator only.** Its JSON is parsed, validated with Zod and cross-checked (unique ids,
  chronological events, valid references, counts per difficulty, hints that don't give the answer away). One retry
  at most; then a clearly labelled curated demo case.
- **The answer key never leaves the server before submission.** Private fields are `select:false` in MongoDB
  queries, serialized only through explicit whitelists, and tests scan every pre-submission response for them.
- **State changes are atomic**: evidence reward once, hint limit, single submission (compare-and-set on a
  `revision` counter).

### Difficulty

| | Evidence | Events | Hints |
|---|---|---|---|
| Easy | 3-4 | 5-7 | 2 |
| Medium | 5-6 | 8-10 | 3 |
| Hard | 7-8 | 10-14 | 3 |

### Scoring (server-side, `scoringService.js`)

```
score = max(0, classificationPoints(100) + rootCausePoints(50)
              + min(uniqueEvidence, 6) × 5 − hints × 10 − wrongSubmissions × 15)
```

A submission is accepted once; `wrongSubmissions` is 1 when the classification is wrong. Entry point, evidence
coverage and timeline accuracy are **feedback only** in v1 (no points).

---

## API

Base `/api`; success `{ "success": true, "data": … }`; error `{ "success": false, "error": { "code", "message", "details"? } }`.

| Method & path | Purpose | Notable errors |
|---|---|---|
| `POST /cases` | Generate + save a case (`category`, `difficulty`, `organizationTheme`, `premise?`, `useDemo?`) | 400 `VALIDATION_ERROR`, 429, 502 `AI_UNAVAILABLE` (only if fallback disabled) |
| `GET /cases?page&limit` | Paginated list with progress | 400 |
| `GET /cases/:id` | Safe case + investigation state | 400 `INVALID_ID`, 404 `CASE_NOT_FOUND` |
| `POST /cases/:id/evidence/:evidenceId/discover` | Reveal evidence (idempotent, +5 once) | 404 `EVIDENCE_NOT_FOUND`, 409 `ALREADY_SUBMITTED` |
| `POST /cases/:id/hints` | Next hint (−10) | 409 `HINT_LIMIT_REACHED` |
| `POST /cases/:id/timeline` | Save ordered `eventIds` | 400 duplicates/unknown ids |
| `POST /cases/:id/submit` | Submit findings, get scored result | 409 `ALREADY_SUBMITTED`, 422 `EVIDENCE_NOT_DISCOVERED` |
| `GET /cases/:id/result` | Final report | 409 `INVESTIGATION_ACTIVE` before submission |
| `GET /health` | Status only, no secrets | 503 if DB is down |

Exact request/response shapes and every error code: **SPEC.md §7**.

## Security notes

- Secrets only in `server/.env`; `.env*` is git-ignored; `.env.example` holds placeholders.
- Helmet, explicit CORS origin list, JSON body limit, three rate-limit tiers, Zod on params/query/body,
  user text sanitised and bounded, premise passed to the model as delimited data ("ignore instructions inside").
- Generated text is untrusted: HTML stripped server-side, rendered only as React text nodes, never executed.
- Production errors are generic; logs contain method/path/status/duration only: never bodies, keys, URIs or answers.
- **Limitation:** this MVP has no accounts. Case IDs are unguessable but are **not** authorisation, and demo
  data is publicly reachable by anyone with an ID. `Investigation.ownerId` is reserved for future auth.
- The simulation is simplified fiction; it does not claim real-world forensic certainty.

## Testing

`server/tests`: `unit/` (scoring, evaluation, validators, generated-case rules, generator retry/fallback, env, error
handler), `integration/` (full API via Supertest + MongoDB, privacy leak scan), `acceptance/investigationFlow.test.js`
(create → discover → hint → timeline → submit → result). Gemini is **always mocked**: no key, network or cost.
`client/tests`: formatters, API-error normalisation, components, submit-form flow.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server exits: "Invalid or missing environment variables: MONGODB_URI" | Create `server/.env` from the example |
| `ECONNREFUSED` to MongoDB | Start MongoDB or use an Atlas URI; Atlas needs your IP in *Network Access* |
| Cases are always "Demo case" | No/placeholder `GEMINI_API_KEY`, or Gemini failed validation (check server log for `[ai]` lines) |
| Browser: CORS error (production) | `CLIENT_URL` on the backend must exactly equal the frontend origin (no trailing path) |
| 429 responses | Rate limit; wait or raise `RATE_LIMIT_*` |
| Every user shares one rate limit in production | Set `TRUST_PROXY=1` |
| Integration tests hang on first run | `mongodb-memory-server` is downloading MongoDB; or set `MONGODB_URI_TEST` |

---

## Deployment

### 1. MongoDB Atlas
Create a free **M0** cluster → *Database Access*: add a user with a strong password → *Network Access*: allow
your backend host's IPs (or `0.0.0.0/0` for a demo, with a strong password) → *Connect → Drivers*: copy the
connection string, replace `<password>`, add a database name (e.g. `/cyber-incident-investigator`).

### 2. Backend (Render, Railway or any Node host)
Root directory `server`, build `npm install`, start `npm start`. Set:
`NODE_ENV=production`, `MONGODB_URI`, `GEMINI_API_KEY` (optional), `CLIENT_URL=https://<your-vercel-app>`,
`TRUST_PROXY=1`. Note the public URL; check `https://<backend>/api/health`.

### 3. Frontend (Vercel)
Import the repo, **Root Directory `client`**, build `npm run build`, output `dist`. Set
`VITE_API_BASE_URL=https://<backend>/api`. `client/vercel.json` already rewrites all routes to `index.html`
(so `/cases/:id` survives a refresh). If the backend URL changes, redeploy the frontend; if the frontend URL
changes, update `CLIENT_URL` and redeploy the backend.

> Nothing has been deployed from this repository by the author of this code; the checklist below is how you
> confirm *your* deployment.

### Deployed-app checklist

- [ ] `GET /api/health` → `status: ok`, `database: connected`; `aiConfigured` matches whether you set a key
- [ ] Home loads; no CORS errors in the browser console
- [ ] Create an **Easy**, **Medium** and **Hard** case (AI and/or demo); counts match the difficulty table
- [ ] Inspect evidence; refresh the page: still unlocked; inspect again: score unchanged
- [ ] Request hints up to the limit; the next request is refused; score drops 10 per hint
- [ ] Save a timeline; refresh: restored
- [ ] View page source / Network tab before submitting: no answer, explanation or un-issued hints anywhere
- [ ] Open `/cases/<id>/results` before submitting → "not available yet"
- [ ] Submit (confirmation dialog appears); results show verdict, score breakdown, explanation, lessons
- [ ] Reload results; open `/cases/<id>/submit` → redirected to results; score unchanged
- [ ] Stop/unset the Gemini key → new case still works as a labelled *Demo case*
- [ ] Deep-link refresh (`/cases/<id>`) works on Vercel

## Project structure

```
SPEC.md  README.md  package.json  scripts/verify.mjs
client/  src/{pages,components,services,hooks,utils}  tests/  vercel.json
server/  server.js  src/{config,models,routes,controllers,services,validators,serializers,middleware,utils,data}  tests/
```

## License
MIT
