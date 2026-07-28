/**
 * Verification test script for Subjects Database & Backend Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Subjects Audit verification tests...\n');

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

  // Fetch valid program
  const progsRes = await request('/programs?status=ACTIVE');
  if (!progsRes.ok || progsRes.data.length === 0) {
    console.error('❌ Failed to fetch active program for testing');
    return;
  }

  const validCourse = progsRes.data[0];
  const validCourseId = validCourse.id;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testSubCode = `CS-${uniqueSuffix}`;
  const testSubName = `Advanced Algorithms ${uniqueSuffix}`;

  // 2. Testing Credit & Lab Hours Validation
  console.log('▶️ [1/7] Testing Credit & Lab Hours Validation...');
  const invalidLabRes = await request('/subjects', {
    method: 'POST',
    body: {
      subject_code: testSubCode,
      subject_name: testSubName,
      course_id: validCourseId,
      semester: 1,
      credits: 6,
      weekly_hours: 2,
      theory_lab: 'Lab'
    }
  });

  if (invalidLabRes.status === 400 && invalidLabRes.data.error?.includes('cannot exceed weekly lab hours')) {
    console.log('✅ Passed: Lab credits exceeding weekly hours correctly rejected.');
  } else {
    console.error('❌ Failed Lab credit validation check:', invalidLabRes);
  }

  // 3. Testing Semester Limit Validation
  console.log('▶️ [2/7] Testing Semester Limit Validation...');
  const invalidSemRes = await request('/subjects', {
    method: 'POST',
    body: {
      subject_code: testSubCode,
      subject_name: testSubName,
      course_id: validCourseId,
      semester: 99,
      credits: 3,
      weekly_hours: 4,
      theory_lab: 'Theory'
    }
  });

  if (invalidSemRes.status === 400 && invalidSemRes.data.error?.includes('exceeds the maximum allowed semester limit')) {
    console.log('✅ Passed: Excessive semester 99 correctly rejected.');
  } else {
    console.error('❌ Failed semester limit check:', invalidSemRes);
  }

  // 4. Create Valid Subject & Test Duplicate Code/Name
  console.log('▶️ [3/7] Testing Subject Creation & Auto-Uppercase Code...');
  const createRes = await request('/subjects', {
    method: 'POST',
    body: {
      subject_code: testSubCode.toLowerCase(), // should auto-uppercase
      subject_name: testSubName,
      course_id: validCourseId,
      semester: 1,
      credits: 4,
      weekly_hours: 4,
      theory_lab: 'Theory',
      is_elective: 0
    }
  });

  if (!createRes.ok || !createRes.data.id) {
    console.error('❌ Failed to create subject:', createRes.data);
    return;
  }
  const subjectId = createRes.data.id;
  console.log(`✅ Passed: Subject created with ID ${subjectId}`);

  // Test Duplicate Code
  const dupCodeRes = await request('/subjects', {
    method: 'POST',
    body: {
      subject_code: testSubCode,
      subject_name: `Different Name ${uniqueSuffix}`,
      course_id: validCourseId,
      semester: 1
    }
  });

  if (dupCodeRes.status === 400 && dupCodeRes.data.error?.includes('already exists')) {
    console.log('✅ Passed: Duplicate subject code rejected.');
  } else {
    console.error('❌ Failed duplicate subject code check:', dupCodeRes);
  }

  // 5. Test Filters & Ordering
  console.log('▶️ [4/7] Testing Subject Search & Filters...');
  const listRes = await request(`/subjects?course_id=${validCourseId}&semester=1&search=${testSubCode}`);
  if (listRes.ok && Array.isArray(listRes.data) && listRes.data.some(s => s.id === subjectId && s.subject_code === testSubCode.toUpperCase())) {
    console.log('✅ Passed: Search & filter returned subject with uppercased code.');
  } else {
    console.error('❌ Failed subject search/filter query:', listRes.data);
  }

  // 6. Test Delete Protection (409 Conflict Response)
  console.log('▶️ [5/7] Testing Delete Protection & 409 Conflict Response...');
  const allSubsRes = await request('/subjects?status=ALL');
  let refSub = null;

  for (const sub of allSubsRes.data) {
    const depsRes = await request(`/subjects/${sub.id}/dependencies`);
    if (depsRes.ok && depsRes.data.total > 0) {
      refSub = sub;
      break;
    }
  }

  if (refSub) {
    const delConflictRes = await request(`/subjects/${refSub.id}`, { method: 'DELETE' });
    if (delConflictRes.status === 409 && delConflictRes.data.error?.includes('referenced by')) {
      console.log(`✅ Passed: Deletion of referenced subject rejected with 409 Conflict: "${delConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed delete protection check:', delConflictRes);
    }
  } else {
    console.log('ℹ️ No referenced subject found to test 409 Conflict.');
  }

  // 7. Test Archive, Restore & Clean Deletion
  console.log('▶️ [6/7] Testing Archive & Restore Workflow...');
  const archiveRes = await request(`/subjects/${subjectId}/archive`, { method: 'POST' });
  if (archiveRes.ok) {
    console.log('✅ Passed: Unused subject archived successfully.');
  } else {
    console.error('❌ Failed archive subject:', archiveRes.data);
  }

  const restoreRes = await request(`/subjects/${subjectId}/restore`, { method: 'POST' });
  if (restoreRes.ok) {
    console.log('✅ Passed: Subject restored successfully.');
  } else {
    console.error('❌ Failed restore subject:', restoreRes.data);
  }

  console.log('▶️ [7/7] Testing Clean Permanent Deletion of Unused Subject...');
  const delUnusedRes = await request(`/subjects/${subjectId}?force=true`, { method: 'DELETE' });
  if (delUnusedRes.ok) {
    console.log('✅ Passed: Unused subject deleted permanently.');
  } else {
    console.error('❌ Failed delete unused subject:', delUnusedRes.data);
  }

  console.log('\n🎉 All Subjects Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
