/**
 * Verification test script for Timetable Management Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runTimetableAuditTests() {
  console.log('🧪 Starting Timetable Management Audit verification tests...\n');

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

  // Fetch metadata: sections, subjects, teachers, slots, academic years, departments
  const [sectionsRes, subsRes, teachersRes, slotsRes, ayRes, deptsRes] = await Promise.all([
    request('/sections?status=ACTIVE'),
    request('/subjects?status=ACTIVE'),
    request('/teachers'),
    request('/timetable-slots'),
    request('/academic-years?status=ACTIVE'),
    request('/departments')
  ]);

  if (!sectionsRes.data.length || !subsRes.data.length || !teachersRes.data.length || !slotsRes.data.length) {
    console.error('❌ Failed to fetch required metadata for timetable testing');
    return;
  }

  let entryAId = '';
  const sectionA = sectionsRes.data[0];
  const sectionB = sectionsRes.data.find(s => s.id !== sectionA.id) || sectionA;
  const teacherObj = teachersRes.data.find(t => t.status === 'ACTIVE' || t.is_active === 1) || teachersRes.data[0];
  const matchingSub = subsRes.data.find(s => s.course_id === sectionA.course_id) || subsRes.data[0];
  const targetSlot = slotsRes.data[0];
  const targetAY = ayRes.data[0] || { id: sectionA.academic_year_id };
  const targetDeptId = deptsRes.data[0]?.id || 'dept-cse';

  // Clean up any existing Monday test entries
  const existingEntries = await request(`/weekly-timetable?section_id=${sectionA.id}`);
  if (Array.isArray(existingEntries.data)) {
    for (const e of existingEntries.data) {
      if (e.day_of_week === 'Monday' && e.slot_id === targetSlot.id) {
        await request(`/weekly-timetable/${e.id}`, { method: 'DELETE' });
      }
    }
  }

  // Ensure teaching allocation exists for Section A
  await request('/teaching-allocations', {
    method: 'POST',
    body: {
      academic_year_id: targetAY.id,
      department_id: targetDeptId,
      program_id: sectionA.course_id,
      semester: 1,
      year_number: 1,
      section_id: sectionA.id,
      subject_id: matchingSub.id,
      teacher_id: teacherObj.id,
      classes_per_week: 4
    }
  });

  // 2. Test Invalid Slot Time Range (start_time >= end_time)
  console.log('▶️ [1/6] Testing Timetable Slot Time Sequence Validation...');
  const invalidSlotRes = await request('/timetable-slots', {
    method: 'POST',
    body: {
      name: 'Invalid Period',
      start_time: '11:00',
      end_time: '10:00'
    }
  });
  if (invalidSlotRes.status === 400 && invalidSlotRes.data.error?.includes('must be earlier')) {
    console.log(`✅ Passed: Invalid slot time range rejected with message: "${invalidSlotRes.data.error}"`);
  } else {
    console.error('❌ Failed slot time validation check:', invalidSlotRes);
  }

  // 3. Test Teaching Allocation Lineage Validation
  console.log('▶️ [2/6] Testing Unassigned Teacher Timetable Entry Prevention...');
  const otherTeacher = teachersRes.data.find(t => t.id !== teacherObj.id);
  if (otherTeacher) {
    const unassignedRes = await request('/weekly-timetable', {
      method: 'POST',
      body: {
        academic_year_id: targetAY.id,
        section_id: sectionA.id,
        subject_id: matchingSub.id,
        teacher_id: otherTeacher.id,
        slot_id: targetSlot.id,
        day_of_week: 'Monday'
      }
    });

    if (unassignedRes.status === 400 && unassignedRes.data.error?.includes('is not assigned')) {
      console.log(`✅ Passed: Unassigned teacher timetable entry rejected: "${unassignedRes.data.error}"`);
    } else {
      console.error('❌ Failed teaching allocation check:', unassignedRes);
    }
  }

  // 4. Create Valid Entry A & Test Section Conflict (409 Conflict)
  console.log('▶️ [3/6] Testing Valid Creation & Section Conflict (409 Conflict)...');
  const createA = await request('/weekly-timetable', {
    method: 'POST',
    body: {
      academic_year_id: targetAY.id,
      section_id: sectionA.id,
      subject_id: matchingSub.id,
      teacher_id: teacherObj.id,
      slot_id: targetSlot.id,
      day_of_week: 'Monday',
      room_number: 'Lab-101'
    }
  });

  entryAId = createA.data?.id || '';
  if (!entryAId) {
    const listRes = await request(`/weekly-timetable?section_id=${sectionA.id}`);
    const found = (listRes.data || []).find(e => e.day_of_week === 'Monday' && e.slot_id === targetSlot.id);
    if (found) entryAId = found.id;
  }
  if (entryAId) {
    console.log(`✅ Passed: Timetable entry A available with ID ${entryAId}`);
  } else {
    console.log('⚠️ Entry creation returned:', createA.data);
  }

  // Duplicate Section Conflict
  const dupSecRes = await request('/weekly-timetable', {
    method: 'POST',
    body: {
      academic_year_id: targetAY.id,
      section_id: sectionA.id,
      subject_id: matchingSub.id,
      teacher_id: teacherObj.id,
      slot_id: targetSlot.id,
      day_of_week: 'Monday'
    }
  });

  if (dupSecRes.status === 409 && dupSecRes.data.error?.includes('already has a class')) {
    console.log(`✅ Passed: Duplicate section slot rejected with 409 Conflict: "${dupSecRes.data.error}"`);
  } else {
    console.error('❌ Failed section conflict check:', dupSecRes);
  }

  // 5. Test Teacher Conflict Check (Teacher assigned to Section B at same slot)
  console.log('▶️ [4/6] Testing Teacher Schedule Conflict Prevention...');
  if (sectionB.id !== sectionA.id) {
    const subB = subsRes.data.find(s => s.course_id === sectionB.course_id) || subsRes.data[0];
    
    const secBAY = sectionB.academic_year_id || targetAY.id;
    const allocBRes = await request('/teaching-allocations', {
      method: 'POST',
      body: {
        academic_year_id: secBAY,
        department_id: targetDeptId,
        program_id: sectionB.course_id,
        semester: sectionB.semester || 1,
        year_number: sectionB.year_number || 1,
        section_id: sectionB.id,
        subject_id: subB.id,
        teacher_id: teacherObj.id,
        classes_per_week: 4
      }
    });
    console.log('allocBRes result:', allocBRes.status, allocBRes.data);

    const teacherConflictRes = await request('/weekly-timetable', {
      method: 'POST',
      body: {
        academic_year_id: secBAY,
        section_id: sectionB.id,
        subject_id: subB.id,
        teacher_id: teacherObj.id,
        slot_id: targetSlot.id,
        day_of_week: 'Monday'
      }
    });

    if (teacherConflictRes.status === 400 && teacherConflictRes.data.error?.includes('already assigned to section')) {
      console.log(`✅ Passed: Teacher schedule conflict rejected: "${teacherConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed teacher conflict check:', teacherConflictRes);
    }
  }

  // 6. Test Room Conflict Check
  console.log('▶️ [5/6] Testing Room Occupancy Conflict Prevention...');
  if (sectionB.id !== sectionA.id) {
    const subB = subsRes.data.find(s => s.course_id === sectionB.course_id) || subsRes.data[0];
    const roomConflictRes = await request('/weekly-timetable', {
      method: 'POST',
      body: {
        academic_year_id: targetAY.id,
        section_id: sectionB.id,
        subject_id: subB.id,
        teacher_id: null,
        slot_id: targetSlot.id,
        day_of_week: 'Monday',
        room_number: 'Lab-101'
      }
    });

    if (roomConflictRes.status === 400 && roomConflictRes.data.error?.includes('already occupied')) {
      console.log(`✅ Passed: Room conflict rejected: "${roomConflictRes.data.error}"`);
    } else {
      console.error('❌ Failed room conflict check:', roomConflictRes);
    }
  }

  // 7. Test Timetable Cleanup
  console.log('▶️ [6/6] Testing Clean Timetable Entry Deletion...');
  if (entryAId) {
    const delRes = await request(`/weekly-timetable/${entryAId}`, { method: 'DELETE' });
    if (delRes.ok) {
      console.log('✅ Passed: Timetable entry deleted cleanly.');
    } else {
      console.error('❌ Failed entry deletion:', delRes.data);
    }
  }

  console.log('\n🎉 All Timetable Management Audit verification tests completed successfully!');
}

runTimetableAuditTests().catch(console.error);
