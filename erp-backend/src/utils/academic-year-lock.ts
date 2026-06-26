import { D1Database } from '@cloudflare/workers-types';

/**
 * Checks if an academic year status is Locked or Archived
 */
export async function isYearLockedOrArchived(db: D1Database, academicYearId: string): Promise<boolean> {
  const result = await db.prepare(
    "SELECT status FROM academic_years WHERE id = ? AND is_active = 1"
  ).bind(academicYearId).first<{ status: string }>();
  
  if (!result) return false;
  return result.status === 'Locked' || result.status === 'Archived';
}

/**
 * Checks if the academic year associated with a section is Locked or Archived
 */
export async function isSectionYearLockedOrArchived(db: D1Database, sectionId: string): Promise<boolean> {
  const section = await db.prepare(
    "SELECT academic_year_id FROM sections WHERE id = ? AND is_active = 1"
  ).bind(sectionId).first<{ academic_year_id: string }>();
  
  if (!section) return false;
  return isYearLockedOrArchived(db, section.academic_year_id);
}

/**
 * Checks if the academic year associated with an exam is Locked or Archived
 */
export async function isExamYearLockedOrArchived(db: D1Database, examId: string): Promise<boolean> {
  const exam = await db.prepare(
    "SELECT academic_year_id FROM exams WHERE id = ?"
  ).bind(examId).first<{ academic_year_id: string }>();
  
  if (!exam) return false;
  return isYearLockedOrArchived(db, exam.academic_year_id);
}
