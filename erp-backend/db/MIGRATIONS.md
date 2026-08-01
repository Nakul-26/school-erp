# Database migrations

`schema.sql` is the **authoritative, consolidated schema** - it's what a fresh
environment runs to get the complete, current database. It is *not* meant to
be hand-diffed against the historical `migration-*.sql` files anymore.

## Why this changed

Before 2026-07-31, `schema.sql` was the original base schema and 34
`migration-*.sql` files were meant to be layered on top of it by hand, in
order, with no record of what had actually been applied where. In practice
`schema.sql` was never updated after most of those migrations were written, so
it drifted ~35 tables behind what the app actually needed - a fresh checkout
running only `db:execute` got an incomplete database, and at least one
migration (`migration-notification-center-audit.sql`) would fail outright with
"duplicate column" if replayed against a `schema.sql`-provisioned database that
already had the columns it tries to add.

`schema.sql` was regenerated on 2026-07-31 by introspecting a database that
had every migration file applied in sequence, so it now reflects reality. The
old `migration-*.sql` files are kept for history but are pre-recorded as
"already applied" at the bottom of `schema.sql` (see the `_migrations` table),
so they will never be re-run against a database created from this file.

## The convention going forward

- `schema.sql` + `_migrations` table = the source of truth for "what's already
  applied."
- New schema changes are still added as a new `db/migration-<name>.sql` file
  (small, focused, idempotent - use `CREATE TABLE IF NOT EXISTS` /
  `CREATE INDEX IF NOT EXISTS`; SQLite has no `ADD COLUMN IF NOT EXISTS`, so
  guard column additions by checking `pragma_table_info` first if a table
  might already have the column on some environments).
- Also fold the same change into `schema.sql` directly, so a fresh environment
  doesn't need the migration file at all (schema.sql should always represent
  the fully-migrated end state).
- Run `node db/run-migrations.js` (or `npm run db:migrate`) after pulling
  changes that add a new migration file - it applies only files not yet
  recorded in `_migrations` and then records them. Use `--remote` for the
  production database.

## Setup order for a fresh environment

```bash
npm run db:execute      # schema.sql (includes the historical migration baseline)
npm run db:migrate      # applies anything added after the last schema.sql update
npm run seed-school     # base data seed
```
