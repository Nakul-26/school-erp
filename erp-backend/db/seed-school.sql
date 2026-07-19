-- Seed data for School ERP testing (School-focused context instead of College)
-- Greenwood High School

PRAGMA foreign_keys = OFF;

-- Clear existing data in correct dependency order
DELETE FROM payslips;
DELETE FROM payroll_runs;
DELETE FROM salary_structures;
DELETE FROM fee_installments;
DELETE FROM fee_concessions;
DELETE FROM student_leave_applications;
DELETE FROM homework;
DELETE FROM admission_applications;
DELETE FROM admission_inquiries;
DELETE FROM grade_scales;
DELETE FROM leave_applications;
DELETE FROM leave_balances;
DELETE FROM leave_types;
DELETE FROM approvals;
DELETE FROM academic_year_rollover_logs;
DELETE FROM system_settings;
DELETE FROM teaching_allocations;
DELETE FROM subject_assessments;
DELETE FROM subject_lesson_plans;
DELETE FROM notes;
DELETE FROM documents;
DELETE FROM teacher_subject_assignments;
DELETE FROM guardians;
DELETE FROM fee_receipts;
DELETE FROM fee_payments;
DELETE FROM student_fee_records;
DELETE FROM fee_structures;
DELETE FROM notifications;
DELETE FROM announcements;
DELETE FROM teacher_attendance;
DELETE FROM student_marks;
DELETE FROM exam_subjects;
DELETE FROM exams;
DELETE FROM student_enrollments;
DELETE FROM student_attendance;
DELETE FROM attendance_sessions;
DELETE FROM weekly_timetable;
DELETE FROM timetable_slots;
DELETE FROM academic_calendar;
DELETE FROM sections;
DELETE FROM subjects;
DELETE FROM courses;
DELETE FROM departments;
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM academic_years;
DELETE FROM user_roles;
DELETE FROM users;
DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles;
DELETE FROM audit_logs;
DELETE FROM institutions;


-- 1. Create Institution
INSERT OR REPLACE INTO institutions (id, name, address, phone, email, logo, institution_type, is_active) 
VALUES ('inst-greenwood', 'Greenwood High School', '77 Pinecrest Boulevard', '555-0200', 'info@greenwood.edu', null, 'school', 1);

-- 2. Create Roles (Standard ERP Roles)
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-super-admin', 'Super Admin', 'Full access to all institutions');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-principal', 'Principal', 'Administrative head of the school');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-hod', 'HOD', 'Head of Department / Academic Coordinator');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-teacher', 'Teacher', 'Academic instruction and attendance marking');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-student', 'Student', 'Student access to grades and schedules');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-accountant', 'Accountant', 'Fee collection and financial tracking');
INSERT OR REPLACE INTO roles (id, name, description) VALUES ('role-parent', 'Parent', 'Guardian/Parent access to child records');

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

-- Student gets self records view
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

-- Parent gets child records view
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-parent', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-parent', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-parent', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-parent', id FROM permissions WHERE code IN ('finance.access', 'communication.access', 'announcements.view', 'messaging.access', 'leave.apply', 'exams.view');

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
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) SELECT 'role-parent', id FROM permissions WHERE code IN ('dashboard.access', 'profile.access', 'notifications.view', 'calendar.view', 'timetable.view', 'homework.view', 'library.access', 'transport.view');

-- 5. Create Users (Password: admin123)
-- Admin User (Principal)
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active) 
VALUES ('user-admin', 'inst-greenwood', 'admin', 'admin@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Principal Greenwood', 1);

-- Teacher Users
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-smith', 'inst-greenwood', 'smith', 'smith@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Sarah Smith', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-jones', 'inst-greenwood', 'jones', 'jones@greenwood.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Michael Jones', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-davis', 'inst-greenwood', 'davis', 'davis@greenwood.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Jennifer Davis', 1);

-- Student Users
INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-john', 'inst-greenwood', 'johndoe', 'john@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'John Doe', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-jane', 'inst-greenwood', 'janesmith', 'jane@greenwood.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Jane Smith', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-alice', 'inst-greenwood', 'alice', 'alice@greenwood.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Alice Johnson', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-bob', 'inst-greenwood', 'bobbrown', 'bob@greenwood.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Bob Brown', 1);

