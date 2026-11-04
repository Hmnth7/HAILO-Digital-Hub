import { spawn } from 'child_process';

async function runTest() {
  console.log('========================================================================');
  console.log('🚀 HAILO DIGITAL HUB — VERIFY 3 COMPLAINT SUBMISSION METHODS & SHARED STORAGE');
  console.log('========================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // Helper to create an isolated Headless Chrome session
  async function createBrowserSession(port, userDataPrefix) {
    const dir = `/tmp/${userDataPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--disable-gpu',
      '--no-sandbox',
      `--user-data-dir=${dir}`,
      'about:blank'
    ]);

    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!ready) {
      proc.kill();
      throw new Error(`Failed to connect to Chrome on port ${port}`);
    }

    const jsonRes = await fetch(`http://127.0.0.1:${port}/json`);
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

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id);
        pending.delete(data.id);
        resolve(data.result);
      }
    };

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text + ': ' + (res.exceptionDetails.exception?.description || ''));
      }
      return res.result.value;
    }

    async function navigate(url) {
      await send('Page.navigate', { url });
      await new Promise(r => setTimeout(r, 900));
    }

    async function close() {
      try { ws.close(); } catch {}
      try { proc.kill(); } catch {}
    }

    return { evaluate, navigate, close };
  }

  let adminSession = null;
  let customerSession = null;
  let phoneSession = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Reset Shared Storage Database Cleanly
    // -------------------------------------------------------------------------
    console.log('--- STEP 0: Clean Shared Storage Database ---');
    try {
      const delRes = await fetch('http://127.0.0.1:3000/api/complaints', { method: 'DELETE' });
      assert(delRes.ok, 'Reset shared backend complaints database (DELETE /api/complaints)');
    } catch (e) {
      console.warn('API reset note:', e.message);
    }

    // -------------------------------------------------------------------------
    // STEP 1: Admin Portal -> Create Report
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Admin Portal → Create Report ---');
    adminSession = await createBrowserSession(9231, 'session-admin');
    await adminSession.navigate('http://127.0.0.1:3000/login');
    await adminSession.evaluate(`localStorage.clear()`);
    await adminSession.navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 600));

    // Log in as Admin
    await adminSession.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Enter Admin Dashboard'));
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Navigate to Admin Complaints
    await adminSession.navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 700));

    // Check empty state
    const adminInitEmpty = await adminSession.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('No complaints received yet.');
    })()`);
    assert(adminInitEmpty, 'Admin Complaints initially displays "No complaints received yet."');

    // Click "Submit New Report"
    await adminSession.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit New Report'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // On Bin Identification: Select BIN-001 (Main Block)
    await adminSession.evaluate(`(() => {
      const manualTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Select Bin Manually'));
      if (manualTab) manualTab.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    await adminSession.evaluate(`(() => {
      const bin1Btn = document.querySelector('[data-bin-button="BIN-001"]') || document.querySelector('[data-bin-card="BIN-001"]');
      if (bin1Btn) bin1Btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const curPathAdmin = await adminSession.evaluate(`window.location.pathname`);
    assert(curPathAdmin.includes('/report/BIN-001'), `Admin navigated to /report/BIN-001 (path: ${curPathAdmin})`);

    // Select category "Overflowing Waste", fill description, submit
    await adminSession.evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Overflowing Waste"]');
      if (catBtn) catBtn.click();

      const desc = document.querySelector('textarea');
      if (desc) {
        desc.value = 'Main block bin has overflowing paper waste spilling onto the corridor.';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const adminSuccess = await adminSession.evaluate(`(() => {
      return {
        path: window.location.pathname,
        hasCode: document.body.innerText.includes('CMP-001'),
        hasBin: document.body.innerText.includes('BIN-001'),
        hasCat: document.body.innerText.includes('Overflowing Waste')
      };
    })()`);

    assert(adminSuccess.path.includes('/report/success'), `Admin successfully submitted report (${adminSuccess.path})`);
    assert(adminSuccess.hasCode && adminSuccess.hasBin && adminSuccess.hasCat, 'Success screen acknowledges CMP-001, BIN-001, Overflowing Waste');

    // Click "Back to Home" (returns to /admin/complaints)
    await adminSession.evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back to Home'));
      if (backBtn) backBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 900));

    const adminComplaint1 = await adminSession.evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const row = document.querySelector('tr[data-complaint-row]');
      const sourceBadge = document.querySelector('[data-source-badge]')?.innerText || '';
      return {
        storedCount: stored.length,
        first: stored[0] || null,
        hasRow: !!row,
        sourceBadge
      };
    })()`);

    assert(adminComplaint1.storedCount === 1, `Admin Complaints has 1 record in storage (count: ${adminComplaint1.storedCount})`);
    assert(adminComplaint1.first?.binCode === 'BIN-001', `Admin complaint is for BIN-001 (found: ${adminComplaint1.first?.binCode})`);
    assert(adminComplaint1.first?.location === 'Main Block', `Admin complaint location is Main Block (found: ${adminComplaint1.first?.location})`);
    assert(adminComplaint1.first?.status === 'PENDING', `Admin complaint starts with status PENDING (found: ${adminComplaint1.first?.status})`);
    assert(adminComplaint1.first?.source === 'ADMIN', `Admin complaint source recorded as ADMIN (found: ${adminComplaint1.first?.source})`);

    // -------------------------------------------------------------------------
    // STEP 2: Customer Portal -> Create Report (Separate Browser Session B)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Customer Portal → Create Report (Separate Session) ---');
    customerSession = await createBrowserSession(9232, 'session-customer');
    await customerSession.navigate('http://127.0.0.1:3000/login');
    await customerSession.evaluate(`localStorage.clear()`);
    await customerSession.navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 600));

    // Log in as Customer (Rahul Verma)
    await customerSession.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const custBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard'));
      if (custBtn) custBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const custDashUrl = await customerSession.evaluate(`window.location.pathname`);
    assert(custDashUrl.includes('/customer'), `Customer logged in to Customer Portal (path: ${custDashUrl})`);

    // Click "Report Dustbin Issue" on Customer Dashboard
    await customerSession.evaluate(`(() => {
      const reportBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Report Dustbin Issue') || b.innerText.includes('Submit New Incident Report'));
      if (reportBtn) reportBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Select BIN-002 (Cafeteria)
    await customerSession.evaluate(`(() => {
      const manualTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Select Bin Manually'));
      if (manualTab) manualTab.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    await customerSession.evaluate(`(() => {
      const bin2Btn = document.querySelector('[data-bin-button="BIN-002"]') || document.querySelector('[data-bin-card="BIN-002"]');
      if (bin2Btn) bin2Btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const curPathCust = await customerSession.evaluate(`window.location.pathname`);
    assert(curPathCust.includes('/report/BIN-002'), `Customer navigated to /report/BIN-002 (path: ${curPathCust})`);

    // Select category "Bad Smell" and submit
    await customerSession.evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Bad Smell"]');
      if (catBtn) catBtn.click();

      const desc = document.querySelector('textarea');
      if (desc) {
        desc.value = 'Cafeteria food waste bin has strong pungent odor.';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const custSuccess = await customerSession.evaluate(`(() => {
      return {
        path: window.location.pathname,
        hasCode: document.body.innerText.includes('CMP-002'),
        hasBin: document.body.innerText.includes('BIN-002'),
        hasCat: document.body.innerText.includes('Bad Smell')
      };
    })()`);

    assert(custSuccess.path.includes('/report/success'), `Customer successfully submitted report (${custSuccess.path})`);
    assert(custSuccess.hasCode && custSuccess.hasBin && custSuccess.hasCat, 'Success screen acknowledges CMP-002, BIN-002, Bad Smell');

    // Return to Customer Dashboard
    await customerSession.evaluate(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back to Home'));
      if (backBtn) backBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 900));

    // Verify report appears in Customer Dashboard & My Reports
    const custDashReports = await customerSession.evaluate(`(() => {
      const bodyText = document.body.innerText;
      return {
        hasCMP2: bodyText.includes('CMP-002'),
        hasBIN2: bodyText.includes('BIN-002'),
        hasCafeteria: bodyText.includes('Cafeteria'),
        hasBadSmell: bodyText.includes('Bad Smell')
      };
    })()`);

    assert(custDashReports.hasCMP2, 'Customer Dashboard displays newly created report CMP-002');
    assert(custDashReports.hasBIN2 && custDashReports.hasCafeteria, 'Customer Dashboard shows BIN-002 and Cafeteria');

    // -------------------------------------------------------------------------
    // STEP 3: Scan QR Code on Mobile Phone (Isolated Browser Session C)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Scan QR Code on Phone (Isolated Mobile Session) ---');
    phoneSession = await createBrowserSession(9233, 'session-phone');

    // Simulate scanning dustbin placard QR for BIN-003 (Hostel)
    // Mobile phone browser opens URL directly: http://127.0.0.1:3000/report/BIN-003
    await phoneSession.navigate('http://127.0.0.1:3000/report/BIN-003');
    await new Promise(r => setTimeout(r, 800));

    const phonePage = await phoneSession.evaluate(`(() => {
      const text = document.body.innerText;
      return {
        hasBin3: text.includes('BIN-003'),
        hasHostel: text.includes('Hostel')
      };
    })()`);

    assert(phonePage.hasBin3 && phonePage.hasHostel, 'Mobile phone opened BIN-003 Hostel QR reporting screen');

    // Select category "Needs Cleaning", fill details, submit
    await phoneSession.evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Needs Cleaning"]');
      if (catBtn) catBtn.click();

      const nameInput = document.querySelector('input[placeholder*="Name"], input[placeholder*="name"]');
      if (nameInput) {
        nameInput.value = 'Sunita Rao';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const phoneInput = document.querySelector('input[placeholder*="Email"], input[placeholder*="Phone"], input[placeholder*="phone"]');
      if (phoneInput) {
        phoneInput.value = '+91 91234 56789';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const desc = document.querySelector('textarea');
      if (desc) {
        desc.value = 'Hostel dustbin exterior heavily stained and needs thorough sanitation wash.';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const phoneSuccess = await phoneSession.evaluate(`(() => {
      return {
        path: window.location.pathname,
        hasCode: document.body.innerText.includes('CMP-003'),
        hasBin: document.body.innerText.includes('BIN-003'),
        hasCat: document.body.innerText.includes('Needs Cleaning')
      };
    })()`);

    assert(phoneSuccess.path.includes('/report/success'), `Mobile phone QR report submitted successfully (${phoneSuccess.path})`);
    assert(phoneSuccess.hasCode && phoneSuccess.hasBin && phoneSuccess.hasCat, 'Success screen acknowledges CMP-003, BIN-003, Needs Cleaning');

    // -------------------------------------------------------------------------
    // STEP 4: Admin Complaints Displays All 3 Complaints from Shared Storage
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Admin Complaints Displays All 3 Complaints ---');
    // In Admin session A, navigate back to /admin/complaints
    await adminSession.navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 2000));

    const adminAllComplaints = await adminSession.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('tr[data-complaint-row]')).map(r => r.innerText);
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return {
        count: stored.length,
        items: stored.map(c => ({
          code: c.complaintCode,
          bin: c.binCode,
          location: c.location,
          category: c.category,
          status: c.status,
          source: c.source
        })),
        rows
      };
    })()`);

    assert(adminAllComplaints.count === 3, `Admin Dashboard has exactly 3 complaints (found: ${adminAllComplaints.count})`);

    const cmp1 = adminAllComplaints.items.find(c => c.code === 'CMP-001');
    const cmp2 = adminAllComplaints.items.find(c => c.code === 'CMP-002');
    const cmp3 = adminAllComplaints.items.find(c => c.code === 'CMP-003');

    // Verify Complaint 1 (Admin Portal)
    assert(cmp1 && cmp1.bin === 'BIN-001' && cmp1.location === 'Main Block', 'CMP-001 has bin BIN-001 and location Main Block');
    assert(cmp1 && cmp1.category === 'Overflowing Waste', 'CMP-001 has category Overflowing Waste');
    assert(cmp1 && cmp1.status === 'PENDING', 'CMP-001 has status PENDING');
    assert(cmp1 && cmp1.source === 'ADMIN', 'CMP-001 has source ADMIN');

    // Verify Complaint 2 (Customer Portal)
    assert(cmp2 && cmp2.bin === 'BIN-002' && cmp2.location === 'Cafeteria', 'CMP-002 has bin BIN-002 and location Cafeteria');
    assert(cmp2 && cmp2.category === 'Bad Smell', 'CMP-002 has category Bad Smell');
    assert(cmp2 && cmp2.status === 'PENDING', 'CMP-002 has status PENDING');
    assert(cmp2 && cmp2.source === 'CUSTOMER', 'CMP-002 has source CUSTOMER');

    // Verify Complaint 3 (Mobile Phone QR Scan)
    assert(cmp3 && cmp3.bin === 'BIN-003' && cmp3.location === 'Hostel', 'CMP-003 has bin BIN-003 and location Hostel');
    assert(cmp3 && cmp3.category === 'Needs Cleaning', 'CMP-003 has category Needs Cleaning');
    assert(cmp3 && cmp3.status === 'PENDING', 'CMP-003 has status PENDING');
    assert(cmp3 && cmp3.source === 'QR_SCAN', 'CMP-003 has source QR_SCAN');

    // -------------------------------------------------------------------------
    // STEP 5: Refresh Admin Page & Verify All 3 Remain
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: Page Refresh & Persistence in Admin ---');
    await adminSession.navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 2000));

    const afterRefresh = await adminSession.evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const rowCount = document.querySelectorAll('tr[data-complaint-row]').length;
      return { count: stored.length, rowCount, codes: stored.map(c => c.complaintCode) };
    })()`);

    assert(afterRefresh.count === 3, `After refresh: exactly 3 complaints remain in storage (found: ${afterRefresh.count})`);
    assert(afterRefresh.rowCount === 3, `After refresh: exactly 3 rows remain in table (found: ${afterRefresh.rowCount})`);
    assert(afterRefresh.codes.includes('CMP-001') && afterRefresh.codes.includes('CMP-002') && afterRefresh.codes.includes('CMP-003'), 'All three complaint codes CMP-001, CMP-002, CMP-003 are present');

    // -------------------------------------------------------------------------
    // STEP 6: Admin Updates Complaint Status & Verifies Shared Storage Sync
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: Admin Status Update & Shared Storage Sync ---');
    // Click row for CMP-003 (BIN-003) in Admin
    await adminSession.evaluate(`(() => {
      const row3 = document.querySelector('tr[data-complaint-row="CMP-003"]');
      if (row3) row3.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Click "Accept Complaint"
    await adminSession.evaluate(`(() => {
      const acceptBtn = document.querySelector('[data-testid="accept-complaint-btn"]');
      if (acceptBtn) acceptBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 700));

    // Assign cleaning staff Rajesh Kumar (STF-001)
    await adminSession.evaluate(`(() => {
      const staffSelect = document.querySelector('[data-testid="staff-selection-dropdown"]') || document.querySelector('select');
      if (staffSelect) {
        const opt = Array.from(staffSelect.options).find(o => o.text.includes('Rajesh Kumar') || o.value.includes('STF-001'));
        if (opt) {
          staffSelect.value = opt.value;
          staffSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const assignBtn = document.querySelector('[data-testid="assign-staff-btn"]') || document.querySelector('[data-testid="confirm-assign-btn"]');
      if (assignBtn) assignBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    // Check shared backend API directly via fetch
    const backendCheck = await fetch('http://127.0.0.1:3000/api/complaints');
    const backendData = await backendCheck.json();
    const syncedCmp3 = backendData.find(c => c.complaintCode === 'CMP-003');

    assert(syncedCmp3 && syncedCmp3.status === 'ASSIGNED', `Shared storage reflected Admin status change: CMP-003 status = ${syncedCmp3?.status}`);
    assert(syncedCmp3 && syncedCmp3.assignedStaff?.includes('Rajesh Kumar'), `Shared storage reflected assigned staff: ${syncedCmp3?.assignedStaff}`);

  } catch (err) {
    console.error('💥 Test suite error:', err);
  } finally {
    if (adminSession) await adminSession.close();
    if (customerSession) await customerSession.close();
    if (phoneSession) await phoneSession.close();

    console.log('\n========================================================================');
    console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================================\n');
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runTest().catch(err => {
  console.error('Execution failure', err);
  process.exit(1);
});
