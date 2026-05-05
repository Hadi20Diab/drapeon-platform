# Drapeon Platform

Production-grade multi-vendor suit and dress rental platform.

## Monorepo Layout

- `apps/api`: NestJS backend (REST + WebSocket + Prisma)
- `apps/web`: Qwik + Qwik City frontend
- `packages/config`: shared runtime/config contracts
- `packages/types`: shared domain types

## Engineering Standards

- Strict TypeScript everywhere
- Modular architecture with clear domain boundaries
- Validation and explicit error handling by default
