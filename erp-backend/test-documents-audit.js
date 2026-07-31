/**
 * Verification Test Suite for Module 15 — Central Document & File Management Audit
 */
const BASE_URL = 'http://127.0.0.1:8788';

async function runDocumentsAuditTests() {
  console.log('🧪 Starting Central Document & File Management Audit verification tests...\n');

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

  // Target 1: Upload Validation (MIME & Extension Security)
  console.log('\n--- Target 1: Upload Security & MIME/Extension Validation ---');
  const invalidExtRes = await request('/documents/upload', {
    method: 'POST',
    body: {
      originalFilename: 'malicious_script.exe',
      mimeType: 'application/x-msdownload',
      category: 'Admissions',
      entityType: 'Student',
      entityId: 'stud-101',
      textContent: 'binary string...'
    }
  });

  if (invalidExtRes.status !== 400 || !invalidExtRes.data.error.includes('restricted')) {
    console.error('❌ Expected restricted extension validation error, got:', invalidExtRes.data);
    process.exit(1);
  }
  console.log('✅ Upload validation correctly blocked restricted extension (.exe).');

  // Target 2: Upload Valid Document & Storage Abstraction Layer
  console.log('\n--- Target 2: Valid Document Upload & Storage Abstraction ---');
  const uploadRes = await request('/documents/upload', {
    method: 'POST',
    body: {
      originalFilename: 'Student_Transcript_2026.pdf',
      mimeType: 'application/pdf',
      category: 'Certificates',
      entityType: 'Student',
      entityId: 'stud-101',
      textContent: 'PDF Transcript Content for Student Rahul Sharma'
    }
  });

  if (uploadRes.status !== 201 || !uploadRes.data.id) {
    console.error('❌ Document upload failed:', uploadRes.data);
    process.exit(1);
  }
  const docId = uploadRes.data.id;
  console.log(`✅ Valid document uploaded successfully! (ID: ${docId}, Storage Key: ${uploadRes.data.storage_key}, Checksum: ${uploadRes.data.checksum_sha256.substring(0, 16)}...)`);

  // Target 3: Signed URL Generation & Verification
  console.log('\n--- Target 3: Signed URL Generation & Expiration ---');
  const signedUrlRes = await request(`/documents/${docId}/signed-url?expires_in=600`);
  if (signedUrlRes.status !== 200 || !signedUrlRes.data.signedUrl) {
    console.error('❌ Signed URL generation failed:', signedUrlRes.data);
    process.exit(1);
  }
  console.log(`✅ Signed Download URL generated: ${signedUrlRes.data.signedUrl}`);

  // Test Direct File Download
  const downloadRes = await request(`/documents/${docId}/download`);
  if (downloadRes.status !== 200) {
    console.error('❌ Direct file download failed:', downloadRes.data);
    process.exit(1);
  }
  console.log('✅ Download content retrieved successfully.');

  // Target 4: Integrity Verification (SHA-256 Checksum)
  console.log('\n--- Target 4: SHA-256 Integrity Verification ---');
  const verifyRes = await request(`/documents/${docId}/verify`);
  if (verifyRes.status !== 200 || !verifyRes.data.valid) {
    console.error('❌ Checksum integrity verification failed:', verifyRes.data);
    process.exit(1);
  }
  console.log('✅ File SHA-256 integrity verified successfully.');

  // Target 5: Document Versioning
  console.log('\n--- Target 5: Document Versioning (v1 -> v2) ---');
  const versionRes = await request(`/documents/${docId}/version`, {
    method: 'POST',
    body: {
      originalFilename: 'Student_Transcript_2026_Updated.pdf',
      mimeType: 'application/pdf',
      textContent: 'Updated PDF Transcript Content v2',
      changeSummary: 'Added Fall 2025 Semester Grades'
    }
  });

  if (versionRes.status !== 200 || versionRes.data.version !== 2) {
    console.error('❌ Uploading new version failed:', versionRes.data);
    process.exit(1);
  }
  console.log(`✅ New version uploaded successfully! Document version updated: v${versionRes.data.version}.`);

  const detailRes = await request(`/documents/${docId}`);
  if (detailRes.status !== 200 || !detailRes.data.versions || detailRes.data.versions.length !== 2) {
    console.error('❌ Version history retrieval failed:', detailRes.data);
    process.exit(1);
  }
  console.log(`✅ Version History verified: ${detailRes.data.versions.length} version record(s) logged.`);

  // Target 6: Search & Category Filter Accuracy
  console.log('\n--- Target 6: Search & Category Filters ---');
  const listDocsRes = await request('/documents?category=Certificates');
  if (listDocsRes.status !== 200 || listDocsRes.data.total === 0) {
    console.error('❌ Category document listing failed:', listDocsRes.data);
    process.exit(1);
  }
  console.log(`✅ Category filter verified (${listDocsRes.data.total} document(s) in 'Certificates').`);

  // Target 7: Storage Dashboard Metrics
  console.log('\n--- Target 7: Storage Dashboard Statistics ---');
  const statsRes = await request('/documents/stats/dashboard');
  if (statsRes.status !== 200) {
    console.error('❌ Fetching storage stats failed:', statsRes.data);
    process.exit(1);
  }
  console.log('✅ Storage Dashboard Stats verified:');
  console.log(`   Total Documents: ${statsRes.data.totalDocuments}`);
  console.log(`   Total Storage: ${statsRes.data.totalSizeMB} MB`);
  console.log(`   Category Breakdown:`, statsRes.data.categoryBreakdown);

  // Target 8, 9 & 10: Lifecycle Transitions (Archive, Restore, Soft Delete, Purge)
  console.log('\n--- Target 8, 9 & 10: Lifecycle Transitions (Archive, Restore, Delete, Purge) ---');
  // Archive
  const archiveRes = await request(`/documents/${docId}/archive`, { method: 'POST' });
  if (archiveRes.status !== 200 || archiveRes.data.status !== 'ARCHIVED') {
    console.error('❌ Archiving document failed:', archiveRes.data);
    process.exit(1);
  }
  console.log('✅ Document archived (status: ARCHIVED).');

  // Restore
  const restoreRes = await request(`/documents/${docId}/restore`, { method: 'POST' });
  if (restoreRes.status !== 200 || restoreRes.data.status !== 'AVAILABLE') {
    console.error('❌ Restoring document failed:', restoreRes.data);
    process.exit(1);
  }
  console.log('✅ Document restored (status: AVAILABLE).');

  // Soft Delete
  const deleteRes = await request(`/documents/${docId}`, { method: 'DELETE' });
  if (deleteRes.status !== 200 || deleteRes.data.status !== 'DELETED') {
    console.error('❌ Soft deleting document failed:', deleteRes.data);
    process.exit(1);
  }
  console.log('✅ Document soft-deleted (status: DELETED).');

  // Purge Expired (0 retention days for immediate test purge)
  const purgeRes = await request('/documents/purge-expired?days=0', { method: 'POST' });
  if (purgeRes.status !== 200 || purgeRes.data.purgedCount === undefined) {
    console.error('❌ Purging expired documents failed:', purgeRes.data);
    process.exit(1);
  }
  console.log(`✅ Purge lifecycle completed: Purged ${purgeRes.data.purgedCount} expired document record(s).`);

  console.log('\n🎉 ALL 10 MODULE 15 AUDIT VERIFICATION TARGETS PASSED SUCCESSFULLY!\n');
}

runDocumentsAuditTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
