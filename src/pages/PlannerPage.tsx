import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { 
  CalendarCheck, 
  Truck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Sparkles,
  Zap,
  Filter
} from 'lucide-react';

export const PlannerPage: React.FC = () => {
  const { 
    collectionTasks, 
    advanceEVStatus, 
    bins, 
    triggerDemoStepFlow 
  } = useApp();
  const { navigate } = useRouter();

  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTasks = collectionTasks.filter(t => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EN_ROUTE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ARRIVED':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'COLLECTING':
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'COLLECTED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Collection & Dispatch Planner</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800">
              Autonomous Dispatch Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Automatically generated collection requests created when citizens report full bins or ultrasonic sensors detect critical fill thresholds.
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

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold">
          Showing <strong>{filteredTasks.length}</strong> collection tasks
        </span>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="COLLECTING">COLLECTING</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No Collection Tasks in Queue</p>
            <p className="max-w-sm mx-auto text-slate-500">
              When a citizen reports <em>"Bin is Full"</em> or <em>"Overflowing Waste"</em> on a dustbin QR, an autonomous collection task is automatically generated and an available EV rover is assigned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Task ID</th>
                  <th className="py-3.5 px-4">Bin Code</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Assigned EV</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Mission Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Simulation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{task.taskCode}</td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-800">
                      <span 
                        onClick={() => navigate(`/admin/bins/${task.binCode}`)}
                        className="hover:underline cursor-pointer"
                      >
                        {task.binCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{task.location}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      <span 
                        onClick={() => navigate('/admin/ev')}
                        className="hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {task.evCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{task.createdAt}</td>
                    <td className="py-3.5 px-4 text-right">
                      {task.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => advanceEVStatus(task.evCode)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Advance EV</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                        </span>
                      )}
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
