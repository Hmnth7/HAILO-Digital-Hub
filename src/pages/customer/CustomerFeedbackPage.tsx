import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, Send, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

export const CustomerFeedbackPage: React.FC = () => {
  const { addFeedback } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    addFeedback(rating, message.trim());
    setSubmitted(true);
    setMessage('');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Feedback</h3>
        <p className="text-xs text-slate-500 font-medium">
          "Help us improve HAILO Digital Hub."
        </p>
      </div>

      {submitted ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">
            Thank you for your feedback.
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your review has been securely transmitted to the Municipal Campus Administration desk.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            Submit Another Feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-5">
          {/* Star selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 rounded-lg hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-bold text-slate-700">
                {rating === 5 ? '5 Stars (Excellent)' : `${rating} Stars`}
              </span>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Your Feedback
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your experience with bin clearance speed, QR reporting, or suggestions for the platform..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </form>
      )}
    </div>
  );
};
