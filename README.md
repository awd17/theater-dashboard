# Theater Industry Dashboard

Nuxt 4 app with oRPC, Drizzle, and Cloudflare D1.

```bash
bun install
bun run db:migrate
bun run dev
```

```bash
bun run typecheck
bun run lint
bun run test
bun run test:e2e
```

Create tables in `server/db/schema.ts`, then:

```bash
bun run db:generate
bun run db:migrate
```

## Deploy

Production runs on Cloudflare Workers Free with scheduled ingestion in GitHub Actions.

See [docs/deployment.md](docs/deployment.md) for free-tier limits, secrets, schedules, and recovery.
