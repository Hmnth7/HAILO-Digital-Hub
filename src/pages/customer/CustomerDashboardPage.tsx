import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router/Router';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  ArrowRight, 
  Plus, 
  Sparkles,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Truck
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { 
    currentUser, 
    customerComplaints, 
    customerContributions, 
    bins 
  } = useApp();
  const { navigate } = useRouter();

  const recentCustomerReports = customerComplaints.slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-semibold border border-emerald-600/50">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Citizen Action Portal</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.name || 'Citizen'}!
          </h2>

          <p className="text-sm text-emerald-100 max-w-xl font-medium leading-relaxed">
            "Your contribution helps keep our surroundings clean."
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:bg-emerald-50 transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Report Dustbin Issue</span>
            </button>

            <button
              onClick={() => navigate('/customer/reports')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700/70 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors border border-emerald-600"
            >
              <span>View My Reports ({customerContributions.total})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reports Submitted</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{customerContributions.total}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Your logged complaints</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Reports</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600">{customerContributions.pending}</span>
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-1 block">In dispatch / clearance queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved Reports</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-600">{customerContributions.resolved}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Cleaned & sanitized</span>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Recent Incident Reports</h3>
            <p className="text-xs text-slate-500">Live clearance tracking for your reported locations</p>
          </div>

          <button
            onClick={() => navigate('/customer/reports')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            All Reports ({customerContributions.total}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCustomerReports.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">You haven't submitted any reports yet.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Scan a dustbin QR code around campus to file an issue whenever a bin is full or requires cleaning.
            </p>
            <button
              onClick={() => navigate('/report')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Submit New Incident Report →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3 px-3">Complaint ID</th>
                  <th className="pb-3 px-3">Dustbin</th>
                  <th className="pb-3 px-3">Location</th>
                  <th className="pb-3 px-3">Issue Reported</th>
                  <th className="pb-3 px-3">Cleaning Staff / Unit</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCustomerReports.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{c.complaintCode}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">{c.binCode}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{c.location}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800 block">{c.category}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{c.createdAt}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      {c.assignedStaff ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {c.assignedStaff}
                        </span>
                      ) : c.assignedEV ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          <Truck className="w-3 h-3" /> {c.assignedEV}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        c.status.toUpperCase() === 'RESOLVED' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : c.status.toUpperCase() === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : c.status.toUpperCase() === 'ASSIGNED' || c.status.toUpperCase() === 'IN PROGRESS'
                          ? 'bg-purple-100 text-purple-800' 
                          : c.status.toUpperCase() === 'ACCEPTED'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => navigate('/customer/reports')}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
