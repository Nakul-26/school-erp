/**
 * Integration Test for Batch 1 Features:
 * 1. Academic Calendar
 * 2. Timetable Slots
 * 3. Weekly Timetable
 * 4. Attendance Session
 * 5. Student Attendance
 */
const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Starting integration tests for Batch 1 features...\n');
  
  let token = '';
  
  // Helper for requests
  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { text };
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  }

  // 1. Auth Login
  console.log('🔑 [1/5] Testing Authentication...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@oxford.edu',
      password: 'admin123',
    },
  });
  
  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    process.exit(1);
  }
  
  token = loginRes.data.token;
  console.log('✅ Login successful!\n');

  // 2. Academic Calendar
  console.log('📅 [2/5] Testing Academic Calendar...');
  
  const holiday = {
    name: 'Independence Day',
    start_date: '2026-08-15',
    end_date: '2026-08-15',
    type: 'holiday',
    description: 'National holiday'
  };
  
  const examDay = {
    name: 'Internal Exam',
    start_date: '2026-09-01',
    end_date: '2026-09-01',
    type: 'exam',
    description: 'First Internal evaluation'
  };
  
  const createCalRes1 = await request('/academic-calendar', {
    method: 'POST',
    body: holiday
  });
  if (createCalRes1.status !== 201) throw new Error(`Create calendar entry failed: ${JSON.stringify(createCalRes1.data)}`);
  console.log(`- Created holiday with ID: ${createCalRes1.data.id}`);

  const createCalRes2 = await request('/academic-calendar', {
    method: 'POST',
    body: examDay
  });
  if (createCalRes2.status !== 201) throw new Error(`Create calendar entry failed: ${JSON.stringify(createCalRes2.data)}`);
  console.log(`- Created exam day with ID: ${createCalRes2.data.id}`);

  const listCalRes = await request('/academic-calendar');
  if (!listCalRes.ok) throw new Error(`List calendar failed`);
  console.log(`- Retrieved calendar entries count: ${listCalRes.data.length}`);
  
  const hasHoliday = listCalRes.data.some(c => c.name === holiday.name);
  const hasExam = listCalRes.data.some(c => c.name === examDay.name);
  if (!hasHoliday || !hasExam) throw new Error('Seeded calendar items not found in database');
  console.log('✅ Academic Calendar verified.\n');

  // 3. Timetable Slots
  console.log('⏰ [3/5] Testing Timetable Slots...');
  
  const slot1 = {
    name: 'Period 1',
    start_time: '09:00',
    end_time: '10:00',
    slot_type: 'period'
  };
  
  const slot2 = {
    name: 'Period 2',
    start_time: '10:00',
    end_time: '11:00',
    slot_type: 'period'
  };
  
  const createSlot1 = await request('/timetable-slots', {
    method: 'POST',
    body: slot1
  });
  if (createSlot1.status !== 201) throw new Error('Create slot 1 failed');
  const slot1Id = createSlot1.data.id;
  console.log(`- Created slot 1: ${slot1.name} with ID: ${slot1Id}`);

  const createSlot2 = await request('/timetable-slots', {
    method: 'POST',
    body: slot2
  });
  if (createSlot2.status !== 201) throw new Error('Create slot 2 failed');
  const slot2Id = createSlot2.data.id;
  console.log(`- Created slot 2: ${slot2.name} with ID: ${slot2Id}`);

  const listSlots = await request('/timetable-slots');
  if (!listSlots.ok) throw new Error('List slots failed');
  console.log(`- Total timetable slots: ${listSlots.data.length}`);
  console.log('✅ Timetable Slots verified.\n');

  // 4. Weekly Timetable (Create a teacher and student, enroll student in section-a, and assign timetable)
  console.log('🗓️ [4/5] Testing Weekly Timetable assignment...');
  
  // Fetch active academic year, course, section, and subject dynamically to avoid foreign key failures
  const yearsRes = await request('/academic-years');
  const coursesRes = await request('/programs');
  const sectionsRes = await request('/sections');
  const subjectsRes = await request('/subjects');
  
  if (
    !yearsRes.ok || yearsRes.data.length === 0 ||
    !coursesRes.ok || coursesRes.data.length === 0 ||
    !sectionsRes.ok || sectionsRes.data.length === 0 ||
    !subjectsRes.ok || subjectsRes.data.length === 0
  ) {
    throw new Error('Could not fetch academic years, programs, sections, or subjects to run timetable tests.');
  }
  
  const activeYearId = yearsRes.data[0].id;
  const activeCourseId = coursesRes.data[0].id;
  const activeSectionId = sectionsRes.data[0].id;
  const activeSubjectId = subjectsRes.data[0].id;

  // Create teacher
  const teacherInput = {
    employee_id: 'EMP_T_1001_' + Date.now(),
    first_name: 'John',
    last_name: 'Doe',
    email: 'doe_' + Date.now() + '@oxford.edu',
    status: 'ACTIVE'
  };
  const createTeacher = await request('/teachers', {
    method: 'POST',
    body: teacherInput
  });
  if (createTeacher.status !== 201) throw new Error(`Create teacher failed: ${JSON.stringify(createTeacher.data)}`);
  const teacherId = createTeacher.data.id;
  console.log(`- Seeded teacher for timetable. ID: ${teacherId}`);

  // Create student
  const studentInput = {
    admission_number: 'ADM_S_1001_' + Date.now(),
    roll_number: 'CSE-001',
    first_name: 'Bob',
    last_name: 'Sponge',
    status: 'ACTIVE'
  };
  const createStudent = await request('/students', {
    method: 'POST',
    body: studentInput
  });
  if (createStudent.status !== 201) throw new Error(`Create student failed: ${JSON.stringify(createStudent.data)}`);
  const studentId = createStudent.data.id;
  console.log(`- Seeded student for attendance. ID: ${studentId}`);

  // Enroll student in Section
  const enrollInput = {
    student_id: studentId,
    academic_year_id: activeYearId,
    course_id: activeCourseId,
    section_id: activeSectionId,
    semester: 1
  };
  const enrollStudent = await request('/enrollments', {
    method: 'POST',
    body: enrollInput
  });
  if (enrollStudent.status !== 201) throw new Error(`Enrollment failed: ${JSON.stringify(enrollStudent.data)}`);
  console.log(`- Enrolled student bob into section ${activeSectionId}`);

  // Assign slot to timetable
  const assignment = {
    academic_year_id: activeYearId,
    section_id: activeSectionId,
    subject_id: activeSubjectId,
    teacher_id: teacherId,
    slot_id: slot1Id,
    day_of_week: 'Monday'
  };
  
  const createAssign = await request('/weekly-timetable', {
    method: 'POST',
    body: assignment
  });
  if (createAssign.status !== 201) throw new Error(`Create timetable assignment failed: ${JSON.stringify(createAssign.data)}`);
  const wtId = createAssign.data.id;
  console.log(`- Assigned Weekly Timetable Entry. ID: ${wtId}`);

  const getTimetable = await request(`/weekly-timetable?section_id=${activeSectionId}`);
  if (!getTimetable.ok) throw new Error('Get timetable failed');
  console.log(`- Weekly timetable count for section ${activeSectionId}: ${getTimetable.data.length}`);
  
  const hasAssign = getTimetable.data.some(entry => entry.id === wtId);
  if (!hasAssign) throw new Error('Timetable entry not found in list');
  console.log('✅ Weekly Timetable Assignment verified.\n');

  // 5. Attendance Session & Student Attendance
  console.log('📝 [5/5] Testing Attendance Session & Marking Attendance...');
  
  const sessionInput = {
    section_id: activeSectionId,
    subject_id: activeSubjectId,
    teacher_id: teacherId,
    slot_id: slot1Id,
    date: '2026-06-20'
  };
  
  const createSession = await request('/attendance/sessions', {
    method: 'POST',
    body: sessionInput
  });
  if (createSession.status !== 201) throw new Error(`Create session failed: ${JSON.stringify(createSession.data)}`);
  const sessionId = createSession.data.id;
  console.log(`- Created Attendance Session. ID: ${sessionId}`);

  // Fetch student marking sheet
  const getSheet = await request(`/attendance/sessions/${sessionId}/attendance`);
  if (!getSheet.ok) throw new Error('Get student sheets failed');
  console.log(`- Retrieved attendance sheet with students count: ${getSheet.data.length}`);
  
  const hasEnrolledStudent = getSheet.data.some(s => s.student_id === studentId);
  if (!hasEnrolledStudent) throw new Error('Enrolled student Bob was not returned in the attendance sheet');

  // Mark student Bob as present
  const marking = [
    {
      student_id: studentId,
      status: 'present',
      remarks: 'Attended the first lecture'
    }
  ];
  
  const markRes = await request(`/attendance/sessions/${sessionId}/attendance`, {
    method: 'POST',
    body: marking
  });
  if (!markRes.ok) throw new Error(`Save student attendance failed: ${JSON.stringify(markRes.data)}`);
  console.log(`- Marked student ${studentId} as present`);

  // Verify attendance marks
  const getSheetUpdated = await request(`/attendance/sessions/${sessionId}/attendance`);
  const bobRecord = getSheetUpdated.data.find(s => s.student_id === studentId);
  if (!bobRecord || bobRecord.status !== 'present' || bobRecord.remarks !== 'Attended the first lecture') {
    throw new Error('Attendance marks were not saved correctly in database');
  }
  console.log(`- Verified attendance update: status="${bobRecord.status}", remarks="${bobRecord.remarks}"`);
  console.log('✅ Attendance Session & Student Attendance verified successfully!\n');

  console.log('🎉 All Batch 1 integration tests passed successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
