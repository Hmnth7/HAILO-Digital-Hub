import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router/Router';
import { User, Mail, Phone, ShieldCheck, Award, LogOut } from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { currentUser, logout, customerContributions } = useApp();
  const { navigate } = useRouter();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl font-black mx-auto shadow-md">
          {currentUser?.name?.substring(0, 2).toUpperCase() || 'CU'}
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="text-xl font-bold text-slate-900">{currentUser?.name || 'Rahul Verma'}</h3>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mt-1 inline-block">
            Verified Citizen / Customer
          </span>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-left">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Mail className="w-3.5 h-3.5" /> Email
            </div>
            <span className="font-semibold text-slate-800">{currentUser?.email || 'citizen@campus.edu'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Phone className="w-3.5 h-3.5" /> Phone
            </div>
            <span className="font-semibold text-slate-800">{currentUser?.phone || '+91 98765 43210'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Community Reports
            </div>
            <span className="font-bold text-emerald-700">{customerContributions.total} submitted ({customerContributions.resolved} resolved)</span>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
