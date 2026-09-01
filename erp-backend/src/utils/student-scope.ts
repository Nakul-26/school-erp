import type { JwtPayload } from '../types';

const STUDENT_ROLES = new Set(['student', 'Student']);
const PARENT_ROLES = new Set(['parent', 'Parent', 'guardian', 'Guardian']);
const PRIVILEGED_ROLES = new Set([
  'super_admin',
  'Super Admin',
  'admin',
  'Admin',
  'principal',
  'Principal',
  'hod',
  'HOD',
  'role-super-admin',
]);

function rolesFor(user: JwtPayload): string[] {
  return user.roles || (user.role ? [user.role] : []);
}

// True only when the user's sole capacity is "student" - a Principal who
// also happens to carry a student role (rare, but roles can stack) still
// gets full access rather than being scoped down to their own record.
export function isStudentOnly(user: JwtPayload): boolean {
  const roles = rolesFor(user);
  return roles.some((role) => STUDENT_ROLES.has(role)) && !roles.some((role) => PRIVILEGED_ROLES.has(role));
}

export function isParentOnly(user: JwtPayload): boolean {
  const roles = rolesFor(user);
  return roles.some((role) => PARENT_ROLES.has(role)) && !roles.some((role) => PRIVILEGED_ROLES.has(role));
}

// Resolves the logged-in student's own student_id + current section_id.
export async function getOwnStudentInfo(db: D1Database, user: JwtPayload): Promise<{ id: string; section_id: string | null } | null> {
  const student = await db.prepare(`
    SELECT s.id, se.section_id
    FROM students s
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
    WHERE s.user_id = ? AND s.institution_id = ? AND s.is_active = 1
    LIMIT 1
  `).bind(user.sub, user.institution_id).first<{ id: string; section_id: string | null }>();

  return student || null;
}

// Resolves a section_id for `studentId`, but only if the logged-in parent
// user actually has a guardian relationship to that student - so a parent
// can't view another family's child's timetable by guessing a student id.
export async function getGuardianChildSectionId(db: D1Database, user: JwtPayload, studentId: string): Promise<string | null> {
  const row = await db.prepare(`
    SELECT se.section_id
    FROM guardians g
    JOIN students s ON g.student_id = s.id
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.is_active = 1
    WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1
      AND s.is_active = 1 AND s.institution_id = ?
    LIMIT 1
  `).bind(user.sub, studentId, user.institution_id).first<{ section_id: string | null }>();

  return row ? row.section_id : null;
}

// True only if the logged-in parent has a real guardian link to studentId -
// for self-service reads that need a yes/no rather than the section_id.
export async function isGuardianOf(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT 1
    FROM guardians g
    JOIN students s ON g.student_id = s.id
    WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1
      AND s.is_active = 1 AND s.institution_id = ?
    LIMIT 1
  `).bind(user.sub, studentId, user.institution_id).first();

  return Boolean(row);
}

// Common self-service guard: is the caller either this exact student, or a
// parent/guardian with a real link to them? Used to scope down a route that
// would otherwise require staff-level view/manage permissions, without
// granting the student/parent that broader permission.
export async function isOwnStudentOrGuardianOf(db: D1Database, user: JwtPayload, studentId: string): Promise<boolean> {
  if (isStudentOnly(user)) {
    const own = await getOwnStudentInfo(db, user);
    return own?.id === studentId;
  }
  if (isParentOnly(user)) {
    return isGuardianOf(db, user, studentId);
  }
  return false;
}
