import { 
  Bin, 
  BinStatus, 
  Complaint, 
  ComplaintCategory, 
  ComplaintPriority, 
  EVVehicle,
  CollectionTask,
  FeedbackItem,
  AdminActivity,
  WasteType,
  User,
  CleaningStaff 
} from '../types';
import { getBinQrUrl } from '../utils/qrConfig';

export function calculateBinStatus(fillLevel: number): BinStatus {
  if (fillLevel >= 100) return 'OVERFLOW';
  if (fillLevel >= 95) return 'FULL';
  if (fillLevel >= 80) return 'ALMOST_FULL';
  if (fillLevel >= 60) return 'APPROACHING_FULL';
  return 'NORMAL';
}

/**
 * Standard Category to Priority Mapping
 */
export function getPriorityForCategory(cat: ComplaintCategory | string): ComplaintPriority {
  const normalized = cat.trim().toLowerCase();
  if (normalized.includes('overflowing') || normalized.includes('overflow')) return 'CRITICAL';
  if (normalized.includes('hazardous')) return 'CRITICAL';
  if (normalized.includes('full')) return 'HIGH';
  if (normalized.includes('leakage') || normalized.includes('liquid')) return 'HIGH';
  if (normalized.includes('smell') || normalized.includes('odor')) return 'MEDIUM';
  if (normalized.includes('cleaning') || normalized.includes('clean')) return 'MEDIUM';
  if (normalized.includes('damaged') || normalized.includes('broken')) return 'MEDIUM';
  if (normalized.includes('scattered')) return 'MEDIUM';
  return 'LOW';
}

export function calculateDistanceCm(fillLevel: number, sensorMountHeightCm = 100): number {
  const distance = Math.max(3, Math.round(sensorMountHeightCm * (1 - fillLevel / 100)));
  return distance;
}

export const initialUsers: User[] = [
  {
    id: 'user-admin',
    name: 'Admin Supervisor',
    email: 'admin@hailo.digitalhub.ac',
    role: 'ADMIN',
    phone: '+91 98765 00001'
  },
  {
    id: 'user-customer-1',
    name: 'Rahul Verma',
    email: 'rahul.verma@campus.edu',
    role: 'CUSTOMER',
    phone: '+91 98765 43210'
  }
];

export const initialRegisteredStaff: CleaningStaff[] = [
  {
    id: 'stf-001',
    staffCode: 'STF-001',
    name: 'Rajesh Kumar',
    phone: '+91 98765 11001',
    zone: 'Academic Zone (Main Block / Library)',
    shift: 'Morning',
    status: 'Available'
  },
  {
    id: 'stf-002',
    staffCode: 'STF-002',
    name: 'Sunita Devi',
    phone: '+91 98765 11002',
    zone: 'Food & Dining Zone (Cafeteria)',
    shift: 'Morning',
    status: 'Available'
  },
  {
    id: 'stf-003',
    staffCode: 'STF-003',
    name: 'Amit Sharma',
    phone: '+91 98765 11003',
    zone: 'Residential Zone (Hostels)',
    shift: 'Afternoon',
    status: 'Available'
  },
  {
    id: 'stf-004',
    staffCode: 'STF-004',
    name: 'Priya Singh',
    phone: '+91 98765 11004',
    zone: 'Recreation Zone (Sports Complex)',
    shift: 'Evening',
    status: 'Available'
  },
  {
    id: 'stf-005',
    staffCode: 'STF-005',
    name: 'Vikram Patel',
    phone: '+91 98765 11005',
    zone: 'Campus Perimeter & General Maintenance',
    shift: 'Morning',
    status: 'Available'
  }
];

/**
 * Core 5 Smart Dustbins
 * Maintained as the canonical foundation of the HAILO IoT grid.
 * QR URLs are strictly generated using the permanent public HTTPS URL.
 */
