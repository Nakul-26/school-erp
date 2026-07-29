const BASE_URL = 'http://127.0.0.1:8788';
async function debug() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@oxford.edu', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status, 'Token exists:', !!loginData.token);
  const headers = { 'Authorization': `Bearer ${loginData.token}` };

  const ayRes = await fetch(`${BASE_URL}/academic-years`, { headers });
  console.log('AY status:', ayRes.status, 'Count:', (await ayRes.json()).length);

  const courseRes = await fetch(`${BASE_URL}/courses`, { headers });
  console.log('Courses status:', courseRes.status, 'Count:', (await courseRes.json()).length);

  const studentRes = await fetch(`${BASE_URL}/students`, { headers });
  const studentData = await studentRes.json();
  console.log('Students status:', studentRes.status, 'IsArray:', Array.isArray(studentData), 'Count:', Array.isArray(studentData) ? studentData.length : studentData);
}
debug();
