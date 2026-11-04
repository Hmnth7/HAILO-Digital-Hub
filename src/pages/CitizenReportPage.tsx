import React, { useState, useEffect } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { ComplaintCategory } from '../types';
import { 
  Trash2, 
  MapPin, 
  AlertTriangle, 
  Camera, 
  X, 
  Check, 
  Send, 
  ShieldCheck, 
  ArrowLeft,
  Truck,
  Sparkles,
  Radio,
  AlertCircle,
  HelpCircle,
  ListFilter,
  PowerOff
} from 'lucide-react';

const CATEGORIES: { label: ComplaintCategory; displayTitle: string; description: string; priority: string; emoji: string }[] = [
  { label: 'Overflowing Waste', displayTitle: 'Overflowing Waste', description: 'Trash spilling over top and onto ground', priority: 'Critical', emoji: '⚠️' },
  { label: 'Bad Smell', displayTitle: 'Bad Smell', description: 'Pungent or rotting odor in vicinity', priority: 'Medium', emoji: '💨' },
  { label: 'Damaged Bin', displayTitle: 'Damaged Dustbin', description: 'Broken lid, cracks, wheels, or body', priority: 'Medium', emoji: '🔨' },
  { label: 'Liquid Leakage', displayTitle: 'Waste Leakage', description: 'Fluid or leachate leaking from base of container', priority: 'High', emoji: '💧' },
  { label: 'Waste Scattered Around', displayTitle: 'Scattered Waste', description: 'Litter strewn around the dustbin area', priority: 'Medium', emoji: '📦' },
  { label: 'Bin is Full', displayTitle: 'Bin is Full', description: 'Container reached maximum capacity', priority: 'High', emoji: '🔴' },
  { label: 'Needs Cleaning', displayTitle: 'Needs Cleaning', description: 'Stained or requires sanitation wash', priority: 'Medium', emoji: '🧹' },
  { label: 'Other', displayTitle: 'Other', description: 'General sanitation or maintenance observation', priority: 'Low', emoji: '📝' },
];

