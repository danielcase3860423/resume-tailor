# Methods Reference

## API Route Handlers (`src/app/(endpoint)/api`)

### Users
- `POST /api/users/sign-in`
- `POST /api/users/logout`
- `POST /api/users/create`
- `GET /api/users/get`
- `GET /api/users/get-by-role`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Profiles
- `GET /api/profiles/get`
- `GET /api/profiles/get-profiles-by-userid`
- `POST /api/profiles/create`
- `PUT /api/profiles/:id`
- `DELETE /api/profiles/:id`

### Phones
- `GET /api/phones/get`
- `POST /api/phones/create`
- `PUT /api/phones/:id`
- `DELETE /api/phones/:id`
- `POST /api/phones/zadarma-webphone`

### Jobs
- `GET /api/jobs/get`
- `GET /api/jobs/sync`
- `DELETE /api/jobs/:id`

### Resume
- `GET /api/resume/get-resumes`
- `POST /api/resume/create-resume`
- `POST /api/resume/download-resume`
- `POST /api/resume/create-cover`

## Controller Methods (`src/services/(endpoint)`)

### `users/user.controller.js`
- `generateToken(user, tokenId)`
- `getUserByEmail(email)`
- `emailExists(email)`
- `createHashedPassword(plainTextPassword)`
- `verifyPassword(hashedPassword, plainTextPassword)`
- `getUsers()`
- `getUsersByRole()`
- `createUser(data)`
- `updateUserById(id, updates)`
- `deleteUserById(id)`

### `profiles/profile.controller.js`
- `getProfiles()`
- `createProfile(data)`
- `updateProfileById(id, updates)`
- `deleteProfileById(id)`
- `getProfilesByUserId(userId)`

### `phones/phone.controller.js`
- `getPhones()`
- `createPhone(data)`
- `updatePhoneById(id, updates)`
- `deletePhoneById(id)`

### `jobs/job.controller.js`
- `getJobs({ skip, limit, company, title, extension })`
- `deleteJobById(id)`

### `resumes/resume.controller.js`
- `getResumes({ skip, limit, sortBy, sortOrder, startDate, endDate, companyName, profileId, description, userId })`

## Frontend Service Methods (`src/services/(routes)`)

### `users/index.js`
- `login(email, password)`
- `login_with_google(params)`
- `logout()`
- `getUsers()`
- `getUsersByRole()`
- `createUser(params)`
- `updateUser(id, params)`
- `deleteUser(id)`

### `profiles/index.js`
- `getProfiles()`
- `getProfilesByUserId()`
- `createProfile(params)`
- `updateProfile(id, params)`
- `deleteProfile(id)`

### `phones/index.js`
- `getPhoneNumbers()`
- `createPhoneNumber(params)`
- `updatePhoneNumber(id, params)`
- `deletePhoneNumber(id)`

### `jobs/index.js`
- `syncJobs(keywords = '')`
- `getJobs({ currentPage, limit, company = '', title = '', extension = '' })`
- `deleteJob(id)`

### `resume/index.js`
- `getResumes({ currentPage, limit, sortBy, sortOrder, startDate = '', endDate = '', companyName = '', profileId = '', description = '' })`

## Multi-DB Helpers

### `src/mongodb-resume.js`
- `getResumeConnections()`
- `getResumeModels()`
- `listResumesAcrossClusters({ filter, sortBy, sortOrder, skip, limit })`
- `findResumeByIdAcrossClusters(resumeId)`
- `createResumeAcrossClusters(data)`

## Key Utility Methods

### `src/helpers/endpoint.js`
- `sendError(res, options)`
- `hasAuthorization(req)`
- `isAuthorized(req)`
- `getToken(req)`
- `decodedToken(req)`
- `isThirdParty(req)`
- `isAdmin(req)`
- `isUser(req)`
- `isSuper(req)`
- `isCaller(req)`
- `sanitizeText(str)`
- `formatASCIIPart(str)`
- `shortenRole(str)`
- `buildResumeFilename({ name, role, company, maxLength })`
- `shortenLinkedIn(url)`

### `src/helpers/common.js`
- `jwtDecode(token)`
- `randomUUID(prefix = '')`
- `getAddressInfo()`
- `isValidEmail(email)`
- `validUSPhone(phoneNumber)`
- `validPassword(password)`
- `validName(name)`
- `formatPhoneNumber(input)`
