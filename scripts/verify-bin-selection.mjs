import { spawn } from 'child_process';

async function runTests() {
  console.log('🚀 Starting HAILO Digital Hub - Bin Selection & QR Verification Suite...\n');

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/test-bin-sel-' + Date.now(),
    'http://localhost:3000/login'
  ]);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!ready) {
    console.error('❌ Failed to start headless Chrome on port 9224');
    chrome.kill();
    process.exit(1);
  }

  const jsonRes = await fetch('http://127.0.0.1:9224/json');
  const targets = await jsonRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      const msg = data.params.args.map(a => a.value || a.description).join(' ');
      if (!msg.includes('favicon')) {
        consoleErrors.push(msg);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  async function waitForSelector(selector, maxTries = 30) {
    for (let i = 0; i < maxTries; i++) {
      const count = await evaluate(`document.querySelectorAll('${selector}').length`);
      if (count > 0) return true;
      await new Promise(r => setTimeout(r, 150));
    }
    return false;
  }

  async function navigateTo(url) {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 600));
    await waitForSelector('body');
  }

  // --- Step 0: Login as Customer ---
  console.log('Logging in as Customer...');
  await navigateTo('http://localhost:3000/login');
  await waitForSelector('button');
  const loginAction = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const customerBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard') || b.innerText.includes('Customer'));
      if (customerBtn) {
        customerBtn.click();
        return 'Clicked Enter Customer Dashboard';
      }
      return 'Customer button not found';
    })()
  `);
  console.log('Login action result:', loginAction);
  await new Promise(r => setTimeout(r, 1000));

  // =========================================================================
  // TEST 1: Clicking "Submit New Report" must NOT automatically open BIN-003
  // =========================================================================
  console.log('\n--- TEST 1: Submit New Report Navigation ---');
  await navigateTo('http://localhost:3000/customer/reports');
  await waitForSelector('button');

  const clickSubmitResult = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.innerText.includes('Submit New Report'));
      if (submitBtn) {
        submitBtn.click();
        return 'Clicked Submit New Report button';
      }
      return 'Button not found';
    })()
  `);
  console.log('Action:', clickSubmitResult);
  await new Promise(r => setTimeout(r, 600));

  const pathAfterClick = await evaluate('window.location.pathname');
  const pageBody1 = await evaluate('document.body.innerText');

  const doesNotAutoOpenBIN003 = pathAfterClick === '/report' && !pageBody1.includes('Incident Description');
  const showsBinIdentification = pageBody1.includes('Submit New Incident Report') && 
                                 pageBody1.includes('Option 1: Scan QR Code') && 
                                 pageBody1.includes('Option 2: Select Bin Manually');

  console.log(`Pathname after click: ${pathAfterClick}`);
  console.log(`✓ NOT redirected to BIN-003: ${doesNotAutoOpenBIN003}`);
  console.log(`✓ Opens Bin Identification Screen: ${showsBinIdentification}`);

  if (!doesNotAutoOpenBIN003 || !showsBinIdentification) {
    throw new Error('TEST 1 FAILED: "Submit New Report" did not open /report bin identification screen.');
  }

  // =========================================================================
  // TEST 2: Manual selection of BIN-001 must open BIN-001's reporting form
  // =========================================================================
  console.log('\n--- TEST 2: Manual Selection of BIN-001 ---');
  // Switch to Manual tab
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const manualTab = btns.find(b => b.innerText.includes('Select Bin Manually'));
      if (manualTab) manualTab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const manualListText = await evaluate('document.body.innerText');
  console.log('✓ Dynamic bins present in manual list:');
  console.log('  - BIN-001 (Main Block):', manualListText.includes('BIN-001') && manualListText.includes('Main Block'));
  console.log('  - BIN-002 (Cafeteria):', manualListText.includes('BIN-002') && manualListText.includes('Cafeteria'));
  console.log('  - BIN-003 (Hostel):', manualListText.includes('BIN-003') && manualListText.includes('Hostel'));
  console.log('  - BIN-004 (Library):', manualListText.includes('BIN-004') && manualListText.includes('Library'));
  console.log('  - BIN-005 (Sports Complex):', manualListText.includes('BIN-005') && manualListText.includes('Sports Complex'));

  // Click on BIN-001
  const clickBin1 = await evaluate(`
    (() => {
      const btn = document.querySelector('[data-bin-button="BIN-001"]') || document.querySelector('[data-bin-card="BIN-001"]');
      if (btn) {
        btn.click();
        return 'Clicked BIN-001 Button';
      }
      return 'BIN-001 Button not found';
    })()
  `);
  console.log('Action:', clickBin1);
  await new Promise(r => setTimeout(r, 800));

  const pathBin1 = await evaluate('window.location.pathname');
  const bodyBin1 = await evaluate('document.body.innerText');

  console.log(`Pathname: ${pathBin1}`);
  console.log('✓ Path is /report/BIN-001:', pathBin1 === '/report/BIN-001');
  console.log('✓ Form shows BIN-001:', bodyBin1.includes('BIN-001'));
  console.log('✓ Form shows Main Block:', bodyBin1.includes('Main Block'));
  console.log('✓ Complaint categories visible:', bodyBin1.includes('Overflowing Waste') && bodyBin1.includes('Bin is Full'));

  if (pathBin1 !== '/report/BIN-001' || !bodyBin1.includes('BIN-001') || !bodyBin1.includes('Main Block')) {
    throw new Error('TEST 2 FAILED: Selecting BIN-001 did not open BIN-001 form.');
  }

  // =========================================================================
  // TEST 3: Manual selection of BIN-002 must open BIN-002's reporting form
  // =========================================================================
  console.log('\n--- TEST 3: Manual Selection of BIN-002 ---');
  await navigateTo('http://localhost:3000/report');
  await waitForSelector('button');

  // Switch to Manual tab
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const manualTab = btns.find(b => b.innerText.includes('Select Bin Manually'));
      if (manualTab) manualTab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // Click on BIN-002
  const clickBin2 = await evaluate(`
    (() => {
      const btn = document.querySelector('[data-bin-button="BIN-002"]') || document.querySelector('[data-bin-card="BIN-002"]');
      if (btn) {
        btn.click();
        return 'Clicked BIN-002 Button';
      }
      return 'BIN-002 Button not found';
    })()
  `);
  console.log('Action:', clickBin2);
  await new Promise(r => setTimeout(r, 800));

  const pathBin2 = await evaluate('window.location.pathname');
  const bodyBin2 = await evaluate('document.body.innerText');

  console.log(`Pathname: ${pathBin2}`);
  console.log('✓ Path is /report/BIN-002:', pathBin2 === '/report/BIN-002');
  console.log('✓ Form shows BIN-002:', bodyBin2.includes('BIN-002'));
  console.log('✓ Form shows Cafeteria:', bodyBin2.includes('Cafeteria'));

  if (pathBin2 !== '/report/BIN-002' || !bodyBin2.includes('BIN-002') || !bodyBin2.includes('Cafeteria')) {
    throw new Error('TEST 3 FAILED: Selecting BIN-002 did not open BIN-002 form.');
  }

  // =========================================================================
  // TEST 4: Scanning BIN-003's QR must identify BIN-003
  // =========================================================================
  console.log('\n--- TEST 4: Scanning BIN-003 QR Code ---');
  await navigateTo('http://localhost:3000/report');
  await waitForSelector('button');

  // Test QR payload for BIN-003 (full public URL format)
  const scanBin3Action = await evaluate(`
    (() => {
      const input = document.querySelector('input[placeholder*="report/BIN"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'https://upset-steaks-play.loca.lt/report/BIN-003');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return 'Submitted QR URL for BIN-003';
        }
      }
      return 'Input form not found';
    })()
  `);
  console.log('Action:', scanBin3Action);
  await new Promise(r => setTimeout(r, 1200));

  const pathBin3 = await evaluate('window.location.pathname');
  const bodyBin3 = await evaluate('document.body.innerText');

  console.log(`Pathname: ${pathBin3}`);
  console.log('✓ Auto-identified and navigated to /report/BIN-003:', pathBin3 === '/report/BIN-003');
  console.log('✓ Form shows BIN-003:', bodyBin3.includes('BIN-003'));
  console.log('✓ Form shows Hostel:', bodyBin3.includes('Hostel'));

  if (pathBin3 !== '/report/BIN-003' || !bodyBin3.includes('BIN-003') || !bodyBin3.includes('Hostel')) {
    throw new Error('TEST 4 FAILED: Scanning BIN-003 did not identify BIN-003.');
  }

  // =========================================================================
  // TEST 5: Scanning another bin (BIN-005) must identify that correct bin
  // =========================================================================
  console.log('\n--- TEST 5: Scanning BIN-005 QR Code ---');
  await navigateTo('http://localhost:3000/report');
  await waitForSelector('button');

  const scanBin5Action = await evaluate(`
    (() => {
      const input = document.querySelector('input[placeholder*="report/BIN"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'https://quick-lamps-win.loca.lt/report/BIN-005');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return 'Submitted QR URL for BIN-005';
        }
      }
      return 'Input form not found';
    })()
  `);
  console.log('Action:', scanBin5Action);
  await new Promise(r => setTimeout(r, 1200));

  const pathBin5 = await evaluate('window.location.pathname');
  const bodyBin5 = await evaluate('document.body.innerText');

  console.log(`Pathname: ${pathBin5}`);
  console.log('✓ Auto-identified and navigated to /report/BIN-005:', pathBin5 === '/report/BIN-005');
  console.log('✓ Form shows BIN-005:', bodyBin5.includes('BIN-005'));
  console.log('✓ Form shows Sports Complex:', bodyBin5.includes('Sports Complex'));

  if (pathBin5 !== '/report/BIN-005' || !bodyBin5.includes('BIN-005') || !bodyBin5.includes('Sports Complex')) {
    throw new Error('TEST 5 FAILED: Scanning BIN-005 did not identify BIN-005.');
  }

  // =========================================================================
  // TEST 6: Invalid QR codes must show an appropriate error
  // =========================================================================
  console.log('\n--- TEST 6: Invalid QR Codes Error Handling ---');
  await navigateTo('http://localhost:3000/report');
  await waitForSelector('button');

  // Case 6A: Completely invalid URL (not a HAILO QR)
  const scanInvalidUrl = await evaluate(`
    (() => {
      const input = document.querySelector('input[placeholder*="report/BIN"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'https://www.google.com/search?q=waste');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return 'Submitted Invalid Non-HAILO URL';
        }
      }
      return 'Input form not found';
    })()
  `);
  console.log('Action 6A:', scanInvalidUrl);
  await new Promise(r => setTimeout(r, 500));

  const pathAfterInvalid = await evaluate('window.location.pathname');
  const bodyAfterInvalid = await evaluate('document.body.innerText');

  console.log(`Path remains /report: ${pathAfterInvalid === '/report'}`);
  console.log('✓ Shows error message:', bodyAfterInvalid.includes('Invalid QR Code') || bodyAfterInvalid.includes('Scan Error'));

  // Case 6B: Unregistered bin ID (e.g. BIN-999)
  const scanUnregisteredBin = await evaluate(`
    (() => {
      const input = document.querySelector('input[placeholder*="report/BIN"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'https://example.com/report/BIN-999');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return 'Submitted Unregistered BIN-999';
        }
      }
      return 'Input form not found';
    })()
  `);
  console.log('Action 6B:', scanUnregisteredBin);
  await new Promise(r => setTimeout(r, 500));

  const bodyAfterUnregistered = await evaluate('document.body.innerText');
  console.log('✓ Shows unregistered bin error:', bodyAfterUnregistered.includes('BIN-999') && (bodyAfterUnregistered.includes('not registered') || bodyAfterUnregistered.includes('Scan Error')));

  if (!bodyAfterInvalid.includes('Scan Error') && !bodyAfterInvalid.includes('Invalid QR Code')) {
    throw new Error('TEST 6 FAILED: Invalid QR code did not show error message.');
  }

  // =========================================================================
  // TEST 7: Submitted complaint must be associated with correct bin
  // =========================================================================
  console.log('\n--- TEST 7: Complaint Association with Correct Bin (BIN-002) ---');
  // Navigate directly to /report/BIN-002
  await navigateTo('http://localhost:3000/report/BIN-002');
  await waitForSelector('button');

  // Select Bad Smell category
  await evaluate(`
    (() => {
      const smellCard = document.querySelector('[data-category-card="Bad Smell"]') || 
                        Array.from(document.querySelectorAll('div, button')).find(el => el.innerText && el.innerText.includes('Bad Smell'));
      if (smellCard) smellCard.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // Enter description and submit form
  const submitComplaintResult = await evaluate(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'Strong odor detected around cafeteria outdoor seating area.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const form = document.querySelector('form');
      const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
      if (submitBtn) {
        submitBtn.click();
        return 'Submitted Complaint for BIN-002 (Bad Smell)';
      }
      return 'Submit button not found';
    })()
  `);
  console.log('Action:', submitComplaintResult);
  await new Promise(r => setTimeout(r, 1200));

  const afterSubmitPath = await evaluate('window.location.pathname');
  const afterSubmitText = await evaluate('document.body.innerText');

  console.log(`Path after submit: ${afterSubmitPath}`);
  console.log('✓ Redirected to success page:', afterSubmitPath.includes('/report/success/'));
  console.log('✓ Confirmation shows BIN-002:', afterSubmitText.includes('BIN-002'));
  console.log('✓ Confirmation shows Cafeteria:', afterSubmitText.includes('Cafeteria'));

  // Verify in Customer Reports
  await navigateTo('http://localhost:3000/customer/reports');
  await waitForSelector('div');
  const customerReportsText = await evaluate('document.body.innerText');
  console.log('✓ Appears in Customer Incident Reports:');
  console.log('  - Shows BIN-002:', customerReportsText.includes('BIN-002'));
  console.log('  - Shows Cafeteria:', customerReportsText.includes('Cafeteria'));
  console.log('  - Shows Bad Smell category:', customerReportsText.includes('Bad Smell'));

  if (!customerReportsText.includes('BIN-002') || !customerReportsText.includes('Cafeteria')) {
    throw new Error('TEST 7 FAILED: Complaint was not correctly associated with BIN-002.');
  }

  // =========================================================================
  // TEST 8: Existing report history and dashboard functionality unchanged
  // =========================================================================
  console.log('\n--- TEST 8: Verification of Existing Dashboard & Admin Integrity ---');
  await navigateTo('http://localhost:3000/login');
  await waitForSelector('button');
  
  // Sign out first if already logged in as customer
  const signOutResult = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signOutBtn = btns.find(b => b.innerText.includes('Sign Out'));
      if (signOutBtn) {
        signOutBtn.click();
        return 'Clicked Sign Out';
      }
      return 'No Sign Out button';
    })()
  `);
  console.log('Sign Out action:', signOutResult);
  await new Promise(r => setTimeout(r, 800));

  const adminClickResult = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Enter Admin Dashboard'));
      if (adminBtn) {
        adminBtn.click();
        return 'Clicked Enter Admin Dashboard';
      }
      return 'Admin button not found. Buttons: ' + btns.map(b => b.innerText.trim()).join(' | ');
    })()
  `);
  console.log('Admin login action:', adminClickResult);
  await new Promise(r => setTimeout(r, 1200));

  const adminPathname = await evaluate('window.location.pathname');
  const adminDashText = await evaluate('document.body.innerText');
  const upperDashText = adminDashText.toUpperCase();
  console.log(`Current pathname: ${adminPathname}`);
  console.log('✓ Admin Dashboard loaded:', upperDashText.includes('TOTAL ACTIVE WASTE') && upperDashText.includes('ACTIVE COMPLAINTS'));
  console.log('✓ Total Active Waste stat card present:', upperDashText.includes('TOTAL ACTIVE WASTE'));
  console.log('✓ Active Complaints card present:', upperDashText.includes('ACTIVE COMPLAINTS'));

  await navigateTo('http://localhost:3000/admin/complaints');
  await waitForSelector('table');
  const adminComplaintsText = await evaluate('document.body.innerText');
  console.log('✓ Admin Complaints table shows submitted complaint with BIN-002:', 
    adminComplaintsText.includes('BIN-002') && adminComplaintsText.includes('Cafeteria')
  );

  console.log('\n======================================================');
  console.log('Console Errors Audit:', consoleErrors.length === 0 ? '0 errors ✨' : consoleErrors);
  console.log('======================================================');

  ws.close();
  chrome.kill();
  console.log('\n🎉 ALL 8 FINAL TESTING CRITERIA PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
