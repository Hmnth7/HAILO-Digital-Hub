import React, { useEffect, useState } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Complaint } from '../types';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  RotateCcw,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const ComplaintSuccessPage: React.FC<{ complaintId?: string }> = ({ complaintId: routeId }) => {
  const { params, navigate } = useRouter();
  const { getComplaintById, complaints, isAdmin, isAuthenticated } = useApp();

  // Robust complaint code resolution: props -> params -> URL pathname/hash
  const activeId = React.useMemo(() => {
    if (routeId) return routeId.trim().toUpperCase();
    if (params.complaintId) return params.complaintId.trim().toUpperCase();
    if (typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/\/report\/success\/([A-Za-z0-9_-]+)/i);
      if (pathMatch && pathMatch[1]) return pathMatch[1].trim().toUpperCase();
      const hashMatch = window.location.hash.match(/\/report\/success\/([A-Za-z0-9_-]+)/i);
      if (hashMatch && hashMatch[1]) return hashMatch[1].trim().toUpperCase();
    }
    return '';
  }, [routeId, params.complaintId]);

  // Check if complaint is already in context state
  const contextComplaint = React.useMemo(() => {
    if (!activeId) return null;
    return getComplaintById(activeId) || null;
  }, [activeId, complaints, getComplaintById]);

  const [dbComplaint, setDbComplaint] = useState<Complaint | null>(contextComplaint);
  const [isVerifying, setIsVerifying] = useState<boolean>(!contextComplaint && !!activeId);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Fallback to direct Firestore confirmation if context state hasn't updated yet or on direct URL navigation
  useEffect(() => {
    if (contextComplaint) {
      setDbComplaint(contextComplaint);
      setIsVerifying(false);
      setVerifyError(null);
      return;
    }

    if (!activeId) {
      setIsVerifying(false);
      setVerifyError('No complaint tracking code was specified in the report URL.');
      return;
    }

    let isMounted = true;
    const verifyInFirestore = async () => {
      try {
        setIsVerifying(true);
        const docRef = doc(db, 'complaints', activeId);
        const snap = await getDoc(docRef);
        if (isMounted) {
          if (snap.exists()) {
            const data = snap.data() as Complaint;
            setDbComplaint({
              ...data,
              id: snap.id,
              complaintCode: data.complaintCode || snap.id
            });
            setVerifyError(null);
          } else {
            setVerifyError(`Complaint "${activeId}" could not be confirmed in Cloud Firestore.`);
          }
          setIsVerifying(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to verify complaint in Cloud Firestore:', err);
          setVerifyError(err?.message || 'Database error occurred while verifying report.');
          setIsVerifying(false);
        }
      }
    };

    verifyInFirestore();
    return () => { isMounted = false; };
  }, [activeId, contextComplaint]);

  const verifiedComplaint = contextComplaint || dbComplaint;

  // Trigger celebration confetti only when complaint is confirmed in Cloud Firestore
  useEffect(() => {
    if (verifiedComplaint) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [verifiedComplaint]);

  const hasEV = !!verifiedComplaint?.assignedEV;

  // 1. Verifying State (Awaiting confirmation from Cloud Firestore)
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl relative z-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verifying Report...</h2>
          <p className="text-xs text-slate-500">
            Confirming physical document creation in Cloud Firestore database.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State: Complaint was NOT confirmed or written to Cloud Firestore
  if (verifyError || !verifiedComplaint) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-red-200 shadow-2xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-red-50">
            <AlertCircle className="w-9 h-9 stroke-[2.2]" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Report Not Confirmed
            </h1>
            <p className="text-xs text-red-600 font-medium mt-1 leading-relaxed">
              {verifyError || 'This complaint could not be found or verified in Cloud Firestore.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              The submission may have encountered a database permission error or network interruption.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate('/report')}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>← Return to Report Form</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success State: Verified complaint confirmed directly in Cloud Firestore
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

        {/* Verification Card with confirmed Firestore data */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Complaint ID:</span>
            <span className="font-mono font-extrabold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {verifiedComplaint.complaintCode}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Target Bin:</span>
            <span className="font-mono font-bold text-emerald-800">
              {verifiedComplaint.binCode}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Location:</span>
            <span className="font-medium text-slate-700">
              {verifiedComplaint.location}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-semibold text-slate-500">Issue:</span>
            <span className="font-bold text-slate-800">
              {verifiedComplaint.category}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${
              hasEV ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hasEV ? 'Collection Dispatched' : (verifiedComplaint.status || 'Pending')}
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
                Rover <strong>{verifiedComplaint.assignedEV}</strong> has been automatically assigned (Task {verifiedComplaint.collectionTaskId}) and is en route to empty this dustbin.
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
            onClick={() => navigate(isAdmin ? '/admin/complaints' : (isAuthenticated ? '/customer/dashboard' : '/report'))}
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
