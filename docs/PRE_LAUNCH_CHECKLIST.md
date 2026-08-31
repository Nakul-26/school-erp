# Pre-Launch Checklist — Before Handing to a Real School

Manual verification/setup tasks — things that need a human actually doing them, not code changes.
Separate from `CREDENTIALS_CHECKLIST.md` (external keys/secrets) and `MANUAL_TEST_TRACKER.md`
(the granular per-feature click-through list). Check items off as you do them. Work top to
bottom — the sections are roughly in the order you'd actually hit them.

---

## 0. Production deployment

Nothing has been deployed to real Cloudflare infrastructure yet — `wrangler.jsonc` still points
at a local placeholder D1 database (`database_id: "local-d1-id"`). This has to happen before any
of the later sections mean anything, since "once deployed" is a precondition for §5.

- [ ] Create the real D1 database: `wrangler d1 create erp-db`
- [ ] Copy the returned `database_id` into `erp-backend/wrangler.jsonc` (replace the
      `"local-d1-id"` placeholder)
- [ ] Run all migrations against the real D1: `wrangler d1 migrations apply erp-db --remote`
- [ ] Spot-check a couple of tables exist and are empty as expected:
      `wrangler d1 execute erp-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`
- [ ] Create the real R2 bucket: `wrangler r2 bucket create erp-files`
- [ ] Set every **Required: Yes** secret from `CREDENTIALS_CHECKLIST.md` with
      `wrangler secret put <NAME>` (do this before first deploy — auth/email will break without them)
- [ ] Set `FRONTEND_URL` and `FRONTEND_ORIGIN` to the real production domain, not localhost
- [ ] Build the frontend: `npm run build` inside `erp-frontend` (confirms `dist/` is fresh before
      the Worker picks it up via the `assets` binding)
- [ ] Deploy: `wrangler deploy` from `erp-backend`
- [ ] Visit the real production URL, confirm the login page loads over HTTPS with no console errors
- [ ] Confirm the Cron Trigger registered: `wrangler triggers` or check the Cloudflare dashboard →
      Workers → Triggers tab shows the hourly cron
- [ ] Decide on a custom domain (e.g. `yourschool.trackflow.app`) if you want one, and wire it up
      in the Cloudflare dashboard — then update `FRONTEND_URL`/`FRONTEND_ORIGIN` again to match and
      redeploy
- [ ] Confirm you (or someone) has access to the Cloudflare account/dashboard long-term — don't
      let this live only on a personal account nobody else can reach if something breaks

## 1. Live click-through testing

Nothing in this app has ever been tested by an actual person logging in and clicking around —
every feature across development was verified only with type-checking and automated tests, never
a real browser session. **This is the single highest-value thing to do before go-live.**

The full granular checklist (all 62 pages/features, organized by module) now lives in
**`MANUAL_TEST_TRACKER.md`** — work through that file section by section. Quick summary of the
critical path if you want the shortest version that still covers the core flows:

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
- [ ] Then go do the rest properly in `MANUAL_TEST_TRACKER.md` — this summary skips ~50 modules
      (library, hostel, transport, canteen, payroll, GL accounting, certificates, compliance,
      placements, alumni, visitors, assets, audit logs, access control, and more)

## 2. Real school data setup

### 2a. Decide the data-entry approach
- [ ] Decide per data type: manual entry vs bulk-import via Data Tools (classes/sections/subjects
      are usually small enough to enter by hand; students are usually worth importing)
- [ ] If importing, get the school's existing student list into the exact column format Data
      Tools expects — check the sample/template export first rather than guessing columns
- [ ] Do a small test import (5-10 rows) before importing the full list, and check every field
      landed in the right place (dates, phone numbers, and IDs are the usual places imports go wrong)

### 2b. Institution & academic structure
- [ ] Institution Setup: real school name, address, contact info, logo (shows on report cards/receipts)
- [ ] Create the real current academic year with correct start/end dates
- [ ] Enter real term/semester dates within that year
- [ ] Academic Calendar: enter the real holiday list and any known exam/event dates for the year
- [ ] Create every real department the school has
- [ ] Create every real class and section (with realistic capacity/strength)
- [ ] Create every real subject and correctly map subjects to classes
- [ ] Set the grade scale (A+/A/B+... boundaries) to match what the school actually uses —
      confirm this against a real report card the school has issued before, if you can get one

### 2c. People
- [ ] Import or enter all real students, correctly assigned to class/section
- [ ] Import or enter all real teaching staff, correctly assigned to departments/subjects
- [ ] Decide who gets Accountant access (if the school has a separate finance person) vs Admin
- [ ] Create real parent/guardian accounts and confirm each is linked to the correct child/children
- [ ] Spot-check 3-5 random students end-to-end: correct class, correct parent link, correct fee
      structure applied — catches systemic import mistakes before they reach the whole school

