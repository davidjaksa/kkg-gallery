# KKG Galéria

Self-hosted photo gallery for Könyves Kálmán Gimnázium. Public visitors browse published school years, albums, and photos. Staff log in to upload and manage content.

Hungarian UI, English URL slugs (`/archive`, `/2026-27`, `/2026-27/sports-day`).

## Local development

Requirements: Node.js 20+.

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32), AUTH_URL, ADMIN_EMAIL, ADMIN_PASSWORD (min. 12 chars)
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin account is created on first boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Changing `ADMIN_PASSWORD` later does **not** update an existing hash — use Fiók in the admin UI or reset it in Felhasználók.

| Role | Access |
| --- | --- |
| Public | Browse published years, albums, photos, search |
| Editor (`Szerkesztő`) | Years, own albums, upload, publish own albums |
| Admin | Everything, plus users and storage settings |

## Docker

Portainer loads secrets from `stack.env` (generated from the stack environment UI). Local Compose can use the same file:

```bash
cp .env.example stack.env
# edit secrets and AUTH_URL
docker compose up --build
```

`npm run dev` still uses `.env` (`cp .env.example .env`).

The app binds to `127.0.0.1:3000` only. Named volumes store the SQLite database and uploaded files.

## Production

- Put nginx, Caddy, or Traefik in front with TLS. Set `AUTH_URL=https://your.domain`.
- Do not publish port 3000 on the public internet; keep the Compose bind on localhost and proxy to it.
- Encrypt disks and backups that hold `kkg-db` / `kkg-uploads` (password hashes and student photos).
- Offboarding: delete the user. Access ends on the next request (`getSessionUser` re-reads the database). JWT lifetime is 12 hours.

## Project notes

- Photos live in `data/uploads/` (`originals`, `display`, `thumbs`, `covers`) and are gitignored.
- School years are stored as `2026-27` (start year input formats the label/slug automatically).
- `photos/` is a local archive dump (gitignored). Import it with:

```bash
npm run import:photos -- --dry-run
npm run import:photos
npm run import:photos -- --publish
npm run import:photos -- --year=2013
```

New albums default to unpublished. Pass `--publish` to match the old importer behavior.

Numeric folders (`2002`) become school years (`2002-03`). Non-numeric folders (`Iskolatörténet`, `Tablók`) become custom years. Nested photographer folders are flattened into the parent album. Files are **moved** out of `photos/` into `data/uploads` (not copied). Identical files are stored once (SHA-256) and shared. Re-running deletes leftover copies already imported and is safe to resume.