export const initialActiveBins: Bin[] = [
  {
    id: 'bin-001',
    binCode: 'BIN-001',
    location: 'Main Block',
    zone: 'Academic Block',
    latitude: 12.9716,
    longitude: 77.5946,
    wasteType: 'Mixed',
    capacity: 100,
    currentFillLevel: 35,
    status: 'NORMAL',
    lastUpdated: 'Hardware active',
    lastCollection: 'No collections recorded yet',
    sensorDistanceCm: 65,
    batteryLevel: 96,
    temperatureC: 24,
    qrUrl: getBinQrUrl('BIN-001'),
    createdAt: '2026-10-01T08:00:00Z',
    fillHistory: [],
    collections: [],
    isActive: true
  },
  {
    id: 'bin-002',
    binCode: 'BIN-002',
    location: 'Cafeteria',
    zone: 'Amenities',
    latitude: 12.9724,
    longitude: 77.5953,
    wasteType: 'Bio',
    capacity: 120,
    currentFillLevel: 68,
    status: 'APPROACHING_FULL',
    lastUpdated: 'Hardware active',
    lastCollection: 'No collections recorded yet',
    sensorDistanceCm: 38,
    batteryLevel: 94,
    temperatureC: 25,
    qrUrl: getBinQrUrl('BIN-002'),
    createdAt: '2026-10-01T08:00:00Z',
    fillHistory: [],
    collections: [],
    isActive: true
  },
  {
    id: 'bin-003',
    binCode: 'BIN-003',
    location: 'Hostel',
    zone: 'Hostels',
    latitude: 12.9732,
    longitude: 77.5960,
    wasteType: 'Mixed',
    capacity: 100,
    currentFillLevel: 94, // 94% FULL - target bin for hardware sensor & emergency dispatch testbench
    status: 'FULL',
    lastUpdated: 'Live sensor reading',
    lastCollection: 'No collections recorded yet',
    sensorDistanceCm: 6,
    batteryLevel: 91,
    temperatureC: 26,
    qrUrl: getBinQrUrl('BIN-003'),
    createdAt: '2026-10-01T08:00:00Z',
    fillHistory: [],
    collections: [],
    isActive: true
  },
  {
    id: 'bin-004',
    binCode: 'BIN-004',
    location: 'Library',
    zone: 'Academic Block',
    latitude: 12.9740,
    longitude: 77.5967,
    wasteType: 'Paper',
    capacity: 80,
    currentFillLevel: 40,
    status: 'NORMAL',
    lastUpdated: 'Hardware active',
    lastCollection: 'No collections recorded yet',
    sensorDistanceCm: 60,
    batteryLevel: 98,
    temperatureC: 23,
    qrUrl: getBinQrUrl('BIN-004'),
    createdAt: '2026-10-01T08:00:00Z',
    fillHistory: [],
    collections: [],
    isActive: true
  },
  {
    id: 'bin-005',
    binCode: 'BIN-005',
    location: 'Sports Complex',
    zone: 'Sports',
    latitude: 12.9748,
    longitude: 77.5974,
    wasteType: 'Plastic',
    capacity: 80,
    currentFillLevel: 80,
    status: 'ALMOST_FULL',
    lastUpdated: 'Hardware active',
    lastCollection: 'No collections recorded yet',
    sensorDistanceCm: 20,
    batteryLevel: 93,
    temperatureC: 25,
    qrUrl: getBinQrUrl('BIN-005'),
    createdAt: '2026-10-01T08:00:00Z',
    fillHistory: [],
    collections: [],
    isActive: true
  }
];

export const initialEVFleet: EVVehicle[] = [
  {
    id: 'ev-1',
    evCode: 'EV-01',
    status: 'AVAILABLE',
    battery: 100,
    currentLocation: 'Central Depot / Sector A',
    updatedAt: 'Online'
  },
  {
    id: 'ev-2',
    evCode: 'EV-02',
    status: 'AVAILABLE',
    battery: 100,
    currentLocation: 'North Charging Bay',
    updatedAt: 'Online'
  },
  {
    id: 'ev-3',
    evCode: 'EV-03',
    status: 'AVAILABLE',
    battery: 100,
    currentLocation: 'Hostel Maintenance Hub',
    updatedAt: 'Online'
  }
];

// No fake complaints on fresh initialization
export const initialComplaints: Complaint[] = [];

// Collection tasks start empty until triggered by real reports or demo flow
export const initialCollectionTasks: CollectionTask[] = [];

// Feedbacks start completely empty
export const initialFeedback: FeedbackItem[] = [];

export const initialActivityLogs: AdminActivity[] = [
  {
    id: 'act-1',
    adminId: 'SYSTEM',
    adminName: 'HAILO Core System',
    action: 'SYSTEM_BOOT',
    target: 'Grid Registry',
    timestamp: 'Initial boot',
    details: 'Initialized 5 smart bins and autonomous EV collection fleet.'
  }
];

/**
 * Calculates genuine waste diversion trends from actual stored bins and collections.
 * Returns empty array if no collections have occurred yet.
 */
export function calculateDynamicWasteTrends(bins: Bin[]) {
  const allCollections = bins.flatMap(b => b.collections || []);
  if (allCollections.length === 0) {
    return [];
  }
  // Group by collection date/period
  return allCollections.map(c => ({
    name: c.collectedAt,
    wasteClearedKg: c.amountKg,
    collector: c.collectorName
  }));
}
