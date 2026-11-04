import React from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { ShieldAlert, ArrowLeft, Lock, LogOut } from 'lucide-react';

interface AccessDeniedProps {
  requiredRole?: 'ADMIN' | 'CUSTOMER';
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRole = 'ADMIN' }) => {
  const { navigate } = useRouter();
  const { currentUser, logout, isCustomer } = useApp();

  const handleSignOutAndSwitch = () => {
    logout();
    navigate('/login');
  };

  const isCustomerBlocked = isCustomer || requiredRole === 'ADMIN';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">
            Access Denied
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {isCustomerBlocked ? (
              <>
                You are currently signed in as <strong className="text-slate-800">{currentUser?.name || 'Customer'}</strong> (Citizen Account). This operational section requires verified <strong className="text-slate-800">ADMIN</strong> staff credentials.
              </>
            ) : (
              <>
                You are currently signed in as <strong className="text-slate-800">{currentUser?.name || 'Admin'}</strong> (Admin Staff). This section is reserved for the <strong className="text-slate-800">CITIZEN PORTAL</strong>.
              </>
            )}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Role-Based Access Control (RBAC) Active</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-5">
            {isCustomerBlocked 
              ? 'Admin routes (/admin/*) are isolated to protect smart bin telemetry, physical IoT placards, and autonomous EV dispatch tasks.'
              : 'Customer routes (/customer/*) are isolated for individual citizen submissions and community eco-impact profiles.'}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          {isCustomerBlocked ? (
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Customer Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={handleSignOutAndSwitch}
            className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out & Access Other Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
