<!-- File: DTECHNURSE-SITE-main/README.md -->
# DTECHNURSE Platform

A Next.js App Router and TypeScript foundation for the DTECHNURSE website, designed around Supabase Auth, Cloudflare D1, and Cloudflare R2 behind server-side service boundaries.

## Requirements

- Node.js 22 or a supported compatible LTS release
- npm
- Supabase project for authentication
- A configured D1 database and R2 bucket for persistent content and media

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase project URL and public client key in `.env.local`.
4. Configure the D1 and R2 bindings for the selected hosting adapter.
5. Apply the SQL migrations in `db/migrations` in numerical order.
6. Run `npm run dev`.

Do not commit `.env.local`, service-role keys, database credentials, or storage secrets.

## Scripts

- `npm run dev`: start the development server.
- `npm run lint`: run the TypeScript no-emit check.
- `npm run build`: create a production build.

## Architecture and deployment status

The repository includes the public site foundation, authentication forms, contact endpoint, article API foundation, admin article editor, media upload endpoint, SQL migrations, PWA metadata, and basic SEO routes.

The application is not yet production-verified. Before deployment, configure and test the hosting adapter that supplies D1 and R2 bindings, complete account profile provisioning, review upload validation and HTML sanitisation, configure email verification with the identity provider, and test all protected routes with real sessions and database migrations. The current editor saves when its save actions are used; the visual change indicator is not a server autosave. Scheduled publication is not yet automatic.

## Performance notes

Public article summaries use short-lived public cache directives. Admin and contact endpoints remain uncached. The article editor defers media-library reads and avoids a second article-list request after saving. See `docs/performance-and-caching.md` for details and the deployment caveat about Worker invocations.

## Security notes

- Signup must never grant administrative permissions.
- Grant admin access only through a trusted, manual provisioning process.
- Keep secrets in deployment environment settings, not in source control.
- Apply migrations before enabling write endpoints.
- Back up and verify all source data before any migration or deletion operation.
- Verify access control, input validation, rate limiting, and object cleanup on failed uploads before production use.

## GitHub

Commit the source, SQL migrations, examples, and documentation. Do not commit `.env.local`, `node_modules`, `.next`, build output, or private credentials. Configure required environment values separately in the deployment platform.
