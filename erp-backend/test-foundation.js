/**
 * Integration Test for Foundation:
 * Phase 1:
 * 1. Authentication
 * 2. Role Management
 * 3. Permission System (RBAC)
 * 4. Institution Profile Setup
 * 5. Audit Logs
 * 
 * Phase 2:
 * 6. Academic Years
 * 7. Departments
 * 8. Courses/Programs
 * 9. Classes/Sections
 * 10. Subjects
 */
const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Starting integration tests for ERP Foundation Layer...\n');
  
  let token = '';
  let adminId = '';
  
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

  // ============================================
  // Phase 1: Core security & governance
  // ============================================

  // 1. Auth Login
  console.log('🔑 [1/10] Testing Authentication...');
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
  adminId = loginRes.data.user.id;
  const userRoles = loginRes.data.user.roles || [];
  console.log(`✅ Login successful! Roles: [${userRoles.join(', ')}]`);
  
  // Verify token validation on me
  const meRes = await request('/auth/me');
  if (!meRes.ok || meRes.data.user.sub !== adminId) {
    throw new Error('Verification of /auth/me failed');
  }
  console.log('✅ Token validation (/auth/me) passed.\n');

  // 2. Institution Setup
  console.log('🏢 [2/10] Testing Organization / Institution Setup...');
  const instId = 'inst-greenwood';
  
  // Get details
  const getInstRes = await request(`/institutions/${instId}`);
  if (!getInstRes.ok) throw new Error(`Get institution profile failed: ${JSON.stringify(getInstRes.data)}`);
  console.log(`- Retrieved profile for: "${getInstRes.data.name}"`);
  
  // Update details
  const updatedProfile = {
    name: 'Oxford Academy University',
    address: '123 Education Lane Suite A',
    phone: '555-9999',
    email: 'contact@oxford-univ.edu',
    institution_type: 'engineering_college'
  };
  const updateInstRes = await request(`/institutions/${instId}`, {
    method: 'PUT',
    body: updatedProfile
  });
  if (!updateInstRes.ok) throw new Error(`Update institution profile failed: ${JSON.stringify(updateInstRes.data)}`);
  console.log('- Updated institution profile successfully');

  // Retrieve again and verify
  const getInstRes2 = await request(`/institutions/${instId}`);
  if (!getInstRes2.ok) throw new Error(`Get updated profile failed`);
  if (getInstRes2.data.name !== updatedProfile.name || getInstRes2.data.phone !== updatedProfile.phone) {
    throw new Error('Institution updates were not stored correctly');
  }
  console.log(`✅ Institution setup verified. New name: "${getInstRes2.data.name}", Phone: ${getInstRes2.data.phone}\n`);

  // 3. Roles and Permissions metadata
  console.log('🛡️ [3/10] Testing Role & Permission Management...');
  
  // Fetch Roles list
  const getRolesRes = await request('/roles');
  if (!getRolesRes.ok) throw new Error(`Get roles failed: ${JSON.stringify(getRolesRes.data)}`);
  const seededRoleNames = getRolesRes.data.map(r => r.name);
  console.log(`- Seeded roles found in DB: [${seededRoleNames.join(', ')}]`);
  
  const expectedRoles = ['Super Admin', 'Principal', 'HOD', 'Teacher', 'Student', 'Accountant'];
  for (const exp of expectedRoles) {
    if (!seededRoleNames.includes(exp)) {
      throw new Error(`Expected role "${exp}" was not found in database`);
    }
  }
  
  // Fetch Permissions list
  const getPermsRes = await request('/roles/permissions');
  if (!getPermsRes.ok) throw new Error(`Get permissions failed: ${JSON.stringify(getPermsRes.data)}`);
  console.log(`- Total system permissions seeded: ${getPermsRes.data.length}`);
  console.log('✅ Role and Permission metadata verified.\n');

  // 4. Multiple Roles Assignment & RBAC
  console.log('👥 [4/10] Testing User Creation with Multiple Roles...');
  
  const newUserData = {
    name: 'Sarah Connor',
    username: 'sconnor',
    email: 'sarah.connor@oxford.edu',
    password: 'password123',
    phone: '555-0010',
    roles: ['HOD', 'Teacher'] // Teacher + HOD multiple roles
  };
  
  const createUserRes = await request('/users', {
    method: 'POST',
    body: newUserData
  });
  if (createUserRes.status !== 201) throw new Error(`Create user failed: ${JSON.stringify(createUserRes.data)}`);
  const newUserId = createUserRes.data.id;
  console.log(`- Created user ${newUserData.email} with ID: ${newUserId}`);
  
  // Retrieve the created user and check roles
  const getUserRes = await request(`/users/${newUserId}`);
  if (!getUserRes.ok) {
    console.error('Retrieve user failed:', getUserRes.status, getUserRes.data);
    throw new Error(`Retrieve user failed`);
  }
  const assignedRoles = getUserRes.data.roles || [];
  console.log(`- User roles in DB: [${assignedRoles.join(', ')}]`);
  
  if (assignedRoles.length !== 2 || !assignedRoles.includes('HOD') || !assignedRoles.includes('Teacher')) {
    throw new Error('Multiple roles assignment was not stored correctly in database');
  }
  console.log('✅ Multiple roles verification passed.\n');

  // 5. Audit Logging
  console.log('📝 [5/10] Testing System Audit Logs...');
  
  const getLogsRes = await request('/audit-logs');
  if (!getLogsRes.ok) throw new Error(`Get audit logs failed: ${JSON.stringify(getLogsRes.data)}`);
  
  const logsArray = Array.isArray(getLogsRes.data) ? getLogsRes.data : getLogsRes.data.data;
  console.log(`- Total audit logs retrieved: ${logsArray.length}`);
  
  const recentLogs = logsArray.slice(0, 5);
  console.log('- Recent actions tracked:');
  recentLogs.forEach(log => {
    console.log(`  * [${log.action}] ${log.description} (${new Date(log.timestamp).toLocaleTimeString()})`);
  });
  
  const hasLoginLog = logsArray.some(log => log.action === 'LOGIN');
  const hasUpdateInstLog = logsArray.some(log => log.action === 'UPDATE_INSTITUTION');
  const hasCreateUserLog = logsArray.some(log => log.action === 'CREATE_USER');
  
  if (!hasLoginLog || !hasUpdateInstLog || !hasCreateUserLog) {
    throw new Error('Required audit log actions were not recorded in the database');
  }
  console.log('✅ System Audit Logs tracking verified successfully!\n');

  // ============================================
  // Phase 2: Academic foundation
  // ============================================
  console.log('--- 🏫 Testing Phase 2 Academic Foundation Modules ---\n');

  // 6. Academic Years
  console.log('📅 [6/10] Testing Academic Years...');
  const newAcadYear = {
    name: '2027-28',
    start_date: '2027-06-01',
    end_date: '2028-05-31',
    is_current: 0
  };
  const createYearRes = await request('/academic-years', {
    method: 'POST',
    body: newAcadYear
  });
  if (createYearRes.status !== 201) throw new Error(`Create academic year failed: ${JSON.stringify(createYearRes.data)}`);
  const newYearId = createYearRes.data.id;
  console.log(`- Created academic year ${newAcadYear.name} with ID: ${newYearId}`);

  // List academic years
  const getYearsRes = await request('/academic-years');
  if (!getYearsRes.ok) throw new Error(`Get academic years failed`);
  console.log(`- Total academic years in DB: ${getYearsRes.data.length}`);
  if (!getYearsRes.data.some(y => y.id === newYearId)) throw new Error('New academic year not listed');
  console.log('✅ Academic Years verified.\n');

  // 7. Departments
  console.log('🏢 [7/10] Testing Departments...');
  const newDept = {
    name: 'Electrical Engineering Department',
    code: 'EE',
    description: 'Department of Electrical Engineering'
  };
  const createDeptRes = await request('/departments', {
    method: 'POST',
    body: newDept
  });
  if (createDeptRes.status !== 201) throw new Error(`Create department failed: ${JSON.stringify(createDeptRes.data)}`);
  const newDeptId = createDeptRes.data.id;
  console.log(`- Created department ${newDept.name} with ID: ${newDeptId}`);

  // List departments
  const getDeptsRes = await request('/departments');
  if (!getDeptsRes.ok) throw new Error(`Get departments failed`);
  console.log(`- Total departments in DB: ${getDeptsRes.data.length}`);
  if (!getDeptsRes.data.some(d => d.id === newDeptId)) throw new Error('New department not listed');
  console.log('✅ Departments verified.\n');

  // 8. Courses / Programs
  console.log('🎓 [8/10] Testing Courses / Programs...');
  const newCourse = {
    course_code: 'EE-BTECH',
    name: 'B.Tech Electrical Engineering',
    duration_years: 4,
    department_id: newDeptId
  };
  const createCourseRes = await request('/programs', {
    method: 'POST',
    body: newCourse
  });
  if (createCourseRes.status !== 201) throw new Error(`Create course failed: ${JSON.stringify(createCourseRes.data)}`);
  const newCourseId = createCourseRes.data.id;
  console.log(`- Created course ${newCourse.name} with ID: ${newCourseId}`);

  // List courses
  const getCoursesRes = await request('/programs');
  if (!getCoursesRes.ok) throw new Error(`Get courses failed`);
  console.log(`- Total courses in DB: ${getCoursesRes.data.length}`);
  const seededCourse = getCoursesRes.data.find(c => c.id === newCourseId);
  if (!seededCourse) throw new Error('New course not listed');
  if (seededCourse.department_id !== newDeptId) throw new Error('Course department reference was not stored correctly');
  console.log('✅ Courses / Programs verified.\n');

  // 9. Classes / Sections
  console.log('🏫 [9/10] Testing Classes / Sections...');
  const newSection = {
    name: 'EE Section A',
    year_number: 1,
    course_id: newCourseId,
    academic_year_id: newYearId
  };
  const createSecRes = await request('/sections', {
    method: 'POST',
    body: newSection
  });
  if (createSecRes.status !== 201) throw new Error(`Create section failed: ${JSON.stringify(createSecRes.data)}`);
  const newSecId = createSecRes.data.id;
  console.log(`- Created section ${newSection.name} with ID: ${newSecId}`);

  // List sections
  const getSecsRes = await request('/sections');
  if (!getSecsRes.ok) throw new Error(`Get sections failed`);
  console.log(`- Total sections in DB: ${getSecsRes.data.length}`);
  if (!getSecsRes.data.some(s => s.id === newSecId)) throw new Error('New section not listed');
  console.log('✅ Classes / Sections verified.\n');

  // 10. Subjects
  console.log('📚 [10/10] Testing Subjects...');
  const newSubject = {
    subject_code: 'EE101',
    subject_name: 'Basic Electrical Science',
    credits: 3,
    semester: 1,
    course_id: newCourseId
  };
  const createSubRes = await request('/subjects', {
    method: 'POST',
    body: newSubject
  });
  if (createSubRes.status !== 201) throw new Error(`Create subject failed: ${JSON.stringify(createSubRes.data)}`);
  const newSubId = createSubRes.data.id;
  console.log(`- Created subject ${newSubject.subject_name} with ID: ${newSubId}`);

  // List subjects
  const getSubsRes = await request('/subjects');
  if (!getSubsRes.ok) throw new Error(`Get subjects failed`);
  console.log(`- Total subjects in DB: ${getSubsRes.data.length}`);
  if (!getSubsRes.data.some(s => s.id === newSubId)) throw new Error('New subject not listed');
  console.log('✅ Subjects verified.\n');

  // Verify Audit Logs got updated for Phase 2 actions
  console.log('📝 Verifying Phase 2 actions in Audit Logs...');
  const getLogsRes2 = await request('/audit-logs');
  if (!getLogsRes2.ok) throw new Error('Get audit logs for phase 2 failed');
  
  const logsArray2 = Array.isArray(getLogsRes2.data) ? getLogsRes2.data : getLogsRes2.data.data;
  const actionsToCheck = [
    'CREATE_ACADEMIC_YEAR',
    'CREATE_DEPARTMENT',
    'CREATE_COURSE',
    'CREATE_SECTION',
    'CREATE_SUBJECT'
  ];
  
  for (const action of actionsToCheck) {
    const hasLog = logsArray2.some(log => log.action === action);
    if (!hasLog) {
      throw new Error(`Audit log for action "${action}" was not found`);
    }
    console.log(`- Found audit log for action: "${action}"`);
  }
  console.log('✅ Phase 2 Audit Log checks passed successfully!\n');

  console.log('🎉 ERP Foundation Layer (all 10 modules) successfully verified!');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
