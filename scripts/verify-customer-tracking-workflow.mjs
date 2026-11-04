import { spawn } from 'child_process';

async function runTest() {
  console.log('========================================================================');
  console.log('🚀 HAILO DIGITAL HUB — VERIFY CUSTOMER COMPLAINT TRACKING & ADMIN STATUS WORKFLOW');
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
      await new Promise(r => setTimeout(r, 1000));
    }

    async function close() {
      try { ws.close(); } catch {}
      try { proc.kill(); } catch {}
    }

    return { evaluate, navigate, close };
  }

  let session = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Reset Database Cleanly
    // -------------------------------------------------------------------------
    console.log('--- STEP 0: Clean Start ---');
    try {
      await fetch('http://127.0.0.1:3000/api/complaints', { method: 'DELETE' });
    } catch {}

    session = await createBrowserSession(9241, 'session-tracking');
    await session.navigate('http://127.0.0.1:3000/login');
    await session.evaluate(`localStorage.clear()`);
    await session.navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // STEP 1: Customer Logs In (Rahul Verma)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Customer Portal Login ---');
    await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const custBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard'));
      if (custBtn) custBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const pathAfterLogin = await session.evaluate(`window.location.pathname`);
    assert(pathAfterLogin.includes('/customer'), `Customer logged in successfully (path: ${pathAfterLogin})`);

    // Verify My Reports starts empty
    await session.navigate('http://127.0.0.1:3000/customer/reports');
    await new Promise(r => setTimeout(r, 600));

    const emptyText = await session.evaluate(`(() => {
      return document.body.innerText.includes("You haven't submitted any reports yet.");
    })()`);
    assert(emptyText, 'Customer My Reports initially displays empty state ("You haven\'t submitted any reports yet.")');

    // -------------------------------------------------------------------------
    // STEP 2: Customer Submits a Genuine Complaint
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Customer Submits Genuine Complaint ---');
    await session.navigate('http://127.0.0.1:3000/report');
    await new Promise(r => setTimeout(r, 600));

    // Switch to Option 2: Select Bin Manually
    await session.evaluate(`(() => {
      const manualTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Select Bin Manually'));
      if (manualTab) manualTab.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Select BIN-002 (Cafeteria)
    await session.evaluate(`(() => {
      const bin2Btn = document.querySelector('[data-bin-button="BIN-002"]') || document.querySelector('[data-bin-card="BIN-002"]');
      if (bin2Btn) bin2Btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const reportPath = await session.evaluate(`window.location.pathname`);
    assert(reportPath.includes('/report/BIN-002'), `Navigated to report form for BIN-002 (path: ${reportPath})`);

    // Select category "Bad Smell", fill description, and submit
    await session.evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Bad Smell"]');
      if (catBtn) catBtn.click();

      const desc = document.querySelector('textarea');
      if (desc) {
        desc.value = 'Severe sour odor coming from cafeteria food waste bin. Needs prompt clearing.';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const successData = await session.evaluate(`(() => {
      return {
        path: window.location.pathname,
        bodyText: document.body.innerText
      };
    })()`);

    assert(successData.path.includes('/report/success'), `Complaint submitted and reached success page (${successData.path})`);
    assert(successData.bodyText.includes('BIN-002'), 'Success page acknowledges Target Bin: BIN-002');
    assert(successData.bodyText.includes('Cafeteria'), 'Success page acknowledges Location: Cafeteria');
    assert(successData.bodyText.includes('Bad Smell'), 'Success page acknowledges Issue: Bad Smell');

    // -------------------------------------------------------------------------
    // STEP 3: Verify Complaint in Customer Portal "My Reports"
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Verify in Customer Portal "My Reports" ---');
    await session.navigate('http://127.0.0.1:3000/customer/reports');
    await new Promise(r => setTimeout(r, 800));

    const myReportCard = await session.evaluate(`(() => {
      const card = document.querySelector('[data-report-card]');
      if (!card) return null;
      return {
        text: card.innerText,
        code: card.getAttribute('data-report-card'),
        hasBin: card.innerText.includes('BIN-002'),
        hasLocation: card.innerText.includes('Cafeteria'),
        hasCategory: card.innerText.includes('Bad Smell'),
        hasPending: card.innerText.includes('PENDING')
      };
    })()`);

    assert(!!myReportCard, 'My Reports displays the submitted complaint card');
    assert(myReportCard?.hasBin, `Card displays correct Bin ID: BIN-002`);
    assert(myReportCard?.hasLocation, `Card displays correct Location: Cafeteria`);
    assert(myReportCard?.hasCategory, `Card displays correct Category: Bad Smell`);
    assert(myReportCard?.hasPending, `Card displays initial status: PENDING`);
    assert(myReportCard?.code?.startsWith('CMP-'), `Card displays valid Complaint ID: ${myReportCard?.code}`);

    const loggedCode = myReportCard?.code;

    // -------------------------------------------------------------------------
    // STEP 4: Admin Opens Admin Complaints & Modifies Status
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Admin Portal Review, Staff Assignment & Status Update ---');
    // Switch to Admin
    await session.navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 500));
    await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Enter Admin Dashboard'));
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    await session.navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 1000));

    const adminRow = await session.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('tr[data-complaint-row]'));
      return {
        count: rows.length,
        hasCode: document.body.innerText.includes('${loggedCode}'),
        hasBin: document.body.innerText.includes('BIN-002'),
        hasCafeteria: document.body.innerText.includes('Cafeteria')
      };
    })()`);

    assert(adminRow.count >= 1, `Admin Complaints displays the complaint (count: ${adminRow.count})`);
    assert(adminRow.hasCode && adminRow.hasBin && adminRow.hasCafeteria, `Admin Complaints table shows ${loggedCode}, BIN-002, Cafeteria`);

    // Click on complaint row to select it
    await session.evaluate(`(() => {
      const row = document.querySelector('tr[data-complaint-row="${loggedCode}"]') || document.querySelector('tr[data-complaint-row]');
      if (row) row.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));

    // Admin accepts complaint
    await session.evaluate(`(() => {
      const acceptBtn = document.querySelector('[data-testid="accept-complaint-btn"]');
      if (acceptBtn) acceptBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Admin assigns staff member Rajesh Kumar (STF-001)
    await session.evaluate(`(() => {
      const staffSelect = document.querySelector('[data-testid="staff-selection-dropdown"]') || document.querySelector('select');
      if (staffSelect) {
        const opt = Array.from(staffSelect.options).find(o => o.text.includes('Rajesh Kumar') || o.value.includes('STF-001'));
        if (opt) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          setter.call(staffSelect, opt.value);
          staffSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const assignBtn = document.querySelector('[data-testid="assign-staff-btn"]');
      if (assignBtn) assignBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Admin updates status to "IN PROGRESS"
    await session.evaluate(`(() => {
      const inProgBtn = document.querySelector('[data-testid="status-btn-in-progress"]');
      if (inProgBtn) inProgBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    const adminUpdated = await session.evaluate(`(() => {
      const badge = document.querySelector('[data-testid="detail-status-badge"]');
      const text = document.body.innerText;
      return {
        statusText: badge ? badge.innerText : '',
        hasRajesh: text.includes('Rajesh Kumar')
      };
    })()`);

    assert(adminUpdated.statusText.includes('IN PROGRESS'), `Admin view reflects updated status: IN PROGRESS`);
    assert(adminUpdated.hasRajesh, `Admin view reflects assigned staff: Rajesh Kumar`);

    // -------------------------------------------------------------------------
    // STEP 5: Customer Sees Updated Status in My Reports
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: Customer Sees Updated Status & Assigned Staff ---');
    // Log back in as customer
    await session.navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 500));
    await session.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const custBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard'));
      if (custBtn) custBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    await session.navigate('http://127.0.0.1:3000/customer/reports');
    await new Promise(r => setTimeout(r, 1000));

    const customerView = await session.evaluate(`(() => {
      const card = document.querySelector('[data-report-card="${loggedCode}"]') || document.querySelector('[data-report-card]');
      if (!card) return null;
      return {
        cardText: card.innerText,
        hasInProgress: card.innerText.includes('IN PROGRESS'),
        hasRajesh: card.innerText.includes('Rajesh Kumar'),
        hasDate: card.innerText.includes('2026') || card.innerText.includes('Nov') || card.innerText.includes(':')
      };
    })()`);

    assert(customerView?.hasInProgress, `Customer My Reports reflects updated status: IN PROGRESS`);
    assert(customerView?.hasRajesh, `Customer My Reports reflects assigned staff: Rajesh Kumar`);
    assert(customerView?.hasDate, `Customer My Reports displays formatted submission date`);

    // -------------------------------------------------------------------------
    // STEP 6: Customer Refreshes Page & Verifies Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: Customer Page Refresh Persistence ---');
    await session.navigate('http://127.0.0.1:3000/customer/reports');
    await new Promise(r => setTimeout(r, 1200));

    const afterRefresh = await session.evaluate(`(() => {
      const card = document.querySelector('[data-report-card="${loggedCode}"]') || document.querySelector('[data-report-card]');
      if (!card) return null;
      return {
        hasCode: card.innerText.includes('${loggedCode}'),
        hasBin: card.innerText.includes('BIN-002'),
        hasLocation: card.innerText.includes('Cafeteria'),
        hasCategory: card.innerText.includes('Bad Smell'),
        hasInProgress: card.innerText.includes('IN PROGRESS'),
        hasRajesh: card.innerText.includes('Rajesh Kumar'),
        hasDate: card.innerText.includes('2026') || card.innerText.includes('Nov') || card.innerText.includes(':')
      };
    })()`);

    assert(afterRefresh?.hasCode, `After refresh: Complaint ID ${loggedCode} persists in My Reports`);
    assert(afterRefresh?.hasBin && afterRefresh?.hasLocation, `After refresh: BIN-002 / Cafeteria persists`);
    assert(afterRefresh?.hasCategory, `After refresh: Category "Bad Smell" persists`);
    assert(afterRefresh?.hasInProgress, `After refresh: Latest status "IN PROGRESS" persists`);
    assert(afterRefresh?.hasRajesh, `After refresh: Assigned staff "Rajesh Kumar" persists`);
    assert(afterRefresh?.hasDate, `After refresh: Submission date persists`);

  } catch (err) {
    console.error('💥 Test execution error:', err);
  } finally {
    if (session) await session.close();

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
