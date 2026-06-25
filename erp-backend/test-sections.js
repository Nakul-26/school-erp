const BASE_URL = 'http://127.0.0.1:8787';

async function run() {
  console.log('🧪 Starting integration tests for Sprint 1.3: Sections...\n');
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
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { text }; }
    return { status: response.status, ok: response.ok, data };
  }

  // 1. Auth Login
  console.log('🔑 Authenticating...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@oxford.edu', password: 'admin123' },
  });
  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    process.exit(1);
  }
  token = loginRes.data.token;
  console.log('✅ Login successful!\n');

  // 2. Fetch dependencies
  console.log('📦 Fetching program/course and academic year details...');
  const ays = await request('/academic-years');
  const progs = await request('/programs');
  const teachers = await request('/teachers');
  
  if (!ays.ok || ays.data.length === 0) throw new Error('No academic years found');
  if (!progs.ok || progs.data.length === 0) throw new Error('No programs found');
  if (!teachers.ok || teachers.data.length === 0) throw new Error('No teachers found');
  
  const ayId = ays.data[0].id;
  const courseId = progs.data[0].id;
  const teacherId = teachers.data[0].id;
  
  console.log(`- Academic Year: ${ayId}`);
  console.log(`- Course/Program: ${courseId}`);
  console.log(`- Teacher: ${teacherId}\n`);

  // 3. Create Section
  console.log('🏫 Creating a new section with capacity and room...');
  const secName = `Test Section ${Date.now()}`;
  const sectionPayload = {
    name: secName,
    year_number: 1,
    academic_year_id: ayId,
    course_id: courseId,
    capacity: 25,
    room: 'Room 501',
    class_teacher_id: teacherId
  };

  const createRes = await request('/sections', {
    method: 'POST',
    body: sectionPayload
  });
  if (createRes.status !== 201) throw new Error(`Create section failed: ${JSON.stringify(createRes.data)}`);
  const sectionId = createRes.data.id;
  console.log(`✅ Section created successfully with ID: ${sectionId}`);

  // 4. Verify list contains details
  console.log('🔍 Listing sections and verifying details...');
  const listRes = await request(`/sections`);
  if (!listRes.ok) throw new Error('List sections failed');
  
  const createdSec = listRes.data.find(s => s.id === sectionId);
  if (!createdSec) throw new Error('Created section not found in listing');
  
  console.log(`- Checked section: Name="${createdSec.name}", Room="${createdSec.room}", Capacity=${createdSec.capacity}`);
  console.log(`- Joined Teacher name: "${createdSec.class_teacher_name}"`);
  console.log(`- Joined Course name: "${createdSec.course_name}"`);
  
  if (createdSec.capacity !== 25) throw new Error(`Incorrect capacity returned: ${createdSec.capacity}`);
  if (createdSec.room !== 'Room 501') throw new Error(`Incorrect room returned: ${createdSec.room}`);
  if (!createdSec.class_teacher_name) throw new Error('Joined class teacher name is missing');
  console.log('✅ Section list and details verified.\n');

  // 5. Test uniqueness validation
  console.log('🚦 Testing uniqueness validation (same year, same course, same name)...');
  const duplicateRes = await request('/sections', {
    method: 'POST',
    body: sectionPayload // identical payload
  });
  
  if (duplicateRes.status === 400) {
    console.log(`✅ Uniqueness blocked duplicate creation. Error message: "${duplicateRes.data.error}"`);
  } else {
    throw new Error(`Expected duplication check to fail with 400, but got status ${duplicateRes.status}`);
  }

  // 6. Test update
  console.log('✏️ Updating section capacity and room...');
  const updatePayload = {
    capacity: 35,
    room: 'Room 502'
  };
  const updateRes = await request(`/sections/${sectionId}`, {
    method: 'PUT',
    body: updatePayload
  });
  if (!updateRes.ok) throw new Error(`Update section failed: ${JSON.stringify(updateRes.data)}`);
  
  const getUpdatedRes = await request(`/sections/${sectionId}`);
  if (!getUpdatedRes.ok) throw new Error('Get section failed');
  console.log(`- Updated details: Capacity=${getUpdatedRes.data.capacity}, Room="${getUpdatedRes.data.room}"`);
  if (getUpdatedRes.data.capacity !== 35 || getUpdatedRes.data.room !== 'Room 502') {
    throw new Error('Update values were not saved correctly');
  }
  console.log('✅ Section updates verified.\n');

  // 7. Test active student archive guard
  console.log('🛡️ Testing archive guard with active student...');
  
  // Create a student
  const studentPayload = {
    admission_number: `T-STUD-${Date.now()}`,
    roll_number: `T-ROLL-${Date.now()}`,
    first_name: 'Alex',
    last_name: 'Smith',
    status: 'ACTIVE'
  };
  const studentRes = await request('/students', { method: 'POST', body: studentPayload });
  if (studentRes.status !== 201) throw new Error(`Create student failed: ${JSON.stringify(studentRes.data)}`);
  const studentId = studentRes.data.id;
  console.log(`- Seeded student with ID: ${studentId}`);

  // Enroll student in our new section
  const enrollRes = await request('/enrollments', {
    method: 'POST',
    body: {
      student_id: studentId,
      academic_year_id: ayId,
      course_id: courseId,
      section_id: sectionId,
      semester: 1
    }
  });
  if (enrollRes.status !== 201) throw new Error(`Enrollment failed: ${JSON.stringify(enrollRes.data)}`);
  console.log(`- Enrolled student in section ${sectionId}`);

  // Attempt to archive section (is_active = 0)
  console.log('- Attempting to archive section containing enrolled student...');
  const archiveRes = await request(`/sections/${sectionId}`, {
    method: 'PUT',
    body: { is_active: 0 }
  });
  
  if (archiveRes.status === 400) {
    console.log(`✅ Archive request rejected with 400. Error message: "${archiveRes.data.error}"`);
  } else {
    throw new Error(`Expected archiving to fail with 400 due to student enrollments, but got status ${archiveRes.status}`);
  }

  // Attempt to delete section
  console.log('- Attempting to delete section containing enrolled student...');
  const deleteRes = await request(`/sections/${sectionId}`, {
    method: 'DELETE'
  });
  if (deleteRes.status === 400) {
    console.log(`✅ Delete request rejected with 400. Error message: "${deleteRes.data.error}"`);
  } else {
    throw new Error(`Expected deletion to fail with 400 due to student enrollments, but got status ${deleteRes.status}`);
  }

  console.log('\n🎉 All Sprint 1.3 Sections integration tests passed successfully!');
}

run().catch(err => {
  console.error('\n❌ Section integration tests failed:', err);
  process.exit(1);
});
