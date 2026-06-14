-- Seed data for testing
-- Clear existing data (optional but recommended for a clean seed)
DELETE FROM notifications;
DELETE FROM announcements;
DELETE FROM exam_marks;
DELETE FROM exams;
DELETE FROM fee_payments;
DELETE FROM fee_records;
DELETE FROM fee_structures;
DELETE FROM attendance;
DELETE FROM timetable_slots;
DELETE FROM subjects;
DELETE FROM teachers;
DELETE FROM students;
DELETE FROM sections;
DELETE FROM courses;
DELETE FROM users;
DELETE FROM colleges;

-- 1. Create College
INSERT INTO colleges (id, name, address, contact_email) 
VALUES (1, 'Oxford Academy', '123 Education Lane', 'contact@oxford.edu');

-- 2. Create Admin User (password: admin123)
-- Hash generated using Web Crypto PBKDF2 (100,000 iterations, SHA-256)
INSERT INTO users (id, college_id, role, name, email, password_hash, is_active) 
VALUES (1, 1, 'admin', 'Admin User', 'admin@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b', 1);

-- 3. Create Course
INSERT INTO courses (id, college_id, name, duration_years) 
VALUES (1, 1, 'Computer Science', 4);

-- 4. Create Section
INSERT INTO sections (id, college_id, course_id, name, year, academic_year)
VALUES (1, 1, 1, 'Section A', 1, '2023-2024');

-- 5. Create Teacher
INSERT INTO users (id, college_id, role, name, email, password_hash)
VALUES (2, 1, 'teacher', 'Prof. Smith', 'smith@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b');

INSERT INTO teachers (id, user_id, college_id, employee_code, department)
VALUES (1, 2, 1, 'EMP001', 'Computer Science');

-- 6. Create Student
INSERT INTO users (id, college_id, role, name, email, password_hash)
VALUES (3, 1, 'student', 'John Doe', 'john@oxford.edu', 'a1625fb1fc2abbe73fa1ebbd2561166d:414f12d9746240fa304e155cb24be800994e560ff3386725f5630bb7899e671b');

INSERT INTO students (id, user_id, college_id, section_id, roll_number, status)
VALUES (1, 3, 1, 1, 'CS101', 'active');

-- 7. Create Subjects
INSERT INTO subjects (id, college_id, course_id, name, code, semester)
VALUES (1, 1, 1, 'Data Structures', 'CS101', 1);
INSERT INTO subjects (id, college_id, course_id, name, code, semester)
VALUES (2, 1, 1, 'Algorithms', 'CS102', 1);
