# Theater Industry Dashboard

Nuxt 4 SaaS app with oRPC, Drizzle, and Cloudflare D1.

```bash
bun install
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
