// Shared SQL dump builder used by both the on-demand `/system/backup/export` HTTP route
// and the scheduled BackupDatabaseJob background job - kept in one place so the two paths
// can never drift out of sync on which tables/scoping rules get backed up.

const BACKUP_TABLES = [
  'institutions', 'users', 'roles', 'user_roles', 'permissions', 'role_permissions',
  'academic_years', 'departments', 'courses', 'sections', 'subjects',
  'teachers', 'students', 'guardians', 'academic_calendar', 'timetable_slots',
  'weekly_timetable', 'attendance_sessions', 'student_attendance', 'student_enrollments',
  'exams', 'exam_subjects', 'student_marks', 'teacher_attendance', 'announcements',
  'notifications', 'fee_structures', 'student_fee_records', 'fee_payments', 'fee_receipts'
];

const INSTITUTION_SCOPED_TABLES = new Set([
  'users', 'academic_years', 'departments', 'courses', 'sections', 'subjects', 'teachers',
  'students', 'academic_calendar', 'timetable_slots', 'weekly_timetable', 'attendance_sessions',
  'student_attendance', 'teacher_attendance', 'announcements', 'notifications', 'fee_structures',
  'student_fee_records', 'fee_payments', 'fee_receipts', 'exams', 'exam_subjects', 'student_marks',
]);

export async function buildDatabaseDump(db: D1Database, institutionId: string): Promise<string> {
  const sqlLines: string[] = [];
  sqlLines.push(`-- College ERP Backup SQL Dump`);
  sqlLines.push(`-- Institution ID: ${institutionId}`);
  sqlLines.push(`-- Exported At: ${new Date().toISOString()}`);
  sqlLines.push(`PRAGMA foreign_keys=OFF;`);
  sqlLines.push(`BEGIN TRANSACTION;`);

  for (const table of BACKUP_TABLES) {
    let selectQuery = `SELECT * FROM ${table}`;
    if (table === 'institutions') {
      selectQuery = `SELECT * FROM ${table} WHERE id = '${institutionId}'`;
    } else if (INSTITUTION_SCOPED_TABLES.has(table)) {
      selectQuery = `SELECT * FROM ${table} WHERE institution_id = '${institutionId}'`;
    } else if (table === 'guardians') {
      selectQuery = `SELECT g.* FROM guardians g JOIN students s ON g.student_id = s.id WHERE s.institution_id = '${institutionId}'`;
    } else if (table === 'student_enrollments') {
      selectQuery = `SELECT se.* FROM student_enrollments se JOIN students s ON se.student_id = s.id WHERE s.institution_id = '${institutionId}'`;
    } else if (table === 'user_roles') {
      selectQuery = `SELECT ur.* FROM user_roles ur JOIN users u ON ur.user_id = u.id WHERE u.institution_id = '${institutionId}'`;
    }

    try {
      const { results } = await db.prepare(selectQuery).all<any>();
      if (results && results.length > 0) {
        sqlLines.push(`\n-- Dumping data for table ${table}`);

        let deleteQuery = `DELETE FROM ${table};`;
        if (table === 'institutions') {
          deleteQuery = `DELETE FROM ${table} WHERE id = '${institutionId}';`;
        } else if (INSTITUTION_SCOPED_TABLES.has(table)) {
          deleteQuery = `DELETE FROM ${table} WHERE institution_id = '${institutionId}';`;
        } else if (table === 'guardians') {
          deleteQuery = `DELETE FROM guardians WHERE student_id IN (SELECT id FROM students WHERE institution_id = '${institutionId}');`;
        } else if (table === 'student_enrollments') {
          deleteQuery = `DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM students WHERE institution_id = '${institutionId}');`;
        } else if (table === 'user_roles') {
          deleteQuery = `DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE institution_id = '${institutionId}');`;
        } else if (['roles', 'permissions', 'role_permissions'].includes(table)) {
          deleteQuery = '';
        }

        if (deleteQuery) {
          sqlLines.push(deleteQuery);
        }

        for (const row of results) {
          const colNames = Object.keys(row).join(', ');
          const colValues = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');

          const insertVerb = ['roles', 'permissions', 'role_permissions'].includes(table) ? 'INSERT OR IGNORE' : 'INSERT';
          sqlLines.push(`${insertVerb} INTO ${table} (${colNames}) VALUES (${colValues});`);
        }
      }
    } catch (e: any) {
      sqlLines.push(`-- Failed to dump table ${table}: ${e.message}`);
    }
  }

  sqlLines.push(`\nCOMMIT;`);
  sqlLines.push(`PRAGMA foreign_keys=ON;`);

  return sqlLines.join('\n');
}
