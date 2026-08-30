# ms_rhesa_utomo_betest

CRUD microservice for **Account Login** and **User Info**.

Node.js + TypeScript · Express 5 · Mongoose/MongoDB · Redis · JWT · Docker

---

## Live deployment

| | |
|---|---|
| Base URL | `https://rhesautomo-betest-production.up.railway.app` |
| Health | `GET /health` → `{"status":"ok"}` |
| Readiness | `GET /health/readiness` → per-dependency status (`503` if any is down) |

**Demo credentials** — every seeded account uses the password `Password123!`.

| userName | role | notes |
|---|---|---|
| `super_admin` | admin | full access, including `DELETE /api/users/:userId` |
| `putri_maharani` | user | non-admin, useful for checking the `403` path |

```bash
curl -s -X POST https://rhesautomo-betest-production.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"userName":"super_admin","password":"Password123!"}'
```

The response carries `token`; send it as `Authorization: Bearer <token>` on every protected route.

---

## API

`Auth` column: **—** public · **JWT** valid bearer token required · **JWT + admin** token whose
`role` claim is `admin`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness. Always `200` while the process is up. |
| GET | `/health/readiness` | — | Checks MongoDB and Redis. `200` when both are reachable, `503` otherwise. |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Generates the JWT. Body: `{ userName, password }`. Also stamps `lastLoginDateTime` on the account. Rate limited to 30 requests / 15 min per IP. |
| GET | `/api/auth/me` | JWT | Returns the decoded token claims. |

### User Info

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | JWT | List with filter, sort and pagination. |
| GET | `/api/users/by-account/:accountNumber` | JWT | **Get user info by accountNumber** (cached). |
| GET | `/api/users/by-registration/:registrationNumber` | JWT | **Get user info by registrationNumber** (cached). |
| GET | `/api/users/:userId` | JWT | Detail (cached). |
| POST | `/api/users` | JWT | Create. |
| PUT | `/api/users/:userId` | JWT | Update. |
| DELETE | `/api/users/:userId` | JWT + admin | Delete. |

**Query parameters on `GET /api/users`**

- Filter: `role` (exact, `admin`/`user`), `accountNumber` (exact), `registrationNumber` (exact),
  `fullName` (case-insensitive partial match)
- `sort`: `fullName`, `accountNumber`, `registrationNumber`, `role`, `createdAt`. Prefix with `-`
  for descending (`sort=-fullName`). Unknown fields fall back to the default `-createdAt`.
- `page` (default `1`), `limit` (default `20`, max `100`)

Responses are `{ items, total, page, limit }`.

### Account Login

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/accounts` | JWT | List with filter, sort and pagination. |
| GET | `/api/accounts/stale` | JWT | **Accounts whose `lastLoginDateTime` is older than N days** (`?days=3`, the default). |
| GET | `/api/accounts/:accountId` | JWT | Detail. |
| POST | `/api/accounts` | — | Registration — see the note below. |
| PUT | `/api/accounts/:accountId` | JWT | Update. Re-hashes `password` when present. |
| DELETE | `/api/accounts/:accountId` | JWT | Delete. |

**Query parameters on `GET /api/accounts`**

- Filter: `userName` (partial), `userId` (exact)
- `sort`: `userName`, `lastLoginDateTime`, `createdAt` — default `-createdAt`
- `page`, `limit` as above

## Database

Database name: `db_rhesa_utomo_betest`

| Collection | Key | Type | Purpose |
|---|---|---|---|
| `users` | `accountNumber` | unique | Constraint, and backs `GET /api/users/by-account/:accountNumber` |
| `users` | `emailAddress` | unique | Constraint (stored lowercased, format-validated) |
| `users` | `registrationNumber` | unique | Constraint, and backs `GET /api/users/by-registration/:registrationNumber` |
| `users` | `{ role: 1, fullName: 1 }` | compound | Covers the common list filter-plus-sort combination |
| `accounts` | `userName` | unique | Constraint, and backs the login lookup |
| `accounts` | `userId` | unique | Enforces the 1:1 relationship with `users` |
| `accounts` | `{ lastLoginDateTime: -1 }` | single | Backs `GET /api/accounts/stale` |

Definitions are in [`src/modules/User/user.model.ts`](src/modules/User/user.model.ts) and
[`src/modules/Account/account.model.ts`](src/modules/Account/account.model.ts).

---

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production`. The production Docker stage sets this itself — do not override it, `pino-pretty` is not installed in that image. |
| `PORT` | no | `3000` | Injected by most hosting platforms; leave unset there. |
| `MONGO_URL` | **yes** | — | Connection string without the database name, e.g. `mongodb://mongo:27017`. |
| `MONGO_DB_NAME` | **yes** | — | `db_rhesa_utomo_betest`. Appended to `MONGO_URL` by `buildMongoUri()`. |
| `REDIS_URL` | no | — | When unset the cache degrades to a no-op (null object) and the service runs without Redis. |
| `JWT_SECRET` | **yes** | — | Minimum 32 characters. Generate with `openssl rand -base64 48`. |
| `JWT_EXPIRES_IN` | no | `1h` | Duration string (`30m`, `1h`, `7d`) or a number of seconds. |
| `CACHE_TTL_SECONDS` | no | `300` | TTL for cached user records. |
| `LOG_LEVEL` | no | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |

Validated at startup by [`src/config/env.ts`](src/config/env.ts) — the process exits with the list
of offending variables rather than booting half-configured. Copy `.env.example` to `.env` to start.

---

## Running locally

```bash
cp .env.example .env
docker compose up
```

Brings up the API on `http://localhost:3000` with MongoDB and Redis. The API container runs the
`development` Dockerfile stage with `tsx watch`, so `src/` is hot-reloaded.

Then, in a second shell, create the indexes and load demo data:

```bash
npm install && npm run db:indexes && npm run db:seed
```

`db:seed` is idempotent — it does nothing if users already exist. `npm run db:seed -- --fresh`
wipes and reseeds (and refuses to run against `NODE_ENV=production` without `--force`). Twelve
users and accounts are created, five of them stale beyond three days and three that have never
logged in, so `GET /api/accounts/stale` has something to return.

Without Docker: leave `REDIS_URL` unset, point `MONGO_URL` at any MongoDB, and run `npm run dev`.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` / `npm run test:cov` | Jest unit tests / with coverage |
| `npm run lint` | ESLint over `src` and `tests` |
| `npm run format` | Prettier over `src` |
| `npm run db:indexes` | Create/sync all indexes and constraints |
| `npm run db:seed` | Seed demo users and accounts |

---

## Caching

Redis caches User Info reads only, via a `CachedUserRepository` decorator that wraps
`MongoUserRepository` behind the shared `IUserRepository` interface

- Canonical entry `user:id:<userId>`, plus `user:acct:<accountNumber>` and
  `user:reg:<registrationNumber>` as alias keys pointing at the canonical one, so all three read
  paths share a single cached copy.
- Writes warm the cache; updates and deletes evict both the previous and the new key set, so a
  changed `accountNumber` leaves no stale alias behind.
- Every cached read returns an **`X-Cache: HIT | MISS`** response header:

---
