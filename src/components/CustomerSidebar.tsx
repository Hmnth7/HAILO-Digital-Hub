import React from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  FileText, 
  Award, 
  MessageSquare, 
  User, 
  LogOut, 
  Trash2, 
  X,
  Shield,
  ShieldCheck,
  QrCode,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const CustomerSidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentPath, navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    customerContributions
  } = useApp();

  const navItems = [
    {
      name: 'Home',
      path: '/customer/dashboard',
      icon: Home,
      badge: null
    },
    {
      name: 'My Reports',
      path: '/customer/reports',
      icon: FileText,
      badge: customerContributions.total > 0 ? `${customerContributions.total}` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      name: 'My Contributions',
      path: '/customer/contributions',
      icon: Award,
      badge: null
    },
    {
      name: 'Feedback',
      path: '/customer/feedback',
      icon: MessageSquare,
      badge: null
    },
    {
      name: 'Profile',
      path: '/customer/profile',
      icon: User,
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
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/customer/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">HAILO</h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Citizen</span>
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
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Citizen Portal
          </div>

          {navItems.map((item) => {
            const isActive = currentPath === item.path;
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

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => handleNav('/admin/dashboard')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Open Operations Console"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                <span>Switch to Admin Console</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>

            <button
              onClick={() => handleNav('/report')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submit New Report</span>
              </div>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.name?.substring(0, 2).toUpperCase() || 'CU'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Customer'}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.email || 'citizen@campus.edu'}</p>
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
