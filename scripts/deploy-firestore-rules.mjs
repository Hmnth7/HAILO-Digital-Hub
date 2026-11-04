#!/usr/bin/env node

/**
 * HAILO Digital Hub - Firestore Rules Publisher
 * 
 * Directly publishes local firestore.rules to Firebase Cloud using
 * the Firebase Rules REST API and serviceAccountKey.json.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';

const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ Error: serviceAccountKey.json not found in project root.');
  process.exit(1);
}

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('❌ Error: firestore.rules not found in project root.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || 'hailo-digital-hub-c33c1' })
  : getApp();

const rulesContent = fs.readFileSync(rulesPath, 'utf8');

async function deployRules() {
  console.log('🚀 Publishing firestore.rules to Firebase...');
  try {
    const { access_token } = await app.options.credential.getAccessToken();

    // 1. Create Ruleset
    const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${serviceAccount.project_id}/rulesets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: rulesContent }]
        }
      })
    });

    const createData = await createRes.json();
    if (!createData.name) {
      throw new Error(`Ruleset validation error: ${JSON.stringify(createData, null, 2)}`);
    }

    // 2. Update cloud.firestore release
    const updateRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${serviceAccount.project_id}/releases/cloud.firestore`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        release: {
          name: `projects/${serviceAccount.project_id}/releases/cloud.firestore`,
          rulesetName: createData.name
        }
      })
    });

    const updateData = await updateRes.json();
    if (updateData.error) {
      throw new Error(`Release update error: ${JSON.stringify(updateData.error, null, 2)}`);
    }

    console.log('✅ Successfully published firestore.rules to Firebase Cloud!');
    console.log(`Release: ${updateData.name}`);
    console.log(`Ruleset: ${updateData.rulesetName}`);
  } catch (err) {
    console.error('❌ Rules deployment failed:', err.message || err);
    process.exit(1);
  }
}

deployRules();
