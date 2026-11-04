import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  TrendingUp, 
  Recycle, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Inbox
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { 
    bins, 
    complaints, 
    totalWasteLtr, 
    recyclableWasteLtr, 
    nonRecyclableWasteLtr,
    activeComplaintsCount,
    overflowCount
  } = useApp();

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved' || c.status === 'RESOLVED').length;
  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'RESOLVED').length;
  const avgFillLevel = bins.length > 0 ? Math.round(bins.reduce((sum, b) => sum + b.currentFillLevel, 0) / bins.length) : 0;

  // Status distribution for Pie Chart
  const statusCounts = {
    NORMAL: bins.filter(b => b.status === 'NORMAL').length,
    APPROACHING_FULL: bins.filter(b => b.status === 'APPROACHING_FULL').length,
    ALMOST_FULL: bins.filter(b => b.status === 'ALMOST_FULL').length,
    FULL: bins.filter(b => b.status === 'FULL').length,
    OVERFLOW: bins.filter(b => b.status === 'OVERFLOW').length,
  };

  const statusPieData = [
    { name: 'Normal (0-59%)', value: statusCounts.NORMAL, color: '#10b981' },
    { name: 'Approaching (60-79%)', value: statusCounts.APPROACHING_FULL, color: '#14b8a6' },
    { name: 'Almost Full (80-94%)', value: statusCounts.ALMOST_FULL, color: '#f59e0b' },
    { name: 'Full (95-99%)', value: statusCounts.FULL, color: '#ef4444' },
    { name: 'Overflow (100%)', value: statusCounts.OVERFLOW, color: '#991b1b' },
  ].filter(item => item.value > 0);

  // Complaints by category - Strictly from stored complaints
  const categoryCounts: Record<string, number> = {};
  complaints.forEach(c => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });

  const categoryBarData = Object.entries(categoryCounts).map(([cat, count]) => ({
    category: cat.length > 15 ? cat.substring(0, 15) + '...' : cat,
    count
  }));

  // Actual collections recorded in database
  const allCollections = bins.flatMap(b => (b.collections || []).map(c => ({
    ...c,
    binCode: b.binCode,
    location: b.location
  })));

  // Bins Volume data by dustbin
  const binVolumeData = bins.map(b => ({
    binCode: b.binCode,
    fillLtr: Math.round(b.capacity * (b.currentFillLevel / 100)),
    capacity: b.capacity,
    percent: b.currentFillLevel
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Municipal & Campus Waste Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic diversion metrics, ultrasonic fill profiles, and citizen grievance trends calculated from stored records.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {totalWasteLtr > 0 
              ? `${Math.round((recyclableWasteLtr / Math.max(1, totalWasteLtr)) * 100)}% Recyclable Diversion`
              : '100% Grid Ready'}
          </span>
        </div>
      </div>

      {/* 8 Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Waste</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalWasteLtr} <span className="text-xs text-slate-400 font-semibold">Ltr</span></p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Live across {bins.length} bins</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recyclable Waste</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{recyclableWasteLtr} <span className="text-xs text-slate-400 font-semibold">Ltr</span></p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Bio, Paper, Plastic</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Non-Recyclable</span>
          <p className="text-2xl font-black text-slate-700 mt-1">{nonRecyclableWasteLtr} <span className="text-xs text-slate-400 font-semibold">Ltr</span></p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Residual mixed waste</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Fill Level</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{avgFillLevel}%</p>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">Across campus fleet</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Complaints</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalComplaints}</p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Reported via QR scans</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolved Complaints</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedComplaints}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            {totalComplaints > 0 ? `${Math.round((resolvedComplaints / totalComplaints) * 100)}% resolution rate` : '0 pending'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Complaints</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingComplaints}</p>
          <span className="text-[10px] text-amber-600 font-semibold mt-1 block">Awaiting sanitation</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Collections</span>
          <p className="text-2xl font-black text-purple-700 mt-1">{allCollections.length}</p>
          <span className="text-[10px] text-purple-600 font-semibold mt-1 block">By EV autonomous fleet</span>
        </div>
      </div>

      {/* Row 1: Real-time Bin Volume Breakdown & Fill Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time volume across bins (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Dustbin Telemetric Volume Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated from ultrasonic sensors and dustbin capacities (Liters)</p>
            </div>
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={binVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="binCode" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} unit="L" />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1">
                          <p className="font-bold">{label}</p>
                          <p className="text-emerald-400">Current Waste: {data.fillLtr} L ({data.percent}%)</p>
                          <p className="text-slate-300">Total Capacity: {data.capacity} L</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="fillLtr" name="Current Fill (L)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Fill Status Distribution (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Fleet Status Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Threshold categorization of all active bins</p>
            </div>
            <PieIcon className="w-5 h-5 text-teal-600" />
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <p className="text-xs text-slate-400">No bins registered</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-semibold">
                            <span>{data.name}: <strong>{data.value} bins</strong></span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend chips */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-100">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Complaints by Category & Recorded Collection Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaints by Category */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Complaints by Category</h3>
              <p className="text-xs text-slate-500 mt-0.5">Frequency of reported incident types from QR scans</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>

          {categoryBarData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Inbox className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-xs">No complaints logged yet.</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                When campus citizens submit reports via QR code, incident breakdown will populate here.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="category" type="category" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-semibold">
                            <span>{payload[0].payload.category}: <strong>{payload[0].value} reports</strong></span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Collection History Records */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recorded Sanitation Clearances</h3>
              <p className="text-xs text-slate-500 mt-0.5">Verified collections performed by autonomous EV rovers</p>
            </div>
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>

          {allCollections.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Clock className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-xs">No collections recorded yet.</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Collections will be recorded when an EV rover completes a mission or an admin triggers bin emptying.
              </p>
            </div>
          ) : (
            <div className="h-64 overflow-y-auto space-y-2 mt-2">
              {allCollections.map((col) => (
                <div key={col.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{col.binCode}</span>
                    <span className="text-slate-500 ml-2">({col.location})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{col.collectedAt} • {col.collectorName}</p>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    +{col.amountKg} kg cleared
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
