import React from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { 
  Trash2, 
  Recycle, 
  AlertCircle, 
  Cpu, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  ChevronRight,
  Truck,
  Activity,
  Check,
  MapPin,
  Clock,
  Radio
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

export const DashboardPage: React.FC<{ onOpenSimModal: () => void }> = ({ onOpenSimModal }) => {
  const { 
    bins, 
    complaints, 
    totalWasteLtr, 
    recyclableWasteLtr, 
    nonRecyclableWasteLtr, 
    activeComplaintsCount,
    overflowCount,
    evFleet,
    collectionTasks,
    hardwareState
  } = useApp();

  const { navigate } = useRouter();

  const totalBinsCount = bins.length;
  const normalBinsCount = bins.filter(b => b.status === 'NORMAL' || b.status === 'APPROACHING_FULL').length;
  const almostFullBinsCount = bins.filter(b => b.status === 'ALMOST_FULL').length;
  const fullBinsCount = bins.filter(b => b.status === 'FULL').length;
  const overflowingBinsCount = bins.filter(b => b.status === 'OVERFLOW').length;
  const pendingComplaintsCount = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'RESOLVED').length;
  const resolvedComplaintsCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'RESOLVED').length;
  const activeTasksCount = collectionTasks.filter(t => t.status !== 'COMPLETED').length;

  const activeEVCount = evFleet.filter(ev => ev.status !== 'AVAILABLE').length;
  const recentComplaints = complaints.slice(0, 5);

  // Dynamic waste calculations by type
  const bioLtr = Math.round(bins.filter(b => b.wasteType === 'Bio').reduce((s, b) => s + (b.capacity * (b.currentFillLevel / 100)), 0));
  const paperLtr = Math.round(bins.filter(b => b.wasteType === 'Paper').reduce((s, b) => s + (b.capacity * (b.currentFillLevel / 100)), 0));
  const plasticLtr = Math.round(bins.filter(b => b.wasteType === 'Plastic').reduce((s, b) => s + (b.capacity * (b.currentFillLevel / 100)), 0));
  const mixedLtr = Math.round(bins.filter(b => b.wasteType === 'Mixed').reduce((s, b) => s + (b.capacity * (b.currentFillLevel / 100)), 0));

  // Dynamic Chart Data: Actual Litres inside each registered smart dustbin
  const binVolumeChartData = bins.map(b => ({
    binCode: b.binCode,
    location: b.location,
    fillLtr: Math.round(b.capacity * (b.currentFillLevel / 100)),
    emptyLtr: Math.max(0, b.capacity - Math.round(b.capacity * (b.currentFillLevel / 100))),
    capacity: b.capacity,
    percent: b.currentFillLevel,
    wasteType: b.wasteType
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 4 Major Statistic Cards (Strictly calculated from stored records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Waste Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Waste</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalWasteLtr} <span className="text-base font-semibold text-slate-500">Ltr</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Accumulated across {totalBinsCount} registered bins
          </div>
        </div>

        {/* Recyclable Waste Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recyclable Waste</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {recyclableWasteLtr} <span className="text-base font-semibold text-slate-500">Ltr</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              Bio ({bioLtr}L)
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
              Paper ({paperLtr}L)
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-cyan-700">
              Plastic ({plasticLtr}L)
            </span>
          </div>
        </div>

        {/* Non-Recyclable Waste Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Non-Recyclable Waste</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {nonRecyclableWasteLtr} <span className="text-base font-semibold text-slate-500">Ltr</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Mixed residual waste in campus bins
          </div>
        </div>

        {/* Active Complaints Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Complaints</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {pendingComplaintsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">pending resolution</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{resolvedComplaintsCount} complaints resolved</span>
          </div>
        </div>
      </div>

      {/* Fleet & Operational Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Bins</span>
          <p className="text-lg font-black text-slate-900 mt-0.5">{totalBinsCount} Active</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Normal Bins</span>
          <p className="text-lg font-black text-emerald-600 mt-0.5">{normalBinsCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Almost Full (≥80%)</span>
          <p className="text-lg font-black text-amber-600 mt-0.5">{almostFullBinsCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Full & Overflow</span>
          <p className="text-lg font-black text-red-600 mt-0.5">{fullBinsCount + overflowingBinsCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Active Tasks</span>
          <p className="text-lg font-black text-purple-700 mt-0.5">{activeTasksCount} In Queue</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">EV Fleet</span>
          <p className="text-lg font-black text-slate-900 mt-0.5">{activeEVCount} Dispatched / 3 EVs</p>
        </div>
      </div>

      {/* Main Row: Real-time Bin Fill by Waste Category & Fleet Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic Category Level Card (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bin Fill by Waste Category</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time volume aggregated across registered bins</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Bio */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Bio / Organic
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-mono">{bioLtr} L active</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((bioLtr / Math.max(1, totalWasteLtr)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Paper */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Paper & Cardboard
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-mono">{paperLtr} L active</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((paperLtr / Math.max(1, totalWasteLtr)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Plastic */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Plastic & Bottles
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-mono">{plasticLtr} L active</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((plasticLtr / Math.max(1, totalWasteLtr)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Mixed */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Mixed / Residual
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-mono">{mixedLtr} L active</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((mixedLtr / Math.max(1, totalWasteLtr)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Threshold Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
              <span>🟢 Normal (&lt;80%)</span>
              <span className="text-amber-700">🟡 Almost Full (80–94%)</span>
              <span className="text-red-600">🔴 Full (95–99%)</span>
              <span className="text-red-700">⚠️ Overflow (100%)</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2">
            <Radio className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Autonomous Rule:</strong> Ultrasonic sensors detecting <strong>≥80% capacity</strong> automatically queue EV collection missions.
            </p>
          </div>
        </div>

        {/* Live Dustbin Volume Breakdown Chart (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Volume by Registered Dustbin</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated strictly from current ultrasonic levels (Liters)</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-emerald-500"></span> Current Fill
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-slate-200"></span> Remaining Headroom
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={binVolumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="binCode" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} unit="L" />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">{label} • {data.location}</p>
                          <p className="text-emerald-400">Current Waste: {data.fillLtr} L ({data.percent}%)</p>
                          <p className="text-slate-300">Remaining Capacity: {data.emptyLtr} L</p>
                          <p className="border-t border-slate-700 pt-1 text-slate-400">Total Capacity: {data.capacity} L</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="fillLtr" name="Current Fill" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="emptyLtr" name="Remaining Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dynamic telemetric readings from active bins</span>
            <button
              onClick={() => navigate('/admin/bins')}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              Manage Dustbins <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row: Recent Complaints Table & Hardware Simulation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Complaints Table (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Citizen Complaints</h3>
              <p className="text-xs text-slate-500 mt-0.5">Incident reports submitted through mobile QR scans</p>
            </div>
            <button
              onClick={() => navigate('/admin/complaints')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View All ({complaints.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentComplaints.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No complaints logged yet.</p>
              <p className="text-slate-400 max-w-sm mx-auto text-[11px]">
                When citizens scan physical bin QR placards to report overflowing or damaged bins, incident records will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-1">ID</th>
                    <th className="pb-3">Bin Code</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Staff / Unit</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentComplaints.map((c) => {
                    let priorityBadge = 'bg-slate-100 text-slate-700';
                    if (c.priority === 'CRITICAL') priorityBadge = 'bg-red-600 text-white font-bold';
                    else if (c.priority === 'HIGH') priorityBadge = 'bg-red-100 text-red-800 font-semibold';
                    else if (c.priority === 'MEDIUM') priorityBadge = 'bg-amber-100 text-amber-800 font-semibold';
                    else priorityBadge = 'bg-blue-100 text-blue-800 font-medium';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-1 font-mono font-bold text-slate-900">{c.complaintCode}</td>
                        <td className="py-3 font-mono font-semibold text-emerald-700">{c.binCode}</td>
                        <td className="py-3 text-slate-600 font-medium">{c.location}</td>
                        <td className="py-3 text-slate-800 font-medium">{c.category}</td>
                        <td className="py-3">
                          {c.assignedStaff ? (
                            <span className="font-semibold text-[11px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {c.assignedStaff}
                            </span>
                          ) : c.assignedEV ? (
                            <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {c.assignedEV}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityBadge}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            c.status.toUpperCase() === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : c.status.toUpperCase() === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : c.status.toUpperCase() === 'ASSIGNED' || c.status.toUpperCase() === 'IN PROGRESS'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : c.status.toUpperCase() === 'ACCEPTED'
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-1">
                          <button
                            onClick={() => navigate('/admin/complaints')}
                            className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
                          >
                            Manage →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* IoT Hardware Status Card (4 cols on lg) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">IoT Sensor Grid</h3>
                  <span className="text-[10px] text-emerald-400 font-mono">Hardware Testbench</span>
                </div>
              </div>
              <button
                onClick={onOpenSimModal}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Open Ultrasonic Simulator"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-400 font-medium">ESP32 Status:</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active / Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-400 font-medium">Ultrasonic Target:</span>
                <span className="font-mono text-slate-200 font-bold">
                  {hardwareState.targetBinCode} (Hostel)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-400 font-medium">Distance Reading:</span>
                <span className="font-mono text-slate-200">
                  {hardwareState.currentDistanceCm} cm
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-emerald-300 font-semibold">Active Fill Level:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-base">
                  {hardwareState.simulatedFillLevel}% ({hardwareState.targetBinCode})
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <button
              onClick={onOpenSimModal}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate Hardware Ultrasonic Sensor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
