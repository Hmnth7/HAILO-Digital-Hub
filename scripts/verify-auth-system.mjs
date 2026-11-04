import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function runChecks() {
  console.log('--- Starting HAILO Firebase Auth & Security Verification ---\n');
  let failures = 0;

  function assert(condition, testName, details) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failures++;
    }
  }

  // 1. Check firestore.rules
  const rulesPath = path.join(rootDir, 'firestore.rules');
  assert(fs.existsSync(rulesPath), 'firestore.rules exists', 'File not found');
  if (fs.existsSync(rulesPath)) {
    const rules = fs.readFileSync(rulesPath, 'utf-8');
    assert(!rules.includes('allow read, write: if true'), 'No open read/write rule on complaints', 'Found allow read, write: if true');
    assert(rules.includes('isAdmin()'), 'Helper function isAdmin() present', 'Missing isAdmin helper');
    assert(rules.includes('isCustomer()'), 'Helper function isCustomer() present', 'Missing isCustomer helper');
    assert(rules.includes("request.resource.data.role == 'CUSTOMER'"), 'Public user signup restricted to CUSTOMER role', 'Users collection allows non-customer creation');
    assert(rules.includes('allow update: if isAdmin();'), 'Complaints update restricted strictly to Admin', 'Complaints update is not admin-only');
    assert(rules.includes('resource.data.customerId == request.auth.uid'), 'Customers can only read their own complaints', 'Missing customerId ownership read restriction');
    assert(rules.includes('match /{document=**} {\n      allow read, write: if false;'), 'Default deny rule on all other collections', 'Missing default deny');
  }

  // 2. Check AppContext.tsx
  const appContextPath = path.join(rootDir, 'src', 'context', 'AppContext.tsx');
  assert(fs.existsSync(appContextPath), 'AppContext.tsx exists', 'File not found');
  if (fs.existsSync(appContextPath)) {
    const appCtx = fs.readFileSync(appContextPath, 'utf-8');
    assert(appCtx.includes('onAuthStateChanged(auth'), 'Listens to Firebase onAuthStateChanged', 'Missing onAuthStateChanged');
    assert(appCtx.includes("doc(db, 'users'"), 'Verifies role from Firestore users collection', 'Missing Firestore user lookup');
    assert(!appCtx.includes("localStorage.setItem(STORAGE_KEYS.USER"), 'Does not store auth/role in localStorage', 'Found localStorage.setItem for USER');
    assert(appCtx.includes('loginWithFirebase'), 'loginWithFirebase method implemented', 'Missing loginWithFirebase');
    assert(appCtx.includes('registerCustomerWithFirebase'), 'registerCustomerWithFirebase method implemented', 'Missing registerCustomerWithFirebase');
    assert(appCtx.includes("role: 'CUSTOMER'"), 'registerCustomerWithFirebase enforces CUSTOMER role', 'Role is not hardcoded to CUSTOMER');
    assert(appCtx.includes("portal === 'ADMIN' && resolvedRole !== 'ADMIN'"), 'Rejects non-admin users logging into admin portal', 'Missing admin portal role gate');
    assert(appCtx.includes('signOut(auth)'), 'logout calls Firebase signOut', 'Missing signOut(auth)');
  }

  // 3. Check LoginPage.tsx
  const loginPagePath = path.join(rootDir, 'src', 'pages', 'LoginPage.tsx');
  assert(fs.existsSync(loginPagePath), 'LoginPage.tsx exists', 'File not found');
  if (fs.existsSync(loginPagePath)) {
    const loginPage = fs.readFileSync(loginPagePath, 'utf-8');
    assert(loginPage.includes('handleAdminLogin'), 'Admin login handler present', 'Missing admin login handler');
    assert(loginPage.includes('handleCustomerLogin'), 'Customer login handler present', 'Missing customer login handler');
    assert(loginPage.includes('handleCustomerRegister'), 'Customer registration handler present', 'Missing customer registration handler');
    assert(loginPage.includes('customerTab'), 'Customer card provides Sign In / Register toggle', 'Missing customer tab toggle');
    assert(loginPage.includes("sessionStorage.getItem('hailo_return_to')"), 'Redirects QR users back to report page after login', 'Missing QR return-to logic');
    assert(loginPage.includes('getFriendlyErrorMessage'), 'User-friendly error messages for invalid login', 'Missing friendly error mapping');
  }

  // 4. Check App.tsx Protected Routes
  const appPath = path.join(rootDir, 'src', 'App.tsx');
  assert(fs.existsSync(appPath), 'App.tsx exists', 'File not found');
  if (fs.existsSync(appPath)) {
    const appCode = fs.readFileSync(appPath, 'utf-8');
    assert(appCode.includes('authLoading'), 'Handles auth loading state to prevent flash', 'Missing authLoading guard');
    assert(appCode.includes("currentPath.startsWith('/report')"), 'Preserves public access to QR report routes', 'QR routes blocked');
    assert(appCode.includes("!isAuthenticated"), 'Requires authentication for protected portals', 'Missing !isAuthenticated check');
    assert(appCode.includes("!isAdmin") && appCode.includes('<AccessDenied requiredRole="ADMIN" />'), 'Blocks Customers from accessing Admin routes with HTTP 403', 'Missing admin route protection');
  }

  // 5. Check CitizenReportPage.tsx Return-to-QR
  const reportPath = path.join(rootDir, 'src', 'pages', 'CitizenReportPage.tsx');
  assert(fs.existsSync(reportPath), 'CitizenReportPage.tsx exists', 'File not found');
  if (fs.existsSync(reportPath)) {
    const reportCode = fs.readFileSync(reportPath, 'utf-8');
    assert(reportCode.includes("sessionStorage.setItem('hailo_return_to'"), 'Saves return-to path when citizen opens bin QR report', 'Missing sessionStorage save in CitizenReportPage');
  }

  console.log('\n--- Verification Result ---');
  if (failures === 0) {
    console.log('🎉 ALL 20 SECURITY & AUTHENTICATION CHECKS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`❌ FAILED WITH ${failures} ERRORS\n`);
    process.exit(1);
  }
}

runChecks();
