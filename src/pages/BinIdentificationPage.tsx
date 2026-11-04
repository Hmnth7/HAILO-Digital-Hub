import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../router/Router';
import { useApp } from '../context/AppContext';
import { Bin } from '../types';
import { 
  extractBinCodeFromQr, 
  validateScannedQr, 
  scanVideoFrameForQr, 
  scanImageFileForQr 
} from '../utils/qrScanner';
import { 
  QrCode, 
  ListFilter, 
  Camera, 
  CameraOff, 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  MapPin, 
  Search, 
  ArrowLeft, 
  Upload, 
  RotateCcw, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  Radio,
  ExternalLink
} from 'lucide-react';

export const BinIdentificationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { bins, isAdmin, currentUser } = useApp();

  // Active view: 'scan' (Option 1) or 'manual' (Option 2)
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');

  // Filter out any decommissioned / deleted or inactive bins
  const availableBins = bins.filter(
    (b) => (b.status as string) !== 'DELETED' && (b.status as string) !== 'INACTIVE' && b.isActive !== false
  );

  // ----------------------------------------------------
  // OPTION 1: SCAN QR CODE STATE & CAMERA LOGIC
  // ----------------------------------------------------
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'>('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [identifiedBin, setIdentifiedBin] = useState<Bin | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Stop camera tracks helper
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera stream
  const startCamera = async () => {
    stopCamera();
    setScanError(null);
    setIdentifiedBin(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setCameraErrorMessage('Camera API is not supported on this browser or connection. Please choose manual selection or upload a QR image.');
      return;
    }

    setCameraState('requesting');
    try {
      let stream: MediaStream;
      try {
        // Preferred mobile rear camera constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstErr) {
        // Fallback to generic video constraint if rear camera constraint is not supported
        console.warn('Environment camera constraint failed, retrying generic video constraint:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error on mobile:', playErr);
        }
      }
      setCameraState('active');
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraErrorMessage('Camera permission was denied. Please enable camera access in your browser or select your dustbin manually.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setCameraErrorMessage('No camera device was detected on this hardware. Please use manual selection.');
      } else {
        setCameraState('error');
        setCameraErrorMessage('Unable to initialize camera video feed. Please use manual bin selection or upload an image.');
      }
    }
  };

  // Process detected QR code payload
  const handleQrPayload = (rawPayload: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const validation = validateScannedQr(rawPayload, availableBins);

    if (validation.valid && validation.bin) {
      const matched = validation.bin;
      setIdentifiedBin(matched);
      setScanError(null);
      stopCamera();

      // Brief visual confirmation before routing to complaint submission
      setTimeout(() => {
        navigate(`/report/${matched.binCode}`);
      }, 700);
    } else {
      setScanError(validation.error || `Invalid QR code: "${rawPayload}" is not a recognized dustbin.`);
      setIsProcessing(false);
    }
  };

  // Continuous frame scanning loop
  useEffect(() => {
    if (activeTab !== 'scan' || cameraState !== 'active') {
      return;
    }

    let isScanningActive = true;

    const scanFrame = async () => {
      if (!isScanningActive || isProcessing || identifiedBin) {
        return;
      }

      const now = performance.now();
      // Scan every ~120ms to keep UI responsive
      if (now - lastScanTimeRef.current >= 120) {
        lastScanTimeRef.current = now;
        if (videoRef.current && canvasRef.current) {
          const detected = await scanVideoFrameForQr(videoRef.current, canvasRef.current);
          if (detected) {
            handleQrPayload(detected);
            return;
          }
        }
      }

      if (isScanningActive && !identifiedBin) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanningActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTab, cameraState, isProcessing, identifiedBin]);

  // Activate / deactivate camera when tab changes
  useEffect(() => {
    if (activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
      setScanError(null);
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Handle image file upload for QR scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setScanError(null);

    try {
      const detected = await scanImageFileForQr(file);
      if (!detected) {
        setScanError('No readable QR code found in this image. Please upload a clear photo of the dustbin QR code.');
        setIsProcessing(false);
        return;
      }
      handleQrPayload(detected);
    } catch {
      setScanError('Failed to analyze image file. Please try again.');
      setIsProcessing(false);
    }
  };

  // Manual URL / Code submission from input bar
  const handleManualInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleQrPayload(manualInput.trim());
  };

  // ----------------------------------------------------
  // OPTION 2: SELECT BIN MANUALLY STATE & FILTERING
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBins = availableBins.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      b.binCode.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.zone.toLowerCase().includes(q) ||
      b.wasteType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Hidden canvas for video frame rasterization */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/customer/reports')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin Dashboard' : 'Back to Reports'}</span>
          </button>

          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Bin Identification
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 mb-2">
            <Trash2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Submit New Incident Report
          </h1>
          <p className="text-xs font-semibold text-emerald-700">
            HAILO Smart Waste Management
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Identify the dustbin you wish to report by scanning its physical QR code or selecting it from the campus fleet.
          </p>
        </div>

        {/* Option Tabs Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan');
              setScanError(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'scan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>Option 1: Scan QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4 text-emerald-600" />
            <span>Option 2: Select Bin Manually</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
              {availableBins.length}
            </span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* OPTION 1: SCAN QR CODE VIEW                          */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'scan' && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-md space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                Scan Physical Placard QR Code
              </h2>
              <p className="text-xs text-slate-500">
                Point your mobile phone camera at the QR code mounted on the smart dustbin.
              </p>
            </div>

            {/* Identified Bin Notification Card */}
            {identifiedBin && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 animate-in fade-in zoom-in-95">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Bin Identified Successfully
                  </span>
                  <p className="font-mono text-base font-black text-emerald-950">
                    {identifiedBin.binCode} — {identifiedBin.location}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Opening incident reporting form...
                  </p>
                </div>
              </div>
            )}

            {/* Camera Viewport / States */}
            {!identifiedBin && (
              <div className="space-y-4">
                {/* Active Camera Viewfinder */}
                {cameraState === 'active' && (
                  <div className="relative w-full max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden bg-black shadow-lg border-2 border-slate-800">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Scanner Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                      <div className="w-56 h-56 relative rounded-2xl border-2 border-emerald-400/70 shadow-2xl">
                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>

                        {/* Animated Laser Scan Bar */}
                        <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2"></div>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium border border-white/10">
                        <Camera className="w-3 h-3 text-emerald-400 animate-pulse" />
                        Scanning for QR Code...
                      </span>
                    </div>
                  </div>
                )}

                {/* Requesting Permission State */}
                {cameraState === 'requesting' && (
                  <div className="w-full max-w-sm mx-auto aspect-square rounded-3xl bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-semibold text-slate-300">
                      Requesting camera permission...
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Please allow camera access when prompted by your browser.
                    </p>
                  </div>
                )}

                {/* Camera Permission Denied State */}
                {cameraState === 'denied' && (
                  <div className="w-full max-w-sm mx-auto rounded-3xl bg-amber-50/80 border border-amber-200 p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <CameraOff className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-amber-900">Camera Access Blocked</h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {cameraErrorMessage || 'Camera permission was not granted. You can still file your report by selecting your dustbin manually.'}
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                      >
                        Retry Camera Permission
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="w-full py-2 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100/50 transition-colors"
                      >
                        Switch to Manual Bin Selection →
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera Error / Unsupported State */}
                {(cameraState === 'error' || cameraState === 'unsupported') && (
                  <div className="w-full max-w-sm mx-auto rounded-3xl bg-slate-100 border border-slate-200 p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Camera Feed Unavailable</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {cameraErrorMessage || 'Could not connect to a camera stream. Please use manual selection or upload a photo of the QR code.'}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Select Bin Manually ({availableBins.length} Registered) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner when Invalid QR Code is Scanned */}
                {scanError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold block text-red-950">Scan Error</span>
                        <p className="text-red-800 mt-0.5 leading-relaxed">{scanError}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScanError(null);
                          setIsProcessing(false);
                          if (cameraState === 'active') {
                            // Resume loop
                          } else {
                            startCamera();
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors"
                      >
                        Scan Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="py-1.5 px-3 rounded-lg bg-white border border-red-300 text-red-900 text-[11px] font-semibold hover:bg-red-100 transition-colors"
                      >
                        Select Manually Instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Alternative QR Input Methods (Photo Upload & URL / Code Input) */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Alternative Scan Options</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Upload QR Photo */}
                    <label className="border border-slate-200 hover:border-emerald-500 rounded-xl p-3 flex items-center gap-2.5 cursor-pointer bg-slate-50/70 hover:bg-emerald-50/30 transition-colors">
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          Upload QR Image
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Select from gallery / files
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Switch to manual selection */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="border border-slate-200 hover:border-emerald-500 rounded-xl p-3 flex items-center justify-between text-left bg-slate-50/70 hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ListFilter className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            Choose from List
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {availableBins.length} registered bins
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>

                  {/* QR Text / URL Entry (Especially useful for tests & manual verification) */}
                  <form onSubmit={handleManualInputSubmit} className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Or paste scanned QR code text / URL:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="e.g. https://.../report/BIN-001 or BIN-001"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!manualInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors shrink-0"
                      >
                        Verify QR
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* OPTION 2: SELECT BIN MANUALLY VIEW                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'manual' && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Select Registered Dustbin
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic fleet retrieved from database. Select any dustbin to file your report.
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {availableBins.length} Active Bins
              </span>
            </div>

            {/* Search and Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Bin ID (e.g. BIN-001) or location (Main Block, Hostel)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List of Registered Bins */}
            {filteredBins.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Trash2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  {searchQuery ? `No dustbins match "${searchQuery}"` : 'No registered dustbins available.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery ? 'Try searching by a different term or clear the filter.' : 'Please contact the system administrator.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBins.map((bin) => {
                  const isOverflow = bin.status === 'OVERFLOW';
                  const isFull = bin.status === 'FULL';
                  const isAlmostFull = bin.status === 'ALMOST_FULL';
                  const isApproaching = bin.status === 'APPROACHING_FULL';

                  return (
                    <div
                      key={bin.id}
                      data-bin-card={bin.binCode}
                      onClick={() => navigate(`/report/${bin.binCode}`)}
                      className="group p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white transition-all cursor-pointer shadow-2xs hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {bin.binCode}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-slate-800 text-sm truncate">
                            {bin.location}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{bin.zone}</span>
                          </span>
                          <span>•</span>
                          <span>{bin.wasteType} Waste</span>
                          <span>•</span>
                          <span>{bin.capacity}L Capacity</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isOverflow 
                            ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                            : isFull 
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isAlmostFull 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isApproaching 
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {bin.status} ({bin.currentFillLevel}%)
                        </span>

                        <button
                          type="button"
                          data-bin-button={bin.binCode}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/report/${bin.binCode}`);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>Select</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Informative Footer */}
        <p className="text-center text-[11px] text-slate-400">
          HAILO Digital Hub • Municipal IoT Telemetry & Dynamic Fleet Grievance Gateway
        </p>
      </div>
    </div>
  );
};
