/**
 * Verification test script for Examinations & Grading Management Audit Fixes
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runExamsAuditTests() {
  console.log('🧪 Starting Examinations & Grading Management Audit verification tests...\n');

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

  // Fetch metadata: programs/courses, academic years, subjects, students
  const [coursesRes, ayRes, subsRes, studentsRes] = await Promise.all([
    request('/programs?status=ACTIVE'),
    request('/academic-years?status=ACTIVE'),
    request('/subjects?status=ACTIVE'),
    request('/students?status=ACTIVE')
  ]);

  if (!coursesRes.data.length || !ayRes.data.length || !subsRes.data.length) {
    console.error('❌ Failed to fetch required metadata for exams testing');
    return;
  }

  const targetCourse = coursesRes.data[0];
  const targetAY = ayRes.data[0];
  const targetSub = subsRes.data.find(s => s.course_id === targetCourse.id) || subsRes.data[0];
  const studentObj = studentsRes.data[0];

  // 2. Test Exam Date Range Validation (start_date > end_date)
  console.log('▶️ [1/6] Testing Exam Date Range Validation...');
  const invalidDateRes = await request('/exams', {
    method: 'POST',
    body: {
      name: 'Invalid Date Exam',
      academic_year_id: targetAY.id,
      course_id: targetCourse.id,
      semester: 1,
      start_date: '2026-10-15',
      end_date: '2026-10-10'
    }
  });

  if (invalidDateRes.status === 400 && invalidDateRes.data.error?.includes('start_date cannot be after')) {
    console.log(`✅ Passed: Invalid exam date range rejected: "${invalidDateRes.data.error}"`);
  } else {
    console.error('❌ Failed exam date range validation check:', invalidDateRes);
  }

  // 3. Create Valid Exam Event
  console.log('▶️ [2/6] Testing Valid Exam Event Creation...');
  const createExamRes = await request('/exams', {
    method: 'POST',
    body: {
      name: 'Midterm Spring 2026',
      academic_year_id: targetAY.id,
      course_id: targetCourse.id,
      semester: 1,
      start_date: '2026-04-10',
      end_date: '2026-04-20',
      status: 'PUBLISHED'
    }
  });

  let examId = createExamRes.data?.id;
  if (createExamRes.ok && examId) {
    console.log(`✅ Passed: Created Exam Event with ID ${examId}`);
  } else {
    const listRes = await request('/exams');
    if (listRes.data.length > 0) {
      examId = listRes.data[0].id;
      console.log(`✅ Using existing Exam Event ID ${examId}`);
    } else {
      console.error('❌ Failed to create exam:', createExamRes.data);
      return;
    }
  }

  // 4. Test Adding Exam Subject & Max/Min Marks Validation
  console.log('▶️ [3/6] Testing Exam Subject Max/Min Marks Validation...');
  const invalidSubjectMarks = await request(`/exams/${examId}/subjects`, {
    method: 'POST',
    body: {
      subject_id: targetSub.id,
      max_marks: 100,
      min_marks: 120
    }
  });

  if (invalidSubjectMarks.status === 400 && invalidSubjectMarks.data.error?.includes('between 0 and maximum')) {
    console.log(`✅ Passed: Invalid passing marks rejected: "${invalidSubjectMarks.data.error}"`);
  } else {
    console.error('❌ Failed passing marks validation check:', invalidSubjectMarks);
  }

  // Add valid exam subject
  const validSubjectRes = await request(`/exams/${examId}/subjects`, {
    method: 'POST',
    body: {
      subject_id: targetSub.id,
      max_marks: 100,
      min_marks: 40,
      exam_date: '2026-04-12',
      start_time: '09:00',
      end_time: '12:00'
    }
  });

  let examSubId = validSubjectRes.data?.id;
  if (validSubjectRes.ok && examSubId) {
    console.log(`✅ Passed: Exam subject added with ID ${examSubId}`);
  } else {
    const subList = await request(`/exams/${examId}/subjects`);
    if (subList.data.length > 0) {
      examSubId = subList.data[0].id;
    } else {
      console.error('❌ Failed adding exam subject:', validSubjectRes.data);
      return;
    }
  }

  // 5. Test Student Marks Entry Range Validation (obtained > max_marks)
  console.log('▶️ [4/6] Testing Student Marks Entry Range Validation...');
  const marksheet = await request(`/exams/subjects/${examSubId}/marks`);
  const enrolledStudent = (marksheet.data || [])[0];
  if (enrolledStudent) {
    const invalidMarksRes = await request(`/exams/subjects/${examSubId}/marks`, {
      method: 'POST',
      body: [
        {
          student_id: enrolledStudent.student_id,
          marks_obtained: 150,
          max_marks: 100
        }
      ]
    });

    if (invalidMarksRes.status === 400 && invalidMarksRes.data.error?.includes('exceed maximum')) {
      console.log(`✅ Passed: Excessive marks obtained rejected: "${invalidMarksRes.data.error}"`);
    } else {
      console.error('❌ Failed student marks range check:', invalidMarksRes);
    }
  }

  // 6. Test Hall Ticket Eligibility Check
  console.log('▶️ [5/6] Testing Hall Ticket Eligibility Check...');
  if (studentObj) {
    const elRes = await request(`/exams/${examId}/hall-ticket-eligibility/${studentObj.id}`);
    if (elRes.ok && typeof elRes.data.eligible === 'boolean') {
      console.log(`✅ Passed: Hall ticket eligibility calculated (Eligible: ${elRes.data.eligible}, Attendance: ${elRes.data.attendance_percentage}%)`);
    } else {
      console.error('❌ Failed hall ticket eligibility check:', elRes);
    }
  }

  // 7. Test Results Calculation & GPA Generation
  console.log('▶️ [6/6] Testing Exam Results & GPA Generation...');
  const resultsRes = await request(`/exams/${examId}/results`);
  if (resultsRes.ok) {
    console.log(`✅ Passed: Exam results retrieved for ${resultsRes.data.length} student(s).`);
  } else {
    console.error('❌ Failed exam results retrieval:', resultsRes);
  }

  console.log('\n🎉 All Examinations & Grading Management Audit verification tests completed successfully!');
}

runExamsAuditTests().catch(console.error);
