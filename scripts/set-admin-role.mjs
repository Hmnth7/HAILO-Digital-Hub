#!/usr/bin/env node

/**
 * HAILO Digital Hub - Admin Role Provisioning Script
 * 
 * Uses Firebase Admin SDK to cryptographically assign custom user claims
 * and Cloud Firestore Admin authorization to a specified Firebase Auth UID.
 * 
 * Compatible with firebase-admin v12 / v13 / v14 modular SDK.
 * 
 * Usage:
 *   node scripts/set-admin-role.mjs <ADMIN_UID>
 * 
 * Example:
 *   node scripts/set-admin-role.mjs 4a9B2c...
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, cert, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const targetUid = process.argv[2] || process.env.ADMIN_UID;

console.log('========================================================================');
console.log('🛡️  HAILO DIGITAL HUB — FIREBASE ADMIN SDK PROVISIONING');
console.log('========================================================================\n');

if (!targetUid || targetUid.trim() === '') {
  console.error('❌ Error: Missing Admin UID.\n');
  console.log('Usage:');
  console.log('  node scripts/set-admin-role.mjs <YOUR_FIREBASE_AUTH_UID>\n');
  console.log('Example:');
  console.log('  node scripts/set-admin-role.mjs 9xK2mP0L8vQ1rT4...\n');
  process.exit(1);
}

const cleanUid = targetUid.trim();

// Locate Service Account Key
const possibleKeyPaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.resolve(process.cwd(), 'serviceAccountKey.json'),
  path.resolve(process.cwd(), 'hailo-serviceAccountKey.json')
].filter(Boolean);

let credential = null;
let foundKeyPath = null;

for (const keyPath of possibleKeyPaths) {
  if (fs.existsSync(keyPath)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      // In modern firebase-admin (v12+ / v14+), cert is exported from firebase-admin/app
      credential = cert(keyData);
      foundKeyPath = keyPath;
      break;
    } catch (e) {
      console.warn(`⚠️  Found key file at ${keyPath} but failed to parse:`, e.message);
    }
  }
}

// Fallback to Application Default Credentials if no file found
if (!credential) {
  try {
    credential = applicationDefault();
    console.log('ℹ️  Using Google Cloud Application Default Credentials (ADC).');
  } catch {
    // Handled below
  }
}

if (!credential) {
  console.error('❌ Error: Firebase Admin credentials not found.\n');
  console.log('To run this trusted provisioning script, you need a Firebase Service Account key:\n');
  console.log('1. Go to Firebase Console:');
  console.log('   https://console.firebase.google.com/project/hailo-digital-hub-c33c1/settings/serviceaccounts/adminsdk');
  console.log('2. Click "Generate new private key" and download the JSON file.');
  console.log('3. Save it in your project root as:');
  console.log(`   ${path.resolve(process.cwd(), 'serviceAccountKey.json')}`);
  console.log('   (Note: serviceAccountKey.json is already ignored by Git for security)\n');
  console.log('4. Re-run:');
  console.log(`   node scripts/set-admin-role.mjs ${cleanUid}\n`);
  process.exit(1);
}

let app;
try {
  app = getApps().length === 0
    ? initializeApp({ credential, projectId: 'hailo-digital-hub-c33c1' })
    : getApp();
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
  process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

async function provisionAdminRole() {
  try {
    console.log(`🔍 Checking Firebase Auth user with UID: ${cleanUid}...`);
    const userRecord = await auth.getUser(cleanUid);

    console.log(`✅ User identified: ${userRecord.email || 'No email'} (${userRecord.displayName || 'No display name'})`);

    // 1. Assign Firebase Custom User Claims (Cryptographically embedded in JWT)
    console.log('\n🔐 Setting Custom User Claims { role: "ADMIN", admin: true }...');
    await auth.setCustomUserClaims(cleanUid, {
      role: 'ADMIN',
      admin: true
    });
    console.log('✅ Custom Claims successfully set on Firebase Auth user.');

    // 2. Synchronize Cloud Firestore role document in /users/{uid}
    console.log(`📄 Updating Cloud Firestore /users/${cleanUid} document...`);
    const userDocRef = db.collection('users').doc(cleanUid);

    await userDocRef.set({
      uid: cleanUid,
      email: userRecord.email || '',
      name: userRecord.displayName || 'Municipal Operations Lead',
      role: 'ADMIN',
      phone: userRecord.phoneNumber || '',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Cloud Firestore user profile updated with role: "ADMIN".');

    console.log('\n========================================================================');
    console.log('🎉 ADMIN ROLE PROVISIONING COMPLETE');
    console.log('========================================================================');
    console.log(`Account Email:   ${userRecord.email}`);
    console.log(`Account UID:     ${cleanUid}`);
    console.log(`Custom Claims:   { role: "ADMIN", admin: true }`);
    console.log(`Firestore Doc:   /users/${cleanUid} (role: "ADMIN")`);
    console.log('\nYou can now sign in at the Admin Portal card in HAILO Digital Hub:');
    console.log('  1. Navigate to: /login');
    console.log('  2. Enter your email and password in the Admin Operations Desk card.');
    console.log('  3. You will have full access to /admin/dashboard and all operational features.\n');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ Error: No user found in Firebase Authentication with UID: "${cleanUid}".`);
      console.error('Please verify that you copied the correct UID from Firebase Console > Authentication > Users.');
    } else {
      console.error('\n❌ Provisioning failed:', error.message || error);
    }
    process.exit(1);
  }
}

provisionAdminRole();
