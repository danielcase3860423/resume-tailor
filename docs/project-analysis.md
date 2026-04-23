# Project Analysis

## High-level architecture
- Frontend pages are in `src/app/(routes)`.
- Backend APIs are Next.js route handlers in `src/app/(endpoint)/api/**/route.js`.
- Business/data logic is in controllers under `src/services/(endpoint)`.
- Frontend API wrappers (Axios) are in `src/services/(routes)`.
- MongoDB data models live in `src/models`.
- Shared helpers (auth, formatting, endpoint utils) live in `src/helpers`.
- Resume storage routing lives in `src/mongodb-resume.js`.

## Runtime flow
1. UI calls service classes in `src/services/(routes)`.
2. Service classes call `/api/*` endpoints.
3. API route handlers invoke controller methods.
4. Controllers use Mongoose models and `dbConnect()`.
5. Resume/Cover flows call OpenAI and generate PDFs with `pdf-lib`.
6. Resume reads/writes are routed across one or more `MONGODB_RESUME_URI*` clusters.

## Authentication and authorization
- Client attaches `authorization: kimura_token <jwt>` via `authHeader()`.
- Token parsing is done by `decodedToken()` in `src/helpers/endpoint.js`.
- Admin-only behavior is enforced in:
  - `GET /api/jobs/sync`
  - `DELETE /api/jobs/:id`
- Other CRUD endpoints currently accept requests without strict backend role checks.

## Data model summary
- `UserModel` (`user`): `username`, `email`, `password`, `status`, `role`, `profiles[]`.
- `ProfileModel` (`profile`): candidate profile, work experience, education, template.
- `ResumeModel` (`resume`): JD data + AI output + associations (`associatedUserId`, `associatedProfileId`).
- `PhoneNumbersModel` (`phonenumbers`): phone/SIP credentials + associated user/profile.
- `JobModel` (`job`): synced job entries from SerpAPI.

## External integrations
- OpenAI: resume and cover generation (`OPENAI_API_KEY`).
- SerpAPI: job sync (`SERP_KEYS` comma-separated).
- Zadarma: webphone credentials (`ZADARMA_API_KEY`, `ZADARMA_API_SECRET`).

## Configuration and env
Required variables are documented in `.env.example`.

## Multi-cluster storage strategy
- `MONGODB_URI` remains the primary cluster for:
- `user`
- `profile`
- `phonenumbers`
- `MONGODB_RESUME_URI*` values are scanned dynamically and used as the resume storage pool.
- Resume creation is placed on the least-populated configured resume cluster.
- Resume list and download operations query across all configured resume clusters.

## Migration
- Dump migration is implemented in `scripts/migrate-mongodb-dump.cjs`.
- Core collections are upserted into `MONGODB_URI`.
- Resume documents are distributed across configured `MONGODB_RESUME_URI*` targets.
- `--dry-run` prints inventory counts without writing to MongoDB.

## Gaps and risks found
- Security:
  - `TOKEN_SECRET` is hardcoded in `src/config/constants.js`.
  - Some modifying endpoints do not enforce auth checks server-side.
- Consistency:
  - Frontend has `login_with_google()` method, but backend route `/api/users/auth-google` is missing.
  - Logout clears `auth_token` cookie, while app auth primarily uses `COOKIE_USER_KEY` storage strategy.
- Stability:
  - `SERP_KEYS.split(',')` assumes env exists; missing var can crash job sync endpoint.
