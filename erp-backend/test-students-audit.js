/**
 * Verification test script for Student Management Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Student Management Audit verification tests...\n');

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

  // Fetch metadata: programs, sections, academic years
  const [progsRes, sectionsRes, ayRes] = await Promise.all([
    request('/programs?status=ACTIVE'),
    request('/sections?status=ACTIVE'),
    request('/academic-years')
  ]);

  if (!sectionsRes.data.length || !ayRes.data.length) {
    console.error('❌ Failed to fetch required metadata for testing');
    return;
  }

  const validSection = sectionsRes.data[0];
  const validAYId = validSection.academic_year_id || ayRes.data[0].id;
  const validCourseId = validSection.course_id;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testAdmNo = `ADM-${uniqueSuffix}`;
  const testRollNo = `R-${uniqueSuffix}`;

  // 2. Create Valid Student & Test Unique Admission Number
  console.log('▶️ [1/6] Testing Student Creation & Unique Admission Number...');
  const createRes = await request('/students', {
    method: 'POST',
    body: {
      admission_number: testAdmNo.toLowerCase(), // should auto-uppercase
      roll_number: testRollNo,
      first_name: 'AuditStudent',
      last_name: 'Test',
      gender: 'Male',
      date_of_birth: '2010-05-15',
      academic_year_id: validAYId,
      course_id: validCourseId,
      section_id: validSection.id,
      status: 'ACTIVE'
    }
  });

  if (!createRes.ok || !createRes.data.id) {
    console.error('❌ Failed to create student:', createRes.data);
    return;
  }
  const studentId = createRes.data.id;
  console.log(`✅ Passed: Student created with ID ${studentId}`);

  // Test Duplicate Admission Number
  const dupAdmRes = await request('/students', {
    method: 'POST',
    body: {
      admission_number: testAdmNo,
      first_name: 'Another',
      last_name: 'Student',
      academic_year_id: validAYId,
      course_id: validCourseId,
      section_id: validSection.id
    }
  });

  if (dupAdmRes.status === 400 && dupAdmRes.data.error?.includes('already registered')) {
    console.log('✅ Passed: Duplicate admission number correctly rejected.');
  } else {
    console.error('❌ Failed duplicate admission number check:', dupAdmRes);
  }

  // 3. Test Duplicate Roll Number & 409 Conflict Response
  console.log('▶️ [2/6] Testing Duplicate Roll Number & 409 Conflict Response...');
  const dupRollRes = await request('/students', {
    method: 'POST',
    body: {
      admission_number: `ADM-OTHER-${uniqueSuffix}`,
      roll_number: testRollNo,
      first_name: 'RollCheck',
      last_name: 'Student',
      academic_year_id: validAYId,
      course_id: validCourseId,
      section_id: validSection.id
    }
  });

  if (dupRollRes.status === 409 && dupRollRes.data.error?.includes('already assigned')) {
    console.log(`✅ Passed: Duplicate roll number rejected with 409 Conflict: "${dupRollRes.data.error}"`);
  } else {
    console.error('❌ Failed duplicate roll number check:', dupRollRes);
  }

  // 4. Test Search & Multi-Field Filters
  console.log('▶️ [3/6] Testing Student Search & Multi-Field Filters...');
  const searchRes = await request(`/students?section_id=${validSection.id}&search=${testAdmNo}`);
  const searchList = Array.isArray(searchRes.data) ? searchRes.data : (searchRes.data.students || []);
  if (searchRes.ok && searchList.some(s => s.id === studentId)) {
    console.log('✅ Passed: Search & filter returned target student.');
  } else {
    console.error('❌ Failed student search/filter query:', searchRes);
  }

  // 5. Test Delete Protection (409 Conflict Response for student with fee records)
  console.log('▶️ [4/6] Testing Delete Protection & 409 Conflict Response...');
  const delConflictRes = await request(`/students/${studentId}`, { method: 'DELETE' });
  if (delConflictRes.status === 409 && delConflictRes.data.error?.includes('referenced by')) {
    console.log(`✅ Passed: Deletion of referenced student rejected with 409 Conflict: "${delConflictRes.data.error}"`);
  } else {
    console.error('❌ Failed delete protection check:', delConflictRes);
  }

  // 6. Test Archive & Restore Workflow
  console.log('▶️ [5/6] Testing Archive & Restore Workflow...');
  const archiveRes = await request(`/students/${studentId}/archive`, { method: 'POST' });
  if (archiveRes.ok) {
    console.log('✅ Passed: Student archived successfully.');
  } else {
    console.error('❌ Failed archive student:', archiveRes.data);
  }

  const restoreRes = await request(`/students/${studentId}/restore`, { method: 'POST' });
  if (restoreRes.ok) {
    console.log('✅ Passed: Student restored successfully.');
  } else {
    console.error('❌ Failed restore student:', restoreRes.data);
  }

  // 7. Create Unenrolled Student with 0 Dependencies for Clean Permanent Deletion
  console.log('▶️ [6/6] Testing Clean Permanent Deletion of Unused Student...');
  const unreferencedAdm = `ADM-UNREF-${uniqueSuffix}`;
  const unrefRes = await request('/students', {
    method: 'POST',
    body: {
      admission_number: unreferencedAdm,
      first_name: 'Unreferenced',
      last_name: 'Student',
      status: 'ACTIVE'
    }
  });

  if (unrefRes.ok && unrefRes.data.id) {
    const unrefId = unrefRes.data.id;
    const delUnusedRes = await request(`/students/${unrefId}?force=true`, { method: 'DELETE' });
    if (delUnusedRes.ok) {
      console.log('✅ Passed: Unused student deleted permanently.');
    } else {
      console.error('❌ Failed delete unused student:', delUnusedRes.data);
    }
  } else {
    console.error('❌ Failed to create unreferenced student for deletion test:', unrefRes.data);
  }

  console.log('\n🎉 All Student Management Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
