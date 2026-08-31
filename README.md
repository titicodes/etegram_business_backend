# Etegram Business API

Backend API for Etegram Business — a point-of-sale and inventory management platform for
Nigerian SME retailers. Built with [NestJS](https://nestjs.com) and MongoDB (Mongoose).

Covers product/inventory management, checkout and order flow, customers, suppliers, stores,
deliveries, expenses, subscriptions, and admin operations — see `src/module/*` for the full
list of domain modules.

## Requirements

- Node.js 20+
- MongoDB (local or remote)
- Redis (local or remote)

## Project setup

```bash
npm install
cp .env.example .env   # fill in real values
npm run start:dev
```

The API listens on `PORT` (default `3000`).

### Environment variables

All variables the app reads are listed in [`.env.example`](./.env.example) with placeholder
values — copy it to `.env` and fill in real credentials (JWT secrets, MongoDB/Redis URLs, SMTP,
Twilio, AWS, ImageKit, Firebase). Never commit `.env`.

`FIREBASE_SERVICE_ACCOUNT` must point to a local Firebase service-account JSON file (not
committed to the repo — download your own from the Firebase console).

### Run with Docker Compose

```bash
cp .env.example .env   # fill in real values
docker compose up --build
```

This starts the API alongside MongoDB and Redis containers, wired together automatically.

## Running tests

```bash
npm run test        # unit tests
npm run test:cov    # unit tests with coverage
npm run test:e2e    # end-to-end tests
```

Unit tests boot with dummy environment values from `.env.test` (see `test/jest.setup.ts`) so
they run without a real `.env` file or live database.

## Lint & format

```bash
npm run lint     # eslint --fix
npm run format   # prettier --write
```

## Build

```bash
npm run build      # compiles to dist/
npm run start:prod # runs dist/src/main.js
```

## Project layout

- `src/module/*` — one NestJS module per domain (product, checkout, customer, supply,
  deliveries, subscription, admin, etc.)
- `src/common` — shared config, constants, enums, filters, interceptors
- `src/firebase` — Firebase Admin integration (push notifications)
- `functions/` — a separate Firebase Cloud Functions project, deployed independently via
  `firebase deploy` (not part of the main API build)

## License

UNLICENSED — proprietary.
