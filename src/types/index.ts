export type UserRole = 'ADMIN' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export type WasteType = 'Bio' | 'Paper' | 'Plastic' | 'Rest' | 'Mixed';

export type BinStatus = 'NORMAL' | 'APPROACHING_FULL' | 'ALMOST_FULL' | 'FULL' | 'OVERFLOW';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus = 
  | 'PENDING' 
  | 'ACCEPTED' 
  | 'ASSIGNED' 
  | 'IN PROGRESS' 
  | 'RESOLVED'
  | 'REJECTED'
  | 'Pending' 
  | 'Accepted'
  | 'Assigned' 
  | 'In Progress' 
  | 'Resolved'
  | 'Rejected';

export interface CleaningStaff {
  id: string;
  staffCode: string; // e.g. STF-001, STF-002
  name: string;
  phone: string;
  zone: string;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  status: 'Available' | 'On Duty' | 'Busy';
}

export type ComplaintCategory = 
  | 'Bin is Full'
  | 'Bin Full'
  | 'Overflowing Waste'
  | 'Needs Cleaning'
  | 'Bad Smell'
  | 'Liquid Leakage'
  | 'Waste Scattered Around'
  | 'Damaged Bin'
  | 'Hazardous Waste'
  | 'Other';

export type EVStatus = 
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COLLECTING'
  | 'COLLECTED'
  | 'RETURNING';

export type TaskStatus = 
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COLLECTING'
  | 'COLLECTED'
  | 'COMPLETED';

export interface BinHistoryPoint {
  time: string;
  fillLevel: number;
}

export interface CollectionRecord {
  id: string;
  collectedAt: string;
  collectorName: string;
  amountKg: number;
}

export interface Bin {
  id: string;
  binCode: string; // e.g. BIN-001, BIN-002, BIN-003, ...
  location: string;
  zone: string;
  latitude: number;
  longitude: number;
  wasteType: WasteType;
  capacity: number; // in Liters
  currentFillLevel: number; // 0 to 100
  status: BinStatus;
  lastUpdated: string;
  lastCollection: string;
  sensorDistanceCm: number;
  batteryLevel: number;
  temperatureC: number;
  qrUrl: string;
  qrCodeUrl?: string;
  fillHistory: BinHistoryPoint[];
  collections: CollectionRecord[];
  createdAt: string;
  isActive?: boolean;
}

export interface Complaint {
  id: string;
  complaintCode: string; // e.g. CMP-001, CMP-002
  customerId?: string; // If submitted by logged-in customer
  binId: string;
  binCode: string;
  location: string;
  category: ComplaintCategory;
  categories?: ComplaintCategory[];
  description: string;
  photoUrl?: string;
  photo?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedEV?: string; // e.g. EV-01
  assignedStaff?: string;
  assignedStaffId?: string;
  afterCleaningPhotoUrl?: string;
  collectionTaskId?: string; // e.g. COL-001
  createdAt: string;
  reportedAt?: string;
  acceptedAt?: string;
  assignedAt?: string;
  resolvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  resolutionMethod?: string; // e.g. "Sanitation Verification (Rajesh Kumar)"
  citizenName?: string;
  citizenContact?: string;
  source?: 'ADMIN' | 'CUSTOMER' | 'QR_SCAN' | string;
  adminNote?: string;
}

export interface EVVehicle {
  id: string;
  evCode: string; // EV-01, EV-02, EV-03
  status: EVStatus;
  battery: number; // percentage
  currentLocation: string;
  assignedBin?: string;
  currentTask?: string;
  updatedAt: string;
}

export interface CollectionTask {
  id: string;
  taskCode: string; // COL-001, COL-002
  binId: string;
  binCode: string;
  location: string;
  complaintId?: string;
  evId: string;
  evCode: string;
  priority: ComplaintPriority;
  status: TaskStatus;
  createdAt: string;
  dispatchedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  scheduledTime?: string;
}

export interface FeedbackItem {
  id: string;
  customerId?: string;
  rating: number; // 1 to 5
  message: string;
  createdAt: string;
  userName?: string;
  category?: string;
}

export interface AdminActivity {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: string;
  details?: string;
}

export interface HardwareSimState {
  esp32Connected: boolean;
  ultrasonicActive: boolean;
  binSensorReading: boolean;
  lastSensorUpdateSecondsAgo: number;
  currentDistanceCm: number;
  simulatedFillLevel: number;
  targetBinCode: string;
  isSimulating: boolean;
}

export interface SystemSettings {
  adminName: string;
  adminEmail: string;
  refreshIntervalSeconds: number;
  soundAlerts: boolean;
  emailAlerts: boolean;
  autoAssignComplaints: boolean;
  thresholdAlmostFull: number;
  thresholdFull: number;
  thresholdOverflow: number;
  theme: 'light' | 'dark' | 'system';
}
