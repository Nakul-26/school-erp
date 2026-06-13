-- Seed data for testing
INSERT INTO colleges (id, name, domain) VALUES ('college_1', 'Oxford Academy', 'oxford.edu');

-- Admin user (password: admin123)
-- In v1, we'll use plain text for now then switch to Web Crypto hashing
INSERT INTO users (id, college_id, email, password_hash, role) 
VALUES ('user_1', 'college_1', 'admin@oxford.edu', 'admin123', 'ADMIN');

INSERT INTO batches (id, college_id, name) VALUES ('batch_1', 'college_1', 'Computer Science 2026');

INSERT INTO subjects (id, college_id, name, code) VALUES ('sub_1', 'college_1', 'Data Structures', 'CS101');
INSERT INTO subjects (id, college_id, name, code) VALUES ('sub_2', 'college_1', 'Algorithms', 'CS102');

INSERT INTO students (id, college_id, user_id, enrollment_number, first_name, last_name, batch_id)
VALUES ('stud_1', 'college_1', 'user_1', 'ENR001', 'John', 'Doe', 'batch_1');
