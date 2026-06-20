/**
 * Integration Test for Students, Classes (Sections), Teachers, and Subjects Management.
 */
const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Starting integration tests for ERP management modules...\n');
  
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
  console.log('🔑 Testing Admin Login...');
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
  console.log('✅ Login successful! Token received.\n');

  // --- SUBJECTS TEST ---
  console.log('📚 Testing Subjects Management...');
  
  // GET list
  const listSubjectsBefore = await request('/subjects');
  if (!listSubjectsBefore.ok) throw new Error(`List subjects failed: ${JSON.stringify(listSubjectsBefore.data)}`);
  console.log(`- Current subjects count: ${listSubjectsBefore.data.length}`);
  
  // POST create
  const newSubject = {
    course_id: 'prog-cse',
    subject_code: 'CS_TEST_101',
    subject_name: 'Introduction to Testing',
    credits: 3,
    semester: 1,
  };
  const createSubjectRes = await request('/subjects', {
    method: 'POST',
    body: newSubject,
  });
  if (createSubjectRes.status !== 201) throw new Error(`Create subject failed: ${JSON.stringify(createSubjectRes.data)}`);
  const subjectId = createSubjectRes.data.id;
  console.log(`- Created subject with ID: ${subjectId}`);
  
  // GET single
  const getSubjectRes = await request(`/subjects/${subjectId}`);
  if (!getSubjectRes.ok) throw new Error(`Get subject failed: ${JSON.stringify(getSubjectRes.data)}`);
  if (getSubjectRes.data.subject_name !== newSubject.subject_name) {
    throw new Error(`Subject name mismatch. Expected: ${newSubject.subject_name}, Got: ${getSubjectRes.data.subject_name}`);
  }
  console.log(`- Retrieved subject successfully: ${getSubjectRes.data.subject_name}`);
  
  // PUT update
  const updateSubjectData = {
    subject_name: 'Advanced Software Testing',
    credits: 4,
  };
  const updateSubjectRes = await request(`/subjects/${subjectId}`, {
    method: 'PUT',
    body: updateSubjectData,
  });
  if (!updateSubjectRes.ok) throw new Error(`Update subject failed: ${JSON.stringify(updateSubjectRes.data)}`);
  console.log(`- Updated subject successfully`);
  
  // GET single again
  const getSubjectRes2 = await request(`/subjects/${subjectId}`);
  if (!getSubjectRes2.ok) throw new Error(`Get updated subject failed: ${JSON.stringify(getSubjectRes2.data)}`);
  if (getSubjectRes2.data.subject_name !== updateSubjectData.subject_name || getSubjectRes2.data.credits !== updateSubjectData.credits) {
    throw new Error(`Subject updates not saved correctly`);
  }
  console.log(`- Verified subject update: name="${getSubjectRes2.data.subject_name}", credits=${getSubjectRes2.data.credits}`);
  
  // DELETE
  const deleteSubjectRes = await request(`/subjects/${subjectId}`, { method: 'DELETE' });
  if (!deleteSubjectRes.ok) throw new Error(`Delete subject failed: ${JSON.stringify(deleteSubjectRes.data)}`);
  console.log(`- Deleted subject successfully`);
  
  // GET single (should return 404)
  const getSubjectResDeleted = await request(`/subjects/${subjectId}`);
  if (getSubjectResDeleted.status !== 404) throw new Error(`Expected 404 for deleted subject, got: ${getSubjectResDeleted.status}`);
  console.log(`✅ Subjects Management is fully working!\n`);

  // --- CLASSES (SECTIONS) TEST ---
  console.log('🏫 Testing Classes/Sections Management...');
  
  // GET list
  const listSectionsBefore = await request('/sections');
  if (!listSectionsBefore.ok) throw new Error(`List sections failed: ${JSON.stringify(listSectionsBefore.data)}`);
  console.log(`- Current sections/classes count: ${listSectionsBefore.data.length}`);
  
  // POST create
  const newSection = {
    academic_year_id: 'year-2026',
    course_id: 'prog-cse',
    name: 'Section B (Test)',
    year_number: 1,
  };
  const createSectionRes = await request('/sections', {
    method: 'POST',
    body: newSection,
  });
  if (createSectionRes.status !== 201) throw new Error(`Create section failed: ${JSON.stringify(createSectionRes.data)}`);
  const sectionId = createSectionRes.data.id;
  console.log(`- Created section with ID: ${sectionId}`);
  
  // GET single
  const getSectionRes = await request(`/sections/${sectionId}`);
  if (!getSectionRes.ok) throw new Error(`Get section failed: ${JSON.stringify(getSectionRes.data)}`);
  if (getSectionRes.data.name !== newSection.name) {
    throw new Error(`Section name mismatch. Expected: ${newSection.name}, Got: ${getSectionRes.data.name}`);
  }
  console.log(`- Retrieved section successfully: ${getSectionRes.data.name}`);
  
  // PUT update
  const updateSectionData = {
    name: 'Section B (Updated Test)',
    year_number: 2,
  };
  const updateSectionRes = await request(`/sections/${sectionId}`, {
    method: 'PUT',
    body: updateSectionData,
  });
  if (!updateSectionRes.ok) throw new Error(`Update section failed: ${JSON.stringify(updateSectionRes.data)}`);
  console.log(`- Updated section successfully`);
  
  // GET single again
  const getSectionRes2 = await request(`/sections/${sectionId}`);
  if (!getSectionRes2.ok) throw new Error(`Get updated section failed: ${JSON.stringify(getSectionRes2.data)}`);
  if (getSectionRes2.data.name !== updateSectionData.name || getSectionRes2.data.year_number !== updateSectionData.year_number) {
    throw new Error(`Section updates not saved correctly`);
  }
  console.log(`- Verified section update: name="${getSectionRes2.data.name}", year_number=${getSectionRes2.data.year_number}`);
  
  // DELETE
  const deleteSectionRes = await request(`/sections/${sectionId}`, { method: 'DELETE' });
  if (!deleteSectionRes.ok) throw new Error(`Delete section failed: ${JSON.stringify(deleteSectionRes.data)}`);
  console.log(`- Deleted section successfully`);
  
  // GET single (should return 404)
  const getSectionResDeleted = await request(`/sections/${sectionId}`);
  if (getSectionResDeleted.status !== 404) throw new Error(`Expected 404 for deleted section, got: ${getSectionResDeleted.status}`);
  console.log(`✅ Classes/Sections Management is fully working!\n`);

  // --- TEACHERS TEST ---
  console.log('👨‍🏫 Testing Teachers Management...');
  
  // GET list
  const listTeachersBefore = await request('/teachers');
  if (!listTeachersBefore.ok) throw new Error(`List teachers failed: ${JSON.stringify(listTeachersBefore.data)}`);
  console.log(`- Current teachers count: ${listTeachersBefore.data.length}`);
  
  // POST create
  const newTeacher = {
    employee_id: 'EMP_TEST_007',
    first_name: 'Dr. Evelyn',
    last_name: 'Miller',
    email: 'evelyn.miller@oxford.edu',
    phone: '555-0199',
    joining_date: '2026-06-01',
    designation: 'Associate Professor',
    department: 'Computer Science',
    status: 'ACTIVE',
  };
  const createTeacherRes = await request('/teachers', {
    method: 'POST',
    body: newTeacher,
  });
  if (createTeacherRes.status !== 201) throw new Error(`Create teacher failed: ${JSON.stringify(createTeacherRes.data)}`);
  const teacherId = createTeacherRes.data.id;
  console.log(`- Created teacher with ID: ${teacherId}`);
  
  // GET single
  const getTeacherRes = await request(`/teachers/${teacherId}`);
  if (!getTeacherRes.ok) throw new Error(`Get teacher failed: ${JSON.stringify(getTeacherRes.data)}`);
  if (getTeacherRes.data.first_name !== newTeacher.first_name || getTeacherRes.data.last_name !== newTeacher.last_name) {
    throw new Error(`Teacher name mismatch. Expected: ${newTeacher.first_name} ${newTeacher.last_name}, Got: ${getTeacherRes.data.first_name} ${getTeacherRes.data.last_name}`);
  }
  console.log(`- Retrieved teacher successfully: ${getTeacherRes.data.first_name} ${getTeacherRes.data.last_name}`);
  
  // PUT update
  const updateTeacherData = {
    last_name: 'Miller-Jones',
    designation: 'Professor',
  };
  const updateTeacherRes = await request(`/teachers/${teacherId}`, {
    method: 'PUT',
    body: updateTeacherData,
  });
  if (!updateTeacherRes.ok) throw new Error(`Update teacher failed: ${JSON.stringify(updateTeacherRes.data)}`);
  console.log(`- Updated teacher successfully`);
  
  // GET single again
  const getTeacherRes2 = await request(`/teachers/${teacherId}`);
  if (!getTeacherRes2.ok) throw new Error(`Get updated teacher failed: ${JSON.stringify(getTeacherRes2.data)}`);
  if (getTeacherRes2.data.last_name !== updateTeacherData.last_name || getTeacherRes2.data.designation !== updateTeacherData.designation) {
    throw new Error(`Teacher updates not saved correctly`);
  }
  console.log(`- Verified teacher update: designation="${getTeacherRes2.data.designation}", last_name="${getTeacherRes2.data.last_name}"`);
  
  // DELETE
  const deleteTeacherRes = await request(`/teachers/${teacherId}`, { method: 'DELETE' });
  if (!deleteTeacherRes.ok) throw new Error(`Delete teacher failed: ${JSON.stringify(deleteTeacherRes.data)}`);
  console.log(`- Deleted teacher successfully`);
  
  // GET single (should return 404)
  const getTeacherResDeleted = await request(`/teachers/${teacherId}`);
  if (getTeacherResDeleted.status !== 404) throw new Error(`Expected 404 for deleted teacher, got: ${getTeacherResDeleted.status}`);
  console.log(`✅ Teachers Management is fully working!\n`);

  // --- STUDENTS TEST ---
  console.log('🎓 Testing Students Management...');
  
  // GET list
  const listStudentsBefore = await request('/students');
  if (!listStudentsBefore.ok) throw new Error(`List students failed: ${JSON.stringify(listStudentsBefore.data)}`);
  console.log(`- Current students count: ${listStudentsBefore.data.length}`);
  
  // POST create
  const newStudent = {
    admission_number: 'ADM_TEST_999',
    roll_number: 'CS999',
    first_name: 'Bob',
    last_name: 'Sponge',
    gender: 'Male',
    date_of_birth: '2004-10-10',
    email: 'bob.sponge@oxford.edu',
    phone: '555-9876',
    admission_date: '2026-06-19',
    status: 'ACTIVE',
  };
  const createStudentRes = await request('/students', {
    method: 'POST',
    body: newStudent,
  });
  if (createStudentRes.status !== 201) throw new Error(`Create student failed: ${JSON.stringify(createStudentRes.data)}`);
  const studentId = createStudentRes.data.id;
  console.log(`- Created student with ID: ${studentId}`);
  
  // GET single
  const getStudentRes = await request(`/students/${studentId}`);
  if (!getStudentRes.ok) throw new Error(`Get student failed: ${JSON.stringify(getStudentRes.data)}`);
  if (getStudentRes.data.first_name !== newStudent.first_name || getStudentRes.data.last_name !== newStudent.last_name) {
    throw new Error(`Student name mismatch. Expected: ${newStudent.first_name} ${newStudent.last_name}, Got: ${getStudentRes.data.first_name} ${getStudentRes.data.last_name}`);
  }
  console.log(`- Retrieved student successfully: ${getStudentRes.data.first_name} ${getStudentRes.data.last_name}`);
  
  // PUT update
  const updateStudentData = {
    last_name: 'Squarepants',
    roll_number: 'CS999-SP',
  };
  const updateStudentRes = await request(`/students/${studentId}`, {
    method: 'PUT',
    body: updateStudentData,
  });
  if (!updateStudentRes.ok) throw new Error(`Update student failed: ${JSON.stringify(updateStudentRes.data)}`);
  console.log(`- Updated student successfully`);
  
  // GET single again
  const getStudentRes2 = await request(`/students/${studentId}`);
  if (!getStudentRes2.ok) throw new Error(`Get updated student failed: ${JSON.stringify(getStudentRes2.data)}`);
  if (getStudentRes2.data.last_name !== updateStudentData.last_name || getStudentRes2.data.roll_number !== updateStudentData.roll_number) {
    throw new Error(`Student updates not saved correctly`);
  }
  console.log(`- Verified student update: roll_number="${getStudentRes2.data.roll_number}", last_name="${getStudentRes2.data.last_name}"`);
  
  // DELETE
  const deleteStudentRes = await request(`/students/${studentId}`, { method: 'DELETE' });
  if (!deleteStudentRes.ok) throw new Error(`Delete student failed: ${JSON.stringify(deleteStudentRes.data)}`);
  console.log(`- Deleted student successfully`);
  
  // GET single (should return 404)
  const getStudentResDeleted = await request(`/students/${studentId}`);
  if (getStudentResDeleted.status !== 404) throw new Error(`Expected 404 for deleted student, got: ${getStudentResDeleted.status}`);
  console.log(`✅ Students Management is fully working!\n`);

  console.log('🎉 All integration tests passed successfully! Students, Classes (Sections), Teachers, and Subjects management modules are properly working.');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
