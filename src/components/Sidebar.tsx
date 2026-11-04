import React from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Trash2, 
  AlertCircle, 
  QrCode, 
  BarChart3, 
  CalendarCheck, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Radio, 
  ExternalLink,
  X,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentPath, navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    activeComplaintsCount, 
    overflowCount, 
    binsRequiringCollectionCount,
    hardwareState
  } = useApp();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'Bin Monitoring',
      path: '/bins',
      icon: Trash2,
      badge: overflowCount > 0 ? `${overflowCount} Full` : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      name: 'Complaints',
      path: '/complaints',
      icon: AlertCircle,
      badge: activeComplaintsCount > 0 ? `${activeComplaintsCount}` : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      name: 'QR Management',
      path: '/qr-management',
      icon: QrCode,
      badge: '50 Bins'
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      badge: null
    },
    {
      name: 'Planner',
      path: '/planner',
      icon: CalendarCheck,
      badge: binsRequiringCollectionCount > 0 ? `${binsRequiringCollectionCount} Due` : null,
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      name: 'Feedback',
      path: '/feedback',
      icon: MessageSquare,
      badge: null
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      badge: null
    }
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">HAILO</h1>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Hub</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Smart Waste Management</p>
              </div>
            </div>

            <button 
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* IoT Status Pill in Sidebar */}
          <div className="mt-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hardwareState.esp32Connected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hardwareState.esp32Connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="font-semibold text-slate-700">ESP32 Sensor Grid</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
              {hardwareState.esp32Connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Operations & Control
          </div>

          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 stroke-[2.2]' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    item.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Citizen Gateway
            </div>

            {/* Quick link to test Citizen QR Report */}
            <button
              onClick={() => handleNav('/report')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Citizen QR Report</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Footer / User Profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-200 shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Administrator'}</p>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'admin@hailo.city'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
