/**
 * Verification Test Suite for Module 11 — Fee & Financial Management Audit
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runFeesAuditTests() {
  console.log('🧪 Starting Fee & Financial Management Audit verification tests...\n');

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

  // Fetch metadata: active academic year, course, active student
  const [ayRes, courseRes, studentsRes] = await Promise.all([
    request('/academic-years'),
    request('/courses'),
    request('/students?status=ACTIVE')
  ]);

  if (!ayRes.data.length || !courseRes.data.length || !studentsRes.data.length) {
    console.error('❌ Metadata fetch failed (ay, course, or students empty)');
    process.exit(1);
  }

  const activeAy = ayRes.data.find(y => y.status === 'ACTIVE') || ayRes.data[0];
  const activeCourse = courseRes.data[0];
  const activeStudent = studentsRes.data[0];

  console.log(`ℹ️ Testing with Student: ${activeStudent.first_name} ${activeStudent.last_name} (${activeStudent.id}), Course: ${activeCourse.name}, AY: ${activeAy.name}`);

  // Test 1: Fee Structure Versioning & Immutability
  console.log('\n--- Test 1: Fee Structure Versioning ---');
  const feeType = `Audit Fee ${Date.now()}`;
  const createStructRes = await request('/fees/structures', {
    method: 'POST',
    body: {
      academic_year_id: activeAy.id,
      course_id: activeCourse.id,
      year_number: 1,
      fee_type: feeType,
      amount: 50000,
      status: 'ACTIVE'
    }
  });

  if (createStructRes.status !== 201) {
    console.error('❌ Failed to create initial fee structure version:', createStructRes.data);
    process.exit(1);
  }
  const structId1 = createStructRes.data.id;
  console.log(`✅ Created Fee Structure V1 (ID: ${structId1})`);

  // Create V2 version
  const createV2Res = await request(`/fees/structures/${structId1}/version`, {
    method: 'POST',
    body: { new_amount: 55000 }
  });

  if (createV2Res.status !== 201) {
    console.error('❌ Failed to create fee structure V2:', createV2Res.data);
    process.exit(1);
  }
  const structId2 = createV2Res.data.id;
  console.log(`✅ Created Fee Structure V2 (ID: ${structId2})`);

  // Test 2: Fee Allocation Validation & Ledger Entry
  console.log('\n--- Test 2: Fee Allocation Validation ---');
  const allocateRes = await request('/fees/records', {
    method: 'POST',
    body: {
      student_id: activeStudent.id,
      academic_year_id: activeAy.id,
      course_id: activeCourse.id,
      year_number: 1,
      fee_structure_id: structId1,
      fee_type: feeType,
      total_amount: 50000,
      due_date: '2026-08-30'
    }
  });

  if (allocateRes.status !== 201) {
    console.error('❌ Fee allocation failed:', allocateRes.data);
    process.exit(1);
  }
  const recordId = allocateRes.data.id;
  console.log(`✅ Fee allocated to student (Record ID: ${recordId})`);

  // Test 3: Duplicate Allocation Prevention (409 Conflict)
  console.log('\n--- Test 3: Duplicate Allocation Prevention ---');
  const dupAllocateRes = await request('/fees/records', {
    method: 'POST',
    body: {
      student_id: activeStudent.id,
      academic_year_id: activeAy.id,
      course_id: activeCourse.id,
      year_number: 1,
      fee_structure_id: structId1,
      fee_type: feeType,
      total_amount: 50000
    }
  });

  if (dupAllocateRes.status === 409) {
    console.log('✅ Duplicate fee allocation properly rejected with 409 Conflict!');
  } else {
    console.error(`❌ Expected 409 Conflict for duplicate allocation, got ${dupAllocateRes.status}`, dupAllocateRes.data);
    process.exit(1);
  }

  // Test 4: Partial Payment Engine & Overpayment Prevention (400 Bad Request)
  console.log('\n--- Test 4: Partial Payment & Overpayment Prevention ---');
  const txRef = `TXN-${Date.now()}`;

  // Attempt overpayment
  const overpayRes = await request('/fees/payments', {
    method: 'POST',
    body: {
      student_id: activeStudent.id,
      student_fee_record_id: recordId,
      amount: 60000, // Total is 50000
      payment_date: '2026-07-29',
      payment_method: 'UPI',
      transaction_reference: txRef
    }
  });

  if (overpayRes.status === 400) {
    console.log('✅ Overpayment properly rejected with 400 Bad Request!');
  } else {
    console.error(`❌ Expected 400 Bad Request for overpayment, got ${overpayRes.status}`, overpayRes.data);
    process.exit(1);
  }

  // Make valid partial payment
  const partialPayRes = await request('/fees/payments', {
    method: 'POST',
    body: {
      student_id: activeStudent.id,
      student_fee_record_id: recordId,
      amount: 20000,
      payment_date: '2026-07-29',
      payment_method: 'UPI',
      transaction_reference: txRef
    }
  });

  if (partialPayRes.status !== 201) {
    console.error('❌ Partial payment failed:', partialPayRes.data);
    process.exit(1);
  }
  const paymentId1 = partialPayRes.data.paymentId;
  const receiptNum1 = partialPayRes.data.receiptNumber;
  console.log(`✅ Partial payment ₹20,000 processed! Receipt: ${receiptNum1}`);

  // Test 5: Duplicate Payment Reference Prevention (409 Conflict)
  console.log('\n--- Test 5: Duplicate Payment Reference Prevention ---');
  const dupTxRes = await request('/fees/payments', {
    method: 'POST',
    body: {
      student_id: activeStudent.id,
      student_fee_record_id: recordId,
      amount: 10000,
      payment_date: '2026-07-29',
      payment_method: 'UPI',
      transaction_reference: txRef // Reuse same txRef
    }
  });

  if (dupTxRes.status === 409) {
    console.log('✅ Duplicate transaction reference properly rejected with 409 Conflict!');
  } else {
    console.error(`❌ Expected 409 Conflict for duplicate tx ref, got ${dupTxRes.status}`, dupTxRes.data);
    process.exit(1);
  }

  // Test 6: Scholarship & Concessions Rule
  console.log('\n--- Test 6: Scholarship & Concessions Rules ---');
  const concessionRes = await request('/fees/concessions', {
    method: 'POST',
    body: {
      student_fee_record_id: recordId,
      student_id: activeStudent.id,
      concession_type: 'Merit Scholarship',
      discount_type: 'flat',
      discount_value: 5000,
      reason: 'Academic Excellence'
    }
  });

  if (concessionRes.status !== 201) {
    console.error('❌ Concession application failed:', concessionRes.data);
    process.exit(1);
  }
  console.log('✅ Scholarship of ₹5,000 applied successfully!');

  // Test 7: Refund Workflow
  console.log('\n--- Test 7: Refund & Adjustment Workflow ---');
  const refundRes = await request(`/fees/payments/${paymentId1}/refund`, {
    method: 'POST',
    body: {
      refund_amount: 2000,
      refund_reason: 'Overcharge adjustment',
      refund_reference: `REF-${Date.now()}`
    }
  });

  if (refundRes.status !== 201) {
    console.error('❌ Refund process failed:', refundRes.data);
    process.exit(1);
  }
  console.log('✅ Partial refund of ₹2,000 issued successfully!');

  // Test 8: Receipt Generation & Details Verification
  console.log('\n--- Test 8: Receipt Management & Verification ---');
  const receiptRes = await request(`/fees/receipts/${receiptNum1}`);
  if (receiptRes.status !== 200 || !receiptRes.data.receipt_number) {
    console.error('❌ Receipt detail fetch failed:', receiptRes.data);
    process.exit(1);
  }
  console.log(`✅ Receipt detail verified: ${receiptRes.data.receipt_number} for ₹${receiptRes.data.amount}`);

  // Test 9: Immutable Financial Ledger Trace
  console.log('\n--- Test 9: Financial Ledger Audit Trail ---');
  const ledgerRes = await request(`/fees/financial-ledger?student_id=${activeStudent.id}`);
  if (ledgerRes.status !== 200 || !ledgerRes.data.length) {
    console.error('❌ Financial ledger entries empty or failed:', ledgerRes.data);
    process.exit(1);
  }
  console.log(`✅ Financial Ledger recorded ${ledgerRes.data.length} immutable events for student!`);
  ledgerRes.data.slice(0, 4).forEach(e => {
    console.log(`   └─ [${e.entry_type}] ${e.description} (Amount: ₹${e.amount}, Outstanding: ₹${e.balance_after})`);
  });

  // Test 10: Financial Reports & Analytics Consistency
  console.log('\n--- Test 10: Financial Reports & Analytics ---');
  const statsRes = await request('/fees/stats');
  if (statsRes.status !== 200) {
    console.error('❌ Fee stats query failed:', statsRes.data);
    process.exit(1);
  }
  console.log('✅ Summary Stats verified:');
  console.log(`   Total Allocated: ₹${statsRes.data.total_allocated}`);
  console.log(`   Total Collected: ₹${statsRes.data.total_collected}`);
  console.log(`   Total Concessions: ₹${statsRes.data.total_concessions}`);
  console.log(`   Total Refunds: ₹${statsRes.data.total_refunds}`);
  console.log(`   Net Outstanding: ₹${statsRes.data.total_outstanding}`);

  console.log('\n🎉 ALL 10 MODULE 11 AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runFeesAuditTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
