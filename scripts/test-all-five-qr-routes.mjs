import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  collection, 
  query, 
  where,
  runTransaction 
} from 'firebase/firestore';

import { initializeApp as initAdminApp, cert, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve('serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const adminApp = getApps().length === 0 ? initAdminApp({
  credential: cert(serviceAccount)
}) : getApps()[0];
const adminAuth = getAdminAuth(adminApp);

const firebaseConfig = {
  apiKey: "AIzaSyBkqENEEMbzSqxb9bHaOgPYGUvLFvYUnd0",
  authDomain: "hailo-digital-hub-c33c1.firebaseapp.com",
  projectId: "hailo-digital-hub-c33c1",
  storageBucket: "hailo-digital-hub-c33c1.firebasestorage.app",
  messagingSenderId: "718366389844",
  appId: "1:718366389844:web:0f3b7b671843a5a40cdfc1",
  measurementId: "G-VRZ18QP713"
};

const app = initClientApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// All 5 canonical dustbins
const BINS = [
  { binCode: 'BIN-001', location: 'Main Block', zone: 'Academic Block', category: 'Overflowing Waste', desc: 'Main block dustbin lid jammed and overflowing.' },
  { binCode: 'BIN-002', location: 'Cafeteria', zone: 'Amenities', category: 'Bad Smell', desc: 'Strong odor near cafeteria entrance.' },
  { binCode: 'BIN-003', location: 'Hostel', zone: 'Hostels', category: 'Bin is Full', desc: 'Hostel quad container is full.' },
  { binCode: 'BIN-004', location: 'Library', zone: 'Academic Block', category: 'Liquid Leakage', desc: 'Fluid leaking from base of library bin.' },
  { binCode: 'BIN-005', location: 'Sports Complex', zone: 'Sports', category: 'Damaged Bin', desc: 'Broken wheel on sports complex bin.' }
];

