import React, { useEffect } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  Clock, 
  Sparkles,
  MapPin,
  RotateCcw
} from 'lucide-react';

export const ComplaintSuccessPage: React.FC<{ complaintId?: string }> = ({ complaintId: routeId }) => {
  const { params, navigate } = useRouter();
  const { getComplaintById, complaints, isAdmin } = useApp();

  const activeId = routeId || params.complaintId || 'CMP-001';
  const complaint = getComplaintById(activeId) || complaints[0];

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const hasEV = !!complaint?.assignedEV;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xl relative z-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
          <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Report Submitted Successfully ✓
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
            Thank you for helping keep our surroundings clean.
          </p>
        </div>

        {/* Verification Card */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Complaint ID:</span>
            <span className="font-mono font-extrabold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {complaint ? complaint.complaintCode : activeId}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Target Bin:</span>
            <span className="font-mono font-bold text-emerald-800">
              {complaint ? complaint.binCode : 'BIN-003'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Location:</span>
            <span className="font-medium text-slate-700">
              {complaint ? complaint.location : 'Hostel'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Issue:</span>
            <span className="font-bold text-slate-800">
              {complaint ? complaint.category : 'Bin Full'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${
              hasEV ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hasEV ? 'Collection Dispatched' : 'Pending'}
            </span>
          </div>
        </div>

        {/* EV Dispatched Notification Banner */}
        {hasEV ? (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs text-left flex items-start gap-3">
            <Truck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Autonomous EV Collection Dispatched!</span>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Rover <strong>{complaint.assignedEV}</strong> has been automatically assigned (Task {complaint.collectionTaskId}) and is en route to empty this dustbin.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            "Our waste-management team has received your report."
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/customer/dashboard')}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <span>Back to Home</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/report')}
            className="w-full py-2 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Submit Another Incident</span>
          </button>
        </div>
      </div>
    </div>
  );
};
