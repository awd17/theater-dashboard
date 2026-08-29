## Goal

Keep the application explicit, local-first, and easy to reason about.

The repository is the source of truth. Prefer clear architecture, strong types, schemas, and executable checks over implicit behavior, dashboard configuration, comments, or conventions that exist only in someone's head.

Do the extra work to implement things cleanly instead of documenting or justifying a workaround. Avoid commenting at all costs, the code should be easily understandable by reading it - not comments. 

## Stack
(Install as needed as project grows)

* Nuxt 4 + Vue 3
* TypeScript with strict checking
* Tailwind CSS
* shadcn-vue
* bun
* oRPC
* Zod
* Drizzle ORM
* Cloudflare D1
* Better Auth
* Cloudflare Workers
* Wrangler
* Vitest
* Playwright

## Architecture

### UI

Use Vue and Nuxt conventions.

* `ref()` for local mutable state
* `computed()` for derived state
* `useState()` for simple shared client state
* Pinia only when a substantial client-side subsystem needs its own store

Do not duplicate derived state.

Do not create global stores for server data.

### Server data

Use oRPC for application client/server communication.

Do not add ad-hoc API routes or raw client `fetch()` calls when the operation belongs in the application's RPC layer.

Use Zod at external boundaries to define valid runtime data.

Keep business logic separate from transport code when it is substantial enough to be reused or tested independently.

### Database

Drizzle schema files are the source of truth for the database structure.

Use D1:

* local D1/SQLite-compatible storage during development
* Cloudflare D1 in production

Database changes must begin in the Drizzle schema and produce committed migrations.

Do not make schema changes manually through a dashboard.

### Auth

Use Better Auth.

Keep auth configuration and schema behavior in the repository wherever possible.

### Infrastructure

Use Cloudflare Workers for production hosting.

Use Wrangler for provisioning, configuration, migrations, and deployment whenever possible.

Prefer CLI-controlled or code-defined infrastructure over dashboard-only configuration.

Add Cloudflare services only when needed:

* R2: file/object storage
* Queues: asynchronous background jobs
* Workflows: durable multi-step jobs
* KV: cache or simple distributed key/value data
* Durable Objects: realtime/stateful coordination

Do not introduce infrastructure because it might be useful later.

## Code Quality

### No comments

Do not add comments to application code.

Code must explain itself through naming, types, schemas, structure, and appropriate abstractions.

Never use a comment to justify a workaround, unusual implementation, duplicated logic, or technical debt. Fix the underlying design instead.

If code is difficult to understand without a comment, refactor it until the intent is clear from the code itself.

### Prefer explicitness

Prefer:

* schemas over assumptions
* types over loosely shaped objects
* named functions over clever expressions
* direct data flow over synchronization logic
* conventional project structure over custom abstractions
* one obvious implementation path over multiple competing patterns

Avoid unnecessary abstraction layers.

### Correctness

Do not use `any` to bypass the type system.

Do not suppress errors merely to make checks pass.

Fix root causes rather than adding compatibility hacks or defensive workarounds unless the underlying uncertainty is unavoidable.

## Verification

Before considering work complete:

1. Run type checking and linting.
2. Run relevant Vitest tests.
3. Run relevant Playwright tests for user-facing behavior.
4. Verify visual changes by taking a screenshot. 
5. Verify database changes locally before applying remote migrations.
6. Ensure development does not depend on production resources unless explicitly requested.