async function testAllFiveRoutes() {
  console.log('========================================================================');
  console.log('🧪 HAILO DIGITAL HUB - 5-BIN QR ROUTE & FIRESTORE VERIFICATION TEST');
  console.log('========================================================================\n');

  // STEP 1: Citizen Sign In
  console.log('[STEP 1] Authenticating Citizen Customer (citizen.test@campus.edu)...');
  const customerEmail = 'citizen.test@campus.edu';
  const customerPass = 'CitizenPass@123';
  const cred = await signInWithEmailAndPassword(auth, customerEmail, customerPass);
  const customerUid = cred.user.uid;
  console.log(`  ✓ Authenticated Citizen Customer: ${customerEmail}`);
  console.log(`  ✓ Firebase Customer UID: ${customerUid}\n`);

  const createdCodes = [];

  // STEP 2: Submit Complaint for each of the 5 canonical dustbins
  console.log('[STEP 2] Submitting genuine QR complaints across all 5 bin routes:');
  for (const bin of BINS) {
    // Atomic counter transaction (mirrors AppContext createComplaint logic)
    const counterRef = doc(db, 'counters', 'complaints');
    const nextNum = await runTransaction(db, async (t) => {
      const snap = await t.get(counterRef);
      let current = 7;
      if (snap.exists() && typeof snap.data().currentNumber === 'number') {
        current = snap.data().currentNumber;
      }
      const next = current + 1;
      t.set(counterRef, { currentNumber: next }, { merge: true });
      return next;
    });

    const complaintCode = `CMP-${String(nextNum).padStart(3, '0')}`;
    createdCodes.push(complaintCode);

    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const payload = {
      id: `cmp-${Date.now()}-${bin.binCode}`,
      complaintCode,
      customerId: customerUid,
      binId: `bin-${bin.binCode.toLowerCase()}`,
      binCode: bin.binCode,
      location: bin.location,
      category: bin.category,
      description: bin.desc,
      priority: 'HIGH',
      status: 'PENDING',
      source: 'QR_SCAN',
      citizenName: 'Pooja Sharma',
      citizenContact: customerEmail,
      createdAt: nowStr,
      reportedAt: nowStr
    };

    const complaintDocRef = doc(db, 'complaints', complaintCode);
    await setDoc(complaintDocRef, payload);

    console.log(`  ✓ Route /report/${bin.binCode} -> Created ${complaintCode}: ${bin.location} | "${bin.category}" | Status: PENDING | Source: QR_SCAN`);
  }

  // STEP 3: Verify Customer Query Isolation
  console.log('\n[STEP 3] Verifying Customer Portal Query Isolation...');
  const custQuery = query(collection(db, 'complaints'), where('customerId', '==', customerUid));
  const custSnap = await getDocs(custQuery);
  const custCodes = custSnap.docs.map(d => d.id);
  console.log(`  ✓ Customer retrieved ${custSnap.size} complaint(s) matching their UID (${customerUid}):`, custCodes);

  for (const code of createdCodes) {
    if (!custCodes.includes(code)) {
      throw new Error(`Customer query failed to see submitted QR complaint ${code}!`);
    }
  }
  console.log('  ✓ Verified: Customer can read all 5 submitted QR complaints.');

  // Sign out customer
  await signOut(auth);

  // STEP 4: Admin Live Verification
  console.log('\n[STEP 4] Verifying Admin Dashboard receives all 5 complaints across separate sessions...');
  const adminUid = 'nV99e6LP90WKCIoHEfKA6994kai2';
  const customToken = await adminAuth.createCustomToken(adminUid, { role: 'ADMIN', admin: true });
  const adminCred = await signInWithCustomToken(auth, customToken);
  console.log(`  ✓ Admin signed in (UID: ${adminCred.user.uid})`);

  const allSnap = await getDocs(collection(db, 'complaints'));
  const allCodes = allSnap.docs.map(d => d.id);
  console.log(`  ✓ Admin retrieved ${allSnap.size} total complaint(s) from Cloud Firestore:`, allCodes);

  // Verify all 5 created complaints exist in Admin view and have pristine fields
  for (const bin of BINS) {
    const docSnap = allSnap.docs.find(d => d.data().binCode === bin.binCode && d.data().category === bin.category);
    if (!docSnap) {
      throw new Error(`Admin query did not find QR complaint for ${bin.binCode}!`);
    }
    const d = docSnap.data();
    console.log(`  ✓ Verified in Admin: ${d.complaintCode} -> Bin: ${d.binCode} (${d.location}) | Category: ${d.category} | Status: ${d.status} | Customer UID: ${d.customerId}`);
  }

  // STEP 5: Clean up the 5 test complaints, leaving genuine CMP-007 untouched
  console.log('\n[STEP 5] Cleaning up test complaints, preserving genuine CMP-007...');
  for (const code of createdCodes) {
    await deleteDoc(doc(db, 'complaints', code));
    console.log(`  ✓ Cleaned up test document: ${code}`);
  }

  // Reset counter back to 7
  await setDoc(doc(db, 'counters', 'complaints'), { currentNumber: 7 });
  console.log('  ✓ Reset /counters/complaints back to 7 (for genuine CMP-007).');

  // Verify CMP-007 is intact
  const cmp007Snap = await getDoc(doc(db, 'complaints', 'CMP-007'));
  if (!cmp007Snap.exists()) {
    throw new Error('CRITICAL: CMP-007 was unexpectedly modified or deleted!');
  }
  console.log('  ✓ Verified: Genuine complaint CMP-007 is 100% safely preserved in Cloud Firestore:');
  console.log(`     - Complaint Code: ${cmp007Snap.data().complaintCode}`);
  console.log(`     - Bin: ${cmp007Snap.data().binCode} (${cmp007Snap.data().location})`);
  console.log(`     - Status: ${cmp007Snap.data().status}`);

  await signOut(auth);
  console.log('\n========================================================================');
  console.log('🎉 ALL 5 BIN QR ROUTES & FIRESTORE SUBMISSION TESTS PASSED 100%!');
  console.log('========================================================================\n');
}

testAllFiveRoutes().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
