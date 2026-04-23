# Resume Tailor Combine

AI-assisted resume tailoring platform built with Next.js App Router, MongoDB, OpenAI, and SerpAPI.

## What this project does
- Manages users, profiles, phones, and synced jobs.
- Generates tailored resumes and cover letters from job descriptions.
- Exports resume/cover-letter PDFs.
- Supports call workflows via Zadarma WebPhone key generation.
- Supports split MongoDB storage so core data and resume data can live on different clusters.

## Tech stack
- Next.js 14 (App Router)
- React 18
- MongoDB + Mongoose
- OpenAI API (`openai` package)
- SerpAPI (`serpapi` package)
- Zadarma API (`zadarma` package)

## Project structure
- `src/app/(routes)` UI pages
- `src/app/(endpoint)/api` API routes
- `src/services/(endpoint)` controller/business logic
- `src/services/(routes)` frontend API client services
- `src/models` Mongoose models
- `src/helpers` auth/util/PDF helpers
- `docs` technical documentation

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env.local
```
3. Fill real values in `.env.local`.
4. Start dev server:
```bash
npm run dev
```

## Scripts
- `npm run dev` Start dev server
- `npm run build` Production build
- `npm run start` Run production server on port `3000`
- `npm run lint` Run ESLint

## Environment variables
See `.env.example` for all required variables:
- `NEXT_PUBLIC_BASE_DOMAIN`
- `MONGODB_URI`
- `MONGODB_RESUME_URI_1`
- `MONGODB_RESUME_URI_2`
- `DEFAULT_PWD`
- `OPENAI_API_KEY`
- `SERP_KEYS`
- `ZADARMA_API_KEY`
- `ZADARMA_API_SECRET`

## MongoDB layout
- `MONGODB_URI` is the core cluster for `user`, `profile`, and `phonenumbers`.
- `MONGODB_RESUME_URI*` variables are used for `resume` documents.
- If no `MONGODB_RESUME_URI*` variables are provided, resume storage falls back to `MONGODB_URI`.
- Each MongoDB URI must include the target database name in the path.
- Example: `mongodb+srv://user:pass@cluster.mongodb.net/resume_tailor_core`

## Migration
- Dry run dump inventory:
```bash
npm run migrate:dump:dry
```
- Import from `/home/gemini/Documents/dump`:
```bash
npm run migrate:dump
```
- Import from a custom dump path:
```bash
node scripts/migrate-mongodb-dump.cjs --dump=/path/to/dump
```

## Auth notes
- API client uses header: `authorization: kimura_token <jwt>`.
- JWT secret is currently hardcoded in `src/config/constants.js` as `TOKEN_SECRET`.

## Documentation
- [docs/README.md](docs/README.md)
- [docs/project-analysis.md](docs/project-analysis.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/methods-reference.md](docs/methods-reference.md)

## Known gaps observed during analysis
- `users.login_with_google()` exists in frontend service, but `/api/users/auth-google` route is not implemented.
- Several write endpoints do not enforce backend auth/role checks.
- `TOKEN_SECRET` and Google client key are hardcoded instead of env-configured.
