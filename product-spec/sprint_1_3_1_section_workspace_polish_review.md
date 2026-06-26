# Sprint 1.3.1: Section Workspace Polish

This document defines the review checklist, database migrations, and frontend workspace dashboard implemented to transform the metadata-heavy Section page into a true, interactive Section Workspace.

---

## 🔍 1. Workspace Philosophy
Instead of treating a Section (Class) as a static record with metadata (capacity, room, advisor), it has been redesigned into a teacher-centric **Workspace** that answers key queries in 5 seconds and coordinates day-to-day operations.

```
Entity Header (Section name, Program, Year)
        ↓
KPIs & Dashboards (Advisor, Room, Fill Rate, Attendance, Risk levels, Fees)
        ↓
Quick Actions Panel (Mark Attendance, Broadcast notices, View Timetable, Settings)
        ↓
Workspace Tabs (Dashboard, Roster, Attendance, Timetable, Subjects, Teachers, Exams, Notices, Analytics, Documents, Timeline)
        ↓
Audit Log Timeline
```

---

## 🔄 2. User Workspace Journeys
1. **Interactive KPI Navigation**: KPIs on the main Section Workspace are clickable, linking the user directly to corresponding tabs (e.g. clicking "Students At Risk" activates the Roster tab with risk filters pre-selected; clicking "Defaulters" goes to Analytics).
2. **Attendance Operations**: Quick action button "Mark Attendance" navigates directly to the Attendance Creation page with `section_id` pre-filled and forms active.
3. **Broadcasting Notices**: Class teacher or Admin can publish section-specific notices which append directly to the Section announcements feed.
4. **Documents Library**: Folder-based organization ('Timetable', 'Exam Schedule', 'Projects', 'Circulars', 'Photos', 'Assignments') with file upload, download and deletion capabilities.
5. **Analytics & Performance**: Real-time calculated widgets showing Attendance top performers, fee collection progression rate, and enrollment demographics.

---

## 🚦 3. Database Schema Modifications
The following additions were introduced via D1 SQLite migration:
* **Section Announcements**: Added `section_id` (TEXT REFERENCES sections(id)) to `announcements` to map local broadcasts.
* **Section Documents**: Created `section_documents` table to record file metadata uploads, linked to R2 storage keys.
  ```sql
  CREATE TABLE IF NOT EXISTS section_documents (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id),
    name TEXT NOT NULL,
    folder TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    uploaded_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1
  );
  ```

---

## 🏁 4. Acceptance Criteria Checklist
- [x] Create D1 SQLite migration `migration-sprint-1-3-1-section-workspace.sql` and run successfully.
- [x] Update master `schema.sql` with new columns and table definitions.
- [x] Add section timeline and documents API endpoints to `sections.routes.ts` in backend.
- [x] Update announcements list service and routes in backend to support `section_id` query filtering (general + section notices returned).
- [x] Implement complete, persistent tab-based `SectionWorkspace.tsx` in frontend.
- [x] Enable link routing in Classes list table to redirect eye button and section name directly to workspace.
- [x] Pre-fill section parameter on Attendance creation form when coming from workspace quick action.
- [x] Frontend and Backend compile and pass type checks cleanly.
