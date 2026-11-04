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
  Truck,
  MessageSquare, 
  Settings, 
  LogOut, 
  Activity, 
  X,
  ShieldCheck,
  UserCheck,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentPath, navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    activeComplaintsCount, 
    overflowCount, 
    evFleet,
    hardwareState
  } = useApp();

  const dispatchedEVCount = evFleet.filter(ev => ev.status !== 'AVAILABLE').length;

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'Bin Management',
      path: '/admin/bins',
      icon: Trash2,
      badge: overflowCount > 0 ? `${overflowCount} Full` : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      name: 'Complaints',
      path: '/admin/complaints',
      icon: AlertCircle,
      badge: activeComplaintsCount > 0 ? `${activeComplaintsCount}` : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      name: 'QR Management',
      path: '/admin/qr',
      icon: QrCode,
      badge: null
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
      badge: 'Admin'
    },
    {
      name: 'Collection Planner',
      path: '/admin/planner',
      icon: CalendarCheck,
      badge: null
    },
    {
      name: 'EV Fleet',
      path: '/admin/ev',
      icon: Truck,
      badge: dispatchedEVCount > 0 ? `${dispatchedEVCount} Active` : '3 EVs',
      badgeColor: dispatchedEVCount > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
    },
    {
      name: 'Feedback',
      path: '/admin/feedback',
      icon: MessageSquare,
      badge: null
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      badge: null
    },
    {
      name: 'Activity Log',
      path: '/admin/activity',
      icon: Activity,
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
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/admin/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">HAILO</h1>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-white">ADMIN</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Smart Waste Management</p>
              </div>
            </div>

            <button 
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* IoT Status Banner */}
          <div className="mt-3.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hardwareState.esp32Connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="font-semibold text-slate-700">IoT Hardware Grid</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
              ESP32 Demo
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Operations & Fleet Control
          </div>

          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 stroke-[2.2]' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              onClick={() => handleNav('/customer/dashboard')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Open Citizen Grievance Portal"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Switch to Citizen Portal</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </button>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Admin Lead'}</p>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.email || 'admin@hailo.com'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
