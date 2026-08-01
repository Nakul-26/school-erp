/**
 * Applies any db/migration-*.sql files not yet recorded in the _migrations
 * table. See db/MIGRATIONS.md for the convention this implements.
 *
 * Usage:
 *   node db/run-migrations.js            # local D1 (default)
 *   node db/run-migrations.js --remote   # remote/production D1
 */
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_NAME = 'erp-db';
const repoRoot = join(__dirname, '..');
const remote = process.argv.includes('--remote');
const scopeFlag = remote ? '--remote' : '--local';

function run(cmd) {
  return execSync(cmd, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'inherit'] }).toString();
}

function queryJson(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const out = run(`npx wrangler d1 execute ${DB_NAME} ${scopeFlag} --command "${escaped}" --json`);
  const parsed = JSON.parse(out);
  return parsed[0]?.results || [];
}

function main() {
  const applied = new Set(queryJson('SELECT filename FROM _migrations').map((r) => r.filename));

  const pending = readdirSync(__dirname)
    .filter((f) => f.startsWith('migration-') && f.endsWith('.sql'))
    .sort()
    .filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`No pending migrations (${scopeFlag}).`);
    return;
  }

  console.log(`Applying ${pending.length} pending migration(s) (${scopeFlag}):`);
  for (const file of pending) {
    console.log(`  -> ${file}`);
    run(`npx wrangler d1 execute ${DB_NAME} ${scopeFlag} --file=db/${file}`);
    run(`npx wrangler d1 execute ${DB_NAME} ${scopeFlag} --command "INSERT OR IGNORE INTO _migrations (filename) VALUES ('${file}')"`);
  }
  console.log('Done.');
}

main();
