-- Phase E item 3c: Library reference/reserve (non-circulating) distinction.
ALTER TABLE library_books ADD COLUMN is_reference INTEGER NOT NULL DEFAULT 0;
