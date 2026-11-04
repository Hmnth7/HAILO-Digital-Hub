import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { 
  Cpu, 
  Activity, 
  Wifi, 
  WifiOff, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Zap, 
  X,
  Gauge,
  HelpCircle
} from 'lucide-react';

interface HardwareSimWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareSimWidget: React.FC<HardwareSimWidgetProps> = ({ isOpen, onClose }) => {
  const { navigate } = useRouter();
  const { 
    hardwareState, 
    setSimulatedFillLevel, 
    setTargetBinCode, 
    toggleHardwareConnection,
    bins,
    getBinByCode,
    triggerDemoOverflow,
    resetAllDemoData
  } = useApp();

  const currentBin = getBinByCode(hardwareState.targetBinCode) || bins[1]; // default BIN-A002
  const fill = hardwareState.simulatedFillLevel;

  const getStatusBadge = (lvl: number) => {
    if (lvl >= 100) return { label: 'OVERFLOW', color: 'bg-red-600 text-white animate-pulse' };
    if (lvl >= 95) return { label: 'FULL', color: 'bg-red-500 text-white' };
    if (lvl >= 80) return { label: 'ALMOST FULL', color: 'bg-amber-500 text-white' };
    if (lvl >= 60) return { label: 'APPROACHING FULL', color: 'bg-emerald-600 text-white' };
    return { label: 'NORMAL', color: 'bg-emerald-500 text-white' };
  };

  const statusBadge = getStatusBadge(fill);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">IoT Hardware Status & Simulation</h3>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  ESP32 + HC-SR04
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time ultrasonic sensor testbench for college demonstration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Note Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs leading-relaxed">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Demo / Simulated Sensor Data</span>: Changes to the slider below immediately propagate live telemetry to the <strong>Admin Dashboard</strong>, <strong>Bin Monitoring</strong>, and <strong>Bin Details</strong> pages.
            </div>
          </div>

          {/* Hardware Diagnostic Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Microcontroller</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${hardwareState.esp32Connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-sm font-bold text-slate-900">ESP32 SoC</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium mt-1">
                {hardwareState.esp32Connected ? '🟢 Connected (WiFi)' : '🔴 Disconnected'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Ultrasonic Sensor</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${hardwareState.ultrasonicActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className="text-sm font-bold text-slate-900">HC-SR04</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium mt-1">
                {hardwareState.ultrasonicActive ? '🟢 Active 40kHz' : 'Faulty'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Sensor Reading</span>
              <div className="flex items-center gap-2 mt-2">
                <Activity className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span className="text-sm font-bold text-slate-900">Live Reading</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1">
                {hardwareState.lastSensorUpdateSecondsAgo}s ago
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Current Distance</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                {hardwareState.currentDistanceCm} cm
              </div>
              <span className="text-[10px] text-slate-400">Mount: 100 cm ceiling</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Calculated Fill Level</span>
              <div className="text-xl font-extrabold text-emerald-700 font-mono mt-1">
                {fill}%
              </div>
              <span className="text-[10px] text-slate-500">Capacity: {currentBin?.capacity || 100}L</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Derived Status</span>
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {fill >= 80 ? '⚠️ Schedule pickup' : 'Normal cycle'}
              </span>
            </div>
          </div>

          {/* Target Bin Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Target Physical Bin To Simulate</span>
              <span className="text-emerald-700 font-mono font-semibold">{currentBin?.location}</span>
            </label>
            <select
              value={hardwareState.targetBinCode}
              onChange={(e) => setTargetBinCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {bins.map((b) => (
                <option key={b.binCode} value={b.binCode}>
                  {b.binCode} — {b.location} ({b.currentFillLevel}%)
                </option>
              ))}
            </select>
          </div>

          {/* Interactive Slider */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Simulate Bin Fill Level Control
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                {fill}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={fill}
              onChange={(e) => setSimulatedFillLevel(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>0% Empty</span>
              <span>20% Normal</span>
              <span>70% Approaching</span>
              <span>80% Warn</span>
              <span>94% Full</span>
              <span>100% Overflow</span>
            </div>

            {/* Quick Demo Presets */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(5)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
              >
                Empty (5%)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(42)}
                className="px-2.5 py-1 text-xs rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium"
              >
                Normal (42%)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(75)}
                className="px-2.5 py-1 text-xs rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium"
              >
                Approaching (75%)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(88)}
                className="px-2.5 py-1 text-xs rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium"
              >
                Almost Full (88%)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(94)}
                className="px-2.5 py-1 text-xs rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-medium"
              >
                Full (94%)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFillLevel(100)}
                className="px-2.5 py-1 text-xs rounded-lg border border-red-600 bg-red-600 text-white font-bold animate-pulse"
              >
                Overflow (100%)
              </button>
            </div>
          </div>

          {/* Quick Demo Scenario Triggers */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Presentation Quick Scenarios</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={triggerDemoOverflow}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Trigger Overflow
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate('/report');
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                title="Open citizen complaint reporting form"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Submit Report
              </button>
              <button
                onClick={resetAllDemoData}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Reset Demo Data
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <button
            onClick={toggleHardwareConnection}
            className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
          >
            {hardwareState.esp32Connected ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-500" /> Simulate ESP32 Disconnect
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" /> Reconnect ESP32
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
