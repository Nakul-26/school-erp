-- Seed data v2 for UUID-based schema with Roles, Permissions, and Multi-tenancy

-- 1. Create Institution
INSERT OR REPLACE INTO institutions (id, name, address, phone, email, logo, institution_type, is_active) 
VALUES ('inst-oxford', 'Oxford Academy', '123 Education Lane', '555-0100', 'contact@oxford.edu', null, 'engineering_college', 1);

-- 2. Create Roles
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-super-admin', 'Super Admin', 'Full access to all institutions');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-principal', 'Principal', 'Administrative head of the institution');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-hod', 'HOD', 'Head of Department');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-teacher', 'Teacher', 'Academic instruction and attendance marking');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-student', 'Student', 'Student access to grades and schedules');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-accountant', 'Accountant', 'Fee collection and financial tracking');

-- 3. Create Permissions
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-user-manage', 'user.manage', 'Create, update, and delete users');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-inst-manage', 'institution.manage', 'Manage institution profile and settings');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-acad-manage', 'academic.manage', 'Manage courses, sections, and subjects');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-audit-view', 'audit.view', 'View system audit logs');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-student-view', 'student.view', 'View student details');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-student-create', 'student.create', 'Add new students');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-student-edit', 'student.edit', 'Modify student profiles');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-student-delete', 'student.delete', 'Remove student profiles');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-view', 'teacher.view', 'View teacher profiles');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-create', 'teacher.create', 'Add new teachers');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-edit', 'teacher.edit', 'Modify teacher profiles');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-delete', 'teacher.delete', 'Remove teacher profiles');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-att-mark', 'attendance.mark', 'Mark student attendance');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-att-view', 'attendance.view', 'View attendance records');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-fees-collect', 'fees.collect', 'Collect student fees');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-fees-view', 'fees.view', 'View fee structures and payments');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-finance-access', 'finance.access', 'Access the finance workspace');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-communication-access', 'communication.access', 'Access the communication workspace');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-announcements-view', 'announcements.view', 'View notice board announcements');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-announcements-manage', 'announcements.manage', 'Create, update, and delete notice board announcements');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-messaging-access', 'messaging.access', 'Use direct messaging');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-broadcasts-manage', 'broadcasts.manage', 'Create and manage broadcast messages');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-reports-access', 'reports.access', 'Access analytics and reports workspace');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-reports-attendance', 'reports.attendance', 'View student attendance reports');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-reports-teacher', 'reports.teacher', 'View teacher workload reports');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-reports-fees', 'reports.fees', 'View finance and fee collection reports');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-payroll-view', 'payroll.view', 'View payroll and payslip information');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-payroll-manage', 'payroll.manage', 'Manage salary structures and payroll runs');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-leave-apply', 'leave.apply', 'Apply for leave');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-leave-manage', 'leave.manage', 'Manage leave types and balances');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-leave-review', 'leave.review', 'Review staff leave applications');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-student-leave-review', 'student_leave.review', 'Review student leave applications');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-exams-view', 'exams.view', 'View exams and results');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-exams-manage', 'exams.manage', 'Create and manage exams');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-results-manage', 'results.manage', 'Enter and manage student results');

-- 4. Role Permissions Mapping
-- Super Admin / Principal gets all permissions
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-user-manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-inst-manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-acad-manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-audit-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-student-create');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-student-edit');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-student-delete');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-teacher-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-teacher-create');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-teacher-edit');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-teacher-delete');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-att-mark');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-fees-collect');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-super-admin', 'perm-finance-access');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-super-admin', id FROM permissions WHERE code IN ('communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage', 'reports.access', 'reports.attendance', 'reports.teacher', 'reports.fees', 'payroll.view', 'payroll.manage', 'leave.apply', 'leave.manage', 'leave.review', 'student_leave.review', 'exams.view', 'exams.manage', 'results.manage');

INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-principal', permission_id FROM role_permissions WHERE role_id = 'role-super-admin';

-- HOD gets user/academic/student/teacher viewing and editing, but not deleting
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-acad-manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-student-create');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-student-edit');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-teacher-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-att-mark');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-hod', 'perm-finance-access');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-hod', id FROM permissions WHERE code IN ('communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage', 'reports.access', 'reports.attendance', 'reports.teacher', 'reports.fees', 'leave.manage', 'leave.review', 'student_leave.review', 'exams.view', 'exams.manage', 'results.manage', 'fees.view');

-- Teacher gets attendance and student/teacher viewing
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-teacher-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-att-mark');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-teacher', id FROM permissions WHERE code IN ('communication.access', 'announcements.view', 'announcements.manage', 'messaging.access', 'broadcasts.manage', 'reports.access', 'reports.attendance', 'leave.apply', 'student_leave.review', 'exams.view', 'exams.manage', 'results.manage', 'payroll.view');

-- Student gets self records view (mapped in business logic, but view perms help)
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-finance-access');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-student', id FROM permissions WHERE code IN ('communication.access', 'announcements.view', 'messaging.access', 'leave.apply', 'exams.view');