INSERT OR REPLACE INTO users (id, institution_id, username, email, password_hash, name, is_active)
VALUES ('user-parent', 'inst-greenwood', 'parent', 'parent@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'Robert Doe (Parent)', 1);

-- 6. User Roles Mapping
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-admin', 'role-principal');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-smith', 'role-teacher');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-jones', 'role-teacher');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-davis', 'role-teacher');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-john', 'role-student');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-jane', 'role-student');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-alice', 'role-student');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-bob', 'role-student');
INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES ('user-parent', 'role-parent');

-- 7. Create Academic Year
INSERT OR REPLACE INTO academic_years (id, institution_id, name, start_date, end_date, is_current, is_active)
VALUES ('year-2026', 'inst-greenwood', '2026-27', '2026-06-01', '2027-05-31', 1, 1);

-- Link academic year back to institution
UPDATE institutions SET current_academic_year_id = 'year-2026' WHERE id = 'inst-greenwood';

-- 8. Create Department (Academics / Sections)
INSERT OR REPLACE INTO departments (id, institution_id, name, code, description, is_active)
VALUES ('dept-academics', 'inst-greenwood', 'General Academics Department', 'ACAD', 'Core school academic department', 1);

-- 9. Create Courses / Programs (Represent Grades 8, 9, 10)
INSERT OR REPLACE INTO courses (id, institution_id, department_id, course_code, name, duration_years, semester_enabled, is_active) 
VALUES ('prog-grade-8', 'inst-greenwood', 'dept-academics', 'G8', 'Grade 8', 1, 0, 1);

INSERT OR REPLACE INTO courses (id, institution_id, department_id, course_code, name, duration_years, semester_enabled, is_active) 
VALUES ('prog-grade-9', 'inst-greenwood', 'dept-academics', 'G9', 'Grade 9', 1, 0, 1);

INSERT OR REPLACE INTO courses (id, institution_id, department_id, course_code, name, duration_years, semester_enabled, is_active) 
VALUES ('prog-grade-10', 'inst-greenwood', 'dept-academics', 'G10', 'Grade 10', 1, 0, 1);

-- 10. Create Teachers
INSERT OR REPLACE INTO teachers (id, institution_id, user_id, employee_id, first_name, last_name, email, phone, joining_date, designation, department, status, is_active)
VALUES ('teacher-smith', 'inst-greenwood', 'user-smith', 'EMP-SMITH', 'Sarah', 'Smith', 'smith@greenwood.edu', '555-0301', '2022-08-15', 'Mathematics Teacher', 'Academics', 'ACTIVE', 1);

INSERT OR REPLACE INTO teachers (id, institution_id, user_id, employee_id, first_name, last_name, email, phone, joining_date, designation, department, status, is_active)
VALUES ('teacher-jones', 'inst-greenwood', 'user-jones', 'EMP-JONES', 'Michael', 'Jones', 'jones@greenwood.edu', '555-0302', '2021-06-10', 'Science Teacher', 'Academics', 'ACTIVE', 1);

INSERT OR REPLACE INTO teachers (id, institution_id, user_id, employee_id, first_name, last_name, email, phone, joining_date, designation, department, status, is_active)
VALUES ('teacher-davis', 'inst-greenwood', 'user-davis', 'EMP-DAVIS', 'Jennifer', 'Davis', 'davis@greenwood.edu', '555-0303', '2023-01-05', 'English Teacher', 'Academics', 'ACTIVE', 1);

-- 11. Create Sections (Represent Classrooms)
INSERT OR REPLACE INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, is_active)
VALUES ('sec-g8-a', 'inst-greenwood', 'year-2026', 'prog-grade-8', 'Section A', 1, 30, 'Room 101', 'teacher-smith', 1);

INSERT OR REPLACE INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, is_active)
VALUES ('sec-g9-a', 'inst-greenwood', 'year-2026', 'prog-grade-9', 'Section A', 1, 30, 'Room 102', 'teacher-jones', 1);

