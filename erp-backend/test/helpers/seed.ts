// Minimal fixture builders used by integration tests. These write directly
// via db.prepare() rather than going through service/repository layers, so a
// test failure in the code under test can never be masked by a bug in setup
// code that happens to share the same repository.

export async function seedInstitution(db: D1Database, id: string): Promise<void> {
  await db.prepare(`INSERT INTO institutions (id, name) VALUES (?, ?)`).bind(id, 'Test Institution').run();
}

export async function seedUser(db: D1Database, id: string, institutionId: string): Promise<void> {
  await db.prepare(`
    INSERT INTO users (id, institution_id, username, email, password_hash, name)
    VALUES (?, ?, ?, ?, 'x', 'Test User')
  `).bind(id, institutionId, `user-${id}`, `${id}@example.com`).run();
}

export async function seedAcademicYear(db: D1Database, id: string, institutionId: string): Promise<void> {
  await db.prepare(`
    INSERT INTO academic_years (id, institution_id, name, start_date, end_date)
    VALUES (?, ?, '2026-2027', '2026-06-01', '2027-04-30')
  `).bind(id, institutionId).run();
}

export async function seedCourse(db: D1Database, id: string, institutionId: string): Promise<void> {
  await db.prepare(`
    INSERT INTO courses (id, institution_id, course_code, name, duration_years)
    VALUES (?, ?, 'CS', 'Computer Science', 4)
  `).bind(id, institutionId).run();
}

export async function seedStudent(db: D1Database, id: string, institutionId: string, admissionNumber: string): Promise<void> {
  await db.prepare(`
    INSERT INTO students (id, institution_id, admission_number, first_name, last_name)
    VALUES (?, ?, ?, 'Test', 'Student')
  `).bind(id, institutionId, admissionNumber).run();
}

export async function seedStudentFeeRecord(
  db: D1Database,
  id: string,
  institutionId: string,
  studentId: string,
  academicYearId: string,
  courseId: string,
  totalAmount: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO student_fee_records (
      id, institution_id, student_id, academic_year_id, course_id, year_number, fee_type, total_amount
    ) VALUES (?, ?, ?, ?, ?, 1, 'Tuition Fee', ?)
  `).bind(id, institutionId, studentId, academicYearId, courseId, totalAmount).run();
}
