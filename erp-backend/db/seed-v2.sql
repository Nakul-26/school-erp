-- Seed data v2 for UUID-based schema
-- Note: Replace these UUIDs with actual ones if needed, but for local testing these fixed strings work as UUIDs.

-- 1. Create Institution
INSERT INTO institutions (id, name, address, contact_email, institution_type, is_active) 
VALUES ('inst-oxford', 'Oxford Academy', '123 Education Lane', 'contact@oxford.edu', 'engineering_college', 1);

-- 2. Create Admin User (password: admin123)
-- Hash: a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b
INSERT INTO users (id, institution_id, username, email, password_hash, role, name, is_active) 
VALUES ('user-admin', 'inst-oxford', 'admin', 'admin@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'admin', 'Admin User', 1);

-- 3. Create Academic Year
INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current, is_active)
VALUES ('year-2026', 'inst-oxford', '2026-27', '2026-06-01', '2027-05-31', 1, 1);

-- 4. Create Program (Course)
INSERT INTO courses (id, institution_id, course_code, name, duration_years, is_active) 
VALUES ('prog-cse', 'inst-oxford', 'CSE', 'Computer Science & Engineering', 4, 1);

-- 5. Create Section
INSERT INTO sections (id, institution_id, academic_year_id, course_id, name, year_number, is_active)
VALUES ('sec-cse-a', 'inst-oxford', 'year-2026', 'prog-cse', 'Section A', 1, 1);

-- 6. Create Subject
INSERT INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, is_active)
VALUES ('sub-ds', 'inst-oxford', 'prog-cse', 'CS301', 'Data Structures', 4, 3, 1);

-- 7. Create Teacher
INSERT INTO users (id, institution_id, username, email, password_hash, role, name, is_active)
VALUES ('user-teacher', 'inst-oxford', 'smith', 'smith@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'teacher', 'Prof. Smith', 1);

INSERT INTO teachers (id, institution_id, user_id, employee_id, first_name, last_name, status, is_active)
VALUES ('teacher-smith', 'inst-oxford', 'user-teacher', 'EMP001', 'Prof.', 'Smith', 'ACTIVE', 1);

-- 8. Create Student
INSERT INTO users (id, institution_id, username, email, password_hash, role, name, is_active)
VALUES ('user-student', 'inst-oxford', 'johndoe', 'john@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 'student', 'John Doe', 1);

INSERT INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, status, is_active)
VALUES ('student-john', 'inst-oxford', 'user-student', 'ADM2026001', 'CS101', 'John', 'Doe', 'ACTIVE', 1);

-- 9. Student Enrollment
INSERT INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, is_active)
VALUES ('enroll-john-1', 'student-john', 'year-2026', 'prog-cse', 'sec-cse-a', 1, 1);

-- 10. Teacher Assignment
INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, course_id, section_id, academic_year_id, is_active)
VALUES ('assign-smith-ds', 'teacher-smith', 'sub-ds', 'prog-cse', 'sec-cse-a', 'year-2026', 1);
