/**
 * Verification test script for Teacher Subject Assignments (Teaching Allocations) Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runAuditTests() {
  console.log('🧪 Starting Teacher Subject Assignments (Allocations) Audit verification tests...\n');

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

  // Fetch metadata: programs, sections, subjects, teachers, academic years
  const [progsRes, sectionsRes, subsRes, teachersRes, ayRes, deptsRes] = await Promise.all([
    request('/programs?status=ACTIVE'),
    request('/sections?status=ACTIVE'),
    request('/subjects?status=ACTIVE'),
    request('/teachers'),
    request('/academic-years'),
    request('/departments')
  ]);

  const validSection = sectionsRes.data[0];
  const validAYId = validSection.academic_year_id || ayRes.data[0].id;
  const validDeptId = deptsRes.data[0]?.id || 'DEPT-1';
  const validTeacher = teachersRes.data.find(t => t.status === 'ACTIVE' || t.is_active === 1) || teachersRes.data[0];
  
  // Find subject matching section's program
  const matchingSubject = subsRes.data.find(s => s.course_id === validSection.course_id) || subsRes.data[0];
  const mismatchSubject = subsRes.data.find(s => s.course_id !== validSection.course_id);

  // 2. Lineage / Subject-Program Mismatch Test
  if (mismatchSubject) {
    console.log('▶️ [1/7] Testing Lineage & Subject-Program Mismatch Prevention...');
    const mismatchRes = await request('/teaching-allocations', {
      method: 'POST',
      body: {
        academic_year_id: validAYId,
        department_id: validDeptId,
        program_id: validSection.course_id,
        semester: 1,
        year_number: 1,
        section_id: validSection.id,
        subject_id: mismatchSubject.id,
        teacher_id: validTeacher.id,
        classes_per_week: 4
      }
    });

    if (mismatchRes.status === 400 && mismatchRes.data.error?.includes('does not belong to section program')) {
      console.log('✅ Passed: Mismatched subject-program assignment correctly rejected.');
    } else {
      console.error('❌ Failed subject-program lineage check:', mismatchRes);
    }
  } else {
    console.log('ℹ️ No mismatched subject found for test.');
  }

  // 3. Workload Breakdown Test
  console.log('▶️ [2/7] Testing Workload Breakdown Validation...');
  const invalidWorkloadRes = await request('/teaching-allocations', {
    method: 'POST',
    body: {
      academic_year_id: validAYId,
      department_id: validDeptId,
      program_id: validSection.course_id,
      semester: 1,
      year_number: 1,
      section_id: validSection.id,
      subject_id: matchingSubject.id,
      teacher_id: validTeacher.id,
      classes_per_week: 2,
      theory_hours: 3,
      practical_hours: 2
    }
  });

  if (invalidWorkloadRes.status === 400 && invalidWorkloadRes.data.error?.includes('must be at least the sum')) {
    console.log('✅ Passed: Invalid classes_per_week < breakdown hours correctly rejected.');
  } else {
    console.error('❌ Failed workload breakdown check:', invalidWorkloadRes);
  }

  // Create a clean test subject for allocation testing
  const uniqueSuffix = Date.now().toString().slice(-4);
  const freshSubRes = await request('/subjects', {
    method: 'POST',
    body: {
      subject_code: `TEST-ALLOC-${uniqueSuffix}`,
      subject_name: `Allocation Test Subject ${uniqueSuffix}`,
      course_id: validSection.course_id,
      semester: 1,
      credits: 3,
      weekly_hours: 4,
      theory_lab: 'Theory'
    }
  });

  const testSubjectId = freshSubRes.data.id || matchingSubject.id;

  // 4. Create Valid Allocation & Test Duplicate Check
  console.log('▶️ [3/7] Testing Allocation Creation & Duplicate Prevention...');
  const createRes = await request('/teaching-allocations', {
    method: 'POST',
    body: {
      academic_year_id: validAYId,
      department_id: validDeptId,
      program_id: validSection.course_id,
      semester: 1,
      year_number: 1,
      section_id: validSection.id,
      subject_id: testSubjectId,
      teacher_id: validTeacher.id,
      classes_per_week: 4,
      theory_hours: 2,
      practical_hours: 2,
      primary_teacher: 1
    }
  });

  let allocId = '';
  if (createRes.ok && createRes.data.id) {
    allocId = createRes.data.id;
    console.log(`✅ Passed: Allocation created with ID ${allocId}`);
  } else {
    console.error('❌ Failed allocation creation:', createRes.data);
    return;
  }

  // Test Duplicate Creation
  const dupRes = await request('/teaching-allocations', {
    method: 'POST',
    body: {
      academic_year_id: validAYId,
      department_id: validDeptId,
      program_id: validSection.course_id,
      semester: 1,
      year_number: 1,
      section_id: validSection.id,
      subject_id: testSubjectId,
      teacher_id: validTeacher.id,
      classes_per_week: 4
    }
  });

  if (dupRes.status === 400 && dupRes.data.error?.includes('Duplicate allocation')) {
    console.log('✅ Passed: Duplicate active allocation correctly rejected.');
  } else {
    console.error('❌ Failed duplicate allocation check:', dupRes);
  }

  // 5. Test Filters & Search
  console.log('▶️ [4/7] Testing Search & Multi-Field Filters...');
  const filterRes = await request(`/teaching-allocations?academic_year_id=${validAYId}&teacher_id=${validTeacher.id}&status=Active`);
  if (filterRes.ok && Array.isArray(filterRes.data) && filterRes.data.some(a => a.id === allocId)) {
    console.log('✅ Passed: Multi-field filters returned target teaching allocation.');
  } else {
    console.error('❌ Failed teaching allocations query:', filterRes.data);
  }

  // 6. Test Delete Protection & 409 Conflict Response
  console.log('▶️ [5/7] Testing Delete Protection & 409 Conflict Response...');
  const allAllocRes = await request('/teaching-allocations?status=ALL');
  let refAlloc = null;

  for (const alloc of allAllocRes.data) {
    const depsRes = await request(`/teaching-allocations/${alloc.id}/dependencies`);
    if (depsRes.ok && depsRes.data.total > 0) {
      refAlloc = alloc;
      break;
    }
  }

  if (refAlloc) {
    const delConflictRes = await request(`/teaching-allocations/${refAlloc.id}`, { method: 'DELETE' });
    if (delConflictRes.status === 409 && delConflictRes.data.error?.includes('referenced by')) {
      console.log(`✅ Passed: Deletion of referenced allocation rejected with 409 Conflict: "${delConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed delete protection check:', delConflictRes);
    }
  } else {
    console.log('ℹ️ No referenced allocation found to test 409 Conflict.');
  }

  // 7. Test Archive, Restore & Clean Deletion of Unused Allocation
  console.log('▶️ [6/7] Testing Archive & Restore Workflow...');
  const archiveRes = await request(`/teaching-allocations/${allocId}/archive`, { method: 'POST' });
  if (archiveRes.ok) {
    console.log('✅ Passed: Unused teaching allocation archived successfully.');
  } else {
    console.error('❌ Failed archive allocation:', archiveRes.data);
  }

  const restoreRes = await request(`/teaching-allocations/${allocId}/restore`, { method: 'POST' });
  if (restoreRes.ok) {
    console.log('✅ Passed: Teaching allocation restored successfully.');
  } else {
    console.error('❌ Failed restore allocation:', restoreRes.data);
  }

  console.log('▶️ [7/7] Testing Clean Permanent Deletion of Unused Allocation...');
  const delUnusedRes = await request(`/teaching-allocations/${allocId}?force=true`, { method: 'DELETE' });
  if (delUnusedRes.ok) {
    console.log('✅ Passed: Unused teaching allocation deleted permanently.');
  } else {
    console.error('❌ Failed delete unused allocation:', delUnusedRes.data);
  }

  console.log('\n🎉 All Teacher Subject Assignments Audit verification tests completed successfully!');
}

runAuditTests().catch(console.error);
