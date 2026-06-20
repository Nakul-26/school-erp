/**
 * Integration Test for Batch 2 Features:
 * 1. Exams CRUD
 * 2. Exam Subjects config
 * 3. Marks Entry
 * 4. Results Aggregation
 * 5. Student Result Card
 */
const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Starting integration tests for Batch 2 (Exams & Results)...\n');
  
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
  console.log('🔑 Testing Authentication...');
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

  // 2. Exams CRUD
  console.log('📝 [1/5] Testing Exams CRUD...');
  const examPayload = {
    name: 'Internal Test 1',
    academic_year_id: 'year-2026',
    course_id: 'prog-cse',
    semester: 3,
    start_date: '2026-07-01',
    end_date: '2026-07-03',
    status: 'DRAFT'
  };
  
  const createExamRes = await request('/exams', {
    method: 'POST',
    body: examPayload
  });
  if (createExamRes.status !== 201) throw new Error(`Create exam failed: ${JSON.stringify(createExamRes.data)}`);
  const examId = createExamRes.data.id;
  console.log(`- Created Exam event: ${examPayload.name} with ID: ${examId}`);

  // Fetch single
  const getExam = await request(`/exams/${examId}`);
  if (!getExam.ok) throw new Error('Get exam failed');
  console.log(`- Retrieved exam status: ${getExam.data.status}`);

  // Update status
  const updateExamRes = await request(`/exams/${examId}`, {
    method: 'PUT',
    body: { status: 'PUBLISHED' }
  });
  if (!updateExamRes.ok) throw new Error('Update exam failed');
  console.log(`- Updated exam status to PUBLISHED`);
  console.log('✅ Exams CRUD verified.\n');

  // 3. Exam Subjects
  console.log('📚 [2/5] Testing Exam Subjects configuration...');
  const examSubjectPayload = {
    subject_id: 'sub-ds', // Data Structures (seeded, Course prog-cse, Sem 3)
    exam_date: '2026-07-01',
    start_time: '09:00',
    end_time: '12:00',
    max_marks: 100,
    min_marks: 40
  };
  
  const addSubjectRes = await request(`/exams/${examId}/subjects`, {
    method: 'POST',
    body: examSubjectPayload
  });
  if (addSubjectRes.status !== 201) throw new Error(`Add exam subject failed: ${JSON.stringify(addSubjectRes.data)}`);
  const examSubjectId = addSubjectRes.data.id;
  console.log(`- Added Subject sub-ds to Exam. ExamSubject ID: ${examSubjectId}`);

  const getSubjects = await request(`/exams/${examId}/subjects`);
  if (!getSubjects.ok || getSubjects.data.length !== 1) throw new Error('List exam subjects failed');
  console.log(`- Listed exam subjects count: ${getSubjects.data.length}`);
  console.log('✅ Exam Subjects configuration verified.\n');

  // 4. Marks Entry
  console.log('💯 [3/5] Testing Student Marks Entry...');
  
  // Seed a student
  const studentPayload = {
    admission_number: 'ADM_S_2001',
    roll_number: 'CSE-301',
    first_name: 'Alice',
    last_name: 'Wonder',
    status: 'ACTIVE'
  };
  const createStudent = await request('/students', {
    method: 'POST',
    body: studentPayload
  });
  if (createStudent.status !== 201) throw new Error('Create student failed');
  const studentId = createStudent.data.id;
  console.log(`- Seeded student: ${studentPayload.first_name} ${studentPayload.last_name} with ID: ${studentId}`);

  // Enroll student in Course prog-cse, Semester 3 (to make them eligible for the exam!)
  const enrollPayload = {
    student_id: studentId,
    academic_year_id: 'year-2026',
    course_id: 'prog-cse',
    section_id: 'sec-cse-a',
    semester: 3
  };
  const enrollStudent = await request('/enrollments', {
    method: 'POST',
    body: enrollPayload
  });
  if (enrollStudent.status !== 201) throw new Error(`Enrollment failed: ${JSON.stringify(enrollStudent.data)}`);
  console.log(`- Enrolled student alice in course prog-cse semester 3`);

  // Fetch empty marksheet
  const getMarksheet = await request(`/exams/subjects/${examSubjectId}/marks`);
  if (!getMarksheet.ok || getMarksheet.data.length === 0) throw new Error('Retrieve marksheet failed');
  console.log(`- Retrieved sheet. Enrolled students found: ${getMarksheet.data.length}`);

  // Enter marks: Alice gets 85 (Grade A)
  const marksPayload = [
    {
      student_id: studentId,
      marks_obtained: 85,
      max_marks: 100,
      remarks: 'Excellent performance'
    }
  ];
  const saveMarksRes = await request(`/exams/subjects/${examSubjectId}/marks`, {
    method: 'POST',
    body: marksPayload
  });
  if (!saveMarksRes.ok) throw new Error('Save marks failed');
  console.log(`- Saved marks for student ${studentId}: 85/100`);
  console.log('✅ Student Marks Entry verified.\n');

  // 5. Results & Student Result Card
  console.log('📊 [4/5] Testing Results Calculation & Student Result Card...');
  
  // Aggregate exam results for all students
  const getExamResults = await request(`/exams/${examId}/results`);
  if (!getExamResults.ok || getExamResults.data.length === 0) throw new Error('Get exam results failed');
  const aliceResultRow = getExamResults.data.find(r => r.student_id === studentId);
  if (!aliceResultRow || aliceResultRow.percentage !== 85 || aliceResultRow.grade !== 'A' || aliceResultRow.result !== 'PASS') {
    throw new Error(`Grade or Result calculation mismatch. Got: ${JSON.stringify(aliceResultRow)}`);
  }
  console.log(`- Exam results calculated: Total=${aliceResultRow.total_obtained}, Pct=${aliceResultRow.percentage}%, Grade=${aliceResultRow.grade}, Result=${aliceResultRow.result}`);

  // Fetch detailed student result card
  const getCard = await request(`/exams/students/${studentId}/exams/${examId}/result`);
  if (!getCard.ok) throw new Error('Get student result card failed');
  console.log(`- Result Card retrieved: Exam Name="${getCard.data.exam_name}", Status=${getCard.data.result}`);
  
  const subResult = getCard.data.subjects[0];
  if (!subResult || subResult.marks_obtained !== 85 || subResult.status !== 'PASS') {
    throw new Error('Subject result details are incorrect');
  }
  console.log(`  * Subject: "${subResult.subject_code} - ${subResult.subject_name}", Marks: ${subResult.marks_obtained}/100, Status: ${subResult.status}`);
  console.log('✅ Results & Student Result Card verified successfully!\n');

  // Cleanup: soft delete exam
  console.log('🧹 [5/5] Cleaning up...');
  const deleteExamRes = await request(`/exams/${examId}`, { method: 'DELETE' });
  if (!deleteExamRes.ok) throw new Error('Clean up delete exam failed');
  console.log('✅ Clean up completed.\n');

  console.log('🎉 All Batch 2 integration tests passed successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
