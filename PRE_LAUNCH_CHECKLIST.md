# Pre-Launch Checklist — Before Handing to a Real School

Manual verification/setup tasks — things that need a human actually doing them, not code changes.
Separate from `CREDENTIALS_CHECKLIST.md` (external keys/secrets). Check items off as you do them.

## 1. Live click-through testing

Nothing in this app has ever been tested by an actual person logging in and clicking around —
every feature across development was verified only with type-checking and automated tests, never
a real browser session. This is the single highest-value thing to do before go-live.

- [ ] Log in as Admin/Principal — walk the dashboard, confirm stats look sane
- [ ] Full admission flow: create inquiry → convert to application → approve → confirm student record created correctly
- [ ] Add a class/section, add subjects, assign a teacher
- [ ] Mark attendance as a teacher for a real section
- [ ] Create an exam, enter marks, generate + print a report card
- [ ] Set up a fee structure, collect a payment, print the receipt
- [ ] Post an announcement / homework — confirm it shows up on a student/parent login
- [ ] Log in as Teacher — confirm they only see their own classes/students
- [ ] Log in as Parent — confirm they only see their own child's data
- [ ] Log in as Student — confirm the portal view looks right
- [ ] Try password reset end-to-end (needs `RESEND_API_KEY` set first)

## 2. Real school data setup

- [ ] Decide: manually enter the school's classes/sections/subjects, or bulk-import via Data Tools
- [ ] Enter real academic year, term dates, holidays (Academic Calendar)
- [ ] Enter real fee structure for each class
- [ ] Create real staff logins (Admin, Accountant, teachers) — decide who gets which role
- [ ] Set the grade scale (A+/A/B+... boundaries) to match what the school actually uses

## 3. Known issues to be aware of (not blocking for a single-school deployment)

- [x] ~~`POST /auth/register-institution` (self-service school signup) has a real bug — 500s for any caller.~~ Fixed 2026-08-07: the Zod validation schema and the service code were reading different field names (`institution_name` vs `name`, `admin_username` didn't exist at all), so every request failed a NOT NULL constraint. Verified with a live POST against a local dev server — now returns 201 with a working token. Along the way also found and fixed a dangling foreign key on `fee_structures.parent_version_id` (pointed at a table a past migration had dropped) that broke institution deletion in the local dev DB.
- [x] ~~`students.admission_number` is globally unique across the whole database, not per-school.~~ Fixed 2026-08-07: this was a real, guaranteed collision, not just theoretical — admission numbers are auto-generated per-institution as `APP-{year}-{seq}`, so any two institutions' first applicant of a year would both get `APP-2026-0001` and the second insert would fail. Changed the DB constraint from a global `UNIQUE` to `UNIQUE(institution_id, admission_number)`. Application-level duplicate checks (`findDuplicateAdmissionNumber`) were already correctly scoped by institution — only the raw schema constraint was wrong. Verified directly against the local dev D1: same number across two institutions now succeeds, same number within one institution still rejected.

## 4. Once credentials are added (see `CREDENTIALS_CHECKLIST.md`)

- [ ] Send a real test email (password reset) and confirm it arrives
- [ ] Send a real test SMS via Integration Center and confirm it arrives
- [ ] Once payment gateway is built: do a real sandbox transaction end-to-end

## 5. Operational readiness

- [ ] Confirm nightly automated backups are actually firing once deployed (Cron Trigger was wired in but never observed running in production — check System Settings → Backup History a day or two after deploy)
- [ ] Decide who at the school is the "admin" point of contact and make sure they know their login

---
*Created 2026-08-03. This is a checklist for you to work through, not something I'll do automatically — say the word when you want to tackle any section together.*
