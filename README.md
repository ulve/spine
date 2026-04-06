# Spine

Spine is a self-hosted ebook library with:

- A Node/Express + Prisma backend
- A Vite/React frontend
- Local file ingestion for `.epub` and `.pdf`
- User accounts with admin approval
- OPDS feeds for ebook clients

## Requirements

- Node.js 20+ (the repo currently runs on Node 25 as well)
- npm
- GraphicsMagick and Ghostscript if you want PDF cover extraction outside Docker

## Environment

Copy `.env.example` to `.env` and adjust the values:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET="replace-this-with-a-long-random-secret"
```

Notes:

- `JWT_SECRET` is required. The server now refuses to start without it.
- In Docker, `DATABASE_URL` should point at the mounted app data directory instead.
- Optional overrides:
  - `BOOKS_DIR`
  - `COVERS_DIR`
  - `BASE_URL`
  - `NODE_ENV`

## Local Development

Install dependencies:

```bash
npm install
cd frontend && npm install
cd ..
```

Generate Prisma client and apply the schema:

```bash
npx prisma generate
npx prisma db push
```

Start the backend:

```bash
npm run start
```

Start the frontend in a separate shell if you want Vite dev mode:

```bash
cd frontend
npm run dev
```

## Docker

Build and run:

```bash
docker compose up --build
```

The compose file mounts:

- `./data` to `/app/data`
- `./books` to `/app/books`

Add `JWT_SECRET` to `docker-compose.yml` or provide it through an environment file before using this in anything beyond local testing.

## How Authentication Works

### Web login

The web app uses `POST /api/auth/register` and `POST /api/auth/login`.

- The first registered user becomes the initial admin.
- Later users must be approved by an admin.
- Successful login returns a JWT.
- The frontend stores that JWT and sends it as `Authorization: Bearer <token>`.

### Admin-only actions

These now require an admin token:

- Uploading books
- Uploading/replacing covers
- Editing book metadata
- Viewing or managing users

### User-scoped actions

These stay available to authenticated non-admin users, but are now scoped to their own account:

- Reading status
- Reviews
- Shelves

## OPDS Authentication

Right now the OPDS routes under `/opds` are public. They do not use the web login flow.

If you want OPDS clients to authenticate, do not reuse the browser login screen directly. Most OPDS readers expect one of these patterns:

1. HTTP Basic authentication on the OPDS endpoints
2. An OPDS-compatible token flow supported by the client
3. A reverse proxy in front of `/opds` that enforces auth

For this codebase, the simplest path is HTTP Basic on `/opds` plus `/api/download/:id`, backed by the same user table. That keeps OPDS clients compatible and avoids trying to make ebook readers handle the browser JWT login flow.

## Common Flows

### 1. Create the first admin

1. Start the app with a valid `JWT_SECRET`.
2. Open the login page.
3. Register the first account.
4. That account is automatically marked admin and approved.

### 2. Approve later users

1. Sign in as an admin.
2. Open the Admin page.
3. Approve pending users.

### 3. Add books

1. Sign in as an admin.
2. Open Upload.
3. Upload `.epub` or `.pdf` files.
4. The scanner processes metadata and creates covers when possible.

### 4. Edit metadata

1. Sign in as an admin.
2. Open a book card or details view.
3. Edit title, authors, series, tags, description, or Goodreads link.

## API Overview

Public routes:

- `GET /api/books`
- `GET /api/books/:id`
- `GET /api/books/:id/reviews`
- `GET /api/authors`
- `GET /api/series`
- `GET /api/tags`
- `GET /api/download/:id`
- `GET /opds/*`

Authenticated routes:

- `POST /api/books/:id/status`
- `POST /api/books/:id/review`
- `GET /api/shelves`
- `POST /api/shelves`
- `POST /api/shelves/:id/books/:bookId`
- `DELETE /api/shelves/:id/books/:bookId`

Admin routes:

- `GET /api/admin/users`
- `POST /api/admin/users/:id/approve`
- `DELETE /api/admin/users/:id`
- `POST /api/upload`
- `POST /api/books/:id/cover`
- `PATCH /api/books/:id`

## Tests

Run the current test suite with:

```bash
npm test
```

Current coverage is intentionally small and focused on high-signal boundaries:

- Required environment config
- Auth middleware behavior
- Request validation helpers

The next useful additions would be route-level integration tests for:

- Admin-only catalog mutations
- Shelf ownership enforcement
- Book detail privacy for reading-status rows
