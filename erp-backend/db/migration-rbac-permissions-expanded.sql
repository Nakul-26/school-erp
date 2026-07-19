-- Expanded permission catalog for RBAC-hardened modules.
-- Idempotent: safe to run multiple times against local or remote D1.

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm-communication-access', 'communication.access', 'Access the communication workspace'),
  ('perm-announcements-view', 'announcements.view', 'View notice board announcements'),
  ('perm-announcements-manage', 'announcements.manage', 'Create, update, and delete notice board announcements'),
  ('perm-messaging-access', 'messaging.access', 'Use direct messaging'),
  ('perm-broadcasts-manage', 'broadcasts.manage', 'Create and manage broadcast messages'),
  ('perm-reports-access', 'reports.access', 'Access analytics and reports workspace'),
  ('perm-reports-attendance', 'reports.attendance', 'View student attendance reports'),
  ('perm-reports-teacher', 'reports.teacher', 'View teacher workload reports'),
  ('perm-reports-fees', 'reports.fees', 'View finance and fee collection reports'),
  ('perm-payroll-view', 'payroll.view', 'View payroll and payslip information'),
  ('perm-payroll-manage', 'payroll.manage', 'Manage salary structures and payroll runs'),
  ('perm-leave-apply', 'leave.apply', 'Apply for leave'),
  ('perm-leave-manage', 'leave.manage', 'Manage leave types and balances'),
  ('perm-leave-review', 'leave.review', 'Review staff leave applications'),
  ('perm-student-leave-review', 'student_leave.review', 'Review student leave applications'),
  ('perm-exams-view', 'exams.view', 'View exams and results'),
  ('perm-exams-manage', 'exams.manage', 'Create and manage exams'),
  ('perm-results-manage', 'results.manage', 'Enter and manage student results');

-- All-powerful administrative roles.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage',
  'reports.access', 'reports.attendance', 'reports.teacher', 'reports.fees',
  'payroll.view', 'payroll.manage',
  'leave.apply', 'leave.manage', 'leave.review', 'student_leave.review',
  'exams.view', 'exams.manage', 'results.manage',
  'finance.access', 'fees.view', 'fees.collect'
)
WHERE LOWER(r.name) IN ('super admin', 'super_admin', 'admin', 'principal');

-- Academic managers.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage',
  'reports.access', 'reports.attendance', 'reports.teacher', 'reports.fees',
  'leave.manage', 'leave.review', 'student_leave.review',
  'exams.view', 'exams.manage', 'results.manage',
  'finance.access', 'fees.view'
)
WHERE LOWER(r.name) IN ('hod');

-- Teachers retain scoped access in the backend for students, attendance, announcements, broadcasts, and reports.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage',
  'reports.access', 'reports.attendance',
  'leave.apply', 'student_leave.review',
  'exams.view', 'exams.manage', 'results.manage',
  'payroll.view'
)
WHERE LOWER(r.name) IN ('teacher');

-- Finance staff.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'finance.access', 'fees.view', 'fees.collect',
  'communication.access', 'announcements.view', 'messaging.access',
  'reports.access', 'reports.fees',
  'leave.apply'
)
WHERE LOWER(r.name) IN ('accountant');

-- Student and guardian portal users.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'finance.access', 'fees.view',
  'communication.access', 'announcements.view', 'messaging.access',
  'leave.apply',
  'exams.view'
)
WHERE LOWER(r.name) IN ('student', 'parent', 'guardian');

