# Development setup

1. Install Docker Desktop and start its Linux-container backend.
2. Copy `.env.example` to `.env.local`; set distinct database passwords and a `PASSWORD_RESET_SECRET` of at least 32 characters. Keep `STORAGE_PROVIDER=local` and `EMAIL_PROVIDER=console`.
3. Run `npm install`, `npm run db:up`, wait for the health check, then run `npm run db:init`.
4. On a new/empty database, configure `SEED_ADMIN_USERNAME`, `SEED_ADMIN_NAME`, and `SEED_ADMIN_PASSWORD` in `.env.local`, then run `npm run db:seed` to create the initial administrator. `SEED_ADMIN_PASSWORD` must be at least 12 characters.
5. For an existing installation stop writes, run `npm run db:migrate -- --source=data/merit-track.sqlite`, verify its report, then run `npm run storage:migrate-private`.
6. Run `npm run dev`. Local development needs neither Microsoft Graph nor Resend credentials.

Do not run two Next development servers against the same `.next/dev` directory.
