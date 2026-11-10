import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'college_super_secret_jwt_key_2026_xyz987';

async function runPenetrationTests() {
  console.log('========================================================');
  console.log(' RUNNING PENETRATION & DATA INTEGRITY SECURITY TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Test Security Headers
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(
      'Security Header X-Content-Type-Options is nosniff',
      res.headers.get('x-content-type-options') === 'nosniff'
    );
    assert(
      'Security Header X-Frame-Options is SAMEORIGIN',
      res.headers.get('x-frame-options') === 'SAMEORIGIN'
    );
    assert(
      'Security Header X-XSS-Protection is enabled',
      res.headers.get('x-xss-protection') === '1; mode=block'
    );
    assert(
      'Server fingerprint X-Powered-By is hidden/suppressed',
      res.headers.get('x-powered-by') === null
    );
    assert(
      'Rate-limiting headers (ratelimit-limit / ratelimit-remaining) are returned',
      res.headers.has('ratelimit-limit') || res.headers.has('ratelimit-remaining')
    );
  } catch (err: any) {
    assert('Security Headers Check', false, err.message);
  }

  // 2. Test Unauthenticated Access to Admin Routes
  try {
    const res = await fetch(`${BASE_URL}/api/admin/students`);
    assert(
      'Unauthenticated request to /api/admin/students returns 401',
      res.status === 401
    );
  } catch (err: any) {
    assert('Unauthenticated access check', false, err.message);
  }

  // 3. Test Student Role attempting to access Admin API (Privilege Escalation / Auth Bypass)
  const studentToken = jwt.sign(
    { userId: 'fake-student-id-123', email: 'student@example.com', role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    const res = await fetch(`${BASE_URL}/api/admin/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      'Student role attempting /api/admin/students returns 403 Forbidden',
      res.status === 403
    );
  } catch (err: any) {
    assert('Student role privilege escalation check', false, err.message);
  }

  // 4. Test Student Role attempting to trigger AI Verification
  try {
    const res = await fetch(`${BASE_URL}/api/admin/students/24BCA0002/ai-verify`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      'Student role attempting /api/admin/students/:id/ai-verify returns 403 Forbidden',
      res.status === 403
    );
  } catch (err: any) {
    assert('Student role AI verify check', false, err.message);
  }

  // 5. Test Student Role attempting to approve/verify student
  try {
    const res = await fetch(`${BASE_URL}/api/admin/students/24BCA0002/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      'Student role attempting /api/admin/students/:id/verify returns 403 Forbidden',
      res.status === 403
    );
  } catch (err: any) {
    assert('Student role approve student check', false, err.message);
  }

  // 6. Test Admin Token can access AI Verification
  const adminToken = jwt.sign(
    { userId: 'admin-id-test', email: 'admin@bpc.edu', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    console.log('\n  [Testing Admin AI Verification Endpoint with Caching]...');
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/api/admin/students/24BCA0002/ai-verify`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const elapsed = Date.now() - t0;
    assert(
      'Admin role calling /api/admin/students/:id/ai-verify returns 200 OK',
      res.status === 200
    );
    assert(
      'AI Audit returned valid integrity score',
      typeof data.overallMatchScore === 'number' && data.overallMatchScore >= 0 && data.overallMatchScore <= 100
    );
    assert(
      'AI Audit returned fieldResults array',
      Array.isArray(data.fieldResults) && data.fieldResults.length > 0
    );
    console.log(`    -> AI Verification response returned in ${elapsed}ms, score: ${data.overallMatchScore}%`);
  } catch (err: any) {
    assert('Admin AI verification check', false, err.message);
  }

  // 7. Test Directory Traversal Prevention on /uploads
  try {
    const res = await fetch(`${BASE_URL}/uploads/../../.env`);
    assert(
      'Path traversal attempt /uploads/../../.env is blocked (returns 404 or 403)',
      res.status === 404 || res.status === 403
    );
  } catch (err: any) {
    assert('Path traversal check', false, err.message);
  }

  console.log('\n========================================================');
  console.log(` SECURITY TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPenetrationTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
