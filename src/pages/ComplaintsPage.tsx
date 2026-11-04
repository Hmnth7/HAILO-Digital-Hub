import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { Complaint, ComplaintStatus, ComplaintPriority } from '../types';
import { 
  AlertCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  X, 
  ChevronRight, 
  Sparkles,
  Camera,
  AlertTriangle,
  Check,
  Ban,
  Upload,
  UserCheck,
  UserPlus,
  RefreshCw,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const { 
    complaints, 
    registeredStaff,
    updateComplaintStatus, 
    acceptComplaint,
    rejectComplaint,
    assignStaffToComplaint,
    reassignStaffToComplaint,
    uploadAfterCleaningPhoto,
    clearComplaints,
    showToast 
  } = useApp();
  const { navigate } = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Rejection reason modal / inline state
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Staff assignment state
  const [selectedStaffCode, setSelectedStaffCode] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Admin notes input
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Inline resolution error if attempted without photo
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // File input ref for after-cleaning photo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Always derive selectedComplaint directly from fresh context complaints without selecting fake complaints
  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId) || (complaints.length > 0 ? complaints[0] : null);

  useEffect(() => {
    if (selectedComplaint) {
      if (!selectedStaffCode || selectedComplaint.assignedStaffId) {
        setSelectedStaffCode(selectedComplaint.assignedStaffId || registeredStaff[0]?.staffCode || '');
      }
    }
  }, [selectedComplaint?.id, selectedComplaint?.assignedStaffId, registeredStaff]);

  const filteredComplaints = complaints.filter(c => {
    const s = search.toLowerCase();
    const matchesSearch = 
      c.complaintCode.toLowerCase().includes(s) ||
      c.binCode.toLowerCase().includes(s) ||
      c.location.toLowerCase().includes(s) ||
      c.category.toLowerCase().includes(s) ||
      c.description.toLowerCase().includes(s) ||
      (c.assignedStaff && c.assignedStaff.toLowerCase().includes(s));

    const matchesStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesPriority = priorityFilter === 'ALL' || c.priority.toUpperCase() === priorityFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-600 text-white font-extrabold animate-pulse';
      case 'HIGH':
        return 'bg-red-100 text-red-800 font-bold border border-red-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 font-bold border border-amber-200';
      case 'LOW':
      default:
        return 'bg-blue-100 text-blue-800 font-semibold border border-blue-200';
    }
  };

  const getStatusBadge = (status: ComplaintStatus | string) => {
    const s = String(status).toUpperCase();
    switch (s) {
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'IN PROGRESS':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ASSIGNED':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'ACCEPTED':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  // Status transitions
  const handleAccept = () => {
    if (!selectedComplaint) return;
    setResolutionError(null);
    acceptComplaint(selectedComplaint.id);
  };

  const handleStartReject = () => {
    setIsRejecting(true);
    setRejectionReasonInput('');
  };

  const handleConfirmReject = () => {
    if (!selectedComplaint) return;
    setResolutionError(null);
    rejectComplaint(selectedComplaint.id, rejectionReasonInput.trim() || 'Rejected by Administrator');
    setIsRejecting(false);
  };

  const handleAssignStaff = (reassign = false) => {
    const staffCodeToUse = selectedStaffCode || registeredStaff[0]?.staffCode || '';
    if (!selectedComplaint || !staffCodeToUse) {
      showToast('error', 'Please select a registered cleaning staff member from the list.', 'Selection Required');
      return;
    }
    setResolutionError(null);
    if (reassign) {
      reassignStaffToComplaint(selectedComplaint.id, staffCodeToUse);
      setIsReassigning(false);
    } else {
      assignStaffToComplaint(selectedComplaint.id, staffCodeToUse);
    }
  };

  const handleDirectStatusChange = (status: ComplaintStatus) => {
    if (!selectedComplaint) return;
    setResolutionError(null);

    const norm = status.toUpperCase();
    if (norm === 'RESOLVED') {
      if (!selectedComplaint.afterCleaningPhotoUrl) {
        setResolutionError('Resolution Blocked: You must upload an after-cleaning verification photograph before marking this complaint as RESOLVED.');
        showToast('error', 'You must upload an after-cleaning photograph before marking this complaint as RESOLVED.', 'Photo Required');
        return;
      }
    }

    updateComplaintStatus(selectedComplaint.id, status, {
      adminNote: adminNoteInput || selectedComplaint.adminNote,
      assignedStaff: selectedComplaint.assignedStaff,
      assignedStaffId: selectedComplaint.assignedStaffId,
      afterCleaningPhotoUrl: selectedComplaint.afterCleaningPhotoUrl
    });
  };

  // After-cleaning photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedComplaint) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload a valid image file (JPEG, PNG, WebP).', 'Invalid File');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      uploadAfterCleaningPhoto(selectedComplaint.id, result);
      setResolutionError(null);
    };
    reader.onerror = () => {
      showToast('error', 'Failed to read image file. Please try again.', 'Upload Error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (!selectedComplaint) return;
    updateComplaintStatus(selectedComplaint.id, selectedComplaint.status, {
      afterCleaningPhotoUrl: ''
    });
    showToast('info', 'After-cleaning photograph removed.', 'Photo Removed');
  };

  const handleSaveNotes = () => {
    if (!selectedComplaint) return;
    updateComplaintStatus(selectedComplaint.id, selectedComplaint.status, {
      adminNote: adminNoteInput
    });
    showToast('success', 'Admin internal notes updated.', 'Saved');
  };

  // Find currently assigned staff details from registered roster
  const assignedStaffDetail = selectedComplaint?.assignedStaffId
    ? registeredStaff.find(s => s.staffCode === selectedComplaint.assignedStaffId)
    : registeredStaff.find(s => s.name === selectedComplaint?.assignedStaff);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Citizen Complaints & Cleaning Workflow</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {complaints.filter(c => c.status.toUpperCase() !== 'RESOLVED' && c.status.toUpperCase() !== 'REJECTED').length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Accept or reject reports, assign registered municipal cleaning staff, verify after-cleaning photos, and track resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {complaints.length > 0 && (
            <button
              type="button"
              onClick={clearComplaints}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-colors"
              title="Clear all complaints from storage"
            >
              Clear All Complaints
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Submit New Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Complaint ID (e.g. CMP-1024), Bin ID, location, staff, or issue..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px] uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN PROGRESS">IN PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px] uppercase">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: List on Left (7 cols), Details on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Complaints Table (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Bin Code</th>
                  <th className="py-3 px-3">Problem</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Staff</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                        <p className="font-bold text-slate-700 text-sm">No complaints received yet.</p>
                        <p className="text-xs text-slate-400">
                          {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                            ? 'No complaints match the current filter criteria.'
                            : 'New citizen reports submitted via dustbin QR placards will appear here in real time.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const isSelected = selectedComplaint?.id === c.id;

                    return (
                      <tr
                        key={c.id}
                        data-complaint-row={c.complaintCode}
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setAdminNoteInput(c.adminNote || '');
                          setSelectedStaffCode(c.assignedStaffId || '');
                          setResolutionError(null);
                          setIsRejecting(false);
                          setIsReassigning(false);
                        }}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-slate-900 block">
                            {c.complaintCode}
                          </span>
                          <span 
                            data-source-badge={c.source || 'QR_SCAN'} 
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                              c.source === 'ADMIN' 
                                ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                : c.source === 'CUSTOMER' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {c.source === 'ADMIN' ? 'Admin Portal' : c.source === 'CUSTOMER' ? 'Customer Portal' : 'QR Scan'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-semibold text-emerald-700">
                            {c.binCode}
                          </span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                            {c.location}
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800 line-clamp-1">
                            {c.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.reportedAt || c.createdAt}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadge(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {c.assignedStaff ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {c.assignedStaff.charAt(0)}
                              </span>
                              <div className="truncate max-w-[110px]">
                                <span className="font-semibold text-slate-900 block truncate text-[11px]">
                                  {c.assignedStaff}
                                </span>
                                {c.assignedStaffId && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {c.assignedStaffId}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50 flex items-center justify-between">
            <span>Showing {filteredComplaints.length} of {complaints.length} complaints</span>
            <span className="text-[11px]">Click any row to open incident details</span>
          </div>
        </div>

        {/* Selected Complaint Detail Panel (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          {selectedComplaint ? (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-slate-900">
                      {selectedComplaint.complaintCode}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase ${getPriorityBadge(selectedComplaint.priority)}`}>
                      {selectedComplaint.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reported: <strong>{selectedComplaint.reportedAt || selectedComplaint.createdAt}</strong>
                  </p>
                </div>

                <span 
                  data-testid="detail-status-badge"
                  className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusBadge(selectedComplaint.status)}`}
                >
                  {selectedComplaint.status}
                </span>
              </div>

              {/* Target Bin Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Dustbin</span>
                  <div data-testid="detail-bin-code" className="font-mono font-bold text-sm text-emerald-800">
                    {selectedComplaint.binCode}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span data-testid="detail-bin-location">{selectedComplaint.location}</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/bins/${selectedComplaint.binCode}`)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  View Bin →
                </button>
              </div>

              {/* Problem Description & Categories */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Citizen Problem Description
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-800 leading-relaxed font-medium">
                  "{selectedComplaint.description}"
                </div>

                {selectedComplaint.categories && selectedComplaint.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedComplaint.categories.map((cat, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Citizen Photo Preview if available */}
              {(selectedComplaint.photo || selectedComplaint.photoUrl) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-slate-500" /> Citizen Attached Photo
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-40 bg-slate-900 flex items-center justify-center">
                    <img
                      src={selectedComplaint.photo || selectedComplaint.photoUrl}
                      alt="Complaint attachment"
                      className="w-full h-auto object-cover max-h-40 hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
              )}

              {/* Citizen Information */}
              <div className="text-xs text-slate-600 space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Submission Source</span>
                  <span 
                    data-testid="detail-complaint-source"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedComplaint.source === 'ADMIN'
                        ? 'bg-slate-200 text-slate-800'
                        : selectedComplaint.source === 'CUSTOMER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedComplaint.source === 'ADMIN' ? 'Admin Portal' : selectedComplaint.source === 'CUSTOMER' ? 'Customer Portal' : 'QR Scan'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reported by: <strong>{selectedComplaint.citizenName || 'Anonymous Citizen'}</strong></span>
                </div>
                {selectedComplaint.citizenContact && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact: {selectedComplaint.citizenContact}</span>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* REQUIREMENT 1: Accept / Reject Controls (Active when PENDING) */}
              {/* ------------------------------------------------------------- */}
              {selectedComplaint.status.toUpperCase() === 'PENDING' && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-700" />
                      Pending Triage
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold">Step 1: Accept or Reject</span>
                  </div>

                  {!isRejecting ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="accept-complaint-btn"
                        onClick={handleAccept}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept Complaint</span>
                      </button>

                      <button
                        type="button"
                        data-testid="reject-complaint-btn"
                        onClick={handleStartReject}
                        className="py-2.5 px-3 rounded-xl bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Ban className="w-4 h-4 text-rose-600" />
                        <span>Reject Complaint</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-amber-200">
                      <label className="text-[11px] font-bold text-rose-800 block">
                        Reason for Rejection:
                      </label>
                      <input
                        type="text"
                        data-testid="rejection-reason-input"
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        placeholder="e.g. Duplicate report, invalid dustbin location, non-municipal issue..."
                        className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid="confirm-reject-btn"
                          onClick={handleConfirmReject}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRejecting(false)}
                          className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* If Rejected Banner */}
              {selectedComplaint.status.toUpperCase() === 'REJECTED' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Complaint Rejected</span>
                  </div>
                  {selectedComplaint.rejectionReason && (
                    <p className="text-[11px] text-rose-700 pl-6">
                      Reason: "{selectedComplaint.rejectionReason}"
                    </p>
                  )}
                  {selectedComplaint.rejectedAt && (
                    <p className="text-[10px] text-rose-500 pl-6">
                      Rejected at: {selectedComplaint.rejectedAt}
                    </p>
                  )}
                  <div className="pt-2 pl-6">
                    <button
                      type="button"
                      onClick={handleAccept}
                      className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-[11px] font-bold text-rose-800 hover:bg-rose-100"
                    >
                      Re-open & Accept Complaint →
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REQUIREMENT 2, 3, 10: Registered Cleaning Staff Assignment    */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    Assigned Cleaning Staff
                  </span>
                  {selectedComplaint.assignedStaff && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Assigned
                    </span>
                  )}
                </div>

                {/* If staff is already assigned, display their profile card */}
                {selectedComplaint.assignedStaff ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {selectedComplaint.assignedStaff}
                          </span>
                          {selectedComplaint.assignedStaffId && (
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                              {selectedComplaint.assignedStaffId}
                            </span>
                          )}
                        </div>

                        {assignedStaffDetail && (
                          <div className="text-[11px] text-slate-500 space-y-0.5 pt-0.5">
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{assignedStaffDetail.phone}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Zone: {assignedStaffDetail.zone} • {assignedStaffDetail.shift} Shift
                            </p>
                          </div>
                        )}

                        {selectedComplaint.assignedAt && (
                          <p className="text-[10px] text-slate-400 pt-0.5">
                            Assigned on: {selectedComplaint.assignedAt}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid="toggle-reassign-btn"
                        onClick={() => {
                          setIsReassigning(!isReassigning);
                          setSelectedStaffCode(selectedComplaint.assignedStaffId || registeredStaff[0]?.staffCode || '');
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-500" />
                        <span>Reassign</span>
                      </button>
                    </div>

                    {/* Reassign selector toggle */}
                    {isReassigning && (
                      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                        <label className="text-[11px] font-bold text-purple-900 block">
                          Select New Cleaning Staff Member:
                        </label>
                        <select
                          data-testid="reassign-staff-select"
                          value={selectedStaffCode}
                          onChange={(e) => setSelectedStaffCode(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {registeredStaff.map(s => (
                            <option key={s.staffCode} value={s.staffCode}>
                              {s.staffCode} — {s.name} ({s.zone})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="confirm-reassign-btn"
                            onClick={() => handleAssignStaff(true)}
                            className="flex-1 py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Confirm Reassignment
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsReassigning(false)}
                            className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Staff not yet assigned -> Selector */
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Assign to Registered Municipal Staff:
                    </label>
                    <select
                      data-testid="staff-selection-dropdown"
                      value={selectedStaffCode}
                      onChange={(e) => setSelectedStaffCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select registered staff member...</option>
                      {registeredStaff.map(s => (
                        <option key={s.staffCode} value={s.staffCode}>
                          {s.staffCode} — {s.name} ({s.zone} • {s.shift})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      data-testid="assign-staff-btn"
                      onClick={() => handleAssignStaff(false)}
                      disabled={!selectedStaffCode}
                      className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign Selected Staff Member</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* REQUIREMENT 4: Status Workflow Controls                       */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Update Resolution Status
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Workflow Progress
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(['PENDING', 'ACCEPTED', 'ASSIGNED', 'IN PROGRESS', 'RESOLVED'] as ComplaintStatus[]).map((st) => {
                    const isCurrent = selectedComplaint.status.toUpperCase() === st.toUpperCase();
                    return (
                      <button
                        key={st}
                        type="button"
                        data-status-btn={st}
                        onClick={() => handleDirectStatusChange(st)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border text-center ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* REQUIREMENT 5 & 6: After-Cleaning Photograph Verification     */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    After-Cleaning Photograph Verification
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
                    Required for Resolution
                  </span>
                </div>

                {selectedComplaint.afterCleaningPhotoUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group">
                      <img
                        src={selectedComplaint.afterCleaningPhotoUrl}
                        alt="After cleaning verification"
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verification Photo Uploaded</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-emerald-700 hover:underline font-semibold text-[11px]"
                      >
                        Replace Photograph
                      </button>
                      <button
                        type="button"
                        data-testid="remove-photo-btn"
                        onClick={handleRemovePhoto}
                        className="text-rose-600 hover:underline font-semibold text-[11px]"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="photo-upload-dropzone"
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white rounded-xl text-center cursor-pointer transition-colors space-y-1.5"
                  >
                    <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Upload After-Cleaning Photograph
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Click to choose or take an after-cleaning photo. A valid photograph is mandatory to mark this complaint as RESOLVED.
                    </p>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  data-testid="after-cleaning-file-input"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                {/* Resolution Warning / Block Banner */}
                {resolutionError && (
                  <div 
                    data-testid="resolution-error-banner"
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Resolution Blocked:</strong>
                      <span>{resolutionError}</span>
                    </div>
                  </div>
                )}

                {/* Prominent Mark Resolved Action */}
                {selectedComplaint.status.toUpperCase() !== 'RESOLVED' && selectedComplaint.status.toUpperCase() !== 'REJECTED' && (
                  <button
                    type="button"
                    data-testid="mark-resolved-btn"
                    onClick={() => handleDirectStatusChange('RESOLVED')}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Mark Complaint RESOLVED</span>
                  </button>
                )}

                {/* If Resolved, show completion summary */}
                {selectedComplaint.status.toUpperCase() === 'RESOLVED' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Complaint Fully Resolved</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 pl-6">
                      Sanitation verified by: <strong>{selectedComplaint.assignedStaff || 'Staff Member'}</strong>
                    </p>
                    <p className="text-[10px] text-emerald-600 pl-6">
                      Completed at: <strong>{selectedComplaint.resolvedAt || 'Verified'}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-500 block">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Add supervisor notes, dispatch updates, or maintenance details..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Save Internal Notes
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600 text-sm">No complaints received yet.</p>
              <p className="text-xs text-slate-400 max-w-xs">
                {complaints.length === 0 
                  ? 'When citizens scan dustbin QR placards and submit reports, incident details and cleaning triage controls will be available here.'
                  : 'Select a complaint from the table to view details and assign cleaning staff.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