### 2d. Fees, timetable, and other setup
- [ ] Enter the real fee structure for every class (all fee heads — tuition, transport, hostel,
      exam fee, etc. — not just tuition)
- [ ] Build the real timetable for at least the first term
- [ ] Set up transport routes / hostel rooms / library catalog if the school uses those modules —
      or explicitly decide to skip them for launch and revisit later
- [ ] Configure the SMS provider in Integration Center if the school wants SMS notifications (see
      `CREDENTIALS_CHECKLIST.md` item 2)

## 3. Known issues to be aware of (not blocking for a single-school deployment)

- [x] ~~`POST /auth/register-institution` (self-service school signup) has a real bug — 500s for any caller.~~ Fixed 2026-08-07: the Zod validation schema and the service code were reading different field names (`institution_name` vs `name`, `admin_username` didn't exist at all), so every request failed a NOT NULL constraint. Verified with a live POST against a local dev server — now returns 201 with a working token. Along the way also found and fixed a dangling foreign key on `fee_structures.parent_version_id` (pointed at a table a past migration had dropped) that broke institution deletion in the local dev DB.
- [x] ~~`students.admission_number` is globally unique across the whole database, not per-school.~~ Fixed 2026-08-07: this was a real, guaranteed collision, not just theoretical — admission numbers are auto-generated per-institution as `APP-{year}-{seq}`, so any two institutions' first applicant of a year would both get `APP-2026-0001` and the second insert would fail. Changed the DB constraint from a global `UNIQUE` to `UNIQUE(institution_id, admission_number)`. Application-level duplicate checks (`findDuplicateAdmissionNumber`) were already correctly scoped by institution — only the raw schema constraint was wrong. Verified directly against the local dev D1: same number across two institutions now succeeds, same number within one institution still rejected.

## 4. Once credentials are added (see `CREDENTIALS_CHECKLIST.md`)

- [ ] Send a real test email (password reset) and confirm it arrives — check spam folder too, and
      confirm the sender address/domain looks legitimate rather than like spam
- [ ] Send a real test SMS via Integration Center and confirm it arrives, and that the sender ID
      is something recognizable to a parent (not a random long number, if the provider supports
      alphanumeric sender IDs)
- [ ] Confirm `JWT_SECRET` is set to a real generated value in production, not left as a dev default
- [ ] Once payment gateway is built: do a real sandbox transaction end-to-end, including a
      deliberately failed/declined payment to confirm the failure path doesn't mark fees as paid
- [ ] If self-service institution signup will ever be exposed publicly, confirm
      `INSTITUTION_INVITE_SECRET` is set — otherwise anyone could register a new school

## 5. Operational readiness

- [ ] Confirm nightly automated backups are actually firing once deployed (Cron Trigger was wired
      in but never observed running in production — check System Settings → Backup History a day
      or two after deploy)
- [ ] Confirm you know how to actually restore from a backup if needed — don't wait for a real
      data-loss incident to find out the restore path doesn't work
- [ ] Decide who at the school is the "admin" point of contact and make sure they know their login
- [ ] Give the admin contact (or write down for yourself) a short "how to reset a forgotten
      password," "how to add a new student," "how to add a new staff member" cheat sheet — the
      school's admin staff won't have your context
- [ ] Decide on a support channel: how does the school reach you when something breaks
      (phone/email/WhatsApp), and what response time you're realistically committing to
- [ ] Decide a rollback plan: if a deploy breaks something in production, do you know how to
      redeploy the previous working version (`wrangler deployments list` / `wrangler rollback`)?
- [ ] Data privacy basics: confirm student/parent personal data (names, phone numbers, health
      records in the Medical tab) is only accessible to roles that should see it — cross-reference
      with `MANUAL_TEST_TRACKER.md` §33 (cross-role spot checks)
- [ ] Do a basic cross-browser/device check: the school's staff will likely use whatever's on
      their desk (older Chrome, Edge, maybe Safari on an iPad) — at minimum check one Chromium
      browser and one mobile browser
- [ ] Confirm what happens if the school's internet drops mid-action (e.g. mid fee-payment entry)
      — does it fail cleanly or double-submit/corrupt state?
- [ ] Set a realistic go-live date with the school and confirm someone will be available (you or
      them) for the first few real school-days in case issues come up under real usage load

---
*Created 2026-08-03, expanded 2026-08-14. This is a checklist for you to work through, not
something I'll do automatically — say the word when you want to tackle any section together.*
