import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Menu, 
  RotateCw, 
  Cpu, 
  Sparkles, 
  AlertTriangle,
  Radio,
  Sliders
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  setMobileOpen: (open: boolean) => void;
  onOpenSimModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  setMobileOpen,
  onOpenSimModal
}) => {
  const { 
    hardwareState, 
    demoMode, 
    setDemoMode,
    overflowCount,
    showToast
  } = useApp();

  const handleRefresh = () => {
    showToast('info', 'Sensor telemetry and fleet status refreshed.', 'System Refreshed');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left title & hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {title}
            {overflowCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {overflowCount} Overflow Alert
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hardware quick status & simulator trigger */}
        <button
          onClick={onOpenSimModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-medium text-slate-700"
          title="Open IoT Hardware Simulator Controls"
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">IoT Simulator:</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {hardwareState.simulatedFillLevel}% ({hardwareState.targetBinCode})
          </span>
          <Sliders className="w-3 h-3 text-slate-400" />
        </button>

        {/* Demo Mode Toggle */}
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            demoMode 
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/25' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle College Presentation Demo Mode"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Demo Mode</span>
          <span className="text-[10px] uppercase tracking-wide opacity-90">{demoMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          title="Refresh Sensor Telemetry"
        >
          <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
