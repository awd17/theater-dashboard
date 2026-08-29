# Deployment and ingestion runbook

## Architecture

- Cloudflare Workers Free hosts the Nuxt app (`cloudflare-module`) with Static Assets and one D1 database.
- GitHub Actions deploys on `main` and runs source-aware ingest schedules.
- Bun ingest CLIs fetch/parse externally, then write through authenticated `/rpc` ingest procedures into D1.
- Firecrawl is an optional hard-capped fallback for The Numbers when native fetch is blocked.

## Free-tier controls

Stay on Workers Free so Cloudflare usage fails closed instead of billing overages:

| Resource | Free limit |
| --- | --- |
| Worker requests | 100,000 / day |
| Worker CPU | 10 ms / request |
| D1 rows read | 5,000,000 / day |
| D1 rows written | 100,000 / day |
| D1 storage | 5 GB total |
| Static assets | free / unlimited |

Private GitHub Actions minutes: 2,000 / month on Free. Configure a GitHub Actions budget with **Stop usage when budget limit is reached**. Do not use larger runners.

Do not enable Workers Paid, Queues, Workflows, R2, KV, Browser Run, or Durable Objects unless measured need appears.

## Live deployment

- Worker URL: `https://theater-industry-dashboard.augdrak17.workers.dev`
- D1 database id: `481d573e-4dc5-448c-b9fd-8984f26a5d74`

## Required secrets

### Cloudflare Worker

```bash
bunx wrangler secret put INGEST_TOKEN
```

### GitHub repository secrets

Create a Cloudflare API token with **Workers Scripts Edit** and **D1 Edit** for account `7f31ebc0762b0e617ad0cac2a92e66b3`, then set:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo awd17/theater-dashboard
gh secret set SEC_EDGAR_CONTACT --repo awd17/theater-dashboard
```

| Secret | Purpose | Status |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploy + remote D1 migrations | still required |
| `CLOUDFLARE_ACCOUNT_ID` | Account scoping for Wrangler | set |
| `INGEST_REMOTE_URL` | `https://theater-industry-dashboard.augdrak17.workers.dev` | set |
| `INGEST_TOKEN` | Same value as the Worker secret | set |
| `TMDB_API_KEY` | Weekly outlook ingest | set |
| `SEC_EDGAR_CONTACT` | SEC fair-access contact email | still required |
| `FIRECRAWL_API_KEY` | Optional The Numbers fallback | set |

Use separate least-privilege Cloudflare tokens for deploy versus day-to-day dashboard login when practical.

## Local commands

```bash
bun install
bun run db:migrate
bun run dev
bun run preview:worker
bun run deploy:dry-run
bun run deploy
bun run db:migrate:remote
```

Local ingest (writes local D1):

```bash
bun run ingest:the-numbers --daily-from 2026-08-20 --daily-to 2026-08-26
bun run ingest:tmdb --days 180
bun run ingest:sec
```

Remote ingest (writes production D1 through oRPC):

```bash
export INGEST_REMOTE_URL=https://theater-industry-dashboard.augdrak17.workers.dev
export INGEST_TOKEN=...
bun run ingest:the-numbers --daily-from 2026-08-20 --daily-to 2026-08-26 --force-refresh
```

## Schedules

| Cadence | Cron (UTC) | Job |
| --- | --- | --- |
| Daily | `15 12 * * *` | Last 7 box-office dates |
| Weekly | `30 13 * * 1` | Current + prior market years, TMDB 180-day outlook |
| Weekdays | `0 14 * * 1-5` | SEC company facts + recent 10-Q/10-K filing-text metrics |
| Yearly | `0 15 2 1 *` | Completed prior market year |

Manual backfills: Actions → Ingest → Run workflow. Choose a job and optional date/year overrides.

## SEC coverage notes

- Supported now: companyfacts JSON plus filing-text extraction from recent `10-Q` and `10-K` documents where configured table/narrative parsers match.
- Not implemented: `8-K` earnings-release exhibit parsing. Weekday companyfacts/submissions polling still refreshes currently supported metrics within about one business day of filing.

## Recovery

- Failed ingest leaves prior good D1 rows in place (idempotent upserts; no full wipe).
- Firecrawl credit exhaustion fails only the affected The Numbers job; last good data remains.
- Re-run the same ingest command or workflow_dispatch job; conflict keys make reruns safe.
- If an ingest run is stuck as `running`, finish or delete that `ingest_run` row before starting another job for the same source.
- Worker/D1 free-limit hits return errors until the next UTC day reset; traffic and ingest will pause rather than bill.

## Smoke checks after deploy

1. `GET /rpc` health via the app or `curl` against the Worker health procedure.
2. Confirm operators / industry pages render non-empty after the first successful ingest.
3. Confirm GitHub ingest workflow logs show `fetch={native:...,cache:...,firecrawl:...}` for The Numbers jobs.
