import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router/Router';
import { Complaint } from '../../types';
import { 
  FileText, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Camera, 
  ChevronRight, 
  X,
  Sparkles,
  ArrowLeft,
  User,
  Check,
  Ban
} from 'lucide-react';

export const MyReportsPage: React.FC = () => {
  const { customerComplaints } = useApp();
  const { navigate } = useRouter();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'IN PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ACCEPTED':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">My Incident Reports</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track real-time resolution and cleaning staff assignments for dustbins you reported.
          </p>
        </div>

        <button
          onClick={() => navigate('/report')}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
        >
          + Submit New Report
        </button>
      </div>

      {customerComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">You haven't submitted any reports yet.</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Scan any physical dustbin QR code on campus or open the report form directly to file an issue when you spot overflowing bins or litter.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Submit New Incident Report →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customerComplaints.map((c) => {
            const isResolved = c.status.toUpperCase() === 'RESOLVED';
            const isAssigned = c.status.toUpperCase() === 'ASSIGNED' || c.status.toUpperCase() === 'IN PROGRESS';
            const isRejected = c.status.toUpperCase() === 'REJECTED';

            return (
              <div
                key={c.id}
                data-report-card={c.complaintCode}
                onClick={() => setSelectedComplaint(c)}
                className={`bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isResolved 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/10'
                    : isAssigned 
                    ? 'border-purple-200 bg-purple-50/10' 
                    : 'border-slate-200/80'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-slate-900">{c.complaintCode}</span>
                        <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {c.binCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.location}</span>
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Problem Description */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                    <span className="font-bold text-slate-900 block mb-0.5">{c.category}</span>
                    <p className="line-clamp-2">"{c.description}"</p>
                  </div>

                  {/* Assigned Staff Info in Card */}
                  {c.assignedStaff && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      <span>Assigned Staff: <strong className="text-slate-900">{c.assignedStaff}</strong></span>
                    </div>
                  )}
                </div>

                {/* Footer Status Message */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  {isResolved ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {c.afterCleaningPhotoUrl ? "Cleaned & Photo Verified" : "Waste collected successfully."}
                    </span>
                  ) : isRejected ? (
                    <span className="text-rose-700 font-medium flex items-center gap-1 text-[11px]">
                      <Ban className="w-3.5 h-3.5" />
                      Report Rejected by Admin
                    </span>
                  ) : c.assignedStaff ? (
                    <span className="text-purple-700 font-semibold flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      Assigned to {c.assignedStaff}
                    </span>
                  ) : c.assignedEV ? (
                    <span className="text-purple-700 font-semibold flex items-center gap-1 text-[11px]">
                      <Truck className="w-3.5 h-3.5" />
                      Rover {c.assignedEV} en route
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      Pending review & assignment
                    </span>
                  )}

                  <span className="text-slate-400 text-[11px] font-medium shrink-0 ml-2">
                    {c.createdAt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-black text-slate-900">{selectedComplaint.complaintCode}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${getStatusBadge(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Submitted: {selectedComplaint.reportedAt || selectedComplaint.createdAt}</p>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Location</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedComplaint.binCode} — {selectedComplaint.location}
                </p>
                <span className="text-[11px] text-slate-500 block mt-0.5">Issue: <strong>{selectedComplaint.category}</strong></span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Description</span>
                <p className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-medium">
                  "{selectedComplaint.description}"
                </p>
              </div>

              {/* Citizen attached photo */}
              {(selectedComplaint.photo || selectedComplaint.photoUrl) && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Your Attached Photo</span>
                  <img
                    src={selectedComplaint.photo || selectedComplaint.photoUrl}
                    alt="Citizen submitted photo"
                    className="w-full h-auto max-h-44 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* Assigned Staff Details */}
              {selectedComplaint.assignedStaff && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-700" />
                    <div>
                      <span className="font-bold block text-xs">Assigned Cleaning Personnel</span>
                      <span className="text-[11px] text-purple-800 font-semibold">
                        {selectedComplaint.assignedStaff}
                        {selectedComplaint.assignedStaffId && ` (${selectedComplaint.assignedStaffId})`}
                      </span>
                    </div>
                  </div>
                  {selectedComplaint.assignedAt && (
                    <p className="text-[10px] text-purple-600 pl-6">
                      Assigned: {selectedComplaint.assignedAt}
                    </p>
                  )}
                </div>
              )}

              {/* Rejected Info */}
              {selectedComplaint.status.toUpperCase() === 'REJECTED' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Report Rejected by Administrator</span>
                  </div>
                  {selectedComplaint.rejectionReason && (
                    <p className="text-[11px] text-rose-800 pl-6">
                      Reason: "{selectedComplaint.rejectionReason}"
                    </p>
                  )}
                  {selectedComplaint.rejectedAt && (
                    <p className="text-[10px] text-rose-600 pl-6">
                      Date: {selectedComplaint.rejectedAt}
                    </p>
                  )}
                </div>
              )}

              {/* Resolved Info & After-Cleaning Verification Photo */}
              {selectedComplaint.status.toUpperCase() === 'RESOLVED' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm">The waste has been collected successfully.</span>
                      <span className="text-[11px] text-emerald-700 block mt-0.5">
                        Sanitation completed by: <strong>{selectedComplaint.assignedStaff || 'Cleaning Staff'}</strong>
                      </span>
                      {selectedComplaint.resolvedAt && (
                        <span className="text-[10px] text-emerald-600 block">
                          Verified at: {selectedComplaint.resolvedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* After-Cleaning Photograph Preview */}
                  {selectedComplaint.afterCleaningPhotoUrl && (
                    <div className="pt-2 border-t border-emerald-200/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        After-Cleaning Verification Photograph
                      </span>
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-900">
                        <img
                          src={selectedComplaint.afterCleaningPhotoUrl}
                          alt="After cleaning verification"
                          className="w-full h-auto max-h-52 object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedComplaint(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
