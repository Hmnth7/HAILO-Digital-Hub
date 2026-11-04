import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-white border-slate-200 text-slate-800';
        let icon = <Info className="w-5 h-5 text-blue-500" />;

        if (toast.type === 'success') {
          bg = 'bg-white border-emerald-200 text-slate-800 shadow-emerald-50';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-white border-amber-200 text-slate-800 shadow-amber-50';
          icon = <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-white border-red-200 text-slate-800 shadow-red-50';
          icon = <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${bg}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