INSERT OR REPLACE INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, is_active)
VALUES ('sec-g10-a', 'inst-greenwood', 'year-2026', 'prog-grade-10', 'Section A', 1, 30, 'Room 201', 'teacher-davis', 1);

INSERT OR REPLACE INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, capacity, room, class_teacher_id, is_active)
VALUES ('sec-g10-b', 'inst-greenwood', 'year-2026', 'prog-grade-10', 'Section B', 1, 30, 'Room 202', 'teacher-smith', 1);

-- 12. Create Subjects
-- Grade 8 Subjects
INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-math-8', 'inst-greenwood', 'prog-grade-8', 'MATH08', 'Grade 8 Mathematics', 5, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-sci-8', 'inst-greenwood', 'prog-grade-8', 'SCI08', 'Grade 8 General Science', 4, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-eng-8', 'inst-greenwood', 'prog-grade-8', 'ENG08', 'Grade 8 English Literature', 4, 1, 1);

-- Grade 9 Subjects
INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-math-9', 'inst-greenwood', 'prog-grade-9', 'MATH09', 'Grade 9 Mathematics', 5, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-sci-9', 'inst-greenwood', 'prog-grade-9', 'SCI09', 'Grade 9 Science (Phy/Chem/Bio)', 5, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-eng-9', 'inst-greenwood', 'prog-grade-9', 'ENG09', 'Grade 9 English Literature', 4, 1, 1);

-- Grade 10 Subjects
INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-math-10', 'inst-greenwood', 'prog-grade-10', 'MATH10', 'Grade 10 Mathematics', 5, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-sci-10', 'inst-greenwood', 'prog-grade-10', 'SCI10', 'Grade 10 Science (Phy/Chem/Bio)', 5, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-eng-10', 'inst-greenwood', 'prog-grade-10', 'ENG10', 'Grade 10 English Literature', 4, 1, 1);

INSERT OR REPLACE INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-soc-10', 'inst-greenwood', 'prog-grade-10', 'SOC10', 'Grade 10 Social Science', 4, 1, 1);

-- 13. Create Students
INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-john', 'inst-greenwood', 'user-john', 'ADM-2026-001', '1001', 'John', 'Doe', 'Male', '2011-04-12', 'john@greenwood.edu', '555-0501', '2026-04-01', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-jane', 'inst-greenwood', 'user-jane', 'ADM-2026-002', '1002', 'Jane', 'Smith', 'Female', '2011-09-23', 'jane@greenwood.edu', '555-0502', '2026-04-02', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-alice', 'inst-greenwood', 'user-alice', 'ADM-2026-003', '1003', 'Alice', 'Johnson', 'Female', '2012-01-15', 'alice@greenwood.edu', '555-0503', '2026-04-03', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-bob', 'inst-greenwood', 'user-bob', 'ADM-2026-004', '1004', 'Bob', 'Brown', 'Male', '2012-07-05', 'bob@greenwood.edu', '555-0504', '2026-04-04', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-charlie', 'inst-greenwood', null, 'ADM-2026-005', '1005', 'Charlie', 'Green', 'Male', '2011-11-30', 'charlie@greenwood.edu', '555-0505', '2026-04-05', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-emily', 'inst-greenwood', null, 'ADM-2026-006', '1006', 'Emily', 'White', 'Female', '2012-05-18', 'emily@greenwood.edu', '555-0506', '2026-04-06', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-frank', 'inst-greenwood', null, 'ADM-2026-007', '1007', 'Frank', 'Black', 'Male', '2011-02-14', 'frank@greenwood.edu', '555-0507', '2026-04-07', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-grace', 'inst-greenwood', null, 'ADM-2026-008', '1008', 'Grace', 'Miller', 'Female', '2012-03-22', 'grace@greenwood.edu', '555-0508', '2026-04-08', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-henry', 'inst-greenwood', null, 'ADM-2026-009', '1009', 'Henry', 'Wilson', 'Male', '2013-10-09', 'henry@greenwood.edu', '555-0509', '2026-04-09', 'ACTIVE', 1);

