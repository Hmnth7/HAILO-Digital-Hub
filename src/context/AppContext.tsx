import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  deleteDoc,
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Bin, 
  Complaint, 
  EVVehicle,
  CollectionTask,
  FeedbackItem, 
  AdminActivity,
  HardwareSimState, 
  SystemSettings,
  ComplaintStatus,
  ComplaintCategory,
  BinStatus,
  User,
  UserRole,
  EVStatus,
  TaskStatus,
  WasteType,
  CleaningStaff
} from '../types';
import { 
  initialActiveBins, 
  initialEVFleet,
  initialComplaints, 
  initialCollectionTasks, 
  initialFeedback,
  initialActivityLogs,
  initialUsers,
  initialRegisteredStaff,
  calculateBinStatus,
  calculateDistanceCm,
  getPriorityForCategory
} from '../data/mockData';
import { getBinQrUrl, setProductionBaseUrl, getProductionBaseUrl } from '../utils/qrConfig';

function formatActualTimestamp(date = new Date()): string {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Remove undefined values so Cloud Firestore never throws unsupported field value errors
 */
function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export interface UpdateComplaintOptions {
  adminNote?: string;
  assignedStaff?: string;
  assignedStaffId?: string;
  afterCleaningPhotoUrl?: string;
  rejectionReason?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
}

interface AppContextType {
  // Authentication & Role
  currentUser: User | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  loginWithFirebase: (email: string, password: string, portal: 'ADMIN' | 'CUSTOMER') => Promise<User>;
  registerCustomerWithFirebase: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  loginAs: (role: 'ADMIN' | 'CUSTOMER', email?: string) => void;
  logout: () => Promise<void> | void;

  // Bins Management (Admin CRUD + View)
  bins: Bin[];
  getBinByCode: (code: string) => Bin | undefined;
  addBin: (data: { location: string; wasteType: WasteType; capacity: number; zone?: string }) => Bin;
  editBin: (binCode: string, data: { location?: string; wasteType?: WasteType; capacity?: number; zone?: string }) => void;
  removeBin: (binCode: string) => void;
  updateBinFillLevel: (binCode: string, fillLevel: number) => void;
  emptyBin: (binCode: string) => void;
  toggleBinActiveStatus: (binCode: string) => void;

  // Complaints & Cleaning Staff Management
  complaints: Complaint[];
  registeredStaff: CleaningStaff[];
  getComplaintById: (id: string) => Complaint | undefined;
  createComplaint: (data: {
    binCode: string;
    category: ComplaintCategory;
    description: string;
    photoUrl?: string;
    citizenName?: string;
    citizenContact?: string;
    source?: 'ADMIN' | 'CUSTOMER' | 'QR_SCAN' | string;
  }) => Promise<Complaint> | Complaint;
  syncComplaintsFromBackend: () => Promise<void>;
  clearComplaints: () => void;
  updateComplaintStatus: (
    complaintId: string, 
    status: ComplaintStatus, 
    optionsOrAdminNote?: string | UpdateComplaintOptions, 
    assignedStaffArg?: string
  ) => boolean;
  acceptComplaint: (complaintId: string) => boolean;
  rejectComplaint: (complaintId: string, reason?: string) => boolean;
  assignStaffToComplaint: (complaintId: string, staffCode: string) => boolean;
  reassignStaffToComplaint: (complaintId: string, staffCode: string) => boolean;
  uploadAfterCleaningPhoto: (complaintId: string, photoDataUrl: string) => void;

  // EV Fleet & Autonomous Collection Simulation
  evFleet: EVVehicle[];
  collectionTasks: CollectionTask[];
  advanceEVStatus: (evCode: string) => void;
  resetEV: (evCode: string) => void;

  // Feedback (Real data only, starts empty)
  feedbacks: FeedbackItem[];
  addFeedback: (rating: number, message: string) => void;

  // Activity Log
  activityLogs: AdminActivity[];
  logActivity: (action: string, target: string, details?: string) => void;

  // Hardware Simulation
  hardwareState: HardwareSimState;
  setSimulatedFillLevel: (level: number, targetBinCode?: string) => void;
  setTargetBinCode: (code: string) => void;
  toggleHardwareConnection: () => void;

  // Demo Controls
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  triggerDemoStepFlow: () => void;
  triggerDemoOverflow: () => void;
  triggerDemoComplaint: () => void;
  triggerDemoAutoCycle: () => void;
  resetAllDemoData: () => void;

  // Settings
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  updateProductionDomain: (newUrl: string) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) => void;
  removeToast: (id: string) => void;

  // Derived Metrics
  totalWasteLtr: number;
  recyclableWasteLtr: number;
  nonRecyclableWasteLtr: number;
  activeComplaintsCount: number;
  overflowCount: number;
  binsRequiringCollectionCount: number;
  customerComplaints: Complaint[];
  customerContributions: { total: number; pending: number; resolved: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'hailo_v3_user',
  BINS: 'hailo_v3_bins',
  COMPLAINTS: 'hailo_v3_complaints',
  EV: 'hailo_v3_ev',
  TASKS: 'hailo_v3_tasks',
  FEEDBACK: 'hailo_v3_feedback',
  ACTIVITY: 'hailo_v3_activity',
  SETTINGS: 'hailo_v3_settings',
  DEMO: 'hailo_v3_demo',
  STAFF: 'hailo_v3_staff'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user & authentication loading state (managed securely via Firebase Auth & Firestore)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Synchronize authenticated user & verify role from Firebase Custom Claims and Cloud Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        // 1. Check custom claims on ID token
        const idTokenResult = await fbUser.getIdTokenResult();
        const hasAdminClaim = idTokenResult.claims.role === 'ADMIN' || idTokenResult.claims.admin === true;

        // 2. Check Firestore /users/{uid} document
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);
        const data = userSnap.exists() ? userSnap.data() : null;

        const role: UserRole = (hasAdminClaim || data?.role === 'ADMIN') ? 'ADMIN' : 'CUSTOMER';

        setCurrentUser({
          id: fbUser.uid,
          name: data?.name || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
          email: fbUser.email || data?.email || '',
          role,
          phone: data?.phone || '',
          avatar: fbUser.photoURL || undefined
        });
      } catch (err) {
        console.error('Error verifying user role:', err);
        // Fallback to customer role
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Citizen'),
          email: fbUser.email || '',
          role: 'CUSTOMER',
          phone: ''
        });
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEMO);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Settings
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      adminName: 'Operations Lead',
      adminEmail: 'admin@hailo.digitalhub.ac',
      refreshIntervalSeconds: 15,
      soundAlerts: true,
      emailAlerts: true,
      autoAssignComplaints: true,
      thresholdAlmostFull: 80,
      thresholdFull: 95,
      thresholdOverflow: 100,
      theme: 'light'
    };
  });

  // Bins (5 active bins initially: BIN-001 through BIN-005)
  const [bins, setBins] = useState<Bin[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BINS);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          // Guarantee all QR URLs use the valid public HTTPS URL (never localhost)
          return parsed.map((b: Bin) => ({
            ...b,
            qrUrl: getBinQrUrl(b.binCode),
            collections: Array.isArray(b.collections) ? b.collections : [],
            isActive: b.isActive !== undefined ? b.isActive : true
          }));
        }
      } catch (e) { /* fallback */ }
    }
    return initialActiveBins;
  });

  // EV Fleet (EV-01, EV-02, EV-03)
  const [evFleet, setEvFleet] = useState<EVVehicle[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EV);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return initialEVFleet;
  });

  // Helper to detect automated fake complaints and obsolete mock injections
  const isDemoComplaintRecord = (c: any): boolean => {
    if (!c) return true;
    const code = c.complaintCode || c.id;
    if (!code) return true;
    if (c.id === 'cmp-000' || c.isDemo) return true;
    const name = (c.citizenName || '').toLowerCase().trim();
    const contact = (c.citizenContact || '').toLowerCase().trim();
    
    // Only filter automated fake telemetry & sample demo injections
    if (c.isDemo || 
        contact === 'telemetry@hailo-system.internal' || 
        name.includes('auto-trigger') || 
        name.includes('demo flow') ||
        name === 'sample record') {
      return true;
    }

    return false;
  };

  // Complaints (Strictly genuine reports loaded exclusively from Cloud Firestore; initially empty)
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Purge any legacy cached complaints from browser localStorage on initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.COMPLAINTS);
      } catch {}
    }
  }, []);

  // Registered Cleaning Staff Roster
  const [registeredStaff, setRegisteredStaff] = useState<CleaningStaff[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* fallback */ }
    }
    return initialRegisteredStaff;
  });

  // Collection Tasks
  const [collectionTasks, setCollectionTasks] = useState<CollectionTask[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return initialCollectionTasks;
  });

  // Feedback (Starts completely EMPTY per Section 23 & 37!)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return initialFeedback;
  });

  // Admin Activity Log
  const [activityLogs, setActivityLogs] = useState<AdminActivity[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return initialActivityLogs;
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Hardware Simulation state
  const [hardwareState, setHardwareState] = useState<HardwareSimState>({
    esp32Connected: true,
    ultrasonicActive: true,
    binSensorReading: true,
    lastSensorUpdateSecondsAgo: 2,
    currentDistanceCm: 6, // 6cm corresponds to 94% on BIN-003
    simulatedFillLevel: 94,
    targetBinCode: 'BIN-003',
    isSimulating: false
  });

  // Synchronize complaints with shared backend storage across all mobile phones, browsers, and sessions
  // Legacy syncComplaintsFromBackend stub kept as no-op for type interface compatibility
  const syncComplaintsFromBackend = async () => {
    // No-op: Cloud Firestore is the exclusive real-time single source of truth
  };

  // Cloud Firestore is the EXCLUSIVE SINGLE SOURCE OF TRUTH for Complaints across all devices
  useEffect(() => {
    if (!currentUser) {
      console.log(`[HAILO ${new Date().toISOString()}] No authenticated user session - complaints reset to empty.`);
      setComplaints([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    if (currentUser.role === 'ADMIN') {
      console.log(`[HAILO ${new Date().toISOString()}] Attaching Admin Firestore onSnapshot listener for /complaints (UID: ${currentUser.id})...`);
      const complaintsCol = collection(db, 'complaints');
      unsubscribe = onSnapshot(
        complaintsCol,
        (snapshot) => {
          console.log(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot ADMIN] Received snapshot with ${snapshot.size} complaint document(s).`);
          const list: Complaint[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Complaint;
            if (data && !isDemoComplaintRecord({ ...data, id: docSnap.id, complaintCode: data.complaintCode || docSnap.id })) {
              list.push({
                ...data,
                id: docSnap.id,
                complaintCode: data.complaintCode || docSnap.id
              });
            }
          });

          // Sort by sequential CMP number descending (newest first)
          list.sort((a, b) => {
            const numA = parseInt((a.complaintCode || '').replace(/\D/g, '') || '0', 10);
            const numB = parseInt((b.complaintCode || '').replace(/\D/g, '') || '0', 10);
            return numB - numA;
          });

          console.log(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot ADMIN] Setting Admin complaints state (${list.length} genuine complaint(s)):`, list.map(c => `${c.complaintCode} [${c.binCode} - ${c.status}]`));
          setComplaints(list);
        },
        (err) => {
          console.error(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot ADMIN ERROR]`, err);
        }
      );
    } else if (currentUser.role === 'CUSTOMER') {
      console.log(`[HAILO ${new Date().toISOString()}] Attaching Customer Firestore onSnapshot listener for customerId: ${currentUser.id}...`);
      const complaintsQuery = query(
        collection(db, 'complaints'),
        where('customerId', '==', currentUser.id)
      );

      unsubscribe = onSnapshot(
        complaintsQuery,
        (snapshot) => {
          console.log(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot CUSTOMER] Received snapshot with ${snapshot.size} complaint document(s).`);
          const list: Complaint[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Complaint;
            if (data && !isDemoComplaintRecord({ ...data, id: docSnap.id, complaintCode: data.complaintCode || docSnap.id })) {
              list.push({
                ...data,
                id: docSnap.id,
                complaintCode: data.complaintCode || docSnap.id
              });
            }
          });

          list.sort((a, b) => {
            const numA = parseInt((a.complaintCode || '').replace(/\D/g, '') || '0', 10);
            const numB = parseInt((b.complaintCode || '').replace(/\D/g, '') || '0', 10);
            return numB - numA;
          });

          console.log(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot CUSTOMER] Setting Customer complaints state (${list.length} complaint(s)):`, list.map(c => `${c.complaintCode} [${c.binCode} - ${c.status}]`));
          setComplaints(list);
        },
        (err) => {
          console.error(`[HAILO ${new Date().toISOString()}] [FIRESTORE onSnapshot CUSTOMER ERROR]`, err);
        }
      );
    }

    return () => {
      if (unsubscribe) {
        console.log(`[HAILO ${new Date().toISOString()}] Cleanly unsubscribed active Firestore complaints listener.`);
        unsubscribe();
      }
    };
  }, [currentUser?.id, currentUser?.role]);

  // Persist non-complaint collections (complaints are strictly managed in Cloud Firestore, NEVER localStorage)
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BINS, JSON.stringify(bins)); }, [bins]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EV, JSON.stringify(evFleet)); }, [evFleet]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(collectionTasks)); }, [collectionTasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedbacks)); }, [feedbacks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DEMO, JSON.stringify(demoMode)); }, [demoMode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(registeredStaff)); }, [registeredStaff]);

  // Live ticking sensor seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setHardwareState(prev => ({
        ...prev,
        lastSensorUpdateSecondsAgo: (prev.lastSensorUpdateSecondsAgo % 5) + 1
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Activity logger
  const logActivity = (action: string, target: string, details?: string) => {
    const newLog: AdminActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      adminId: currentUser?.id || 'admin-auto',
      adminName: currentUser?.name || 'System Automation',
      action,
      target,
      timestamp: 'Just now',
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Firebase Authentication methods
  const loginWithFirebase = async (email: string, password: string, portal: 'ADMIN' | 'CUSTOMER'): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = userCredential.user;

    // Refresh token to fetch freshly assigned custom claims
    const idTokenResult = await fbUser.getIdTokenResult(true);
    const hasAdminClaim = idTokenResult.claims.role === 'ADMIN' || idTokenResult.claims.admin === true;

    // Verify role directly from server document in Cloud Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    let resolvedRole: UserRole = 'CUSTOMER';
    let resolvedName = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Citizen');
    let resolvedPhone = '';

    if (userSnap.exists()) {
      const data = userSnap.data();
      resolvedRole = (hasAdminClaim || data?.role === 'ADMIN') ? 'ADMIN' : 'CUSTOMER';
      resolvedName = data?.name || resolvedName;
      resolvedPhone = data?.phone || '';
    } else if (hasAdminClaim) {
      resolvedRole = 'ADMIN';
    }

    // Enforce municipal operations security: only verified ADMIN role can access Admin Portal
    if (portal === 'ADMIN' && resolvedRole !== 'ADMIN') {
      await signOut(auth);
      setCurrentUser(null);
      throw new Error('Access Denied: This account is not authorized as a Municipal Administrator.');
    }

    const verifiedUser: User = {
      id: fbUser.uid,
      name: resolvedName,
      email: fbUser.email || email,
      role: resolvedRole,
      phone: resolvedPhone,
      avatar: fbUser.photoURL || undefined
    };

    setCurrentUser(verifiedUser);
    if (resolvedRole === 'ADMIN') {
      logActivity('ADMIN_LOGIN', verifiedUser.email, 'Admin signed in to operations desk');
      showToast('success', `Signed in as Administrator (${verifiedUser.name})`, 'Admin Access Granted');
    } else {
      showToast('success', `Welcome back, ${verifiedUser.name}`, 'Customer Portal Access');
    }

    return verifiedUser;
  };

  const registerCustomerWithFirebase = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<User> => {
    // 1. Create account via Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = userCredential.user;

    // 2. Set Firebase Auth display name
    if (name.trim()) {
      try {
        await updateProfile(fbUser, { displayName: name.trim() });
      } catch (e) {
        console.warn('Could not update Auth profile:', e);
      }
    }

    // 3. Create Firestore user document (STRICTLY role: 'CUSTOMER')
    const userDocRef = doc(db, 'users', fbUser.uid);
    await setDoc(userDocRef, {
      uid: fbUser.uid,
      name: name.trim() || 'Citizen',
      email: email.trim().toLowerCase(),
      role: 'CUSTOMER',
      phone: phone?.trim() || '',
      createdAt: serverTimestamp()
    });

    const newCustomer: User = {
      id: fbUser.uid,
      name: name.trim() || 'Citizen',
      email: email.trim().toLowerCase(),
      role: 'CUSTOMER',
      phone: phone?.trim() || ''
    };

    setCurrentUser(newCustomer);
    showToast('success', `Account created successfully! Welcome, ${newCustomer.name}.`, 'Registration Complete');
    return newCustomer;
  };

  // Auth methods
  const loginAs = (role: 'ADMIN' | 'CUSTOMER', email?: string) => {
    if (role === 'ADMIN') {
      const admin = {
        ...initialUsers[0],
        email: email || initialUsers[0].email
      };
      setCurrentUser(admin);
      logActivity('ADMIN_LOGIN', admin.email, 'Admin signed in to operations desk');
      showToast('success', `Signed in as Administrator (${admin.name})`, 'Admin Access Granted');
    } else {
      const customer = {
        ...initialUsers[1],
        email: email || initialUsers[1].email
      };
      setCurrentUser(customer);
      showToast('success', `Welcome back, ${customer.name}`, 'Customer Portal Access');
    }
  };

  const logout = async () => {
    if (currentUser?.role === 'ADMIN') {
      logActivity('ADMIN_LOGOUT', currentUser.email, 'Admin signed out');
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    showToast('info', 'You have been signed out of HAILO Digital Hub.', 'Signed Out');
  };

  const getBinByCode = (code: string) => {
    return bins.find(b => b.binCode.toUpperCase() === code.toUpperCase());
  };

  const getComplaintById = (id: string) => {
    return complaints.find(c => c.id === id || c.complaintCode === id);
  };

  // Admin Bin Management: Add, Edit, Delete
  const addBin = (data: { location: string; wasteType: WasteType; capacity: number; zone?: string }): Bin => {
    // Generate next sequential code: BIN-006, BIN-007, etc.
    const maxNum = bins.reduce((max, b) => {
      const match = b.binCode.match(/BIN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 5);

    const nextCode = `BIN-${String(maxNum + 1).padStart(3, '0')}`;
    const qrUrl = getBinQrUrl(nextCode);

    const newBin: Bin = {
      id: `bin-${String(maxNum + 1).padStart(3, '0')}`,
      binCode: nextCode,
      location: data.location,
      zone: data.zone || 'Campus Grounds',
      latitude: 12.9716 + ((maxNum + 1) * 0.0009),
      longitude: 77.5946 + ((maxNum + 1) * 0.0008),
      wasteType: data.wasteType,
      capacity: data.capacity,
      currentFillLevel: 10,
      status: 'NORMAL',
      lastUpdated: 'Just now',
      lastCollection: 'Not collected yet',
      sensorDistanceCm: 90,
      batteryLevel: 98,
      temperatureC: 24,
      qrUrl,
      fillHistory: [
        { time: '00:00', fillLevel: 5 },
        { time: 'Current', fillLevel: 10 }
      ],
      collections: [],
      createdAt: new Date().toISOString()
    };

    setBins(prev => [...prev, newBin]);
    logActivity('BIN_CREATED', nextCode, `Added new ${data.wasteType} bin at ${data.location} with dynamic QR.`);
    showToast('success', `Created dustbin ${nextCode} with unique QR placard.`, 'Bin Added');
    return newBin;
  };

  const editBin = (binCode: string, data: { location?: string; wasteType?: WasteType; capacity?: number; zone?: string }) => {
    setBins(prev => prev.map(b => {
      if (b.binCode.toUpperCase() === binCode.toUpperCase()) {
        return {
          ...b,
          location: data.location !== undefined ? data.location : b.location,
          wasteType: data.wasteType !== undefined ? data.wasteType : b.wasteType,
          capacity: data.capacity !== undefined ? data.capacity : b.capacity,
          zone: data.zone !== undefined ? data.zone : b.zone,
          lastUpdated: 'Just now'
        };
      }
      return b;
    }));
    logActivity('BIN_EDITED', binCode, `Updated profile and location for ${binCode}`);
    showToast('info', `Dustbin ${binCode} updated successfully.`, 'Bin Modified');
  };

  const removeBin = (binCode: string) => {
    setBins(prev => prev.filter(b => b.binCode.toUpperCase() !== binCode.toUpperCase()));
    logActivity('BIN_DELETED', binCode, `Decommissioned bin ${binCode}`);
    showToast('warning', `Dustbin ${binCode} removed from fleet.`, 'Bin Decommissioned');
  };

  const updateBinFillLevel = (binCode: string, fillLevel: number) => {
    const clampedLevel = Math.max(0, Math.min(100, Math.round(fillLevel)));
    const newStatus = calculateBinStatus(clampedLevel);
    const newDistance = calculateDistanceCm(clampedLevel, 100);

    setBins(prev => prev.map(bin => {
      if (bin.binCode.toUpperCase() === binCode.toUpperCase()) {
        const updatedHistory = [...bin.fillHistory];
        const last = updatedHistory[updatedHistory.length - 1];
        if (last && last.time === 'Current') {
          last.fillLevel = clampedLevel;
        } else {
          updatedHistory.push({ time: 'Current', fillLevel: clampedLevel });
        }
        return {
          ...bin,
          currentFillLevel: clampedLevel,
          status: newStatus,
          sensorDistanceCm: newDistance,
          lastUpdated: 'Just now',
          fillHistory: updatedHistory
        };
      }
      return bin;
    }));

    if (hardwareState.targetBinCode.toUpperCase() === binCode.toUpperCase()) {
      setHardwareState(prev => ({
        ...prev,
        simulatedFillLevel: clampedLevel,
        currentDistanceCm: newDistance,
        lastSensorUpdateSecondsAgo: 0
      }));
    }
  };

  const emptyBin = (binCode: string) => {
    updateBinFillLevel(binCode, 0);
    setBins(prev => prev.map(b => {
      if (b.binCode.toUpperCase() === binCode.toUpperCase()) {
        return {
          ...b,
          currentFillLevel: 0,
          status: 'NORMAL',
          lastCollection: 'Just now',
          sensorDistanceCm: 100,
          collections: [
            {
              id: `col-${Date.now()}`,
              collectedAt: 'Just now',
              collectorName: 'EV Collection Fleet',
              amountKg: Math.round(b.capacity * 0.45)
            },
            ...b.collections
          ]
        };
      }
      return b;
    }));
    logActivity('BIN_EMPTIED', binCode, `Waste cleared and reset to 0% Normal.`);
  };

  const toggleBinActiveStatus = (binCode: string) => {
    setBins(prev => prev.map(b => {
      if (b.binCode.toUpperCase() === binCode.toUpperCase()) {
        const nextActive = b.isActive === false ? true : false;
        logActivity('BIN_STATUS_TOGGLED', binCode, `Dustbin active status set to ${nextActive ? 'ACTIVE' : 'INACTIVE'}.`);
        showToast('info', `${b.binCode} (${b.location}) is now ${nextActive ? 'ACTIVE' : 'INACTIVE'}.`, 'Dustbin Status Updated');
        return {
          ...b,
          isActive: nextActive
        };
      }
      return b;
    }));
  };

  const setSimulatedFillLevel = (level: number, targetBinCode?: string) => {
    const target = targetBinCode || hardwareState.targetBinCode;
    updateBinFillLevel(target, level);
  };

  const setTargetBinCode = (code: string) => {
    const targetBin = getBinByCode(code);
    const level = targetBin ? targetBin.currentFillLevel : 50;
    const dist = calculateDistanceCm(level, 100);
    setHardwareState(prev => ({
      ...prev,
      targetBinCode: code,
      simulatedFillLevel: level,
      currentDistanceCm: dist
    }));
  };

  const toggleHardwareConnection = () => {
    setHardwareState(prev => ({
      ...prev,
      esp32Connected: !prev.esp32Connected,
      ultrasonicActive: !prev.esp32Connected,
      binSensorReading: !prev.esp32Connected
    }));
  };

  /**
   * AUTOMATIC EV DISPATCH ENGINE (Sections 13, 14, 15, 16)
   * When a customer reports "Bin is Full" or "Overflowing Waste",
   * system automatically creates a collection task and dispatches an available EV.
   */
  const createComplaint = async (data: {
    binCode: string;
    category: ComplaintCategory;
    description: string;
    photoUrl?: string;
    citizenName?: string;
    citizenContact?: string;
    source?: 'ADMIN' | 'CUSTOMER' | 'QR_SCAN' | string;
  }): Promise<Complaint> => {
    // Atomic sequential tracking number from Firestore counter, with local fallback
    let nextNum: number = 8;
    try {
      const counterRef = doc(db, 'counters', 'complaints');
      nextNum = await runTransaction(db, async (t) => {
        const snap = await t.get(counterRef);
        let current = 7;
        if (snap.exists() && typeof snap.data().currentNumber === 'number') {
          current = snap.data().currentNumber;
        }
        const next = current + 1;
        t.set(counterRef, { currentNumber: next }, { merge: true });
        return next;
      });
    } catch (counterErr) {
      console.warn(`[HAILO ${new Date().toISOString()}] Counter read failed, calculating from loaded complaints:`, counterErr);
      const maxNum = complaints.reduce((max, c) => {
        const match = (c.complaintCode || '').match(/CMP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 7);
      nextNum = maxNum + 1;
    }

    const nextCode = `CMP-${String(nextNum).padStart(3, '0')}`;
    const priority = getPriorityForCategory(data.category);
    const bin = getBinByCode(data.binCode);

    // Check if this qualifying issue should trigger AUTOMATIC EV DISPATCH
    const isFullOrOverflow = 
      data.category === 'Bin is Full' || 
      data.category === 'Bin Full' || 
      data.category === 'Overflowing Waste';

    let assignedEVCode: string | undefined = undefined;
    let taskId: string | undefined = undefined;
    const complaintStatus: ComplaintStatus = 'PENDING';

    if (isFullOrOverflow && settings.autoAssignComplaints) {
      // Find an AVAILABLE EV from the fleet if configured
      const availableEV = evFleet.find(ev => ev.status === 'AVAILABLE') || evFleet[0];
      assignedEVCode = availableEV.evCode;

      // Create collection task: COL-001, COL-002, etc.
      const taskMaxNum = collectionTasks.reduce((max, t) => {
        const match = t.taskCode.match(/COL-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);

      const taskCode = `COL-${String(taskMaxNum + 1).padStart(3, '0')}`;
      taskId = taskCode;

      const newTask: CollectionTask = {
        id: `task-${Date.now()}`,
        taskCode,
        binId: bin ? bin.id : 'unknown-bin',
        binCode: data.binCode,
        location: bin ? bin.location : 'Campus Grounds',
        complaintId: nextCode,
        evId: availableEV.id,
        evCode: assignedEVCode,
        priority: priority,
        status: 'DISPATCHED',
        createdAt: 'Just now',
        dispatchedAt: 'Just now',
        scheduledTime: 'Immediate Autonomous Dispatch'
      };

      setCollectionTasks(prev => [newTask, ...prev]);

      // Update EV status to DISPATCHED
      setEvFleet(prev => prev.map(ev => {
        if (ev.evCode === assignedEVCode) {
          return {
            ...ev,
            status: 'DISPATCHED',
            assignedBin: data.binCode,
            currentTask: taskCode,
            updatedAt: 'Just now'
          };
        }
        return ev;
      }));

      // Ensure bin reflects full / overflow level
      if (bin && bin.currentFillLevel < 94) {
        updateBinFillLevel(data.binCode, data.category === 'Overflowing Waste' ? 100 : 94);
      }

      logActivity(
        'AUTOMATIC_EV_DISPATCH', 
        assignedEVCode, 
        `Automatic Collection Request ${taskCode} generated for ${data.binCode}. EV status set to DISPATCHED.`
      );
    }

    const detectedSource = data.source || (currentUser?.role === 'ADMIN' ? 'ADMIN' : (currentUser?.role === 'CUSTOMER' ? 'CUSTOMER' : 'QR_SCAN'));

    const actualTimestamp = formatActualTimestamp();

    // Authenticated customer UID resolution (must match request.auth.uid for security rules)
    const authUser = auth.currentUser;
    const effectiveCustomerId = authUser?.uid || currentUser?.id;

    const newComplaint: Complaint = {
      id: nextCode,
      complaintCode: nextCode,
      customerId: effectiveCustomerId,
      binId: bin ? bin.id : `bin-${data.binCode.toLowerCase()}`,
      binCode: data.binCode,
      location: bin ? bin.location : 'Campus Grounds',
      category: data.category,
      description: data.description,
      photoUrl: data.photoUrl,
      priority,
      status: complaintStatus,
      source: detectedSource,
      assignedEV: assignedEVCode,
      collectionTaskId: taskId,
      createdAt: actualTimestamp,
      reportedAt: actualTimestamp,
      citizenName: data.citizenName || currentUser?.name || authUser?.displayName || 'Citizen',
      citizenContact: data.citizenContact || currentUser?.phone || currentUser?.email || authUser?.email || 'Not provided'
    };

    // Write directly to Cloud Firestore as the single source of truth
    try {
      console.log(`[HAILO ${new Date().toISOString()}] Saving genuine complaint ${nextCode} to Cloud Firestore (customerId: ${effectiveCustomerId})...`);
      const complaintDocRef = doc(db, 'complaints', nextCode);
      const firestorePayload = cleanFirestoreData({
        id: nextCode,
        complaintCode: nextCode,
        customerId: newComplaint.customerId,
        binId: newComplaint.binId,
        binCode: newComplaint.binCode,
        location: newComplaint.location,
        category: newComplaint.category,
        description: newComplaint.description,
        priority: newComplaint.priority,
        status: 'PENDING',
        source: newComplaint.source,
        assignedEV: newComplaint.assignedEV,
        collectionTaskId: newComplaint.collectionTaskId,
        createdAt: newComplaint.createdAt,
        reportedAt: newComplaint.reportedAt,
        citizenName: newComplaint.citizenName,
        citizenContact: newComplaint.citizenContact,
        photoUrl: newComplaint.photoUrl
      });
      await setDoc(complaintDocRef, firestorePayload);
      console.log(`[HAILO ${new Date().toISOString()}] Complaint ${nextCode} successfully stored in Cloud Firestore.`);
    } catch (fsErr) {
      console.error(`[HAILO ${new Date().toISOString()}] Failed to write complaint to Cloud Firestore:`, fsErr);
      throw fsErr;
    }

    setComplaints(prev => [newComplaint, ...prev.filter(c => c.id !== nextCode && c.complaintCode !== nextCode)]);

    logActivity('COMPLAINT_FILED', nextCode, `${detectedSource === 'ADMIN' ? 'Admin' : detectedSource === 'CUSTOMER' ? 'Customer' : 'Citizen QR'} reported ${data.category} on ${data.binCode} (${priority} Priority)`);

    showToast('success', `Complaint ${nextCode} submitted for ${data.binCode}. Awaiting administrative review.`, 'Report Logged');

    return newComplaint;
  };

  const updateProductionDomain = (newUrl: string) => {
    setProductionBaseUrl(newUrl);
    const updatedBase = getProductionBaseUrl();
    setBins(prev => {
      const updated = prev.map(b => ({
        ...b,
        qrUrl: `${updatedBase}/report/${b.binCode}`
      }));
      try {
        localStorage.setItem(STORAGE_KEYS.BINS, JSON.stringify(updated));
      } catch (e) {
        console.error('Storage error syncing bins', e);
      }
      return updated;
    });
    logActivity('PRODUCTION_DOMAIN_UPDATED', updatedBase, 'Regenerated all dustbin QR codes with new production base URL');
  };

  const updateComplaintStatus = (
    complaintId: string, 
    status: ComplaintStatus, 
    optionsOrAdminNote?: string | UpdateComplaintOptions, 
    assignedStaffArg?: string
  ): boolean => {
    let options: UpdateComplaintOptions = {};
    if (typeof optionsOrAdminNote === 'string') {
      options = {
        adminNote: optionsOrAdminNote,
        assignedStaff: assignedStaffArg
      };
    } else if (optionsOrAdminNote) {
      options = optionsOrAdminNote;
    }

    const targetComplaint = complaints.find(c => c.id === complaintId || c.complaintCode === complaintId);
    if (!targetComplaint) {
      showToast('error', `Complaint ${complaintId} not found.`, 'Update Failed');
      return false;
    }

    const normStatus = status.toUpperCase();

    // STRICT REQUIREMENT 5 & 6: Require photograph to be successfully uploaded before allowing resolution
    if (normStatus === 'RESOLVED') {
      const photoToVerify = options.afterCleaningPhotoUrl || targetComplaint.afterCleaningPhotoUrl;
      if (!photoToVerify || photoToVerify.trim() === '') {
        showToast(
          'error',
          'Resolution blocked: You must upload an after-cleaning verification photograph before marking this complaint as RESOLVED.',
          'Photo Verification Required'
        );
        return false;
      }
    }

    const actualTimestamp = formatActualTimestamp();
    const resolvedStaffName = options.assignedStaff !== undefined ? options.assignedStaff : targetComplaint.assignedStaff;
    const resolvedStaffId = options.assignedStaffId !== undefined ? options.assignedStaffId : targetComplaint.assignedStaffId;

    setComplaints(prev => prev.map(c => {
      if (c.id === complaintId || c.complaintCode === complaintId) {
        const updated: Complaint = {
          ...c,
          status,
          adminNote: options.adminNote !== undefined ? options.adminNote : c.adminNote,
          assignedStaff: resolvedStaffName,
          assignedStaffId: resolvedStaffId,
          afterCleaningPhotoUrl: options.afterCleaningPhotoUrl !== undefined ? options.afterCleaningPhotoUrl : c.afterCleaningPhotoUrl
        };

        if (normStatus === 'ACCEPTED') {
          updated.acceptedAt = actualTimestamp;
        } else if (normStatus === 'REJECTED') {
          updated.rejectedAt = actualTimestamp;
          updated.rejectionReason = options.rejectionReason || 'Rejected by administrator';
        } else if (normStatus === 'ASSIGNED') {
          updated.assignedAt = actualTimestamp;
        } else if (normStatus === 'RESOLVED') {
          updated.resolvedAt = actualTimestamp;
          updated.resolutionMethod = `Manual Sanitation (${resolvedStaffName || 'Cleaning Staff'})`;
        }

        return updated;
      }
      return c;
    }));

    // Dynamic synchronization across other subsystems
    if (normStatus === 'ACCEPTED') {
      logActivity('COMPLAINT_ACCEPTED', targetComplaint.complaintCode, `Complaint accepted for ${targetComplaint.binCode} (${targetComplaint.category}). Awaiting staff assignment.`);
      showToast('info', `Complaint ${targetComplaint.complaintCode} accepted. Ready for staff assignment.`, 'Complaint Accepted');
    } else if (normStatus === 'REJECTED') {
      logActivity('COMPLAINT_REJECTED', targetComplaint.complaintCode, `Complaint rejected. Reason: ${options.rejectionReason || 'Rejected by administrator'}`);
      showToast('warning', `Complaint ${targetComplaint.complaintCode} rejected.`, 'Complaint Rejected');
    } else if (normStatus === 'ASSIGNED') {
      const isReassigned = !!targetComplaint.assignedStaff && targetComplaint.assignedStaff !== resolvedStaffName;
      if (isReassigned) {
        logActivity('STAFF_REASSIGNED', targetComplaint.complaintCode, `Reassigned from ${targetComplaint.assignedStaff} to ${resolvedStaffName} (${resolvedStaffId || 'Staff'})`);
        showToast('info', `Complaint ${targetComplaint.complaintCode} reassigned to ${resolvedStaffName}.`, 'Staff Reassigned');
      } else {
        logActivity('STAFF_ASSIGNED', targetComplaint.complaintCode, `Assigned to ${resolvedStaffName} (${resolvedStaffId || 'Staff'})`);
        showToast('success', `Complaint ${targetComplaint.complaintCode} assigned to ${resolvedStaffName}.`, 'Staff Assigned');
      }
    } else if (normStatus === 'IN PROGRESS') {
      logActivity('CLEANING_IN_PROGRESS', targetComplaint.complaintCode, `Cleaning work in progress by ${resolvedStaffName} at ${targetComplaint.binCode}.`);
      showToast('info', `Complaint ${targetComplaint.complaintCode} status updated to IN PROGRESS.`, 'Work In Progress');
    } else if (normStatus === 'RESOLVED') {
      // Synchronize Target Bin: reset fill level to 0% NORMAL and record collection history!
      setBins(prev => prev.map(b => {
        if (b.binCode.toUpperCase() === targetComplaint.binCode.toUpperCase()) {
          const clearedKg = Math.round(b.capacity * 0.45) || 25;
          return {
            ...b,
            currentFillLevel: 0,
            status: 'NORMAL',
            lastCollection: actualTimestamp,
            sensorDistanceCm: 100,
            collections: [
              {
                id: `col-${Date.now()}`,
                collectedAt: actualTimestamp,
                collectorName: resolvedStaffName || 'Municipal Sanitation Staff',
                amountKg: clearedKg
              },
              ...(b.collections || [])
            ]
          };
        }
        return b;
      }));

      logActivity(
        'COMPLAINT_RESOLVED', 
        targetComplaint.complaintCode, 
        `Resolved by ${resolvedStaffName}. After-cleaning verification photo confirmed. Bin ${targetComplaint.binCode} sanitized and reset to 0% Normal.`
      );
      showToast('success', `Complaint ${targetComplaint.complaintCode} resolved! ${targetComplaint.binCode} sanitized and verified.`, 'Complaint Resolved');
    } else {
      logActivity('COMPLAINT_UPDATED', targetComplaint.complaintCode, `Status updated to ${status}`);
      showToast('info', `Complaint ${targetComplaint.complaintCode} marked as ${status}.`, 'Status Updated');
    }

    // Persist status change to Cloud Firestore so all devices receive updates in real time
    try {
      const targetDocId = targetComplaint.complaintCode || targetComplaint.id;
      const complaintDocRef = doc(db, 'complaints', targetDocId);
      const firestoreUpdatePayload = cleanFirestoreData({
        status,
        adminNote: options.adminNote !== undefined ? options.adminNote : targetComplaint.adminNote,
        assignedStaff: resolvedStaffName || null,
        assignedStaffId: resolvedStaffId || null,
        afterCleaningPhotoUrl: options.afterCleaningPhotoUrl !== undefined ? options.afterCleaningPhotoUrl : targetComplaint.afterCleaningPhotoUrl,
        acceptedAt: normStatus === 'ACCEPTED' ? actualTimestamp : targetComplaint.acceptedAt,
        rejectedAt: normStatus === 'REJECTED' ? actualTimestamp : targetComplaint.rejectedAt,
        rejectionReason: normStatus === 'REJECTED' ? (options.rejectionReason || 'Rejected by administrator') : targetComplaint.rejectionReason,
        assignedAt: normStatus === 'ASSIGNED' ? actualTimestamp : targetComplaint.assignedAt,
        resolvedAt: normStatus === 'RESOLVED' ? actualTimestamp : targetComplaint.resolvedAt,
        resolutionMethod: normStatus === 'RESOLVED' ? `Manual Sanitation (${resolvedStaffName || 'Cleaning Staff'})` : targetComplaint.resolutionMethod
      });
      console.log(`[HAILO ${new Date().toISOString()}] Updating complaint ${targetDocId} status to ${status} in Cloud Firestore...`);
      updateDoc(complaintDocRef, firestoreUpdatePayload).then(() => {
        console.log(`[HAILO ${new Date().toISOString()}] Complaint ${targetDocId} status successfully updated to ${status} in Cloud Firestore.`);
      }).catch(fsErr => {
        console.error(`[HAILO ${new Date().toISOString()}] Firestore status update error for ${targetDocId}:`, fsErr);
      });
    } catch (e) {
      console.error('Failed to update complaint in Firestore:', e);
    }

    return true;
  };

  const acceptComplaint = (complaintId: string): boolean => {
    return updateComplaintStatus(complaintId, 'ACCEPTED');
  };

  const rejectComplaint = (complaintId: string, reason?: string): boolean => {
    return updateComplaintStatus(complaintId, 'REJECTED', { rejectionReason: reason });
  };

  const assignStaffToComplaint = (complaintId: string, staffCode: string): boolean => {
    const staff = registeredStaff.find(s => s.staffCode.toUpperCase() === staffCode.toUpperCase() || s.id === staffCode);
    if (!staff) {
      showToast('error', `Registered staff member ${staffCode} not found.`, 'Assignment Failed');
      return false;
    }
    return updateComplaintStatus(complaintId, 'ASSIGNED', {
      assignedStaff: staff.name,
      assignedStaffId: staff.staffCode
    });
  };

  const reassignStaffToComplaint = (complaintId: string, staffCode: string): boolean => {
    const staff = registeredStaff.find(s => s.staffCode.toUpperCase() === staffCode.toUpperCase() || s.id === staffCode);
    if (!staff) {
      showToast('error', `Registered staff member ${staffCode} not found.`, 'Reassignment Failed');
      return false;
    }
    return updateComplaintStatus(complaintId, 'ASSIGNED', {
      assignedStaff: staff.name,
      assignedStaffId: staff.staffCode
    });
  };

  const uploadAfterCleaningPhoto = (complaintId: string, photoDataUrl: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === complaintId || c.complaintCode === complaintId) {
        return {
          ...c,
          afterCleaningPhotoUrl: photoDataUrl
        };
      }
      return c;
    }));

    // Update directly in Cloud Firestore
    try {
      const targetComplaint = complaints.find(c => c.id === complaintId || c.complaintCode === complaintId);
      const targetDocId = targetComplaint?.complaintCode || targetComplaint?.id || complaintId;
      const complaintDocRef = doc(db, 'complaints', targetDocId);
      console.log(`[HAILO ${new Date().toISOString()}] Uploading verification photo for ${targetDocId} to Cloud Firestore...`);
      updateDoc(complaintDocRef, { afterCleaningPhotoUrl: photoDataUrl }).then(() => {
        console.log(`[HAILO ${new Date().toISOString()}] Verification photo stored in Cloud Firestore for ${targetDocId}.`);
      }).catch(err => {
        console.error(`[HAILO ${new Date().toISOString()}] Firestore photo upload error:`, err);
      });
    } catch (e) {
      console.error('Failed to update photo in Firestore:', e);
    }

    logActivity('PHOTO_UPLOADED', complaintId, 'After-cleaning verification photograph uploaded.');
    showToast('success', 'After-cleaning verification photograph uploaded successfully.', 'Photo Uploaded');
  };

  /**
   * EV SIMULATION ENGINE (Section 16, 17, 18, 35)
   * Controlled demo workflow:
   * DISPATCHED → EN_ROUTE → ARRIVED → COLLECTING → COLLECTED
   * When COLLECTED:
   * - Bin resets: Fill 0%, Status NORMAL, lastCollection updated
   * - Complaint resets: Status RESOLVED, resolvedAt updated, resolutionMethod = "EV Collection"
   * - EV status: Reset to AVAILABLE
   * - Task status: COMPLETED
   */
  const advanceEVStatus = (evCode: string) => {
    const targetEV = evFleet.find(ev => ev.evCode === evCode);
    if (!targetEV) return;

    const nextStatusMap: Record<EVStatus, EVStatus> = {
      'AVAILABLE': 'DISPATCHED',
      'DISPATCHED': 'EN_ROUTE',
      'EN_ROUTE': 'ARRIVED',
      'ARRIVED': 'COLLECTING',
      'COLLECTING': 'COLLECTED',
      'COLLECTED': 'AVAILABLE',
      'RETURNING': 'AVAILABLE'
    };

    const nextStatus = nextStatusMap[targetEV.status] || 'AVAILABLE';
    const assignedBinCode = targetEV.assignedBin;
    const taskCode = targetEV.currentTask;

    if (nextStatus === 'COLLECTED') {
      // 1. Reset target bin fill to 0% and NORMAL
      if (assignedBinCode) {
        emptyBin(assignedBinCode);
      }

      // 2. Automatically resolve associated complaints
      setComplaints(prev => prev.map(c => {
        if (
          (assignedBinCode && c.binCode.toUpperCase() === assignedBinCode.toUpperCase() && c.status !== 'Resolved') ||
          (taskCode && c.collectionTaskId === taskCode) ||
          c.assignedEV === evCode
        ) {
          return {
            ...c,
            status: 'Resolved',
            resolvedAt: 'Just now',
            resolutionMethod: 'EV Collection'
          };
        }
        return c;
      }));

      // 3. Mark task as COMPLETED
      setCollectionTasks(prev => prev.map(t => {
        if (t.taskCode === taskCode || (assignedBinCode && t.binCode === assignedBinCode)) {
          return {
            ...t,
            status: 'COMPLETED',
            completedAt: 'Just now'
          };
        }
        return t;
      }));

      // 4. Reset EV
      setEvFleet(prev => prev.map(ev => {
        if (ev.evCode === evCode) {
          return {
            ...ev,
            status: 'COLLECTED',
            updatedAt: 'Just now'
          };
        }
        return ev;
      }));

      logActivity(
        'EV_COLLECTION_COMPLETED', 
        evCode, 
        `Collection completed for ${assignedBinCode || 'bin'}. Bin reset to 0% Normal and complaint marked RESOLVED.`
      );
      showToast('success', `Collection completed! ${assignedBinCode} reset to 0% and complaint RESOLVED.`, 'EV Task Completed');
    } else {
      // Update EV and Task status along the journey
      setEvFleet(prev => prev.map(ev => {
        if (ev.evCode === evCode) {
          return {
            ...ev,
            status: nextStatus,
            assignedBin: nextStatus === 'AVAILABLE' ? undefined : ev.assignedBin,
            currentTask: nextStatus === 'AVAILABLE' ? undefined : ev.currentTask,
            updatedAt: 'Just now'
          };
        }
        return ev;
      }));

      if (taskCode) {
        setCollectionTasks(prev => prev.map(t => {
          if (t.taskCode === taskCode) {
            return {
              ...t,
              status: nextStatus as TaskStatus,
              arrivedAt: nextStatus === 'ARRIVED' ? 'Just now' : t.arrivedAt
            };
          }
          return t;
        }));
      }

      logActivity('EV_STATUS_ADVANCED', evCode, `Advanced simulation status to ${nextStatus}`);
      showToast('info', `${evCode} status advanced to ${nextStatus}.`, 'Simulation Advanced');
    }
  };

  const resetEV = (evCode: string) => {
    setEvFleet(prev => prev.map(ev => {
      if (ev.evCode === evCode) {
        return {
          ...ev,
          status: 'AVAILABLE',
          assignedBin: undefined,
          currentTask: undefined,
          updatedAt: 'Just now'
        };
      }
      return ev;
    }));
    showToast('info', `${evCode} reset to AVAILABLE standby.`, 'Fleet Reset');
  };

  // Real feedback submission (starts empty!)
  const addFeedback = (rating: number, message: string) => {
    const newFb: FeedbackItem = {
      id: `fb-${Date.now()}`,
      customerId: currentUser?.id,
      rating,
      message,
      createdAt: 'Just now',
      userName: currentUser?.name || 'Verified Citizen'
    };
    setFeedbacks(prev => [newFb, ...prev]);
    showToast('success', 'Thank you for your valuable feedback!', 'Feedback Received');
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showToast('success', 'System preferences saved successfully.', 'Settings Saved');
  };

  // Clear all complaints from Cloud Firestore and state
  const clearComplaints = async () => {
    try {
      console.log(`[HAILO ${new Date().toISOString()}] Admin initiated complaint purge from Cloud Firestore...`);
      const snap = await getDocs(collection(db, 'complaints'));
      const deletions = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletions);
      console.log(`[HAILO ${new Date().toISOString()}] Successfully deleted ${snap.size} complaint(s) from Cloud Firestore.`);
    } catch (err) {
      console.error('Failed to clear complaints from Cloud Firestore:', err);
    }
    setComplaints([]);
    setCollectionTasks(prev => prev.filter(t => !t.complaintId));
    logActivity('COMPLAINTS_CLEARED', 'Admin', 'Purged all complaint records from Cloud Firestore');
    showToast('info', 'All complaints have been cleared from Cloud Firestore.', 'Complaints Reset');
  };

  // Hardware Simulation fill level trigger (Does NOT create complaints)
  const triggerDemoStepFlow = () => {
    updateBinFillLevel('BIN-003', 94);
    showToast('info', 'Simulated ultrasonic sensor fill level on BIN-003 updated to 94%.', 'Sensor Telemetry Updated');
  };

  const resetAllDemoData = () => {
    setBins(initialActiveBins);
    setEvFleet(initialEVFleet);
    setComplaints([]); // Real complaints start empty
    setRegisteredStaff(initialRegisteredStaff);
    setCollectionTasks([]);
    setFeedbacks([]); // Real feedback starts empty
    setActivityLogs(initialActivityLogs);
    setHardwareState({
      esp32Connected: true,
      ultrasonicActive: true,
      binSensorReading: true,
      lastSensorUpdateSecondsAgo: 2,
      currentDistanceCm: 6,
      simulatedFillLevel: 94,
      targetBinCode: 'BIN-003',
      isSimulating: false
    });
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.FEEDBACK);
    showToast('success', 'Demo data cleared. Complaint records reset to empty.', 'System Reset');
  };

  const triggerDemoOverflow = () => {
    const targetCode = hardwareState.targetBinCode || 'BIN-002';
    updateBinFillLevel(targetCode, 100);
    showToast('error', `Hardware alert triggered! ${targetCode} fill level reached 100% OVERFLOW.`, 'Sensor Threshold Triggered');
  };

  const triggerDemoComplaint = () => {
    showToast('info', 'Demo complaint generation is disabled. Please submit reports through dustbin QR placards or the report form.', 'Demo Generation Disabled');
  };

  const triggerDemoAutoCycle = () => {
    showToast('info', 'Telemetry and system status refreshed.', 'System Refreshed');
  };

  // Derived metrics
  const binsRequiringCollectionCount = bins.filter(b => b.currentFillLevel >= 80).length;
  const totalWasteLtr = bins.reduce((sum, b) => sum + Math.round((b.capacity * b.currentFillLevel) / 100), 0);
  const recyclableWasteLtr = bins
    .filter(b => b.wasteType === 'Bio' || b.wasteType === 'Paper' || b.wasteType === 'Plastic')
    .reduce((sum, b) => sum + Math.round((b.capacity * b.currentFillLevel) / 100), 0);
  const nonRecyclableWasteLtr = Math.max(0, totalWasteLtr - recyclableWasteLtr);
  const activeComplaintsCount = complaints.filter(c => {
    const s = (c.status || '').toUpperCase();
    return s !== 'RESOLVED' && s !== 'REJECTED';
  }).length;
  const overflowCount = bins.filter(b => b.status === 'OVERFLOW').length;

  // Filter complaints for current logged-in customer
  const customerComplaints = complaints.filter(c => {
    if (currentUser?.role === 'CUSTOMER') {
      return (
        c.customerId === currentUser.id ||
        c.source === 'CUSTOMER' ||
        (c.citizenName && currentUser.name && c.citizenName.toLowerCase() === currentUser.name.toLowerCase())
      );
    }
    return true;
  });

  const customerContributions = {
    total: customerComplaints.length,
    pending: customerComplaints.filter(c => {
      const s = (c.status || '').toUpperCase();
      return s !== 'RESOLVED' && s !== 'REJECTED';
    }).length,
    resolved: customerComplaints.filter(c => (c.status || '').toUpperCase() === 'RESOLVED').length
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authLoading,
        isAuthenticated: !authLoading && !!currentUser,
        isAdmin: !authLoading && currentUser?.role === 'ADMIN',
        isCustomer: !authLoading && currentUser?.role === 'CUSTOMER',
        loginWithFirebase,
        registerCustomerWithFirebase,
        loginAs,
        logout,
        bins,
        getBinByCode,
        addBin,
        editBin,
        removeBin,
        updateBinFillLevel,
        emptyBin,
        toggleBinActiveStatus,
        complaints,
        registeredStaff,
        getComplaintById,
        createComplaint,
        clearComplaints,
        syncComplaintsFromBackend,
        updateComplaintStatus,
        acceptComplaint,
        rejectComplaint,
        assignStaffToComplaint,
        reassignStaffToComplaint,
        uploadAfterCleaningPhoto,
        evFleet,
        collectionTasks,
        advanceEVStatus,
        resetEV,
        feedbacks,
        addFeedback,
        activityLogs,
        logActivity,
        hardwareState,
        setSimulatedFillLevel,
        setTargetBinCode,
        toggleHardwareConnection,
        demoMode,
        setDemoMode,
        triggerDemoStepFlow,
        triggerDemoOverflow,
        triggerDemoComplaint,
        triggerDemoAutoCycle,
        resetAllDemoData,
        settings,
        updateSettings,
        updateProductionDomain,
        toasts,
        showToast,
        removeToast,
        totalWasteLtr,
        recyclableWasteLtr,
        nonRecyclableWasteLtr,
        activeComplaintsCount,
        overflowCount,
        binsRequiringCollectionCount,
        customerComplaints,
        customerContributions
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
