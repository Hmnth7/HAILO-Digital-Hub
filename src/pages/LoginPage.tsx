import React, { useState } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { 
  Trash2, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  Radio,
  Truck,
  QrCode,
  FileText,
  Award,
  ChevronDown,
  LogOut,
  Building2,
  CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAs, isAuthenticated, currentUser, logout, isAdmin } = useApp();
  const { navigate } = useRouter();

  // Active portal tab or credentials form
  const [activePortal, setActivePortal] = useState<'ADMIN' | 'CUSTOMER'>('ADMIN');
  const [showAdminCustomCreds, setShowAdminCustomCreds] = useState(false);
  const [showCustomerCustomCreds, setShowCustomerCustomCreds] = useState(false);

  const [adminEmail, setAdminEmail] = useState('admin@hailo.digitalhub.ac');
  const [adminPassword, setAdminPassword] = useState('••••••••••••');

  const [customerEmail, setCustomerEmail] = useState('rahul.verma@campus.edu');
  const [customerPassword, setCustomerPassword] = useState('••••••••••••');

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loginAs('ADMIN', adminEmail);
    navigate('/admin/dashboard');
  };

  const handleCustomerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loginAs('CUSTOMER', customerEmail);
    navigate('/customer/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Decorative gradient blur background circles */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/25 mb-1">
            <Trash2 className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            HAILO Digital Hub
          </h1>
          <p className="text-xs sm:text-sm font-bold text-emerald-700 uppercase tracking-wider">
            Smart Waste Management System
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose the portal you want to access: Manage municipal IoT operations as Admin, or submit and track reports as a Customer.
          </p>
        </div>

        {/* If already authenticated, show convenient session status */}
        {isAuthenticated && currentUser && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                {isAdmin ? 'AD' : 'CU'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Currently signed in as {currentUser.name}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {currentUser.role}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/customer/dashboard')}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => logout()}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Sign out of current account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Two Dedicated Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD 1: MUNICIPAL ADMIN PORTAL */}
          <div className="bg-white rounded-3xl border-2 border-slate-900/10 hover:border-slate-900/30 transition-all duration-200 shadow-xl shadow-slate-200/70 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full pointer-events-none -mr-8 -mt-8 opacity-60 group-hover:scale-105 transition-transform" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Operations Desk</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400 font-mono">STAFF</span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-800" />
                  <span>Admin Dashboard</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Complete authority desk for municipal supervisors, sanitary staff & fleet coordinators.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Live ultrasonic IoT telemetry (5 Smart Bins)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Autonomous EV collection fleet dispatch & simulation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Physical QR placard generation & batch printing</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Citizen grievance management & waste diversion analytics</span>
                </div>
              </div>
            </div>

            {/* Actions for Admin */}
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3 relative z-10">
              <button
                type="button"
                onClick={() => handleAdminLogin()}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-slate-900/20 transition-all hover:translate-y-[-1px]"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enter Admin Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => setShowAdminCustomCreds(!showAdminCustomCreds)}
                className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors"
              >
                <span>{showAdminCustomCreds ? 'Hide custom credentials' : 'Use custom email & password'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdminCustomCreds ? 'rotate-180' : ''}`} />
              </button>

              {showAdminCustomCreds && (
                <form onSubmit={handleAdminLogin} className="space-y-3 pt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Admin Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                  >
                    Authenticate as Admin
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* CARD 2: CITIZEN CUSTOMER PORTAL */}
          <div className="bg-white rounded-3xl border-2 border-emerald-600/20 hover:border-emerald-600/40 transition-all duration-200 shadow-xl shadow-emerald-500/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full pointer-events-none -mr-8 -mt-8 opacity-80 group-hover:scale-105 transition-transform" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-white" />
                  <span>Citizen Grievance Hub</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 font-mono">PUBLIC</span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span>Customer Dashboard</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Dedicated portal for students, hostel residents, faculty & visitors to report and track issues.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Instant QR incident reporting for full / overflowing bins</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-time tracking of submitted complaints & resolution</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Campus cleanliness eco-contributions & reward badges</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Trash2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Stakeholder satisfaction ratings and campus feedback</span>
                </div>
              </div>
            </div>

            {/* Actions for Customer */}
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3 relative z-10">
              <button
                type="button"
                onClick={() => handleCustomerLogin()}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:translate-y-[-1px]"
              >
                <UserCheck className="w-4 h-4" />
                <span>Enter Customer Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                type="button"
                onClick={() => setShowCustomerCustomCreds(!showCustomerCustomCreds)}
                className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-emerald-700 flex items-center justify-center gap-1 transition-colors"
              >
                <span>{showCustomerCustomCreds ? 'Hide custom credentials' : 'Use custom email & password'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showCustomerCustomCreds ? 'rotate-180' : ''}`} />
              </button>

              {showCustomerCustomCreds && (
                <form onSubmit={handleCustomerLogin} className="space-y-3 pt-2 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Citizen Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    Authenticate as Citizen
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>

        {/* Public Citizen QR direct report footer */}
        <div className="pt-4 text-center">
          <button
            onClick={() => navigate('/report')}
            className="text-xs text-slate-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Public Citizen Incident Report (Scan QR / Select Bin - No login required)</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>

      </div>
    </div>
  );
};
