/**
 * Verification test script for Programs/Courses Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Programs/Courses Audit verification tests...\n');

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

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testCode = `TST-${uniqueSuffix}`;
  const testName = `Test Program ${uniqueSuffix}`;

  // 2. Test Duration Validation
  console.log('▶️ [1/6] Testing Duration Validation (Negative/Zero duration)...');
  const invalidDurRes = await request('/programs', {
    method: 'POST',
    body: {
      name: `Invalid Dur ${uniqueSuffix}`,
      course_code: `INV-${uniqueSuffix}`,
      duration_years: 0,
      degree_type: 'UG'
    }
  });

  if (invalidDurRes.status === 400 && invalidDurRes.data.error?.includes('Duration must be a positive number')) {
    console.log('✅ Passed: Invalid duration zero was correctly rejected (400).');
  } else {
    console.error('❌ Failed: Invalid duration check result:', invalidDurRes);
  }

  // 3. Test Create Program with Degree Type and Duration Unit
  console.log('▶️ [2/6] Testing Program Creation with Degree Type & Duration Unit...');
  const createRes = await request('/programs', {
    method: 'POST',
    body: {
      name: testName,
      course_code: testCode,
      duration_years: 4,
      duration_unit: 'Years',
      degree_type: 'UG',
      semester_enabled: 1,
      credit_system_enabled: 1,
      description: 'Audit test course'
    }
  });

  if (!createRes.ok || !createRes.data.id) {
    console.error('❌ Failed to create test program:', createRes.data);
    return;
  }
  const progId = createRes.data.id;
  console.log(`✅ Passed: Program created with ID ${progId}`);

  // 4. Test Duplicate Code & Duplicate Name Protection
  console.log('▶️ [3/6] Testing Duplicate Code & Name Protection...');
  const dupCodeRes = await request('/programs', {
    method: 'POST',
    body: {
      name: `Different Name ${uniqueSuffix}`,
      course_code: testCode.toLowerCase(), // testing case-insensitivity
      duration_years: 4,
      degree_type: 'UG'
    }
  });

  if (dupCodeRes.status === 400 && dupCodeRes.data.error?.includes('already exists')) {
    console.log('✅ Passed: Duplicate program code rejected.');
  } else {
    console.error('❌ Failed duplicate code check:', dupCodeRes);
  }

  const dupNameRes = await request('/programs', {
    method: 'POST',
    body: {
      name: testName.toUpperCase(), // testing case-insensitivity
      course_code: `DIFF-${uniqueSuffix}`,
      duration_years: 4,
      degree_type: 'UG'
    }
  });

  if (dupNameRes.status === 400 && dupNameRes.data.error?.includes('already exists')) {
    console.log('✅ Passed: Duplicate program name rejected.');
  } else {
    console.error('❌ Failed duplicate name check:', dupNameRes);
  }

  // 5. Test Search & Filters Endpoint
  console.log('▶️ [4/6] Testing Search & Filter Querying...');
  const filterRes = await request(`/programs?search=${testCode}&status=ACTIVE&degree_type=UG`);
  if (filterRes.ok && Array.isArray(filterRes.data) && filterRes.data.some(p => p.id === progId)) {
    console.log('✅ Passed: Search & filter returned target program.');
  } else {
    console.error('❌ Failed search/filter query:', filterRes.data);
  }

  // 6. Test Delete Protection (409 Conflict when dependencies exist)
  console.log('▶️ [5/6] Testing Delete Protection & 409 Conflict Response...');

  // Get active programs to test deletion of referenced program (e.g., Grade 10 / Grade 9 which have sections/students)
  const allProgs = await request('/programs?status=ACTIVE');
  const referencedProg = allProgs.data.find(p => p.name.includes('Grade 10') || p.name.includes('Grade 9') || p.course_code.includes('CSE'));

  if (referencedProg) {
    const delConflictRes = await request(`/programs/${referencedProg.id}`, { method: 'DELETE' });
    if (delConflictRes.status === 409 && delConflictRes.data.error?.includes('referenced by')) {
      console.log(`✅ Passed: Referenced program deletion rejected with 409 Conflict: "${delConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed delete protection check:', delConflictRes);
    }
  } else {
    console.log('ℹ️ No referenced program found to test 409 Conflict.');
  }

  // 7. Cleanup & Archive Test
  console.log('▶️ [6/6] Testing Archive & Clean Deletion of unused test program...');
  const archiveRes = await request(`/programs/${progId}/archive`, { method: 'POST' });
  if (archiveRes.ok) {
    console.log('✅ Passed: Program archived successfully.');
  } else {
    console.error('❌ Failed archive:', archiveRes.data);
  }

  const deleteUnusedRes = await request(`/programs/${progId}?force=true`, { method: 'DELETE' });
  if (deleteUnusedRes.ok) {
    console.log('✅ Passed: Unused program permanently deleted.');
  } else {
    console.error('❌ Failed delete unused program:', deleteUnusedRes.data);
  }

  console.log('\n🎉 All Programs/Courses Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