INSERT OR REPLACE INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, admission_date, status, is_active)
VALUES ('student-ivy', 'inst-greenwood', null, 'ADM-2026-010', '1010', 'Ivy', 'Taylor', 'Female', '2013-12-04', 'ivy@greenwood.edu', '555-0510', '2026-04-10', 'ACTIVE', 1);

-- 14. Create Guardians
INSERT OR REPLACE INTO guardians (id, student_id, user_id, name, relationship, phone, email, occupation, is_active)
VALUES ('guard-john', 'student-john', 'user-parent', 'Robert Doe', 'Father', '555-0901', 'parent@oxford.edu', 'Business owner', 1);

INSERT OR REPLACE INTO guardians (id, student_id, user_id, name, relationship, phone, email, occupation, is_active)
VALUES ('guard-jane', 'student-jane', null, 'Susan Smith', 'Mother', '555-0902', 'susan.smith@gmail.com', 'Software Engineer', 1);

INSERT OR REPLACE INTO guardians (id, student_id, user_id, name, relationship, phone, email, occupation, is_active)
VALUES ('guard-alice', 'student-alice', null, 'Richard Johnson', 'Father', '555-0903', 'richard.j@gmail.com', 'Doctor', 1);

INSERT OR REPLACE INTO guardians (id, student_id, user_id, name, relationship, phone, email, occupation, is_active)
VALUES ('guard-bob', 'student-bob', null, 'Patricia Brown', 'Mother', '555-0904', 'patty.b@gmail.com', 'Teacher', 1);

-- 15. Student Enrollments
-- Grade 10 A
INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-john', 'student-john', 'year-2026', 'prog-grade-10', 'sec-g10-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-jane', 'student-jane', 'year-2026', 'prog-grade-10', 'sec-g10-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-charlie', 'student-charlie', 'year-2026', 'prog-grade-10', 'sec-g10-a', 1, 1);

-- Grade 10 B
INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-frank', 'student-frank', 'year-2026', 'prog-grade-10', 'sec-g10-b', 1, 1);

-- Grade 9 A
INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-alice', 'student-alice', 'year-2026', 'prog-grade-9', 'sec-g9-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-bob', 'student-bob', 'year-2026', 'prog-grade-9', 'sec-g9-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-emily', 'student-emily', 'year-2026', 'prog-grade-9', 'sec-g9-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-grace', 'student-grace', 'year-2026', 'prog-grade-9', 'sec-g9-a', 1, 1);

-- Grade 8 A
INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-henry', 'student-henry', 'year-2026', 'prog-grade-8', 'sec-g8-a', 1, 1);

INSERT OR REPLACE INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enr-ivy', 'student-ivy', 'year-2026', 'prog-grade-8', 'sec-g8-a', 1, 1);

-- 16. Timetable Slots
INSERT OR REPLACE INTO timetable_slots (id, institution_id, name, start_time, end_time, slot_type, is_active)
VALUES ('slot-p1', 'inst-greenwood', 'Period 1', '08:30', '09:30', 'period', 1);

INSERT OR REPLACE INTO timetable_slots (id, institution_id, name, start_time, end_time, slot_type, is_active)
VALUES ('slot-p2', 'inst-greenwood', 'Period 2', '09:30', '10:30', 'period', 1);

INSERT OR REPLACE INTO timetable_slots (id, institution_id, name, start_time, end_time, slot_type, is_active)
VALUES ('slot-break', 'inst-greenwood', 'Recess Break', '10:30', '11:00', 'break', 1);

INSERT OR REPLACE INTO timetable_slots (id, institution_id, name, start_time, end_time, slot_type, is_active)
VALUES ('slot-p3', 'inst-greenwood', 'Period 3', '11:00', '12:00', 'period', 1);

INSERT OR REPLACE INTO timetable_slots (id, institution_id, name, start_time, end_time, slot_type, is_active)
VALUES ('slot-p4', 'inst-greenwood', 'Period 4', '12:00', '13:00', 'period', 1);

-- 17. Weekly Timetable Entries
-- Grade 10 A Timetable
INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-10a-mon-p1', 'inst-greenwood', 'year-2026', 'sec-g10-a', 'sub-math-10', 'teacher-smith', 'slot-p1', 'Monday', 1);

INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-10a-mon-p2', 'inst-greenwood', 'year-2026', 'sec-g10-a', 'sub-sci-10', 'teacher-jones', 'slot-p2', 'Monday', 1);

INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-10a-mon-p3', 'inst-greenwood', 'year-2026', 'sec-g10-a', 'sub-eng-10', 'teacher-davis', 'slot-p3', 'Monday', 1);

INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-10a-tue-p1', 'inst-greenwood', 'year-2026', 'sec-g10-a', 'sub-sci-10', 'teacher-jones', 'slot-p1', 'Tuesday', 1);

INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-10a-tue-p2', 'inst-greenwood', 'year-2026', 'sec-g10-a', 'sub-math-10', 'teacher-smith', 'slot-p2', 'Tuesday', 1);

-- Grade 9 A Timetable
INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-9a-mon-p1', 'inst-greenwood', 'year-2026', 'sec-g9-a', 'sub-sci-9', 'teacher-jones', 'slot-p1', 'Monday', 1);

INSERT OR REPLACE INTO weekly_timetable (id, institution_id, academic_year_id, section_id, subject_id, teacher_id, slot_id, day_of_week, is_active)
VALUES ('tt-9a-mon-p2', 'inst-greenwood', 'year-2026', 'sec-g9-a', 'sub-math-9', 'teacher-smith', 'slot-p2', 'Monday', 1);

-- 18. Teacher Subject Assignments
INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-smith-math10', 'teacher-smith', 'sub-math-10', 'prog-grade-10', 'sec-g10-a', 'year-2026', 1);

INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-smith-math9', 'teacher-smith', 'sub-math-9', 'prog-grade-9', 'sec-g9-a', 'year-2026', 1);

INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-smith-math8', 'teacher-smith', 'sub-math-8', 'prog-grade-8', 'sec-g8-a', 'year-2026', 1);

INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-jones-sci10', 'teacher-jones', 'sub-sci-10', 'prog-grade-10', 'sec-g10-a', 'year-2026', 1);

INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-jones-sci9', 'teacher-jones', 'sub-sci-9', 'prog-grade-9', 'sec-g9-a', 'year-2026', 1);

INSERT OR REPLACE INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('tsa-davis-eng10', 'teacher-davis', 'sub-eng-10', 'prog-grade-10', 'sec-g10-a', 'year-2026', 1);

-- 19. Exams
INSERT OR REPLACE INTO exams (id, institution_id, name, academic_year_id, course_id, semester, start_date, end_date, status, is_active)
VALUES ('exam-term1', 'inst-greenwood', 'First Term Examination 2026', 'year-2026', 'prog-grade-10', 1, '2026-09-10', '2026-09-18', 'PUBLISHED', 1);

-- 20. Exam Subjects
INSERT OR REPLACE INTO exam_subjects (id, institution_id, exam_id, subject_id, exam_date, start_time, end_time, max_marks, min_marks, is_active)
VALUES ('ex-sub-math10', 'inst-greenwood', 'exam-term1', 'sub-math-10', '2026-09-10', '09:00', '12:00', 100.0, 40.0, 1);

INSERT OR REPLACE INTO exam_subjects (id, institution_id, exam_id, subject_id, exam_date, start_time, end_time, max_marks, min_marks, is_active)
VALUES ('ex-sub-sci10', 'inst-greenwood', 'exam-term1', 'sub-sci-10', '2026-09-12', '09:00', '12:00', 100.0, 40.0, 1);

INSERT OR REPLACE INTO exam_subjects (id, institution_id, exam_id, subject_id, exam_date, start_time, end_time, max_marks, min_marks, is_active)
VALUES ('ex-sub-eng10', 'inst-greenwood', 'exam-term1', 'sub-eng-10', '2026-09-15', '09:00', '12:00', 100.0, 40.0, 1);

-- 21. Student Marks
-- John Doe Grade 10 A Marks
INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-john-math', 'inst-greenwood', 'ex-sub-math10', 'student-john', 85.5, 100.0, 'Excellent performance', 1);

INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-john-sci', 'inst-greenwood', 'ex-sub-sci10', 'student-john', 78.0, 100.0, 'Good understanding of core concepts', 1);

INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-john-eng', 'inst-greenwood', 'ex-sub-eng10', 'student-john', 92.0, 100.0, 'Outstanding spelling and expression', 1);

-- Jane Smith Grade 10 A Marks
INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-jane-math', 'inst-greenwood', 'ex-sub-math10', 'student-jane', 95.0, 100.0, 'Top scorer in class', 1);

INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-jane-sci', 'inst-greenwood', 'ex-sub-sci10', 'student-jane', 88.5, 100.0, 'Very good practical execution', 1);

INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-jane-eng', 'inst-greenwood', 'ex-sub-eng10', 'student-jane', 85.0, 100.0, 'Needs to work slightly on grammar detail', 1);

-- Charlie Green Grade 10 A Marks
INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-charlie-math', 'inst-greenwood', 'ex-sub-math10', 'student-charlie', 48.0, 100.0, 'Passed, needs practice in Algebra', 1);

INSERT OR REPLACE INTO student_marks (id, institution_id, exam_subject_id, student_id, marks_obtained, max_marks, remarks, is_active)
VALUES ('marks-charlie-sci', 'inst-greenwood', 'ex-sub-sci10', 'student-charlie', 52.0, 100.0, 'Satisfactory, pay attention during labs', 1);

-- 22. Fee Structures
-- Grade 10 Fees
INSERT OR REPLACE INTO fee_structures (id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active)
VALUES ('fee-tuition-10', 'inst-greenwood', 'year-2026', 'prog-grade-10', 1, 'Tuition Fee', 45000.0, 1);

INSERT OR REPLACE INTO fee_structures (id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active)
VALUES ('fee-exam-10', 'inst-greenwood', 'year-2026', 'prog-grade-10', 1, 'Exam Fee', 1500.0, 1);

-- Grade 9 Fees
INSERT OR REPLACE INTO fee_structures (id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active)
VALUES ('fee-tuition-9', 'inst-greenwood', 'year-2026', 'prog-grade-9', 1, 'Tuition Fee', 40000.0, 1);

-- Grade 8 Fees
INSERT OR REPLACE INTO fee_structures (id, institution_id, academic_year_id, course_id, year_number, fee_type, amount, is_active)
VALUES ('fee-tuition-8', 'inst-greenwood', 'year-2026', 'prog-grade-8', 1, 'Tuition Fee', 35000.0, 1);

-- 23. Student Fee Records (Student Ledgers)
-- John Doe (Grade 10) Ledgers
INSERT OR REPLACE INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, is_active)
VALUES ('ledger-john-tuition', 'inst-greenwood', 'student-john', 'year-2026', 'prog-grade-10', 1, 'fee-tuition-10', 'Tuition Fee', 45000.0, 25000.0, '2026-08-31', 'PARTIALLY_PAID', 1);

INSERT OR REPLACE INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, is_active)
VALUES ('ledger-john-exam', 'inst-greenwood', 'student-john', 'year-2026', 'prog-grade-10', 1, 'fee-exam-10', 'Exam Fee', 1500.0, 1500.0, '2026-09-05', 'PAID', 1);

-- Jane Smith (Grade 10) Ledgers
INSERT OR REPLACE INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, is_active)
VALUES ('ledger-jane-tuition', 'inst-greenwood', 'student-jane', 'year-2026', 'prog-grade-10', 1, 'fee-tuition-10', 'Tuition Fee', 45000.0, 45000.0, '2026-08-31', 'PAID', 1);

INSERT OR REPLACE INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, is_active)
VALUES ('ledger-jane-exam', 'inst-greenwood', 'student-jane', 'year-2026', 'prog-grade-10', 1, 'fee-exam-10', 'Exam Fee', 1500.0, 0.0, '2026-09-05', 'UNPAID', 1);

-- Alice Johnson (Grade 9) Ledgers
INSERT OR REPLACE INTO student_fee_records (id, institution_id, student_id, academic_year_id, course_id, year_number, fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, is_active)
VALUES ('ledger-alice-tuition', 'inst-greenwood', 'student-alice', 'year-2026', 'prog-grade-9', 1, 'fee-tuition-9', 'Tuition Fee', 40000.0, 0.0, '2026-08-31', 'UNPAID', 1);

