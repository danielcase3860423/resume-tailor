# API Reference

Base URL: `${NEXT_PUBLIC_BASE_DOMAIN}/api`

Auth header used by client:
`authorization: peragreemsolutions_gemini <jwt>`

Error pattern:
Most failures return HTTP `401` with `{ "msg": "..." }` via `sendError()`.

## Health/config

### `GET /api`
- Purpose: route config placeholder (`dynamic`, `runtime`, `revalidate` exports).
- Handler: no GET method implemented.

## Users

### `POST /api/users/sign-in`
- Auth: No
- Body:
```json
{ "email": "user@example.com", "password": "plain-text" }
```
- Success:
```json
{
  "valid": true,
  "result": "ok",
  "data": {
    "token": "jwt",
    "username": "...",
    "email": "...",
    "role": "ADMIN|VA|CALLER",
    "profiles": [],
    "_id": "..."
  }
}
```

### `POST /api/users/logout`
- Auth: No strict check
- Body: none
- Success:
```json
{ "msg": "You're logged out successfully.", "result": "ok" }
```

### `POST /api/users/create`
- Auth: Not enforced in handler
- Body: user payload; server assigns `password` from `DEFAULT_PWD` (bcrypt)
- Success:
```json
{ "result": "success", "user": { "...": "..." } }
```

### `GET /api/users/get`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "users": [] }
```

### `GET /api/users/get-by-role`
- Auth: Not enforced
- Behavior: returns users where `role === "CALLER"`
- Success:
```json
{ "result": "success", "users": [] }
```

### `PUT /api/users/:id`
- Auth: Not enforced
- Body: partial user fields
- Success:
```json
{ "result": "success", "user": { "...": "..." } }
```

### `DELETE /api/users/:id`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "user": { "...": "..." } }
```

## Profiles

### `GET /api/profiles/get`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "profiles": [] }
```

### `GET /api/profiles/get-profiles-by-userid`
- Auth: Required (decodes JWT from `authorization` header)
- Behavior: resolves `token.uuid`, then returns profiles in that user's `profiles[]`.
- Success:
```json
{ "result": "success", "profiles": [] }
```

### `POST /api/profiles/create`
- Auth: Not enforced
- Body: profile payload
- Success:
```json
{ "result": "success", "profile": { "...": "..." } }
```

### `PUT /api/profiles/:id`
- Auth: Not enforced
- Body: partial profile payload
- Success:
```json
{ "result": "success", "profile": { "...": "..." } }
```

### `DELETE /api/profiles/:id`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "profile": { "...": "..." } }
```

## Phones

### `GET /api/phones/get`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "phones": [] }
```

### `POST /api/phones/create`
- Auth: Not enforced
- Body: phone payload (`phoneNumber`, SIP fields, status, associations)
- Success:
```json
{ "result": "success", "phone": { "...": "..." } }
```

### `PUT /api/phones/:id`
- Auth: Not enforced
- Body: partial phone payload
- Success:
```json
{ "result": "success", "phone": { "...": "..." } }
```

### `DELETE /api/phones/:id`
- Auth: Not enforced
- Success:
```json
{ "result": "success", "phone": { "...": "..." } }
```

### `POST /api/phones/zadarma-webphone`
- Auth: Not enforced
- Body:
```json
{ "userId": "mongo_user_id" }
```
- Behavior: looks up `phonenumbers.associatedUserId`, requests key from Zadarma `/v1/webrtc/get_key`.
- Success:
```json
{
  "result": "success",
  "response": { "key": "zadarma_key", "login": "sipUsername" }
}
```

## Jobs

### `GET /api/jobs/get`
- Auth: Not enforced
- Query params:
- `page` (default `1`)
- `limit` (default `20`)
- `company` (optional, fuzzy)
- `title` (optional, fuzzy)
- `extension` (optional, fuzzy)
- Success:
```json
{ "result": "success", "jobs": [], "total": 0 }
```

### `GET /api/jobs/sync`
- Auth: Required + Admin-only
- Query params:
- `keywords` (optional)
- Behavior:
- Pulls Google Jobs via SerpAPI using rotating keys in `SERP_KEYS`.
- Paginates up to 20 pages.
- De-duplicates by handling Mongo duplicate insert errors.
- Success:
```json
{ "result": "ok", "msg": "Success to fetch jobs" }
```

### `DELETE /api/jobs/:id`
- Auth: Required + Admin-only
- Success:
```json
{ "result": "success", "job": { "...": "..." } }
```

## Resume

### `GET /api/resume/get-resumes`
- Auth: Required (uses decoded token)
- Query params:
- `page` (default `1`)
- `limit` (default `20`)
- `sortBy` (default `created_at`)
- `order` (`ascend` -> ascending, otherwise descending)
- `startDate`, `endDate`
- `companyName`
- `profileId`
- `description`
- Behavior: non-admin users are filtered to their own `associatedUserId`.
- Storage: queries across all configured `MONGODB_RESUME_URI*` clusters.
- Success:
```json
{ "result": "success", "resumes": [], "total": 0 }
```

### `POST /api/resume/create-resume`
- Auth: Not enforced in handler
- Body:
```json
{
  "profileId": "...",
  "desc": "job description",
  "url": "job link",
  "userId": "..."
}
```
- Behavior:
- Calls OpenAI (`gpt-4.1-nano`) to generate structured resume content.
- Stores generated payload in the least-populated configured resume cluster.
- Returns generated PDF bytes.
- Success: HTTP `200`, `Content-Type: application/pdf`

### `POST /api/resume/download-resume`
- Auth: Not enforced in handler
- Body:
```json
{ "profileId": "...", "resumeId": "..." }
```
- Behavior: searches all configured resume clusters, then rebuilds PDF from stored `resume.resumeResponse`.
- Success: HTTP `200`, `Content-Type: application/pdf`

### `POST /api/resume/create-cover`
- Auth: Not enforced in handler
- Body:
```json
{ "profileId": "...", "desc": "job description", "companyName": "...", "position": "..." }
```
- Behavior:
- Calls OpenAI (`gpt-4.1-nano`) to generate cover-letter content.
- Returns generated cover-letter PDF bytes.
- Success: HTTP `200`, `Content-Type: application/pdf`

## Unimplemented endpoint referenced by frontend

### `POST /api/users/auth-google`
- Referenced by `src/services/(routes)/users/index.js`.
- No route handler currently exists in `src/app/(endpoint)/api/users`.
