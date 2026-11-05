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
  LogOut,
  Building2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Loader2,
  Phone,
  User as UserIcon
} from 'lucide-react';

function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/user-not-found':
      return 'No account was found with this email address.';
    case 'auth/email-already-in-use':
      return 'An account is already registered with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters in length.';
    case 'auth/invalid-email':
      return 'Please provide a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a moment and try again.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export const LoginPage: React.FC = () => {
  const { 
    loginWithFirebase, 
    registerCustomerWithFirebase, 
    isAuthenticated, 
    currentUser, 
    logout, 
    isAdmin,
    bins,
    showToast 
  } = useApp();
  const { navigate } = useRouter();

  // Scanned dustbin return path detection (when a citizen scans a physical QR code)
  const returnToPath = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('hailo_return_to') || localStorage.getItem('hailo_return_to')) 
    : null;
  const returnBinCode = React.useMemo(() => {
    if (!returnToPath) return null;
    const match = returnToPath.match(/\/report\/([A-Za-z0-9_-]+)/i);
    if (match && match[1] && match[1].toLowerCase() !== 'success') {
      return match[1].toUpperCase();
    }
    return null;
  }, [returnToPath]);

  const matchedReturnBin = returnBinCode ? bins.find(b => b.binCode.toUpperCase() === returnBinCode) : null;

  // Admin form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Customer portal tab: 'SIGN_IN' | 'REGISTER'
  const [customerTab, setCustomerTab] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');

  // Customer Sign In state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Customer Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      await loginWithFirebase(adminEmail, adminPassword, 'ADMIN');
      try {
        const returnTo = sessionStorage.getItem('hailo_return_to') || localStorage.getItem('hailo_return_to');
        if (returnTo && returnTo.startsWith('/report')) {
          sessionStorage.removeItem('hailo_return_to');
          localStorage.removeItem('hailo_return_to');
          navigate(returnTo);
          return;
        }
      } catch {}
      navigate('/admin/dashboard');
    } catch (err: any) {
      setAdminError(getFriendlyErrorMessage(err));
    } finally {
      setAdminLoading(false);
    }
  };

  const redirectAfterCustomerAuth = () => {
    try {
      const returnTo = sessionStorage.getItem('hailo_return_to') || localStorage.getItem('hailo_return_to');
      if (returnTo && returnTo.startsWith('/report')) {
        sessionStorage.removeItem('hailo_return_to');
        localStorage.removeItem('hailo_return_to');
        navigate(returnTo);
        return;
      }
    } catch {}
    navigate('/customer/dashboard');
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    setCustomerLoading(true);

    try {
      await loginWithFirebase(customerEmail, customerPassword, 'CUSTOMER');
      redirectAfterCustomerAuth();
    } catch (err: any) {
      setCustomerError(getFriendlyErrorMessage(err));
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);
    try {
      await registerCustomerWithFirebase(regName, regEmail, regPassword, regPhone);
      redirectAfterCustomerAuth();
    } catch (err: any) {
      setRegError(getFriendlyErrorMessage(err));
    } finally {
      setRegLoading(false);
    }
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
            Secure municipal operations desk for staff, or citizen portal to report and track issues across campus bins.
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
                  <span>Signed in as {currentUser.name}</span>
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

        {/* Scanned Dustbin Notice if citizen scanned a QR code while unauthenticated */}
        {returnBinCode && (
          <div className="bg-emerald-50/95 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 p-4 shadow-sm flex items-center gap-3.5 max-w-xl mx-auto text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>Scanned Dustbin:</span>
                <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs font-bold">
                  {returnBinCode}
                </span>
                {matchedReturnBin && (
                  <span className="text-emerald-800 font-semibold">
                    ({matchedReturnBin.location})
                  </span>
                )}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5 leading-snug">
                Please sign in or register below to submit your report. You will be redirected right back to this dustbin's report form.
              </p>
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
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                  MANUAL AUTH
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-800" />
                  <span>Admin Dashboard</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Restricted authority desk for municipal supervisors, sanitary staff & fleet coordinators.
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

            {/* Authenticated Admin Form */}
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3 relative z-10">
              {adminError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="admin@hailo.digitalhub.ac"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                      placeholder="••••••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-slate-900/20 transition-all hover:translate-y-[-1px] disabled:opacity-60"
                >
                  {adminLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Authenticating Admin...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Sign In to Admin Operations</span>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Admin accounts are provisioned and authorized manually. Public signup is permanently restricted to citizen accounts.
              </p>
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
                <span className="text-[11px] font-bold text-emerald-700 font-mono">PUBLIC ACCESS</span>
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

              {/* Tab Selector: Sign In vs Register */}
              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setCustomerTab('SIGN_IN'); setCustomerError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerTab === 'SIGN_IN'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomerTab('REGISTER'); setRegError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerTab === 'REGISTER'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Actions for Customer */}
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-3 relative z-10">
              {customerTab === 'SIGN_IN' ? (
                /* Customer Sign In Form */
                <form onSubmit={handleCustomerLogin} className="space-y-3">
                  {customerError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{customerError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Citizen Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        placeholder="your.email@campus.edu"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        placeholder="••••••••••••"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={customerLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:translate-y-[-1px] disabled:opacity-60"
                  >
                    {customerLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Sign In as Citizen</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Customer Registration Form */
                <form onSubmit={handleCustomerRegister} className="space-y-3">
                  {regError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Rahul Verma"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        placeholder="rahul.verma@campus.edu"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Password (Min 6 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Phone (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:translate-y-[-1px] disabled:opacity-60"
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Register as Citizen</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>

        {/* Citizen QR direct report footer */}
        <div className="pt-4 text-center">
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/report');
              } else {
                setCustomerTab('REGISTER');
                setCustomerError(null);
                showToast('info', 'Please sign in or register to submit a dustbin report.', 'Account Required');
              }
            }}
            className="text-xs text-slate-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Report Dustbin Incident (Sign in or register to submit)</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>

      </div>
    </div>
  );
};
