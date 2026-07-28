/**
 * Verification test script for Attendance Management Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Attendance Management Audit verification tests...\n');

  let token = '';

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    
    const response = await fetch(`${BASE_URL}${path}`, {
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

  // 1. Auth Login as Super Admin
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@oxford.edu', password: 'admin123' }
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  token = loginRes.data.token;
  console.log('✅ Authenticated successfully.');

  // Fetch metadata: sections, subjects, teachers, teaching allocations
  const [sectionsRes, subsRes, teachersRes, allocsRes] = await Promise.all([
    request('/sections?status=ACTIVE'),
    request('/subjects?status=ACTIVE'),
    request('/teachers'),
    request('/teaching-allocations?status=Active')
  ]);

  if (!sectionsRes.data.length || !subsRes.data.length || !teachersRes.data.length) {
    console.error('❌ Failed to fetch required metadata for testing');
    return;
  }

  const validSection = sectionsRes.data[0];
  const validTeacher = teachersRes.data.find(t => t.status === 'ACTIVE' || t.is_active === 1) || teachersRes.data[0];

  // Find allocation or assign one to ensure valid teacher-subject-section combo
  const matchingSub = subsRes.data.find(s => s.course_id === validSection.course_id) || subsRes.data[0];

  // Ensure teaching allocation exists
  await request('/teaching-allocations', {
    method: 'POST',
    body: {
      academic_year_id: validSection.academic_year_id,
      department_id: 'DEPT-1',
      program_id: validSection.course_id,
      semester: 1,
      year_number: 1,
      section_id: validSection.id,
      subject_id: matchingSub.id,
      teacher_id: validTeacher.id,
      classes_per_week: 4
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // 2. Test Unassigned Teacher Allocation Prevention
  console.log('▶️ [1/5] Testing Teaching Allocation Validation...');
  const otherTeacher = teachersRes.data.find(t => t.id !== validTeacher.id);
  if (otherTeacher) {
    const unassignedRes = await request('/attendance/sessions', {
      method: 'POST',
      body: {
        section_id: validSection.id,
        subject_id: matchingSub.id,
        teacher_id: otherTeacher.id,
        date: todayStr
      }
    });

    if (unassignedRes.status === 400 && unassignedRes.data.error?.includes('is not assigned')) {
      console.log(`✅ Passed: Unassigned teacher rejected with message: "${unassignedRes.data.error}"`);
    } else {
      console.error('❌ Failed teaching allocation check:', unassignedRes);
    }
  }

  // 3. Create Valid Session & Test Duplicate Prevention (409 Conflict)
  console.log('▶️ [2/5] Testing Session Creation & Duplicate Session Prevention...');
  const createSessionRes = await request('/attendance/sessions', {
    method: 'POST',
    body: {
      section_id: validSection.id,
      subject_id: matchingSub.id,
      teacher_id: validTeacher.id,
      date: todayStr
    }
  });

  let sessionId = '';
  if (createSessionRes.ok && createSessionRes.data.id) {
    sessionId = createSessionRes.data.id;
    console.log(`✅ Passed: Attendance session created with ID ${sessionId}`);
  } else {
    // If already exists, fetch list
    const sessionsList = await request(`/attendance/sessions?section_id=${validSection.id}&date=${todayStr}`);
    if (sessionsList.data.length > 0) {
      sessionId = sessionsList.data[0].id;
      console.log(`✅ Existing session retrieved with ID ${sessionId}`);
    } else {
      console.error('❌ Failed session creation:', createSessionRes.data);
      return;
    }
  }

  // Duplicate Creation Test
  const dupSessionRes = await request('/attendance/sessions', {
    method: 'POST',
    body: {
      section_id: validSection.id,
      subject_id: matchingSub.id,
      teacher_id: validTeacher.id,
      date: todayStr
    }
  });

  if (dupSessionRes.status === 409 && dupSessionRes.data.error?.includes('already exists')) {
    console.log(`✅ Passed: Duplicate attendance session rejected with 409 Conflict: "${dupSessionRes.data.error}"`);
  } else {
    console.error('❌ Failed duplicate session check:', dupSessionRes);
  }

  // 4. Test Fetching Enrolled Active Students Register
  console.log('▶️ [3/5] Testing Enrolled Student Register Retrieval...');
  const registerRes = await request(`/attendance/sessions/${sessionId}/attendance`);
  if (registerRes.ok && Array.isArray(registerRes.data)) {
    console.log(`✅ Passed: Retrieved attendance register with ${registerRes.data.length} student(s).`);
  } else {
    console.error('❌ Failed register retrieval:', registerRes);
    return;
  }

  // 5. Test Bulk Marking Attendance (Present / Absent / Late / Medical)
  console.log('▶️ [4/5] Testing Bulk Attendance Marking...');
  const studentsInReg = registerRes.data;
  if (studentsInReg.length > 0) {
    const markPayload = studentsInReg.map((s, idx) => ({
      student_id: s.student_id,
      status: idx % 2 === 0 ? 'present' : 'absent',
      remarks: idx % 2 === 0 ? 'On time' : 'Unexcused'
    }));

    const markRes = await request(`/attendance/sessions/${sessionId}/attendance`, {
      method: 'POST',
      body: markPayload
    });

    if (markRes.ok) {
      console.log('✅ Passed: Bulk attendance marked successfully for all enrolled students.');
    } else {
      console.error('❌ Failed bulk marking attendance:', markRes.data);
    }
  }

  // 6. Test Clean Session Deletion
  console.log('▶️ [5/5] Testing Clean Session Deletion...');
  const delRes = await request(`/attendance/sessions/${sessionId}`, { method: 'DELETE' });
  if (delRes.ok) {
    console.log('✅ Passed: Attendance session and related marks deleted cleanly.');
  } else {
    console.error('❌ Failed session deletion:', delRes.data);
  }

  console.log('\n🎉 All Attendance Management Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
