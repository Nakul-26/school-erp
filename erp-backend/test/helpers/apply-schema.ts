import { applyD1Migrations } from 'cloudflare:test';
// Bundled as a raw string at build time (Vite's `?raw` import) rather than
// read from disk at runtime - the test file runs inside the Workers/miniflare
// sandbox, which doesn't reliably expose the host filesystem via node:fs.
// eslint-disable-next-line import/no-unresolved
import schemaSql from '../../db/schema.sql?raw';

// Splits schema.sql into individual statements. This is a plain ";" split,
// which is safe here only because schema.sql contains no string literal with
// an embedded semicolon (true of every CREATE TABLE/INDEX statement in it).
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

/**
 * Applies db/schema.sql (the full baseline schema) to the isolated D1
 * instance vitest-pool-workers provisions for a test file. Call once per
 * file from `beforeAll` - vitest-pool-workers gives every individual `it()`
 * a fresh storage snapshot taken right after `beforeAll` completes, so
 * writes made by tests never leak between them.
 */
export async function applySchema(db: D1Database): Promise<void> {
  await applyD1Migrations(
    db,
    [{ name: '0000_baseline_schema', queries: splitStatements(schemaSql) }],
    '_test_migrations'
  );
}
