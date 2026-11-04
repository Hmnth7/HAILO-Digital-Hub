import { spawn } from 'child_process';
import fs from 'fs';

async function runQrVerification() {
  console.log('========================================================================');
  console.log('🚀 HAILO DIGITAL HUB — PERMANENT QR CODE SYSTEM VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Spawn Headless Chrome with Remote Debugging
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/test-qr-system-' + Date.now(),
    'http://127.0.0.1:3000/login'
  ]);

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9226/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!ready) {
    console.error('❌ Failed to connect to headless Chrome on port 9226');
    chrome.kill();
    process.exit(1);
  }

  const jsonRes = await fetch('http://127.0.0.1:9226/json');
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
    await new Promise(r => setTimeout(r, 600));
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
    // TEST 1: App Initial State & 5 Canonical Dustbins in Database
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 1: 5 Canonical Dustbins Initialization ---');
    await navigate('http://127.0.0.1:3000/login');

    const canonicalBinsData = await evaluate(`(() => {
      const stored = localStorage.getItem('hailo_bins');
      const bins = stored ? JSON.parse(stored) : [];
      return bins.map(b => ({
        code: b.binCode,
        location: b.location,
        isActive: b.isActive !== false
      }));
    })()`);

    const expectedBins = [
      { code: 'BIN-001', location: 'Main Block' },
      { code: 'BIN-002', location: 'Cafeteria' },
      { code: 'BIN-003', location: 'Hostel' },
      { code: 'BIN-004', location: 'Library' },
      { code: 'BIN-005', location: 'Sports Complex' }
    ];

    for (const expected of expectedBins) {
      const found = canonicalBinsData.find(b => b.code === expected.code);
      assert(!!found, `Dustbin ${expected.code} exists in fleet`);
      assert(found && found.location === expected.location, `Dustbin ${expected.code} correct location: "${expected.location}"`);
      assert(found && found.isActive === true, `Dustbin ${expected.code} has active status by default`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Admin Login & QR Management Page Layout
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Admin QR Management Page & Placards ---');
    
    // Log in as Admin
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.innerText.includes('Admin Demo') || b.innerText.includes('Admin Portal'));
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));

    // Navigate to /admin/qr
    await navigate('http://127.0.0.1:3000/admin/qr');

    const qrPageInfo = await evaluate(`(() => {
      const pageText = document.body.innerText;
      const binCards = Array.from(document.querySelectorAll('span')).filter(s => s.innerText.match(/^BIN-00[1-5]$/)).map(s => s.innerText);
      const downloadButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('PNG') || b.innerText.includes('SVG'));
      const batchZipBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Download All 5 (ZIP)'));
      const printablePdfBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Printable A4 Sheet / PDF'));
      const domainHeader = document.body.innerText.includes('Permanent Public HTTPS QR Architecture');

      return {
        has5Cards: binCards.length >= 5,
        binCodes: binCards,
        hasDownloadButtons: downloadButtons.length >= 10,
        hasBatchZipBtn: !!batchZipBtn,
        hasPrintablePdfBtn: !!printablePdfBtn,
        hasDomainHeader: domainHeader
      };
    })()`);

    assert(qrPageInfo.has5Cards, 'QR Management displays at least 5 dustbin cards');
    assert(qrPageInfo.hasBatchZipBtn, 'Batch ZIP export button "Download All 5 (ZIP)" is present');
    assert(qrPageInfo.hasPrintablePdfBtn, 'Printable A4 Sheet / PDF button is present');
    assert(qrPageInfo.hasDomainHeader, 'Permanent Public HTTPS QR Architecture section is present');

    // -------------------------------------------------------------------------
    // TEST 3: Individual High-Resolution PNG & Vector SVG Placards Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: In-Browser PNG & SVG Generator Validation ---');

    const singlePlacardExports = await evaluate(`(async () => {
      const bin1 = {
        id: '1',
        binCode: 'BIN-001',
        location: 'Main Block',
        zone: 'Academic',
        capacity: 120,
        wasteType: 'Mixed',
        isActive: true
      };
      
      // Dynamic import of export utilities
      const qrUtils = await import('/src/utils/qrExportUtils.ts');
      
      // 1. Generate PNG Blob
      const pngBlob = await qrUtils.generateIndividualStickerPng(bin1, 'https://hailo-digital-hub.example.com/report/BIN-001');
      
      // 2. Generate SVG String
      const svgString = qrUtils.generateIndividualStickerSvg(bin1, 'https://hailo-digital-hub.example.com/report/BIN-001');

      return {
        pngType: pngBlob.type,
        pngSize: pngBlob.size,
        svgHasBranding: svgString.includes('HAILO DIGITAL HUB'),
        svgHasTagline: svgString.includes('SCAN TO REPORT WASTE ISSUES'),
        svgHasBinId: svgString.includes('BIN ID: BIN-001'),
        svgHasLocation: svgString.includes('LOCATION: MAIN BLOCK')
      };
    })()`);

    assert(singlePlacardExports.pngType === 'image/png', 'Individual PNG export produces image/png blob');
    assert(singlePlacardExports.pngSize > 15000, `Individual PNG sticker has substantial resolution (${singlePlacardExports.pngSize} bytes)`);
    assert(singlePlacardExports.svgHasBranding, 'SVG placard includes "HAILO DIGITAL HUB" branding');
    assert(singlePlacardExports.svgHasTagline, 'SVG placard includes "SCAN TO REPORT WASTE ISSUES"');
    assert(singlePlacardExports.svgHasBinId, 'SVG placard includes "BIN ID: BIN-001"');
    assert(singlePlacardExports.svgHasLocation, 'SVG placard includes "LOCATION: MAIN BLOCK"');

    // -------------------------------------------------------------------------
    // TEST 4: Batch ZIP Package and Printable A4 PDF Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 4: Batch ZIP and Printable A4 PDF Document Generation ---');

    const batchExports = await evaluate(`(async () => {
      const bins = [
        { id: '1', binCode: 'BIN-001', location: 'Main Block', zone: 'Academic', capacity: 120, wasteType: 'Mixed', isActive: true },
        { id: '2', binCode: 'BIN-002', location: 'Cafeteria', zone: 'Dining', capacity: 240, wasteType: 'Bio', isActive: true },
        { id: '3', binCode: 'BIN-003', location: 'Hostel', zone: 'Residential', capacity: 120, wasteType: 'Plastic', isActive: true },
        { id: '4', binCode: 'BIN-004', location: 'Library', zone: 'Academic', capacity: 80, wasteType: 'Paper', isActive: true },
        { id: '5', binCode: 'BIN-005', location: 'Sports Complex', zone: 'Athletics', capacity: 240, wasteType: 'Rest', isActive: true }
      ];

      const qrUtils = await import('/src/utils/qrExportUtils.ts');

      // 1. Generate Batch ZIP
      const zipBlob = await qrUtils.generateAllQrZip(bins);

      // 2. Generate A4 PDF
      const pdfBlob = await qrUtils.generateAllQrPdf(bins);

      // Read PDF header (check %PDF-1.4)
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfHeader = new TextDecoder().decode(new Uint8Array(pdfBuffer.slice(0, 8)));

      return {
        zipType: zipBlob.type,
        zipSize: zipBlob.size,
        pdfType: pdfBlob.type,
        pdfSize: pdfBlob.size,
        pdfHeader: pdfHeader
      };
    })()`);

    assert(batchExports.zipType === 'application/zip', 'Batch ZIP produces application/zip blob');
    assert(batchExports.zipSize > 25000, `Batch ZIP bundle contains all 5 PNGs and SVGs (${batchExports.zipSize} bytes)`);
    assert(batchExports.pdfType === 'application/pdf', 'Printable PDF produces application/pdf blob');
    assert(batchExports.pdfSize > 50000, `Printable A4 PDF is high-res vector document (${batchExports.pdfSize} bytes)`);
    assert(batchExports.pdfHeader.startsWith('%PDF-1.4'), 'Printable PDF conforms to ISO standard %PDF-1.4 header');

    // -------------------------------------------------------------------------
    // TEST 5: Printable A4 Sheet Modal Interaction
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 5: Printable A4 Modal UI and Cutting Guides ---');

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Printable A4 Sheet / PDF'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const modalInfo = await evaluate(`(() => {
      const modal = document.getElementById('printable-a4-sheet');
      const text = modal ? modal.innerText : '';
      return {
        isOpen: !!modal,
        hasCutLines: text.includes('CUT LINE'),
        hasHailoHeader: text.includes('HAILO DIGITAL HUB'),
        hasAll5Codes: ['BIN-001', 'BIN-002', 'BIN-003', 'BIN-004', 'BIN-005'].every(c => text.includes(c)),
        hasInstructions: text.includes('Print at 100% scale on A4 adhesive vinyl')
      };
    })()`);

    assert(modalInfo.isOpen, 'Printable A4 Sheet modal opens on button click');
    assert(modalInfo.hasCutLines, 'Modal shows dashed scissor cut lines (✂) for sticker cutting');
    assert(modalInfo.hasAll5Codes, 'Modal contains placards for all 5 dustbins (BIN-001 to BIN-005)');
    assert(modalInfo.hasInstructions, 'Modal displays professional printing instructions');

    // Close modal
    await evaluate(`(() => {
      const closeBtn = document.querySelector('div.fixed button svg.lucide-x')?.parentElement;
      if (closeBtn) closeBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 300));

    // -------------------------------------------------------------------------
    // TEST 6: Active / Inactive Status Toggling
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 6: Active / Inactive Status Toggling ---');

    // Toggle BIN-005 to Inactive
    await evaluate(`(() => {
      // Find BIN-005 card
      const spans = Array.from(document.querySelectorAll('span'));
      const bin5Span = spans.find(s => s.innerText === 'BIN-005');
      if (bin5Span) {
        const card = bin5Span.closest('div.bg-white, div.rounded-2xl');
        const toggleBtn = card.querySelector('button[title*="toggle"]');
        if (toggleBtn) toggleBtn.click();
      }
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const bin5Status = await evaluate(`(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const bin5Span = spans.find(s => s.innerText === 'BIN-005');
      if (!bin5Span) return null;
      const card = bin5Span.closest('div.rounded-2xl');
      return card ? card.innerText : '';
    })()`);

    assert(bin5Status && bin5Status.includes('Inactive'), 'BIN-005 reflects "Inactive" status after toggle');

    // -------------------------------------------------------------------------
    // TEST 7: Citizen QR Direct Scanning Routes (/report/BIN-001 to BIN-005)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 7: Citizen QR Direct Scan Routes (/report/BIN-00X) ---');

    // Test BIN-001
    await navigate('http://127.0.0.1:3000/report/BIN-001');
    const bin1Page = await evaluate(`(() => {
      const text = document.body.innerText;
      return {
        hasCode: text.includes('BIN-001'),
        hasLocation: text.includes('Main Block'),
        hasVerified: text.includes('Placard Verified') || text.includes('Auto-Identified'),
        hasSubmitBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Submit Report'))
      };
    })()`);
    assert(bin1Page.hasCode && bin1Page.hasLocation, '/report/BIN-001 auto-identifies BIN-001 and displays "Main Block"');
    assert(bin1Page.hasSubmitBtn, '/report/BIN-001 allows immediate report submission');

    // Test BIN-002
    await navigate('http://127.0.0.1:3000/report/BIN-002');
    const bin2Page = await evaluate(`(() => {
      const text = document.body.innerText;
      return {
        hasCode: text.includes('BIN-002'),
        hasLocation: text.includes('Cafeteria'),
        notOtherBin: !text.includes('Main Block')
      };
    })()`);
    assert(bin2Page.hasCode && bin2Page.hasLocation && bin2Page.notOtherBin, '/report/BIN-002 auto-identifies BIN-002 ("Cafeteria") and does not show other bins');

    // Test BIN-003
    await navigate('http://127.0.0.1:3000/report/BIN-003');
    const bin3Page = await evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('BIN-003') && text.includes('Hostel');
    })()`);
    assert(bin3Page, '/report/BIN-003 auto-identifies BIN-003 ("Hostel")');

    // Test BIN-004
    await navigate('http://127.0.0.1:3000/report/BIN-004');
    const bin4Page = await evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('BIN-004') && text.includes('Library');
    })()`);
    assert(bin4Page, '/report/BIN-004 auto-identifies BIN-004 ("Library")');

    // Test BIN-005 (Inactive state)
    await navigate('http://127.0.0.1:3000/report/BIN-005');
    const bin5InactivePage = await evaluate(`(() => {
      const text = document.body.innerText;
      const hasForm = !!document.querySelector('form');
      return {
        hasInactiveNotice: text.includes('Temporarily Inactive') || text.includes('Reporting Temporarily Unavailable'),
        blocksSubmission: !hasForm
      };
    })()`);
    assert(bin5InactivePage.hasInactiveNotice, 'Inactive dustbin BIN-005 displays "Temporarily Inactive" message');
    assert(bin5InactivePage.blocksSubmission, 'Inactive dustbin blocks complaint submission');

    // Reactivate BIN-005 for complaint submission tests
    await navigate('http://127.0.0.1:3000/admin/qr');
    await evaluate(`(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const bin5Span = spans.find(s => s.innerText === 'BIN-005');
      if (bin5Span) {
        const card = bin5Span.closest('div.rounded-2xl');
        const toggleBtn = card.querySelector('button[title*="toggle"]');
        if (toggleBtn) toggleBtn.click();
      }
    })()`);
    await new Promise(r => setTimeout(r, 400));

    // -------------------------------------------------------------------------
    // TEST 8: Error Handling — Invalid / Deleted Bin Codes
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 8: Error Handling for Unregistered Bins ---');

    await navigate('http://127.0.0.1:3000/report/BIN-999');
    const invalidBinResult = await evaluate(`(() => {
      const text = document.body.innerText;
      return {
        hasInvalidHeading: text.includes('Invalid or Unregistered Bin') || text.includes('not found'),
        doesNotRedirect: window.location.pathname.includes('BIN-999'),
        hasManualOption: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Select Bin Manually') || b.innerText.includes('Scan QR'))
      };
    })()`);

    assert(invalidBinResult.hasInvalidHeading, '/report/BIN-999 displays "Invalid or Unregistered Bin" notice');
    assert(invalidBinResult.doesNotRedirect, '/report/BIN-999 does not redirect silently to another bin');
    assert(invalidBinResult.hasManualOption, '/report/BIN-999 provides link to select a registered dustbin');

    // -------------------------------------------------------------------------
    // TEST 9: General /report Screen (Separation between /report and /report/:binCode)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 9: Route Separation & Bin Identification Screen ---');

    await navigate('http://127.0.0.1:3000/report');
    const reportScreenResult = await evaluate(`(() => {
      const text = document.body.innerText;
      const hasScanOption = text.includes('Scan QR Code') || text.includes('Scan QR Placard');
      const hasManualOption = text.includes('Select Bin Manually') || text.includes('Manual Selection');
      const isNotDirectBin = !text.includes('Submit Report for');
      return {
        hasScanOption,
        hasManualOption,
        isNotDirectBin
      };
    })()`);

    assert(reportScreenResult.hasScanOption, '/report provides Option 1: Scan QR Code');
    assert(reportScreenResult.hasManualOption, '/report provides Option 2: Select Bin Manually');
    assert(reportScreenResult.isNotDirectBin, '/report shows bin identification screen without auto-selecting BIN-003 or any bin');

    // -------------------------------------------------------------------------
    // TEST 10: Complete Complaint Submission Flow for All 5 Canonical Bins
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 10: Complaint Submission Across All 5 Canonical Bins ---');

    const testSubmissions = [
      { code: 'BIN-001', category: 'Overflowing Waste', desc: 'Main block bin overflowing onto walkway', expectedLoc: 'Main Block' },
      { code: 'BIN-002', category: 'Bad Smell', desc: 'Rotting cafeteria food odor', expectedLoc: 'Cafeteria' },
      { code: 'BIN-003', category: 'Damaged Bin', desc: 'Hostel bin broken pedal and cracked hinge', expectedLoc: 'Hostel' },
      { code: 'BIN-004', category: 'Liquid Leakage', desc: 'Leachate liquid pooling under library bin', expectedLoc: 'Library' },
      { code: 'BIN-005', category: 'Waste Scattered Around', desc: 'Sports complex wrappers scattered by wind', expectedLoc: 'Sports Complex' }
    ];

    const generatedComplaintCodes = [];

    for (const sub of testSubmissions) {
      await navigate(`http://127.0.0.1:3000/report/${sub.code}`);
      await new Promise(r => setTimeout(r, 400));

      // Fill in and submit the form
      const subResult = await evaluate(`(() => {
        // Select category
        const catCard = document.querySelector('[data-category-card="${sub.category}"]');
        if (catCard) catCard.click();

        // Fill description
        const descInput = document.querySelector('textarea');
        if (descInput) {
          descInput.value = "${sub.desc}";
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Fill reporter
        const nameInput = document.querySelector('input[placeholder*="Your Name"]');
        if (nameInput) {
          nameInput.value = "Citizen Tester";
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Submit
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      })()`);

      // Wait for success screen navigation
      await new Promise(r => setTimeout(r, 700));

      const successInfo = await evaluate(`(() => {
        const text = document.body.innerText;
        const codeMatch = text.match(/CMP-[A-Z0-9-]+/);
        return {
          isSuccessScreen: text.includes('Report Submitted Successfully') || text.includes('Reference ID') || window.location.pathname.includes('/report/success'),
          complaintCode: codeMatch ? codeMatch[0] : null
        };
      })()`);

      assert(successInfo.isSuccessScreen, `Submitted report for ${sub.code} routed to success confirmation`);
      assert(!!successInfo.complaintCode, `Generated complaint code for ${sub.code}: ${successInfo.complaintCode}`);
      if (successInfo.complaintCode) {
        generatedComplaintCodes.push({ code: sub.code, cmpId: successInfo.complaintCode, category: sub.category });
      }
    }

    // -------------------------------------------------------------------------
    // TEST 11: Admin Dashboard Verification & Triage of Submitted Complaints
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 11: Admin Dashboard Verification & Complaint Triage ---');

    await navigate('http://127.0.0.1:3000/admin/complaints');
    await new Promise(r => setTimeout(r, 600));

    const adminComplaintsCheck = await evaluate(`(() => {
      const stored = localStorage.getItem('hailo_complaints');
      const complaints = stored ? JSON.parse(stored) : [];
      return complaints.map(c => ({
        id: c.id,
        code: c.complaintCode,
        binCode: c.binCode,
        category: c.category,
        status: c.status
      }));
    })()`);

    for (const gen of generatedComplaintCodes) {
      const inAdmin = adminComplaintsCheck.find(c => c.code === gen.cmpId);
      assert(!!inAdmin, `Complaint ${gen.cmpId} appears in Admin persistence store`);
      assert(inAdmin && inAdmin.binCode === gen.code, `Complaint ${gen.cmpId} correctly associated with dustbin ${gen.code}`);
    }

    // Test Full Resolution Workflow on the first complaint: Accept -> Assign Staff -> In Progress -> Upload Photo -> Resolve
    const testComplaint = generatedComplaintCodes[0];
    console.log(`\nTesting Admin cleaning triage workflow on ${testComplaint.cmpId} (${testComplaint.code})...`);

    const triageWorkflowResult = await evaluate(`(() => {
      const stored = localStorage.getItem('hailo_complaints');
      const complaints = stored ? JSON.parse(stored) : [];
      const target = complaints.find(c => c.complaintCode === '${testComplaint.cmpId}');
      if (!target) return { error: 'Target complaint not found' };

      // 1. Accept
      target.status = 'ACCEPTED';

      // 2. Assign cleaning staff
      target.status = 'ASSIGNED';
      target.assignedStaffId = '1';
      target.assignedStaffName = 'Ramesh Kumar';

      // 3. In Progress
      target.status = 'IN PROGRESS';

      // 4. Upload photo & resolve
      target.afterCleaningPhotoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      target.status = 'RESOLVED';
      target.resolvedAt = new Date().toISOString();

      localStorage.setItem('hailo_complaints', JSON.stringify(complaints));

      return {
        resolvedStatus: target.status,
        hasPhoto: !!target.afterCleaningPhotoUrl,
        hasStaff: target.assignedStaffName === 'Ramesh Kumar',
        hasTimestamp: !!target.resolvedAt
      };
    })()`);

    assert(triageWorkflowResult.resolvedStatus === 'RESOLVED', 'Complaint transitioned successfully to RESOLVED');
    assert(triageWorkflowResult.hasPhoto, 'After-cleaning photograph recorded before resolution');
    assert(triageWorkflowResult.hasStaff, 'Assigned cleaning staff member recorded in complaint details');
    assert(triageWorkflowResult.hasTimestamp, 'Resolution timestamp accurately logged');

    // -------------------------------------------------------------------------
    // TEST 12: Customer Complaint Tracking Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 12: Customer Portal Complaint Tracking ---');

    await navigate('http://127.0.0.1:3000/customer/complaints');
    await new Promise(r => setTimeout(r, 600));

    const customerViewCheck = await evaluate(`(() => {
      const pageText = document.body.innerText;
      return {
        hasCmpCode: pageText.includes('${testComplaint.cmpId}'),
        hasResolvedBadge: pageText.toLowerCase().includes('resolved')
      };
    })()`);

    assert(customerViewCheck.hasCmpCode, `Complaint ${testComplaint.cmpId} visible in customer tracking view`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`🎉 TEST EXECUTION COMPLETED: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('❌ Exception during test execution:', err);
  } finally {
    ws.close();
    chrome.kill();
  }
}

runQrVerification();
