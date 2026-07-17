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

-- Teacher gets attendance and student/teacher viewing
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-teacher-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-att-mark');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-teacher', 'perm-att-view');

-- Student gets self records view (mapped in business logic, but view perms help)
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-att-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-student', 'perm-finance-access');

-- Accountant gets fees collection and view
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-fees-collect');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-fees-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-student-view');
INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES ('role-accountant', 'perm-finance-access');

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
