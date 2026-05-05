# Secure Video Platform

Secure streaming and course platform with authenticated access, Axinom DRM playback, admin management, Zoom meetings, support tickets, watermarking, session controls, analytics, and external service integrations.

## Features

- **Secure playback:** Multi-DRM playback through Axinom and Shaka Player.
- **Access control:** NextAuth sessions, whitelisted access, course enrollment, and direct video access.
- **Admin operations:** User, course, video, analytics, whitelist, permission, ticket, and security-event management.
- **Meetings and support:** Zoom Meeting SDK flow plus support ticket handling.
- **Runtime integrations:** Prisma MongoDB, Upstash Redis, Azure Blob, Cloudflare R2, Sentry, and Vercel-oriented deployment.

## Getting Started

### Prerequisites

- Node >=20.9.0. The repo pins `20.11.1` in `.nvmrc`.
- npm with the committed `package-lock.json`.
- Prisma MongoDB through `DATABASE_URL`.
- Optional external services for full integration checks: Google OAuth, Upstash Redis, Axinom, Azure/R2 storage, Zoom, SMTP, reCAPTCHA, and Sentry.

### Quick Setup

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run db:push
npm run verify:setup
npm run dev
```

Replace placeholder values in `.env.local` before running workflows that need real external services. `npm run verify:services` checks configured service variables and skips missing optional local credentials by default.

## Documentation

- [Maintainer setup](docs/setup.md)
- [Environment matrix](docs/env-matrix.md)
- [Verification commands](docs/verification.md)
- [Secret hygiene](docs/secret-hygiene.md)
- [System architecture](docs/architecture/system_overview.md)
- [API endpoints](docs/api/endpoints.md)
- [Business rules](docs/business/rules.md)
- [Changelog](CHANGELOG.md)

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Database:** Prisma ORM with MongoDB
- **Auth:** NextAuth.js
- **Player:** Shaka Player
- **Meetings:** Zoom Meeting SDK

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) when the maintainer contribution guide is added.

## License

Proprietary. All rights reserved.
