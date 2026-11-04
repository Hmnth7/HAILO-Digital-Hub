import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  RotateCw, 
  Sliders, 
  Check, 
  Shield, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetAllDemoData, showToast } = useApp();

  const [formState, setFormState] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">System Preferences & Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin profile, ultrasonic threshold parameters, and automated collection rules.
          </p>
        </div>

        <button
          onClick={resetAllDemoData}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Default Demo Data</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Admin Profile */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">Admin Profile</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supervisor Full Name</label>
              <input
                type="text"
                value={formState.adminName}
                onChange={(e) => setFormState(prev => ({ ...prev, adminName: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="email"
                value={formState.adminEmail}
                onChange={(e) => setFormState(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Threshold Rules */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">Ultrasonic Fill Threshold Rules</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-amber-700 block mb-1">Almost Full Threshold</span>
              <p className="text-[11px] text-slate-500 mb-2">Triggers routine collection route queue</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="90"
                  value={formState.thresholdAlmostFull}
                  onChange={(e) => setFormState(prev => ({ ...prev, thresholdAlmostFull: Number(e.target.value) }))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="font-mono font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-red-600 block mb-1">Full Threshold</span>
              <p className="text-[11px] text-slate-500 mb-2">Urgent same-day dispatch alert</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="85"
                  max="98"
                  value={formState.thresholdFull}
                  onChange={(e) => setFormState(prev => ({ ...prev, thresholdFull: Number(e.target.value) }))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="font-mono font-bold text-slate-600">%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-red-700 block mb-1">Overflow Hazard Alarm</span>
              <p className="text-[11px] text-slate-500 mb-2">Instant alarm & priority notification</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="99"
                  max="100"
                  value={formState.thresholdOverflow}
                  onChange={(e) => setFormState(prev => ({ ...prev, thresholdOverflow: Number(e.target.value) }))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="font-mono font-bold text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automation & Notification Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">Notifications & Automation</h4>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-800 block">Auto-Assign High Priority Complaints</span>
                <span className="text-[11px] text-slate-500">Automatically add overflow reports to next available EV collection cart</span>
              </div>
              <input
                type="checkbox"
                checked={formState.autoAssignComplaints}
                onChange={(e) => setFormState(prev => ({ ...prev, autoAssignComplaints: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-800 block">Sound & Dashboard Banner Alerts</span>
                <span className="text-[11px] text-slate-500">Audible ping when new 100% overflow or critical report is received</span>
              </div>
              <input
                type="checkbox"
                checked={formState.soundAlerts}
                onChange={(e) => setFormState(prev => ({ ...prev, soundAlerts: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Dashboard Telemetry Refresh Cycle</span>
                <span className="text-[11px] text-slate-500">How frequently live sensor telemetry polls for new updates</span>
              </div>
              <select
                value={formState.refreshIntervalSeconds}
                onChange={(e) => setFormState(prev => ({ ...prev, refreshIntervalSeconds: Number(e.target.value) }))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value={5}>Every 5 seconds</option>
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Save All Configuration Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
