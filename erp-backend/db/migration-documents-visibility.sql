-- Migration: Add visibility scoping to documents (staff-only vs everyone)
-- 'all' (default) = visible to any authenticated user in the institution
-- 'staff' = hidden from non-staff roles (students/parents/guardians) in list/get/download
ALTER TABLE documents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'all';
