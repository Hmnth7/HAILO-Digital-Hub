import React from 'react';
import { useApp } from '../context/AppContext';
import { Star, MessageSquare, User, Clock, CheckCircle2 } from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const { feedbacks } = useApp();

  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Stakeholder & Citizen Feedback Desk</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
              Verified Feedback
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Displays real reviews and service satisfaction submitted directly by authenticated campus citizens.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="text-xl font-black">{avgRating}</span>
          </div>
          <div className="text-xs font-semibold text-slate-600 border-l border-amber-200 pl-3">
            <span>Average Citizen Score</span>
            <span className="block text-[10px] text-slate-400">{feedbacks.length} actual reviews</span>
          </div>
        </div>
      </div>

      {/* Main Feedback List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-base font-bold text-slate-900">Submitted Citizen Reviews</h4>
          <span className="text-xs text-slate-500 font-semibold">{feedbacks.length} total</span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No feedback received yet.</p>
            <p className="text-slate-400 max-w-xs mx-auto text-[11px]">
              Customer reviews submitted via the Citizen Feedback page will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {feedbacks.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-800 ml-1.5">{item.rating}/5 Stars</span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.createdAt}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  "{item.message}"
                </p>

                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.userName || 'Verified Citizen'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