-- Supplemental module-level permissions for pages that still have role-scoped RBAC.
INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm-dashboard-access', 'dashboard.access', 'Access the dashboard'),
  ('perm-profile-access', 'profile.access', 'Access own profile'),
  ('perm-notifications-view', 'notifications.view', 'View notifications'),
  ('perm-calendar-view', 'calendar.view', 'View academic calendar'),
  ('perm-calendar-manage', 'calendar.manage', 'Manage academic calendar'),
  ('perm-timetable-view', 'timetable.view', 'View timetable'),
  ('perm-timetable-manage', 'timetable.manage', 'Manage timetable'),
  ('perm-teacher-attendance-view', 'teacher_attendance.view', 'View teacher attendance'),
  ('perm-teacher-attendance-manage', 'teacher_attendance.manage', 'Manage teacher attendance'),
  ('perm-homework-view', 'homework.view', 'View homework'),
  ('perm-homework-manage', 'homework.manage', 'Create and manage homework'),
  ('perm-library-access', 'library.access', 'Access library workspace'),
  ('perm-library-manage', 'library.manage', 'Manage library records'),
  ('perm-transport-view', 'transport.view', 'View transport assignments'),
  ('perm-transport-manage', 'transport.manage', 'Manage transport routes, assignments, and billing'),
  ('perm-certificates-view', 'certificates.view', 'View certificates'),
  ('perm-certificates-manage', 'certificates.manage', 'Create and manage certificates'),
  ('perm-admissions-view', 'admissions.view', 'View admissions'),
  ('perm-admissions-manage', 'admissions.manage', 'Manage inquiries and admissions'),
  ('perm-approvals-view', 'approvals.view', 'View approvals inbox'),
  ('perm-approvals-manage', 'approvals.manage', 'Review and manage approvals'),
  ('perm-setup-manage', 'setup.manage', 'Manage school setup'),
  ('perm-data-tools-manage', 'data_tools.manage', 'Use import, export, and data tools'),
  ('perm-visitors-manage', 'visitors.manage', 'Manage visitor records'),
  ('perm-assets-manage', 'assets.manage', 'Manage school assets'),
  ('perm-alumni-manage', 'alumni.manage', 'Manage alumni records');

-- Administrative roles get all supplemental module permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.access', 'profile.access', 'notifications.view',
  'calendar.view', 'calendar.manage', 'timetable.view', 'timetable.manage',
  'teacher_attendance.view', 'teacher_attendance.manage',
  'homework.view', 'homework.manage',
  'library.access', 'library.manage',
  'transport.view', 'transport.manage',
  'certificates.view', 'certificates.manage',
  'admissions.view', 'admissions.manage',
  'approvals.view', 'approvals.manage',
  'setup.manage', 'data_tools.manage',
  'visitors.manage', 'assets.manage', 'alumni.manage'
)
WHERE LOWER(r.name) IN ('super admin', 'super_admin', 'admin', 'principal');

-- HOD gets academic operations, reporting-adjacent modules, and setup-ish tools.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.access', 'profile.access', 'notifications.view',
  'calendar.view', 'calendar.manage', 'timetable.view', 'timetable.manage',
  'teacher_attendance.view', 'teacher_attendance.manage',
  'homework.view', 'homework.manage',
  'library.access', 'transport.view',
  'certificates.view', 'certificates.manage',
  'admissions.view', 'admissions.manage',
  'approvals.view', 'approvals.manage',
  'setup.manage', 'visitors.manage', 'alumni.manage'
)
WHERE LOWER(r.name) IN ('hod');

-- Teachers get instructional and self-service module permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.access', 'profile.access', 'notifications.view',
  'calendar.view', 'timetable.view',
  'homework.view', 'homework.manage',
  'library.access',
  'certificates.view', 'certificates.manage'
)
WHERE LOWER(r.name) IN ('teacher');

-- Finance staff get portal access, transport billing, and finance reports.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.access', 'profile.access', 'notifications.view',
  'transport.view', 'transport.manage',
  'library.access'
)
WHERE LOWER(r.name) IN ('accountant');

-- Student and guardian portal users get safe self-service permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.access', 'profile.access', 'notifications.view',
  'calendar.view', 'timetable.view',
  'homework.view', 'library.access',
  'transport.view'
)
WHERE LOWER(r.name) IN ('student', 'parent', 'guardian');
