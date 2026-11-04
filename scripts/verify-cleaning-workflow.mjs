import { spawn } from 'child_process';

async function runTests() {
  console.log('🚀 Starting HAILO Digital Hub - Cleaning Staff Assignment & Resolution Verification Suite...\n');

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/test-cleaning-flow-' + Date.now(),
    'http://localhost:3000/login'
  ]);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!ready) {
    console.error('❌ Failed to start headless Chrome on port 9225');
    chrome.kill();
    process.exit(1);
  }

  const jsonRes = await fetch('http://127.0.0.1:9225/json');
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
      throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
    }
    return res.result?.value;
  }

  async function navigateTo(url) {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 700));
  }

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Customer Files Complaint for BIN-002
    // -------------------------------------------------------------------------
    console.log('📌 Test 1: Customer submits complaint for BIN-002 (Cafeteria)');
    await navigateTo('http://localhost:3000/login');
    await evaluate(`localStorage.clear()`);
    await navigateTo('http://localhost:3000/login');

    // Login as customer
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const customerBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard'));
      if (customerBtn) customerBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    // Submit complaint for BIN-002
    await navigateTo('http://localhost:3000/report/BIN-002');
    await new Promise(r => setTimeout(r, 600));

    await evaluate(`(() => {
      const desc = document.querySelector('textarea');
      if (desc) {
        desc.value = 'Excess cafeteria food containers spilling onto pedestrian walkway.';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 200));

    await evaluate(`(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit Report'));
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const complaintData = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps[0] || null;
    })()`);

    assert(complaintData !== null, 'Complaint saved in localStorage');
    assert(complaintData?.binCode === 'BIN-002', `Complaint linked to BIN-002 (got: ${complaintData?.binCode})`);
    assert(complaintData?.status.toUpperCase() === 'PENDING', `Initial status is PENDING (got: ${complaintData?.status})`);
    const primaryComplaintId = complaintData?.id;
    const primaryComplaintCode = complaintData?.complaintCode;

    // -------------------------------------------------------------------------
    // TEST 2: Admin Can Accept Complaint (Requirement 1 & 4)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 2: Admin accepts complaint from Complaints Management');
    // Login as Admin
    await navigateTo('http://localhost:3000/login');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Enter Admin Dashboard'));
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 700));

    await navigateTo('http://localhost:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 700));

    // Verify complaint row exists
    const hasRow = await evaluate(`(() => {
      const row = document.querySelector('[data-complaint-row="${primaryComplaintCode}"]');
      return !!row;
    })()`);
    assert(hasRow, `Complaint ${primaryComplaintCode} displayed in admin complaints table`);

    // Click Accept Complaint
    await evaluate(`(() => {
      const acceptBtn = document.querySelector('[data-testid="accept-complaint-btn"]');
      if (acceptBtn) acceptBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const afterAccept = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(afterAccept?.status.toUpperCase() === 'ACCEPTED', `Status updated to ACCEPTED (got: ${afterAccept?.status})`);
    assert(!!afterAccept?.acceptedAt, `Recorded acceptedAt timestamp: ${afterAccept?.acceptedAt}`);

    // Check activity log recorded acceptance
    const acceptLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'COMPLAINT_ACCEPTED' && l.target === '${primaryComplaintCode}');
    })()`);
    assert(!!acceptLog, 'COMPLAINT_ACCEPTED logged in immutable Activity Log');

    // -------------------------------------------------------------------------
    // TEST 3: Admin Can Reject Complaint (Requirement 1)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 3: Admin rejects duplicate/test complaint with reason');
    // Simulate filing a second test complaint
    await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      comps.unshift({
        id: 'cmp-test-reject',
        complaintCode: 'CMP-9999',
        binId: 'bin-004',
        binCode: 'BIN-004',
        location: 'Library',
        category: 'Other',
        description: 'Duplicate test report from scanner',
        priority: 'LOW',
        status: 'PENDING',
        createdAt: 'Just now'
      });
      localStorage.setItem('hailo_v3_complaints', JSON.stringify(comps));
    })()`);
    await navigateTo('http://localhost:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 600));

    // Select the test reject complaint
    await evaluate(`(() => {
      const row = document.querySelector('[data-complaint-row="CMP-9999"]');
      if (row) row.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Click Reject Complaint
    await evaluate(`(() => {
      const rejectBtn = document.querySelector('[data-testid="reject-complaint-btn"]');
      if (rejectBtn) rejectBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 300));

    // Enter rejection reason and confirm
    await evaluate(`(() => {
      const input = document.querySelector('[data-testid="rejection-reason-input"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, 'Duplicate test report');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const confirmBtn = document.querySelector('[data-testid="confirm-reject-btn"]');
      if (confirmBtn) confirmBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const rejectedData = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.complaintCode === 'CMP-9999');
    })()`);
    assert(rejectedData?.status.toUpperCase() === 'REJECTED', `Status updated to REJECTED (got: ${rejectedData?.status})`);
    assert(rejectedData?.rejectionReason === 'Duplicate test report', `Rejection reason recorded: ${rejectedData?.rejectionReason}`);
    assert(!!rejectedData?.rejectedAt, `Recorded rejectedAt timestamp: ${rejectedData?.rejectedAt}`);

    const rejectLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'COMPLAINT_REJECTED' && l.target === 'CMP-9999');
    })()`);
    assert(!!rejectLog, 'COMPLAINT_REJECTED logged in Activity Log');

    // -------------------------------------------------------------------------
    // TEST 4: Assign Accepted Complaint to Registered Cleaning Staff (Req 2 & 3)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 4: Assign accepted complaint to registered staff (Rajesh Kumar STF-001)');
    // Select primary complaint again
    await evaluate(`(() => {
      const row = document.querySelector('[data-complaint-row="${primaryComplaintCode}"]');
      if (row) row.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Select STF-001 from dropdown
    await evaluate(`(() => {
      const select = document.querySelector('[data-testid="staff-selection-dropdown"]');
      if (select) {
        select.value = 'STF-001';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 300));

    // Click Assign Selected Staff Member
    await evaluate(`(() => {
      const assignBtn = document.querySelector('[data-testid="assign-staff-btn"]');
      if (assignBtn) assignBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const afterAssign = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(afterAssign?.status.toUpperCase() === 'ASSIGNED', `Status updated to ASSIGNED (got: ${afterAssign?.status})`);
    assert(afterAssign?.assignedStaff === 'Rajesh Kumar', `Assigned staff recorded as Rajesh Kumar (got: ${afterAssign?.assignedStaff})`);
    assert(afterAssign?.assignedStaffId === 'STF-001', `Assigned staff code recorded as STF-001 (got: ${afterAssign?.assignedStaffId})`);
    assert(!!afterAssign?.assignedAt, `Recorded assignedAt timestamp: ${afterAssign?.assignedAt}`);

    const assignLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'STAFF_ASSIGNED' && l.target === '${primaryComplaintCode}');
    })()`);
    assert(!!assignLog, 'STAFF_ASSIGNED logged in Activity Log');

    // -------------------------------------------------------------------------
    // TEST 5: Allow Admin to Reassign Cleaning Staff (Requirement 10)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 5: Reassign cleaning staff to Sunita Devi (STF-002)');
    await evaluate(`(() => {
      const toggleReassign = document.querySelector('[data-testid="toggle-reassign-btn"]');
      if (toggleReassign) toggleReassign.click();
    })()`);
    await new Promise(r => setTimeout(r, 300));

    await evaluate(`(() => {
      const reassignSelect = document.querySelector('[data-testid="reassign-staff-select"]');
      if (reassignSelect) {
        reassignSelect.value = 'STF-002';
        reassignSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const confirmReassign = document.querySelector('[data-testid="confirm-reassign-btn"]');
      if (confirmReassign) confirmReassign.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const afterReassign = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(afterReassign?.assignedStaff === 'Sunita Devi', `Staff successfully reassigned to Sunita Devi (got: ${afterReassign?.assignedStaff})`);
    assert(afterReassign?.assignedStaffId === 'STF-002', `Staff code updated to STF-002 (got: ${afterReassign?.assignedStaffId})`);

    const reassignLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'STAFF_REASSIGNED' && l.target === '${primaryComplaintCode}');
    })()`);
    assert(!!reassignLog, 'STAFF_REASSIGNED logged in Activity Log');

    // -------------------------------------------------------------------------
    // TEST 6: Update Complaint Status to IN PROGRESS (Requirement 4)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 6: Advance status to IN PROGRESS');
    await evaluate(`(() => {
      const inProgBtn = document.querySelector('[data-status-btn="IN PROGRESS"]');
      if (inProgBtn) inProgBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const afterInProg = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(afterInProg?.status.toUpperCase() === 'IN PROGRESS', `Status is IN PROGRESS (got: ${afterInProg?.status})`);

    const progressLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'CLEANING_IN_PROGRESS' && l.target === '${primaryComplaintCode}');
    })()`);
    assert(!!progressLog, 'CLEANING_IN_PROGRESS logged in Activity Log');

    // -------------------------------------------------------------------------
    // TEST 7: Require Photograph - Resolution Blocked Without Photo (Req 5 & 6)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 7: Verify resolution is strictly BLOCKED without after-cleaning photo');
    await evaluate(`(() => {
      const markResolvedBtn = document.querySelector('[data-testid="mark-resolved-btn"]');
      if (markResolvedBtn) markResolvedBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    // Verify complaint is STILL IN PROGRESS and NOT resolved!
    const blockedCheck = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(blockedCheck?.status.toUpperCase() === 'IN PROGRESS', `Status remained IN PROGRESS (resolution blocked without photo)`);
    assert(!blockedCheck?.resolvedAt, `resolvedAt timestamp is NOT set`);

    const hasErrorBanner = await evaluate(`(() => {
      const banner = document.querySelector('[data-testid="resolution-error-banner"]');
      return banner ? banner.innerText : null;
    })()`);
    assert(hasErrorBanner && hasErrorBanner.includes('Resolution Blocked'), `Error banner displayed: "${hasErrorBanner}"`);

    // -------------------------------------------------------------------------
    // TEST 8: Upload Photo & Complete Resolution (Requirements 4, 5, 6, 7)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 8: Upload after-cleaning photo and mark RESOLVED');
    const samplePhotoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      const idx = comps.findIndex(c => c.id === '${primaryComplaintId}');
      if (idx !== -1) {
        comps[idx].afterCleaningPhotoUrl = '${samplePhotoDataUrl}';
        localStorage.setItem('hailo_v3_complaints', JSON.stringify(comps));
      }
    })()`);
    await navigateTo('http://localhost:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 600));

    // Select row
    await evaluate(`(() => {
      const row = document.querySelector('[data-complaint-row="${primaryComplaintCode}"]');
      if (row) row.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // Click Verify & Mark Complaint RESOLVED
    await evaluate(`(() => {
      const markResolvedBtn = document.querySelector('[data-testid="mark-resolved-btn"]');
      if (markResolvedBtn) markResolvedBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 700));

    const afterResolve = await evaluate(`(() => {
      const comps = JSON.parse(localStorage.getItem('hailo_v3_complaints') || '[]');
      return comps.find(c => c.id === '${primaryComplaintId}');
    })()`);
    assert(afterResolve?.status.toUpperCase() === 'RESOLVED', `Status updated to RESOLVED (got: ${afterResolve?.status})`);
    assert(!!afterResolve?.resolvedAt, `Recorded actual completion timestamp: ${afterResolve?.resolvedAt}`);
    assert(afterResolve?.assignedStaff === 'Sunita Devi', `Assigned staff recorded upon resolution: ${afterResolve?.assignedStaff}`);
    assert(!!afterResolve?.afterCleaningPhotoUrl, 'After-cleaning verification photograph retained with record');

    const resolveLog = await evaluate(`(() => {
      const logs = JSON.parse(localStorage.getItem('hailo_v3_activity') || '[]');
      return logs.find(l => l.action === 'COMPLAINT_RESOLVED' && l.target === '${primaryComplaintCode}');
    })()`);
    assert(!!resolveLog, 'COMPLAINT_RESOLVED logged in Activity Log');

    // -------------------------------------------------------------------------
    // TEST 9: Bin Monitoring Synchronization & Collection History (Req 8 & 9)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 9: Verify bin fill level reset & collection history log');
    const binData = await evaluate(`(() => {
      const bins = JSON.parse(localStorage.getItem('hailo_v3_bins') || '[]');
      return bins.find(b => b.binCode === 'BIN-002');
    })()`);
    assert(binData?.currentFillLevel === 0, `Target bin BIN-002 fill level reset to 0% (got: ${binData?.currentFillLevel}%)`);
    assert(binData?.status === 'NORMAL', `Target bin status reset to NORMAL (got: ${binData?.status})`);

    const latestCollection = binData?.collections?.[0];
    assert(latestCollection !== undefined, 'New collection record logged in bin.collections');
    assert(latestCollection?.collectorName === 'Sunita Devi', `Collector recorded as assigned staff Sunita Devi (got: ${latestCollection?.collectorName})`);
    assert(typeof latestCollection?.amountKg === 'number' && latestCollection.amountKg > 0, `Amount collected in Kg recorded (${latestCollection?.amountKg} kg)`);

    // -------------------------------------------------------------------------
    // TEST 10: Customer Portal Synchronisation (Req 8)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 10: Synchronisation in Customer Dashboard & Incident Reports');
    await navigateTo('http://localhost:3000/login');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const customerBtn = btns.find(b => b.innerText.includes('Enter Customer Dashboard'));
      if (customerBtn) customerBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    // Check customer dashboard counters
    const dashboardHtml = await evaluate(`document.body.innerText`);
    assert(dashboardHtml.includes('RESOLVED') || dashboardHtml.includes('Resolved'), 'Customer dashboard shows resolved state');
    assert(dashboardHtml.includes('Sunita Devi'), 'Customer dashboard table displays assigned staff Sunita Devi');

    // Check Customer Reports detail modal
    await navigateTo('http://localhost:3000/customer/reports');
    await new Promise(r => setTimeout(r, 700));

    // Open detail modal for the complaint
    await evaluate(`(() => {
      const card = document.querySelector('[data-report-card="${primaryComplaintCode}"]');
      if (card) card.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const modalText = await evaluate(`document.body.innerText`);
    assert(modalText.includes('Sunita Devi'), 'Customer detail modal shows assigned cleaning personnel Sunita Devi');
    assert(modalText.includes('The waste has been collected successfully'), 'Customer detail modal shows resolution verification');
    assert(modalText.toLowerCase().includes('after-cleaning verification photograph'), 'Customer detail modal displays After-Cleaning Verification Photo section');

    // -------------------------------------------------------------------------
    // TEST 11: System Activity Audit Log (Req 8)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 11: Activity Log Page Audit Trail');
    await navigateTo('http://localhost:3000/admin/activity');
    await new Promise(r => setTimeout(r, 600));

    const activityText = await evaluate(`document.body.innerText`);
    assert(activityText.includes('COMPLAINT_ACCEPTED'), 'Activity log displays COMPLAINT_ACCEPTED event');
    assert(activityText.includes('STAFF_ASSIGNED'), 'Activity log displays STAFF_ASSIGNED event');
    assert(activityText.includes('STAFF_REASSIGNED'), 'Activity log displays STAFF_REASSIGNED event');
    assert(activityText.includes('CLEANING_IN_PROGRESS'), 'Activity log displays CLEANING_IN_PROGRESS event');
    assert(activityText.includes('COMPLAINT_RESOLVED'), 'Activity log displays COMPLAINT_RESOLVED event');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`🏁 TEST COMPLETE: ${passedTests}/${totalTests} assertions passed.`);
    if (consoleErrors.length > 0) {
      console.log(`⚠️ Console errors during test run:`, consoleErrors);
    }
    console.log(`======================================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL CLEANING WORKFLOW REQUIREMENTS VERIFIED SUCCESSFULLY!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test suite crashed with error:', err);
    process.exit(1);
  } finally {
    ws.close();
    chrome.kill();
  }
}

runTests();
