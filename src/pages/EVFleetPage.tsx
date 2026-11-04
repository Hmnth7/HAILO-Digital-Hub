import React from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { 
  Truck, 
  BatteryCharging, 
  MapPin, 
  RotateCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';

export const EVFleetPage: React.FC = () => {
  const { 
    evFleet, 
    advanceEVStatus, 
    resetEV, 
    collectionTasks, 
    bins, 
    complaints,
    triggerDemoStepFlow
  } = useApp();

  const { navigate } = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Available', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
      case 'DISPATCHED':
        return { label: 'Assigned', color: 'bg-purple-50 text-purple-700 border border-purple-200 font-bold' };
      case 'EN_ROUTE':
        return { label: 'En Route (simulated)', color: 'bg-blue-50 text-blue-700 border border-blue-200 font-bold' };
      case 'ARRIVED':
        return { label: 'Arrived at Bin (simulated)', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold' };
      case 'COLLECTING':
        return { label: 'Collection in Progress', color: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold animate-pulse' };
      case 'COLLECTED':
        return { label: 'Collection Completed', color: 'bg-emerald-600 text-white font-extrabold' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Autonomous EV Collection Fleet</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800">
              Prototype Simulation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Electric waste collection rovers dispatched automatically when customers report full/overflowing dustbins or ultrasonic sensors exceed 80% threshold.
          </p>
        </div>

        <button
          onClick={triggerDemoStepFlow}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simulate Emergency Dispatch on BIN-003</span>
        </button>
      </div>

      {/* Advisory Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Demo Instructions:</strong> When an EV is in <strong>DISPATCHED</strong> status, click <strong>"Advance Simulation Status"</strong> to step through <code>EN_ROUTE → ARRIVED → COLLECTING → COLLECTED</code>. Upon reaching <strong>COLLECTED</strong>, the target dustbin resets automatically to <strong>0% Normal</strong> and the associated citizen complaint is automatically marked <strong>RESOLVED</strong>!
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {evFleet.map((ev) => {
          const assignedBin = ev.assignedBin ? bins.find(b => b.binCode === ev.assignedBin) : null;
          const assignedComplaint = ev.currentTask 
            ? complaints.find(c => c.assignedEV === ev.evCode && c.status !== 'Resolved')
            : null;

          return (
            <div
              key={ev.id}
              className={`bg-white rounded-2xl p-6 border shadow-xs transition-all flex flex-col justify-between space-y-5 ${
                ev.status !== 'AVAILABLE' 
                  ? 'border-purple-300 ring-2 ring-purple-500/10' 
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-mono font-black text-slate-900">{ev.evCode}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Autonomous Rover</span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${getStatusBadge(ev.status).color}`}>
                    {getStatusBadge(ev.status).label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" /> Battery
                    </div>
                    <span className="font-mono font-extrabold text-sm text-slate-900 mt-0.5 block">{ev.battery}%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 truncate mt-0.5 block">{ev.currentLocation}</span>
                  </div>
                </div>

                {/* Assignment Box */}
                {ev.assignedBin ? (
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" /> Active Mission Assignment
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{ev.assignedBin}</span>
                      <span className="text-[11px] font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {ev.currentTask}
                      </span>
                    </div>
                    {assignedBin && (
                      <p className="text-[11px] text-slate-600">
                        Target: {assignedBin.location} ({assignedBin.currentFillLevel}% Full)
                      </p>
                    )}
                    {assignedComplaint && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        Linked: {assignedComplaint.complaintCode} ({assignedComplaint.category})
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400">
                    No active mission. Standing by at depot.
                  </div>
                )}
              </div>

              {/* Simulation Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => advanceEVStatus(ev.evCode)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    ev.status === 'AVAILABLE'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {ev.status === 'AVAILABLE' 
                      ? 'Dispatch on Test Run' 
                      : `Advance Status (${ev.status} → Next)`}
                  </span>
                </button>

                {ev.status !== 'AVAILABLE' && (
                  <button
                    onClick={() => resetEV(ev.evCode)}
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-[11px] font-semibold transition-colors"
                  >
                    Reset EV to Available Standby
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collection Tasks Log */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-base font-bold text-slate-900">Autonomous Collection Tasks</h4>
            <p className="text-xs text-slate-500">History of automated mission dispatches</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {collectionTasks.length} Tasks
          </span>
        </div>

        {collectionTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No active collection tasks. Tasks are created automatically when a customer reports "Bin is Full" or "Overflowing Waste".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3 px-3">Task ID</th>
                  <th className="pb-3 px-3">Bin Code</th>
                  <th className="pb-3 px-3">Location</th>
                  <th className="pb-3 px-3">Assigned EV</th>
                  <th className="pb-3 px-3">Priority</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collectionTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{task.taskCode}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-emerald-700">{task.binCode}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{task.location}</td>
                    <td className="py-3 px-3 font-mono font-bold text-purple-700">{task.evCode}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(task.status).color}`}>
                        {getStatusBadge(task.status).label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{task.createdAt}</td>
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
