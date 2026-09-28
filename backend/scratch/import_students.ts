import * as xlsx from 'xlsx';
import { randomUUID } from 'crypto';

const API_BASE = 'https://api-jeel.almanshiah.io/api';
// --- CONFIGURE THESE ---
const ADMIN_USERNAME = '???';
const ADMIN_PASSWORD = '???';

async function main() {
  console.log('--- STARTING LIVE IMPORT SCRIPT ---');

  if (ADMIN_USERNAME === '???') {
    console.error('Please configure ADMIN_USERNAME and ADMIN_PASSWORD');
    process.exit(1);
  }

  // 1. Login
  console.log('Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const { accessToken } = await loginRes.json() as any;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` };

  // 2. Get target institute
  console.log('Fetching institutes...');
  const instRes = await fetch(`${API_BASE}/institutes`, { headers });
  const institutes = await instRes.json() as any[];
  const targetInstitute = institutes.find((i: any) => i.name.includes('الدورة الشتوية 2027'));
  if (!targetInstitute) throw new Error('Target institute not found');
  console.log(`Found Institute: ${targetInstitute.name} (ID: ${targetInstitute.id})`);
  const instituteId = targetInstitute.id;

  // 3. Get classes
  console.log('Fetching classes...');
  const classesRes = await fetch(`${API_BASE}/institutes/${instituteId}/classes`, { headers });
  const classes = await classesRes.json() as any[];

  // Create a map for quick lookup
  const classMap = {
    'براعم': classes.find((c: any) => c.name.includes('براعم'))?.id,
    'البشائر 1': classes.find((c: any) => c.name.includes('البشائر 1'))?.id,
    'البشائر 2': classes.find((c: any) => c.name.includes('البشائر 2'))?.id,
    'الثبات': classes.find((c: any) => c.name.includes('الثبات'))?.id,
  };
  console.log('Class mapping:', classMap);

  for (const [name, id] of Object.entries(classMap)) {
    if (!id) console.warn(`WARNING: Class not found for ${name}. It might cause errors.`);
  }

  // 4. Read Excel
  const filePath = String.raw`C:\Users\Administrator\Desktop\طلاب دورة المنشية الشتوية .xlsx`;
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: null });

  console.log(`Found ${rows.length} rows.`);

  let success = 0;
  let errors = 0;

  for (const [index, row] of rows.entries()) {
    if (!row['اسم الطالب']) continue; // skip empty rows

    // Parse names
    const fullName = row['اسم الطالب'].trim().split(' ').filter(Boolean);
    const firstName = fullName[0] || 'مجهول';
    const lastName = fullName.slice(1).join(' ') || 'مجهول';

    // Parse class target
    const grade = row['الصف'];
    let targetClassId = null;
    if (grade) {
      if (grade.includes('أول') || grade.includes('ثاني') || grade.includes('ثالث') || grade.includes('رابع')) targetClassId = classMap['براعم'];
      else if (grade.includes('خامس') || grade.includes('سادس')) targetClassId = classMap['البشائر 1'];
      else if (grade.includes('سابع')) targetClassId = classMap['البشائر 2'];
      else targetClassId = classMap['الثبات']; // 8th and above
    } else {
      // Default fallback if grade is missing
      targetClassId = classMap['الثبات'];
    }

    // Prepare User Payload
    const username = row['Username'] ? row['Username'].toString().trim() : null;
    let password = row['Pass'] ? row['Pass'].toString().trim() : null;
    if (password && password.endsWith('.0')) password = password.slice(0, -2);

    if (!username) {
      console.log(`Skipping row ${index + 2}: No username`);
      continue;
    }

    const payload = {
      role: 'student',
      firstName,
      lastName,
      username,
      password: password || '11111111', // fallback if empty
      gender: 'male', // default
      birthDate: '2010-01-01', // default fallback, we don't have exact date
    };

    try {
      // Create user
      const createRes = await fetch(`${API_BASE}/institutes/${instituteId}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Create user failed: ${err}`);
      }
      const createdUser = await createRes.json() as any;
      const studentId = createdUser.id;

      // Enroll in class
      if (targetClassId) {
        const enrollRes = await fetch(`${API_BASE}/classes/${targetClassId}/students`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ studentId })
        });
        if (!enrollRes.ok) throw new Error(`Enrollment failed: ${await enrollRes.text()}`);
      }

      console.log(`[OK] Inserted ${firstName} ${lastName}`);
      success++;
    } catch (err: any) {
      console.error(`[ERROR] Row ${index + 2} (${firstName}):`, err.message);
      errors++;
    }
  }

  console.log(`\nDONE. Success: ${success}, Errors: ${errors}`);
}

main().catch(console.error);
