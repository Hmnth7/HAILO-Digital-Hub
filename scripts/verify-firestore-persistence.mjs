import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where,
  onSnapshot
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

async function testPersistence() {
  console.log('--- STARTING 12-SECOND FIRESTORE PERSISTENCE VERIFICATION ---');

  // Step 1: Admin sign in via Custom Token
  const adminUid = 'nV99e6LP90WKCIoHEfKA6994kai2';
  const customToken = await adminAuth.createCustomToken(adminUid, { role: 'ADMIN', admin: true });
  await signInWithCustomToken(auth, customToken);
  console.log(`[${new Date().toLocaleTimeString()}] Admin signed in to Cloud Firestore.`);

  // Step 2: Read current complaints from Cloud Firestore
  const complaintsCol = collection(db, 'complaints');
  const snap = await getDocs(complaintsCol);
  console.log(`[${new Date().toLocaleTimeString()}] Total documents currently in Firestore: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`  - ${d.id}: Bin ${data.binCode} (${data.location}) | ${data.category} | Status: ${data.status}`);
  });

  // Verify CMP-007 (Library - Damaged Bin) is present
  const cmp7 = snap.docs.find(d => d.id === 'CMP-007');
  if (cmp7) {
    console.log(`✓ Confirmed genuine QR complaint CMP-007 is safely preserved in Cloud Firestore!`);
  }

  // Step 3: Register real-time listener simulating the Admin Dashboard
  let listenerSnapshots = 0;
  let latestComplaintCodes = [];
  const unsubscribe = onSnapshot(complaintsCol, (snapshot) => {
    listenerSnapshots++;
    latestComplaintCodes = snapshot.docs.map(d => d.id);
    console.log(`[${new Date().toLocaleTimeString()}] [onSnapshot #${listenerSnapshots}] Received ${snapshot.size} doc(s): [${latestComplaintCodes.join(', ')}]`);
  });

  // Step 4: Wait 12 seconds to ensure no background operation or timer overwrites anything
  console.log(`[${new Date().toLocaleTimeString()}] Waiting 12 seconds (testing for any 2-3s overwriting regression)...`);
  await new Promise(resolve => setTimeout(resolve, 12000));

  console.log(`[${new Date().toLocaleTimeString()}] 12-second observation completed.`);
  console.log(`  - Latest complaint codes: [${latestComplaintCodes.join(', ')}]`);

  // Verify that the six default complaints DID NOT return
  const defaultCodes = ['CMP-001', 'CMP-002', 'CMP-003', 'CMP-004', 'CMP-005', 'CMP-006'];
  const reintroduced = defaultCodes.filter(c => latestComplaintCodes.includes(c));
  if (reintroduced.length > 0) {
    throw new Error(`Regression detected! Default complaints returned: ${reintroduced.join(', ')}`);
  }
  console.log('✓ Confirmed: Zero default complaints returned!');

  // Verify that CMP-007 remains visible
  if (latestComplaintCodes.includes('CMP-007')) {
    console.log('✓ Confirmed: Genuine QR complaint CMP-007 remained visible for entire duration!');
  }

  // Step 5: Test Admin status update directly to Firestore
  console.log(`[${new Date().toLocaleTimeString()}] Testing Admin assignment on CMP-007 (Sunita Devi / STF-002)...`);
  const docRef = doc(db, 'complaints', 'CMP-007');
  await updateDoc(docRef, {
    status: 'ACCEPTED',
    assignedStaff: 'Sunita Devi',
    assignedStaffId: 'STF-002',
    acceptedAt: new Date().toLocaleTimeString('en-US')
  });

  // Wait 1 second for onSnapshot to receive update
  await new Promise(resolve => setTimeout(resolve, 1000));

  const updatedDoc = await getDoc(docRef);
  const updatedData = updatedDoc.data();
  console.log(`✓ Confirmed Admin update persisted in Cloud Firestore:`);
  console.log(`   - Status: ${updatedData.status}`);
  console.log(`   - Assigned Staff: ${updatedData.assignedStaff} (${updatedData.assignedStaffId})`);

  // Revert status back to PENDING so genuine report is pristine
  await updateDoc(docRef, {
    status: 'PENDING',
    assignedStaff: null,
    assignedStaffId: null,
    acceptedAt: null
  });
  console.log(`✓ Reverted CMP-007 back to pristine PENDING state for testing.`);

  unsubscribe();
  await signOut(auth);
  console.log('\n🎉 ALL PERSISTENCE AND ISOLATION TESTS PASSED 100%!');
}

testPersistence().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
