# Reel Return

Reel Return is a dashboard for the U.S. theatrical exhibition industry. It is for investors, analysts, and anyone who wants to understand how movie theaters are doing — not a place to pick tonight’s film.

The site answers a few practical questions:

- How healthy is domestic box office right now, and how does it compare with last year and 2019?
- Which public theater chains — AMC, Cinemark, and Marcus — are filling seats versus raising spend per patron?
- Is a chain’s revenue translating into cash after debt, leases, and capital spending?
- Does the upcoming film slate look busy or thin?

Four pages cover that:

| Page | What it shows |
| --- | --- |
| **Industry** | Domestic box office, year-over-year growth, recovery versus 2019, and distributor mix |
| **Operators** | Side-by-side theater-chain operating metrics |
| **Companies** | One chain at a time: attendance, revenue per patron, and financial health |
| **Outlook** | Count of upcoming U.S. theatrical releases, not box-office forecasts |

Numbers come from domestic box office, operator SEC filings, and TMDB theatrical supply.

## Development

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

Local ingest:

```bash
bun run ingest:the-numbers --daily-from 2026-08-20 --daily-to 2026-08-26
bun run ingest:tmdb --days 180
bun run ingest:sec
```

## Deploy

Production runs on Cloudflare Workers Free with scheduled ingestion in GitHub Actions.

See [docs/deployment.md](docs/deployment.md) for free-tier limits, secrets, schedules, and recovery.