export const CitizenReportPage: React.FC<{ binCode?: string }> = ({ binCode: routeBinCode }) => {
  const { params, navigate } = useRouter();
  const { getBinByCode, createComplaint, showToast, bins, currentUser, isAdmin, hardwareState } = useApp();

  // Robust resolution of Bin ID from prop, router param, or direct window.location
  const activeCode = React.useMemo(() => {
    if (routeBinCode) return routeBinCode.trim().toUpperCase();
    if (params.binCode) return params.binCode.trim().toUpperCase();
    if (typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/\/report\/([A-Za-z0-9_-]+)/i);
      if (pathMatch && pathMatch[1] && pathMatch[1].toLowerCase() !== 'success') {
        return pathMatch[1].trim().toUpperCase();
      }
      const hashMatch = window.location.hash.match(/\/report\/([A-Za-z0-9_-]+)/i);
      if (hashMatch && hashMatch[1] && hashMatch[1].toLowerCase() !== 'success') {
        return hashMatch[1].trim().toUpperCase();
      }
    }
    return '';
  }, [routeBinCode, params.binCode]);

  const matchedBin = activeCode ? getBinByCode(activeCode) : undefined;

  useEffect(() => {
    if (!activeCode) {
      navigate('/report');
    }
  }, [activeCode, navigate]);

  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory>('Overflowing Waste');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [citizenName, setCitizenName] = useState(currentUser?.name || '');
  const [citizenContact, setCitizenContact] = useState(currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Please choose an image under 5MB.', 'File Too Large');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matchedBin) {
      showToast('error', 'Cannot submit a report for an unregistered dustbin.', 'Invalid Bin ID');
      return;
    }

    if (matchedBin.isActive === false) {
      showToast('error', 'Reporting is temporarily unavailable for this inactive dustbin.', 'Dustbin Inactive');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const hiddenInput = document.getElementById('selected-complaint-category') as HTMLInputElement | null;
    const resolvedCategory = (hiddenInput?.value as ComplaintCategory) || selectedCategory;

    try {
      const newComplaint = createComplaint({
        binCode: matchedBin.binCode,
        category: resolvedCategory,
        description: description.trim() || `${resolvedCategory} reported on ${matchedBin.binCode}.`,
        photoUrl: photoUrl || undefined,
        citizenName: citizenName.trim() || undefined,
        citizenContact: citizenContact.trim() || undefined
      });

      setIsSubmitting(false);
      navigate(`/report/success/${newComplaint.complaintCode}`);
    } catch (err) {
      console.error('Failed to submit complaint', err);
      setIsSubmitting(false);
      showToast('error', 'Failed to submit report. Please try again.', 'Submission Error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/customer/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin Dashboard' : 'Home / Portal'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/report')}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs transition-colors"
          >
            <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Change Bin</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 mb-2">
            <Trash2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            HAILO Digital Hub
          </h1>
          <p className="text-xs font-semibold text-emerald-700">
            Smart Waste Management System
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Report a Problem with this Dustbin
          </p>
        </div>

        {/* Error State: Invalid or Unregistered Bin ID */}
        {!matchedBin ? (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-red-200 shadow-md space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                Invalid or Unregistered Bin
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                Dustbin "{activeCode}" was not found
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                This QR code or link does not match any registered dustbin currently in the municipal fleet. Please scan a valid placard or choose a bin manually.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/report')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                ← Scan QR or Select Bin Manually
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Select an active registered dustbin to file your report:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {bins.filter(b => b.isActive !== false).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/report/${b.binCode}`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-mono font-bold text-slate-700 border border-slate-200 transition-colors"
                  >
                    {b.binCode} ({b.location})
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : matchedBin.isActive === false ? (
          /* Error State: Inactive Dustbin */
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-200 shadow-md space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <PowerOff className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                Temporarily Inactive
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                Reporting Temporarily Unavailable for {matchedBin.binCode}
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Location: {matchedBin.location} ({matchedBin.zone} Zone)
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Reporting for this dustbin is temporarily unavailable due to scheduled maintenance, sanitization, or relocation. Please select an adjacent registered dustbin to report any urgent sanitation concerns.
              </p>
            </div>

            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/report')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                ← Scan QR or Select Another Bin
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Available active dustbins in the area:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {bins.filter(b => b.isActive !== false && b.binCode !== matchedBin.binCode).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/report/${b.binCode}`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-mono font-bold text-slate-700 border border-slate-200 transition-colors"
                  >
                    {b.binCode} ({b.location})
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Automatically Identified Bin Information Card (Read-Only) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Placard Verified • Auto-Identified</span>
                  </span>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    matchedBin.currentFillLevel >= 95
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : matchedBin.currentFillLevel >= 80
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {matchedBin.status} ({matchedBin.currentFillLevel}%)
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-black text-white tracking-tight">
                    {matchedBin.binCode}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {matchedBin.capacity}L Capacity • {matchedBin.wasteType} Waste
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Location: <strong className="text-white">{matchedBin.location}</strong> ({matchedBin.zone} Zone)</span>
                </div>

                {/* Sensor reading status indicator */}
                <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className={`w-3 h-3 ${matchedBin.binCode === 'BIN-003' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>
                      {matchedBin.binCode === 'BIN-003' 
                        ? 'Live IoT Ultrasonic Sensor' 
                        : 'Municipal Grid Bin (Sensor offline)'}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ID: {matchedBin.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Complaint Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md space-y-6">
              <input 
                type="hidden" 
                id="selected-complaint-category" 
                name="complaintCategory" 
                value={selectedCategory} 
              />
              {/* Section: What's wrong with this bin? */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    What is the issue with this dustbin?
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select an issue category to initiate resolution:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.label;

                    return (
                      <button
                        type="button"
                        key={cat.label}
                        data-category-card={cat.label}
                        data-selected={isSelected}
                        onClick={() => {
                          setSelectedCategory(cat.label);
                          const hidden = document.getElementById('selected-complaint-category') as HTMLInputElement | null;
                          if (hidden) hidden.value = cat.label;
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 text-left w-full ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-slate-900 shadow-2xs ring-1 ring-emerald-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>

                        <input
                          type="radio"
                          name="complaintCategory"
                          value={cat.label}
                          checked={isSelected}
                          onChange={() => setSelectedCategory(cat.label)}
                          className="sr-only"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 font-bold">
                            <span>{cat.emoji}</span>
                            <span>{cat.displayTitle}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                            {cat.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatic EV Dispatch Notice */}
              {(selectedCategory === 'Bin is Full' || selectedCategory === 'Overflowing Waste') && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-purple-600 shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Autonomous EV Dispatch Trigger:</strong> Reporting <em>"{selectedCategory}"</em> automatically schedules an electric collection rover to clear {matchedBin.binCode}.
                  </p>
                </div>
              )}

              {/* Section: Description */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue observed (e.g. lid jammed, trash overflowing into walkway, bad odor)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Section: Upload Photo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Supporting Photo (Optional)
                </label>

                {photoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-52 bg-slate-900 flex items-center justify-center">
                    <img
                      src={photoUrl}
                      alt="Incident Evidence"
                      className="w-full h-auto object-cover max-h-52"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 transition-colors">
                    <Camera className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">Tap to take photo or upload image</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Section: Contact Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block">Reporter Information (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Email / Phone (Optional)"
                      value={citizenContact}
                      onChange={(e) => setCitizenContact(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSubmitting 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isSubmitting ? (
                  <span>Submitting Complaint...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Submit Report for {matchedBin.binCode}</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
