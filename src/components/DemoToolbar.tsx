import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { 
  Sparkles, 
  RotateCcw, 
  Sliders, 
  ChevronUp, 
  ChevronDown,
  Play,
  Zap
} from 'lucide-react';

export const DemoToolbar: React.FC<{ onOpenSimModal: () => void }> = ({ onOpenSimModal }) => {
  const { 
    demoMode, 
    triggerDemoStepFlow, 
    advanceEVStatus, 
    evFleet,
    resetAllDemoData
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);

  if (!demoMode) return null;

  const activeEV = evFleet.find(ev => ev.status !== 'AVAILABLE') || evFleet[0];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-[94%] sm:w-auto">
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-xs tracking-tight flex items-center gap-1.5">
              <span>Demo Testbench</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                LIVE
              </span>
            </span>
          </div>
        </div>

        {!collapsed && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={triggerDemoStepFlow}
              className="px-2.5 py-1.5 rounded-lg bg-purple-600/90 hover:bg-purple-600 text-white font-bold flex items-center gap-1 shadow-xs transition-colors"
              title="Simulate ultrasonic sensor telemetry reading on BIN-003"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Simulate High Sensor</span>
            </button>

            <button
              onClick={() => advanceEVStatus(activeEV.evCode)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold flex items-center gap-1 shadow-xs transition-colors"
              title="Advance EV simulation status"
            >
              <Play className="w-3 h-3" />
              <span>Advance {activeEV.evCode} ({activeEV.status})</span>
            </button>

            <button
              onClick={onOpenSimModal}
              className="px-2.5 py-1.5 rounded-lg bg-teal-800/90 hover:bg-teal-700 text-teal-200 font-semibold flex items-center gap-1 border border-teal-700 transition-colors"
              title="Open Hardware Simulation Testbench"
            >
              <Sliders className="w-3 h-3" />
              <span>IoT Slider</span>
            </button>

            <button
              onClick={resetAllDemoData}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium flex items-center gap-1 border border-slate-700 transition-colors"
              title="Reset all demo data"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-white ml-auto"
          title={collapsed ? 'Expand Presentation Controls' : 'Collapse'}
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
