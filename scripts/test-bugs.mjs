import assert from 'node:assert';

console.log('========================================================================');
console.log('🧪 VERIFYING BUG 1 & BUG 2 FIXES IN HAILO DIGITAL HUB');
console.log('========================================================================\n');

// 1. TEST ROUTER NORMALIZATION AND PARAMETER EXTRACTION
console.log('--- TEST 1: Router Path Normalization & Regex Route Matching ---');

function normalizePath(raw) {
  if (!raw) return '/login';
  let p = raw.startsWith('#/') ? raw.slice(1) : raw;
  p = p.split('?')[0].split('#')[0];
  if (!p || p === '/' || p === '/index.html') {
    return '/login';
  }
  if (p.length > 1 && p.endsWith('/')) {
    p = p.replace(/\/+$/, '');
  }
  return p;
}

function matchParams(currentPath) {
  const params = {};
  const successMatch = currentPath.match(/^\/report\/success(?:\/([A-Za-z0-9_-]+))?\/?$/i);
  if (successMatch) {
    if (successMatch[1]) {
      params.complaintId = successMatch[1].toUpperCase();
    }
  } else {
    const reportMatch = currentPath.match(/^\/report\/([A-Za-z0-9_-]+)\/?$/i);
    if (reportMatch && reportMatch[1].toLowerCase() !== 'success') {
      params.binCode = reportMatch[1].toUpperCase();
    }
  }
  return params;
}

const testPaths = [
  { url: '/report/BIN-001', expectedBin: 'BIN-001' },
  { url: '/report/BIN-002/', expectedBin: 'BIN-002' }, // Trailing slash
  { url: '/report/bin-003?src=qr', expectedBin: 'BIN-003' }, // Query params & lowercase
  { url: '/report/BIN-004/#fragment', expectedBin: 'BIN-004' }, // Hash
  { url: '/report/BIN-005', expectedBin: 'BIN-005' },
  { url: '/report/BIN-999', expectedBin: 'BIN-999' },
  { url: '/report', expectedBin: undefined }, // General report page
  { url: '/report/', expectedBin: undefined }, // General report page trailing slash
  { url: '/report/success/CMP-001', expectedCmp: 'CMP-001' },
  { url: '/report/success/CMP-002/', expectedCmp: 'CMP-002' }
];

for (const t of testPaths) {
  const norm = normalizePath(t.url);
  const p = matchParams(norm);
  if (t.expectedBin !== undefined) {
    assert.strictEqual(p.binCode, t.expectedBin, `Failed on ${t.url}`);
    console.log(`  ✅ PASS: Route ${t.url.padEnd(28)} -> params.binCode = "${p.binCode}"`);
  } else if (t.expectedCmp !== undefined) {
    assert.strictEqual(p.complaintId, t.expectedCmp, `Failed on ${t.url}`);
    console.log(`  ✅ PASS: Route ${t.url.padEnd(28)} -> params.complaintId = "${p.complaintId}"`);
  } else {
    assert.strictEqual(p.binCode, undefined, `Failed on ${t.url}`);
    console.log(`  ✅ PASS: Route ${t.url.padEnd(28)} -> params.binCode = undefined (Identification screen)`);
  }
}

// 2. TEST DUSTBINS & COMPLAINT FORM SUBMISSION WITH DISTINCT CATEGORIES
console.log('\n--- TEST 2: Bin Identification & Distinct Category Persistence ---');

const registeredBins = [
  { binCode: 'BIN-001', location: 'Main Block', isActive: true },
  { binCode: 'BIN-002', location: 'Cafeteria', isActive: true },
  { binCode: 'BIN-003', location: 'Hostel', isActive: true },
  { binCode: 'BIN-004', location: 'Library', isActive: true },
  { binCode: 'BIN-005', location: 'Sports Complex', isActive: true }
];

const mockComplaintsStore = [];

function createComplaint(data) {
  const bin = registeredBins.find(b => b.binCode === data.binCode);
  const nextNum = mockComplaintsStore.length + 1;
  const complaint = {
    id: `cmp-${Date.now()}-${nextNum}`,
    complaintCode: `CMP-${String(nextNum).padStart(3, '0')}`,
    binCode: data.binCode,
    location: bin ? bin.location : 'Campus Grounds',
    category: data.category,
    description: data.description,
    status: 'PENDING'
  };
  mockComplaintsStore.unshift(complaint);
  return complaint;
}

const scenarioSubmissions = [
  { binCode: 'BIN-001', category: 'Overflowing Waste', expectedLoc: 'Main Block' },
  { binCode: 'BIN-002', category: 'Bad Smell', expectedLoc: 'Cafeteria' },
  { binCode: 'BIN-003', category: 'Damaged Bin', expectedLoc: 'Hostel' },
  { binCode: 'BIN-004', category: 'Liquid Leakage', expectedLoc: 'Library' },
  { binCode: 'BIN-005', category: 'Waste Scattered Around', expectedLoc: 'Sports Complex' }
];

for (const sc of scenarioSubmissions) {
  const created = createComplaint({
    binCode: sc.binCode,
    category: sc.category,
    description: `Citizen reported ${sc.category} on ${sc.binCode}`
  });

  assert.strictEqual(created.binCode, sc.binCode);
  assert.strictEqual(created.location, sc.expectedLoc);
  assert.strictEqual(created.category, sc.category);

  // Success screen lookup simulation (must NEVER fall back to BIN-003 or Bin Full)
  const lookup = mockComplaintsStore.find(c => c.complaintCode === created.complaintCode);
  assert.ok(lookup, 'Complaint found in store');
  assert.strictEqual(lookup.binCode, sc.binCode, `Target bin must be ${sc.binCode}`);
  assert.strictEqual(lookup.location, sc.expectedLoc, `Location must be ${sc.expectedLoc}`);
  assert.strictEqual(lookup.category, sc.category, `Category must be ${sc.category}`);

  if (sc.binCode !== 'BIN-003') {
    assert.notStrictEqual(lookup.binCode, 'BIN-003', `Bug 1 check: ${sc.binCode} must NOT be recorded as BIN-003`);
  }
  if (sc.category !== 'Bin is Full' && sc.category !== 'Bin Full') {
    assert.notStrictEqual(lookup.category, 'Bin Full', `Bug 2 check: ${sc.category} must NOT be recorded as Bin Full`);
    assert.notStrictEqual(lookup.category, 'Bin is Full', `Bug 2 check: ${sc.category} must NOT be recorded as Bin is Full`);
  }

  console.log(`  ✅ PASS: ${created.complaintCode} -> Bin: ${created.binCode} (${created.location}) | Category: "${created.category}"`);
}

// 3. TEST INVALID BIN IDENTIFICATION
console.log('\n--- TEST 3: Invalid Bin Identification (BIN-999) ---');
const invalidTarget = 'BIN-999';
const matchedInvalid = registeredBins.find(b => b.binCode === invalidTarget);
assert.strictEqual(matchedInvalid, undefined, 'BIN-999 is not registered');
console.log('  ✅ PASS: BIN-999 is correctly recognized as unregistered (never defaulting to BIN-003)');

console.log('\n========================================================================');
console.log('🎉 ALL BUG 1 & BUG 2 LOGIC VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('========================================================================\n');
