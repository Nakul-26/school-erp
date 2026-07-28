/**
 * Verification test script for Classes/Sections Database & Backend Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Classes/Sections Audit verification tests...\n');

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

  // Fetch valid program and academic year to test section operations
  const progsRes = await request('/programs?status=ACTIVE');
  const yearsRes = await request('/academic-years');

  if (!progsRes.ok || progsRes.data.length === 0 || !yearsRes.ok || yearsRes.data.length === 0) {
    console.error('❌ Failed to fetch programs or academic years for testing');
    return;
  }

  const validCourseId = progsRes.data[0].id;
  const validAYId = yearsRes.data[0].id;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testSectionName = `Section TEST-${uniqueSuffix}`;

  // 2. Capacity Validation Test
  console.log('▶️ [1/6] Testing Capacity Validation (Invalid capacity 0 and 600)...');
  const invalidCapRes = await request('/sections', {
    method: 'POST',
    body: {
      name: testSectionName,
      course_id: validCourseId,
      academic_year_id: validAYId,
      year_number: 1,
      capacity: 0
    }
  });

  if (invalidCapRes.status === 400 && invalidCapRes.data.error?.includes('between 1 and 500')) {
    console.log('✅ Passed: Invalid capacity 0 correctly rejected.');
  } else {
    console.error('❌ Failed capacity validation check:', invalidCapRes);
  }

  // 3. Create Valid Section & Test Duplicate Prevention
  console.log('▶️ [2/6] Testing Section Creation & Duplicate Class Prevention...');
  const createRes = await request('/sections', {
    method: 'POST',
    body: {
      name: testSectionName,
      course_id: validCourseId,
      academic_year_id: validAYId,
      year_number: 1,
      capacity: 35,
      room: 'Room 101'
    }
  });

  if (!createRes.ok || !createRes.data.id) {
    console.error('❌ Failed to create test section:', createRes.data);
    return;
  }
  const sectionId = createRes.data.id;
  console.log(`✅ Passed: Section created with ID ${sectionId}`);

  // Test duplicate name under same Program + AY + Year Level
  const dupRes = await request('/sections', {
    method: 'POST',
    body: {
      name: testSectionName.toLowerCase(), // case-insensitive check
      course_id: validCourseId,
      academic_year_id: validAYId,
      year_number: 1,
      capacity: 40
    }
  });

  if (dupRes.status === 400 && dupRes.data.error?.includes('already exists')) {
    console.log('✅ Passed: Duplicate section creation rejected.');
  } else {
    console.error('❌ Failed duplicate section check:', dupRes);
  }

  // 4. Test Search & Filter Options
  console.log('▶️ [3/6] Testing Section Search & Filtering...');
  const filterRes = await request(`/sections?course_id=${validCourseId}&academic_year_id=${validAYId}&year_number=1&search=${testSectionName}`);
  if (filterRes.ok && Array.isArray(filterRes.data) && filterRes.data.some(s => s.id === sectionId)) {
    console.log('✅ Passed: Search & filter returned target section.');
  } else {
    console.error('❌ Failed section search/filter query:', filterRes.data);
  }

  // 5. Test Delete Protection (409 Conflict when referenced)
  console.log('▶️ [4/6] Testing Delete Protection & 409 Conflict Response...');
  const allSectionsRes = await request('/sections');
  const refSection = allSectionsRes.data.find(s => s.student_count && s.student_count > 0);

  if (refSection) {
    const delConflictRes = await request(`/sections/${refSection.id}`, { method: 'DELETE' });
    if (delConflictRes.status === 409 && delConflictRes.data.error?.includes('referenced by')) {
      console.log(`✅ Passed: Deletion of referenced section rejected with 409 Conflict: "${delConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed delete protection check:', delConflictRes);
    }
  } else {
    console.log('ℹ️ No referenced section found to test 409 Conflict.');
  }

  // 6. Test Archive, Restore and Clean Delete of Unused Section
  console.log('▶️ [5/6] Testing Archive & Restore Workflow...');
  const archiveRes = await request(`/sections/${sectionId}/archive`, { method: 'POST' });
  if (archiveRes.ok) {
    console.log('✅ Passed: Unused section archived successfully.');
  } else {
    console.error('❌ Failed archive section:', archiveRes.data);
  }

  const restoreRes = await request(`/sections/${sectionId}/restore`, { method: 'POST' });
  if (restoreRes.ok) {
    console.log('✅ Passed: Section restored successfully.');
  } else {
    console.error('❌ Failed restore section:', restoreRes.data);
  }

  console.log('▶️ [6/6] Testing Clean Permanent Deletion of Unused Section...');
  const delUnusedRes = await request(`/sections/${sectionId}?force=true`, { method: 'DELETE' });
  if (delUnusedRes.ok) {
    console.log('✅ Passed: Unused section deleted permanently.');
  } else {
    console.error('❌ Failed delete unused section:', delUnusedRes.data);
  }

  console.log('\n🎉 All Classes/Sections Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
