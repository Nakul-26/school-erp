/**
 * Verification Test Suite for Module 13 — Central Audit Logging Framework
 */
const BASE_URL = 'http://127.0.0.1:8799';

async function runAuditFrameworkTests() {
  console.log('🧪 Starting Central Audit Logging Framework verification tests...\n');

  let token = '';

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-ID': options.requestId || `req-test-${Math.random().toString(36).substring(7)}`,
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
      data = { text, raw: text };
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
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
    process.exit(1);
  }
  token = loginRes.data.token;
  const adminUser = loginRes.data.user;
  console.log(`✅ 1. Authenticated successfully as Super Admin (${adminUser.name}).`);

  // Test 1: Direct Audit Entry Creation (Full Schema)
  console.log('\n--- Test 1: Direct Audit Entry Creation (Full Schema) ---');
  const customReqId = `req-audit-${Date.now()}`;
  const createLogRes = await request('/audit-logs', {
    method: 'POST',
    requestId: customReqId,
    body: {
      module: 'students',
      entity_type: 'Student',
      entity_id: 'std-1001',
      action: 'UPDATE',
      event_name: 'StudentUpdated',
      description: 'Updated student profile and contact information',
      before_json: JSON.stringify({ name: 'Old Student Name', password: 'SecretPassword123' }),
      after_json: JSON.stringify({ name: 'New Student Name', password: 'SuperSecretPassword456' }),
      status: 'SUCCESS'
    }
  });

  if (createLogRes.status !== 201) {
    console.error('❌ Direct audit log creation failed:', createLogRes.data);
    process.exit(1);
  }
  const createdAuditId = createLogRes.data.id;
  console.log(`✅ Audit entry created with ID: ${createdAuditId}`);

  // Test 2: Sensitive Data Masking Verification
  console.log('\n--- Test 2: Sensitive Data Masking Verification ---');
  const searchLogRes = await request(`/audit-logs?request_id=${customReqId}`);
  if (searchLogRes.status !== 200 || !searchLogRes.data.data.length) {
    console.error('❌ Log search by request_id failed:', searchLogRes.data);
    process.exit(1);
  }
  const loggedEntry = searchLogRes.data.data[0];
  console.log('ℹ️ Retrieved logged before_json:', loggedEntry.before_json);
  console.log('ℹ️ Retrieved logged after_json:', loggedEntry.after_json);

  if (loggedEntry.before_json.includes('SecretPassword123') || loggedEntry.after_json.includes('SuperSecretPassword456')) {
    console.error('❌ Sensitive data masking FAILED! Passwords were found in cleartext.');
    process.exit(1);
  }
  if (!loggedEntry.before_json.includes('********') || !loggedEntry.after_json.includes('********')) {
    console.error('❌ Sensitive data masking missing expected ******** mask.');
    process.exit(1);
  }
  console.log('✅ Sensitive data masking verified successfully! Passwords masked with ********');

  // Test 3: Request Correlation ID Propagation
  console.log('\n--- Test 3: Request Correlation ID Propagation ---');
  const checkReqIdHeader = createLogRes.headers.get('x-request-id');
  if (!checkReqIdHeader) {
    console.error('❌ Missing X-Request-ID response header');
    process.exit(1);
  }
  if (loggedEntry.request_id !== customReqId) {
    console.error(`❌ Request ID mismatch. Expected ${customReqId}, got ${loggedEntry.request_id}`);
    process.exit(1);
  }
  console.log(`✅ Request Correlation ID verified: ${loggedEntry.request_id}`);

  // Test 4: EventBus Automatic Audit Logging Integration
  console.log('\n--- Test 4: EventBus Automatic Audit Logging ---');
  const testEntityId = `fee-record-${Date.now()}`;
  const eventRes = await request('/notifications/event', {
    method: 'POST',
    body: {
      event_type: 'AttendanceMarkedAbsent',
      recipient_user_id: adminUser.id,
      variables: {
        student_name: 'Audit Test Student',
        parent_name: 'Parent Name',
        section_name: 'CSE-B',
        entity_id: testEntityId
      }
    }
  });

  if (eventRes.status !== 201) {
    console.error('❌ Event notification trigger failed:', eventRes.data);
    process.exit(1);
  }

  // Allow short propagation
  await new Promise(r => setTimeout(r, 200));

  const checkEventAuditRes = await request('/audit-logs?module=attendance');
  if (checkEventAuditRes.status !== 200 || !checkEventAuditRes.data.data.length) {
    console.error('❌ EventBus auto audit entry missing:', checkEventAuditRes.data);
    process.exit(1);
  }
  console.log(`✅ EventBus auto audit entry captured! (Found ${checkEventAuditRes.data.data.length} attendance event logs)`);

  // Test 5: Bulk Audit Log Insertion
  console.log('\n--- Test 5: Bulk Operation Logging ---');
  const bulkReqId = `bulk-req-${Date.now()}`;
  const bulkRes = await request('/audit-logs/bulk', {
    method: 'POST',
    requestId: bulkReqId,
    body: {
      entries: [
        { module: 'students', entity_type: 'Student', entity_id: 'std-2001', action: 'CREATE', event_name: 'StudentAdmitted', description: 'Bulk admitted Student A' },
        { module: 'students', entity_type: 'Student', entity_id: 'std-2002', action: 'CREATE', event_name: 'StudentAdmitted', description: 'Bulk admitted Student B' },
        { module: 'students', entity_type: 'Student', entity_id: 'std-2003', action: 'CREATE', event_name: 'StudentAdmitted', description: 'Bulk admitted Student C' }
      ]
    }
  });

  if (bulkRes.status !== 201 || bulkRes.data.count !== 3) {
    console.error('❌ Bulk audit creation failed:', bulkRes.data);
    process.exit(1);
  }
  console.log(`✅ Bulk operation logged ${bulkRes.data.count} entries with shared request_id: ${bulkReqId}`);

  // Test 6: Search & Multi-criteria Filter Accuracy
  console.log('\n--- Test 6: Search & Filter Accuracy ---');
  const filterRes = await request('/audit-logs?module=students&action=CREATE');
  if (filterRes.status !== 200 || !filterRes.data.data.length) {
    console.error('❌ Multi-criteria filter query failed:', filterRes.data);
    process.exit(1);
  }
  console.log(`✅ Filter query accuracy verified (${filterRes.data.data.length} matches returned)`);

  // Test 7: Entity Timeline History
  console.log('\n--- Test 7: Entity Timeline History ---');
  const timelineRes = await request('/audit-logs/entity/Student/std-1001');
  if (timelineRes.status !== 200 || !timelineRes.data.length) {
    console.error('❌ Entity timeline fetch failed:', timelineRes.data);
    process.exit(1);
  }
  console.log(`✅ Entity timeline history retrieved (${timelineRes.data.length} event(s) in entity lifecycle)`);

  // Test 8: CSV Export Compliance Generation
  console.log('\n--- Test 8: CSV Compliance Export ---');
  const csvRes = await request('/audit-logs/export/csv');
  if (csvRes.status !== 200 || !csvRes.data.raw || !csvRes.data.raw.includes('Timestamp,Request ID,User Name')) {
    console.error('❌ CSV export failed or invalid header:', csvRes.data);
    process.exit(1);
  }
  console.log('✅ CSV Export generated cleanly with compliance headers!');

  // Test 9: JSON Export Compliance Generation
  console.log('\n--- Test 9: JSON Compliance Export ---');
  const jsonRes = await request('/audit-logs/export/json');
  if (jsonRes.status !== 200 || !jsonRes.data.logs) {
    console.error('❌ JSON export failed:', jsonRes.data);
    process.exit(1);
  }
  console.log(`✅ JSON Export generated cleanly (${jsonRes.data.total_records} records exported)`);

  // Test 10: Security Events Logging & Retrieval
  console.log('\n--- Test 10: Security Events Logging ---');
  const secLogRes = await request('/audit-logs', {
    method: 'POST',
    body: {
      module: 'auth',
      entity_type: 'User',
      entity_id: adminUser.id,
      action: 'LOGIN_FAILED',
      event_name: 'LoginFailure',
      description: 'Invalid password attempt from IP 192.168.1.50',
      status: 'BLOCKED',
      reason: 'Too many failed login attempts'
    }
  });

  if (secLogRes.status !== 201) {
    console.error('❌ Security log creation failed:', secLogRes.data);
    process.exit(1);
  }

  const securityRes = await request('/audit-logs/security');
  if (securityRes.status !== 200 || !securityRes.data.length) {
    console.error('❌ Security events endpoint failed:', securityRes.data);
    process.exit(1);
  }
  console.log(`✅ Security events log verified (${securityRes.data.length} security event(s) recorded)`);

  console.log('\n🎉 ALL 10 MODULE 13 CENTRAL AUDIT LOGGING VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runAuditFrameworkTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
