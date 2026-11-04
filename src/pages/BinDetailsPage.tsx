import React, { useState } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Trash2, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  QrCode, 
  Download, 
  Printer, 
  ExternalLink,
  Cpu,
  Layers,
  Thermometer,
  BatteryCharging,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { getBinQrUrl } from '../utils/qrConfig';

export const BinDetailsPage: React.FC<{ binCode: string; onOpenSimModal: () => void }> = ({ 
  binCode, 
  onOpenSimModal 
}) => {
  const { 
    getBinByCode, 
    emptyBin, 
    complaints, 
    setTargetBinCode, 
    setSimulatedFillLevel,
    showToast 
  } = useApp();
  const { navigate } = useRouter();

  const bin = getBinByCode(binCode);

  if (!bin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Bin Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested bin code <code className="font-mono font-bold">{binCode}</code> does not exist in the 50 registered smart bins.
        </p>
        <button
          onClick={() => navigate('/bins')}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
        >
          ← Return to Bin Monitoring
        </button>
      </div>
    );
  }

  // Linked complaints for this bin
  const binComplaints = complaints.filter(c => c.binCode.toUpperCase() === bin.binCode.toUpperCase());

  const getStatusBadge = () => {
    if (bin.currentFillLevel >= 100) {
      return { 
        title: 'OVERFLOW / CRITICAL ATTENTION REQUIRED', 
        classes: 'bg-red-600 text-white animate-pulse',
        icon: AlertTriangle 
      };
    }
    if (bin.currentFillLevel >= 95) {
      return { 
        title: 'FULL / IMMEDIATE COLLECTION REQUIRED', 
        classes: 'bg-red-500 text-white',
        icon: AlertTriangle 
      };
    }
    if (bin.currentFillLevel >= 80) {
      return { 
        title: 'ALMOST FULL / COLLECTION REQUIRED', 
        classes: 'bg-amber-500 text-white',
        icon: Clock 
      };
    }
    if (bin.currentFillLevel >= 60) {
      return { 
        title: 'NORMAL / APPROACHING FULL', 
        classes: 'bg-emerald-600 text-white',
        icon: CheckCircle2 
      };
    }
    return { 
      title: 'NORMAL OPERATIONAL CAPACITY', 
      classes: 'bg-emerald-500 text-white',
      icon: CheckCircle2 
    };
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  const handleDownloadQr = () => {
    const svg = document.getElementById('bin-details-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const SVGURL = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = SVGURL;
    downloadLink.download = `${bin.binCode}_QR_Badge.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('success', `QR Code downloaded for ${bin.binCode}.`, 'QR Exported');
  };

  const handlePrint = () => {
    window.print();
  };

  const openSimForThisBin = () => {
    setTargetBinCode(bin.binCode);
    onOpenSimModal();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bins')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Back to monitoring"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {bin.binCode}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {bin.wasteType} Waste
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{bin.location} ({bin.zone})</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openSimForThisBin}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulate Sensor Level</span>
          </button>

          <button
            onClick={() => emptyBin(bin.binCode)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Mark as Emptied</span>
          </button>

          <button
            onClick={() => navigate(`/report/${bin.binCode}`)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Open Public Citizen Complaint Form for this Bin"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>Test Citizen QR Form</span>
          </button>
        </div>
      </div>

      {/* Hero Status Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${statusBadge.classes}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusBadge.title}
              </span>
              {bin.currentFillLevel >= 80 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Priority Dispatch Queue
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {bin.location}
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Updated: <strong>{bin.lastUpdated}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Collection: <strong>{bin.lastCollection}</strong></span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ultrasonic Dist: <strong>{bin.sensorDistanceCm} cm</strong></span>
              </div>
            </div>
          </div>

          {/* Fill Gauge Display */}
          <div className="w-full lg:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-semibold text-slate-600">Current Fill Level</span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-black text-slate-900">{bin.currentFillLevel}%</span>
                <span className="text-xs text-slate-400">/ {bin.capacity}L</span>
              </div>
            </div>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  bin.currentFillLevel >= 100 
                    ? 'bg-red-600 animate-pulse' 
                    : bin.currentFillLevel >= 95 
                    ? 'bg-red-500' 
                    : bin.currentFillLevel >= 80 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, bin.currentFillLevel)}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-medium">
              <span>0% Empty</span>
              <span>80% Warning</span>
              <span>100% Overflow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Fill History & QR Code System */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fill History Chart (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Fill-Level History</h3>
                <p className="text-xs text-slate-500 mt-0.5">24-hour ultrasonic sensor telemetry curve</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Live Sensor Feed
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bin.fillHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs font-mono">
                            <p className="font-bold">{label}</p>
                            <p className="text-emerald-400 font-bold text-sm">{payload[0].value}% Full</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="fillLevel" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Slider Directly in Bin Details */}
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Live Demo Sensor Control:
              </span>
              <span className="font-mono text-emerald-800">{bin.currentFillLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bin.currentFillLevel}
              onChange={(e) => setSimulatedFillLevel(Number(e.target.value), bin.binCode)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>

        {/* QR Code and Device Profile Card (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Unique QR Identification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Permanent physical plate linked to {bin.binCode}</p>
              </div>
              <QrCode className="w-5 h-5 text-emerald-600" />
            </div>

            {/* QR Code Graphic Container */}
            <div className="my-5 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                <QRCodeSVG
                  id="bin-details-qr"
                  value={getBinQrUrl(bin.binCode)}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="mt-3 text-center">
                <div className="font-mono font-black text-sm text-slate-900">
                  {bin.binCode}
                </div>
                <div className="text-[11px] font-mono text-slate-500 max-w-xs truncate mt-0.5">
                  /report/{bin.binCode}
                </div>
              </div>
            </div>

            {/* Hardware specifications */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500">Battery</span>
                <p className="font-bold font-mono text-slate-900">{bin.batteryLevel}%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Thermometer className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500">Temp</span>
                <p className="font-bold font-mono text-slate-900">{bin.temperatureC}°C</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Layers className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500">Capacity</span>
                <p className="font-bold font-mono text-slate-900">{bin.capacity}L</p>
              </div>
            </div>
          </div>

          {/* Export / Print QR Actions */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={handleDownloadQr}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sticker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row: Complaint History & Collection Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linked Complaints */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Citizen Complaint History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Reported problems associated with this bin</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {binComplaints.length} Records
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {binComplaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                No complaints registered against {bin.binCode}.
              </div>
            ) : (
              binComplaints.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{c.complaintCode}</span>
                      <span className="text-xs font-semibold text-slate-700">{c.category}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    "{c.description}"
                  </p>
                  {c.assignedStaff && (
                    <p className="text-[11px] text-purple-700 font-semibold">
                      Staff Assigned: {c.assignedStaff}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>Reported: {c.reportedAt || c.createdAt}</span>
                    <span>By: {c.citizenName || 'Anonymous'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collection Log */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Collection & Emptying Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Municipal sanitation team service logs</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Verified
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {bin.collections.map((col) => (
              <div key={col.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">{col.collectorName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Emptied & cleaned • {col.collectedAt}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-extrabold text-slate-900">
                    {col.amountKg} kg
                  </span>
                  <p className="text-[10px] text-slate-400">Waste cleared</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
