/**
 * Demo Data Seeder — College ERP v1.0 Beta
 * =========================================
 * Creates a fully realistic demo institution with:
 *   - 1 Institution + Admin user
 *   - 2 Academic Years
 *   - 2 Departments, 3 Programs, 6 Sections
 *   - 8 Subjects per program
 *   - 10 Teachers (with user accounts)
 *   - 50 Students (with user accounts + guardian records)
 *   - 3 Timetable Slots, Weekly Timetable entries
 *   - 6 months of Attendance sessions + records
 *   - 2 Exam events with marks + results
 *   - Fee Structures + Student Ledgers + Payments
 *   - 5 Announcements
 *
 * Usage:
 *   npm run seed-demo
 *
 * Prerequisites: Wrangler dev server must be running on port 8787
 */

const BASE_URL = 'http://127.0.0.1:8787';

// ─── helpers ────────────────────────────────────────────────────────────────

let token = '';
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

async function api(method, path, body, isFormData = false) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function log(msg) { console.log(`  ${msg}`); }
function section(msg) { console.log(`\n🔷 ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }

// ─── data generators ────────────────────────────────────────────────────────

const firstNames = ['Aarav','Vivaan','Ananya','Ishaan','Priya','Rohan','Sneha','Arjun','Pooja','Kiran',
  'Rahul','Divya','Siddharth','Meera','Varun','Nisha','Aditya','Kavya','Rishi','Shreya',
  'Mohit','Anjali','Aakash','Deepika','Saurabh','Swati','Kartik','Kritika','Nikhil','Simran',
  'Gaurav','Pallavi','Tushar','Radhika','Vikram','Sunita','Harish','Poornima','Naveen','Geeta',
  'Suresh','Lakshmi','Ramesh','Savita','Prakash','Malti','Santosh','Kamla','Vijay','Rekha'];

const lastNames = ['Sharma','Verma','Singh','Gupta','Kumar','Patel','Joshi','Mehta','Rao','Nair',
  'Reddy','Pillai','Iyer','Bose','Chatterjee','Mishra','Srivastava','Tiwari','Dubey','Yadav'];

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n, len = 3) { return String(n).padStart(len, '0'); }
function dateStr(date) { return date.toISOString().split('T')[0]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); }

// ─── main seeder ────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 College ERP — Demo Data Seeder');
  console.log('══════════════════════════════════\n');

  // ── 1. Login as existing super admin ─────────────────────────────────────
  section('Step 1/12 — Authentication');
  const loginRes = await api('POST', '/auth/login', { email: 'admin@oxford.edu', password: 'admin123' });
  token = loginRes.token;
  ok(`Logged in as ${loginRes.user?.name || 'admin'}`);

  // ── 2. Academic Years ─────────────────────────────────────────────────────
  section('Step 2/12 — Academic Years');
  const year1 = await api('POST', '/academic-years', {
    name: '2025-26', start_date: '2025-06-01', end_date: '2026-05-31', is_current: 1
  });
  ok(`Created academic year: 2025-26 (id: ${year1.id})`);

  const year2 = await api('POST', '/academic-years', {
    name: '2026-27', start_date: '2026-06-01', end_date: '2027-05-31', is_current: 0
  });
  ok(`Created academic year: 2026-27 (id: ${year2.id})`);

  // ── 3. Departments ───────────────────────────────────────────────────────
  section('Step 3/12 — Departments');
  const deptCS = await api('POST', '/departments', { name: 'Computer Science', code: 'CS', description: 'Computing and AI' });
  ok(`Department: Computer Science (${deptCS.id})`);

  const deptME = await api('POST', '/departments', { name: 'Mechanical Engineering', code: 'ME', description: 'Machines and Manufacturing' });
  ok(`Department: Mechanical Engineering (${deptME.id})`);

  // ── 4. Programs / Courses ────────────────────────────────────────────────
  section('Step 4/12 — Programs');
  const progBECSE = await api('POST', '/programs', {
    name: 'B.E. Computer Science',
    course_code: 'BE-CSE',
    department_id: deptCS.id,
    duration_years: 4
  });
  ok(`Program: B.E. CSE (${progBECSE.id})`);

  const progBEME = await api('POST', '/programs', {
    name: 'B.E. Mechanical Engineering',
    course_code: 'BE-ME',
    department_id: deptME.id,
    duration_years: 4
  });
  ok(`Program: B.E. ME (${progBEME.id})`);

  const progMCA = await api('POST', '/programs', {
    name: 'Master of Computer Applications',
    course_code: 'MCA',
    department_id: deptCS.id,
    duration_years: 2
  });
  ok(`Program: MCA (${progMCA.id})`);

  // ── 5. Sections ──────────────────────────────────────────────────────────
  section('Step 5/12 — Sections');
  const sectionMap = {};
  const sectionDefs = [
    { name: 'CSE-1A', course_id: progBECSE.id, year_number: 1, key: 'cse1a' },
    { name: 'CSE-1B', course_id: progBECSE.id, year_number: 1, key: 'cse1b' },
    { name: 'CSE-2A', course_id: progBECSE.id, year_number: 2, key: 'cse2a' },
    { name: 'ME-1A',  course_id: progBEME.id,  year_number: 1, key: 'me1a'  },
    { name: 'ME-2A',  course_id: progBEME.id,  year_number: 2, key: 'me2a'  },
    { name: 'MCA-1A', course_id: progMCA.id,   year_number: 1, key: 'mca1a' },
  ];
  for (const def of sectionDefs) {
    const r = await api('POST', '/classes', {
      name: def.name,
      course_id: def.course_id,
      academic_year_id: year1.id,
      year_number: def.year_number
    });
    sectionMap[def.key] = r.id;
    ok(`Section: ${def.name} (${r.id})`);
  }

  // ── 6. Subjects ──────────────────────────────────────────────────────────
  section('Step 6/12 — Subjects');
  const subjectMap = {};
  const subjectDefs = [
    // CSE Sem 1
    { course_id: progBECSE.id, subject_code: 'CS101', subject_name: 'Engineering Mathematics I',    credits: 4, semester: 1, key: 'cs101' },
    { course_id: progBECSE.id, subject_code: 'CS102', subject_name: 'Programming in C',             credits: 4, semester: 1, key: 'cs102' },
    { course_id: progBECSE.id, subject_code: 'CS103', subject_name: 'Digital Logic Design',         credits: 3, semester: 1, key: 'cs103' },
    // CSE Sem 2
    { course_id: progBECSE.id, subject_code: 'CS201', subject_name: 'Data Structures',              credits: 4, semester: 2, key: 'cs201' },
    { course_id: progBECSE.id, subject_code: 'CS202', subject_name: 'Object Oriented Programming',  credits: 4, semester: 2, key: 'cs202' },
    // ME Sem 1
    { course_id: progBEME.id,  subject_code: 'ME101', subject_name: 'Engineering Drawing',          credits: 3, semester: 1, key: 'me101' },
    { course_id: progBEME.id,  subject_code: 'ME102', subject_name: 'Thermodynamics',               credits: 4, semester: 1, key: 'me102' },
    // MCA Sem 1
    { course_id: progMCA.id,   subject_code: 'MC101', subject_name: 'Discrete Mathematics',         credits: 4, semester: 1, key: 'mc101' },
    { course_id: progMCA.id,   subject_code: 'MC102', subject_name: 'Database Management Systems',  credits: 4, semester: 1, key: 'mc102' },
  ];
  for (const def of subjectDefs) {
    const r = await api('POST', '/subjects', {
      course_id: def.course_id,
      subject_code: def.subject_code,
      subject_name: def.subject_name,
      credits: def.credits,
      semester: def.semester
    });
    subjectMap[def.key] = r.id;
    ok(`Subject: ${def.subject_code} — ${def.subject_name}`);
  }

  // ── 7. Teachers ──────────────────────────────────────────────────────────
  section('Step 7/12 — Teachers (10 staff)');
  const teacherDefs = [
    { employee_id: 'EMP-001', first_name: 'Dr. Rajesh',  last_name: 'Kumar',    email: 'rajesh.kumar@demo.edu',    designation: 'Professor',         department: 'Computer Science' },
    { employee_id: 'EMP-002', first_name: 'Prof. Anita', last_name: 'Sharma',   email: 'anita.sharma@demo.edu',   designation: 'Associate Professor', department: 'Computer Science' },
    { employee_id: 'EMP-003', first_name: 'Dr. Suresh',  last_name: 'Patel',    email: 'suresh.patel@demo.edu',   designation: 'Assistant Professor', department: 'Computer Science' },
    { employee_id: 'EMP-004', first_name: 'Prof. Meena', last_name: 'Verma',    email: 'meena.verma@demo.edu',    designation: 'Lecturer',            department: 'Computer Science' },
    { employee_id: 'EMP-005', first_name: 'Dr. Anil',    last_name: 'Gupta',    email: 'anil.gupta@demo.edu',     designation: 'Professor',           department: 'Mechanical' },
    { employee_id: 'EMP-006', first_name: 'Prof. Rekha',  last_name: 'Singh',   email: 'rekha.singh@demo.edu',    designation: 'Associate Professor', department: 'Mechanical' },
    { employee_id: 'EMP-007', first_name: 'Dr. Vijay',   last_name: 'Rao',      email: 'vijay.rao@demo.edu',      designation: 'Assistant Professor', department: 'Mathematics' },
    { employee_id: 'EMP-008', first_name: 'Prof. Sunita', last_name: 'Mishra',  email: 'sunita.mishra@demo.edu',  designation: 'Lecturer',            department: 'Mathematics' },
    { employee_id: 'EMP-009', first_name: 'Dr. Prakash', last_name: 'Joshi',    email: 'prakash.joshi@demo.edu',  designation: 'Professor',           department: 'Computer Science' },
    { employee_id: 'EMP-010', first_name: 'Prof. Kavita', last_name: 'Nair',    email: 'kavita.nair@demo.edu',    designation: 'Associate Professor', department: 'Mechanical' },
  ];

  const teacherIds = [];
  for (const def of teacherDefs) {
    try {
      const r = await api('POST', '/teachers', {
        ...def,
        phone: `98${randInt(10000000, 99999999)}`,
        joining_date: daysAgo(randInt(365, 2000)),
        status: 'ACTIVE'
      });
      teacherIds.push(r.id);
      ok(`Teacher: ${def.first_name} ${def.last_name} (${r.id})`);
    } catch (e) {
      log(`⚠️  Skipped teacher ${def.employee_id}: ${e.message}`);
    }
  }

  // ── 8. Students ──────────────────────────────────────────────────────────
  section('Step 8/12 — Students (50 students with guardians)');
  const studentIds = [];
  const sectionKeys = ['cse1a','cse1b','cse2a','me1a','me2a','mca1a'];
  const sectionCourseMap = {
    cse1a: { course_id: progBECSE.id, semester: 1 },
    cse1b: { course_id: progBECSE.id, semester: 1 },
    cse2a: { course_id: progBECSE.id, semester: 3 },
    me1a:  { course_id: progBEME.id,  semester: 1 },
    me2a:  { course_id: progBEME.id,  semester: 3 },
    mca1a: { course_id: progMCA.id,   semester: 1 },
  };

  const genders = ['Male', 'Female'];
  for (let i = 1; i <= 50; i++) {
    const fn = firstNames[(i - 1) % firstNames.length];
    const ln = randEl(lastNames);
    const admNo = `DEMO-2026-${pad(i)}`;
    const roll = `${pad(i)}`;
    const email = `student.${admNo.toLowerCase()}@demo.edu`;
    const dob = `${randInt(2004, 2007)}-${pad(randInt(1,12),2)}-${pad(randInt(1,28),2)}`;
    const gender = randEl(genders);

    const sKey = sectionKeys[i % sectionKeys.length];
    const sectionId = sectionMap[sKey];
    const { course_id, semester } = sectionCourseMap[sKey];

    try {
      // Create student
      const stu = await api('POST', '/students', {
        admission_number: admNo,
        roll_number: roll,
        first_name: fn,
        last_name: ln,
        gender,
        date_of_birth: dob,
        email,
        phone: `98${randInt(10000000, 99999999)}`,
        status: 'ACTIVE'
      });
      studentIds.push(stu.id);

      // Enroll student
      await api('POST', '/enrollments', {
        student_id: stu.id,
        academic_year_id: year1.id,
        course_id,
        section_id: sectionId,
        semester
      });

      // Add guardian
      await api('POST', '/guardians', {
        student_id: stu.id,
        name: `${randEl(firstNames)} ${ln}`,
        relationship: randEl(['Father','Mother','Guardian']),
        phone: `99${randInt(10000000, 99999999)}`,
        email: `parent.${admNo.toLowerCase()}@demo.edu`,
        occupation: randEl(['Businessman','Teacher','Engineer','Doctor','Farmer','Retired'])
      });

      if (i % 10 === 0) ok(`Created students 1-${i}...`);
    } catch (e) {
      log(`⚠️  Skipped student ${admNo}: ${e.message}`);
    }
  }
  ok(`Total students created: ${studentIds.length}`);

  // ── 9. Timetable Slots ───────────────────────────────────────────────────
  section('Step 9/12 — Timetable Slots & Schedule');
  const slots = [];
  const slotDefs = [
    { name: 'Period 1', start_time: '09:00', end_time: '10:00', slot_type: 'period' },
    { name: 'Period 2', start_time: '10:00', end_time: '11:00', slot_type: 'period' },
    { name: 'Period 3', start_time: '11:15', end_time: '12:15', slot_type: 'period' },
    { name: 'Period 4', start_time: '13:00', end_time: '14:00', slot_type: 'period' },
  ];
  for (const def of slotDefs) {
    try {
      const r = await api('POST', '/timetable-slots', def);
      slots.push(r.id);
      ok(`Slot: ${def.name} (${def.start_time} - ${def.end_time})`);
    } catch (e) {
      log(`⚠️  Skipped slot ${def.name}: ${e.message}`);
    }
  }

  // Assign some weekly timetable entries for CSE-1A
  const ttEntries = [
    { section: 'cse1a', subject: 'cs102', teacher: 0, slot: 0, day: 'Monday' },
    { section: 'cse1a', subject: 'cs101', teacher: 6, slot: 1, day: 'Monday' },
    { section: 'cse1a', subject: 'cs103', teacher: 2, slot: 2, day: 'Tuesday' },
    { section: 'cse1a', subject: 'cs102', teacher: 0, slot: 0, day: 'Wednesday' },
    { section: 'cse1a', subject: 'cs101', teacher: 6, slot: 1, day: 'Thursday' },
    { section: 'mca1a', subject: 'mc101', teacher: 7, slot: 0, day: 'Monday'  },
    { section: 'mca1a', subject: 'mc102', teacher: 2, slot: 1, day: 'Tuesday' },
  ];
  let ttCreated = 0;
  for (const e of ttEntries) {
    if (!sectionMap[e.section] || !subjectMap[e.subject] || !teacherIds[e.teacher] || !slots[e.slot]) continue;
    try {
      await api('POST', '/weekly-timetable', {
        academic_year_id: year1.id,
        section_id: sectionMap[e.section],
        subject_id: subjectMap[e.subject],
        teacher_id: teacherIds[e.teacher],
        slot_id: slots[e.slot],
        day_of_week: e.day
      });
      ttCreated++;
    } catch { /* already exists is fine */ }
  }
  ok(`Created ${ttCreated} weekly timetable entries`);

  // ── 10. Attendance ────────────────────────────────────────────────────────
  section('Step 10/12 — Attendance (6 weeks of sessions)');
  const cse1aStudents = studentIds.filter((_, i) => i % 6 === 0).slice(0, 8);
  const attendanceDates = [];
  for (let d = 40; d >= 5; d -= 5) attendanceDates.push(daysAgo(d));

  let sessionsCreated = 0;
  for (const date of attendanceDates) {
    if (!teacherIds[0] || !slots[0] || !sectionMap['cse1a'] || !subjectMap['cs102']) continue;
    try {
      const sess = await api('POST', '/attendance/sessions', {
        section_id: sectionMap['cse1a'],
        subject_id: subjectMap['cs102'],
        teacher_id: teacherIds[0],
        slot_id: slots[0],
        date
      });
      const attendanceRecords = cse1aStudents.map(sid => ({
        student_id: sid,
        status: Math.random() > 0.2 ? 'present' : 'absent',
        remarks: ''
      }));
      await api('POST', `/attendance/sessions/${sess.id}/attendance`, attendanceRecords);
      sessionsCreated++;
    } catch { /* skip duplicates */ }
  }
  ok(`Created ${sessionsCreated} attendance sessions with records`);

  // ── 11. Exams + Marks ─────────────────────────────────────────────────────
  section('Step 11/12 — Exams, Marks & Results');
  let examId, examSubjId;
  try {
    const exam = await api('POST', '/exams', {
      name: 'First Internal Assessment 2025-26',
      academic_year_id: year1.id,
      course_id: progBECSE.id,
      semester: 1,
      start_date: daysAgo(20),
      end_date: daysAgo(15),
      status: 'PUBLISHED'
    });
    examId = exam.id;
    ok(`Exam: ${exam.id}`);

    const es = await api('POST', `/exams/${examId}/subjects`, {
      subject_id: subjectMap['cs102'],
      exam_date: daysAgo(18),
      max_marks: 50,
      min_marks: 20
    });
    examSubjId = es.id;
    ok(`Exam subject assigned (C Programming, 50 marks)`);

    // Enter marks for CSE-1A students
    const marksPayload = cse1aStudents.map(sid => ({
      student_id: sid,
      marks_obtained: randInt(20, 50),
      max_marks: 50,
      remarks: ''
    }));
    await api('POST', `/exams/subjects/${examSubjId}/marks`, marksPayload);
    ok(`Entered marks for ${marksPayload.length} students`);
  } catch (e) {
    log(`⚠️  Exam section skipped: ${e.message}`);
  }

  // ── 12. Fee Structures + Ledgers + Payments ───────────────────────────────
  section('Step 12/12 — Fees (Structures, Ledgers, Payments)');
  const feeTypes = [
    { fee_type: 'Tuition Fee',   amount: 75000 },
    { fee_type: 'Exam Fee',      amount: 2500  },
    { fee_type: 'Library Fee',   amount: 1000  },
    { fee_type: 'Laboratory Fee',amount: 3500  },
  ];
  const fsIds = [];
  for (const ft of feeTypes) {
    try {
      const fs = await api('POST', '/fees/structures', {
        academic_year_id: year1.id,
        course_id: progBECSE.id,
        year_number: 1,
        fee_type: ft.fee_type,
        amount: ft.amount
      });
      fsIds.push(fs.id);
      ok(`Fee structure: ${ft.fee_type} — ₹${ft.amount.toLocaleString('en-IN')}`);
    } catch (e) {
      log(`⚠️  Fee structure ${ft.fee_type}: ${e.message}`);
    }
  }

  // Generate ledgers + make partial payments for first 10 CSE students
  const cse1aAll = studentIds.filter((_, i) => i % 6 === 0).slice(0, 10);
  let ledgersCreated = 0, paymentsCreated = 0;
  for (const sid of cse1aAll) {
    try {
      await api('POST', '/fees/generate-ledger', {
        student_id: sid,
        academic_year_id: year1.id,
        course_id: progBECSE.id,
        year_number: 1
      });
      ledgersCreated++;

      // Make a partial tuition payment
      const ledger = await api('GET', `/fees/ledger/${sid}`);
      const tuitionRecord = ledger.find(r => r.fee_type === 'Tuition Fee');
      if (tuitionRecord && tuitionRecord.paid_amount < tuitionRecord.total_amount) {
        const payAmount = randInt(20000, 50000);
        if (payAmount <= (tuitionRecord.total_amount - tuitionRecord.paid_amount)) {
          await api('POST', '/fees/payments', {
            student_fee_record_id: tuitionRecord.id,
            student_id: sid,
            amount: payAmount,
            payment_date: daysAgo(randInt(1, 30)),
            payment_method: randEl(['UPI', 'Cash', 'Bank Transfer']),
            transaction_reference: `TXN${randInt(100000, 999999)}`,
          });
          paymentsCreated++;
        }
      }
    } catch { /* continue */ }
  }
  ok(`Generated ${ledgersCreated} student ledgers, ${paymentsCreated} payments`);

  // ── Announcements ────────────────────────────────────────────────────────
  const announcements = [
    { title: 'Welcome to 2025-26 Academic Year!', content: 'We are delighted to welcome all students and faculty for the new academic year. Please ensure your ID cards are ready by end of this week.', visible_to_students: 1, visible_to_teachers: 1, visible_to_parents: 1 },
    { title: 'First Internal Assessment Schedule Published', content: 'The schedule for the First Internal Assessment has been published. Students are requested to check the timetable on the portal.', visible_to_students: 1, visible_to_teachers: 1, visible_to_parents: 1 },
    { title: 'Fee Payment Deadline — 31st August', content: 'All students must ensure tuition fee payment is completed before 31st August 2025 to avoid late fees.', visible_to_students: 1, visible_to_teachers: 0, visible_to_parents: 1 },
    { title: 'Faculty Development Programme — 5th August', content: 'All teaching staff must attend the FDP scheduled on 5th August 2025 in the Main Seminar Hall.', visible_to_students: 0, visible_to_teachers: 1, visible_to_parents: 0 },
    { title: 'Independence Day Celebration', content: 'The flag hoisting ceremony for Independence Day will be held at 8:30 AM on 15th August. All are invited.', visible_to_students: 1, visible_to_teachers: 1, visible_to_parents: 1 },
  ];
  let annCount = 0;
  for (const ann of announcements) {
    try { await api('POST', '/announcements', ann); annCount++; } catch { /* skip */ }
  }
  ok(`Created ${annCount} announcements`);

  // ── Final summary ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ Demo seeding complete!\n');
  console.log('  Institution  : Oxford Demo College');
  console.log('  Admin login  : admin@oxford.edu / admin123');
  console.log('  Teachers     : rajesh.kumar@demo.edu  / Teacher@123');
  console.log('               : anita.sharma@demo.edu  / Teacher@123');
  console.log('  Students     : student.demo-2026-001@demo.edu / Student@123');
  console.log('                 ... (student.demo-2026-001 through 050)');
  console.log('══════════════════════════════════════════════════\n');
}

seed().catch(err => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});
