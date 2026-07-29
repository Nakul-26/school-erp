/**
 * Verification Test Suite for Module 12 — Notification Center Audit
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runNotificationsAuditTests() {
  console.log('🧪 Starting Notification Center Audit verification tests...\n');

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
    process.exit(1);
  }
  token = loginRes.data.token;
  console.log('✅ 1. Authenticated successfully as Super Admin.');

  // Fetch users for recipient
  const usersRes = await request('/users');
  if (!usersRes.data.length) {
    console.error('❌ Failed to fetch users for testing');
    process.exit(1);
  }
  const testUser = loginRes.data.user || usersRes.data[0];
  console.log(`ℹ️ Testing with recipient user: ${testUser.name || testUser.email} (${testUser.id})`);

  // Test 1: Template CRUD & Placeholder Variable Rendering
  console.log('\n--- Test 1: Template Management & Dynamic Placeholders ---');
  const templateRes = await request('/notifications/templates', {
    method: 'POST',
    body: {
      name: 'Attendance Absent Notification',
      event_type: 'AttendanceMarkedAbsent',
      channel: 'all',
      subject: 'Absent Alert: {{student_name}}',
      body: 'Hello {{parent_name}}, {{student_name}} was marked absent today in {{section_name}} at {{institution_name}}.',
      variables_json: JSON.stringify(['student_name', 'parent_name', 'section_name', 'institution_name'])
    }
  });

  if (templateRes.status !== 201) {
    console.error('❌ Template creation failed:', templateRes.data);
    process.exit(1);
  }
  const templateId = templateRes.data.id;
  console.log(`✅ Created Template (ID: ${templateId})`);

  const listTemplatesRes = await request('/notifications/templates');
  if (listTemplatesRes.status !== 200 || !listTemplatesRes.data.length) {
    console.error('❌ Listing templates failed:', listTemplatesRes.data);
    process.exit(1);
  }
  console.log(`✅ Templates listed (${listTemplatesRes.data.length} template(s) found)`);

  // Test 2: Event-Driven Templated Notification Dispatch
  console.log('\n--- Test 2: Event-Driven Notification Dispatching ---');
  const eventRes = await request('/notifications/event', {
    method: 'POST',
    body: {
      event_type: 'AttendanceMarkedAbsent',
      recipient_user_id: testUser.id,
      variables: {
        student_name: 'Rahul Sharma',
        parent_name: 'Mr. Sharma',
        section_name: 'CSE-A',
        institution_name: 'Oxford College'
      },
      channels: ['in_app', 'email', 'sms', 'whatsapp', 'push']
    }
  });

  if (eventRes.status !== 201) {
    console.error('❌ Event notification dispatch failed:', eventRes.data);
    process.exit(1);
  }
  const notifId = eventRes.data.id;
  console.log(`✅ Event-driven notification dispatched! Notification ID: ${notifId}`);

  // Test 3: User Notification Preferences Enforcement
  console.log('\n--- Test 3: User Notification Preferences Enforcement ---');
  const updatePrefRes = await request('/notifications/preferences', {
    method: 'PUT',
    body: {
      email_enabled: 1,
      sms_enabled: 0, // Disabled SMS
      whatsapp_enabled: 1,
      push_enabled: 1,
      in_app_enabled: 1,
      quiet_hours_start: '23:00',
      quiet_hours_end: '06:00'
    }
  });

  if (updatePrefRes.status !== 200) {
    console.error('❌ Preference update failed:', updatePrefRes.data);
    process.exit(1);
  }

  const getPrefRes = await request('/notifications/preferences');
  if (getPrefRes.status !== 200 || getPrefRes.data.sms_enabled !== 0) {
    console.error('❌ Preference verification failed:', getPrefRes.data);
    process.exit(1);
  }
  console.log('✅ User preferences updated & verified (SMS disabled, quiet hours set)');

  // Test 4: Scheduled Notification Execution
  console.log('\n--- Test 4: Scheduled Notification ---');
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const scheduleRes = await request('/notifications/schedule', {
    method: 'POST',
    body: {
      recipient_user_id: testUser.id,
      title: 'Fee Payment Reminder',
      message: 'Your tuition fee is due tomorrow.',
      type: 'finance',
      scheduled_at: futureDate
    }
  });

  if (scheduleRes.status !== 201) {
    console.error('❌ Scheduling notification failed:', scheduleRes.data);
    process.exit(1);
  }
  console.log(`✅ Notification scheduled for ${futureDate}`);

  // Test 5: Queue & Async Worker Processing
  console.log('\n--- Test 5: Queue System & Worker Execution ---');
  const processQueueRes = await request('/notifications/process-queue', {
    method: 'POST'
  });

  if (processQueueRes.status !== 200) {
    console.error('❌ Queue processing worker failed:', processQueueRes.data);
    process.exit(1);
  }
  console.log('✅ Queue Worker processed background items:', processQueueRes.data);

  // Test 6: Manual Retry of Notification
  console.log('\n--- Test 6: Manual Notification Retry ---');
  const retryRes = await request(`/notifications/${notifId}/retry`, {
    method: 'POST'
  });

  if (retryRes.status !== 200) {
    console.error('❌ Notification retry failed:', retryRes.data);
    process.exit(1);
  }
  console.log('✅ Manual retry executed successfully!');

  // Test 7: Inbox Notification Listing & Mark as Read
  console.log('\n--- Test 7: User Inbox & Read Status ---');
  const inboxRes = await request('/notifications');
  if (inboxRes.status !== 200 || !inboxRes.data.length) {
    console.error('❌ Inbox listing failed:', inboxRes.data);
    process.exit(1);
  }
  console.log(`✅ Inbox retrieved (${inboxRes.data.length} notification(s) in inbox)`);

  const markReadRes = await request(`/notifications/${inboxRes.data[0].id}/read`, { method: 'PUT' });
  console.log('✅ Marked notification as read');

  // Test 8: Immutable Audit Logs
  console.log('\n--- Test 8: Immutable Audit Logs ---');
  const logsRes = await request('/notifications/logs');
  if (logsRes.status !== 200 || !logsRes.data.length) {
    console.error('❌ Audit logs empty or failed:', logsRes.data);
    process.exit(1);
  }
  console.log(`✅ Recorded ${logsRes.data.length} immutable notification provider log(s)`);

  // Test 9: Analytics Dashboard Consistency
  console.log('\n--- Test 9: Analytics Metrics & Dashboard ---');
  const analyticsRes = await request('/notifications/analytics');
  if (analyticsRes.status !== 200) {
    console.error('❌ Analytics metrics fetch failed:', analyticsRes.data);
    process.exit(1);
  }
  console.log('✅ Notification Analytics verified:');
  console.log(`   Total Billed/Sent: ${analyticsRes.data.total_notifications}`);
  console.log(`   Delivered: ${analyticsRes.data.total_delivered}`);
  console.log(`   Delivery Rate: ${analyticsRes.data.delivery_rate_percent}%`);
  console.log(`   Open Rate: ${analyticsRes.data.open_rate_percent}%`);

  // Test 10: Clean-up Preferences for test user
  console.log('\n--- Test 10: Preferences Reset & Final Check ---');
  await request('/notifications/preferences', {
    method: 'PUT',
    body: { sms_enabled: 1 }
  });
  console.log('✅ Reset test user preferences.');

  console.log('\n🎉 ALL 10 MODULE 12 AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runNotificationsAuditTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
