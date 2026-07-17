/**
 * Integration Test for Communication Upgrade (Phases 1-4)
 * Run with node test-communication-upgrade.js while the backend server is running
 */
const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Starting integration tests for Communication Upgrade (Phases 1-4)...\n');
  
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
  console.log('🔑 [1/6] Testing Authentication...');
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

  // 2. Templates CRUD
  console.log('📝 [2/6] Testing Message Templates CRUD...');
  const getTemplatesRes = await request('/message-templates');
  if (!getTemplatesRes.ok) throw new Error('Failed to fetch initial message templates');
  console.log(`- Loaded initial templates: ${getTemplatesRes.data.length}`);

  const templatePayload = {
    name: 'Fee Notification Test',
    category: 'fees',
    subject: 'Overdue Tuition Fees for {{studentName}}',
    body: 'Dear parent, fee of {{amount}} is due on {{dueDate}}.'
  };

  const createTempRes = await request('/message-templates', {
    method: 'POST',
    body: templatePayload
  });
  if (createTempRes.status !== 201) throw new Error(`Create template failed: ${JSON.stringify(createTempRes.data)}`);
  const templateId = createTempRes.data.id;
  console.log(`- Created message template with ID: ${templateId}`);

  // Update template
  const updateTempRes = await request(`/message-templates/${templateId}`, {
    method: 'PUT',
    body: { ...templatePayload, name: 'Fee Notification Test Updated' }
  });
  if (!updateTempRes.ok) throw new Error('Failed to update message template');
  console.log(`- Updated message template name`);

  // 3. Compose Broadcast Draft
  console.log('📤 [3/6] Testing Broadcast Draft Creation...');
  const draftPayload = {
    subject: 'Holiday Announcement',
    body: 'School is closed for Independence Day.',
    category: 'events',
    priority: 'normal',
    recipient_type: 'all',
    recipient_filter: JSON.stringify({
      type: 'all',
      includeStudents: true,
      includeParents: true,
      includeTeachers: false
    }),
    channel: 'erp,email,sms,whatsapp',
    status: 'draft',
    expires_at: null,
    attachments: [
      { file_name: 'Calendar PDF', file_url: 'https://example.com/calendar.pdf' }
    ]
  };

  const createDraftRes = await request('/broadcasts', {
    method: 'POST',
    body: draftPayload
  });
  if (createDraftRes.status !== 201) throw new Error(`Create draft broadcast failed: ${JSON.stringify(createDraftRes.data)}`);
  const broadcastId = createDraftRes.data.id;
  console.log(`- Created broadcast draft with ID: ${broadcastId}`);

  // 4. Update Broadcast Draft
  console.log('🔄 [4/6] Testing Broadcast Draft Update...');
  const updateDraftRes = await request(`/broadcasts/${broadcastId}`, {
    method: 'PUT',
    body: { ...draftPayload, subject: 'Holiday Announcement Updated' }
  });
  if (!updateDraftRes.ok) throw new Error('Failed to update broadcast draft');
  console.log(`- Updated draft broadcast subject`);

  // 5. Send Broadcast
  console.log('🚀 [5/6] Testing Send Broadcast...');
  const sendRes = await request(`/broadcasts/${broadcastId}/send`, {
    method: 'POST'
  });
  if (!sendRes.ok) throw new Error('Failed to send broadcast');
  console.log(`- Dispatched broadcast draft ${broadcastId}`);

  // 6. Analytics Verification
  console.log('📊 [6/6] Verifying Broadcast Analytics...');
  const analyticsRes = await request(`/broadcasts/${broadcastId}/analytics`);
  if (!analyticsRes.ok) throw new Error('Failed to retrieve broadcast analytics');
  console.log(`- Found ${analyticsRes.data.stats.total} recipients resolved`);
  console.log(`- Delivered count: ${analyticsRes.data.stats.delivered}`);
  console.log(`- Recipients list length: ${analyticsRes.data.recipients.length}`);

  // Cleanup: Delete created template and soft-delete/archive broadcast
  console.log('\n🧹 Cleaning up test data...');
  await request(`/message-templates/${templateId}`, { method: 'DELETE' });
  await request(`/broadcasts/${broadcastId}`, { method: 'DELETE' });
  console.log('- Test resources cleaned up');

  console.log('\n⭐ Integration tests for Communication Upgrade passed successfully!');
}

runTests().catch(e => {
  console.error('\n❌ Integration test failed:');
  console.error(e);
  process.exit(1);
});