-- Accountant gets fees collection and view
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-fees-collect');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-finance-access');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-accountant', id FROM permissions WHERE code IN ('communication.access', 'announcements.view', 'messaging.access', 'reports.access', 'reports.fees', 'leave.apply');

-- Supplemental module-level permissions for Access Control visibility.
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-dashboard-access', 'dashboard.access', 'Access the dashboard');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-profile-access', 'profile.access', 'Access own profile');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-notifications-view', 'notifications.view', 'View notifications');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-calendar-view', 'calendar.view', 'View academic calendar');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-calendar-manage', 'calendar.manage', 'Manage academic calendar');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-timetable-view', 'timetable.view', 'View timetable');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-timetable-manage', 'timetable.manage', 'Manage timetable');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-attendance-view', 'teacher_attendance.view', 'View teacher attendance');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-teacher-attendance-manage', 'teacher_attendance.manage', 'Manage teacher attendance');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-homework-view', 'homework.view', 'View homework');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-homework-manage', 'homework.manage', 'Create and manage homework');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-library-access', 'library.access', 'Access library workspace');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-library-manage', 'library.manage', 'Manage library records');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-transport-view', 'transport.view', 'View transport assignments');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-transport-manage', 'transport.manage', 'Manage transport routes, assignments, and billing');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-certificates-view', 'certificates.view', 'View certificates');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-certificates-manage', 'certificates.manage', 'Create and manage certificates');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-admissions-view', 'admissions.view', 'View admissions');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-admissions-manage', 'admissions.manage', 'Manage inquiries and admissions');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-approvals-view', 'approvals.view', 'View approvals inbox');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-approvals-manage', 'approvals.manage', 'Review and manage approvals');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-setup-manage', 'setup.manage', 'Manage school setup');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-data-tools-manage', 'data_tools.manage', 'Use import, export, and data tools');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-visitors-manage', 'visitors.manage', 'Manage visitor records');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-assets-manage', 'assets.manage', 'Manage school assets');
INSERT OR REPLACE INTO permissions (id, code, description) VALUES ('perm-alumni-manage', 'alumni.manage', 'Manage alumni records');

INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-super-admin', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'calendar.view', 'calendar.manage', 'timetable.view', 'timetable.manage', 'teacher_attendance.view', 'teacher_attendance.manage', 'homework.view', 'homework.manage', 'library.access', 'library.manage', 'transport.view', 'transport.manage', 'certificates.view', 'certificates.manage', 'admissions.view', 'admissions.manage', 'approvals.view', 'approvals.manage', 'setup.manage', 'data_tools.manage', 'visitors.manage', 'assets.manage', 'alumni.manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-principal', permission_id FROM role_permissions WHERE role_id = 'role-super-admin';
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-hod', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'calendar.view', 'calendar.manage', 'timetable.view', 'timetable.manage', 'teacher_attendance.view', 'teacher_attendance.manage', 'homework.view', 'homework.manage', 'library.access', 'transport.view', 'certificates.view', 'certificates.manage', 'admissions.view', 'admissions.manage', 'approvals.view', 'approvals.manage', 'setup.manage', 'visitors.manage', 'alumni.manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-teacher', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'calendar.view', 'timetable.view', 'homework.view', 'homework.manage', 'library.access', 'certificates.view', 'certificates.manage');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-accountant', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'transport.view', 'transport.manage', 'library.access');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-student', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'calendar.view', 'timetable.view', 'homework.view', 'library.access', 'transport.view');

-- 5. Create Users (Password: admin123)
-- Admin User (Oxford Principal)
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active) 
VALUES ('user-admin', 'inst-oxford', 'admin', 'admin@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Admin User', 1);

-- Teacher User (Oxford Teacher)
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-teacher', 'inst-oxford', 'smith', 'smith@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Prof. Smith', 1);

-- Student User (Oxford Student)
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-student', 'inst-oxford', 'johndoe', 'john@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'John Doe', 1);

-- 6. User Roles Mapping
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-admin', 'role-principal');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-teacher', 'role-teacher');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-student', 'role-student');

-- 7. Create Academic Year
INSERT OR REPLACE INTO academic_years (id, institution_id, name, start_date, end_date, is_current, is_active)
VALUES ('year-2026', 'inst-oxford', '2026-27', '2026-06-01', '2027-05-31', 1, 1);

-- 8. Create Department
INSERT OR REPLACE INTO departments (id, institution_id, name, code, description, is_active)
VALUES ('dept-cse', 'inst-oxford', 'Computer Science & Engineering Department', 'CSE', 'Department of Computer Science and Engineering', 1);

-- 9. Create Course / Program
INSERT OR REPLACE INTO courses (id, institution_id, department_id, course_code, name, duration_years, is_active) 
VALUES ('prog-cse', 'inst-oxford', 'dept-cse', 'CSE', 'Computer Science & Engineering', 4, 1);

-- 10. Create Section / Class
INSERT OR REPLACE INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, is_active)
VALUES ('sec-cse-a', 'inst-oxford', 'year-2026', 'prog-cse', 'Section A', 1, 1);

-- 11. Create Subject
INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-ds', 'inst-oxford', 'prog-cse', 'CS301', 'Data Structures', 4, 3, 1);