-- 24. Fee Payments
-- John Doe Tuition Payment
INSERT OR REPLACE INTO fee_payments (id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, is_active)
VALUES ('pay-john-1', 'inst-greenwood', 'student-john', 'ledger-john-tuition', 25000.0, '2026-08-15', 'UPI', 'TXN7789012', 'Paid first installment', 1);

-- John Doe Exam Payment
INSERT OR REPLACE INTO fee_payments (id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, is_active)
VALUES ('pay-john-2', 'inst-greenwood', 'student-john', 'ledger-john-exam', 1500.0, '2026-09-01', 'Cash', null, 'Full payment for term 1 exams', 1);

-- Jane Smith Tuition Payment
INSERT OR REPLACE INTO fee_payments (id, institution_id, student_id, student_fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, is_active)
VALUES ('pay-jane-1', 'inst-greenwood', 'student-jane', 'ledger-jane-tuition', 45000.0, '2026-08-10', 'Bank Transfer', 'TXN5411899', 'Full annual fee paid', 1);

-- 25. Announcements
INSERT OR REPLACE INTO announcements (id, institution_id, title, content, visible_to_students, visible_to_teachers, visible_to_parents, is_active)
VALUES ('ann-1', 'inst-greenwood', 'Welcome to the 2026-27 School Year!', 'We are thrilled to welcome all new and returning students to Greenwood High School. Let us make this academic year full of learning and achievements.', 1, 1, 1, 1);

INSERT OR REPLACE INTO announcements (id, institution_id, title, content, visible_to_students, visible_to_teachers, visible_to_parents, is_active)
VALUES ('ann-2', 'inst-greenwood', 'First Term Examination Schedule', 'The First Term Examination schedule has been released and mapped onto the Academic calendar. Exams start Sept 10th. Preparation resources can be collected from class teachers.', 1, 1, 1, 1);

INSERT OR REPLACE INTO announcements (id, institution_id, title, content, visible_to_students, visible_to_teachers, visible_to_parents, is_active)
VALUES ('ann-3', 'inst-greenwood', 'Staff Meeting: Curriculum Alignment', 'A mandatory staff meeting will take place this Thursday at 3 PM in the Staff Lounge to discuss curriculum alignment and examination guidelines.', 0, 1, 0, 1);

-- 26. Attendance Sessions & Records (Sample days)
-- 2026-09-01 (English Class for Grade 10 A)
INSERT OR REPLACE INTO attendance_sessions (id, institution_id, section_id, subject_id, teacher_id, slot_id, date, is_active)
VALUES ('sess-10a-eng-0901', 'inst-greenwood', 'sec-g10-a', 'sub-eng-10', 'teacher-davis', 'slot-p3', '2026-09-01', 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-john-0901', 'inst-greenwood', 'sess-10a-eng-0901', 'student-john', 'present', null, 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-jane-0901', 'inst-greenwood', 'sess-10a-eng-0901', 'student-jane', 'present', null, 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-charlie-0901', 'inst-greenwood', 'sess-10a-eng-0901', 'student-charlie', 'absent', 'Unwell', 1);

-- 2026-09-01 (Math Class for Grade 10 A)
INSERT OR REPLACE INTO attendance_sessions (id, institution_id, section_id, subject_id, teacher_id, slot_id, date, is_active)
VALUES ('sess-10a-math-0901', 'inst-greenwood', 'sec-g10-a', 'sub-math-10', 'teacher-smith', 'slot-p1', '2026-09-01', 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-john-math-0901', 'inst-greenwood', 'sess-10a-math-0901', 'student-john', 'present', null, 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-jane-math-0901', 'inst-greenwood', 'sess-10a-math-0901', 'student-jane', 'present', null, 1);

INSERT OR REPLACE INTO student_attendance (id, institution_id, session_id, student_id, status, remarks, is_active)
VALUES ('att-charlie-math-0901', 'inst-greenwood', 'sess-10a-math-0901', 'student-charlie', 'present', null, 1);

PRAGMA foreign_keys = ON;
