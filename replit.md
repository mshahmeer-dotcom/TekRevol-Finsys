# TekRevol FinSys — Finance Management System

## Overview
A finance/accounting web app for tracking revenue, expenses, allocations, and
producing P&L reports across brands/entities (CA, TX, UAE, BuzzFlick).

- **Frontend:** React + Vite + TailwindCSS + shadcn/Radix UI, served on port 18748 in dev (managed by the `web` workflow / artifact system), proxies `/api` to the backend.
- **Backend:** Express + better-sqlite3, in `server/`, runs on port 3001 in dev (`Backend API` workflow) and serves both the API and the built static frontend on port 5000 in production.
- **Package manager:** pnpm workspace (`.`, `packages/*`, `server`).
- **Design/mockup sandbox:** `artifacts/mockup-sandbox` is a separate design-exploration artifact, unrelated to the finance app's runtime.

## Running the project
- Dev: `Backend API` workflow starts the Express/SQLite API (`cd server && SERVER_PORT=3001 node --import tsx/esm index.ts`). The frontend dev server (`web` workflow) is started by the artifact system via `pnpm --filter @workspace/finance-app run dev`.
- Build: `pnpm run build` (outputs to `dist/public`).
- Production: `.replit` `[deployment]` runs `cd server && NODE_ENV=production PORT=5000 node --import tsx/esm index.ts`, which serves the API and the built static frontend from `dist/public` on port 5000.

## Notes / setup fixes applied
- `better-sqlite3`'s native binding needs a C/C++ toolchain + Python (node-gyp). `python3` was added as a system dependency and the module rebuilt.
- Removed a legacy duplicate `.replit` "Start application" workflow that raced with the artifact-managed `web` workflow for port 5000.
- Added `server.watch.ignored` in `vite.config.ts` to stop Vite from watching the pnpm store (avoids `ENOSPC` file-watcher exhaustion).
- `artifacts/mockup-sandbox` needed its own `npm install` (it's not part of the pnpm workspace) to pick up `fast-glob`.

## User preferences
None recorded yet.
