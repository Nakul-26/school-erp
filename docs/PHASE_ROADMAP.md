# School ERP — Priority Roadmap

## Phase A — Revenue & Compliance ✅ COMPLETED
- [x] Report Cards PDF
- [x] Fee Receipts PDF
- [x] Outstanding / Dues Report
- [x] Parent / Student Portal (fee ledger, receipts, report cards)
- [x] Timetable Conflict Detection (backend checks + UI warnings)

## Phase B — Communication & Operations ✅ COMPLETED
- [x] Circular & Notice Board (categorized, role-targeted, attachments)
- [x] Automated Email Alerts (attendance absence, fee due reminders via Resend)
- [x] Library Management (catalog, issue/return tracking, overdue fines)
- [x] Transport Routing & Billing (routes, stops, monthly billing)

## Phase C — Growth & Upgrades ✅ COMPLETED
- [x] Online Fee Payment Checkout (UPI QR + Card, automated receipt on success)
- [x] Multi-Branch Support (super admin branch selector, re-signed JWT per branch)
- [x] ID Cards & Official Certificates (Student ID badge, Bonafide, Transfer Certificate)
- [x] Direct Parent-Teacher Messaging (contacts list, real-time chat polling, read receipts)

---

## Phase D — UX Simplification 🔄 IN PROGRESS

> **"Make a powerful system feel simple."**

### The Problem
The ERP has grown into a full system but navigating it now requires understanding
internal database concepts (enrollments, allocations, mappings, academic years)
instead of just doing the **job** (admit a student, mark attendance, collect fees).

### The Goal
Redesign the frontend around **tasks people want to accomplish**, not the underlying
tables and workflows. Keep the backend and database exactly as they are.

### Principles
1. **Progressive Disclosure** — Show only what's needed at that moment
2. **Task-First Thinking** — One task = one screen = done
3. **Smart Defaults & Automation** — Software handles intermediate steps
4. **Guided Setup** — If something is missing, don't fail — guide the user there
5. **Plain Language** — Replace technical terms with everyday language

### Features to Simplify

#### 🎓 Admissions (currently: student + enrollment + guardian + mappings across 4 pages)
- [x] Add Student wizard — one page, 4 tabs: Basic Info → Guardian → Class/Section → Finish
- [x] Auto-create enrollment, auto-link to active academic year

#### 📚 Library (currently: separate book catalog + borrow register with manual student/book ID entry)
- [x] Student-search-first borrow flow — type student name → pick book → Issue
- [x] Toast notifications instead of browser alert()

#### 🚌 Transport (currently: route CRUD + allocation form with foreign keys)
- [x] Route capacity bar indicator (X/Y seats filled, colour-coded)
- [ ] "Assign Bus" action from Student profile page directly

#### 💬 Messaging (currently: contacts loaded from backend, no unread count indicator)
- [x] Unread message badge on sidebar link (backend endpoint added)
- [ ] Quick-reply from Notification bell dropdown

#### 🪪 Certificates (currently: template type dropdown + student dropdown, no preview)
- [x] Live search+select combo replaces two-element search + dropdown
- [x] Auto-selects when only one match, shows "✓ Selected" confirmation

#### 💳 Online Payment (currently: Pay Online button shows browser alert() on success)
- [x] Payment success screen with receipt number + green check animation
- [x] "Done" button closes modal cleanly

#### 📋 Timetable (currently: complex period/slot/assignment multi-step process)
- [ ] Guided setup checklist: Teachers → Subjects → Assign → Generate
- [ ] Visual day-grid editor instead of raw form inputs

#### ⚙️ Settings & Setup (currently: 8+ separate settings pages in sidebar)
- [x] School Setup hub page consolidates all settings into one screen
- [x] Sidebar "Settings & Setup" collapsed to 2 links (Approvals + School Setup)
- [x] "First-time setup" guidance banner at bottom of Setup hub
