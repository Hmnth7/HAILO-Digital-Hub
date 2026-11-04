import { spawn } from 'child_process';

async function runComplaintVerification() {
  console.log('========================================================================');
  console.log('🧹 HAILO DIGITAL HUB — VERIFY COMPLAINTS CLEANUP & GENUINE REPORT FLOW');
  console.log('========================================================================\n');

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/test-complaint-cleanup-' + Date.now(),
    'http://127.0.0.1:3000/login'
  ]);

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9229/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!ready) {
    console.error('❌ Failed to connect to headless Chrome on port 9229');
    chrome.kill();
    process.exit(1);
  }

  const jsonRes = await fetch('http://127.0.0.1:9229/json');
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
    await new Promise(r => setTimeout(r, 700));
  }

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

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Clear Complaint Data & Open Admin Complaints (Initial Empty State)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 1: Clean Initial State & Empty Dashboard ---');
    await navigate('http://127.0.0.1:3000/login');
    await new Promise(r => setTimeout(r, 600));

    // Clear any prior complaints in localStorage
    await evaluate(`(() => {
      localStorage.removeItem('hailo_v3_complaints');
      localStorage.removeItem('hailo_v3_tasks');
    })()`);

    // Log in as Admin
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Enter Admin Dashboard'));
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 700));

    // Navigate to /admin/complaints
    await navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 800));

    // Verify initial empty state
    const emptyState = await evaluate(`(() => {
      const pageText = document.body.innerText;
      const stored = localStorage.getItem('hailo_v3_complaints');
      const complaints = stored ? JSON.parse(stored) : [];
      const hasEmptyText = pageText.includes('No complaints received yet.');
      const rows = document.querySelectorAll('tr[data-complaint-row]');
      const activeCount = document.querySelector('span.bg-amber-100')?.innerText || '';

      return {
        storedCount: complaints.length,
        renderedRows: rows.length,
        hasEmptyText,
        activeCount
      };
    })()`);

    assert(emptyState.storedCount === 0, 'Complaints array in storage is completely empty (0 complaints)');
    assert(emptyState.renderedRows === 0, 'No complaint table rows are rendered (0 rows)');
    assert(emptyState.hasEmptyText, 'Complaints view displays "No complaints received yet."');
    assert(emptyState.activeCount.includes('0 Active'), 'Active counter shows 0 Active');

    // -------------------------------------------------------------------------
    // TEST 2: Submit 1st Genuine Complaint via BIN-002 (Cafeteria - Bad Smell)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Submit First Complaint for BIN-002 (Bad Smell) ---');
    await navigate('http://127.0.0.1:3000/report/BIN-002');
    await new Promise(r => setTimeout(r, 800));

    const bin2Header = await evaluate(`(() => {
      const pageText = document.body.innerText;
      return {
        hasBinCode: pageText.includes('BIN-002'),
        hasLocation: pageText.includes('Cafeteria'),
        notHostel: !pageText.includes('Hostel')
      };
    })()`);

    assert(bin2Header.hasBinCode, 'Report page displays BIN-002');
    assert(bin2Header.hasLocation, 'Report page displays Cafeteria location');
    assert(bin2Header.notHostel, 'Report page does NOT mention Hostel');

    // Select category "Bad Smell" and fill citizen details
    await evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Bad Smell"]');
      if (catBtn) catBtn.click();

      const nameInput = document.querySelector('input[placeholder*="Name"], input[placeholder*="name"]');
      if (nameInput) {
        nameInput.value = 'Rohan Gupta';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const descInput = document.querySelector('textarea');
      if (descInput) {
        descInput.value = 'Strong foul odor emanating from cafeteria food waste bin.';
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Submit report
    await evaluate(`(() => {
      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const success1 = await evaluate(`(() => {
      return {
        url: window.location.pathname,
        pageText: document.body.innerText
      };
    })()`);

    assert(success1.url.includes('/report/success'), `Navigated to success screen (${success1.url})`);
    assert(success1.pageText.includes('BIN-002'), 'Success screen acknowledges BIN-002');
    assert(success1.pageText.includes('Bad Smell'), 'Success screen acknowledges Bad Smell');

    // -------------------------------------------------------------------------
    // TEST 3: Check Admin Dashboard with Exactly 1 Complaint
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: Verify Admin Complaints Shows Exactly 1 Complaint ---');
    await navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 800));

    const stateAfter1 = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const rows = Array.from(document.querySelectorAll('tr[data-complaint-row]')).map(r => r.innerText);
      const activeCount = document.querySelector('span.bg-amber-100')?.innerText || '';
      const detailBinCode = document.querySelector('[data-testid="detail-bin-code"]')?.innerText || '';
      const detailBinLocation = document.querySelector('[data-testid="detail-bin-location"]')?.innerText || '';

      return {
        storedCount: stored.length,
        first: stored[0] || null,
        rows,
        activeCount,
        detailBinCode,
        detailBinLocation
      };
    })()`);

    assert(stateAfter1.storedCount === 1, `Exactly 1 complaint in storage (count: ${stateAfter1.storedCount})`);
    assert(stateAfter1.first?.binCode === 'BIN-002', `Complaint is for BIN-002 (found: ${stateAfter1.first?.binCode})`);
    assert(stateAfter1.first?.location === 'Cafeteria', `Complaint location is Cafeteria (found: ${stateAfter1.first?.location})`);
    assert(stateAfter1.first?.category === 'Bad Smell', `Complaint category is Bad Smell (found: ${stateAfter1.first?.category})`);
    assert(stateAfter1.rows.length === 1, `Exactly 1 row in complaints table (found: ${stateAfter1.rows.length})`);
    assert(Boolean(stateAfter1.rows[0]?.includes('BIN-002') && stateAfter1.rows[0]?.includes('Cafeteria')), 'Table row displays BIN-002 and Cafeteria');
    assert(Boolean(stateAfter1.rows[0]?.includes('Bad Smell')), 'Table row displays Bad Smell');
    assert(stateAfter1.detailBinCode === 'BIN-002', `Detail panel displays BIN-002 (found: ${stateAfter1.detailBinCode})`);
    assert(stateAfter1.detailBinLocation === 'Cafeteria', `Detail panel displays Cafeteria (found: ${stateAfter1.detailBinLocation})`);
    assert(stateAfter1.detailBinCode !== 'BIN-003', 'Detail panel does NOT display BIN-003');

    // -------------------------------------------------------------------------
    // TEST 4: Submit 2nd Genuine Complaint via BIN-004 (Library - Liquid Leakage)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 4: Submit Second Complaint for BIN-004 (Liquid Leakage) ---');
    await navigate('http://127.0.0.1:3000/report/BIN-004');
    await new Promise(r => setTimeout(r, 800));

    const bin4Header = await evaluate(`(() => {
      const pageText = document.body.innerText;
      return {
        hasBinCode: pageText.includes('BIN-004'),
        hasLocation: pageText.includes('Library'),
        notHostel: !pageText.includes('Hostel')
      };
    })()`);

    assert(bin4Header.hasBinCode, 'Report page displays BIN-004');
    assert(bin4Header.hasLocation, 'Report page displays Library location');

    // Select category "Liquid Leakage"
    await evaluate(`(() => {
      const catBtn = document.querySelector('[data-category-card="Liquid Leakage"]');
      if (catBtn) catBtn.click();

      const nameInput = document.querySelector('input[placeholder*="Name"], input[placeholder*="name"]');
      if (nameInput) {
        nameInput.value = 'Ananya Sen';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const descInput = document.querySelector('textarea');
      if (descInput) {
        descInput.value = 'Liquid beverage leakage around library bin base creating slip hazard.';
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Submit report
    await evaluate(`(() => {
      const submitBtn = document.getElementById('submit-report-btn');
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const success2 = await evaluate(`(() => {
      return {
        url: window.location.pathname,
        pageText: document.body.innerText
      };
    })()`);

    assert(success2.url.includes('/report/success'), `Navigated to success screen (${success2.url})`);
    assert(success2.pageText.includes('BIN-004'), 'Success screen acknowledges BIN-004');
    assert(success2.pageText.includes('Liquid Leakage'), 'Success screen acknowledges Liquid Leakage');

    // -------------------------------------------------------------------------
    // TEST 5: Check Admin Dashboard with Exactly 2 Complaints
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 5: Verify Admin Complaints Shows Exactly 2 Complaints ---');
    await navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 800));

    const stateAfter2 = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const rows = Array.from(document.querySelectorAll('tr[data-complaint-row]')).map(r => r.innerText);
      const activeCount = document.querySelector('span.bg-amber-100')?.innerText || '';

      return {
        storedCount: stored.length,
        complaints: stored.map(c => ({ code: c.complaintCode, bin: c.binCode, loc: c.location, cat: c.category })),
        rows,
        activeCount
      };
    })()`);

    assert(stateAfter2.storedCount === 2, `Exactly 2 complaints in storage (count: ${stateAfter2.storedCount})`);
    assert(stateAfter2.rows.length === 2, `Exactly 2 rows in complaints table (count: ${stateAfter2.rows.length})`);
    assert(stateAfter2.complaints.some(c => c.bin === 'BIN-004' && c.loc === 'Library' && c.cat === 'Liquid Leakage'), 'BIN-004 (Library - Liquid Leakage) is recorded');
    assert(stateAfter2.complaints.some(c => c.bin === 'BIN-002' && c.loc === 'Cafeteria' && c.cat === 'Bad Smell'), 'BIN-002 (Cafeteria - Bad Smell) is recorded');
    assert(!stateAfter2.complaints.some(c => c.bin === 'BIN-003'), 'Zero fake reports for BIN-003');

    // -------------------------------------------------------------------------
    // TEST 6: Page Refresh & Admin Header Refresh Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 6: Refresh Persistence & No Fake Complaint Injection ---');
    // Hard reload the complaints page
    await navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 1000));

    const afterReload = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const rows = document.querySelectorAll('tr[data-complaint-row]').length;
      return { count: stored.length, rows, items: stored.map(c => c.binCode) };
    })()`);

    assert(afterReload.count === 2, `After page reload: exactly 2 complaints remain (found: ${afterReload.count})`);
    assert(afterReload.rows === 2, `After page reload: exactly 2 rows remain (found: ${afterReload.rows})`);

    // Click Admin top bar "Refresh" button
    await evaluate(`(() => {
      const refreshBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Refresh' || b.innerText.includes('Refresh'));
      if (refreshBtn) refreshBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const afterHeaderRefresh = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return { count: stored.length, items: stored.map(c => c.binCode) };
    })()`);

    assert(afterHeaderRefresh.count === 2, `After clicking top bar Refresh: exactly 2 complaints remain without any demo injection (found: ${afterHeaderRefresh.count})`);
    assert(!afterHeaderRefresh.items.includes('BIN-003'), 'No fake BIN-003 complaint was injected by top bar Refresh button');

    // -------------------------------------------------------------------------
    // TEST 7: Clear All Complaints & Return to Pristine Empty State
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 7: Clear All Complaints Action ---');
    await evaluate(`(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Clear All Complaints'));
      if (clearBtn) clearBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const finalEmptyState = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const pageText = document.body.innerText;
      const rows = document.querySelectorAll('tr[data-complaint-row]').length;
      return {
        count: stored.length,
        rows,
        hasEmptyText: pageText.includes('No complaints received yet.')
      };
    })()`);

    assert(finalEmptyState.count === 0, `Storage cleared to 0 complaints (found: ${finalEmptyState.count})`);
    assert(finalEmptyState.rows === 0, `Table rows cleared to 0 (found: ${finalEmptyState.rows})`);
    assert(finalEmptyState.hasEmptyText, 'Complaints dashboard restored to "No complaints received yet."');

  } catch (err) {
    console.error('💥 Test execution error:', err);
  } finally {
    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================================\n');
    chrome.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runComplaintVerification().catch(err => {
  console.error('Verification failed', err);
  process.exit(1);
});
