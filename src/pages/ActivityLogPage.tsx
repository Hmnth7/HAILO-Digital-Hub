import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Truck, 
  Trash2, 
  Zap, 
  User
} from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useApp();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = filterAction === 'ALL' || log.action.includes(filterAction);

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('STAFF') || action.includes('CLEANING')) {
      return { icon: User, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
    if (action.includes('DISPATCH') || action.includes('EV')) {
      return { icon: Truck, color: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    if (action.includes('BIN')) {
      return { icon: Trash2, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (action.includes('COMPLAINT')) {
      return { icon: Zap, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { icon: Activity, color: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">System Activity Audit Log</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Immutable chronological telemetry of operational events, automated EV dispatches, bin capacity alterations, and administrative interventions.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
          {activityLogs.length} Events Logged
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity log by action, target (EV-01, BIN-003), or details..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold uppercase">Category:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="STAFF">Cleaning Staff & Sanitation</option>
            <option value="COMPLAINT">Citizen Complaints</option>
            <option value="EV">EV Fleet & Dispatch</option>
            <option value="BIN">Dustbin Fleet</option>
            <option value="LOGIN">Admin Auth</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No activities matching criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const { icon: Icon, color } = getActionBadge(log.action);

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-4"
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {log.action}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-emerald-800">
                          {log.target}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {log.timestamp}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {log.details}
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                      <User className="w-3 h-3" />
                      <span>Initiator: <strong>{log.adminName}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
