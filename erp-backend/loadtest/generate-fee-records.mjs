/**
 * Load-test fixture generator: creates N synthetic student_fee_records rows
 * directly via SQL (bypassing the API) so the payment-burst scenario has
 * enough distinct targets to hit without needing thousands of real students.
 *
 * Writes a .sql file that gets applied with:
 *   npx wrangler d1 execute erp-db --local --file=loadtest/out/fee-records.sql
 *
 * Usage: node loadtest/generate-fee-records.js <studentIdsJsonPath> <count> <outSqlPath>
 */
import fs from 'fs';

const [, , studentIdsPath, countArg, outPath] = process.argv;
const count = parseInt(countArg, 10) || 2000;

const studentIds = JSON.parse(fs.readFileSync(studentIdsPath, 'utf8'));
if (!studentIds.length) {
  console.error('No student ids provided');
  process.exit(1);
}

const INSTITUTION_ID = 'inst-greenwood';
const ACADEMIC_YEAR_ID = '7fd13539-71c8-4add-a515-f220a41bbbc0';
const COURSE_ID = 'prog-grade-9';

function uuid() {
  return 'lt-' + Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10)).join('-').slice(0, 36);
}

const lines = ['PRAGMA foreign_keys = ON;'];
const ids = [];
for (let i = 0; i < count; i++) {
  const id = uuid() + '-' + i;
  const studentId = studentIds[i % studentIds.length];
  const feeType = `LoadTest-${i}`;
  ids.push({ id, student_id: studentId });
  lines.push(
    `INSERT INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_type, total_amount, paid_amount, status, created_by, updated_by) VALUES ('${id}', '${INSTITUTION_ID}', '${studentId}', '${ACADEMIC_YEAR_ID}', '${COURSE_ID}', 1, '${feeType}', 100000, 0, 'UNPAID', 'user-admin', 'user-admin');`
  );
}

fs.writeFileSync(outPath, lines.join('\n') + '\n');
fs.writeFileSync(outPath.replace(/\.sql$/, '.ids.json'), JSON.stringify(ids));
console.log(`Wrote ${count} fee record inserts to ${outPath}`);
