-- Migration: Add verification_status to fee_payments table
ALTER TABLE fee_payments ADD COLUMN verification_status TEXT DEFAULT 'VERIFIED' CHECK (verification_status IN ('VERIFIED', 'PENDING', 'FAILED'));
