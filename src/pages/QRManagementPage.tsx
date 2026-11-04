import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Search, 
  Printer, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  X,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Archive,
  Power,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Radio,
  FileText
} from 'lucide-react';
import { 
  getBinQrUrl, 
  getProductionBaseUrl, 
  setProductionBaseUrl, 
  clearProductionBaseUrl,
  getPublicDomainStatus,
  isPublicDomainConfigured
} from '../utils/qrConfig';
import { 
  generateIndividualStickerPng, 
  generateIndividualStickerSvg, 
  generateAllQrZip, 
  generateAllQrPdf, 
  triggerBlobDownload 
} from '../utils/qrExportUtils';
import { Bin } from '../types';

export const QRManagementPage: React.FC = () => {
  const { bins, toggleBinActiveStatus, updateProductionDomain, showToast } = useApp();
  const { navigate } = useRouter();

  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [printableModalOpen, setPrintableModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Export loading states
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadingBinPng, setDownloadingBinPng] = useState<string | null>(null);

  // Production domain configuration
  const domainStatus = getPublicDomainStatus();
  const [customDomain, setCustomDomain] = useState<string>(getProductionBaseUrl());
  const [isEditingDomain, setIsEditingDomain] = useState(false);

  // Order bins so the 5 canonical dustbins (BIN-001 to BIN-005) are prioritized in sequence
  const canonicalCodes = ['BIN-001', 'BIN-002', 'BIN-003', 'BIN-004', 'BIN-005'];
  const canonicalBins = canonicalCodes
    .map(code => bins.find(b => b.binCode === code))
    .filter((b): b is Bin => b !== undefined);

  const zones = Array.from(new Set(bins.map(b => b.zone))).sort();

  const filteredBins = bins
    .filter(bin => {
      const matchesSearch = 
        bin.binCode.toLowerCase().includes(search.toLowerCase()) ||
        bin.location.toLowerCase().includes(search.toLowerCase()) ||
        bin.zone.toLowerCase().includes(search.toLowerCase());

      const matchesZone = selectedZone === 'ALL' || bin.zone === selectedZone;

      return matchesSearch && matchesZone;
    })
    .sort((a, b) => a.binCode.localeCompare(b.binCode));

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomain.trim()) {
      showToast('error', 'Please enter a valid public HTTPS URL.', 'Invalid URL');
      return;
    }
    updateProductionDomain(customDomain.trim());
    setIsEditingDomain(false);
    showToast('success', `Production QR domain updated to ${getProductionBaseUrl()}`, 'Public URL Saved');
  };

  const handleResetDomain = () => {
    clearProductionBaseUrl();
    const defaultUrl = getProductionBaseUrl();
    setCustomDomain(defaultUrl);
    updateProductionDomain(defaultUrl);
    setIsEditingDomain(false);
    showToast('info', 'Public domain reset to system default.', 'Domain Reset');
  };

  const handleDownloadSinglePng = async (bin: Bin) => {
    try {
      setDownloadingBinPng(bin.binCode);
      const url = getBinQrUrl(bin.binCode);
      const blob = await generateIndividualStickerPng(bin, url);
      triggerBlobDownload(blob, `HAILO_${bin.binCode}_Sticker_HighRes.png`);
      showToast('success', `Exported high-res printable sticker for ${bin.binCode}.`, 'PNG Export Complete');
    } catch (err: any) {
      showToast('error', `Failed to export PNG: ${err?.message || err}`, 'Export Error');
    } finally {
      setDownloadingBinPng(null);
    }
  };

  const handleDownloadSingleSvg = (bin: Bin) => {
    try {
      const url = getBinQrUrl(bin.binCode);
      const svgString = generateIndividualStickerSvg(bin, url);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      triggerBlobDownload(blob, `HAILO_${bin.binCode}_Placard_Vector.svg`);
      showToast('success', `Exported vector SVG placard for ${bin.binCode}.`, 'SVG Export Complete');
    } catch (err: any) {
      showToast('error', `Failed to export SVG: ${err?.message || err}`, 'Export Error');
    }
  };

  const handleDownloadZipAll = async () => {
    try {
      setIsExportingZip(true);
      const targetBins = canonicalBins.length === 5 ? canonicalBins : bins.slice(0, 5);
      const zipBlob = await generateAllQrZip(targetBins);
      triggerBlobDownload(zipBlob, 'HAILO_5_Dustbins_QR_Bundle.zip');
      showToast('success', 'Generated ZIP package with all 5 high-res PNG stickers, vector SVGs and README.', 'ZIP Export Ready');
    } catch (err: any) {
      showToast('error', `Failed to generate ZIP archive: ${err?.message || err}`, 'Export Error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadA4Pdf = async () => {
    try {
      setIsExportingPdf(true);
      const targetBins = canonicalBins.length === 5 ? canonicalBins : bins.slice(0, 5);
      const pdfBlob = await generateAllQrPdf(targetBins);
      triggerBlobDownload(pdfBlob, 'HAILO_5_Dustbins_Printable_A4_Placards.pdf');
      showToast('success', 'Generated printable A4 PDF sticker sheet with all 5 dustbin placards.', 'PDF Ready');
    } catch (err: any) {
      showToast('error', `Failed to generate PDF: ${err?.message || err}`, 'Export Error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyUrl = (binCode: string) => {
    const url = getBinQrUrl(binCode);
    navigator.clipboard.writeText(url);
    setCopiedCode(binCode);
    showToast('success', `Copied public link: ${url}`, 'URL Copied');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Physical Dustbin QR Identification</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              5 Permanent Municipal Bins
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Every physical dustbin is equipped with a permanent high-resolution QR placard. Scanning immediately routes citizens directly to that specific dustbin's complaint reporting interface with zero manual identification required.
          </p>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadZipAll}
            disabled={isExportingZip}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            title="Download ZIP containing PNGs, SVGs and README for all 5 bins"
          >
            {isExportingZip ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isExportingZip ? 'Packaging ZIP...' : 'Download All 5 (ZIP)'}</span>
          </button>

          <button
            onClick={() => setPrintableModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Open printable A4 sheet modal and generate PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable A4 Sheet / PDF</span>
          </button>
        </div>
      </div>

      {/* Production Domain Architecture Warning & Configuration */}
      {!domainStatus.isConfigured ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Production QR Domain Pending Configuration</span>
            </div>
            <p className="text-xs text-amber-700 max-w-2xl">
              QR codes must point to a publicly reachable HTTPS domain so smartphones on 4G/5G mobile networks can open the reporting interface. Currently using fallback placeholder: <code className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">{domainStatus.url}</code>
            </p>
          </div>

          <button
            onClick={() => setIsEditingDomain(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            Set Public HTTPS Domain
          </button>
        </div>
      ) : null}

      {/* Production Domain Architecture Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Permanent Public HTTPS QR Architecture
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${domainStatus.isConfigured ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                {domainStatus.message}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Every QR code is generated using this configurable public base URL so smart phones scanning from cellular networks reach the citizen reporting interface.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="text-slate-400">Base Domain:</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded-md text-emerald-300 font-bold border border-slate-700">
                {getProductionBaseUrl()}
              </span>
              <span className="text-slate-400 text-[11px]">(Example: {getProductionBaseUrl()}/report/BIN-001)</span>
            </div>
          </div>

          <div className="shrink-0">
            {!isEditingDomain ? (
              <button
                onClick={() => setIsEditingDomain(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
              >
                Configure Public Domain
              </button>
            ) : (
              <form onSubmit={handleSaveDomain} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="https://your-domain.vercel.app"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-600 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDomain}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDomain(false)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search QR codes by Bin ID (BIN-001) or location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-semibold uppercase">Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Campus Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* QR Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {filteredBins.map((bin) => {
          const publicQrUrl = getBinQrUrl(bin.binCode);
          const isDownloadingThis = downloadingBinPng === bin.binCode;
          const isActive = bin.isActive !== false;

          return (
            <div
              key={bin.id}
              className={`bg-white rounded-2xl p-5 border ${isActive ? 'border-slate-200/80' : 'border-red-200 bg-red-50/20'} shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between`}
            >
              <div>
                {/* Header: Bin ID and Active Status Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold text-slate-900">
                    {bin.binCode}
                  </span>
                  
                  <button
                    onClick={() => toggleBinActiveStatus(bin.binCode)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                    title="Click to toggle active/inactive status"
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{isActive ? 'Active' : 'Inactive'}</span>
                  </button>
                </div>

                <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">
                  {bin.location}
                </p>
                <p className="text-[10px] text-slate-400">
                  {bin.zone} Zone • {bin.capacity}L {bin.wasteType}
                </p>

                {/* QR Display */}
                <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                  <div className="p-2.5 bg-white rounded-lg shadow-2xs border border-slate-200/80">
                    <QRCodeSVG
                      id={`qr-${bin.binCode}`}
                      value={publicQrUrl}
                      size={130}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="mt-2 text-center w-full">
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold truncate block">
                      /report/{bin.binCode}
                    </span>
                    <button
                      onClick={() => handleCopyUrl(bin.binCode)}
                      className="mt-1 text-[10px] text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                      title="Copy full public HTTPS URL"
                    >
                      {copiedCode === bin.binCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Public Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Test Mobile Report Form button */}
                <button
                  onClick={() => navigate(`/report/${bin.binCode}`)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  title="Simulate smartphone camera scan of this QR code"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Test Report Page</span>
                </button>

                {/* Download PNG & Download SVG */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleDownloadSinglePng(bin)}
                    disabled={isDownloadingThis}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Export high-resolution PNG sticker (1000x1200)"
                  >
                    {isDownloadingThis ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    ) : (
                      <Download className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>PNG</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSingleSvg(bin)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Export vector SVG placard"
                  >
                    <FileDown className="w-3 h-3 text-blue-600" />
                    <span>SVG</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable Sheet Modal */}
      {printableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Printable A4 QR Placard Sticker Sheet</h3>
                <p className="text-xs text-slate-500">
                  Pre-formatted ISO A4 batch sheet containing permanent placards for all 5 dustbins.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadA4Pdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  title="Generate and download A4 PDF document"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isExportingPdf ? 'Generating PDF...' : 'Download A4 PDF'}</span>
                </button>

                <button
                  onClick={handlePrintSheet}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sticker Sheet</span>
                </button>

                <button
                  onClick={() => setPrintableModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: A4 Visual Preview */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <div 
                id="printable-a4-sheet"
                className="bg-white p-6 rounded-xl border border-slate-300 shadow-md max-w-2xl w-full space-y-4"
              >
                {/* Sheet Title */}
                <div className="text-center pb-3 border-b-2 border-slate-900">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    HAILO DIGITAL HUB — MUNICIPAL SMART WASTE MANAGEMENT
                  </h2>
                  <p className="text-xs font-bold text-emerald-700">
                    OFFICIAL PERMANENT DUSTBIN QR PLACARDS (BATCH STICKER SHEET)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Print at 100% scale on A4 adhesive vinyl or placard cardstock • Cut along dashed scissor lines (✂)
                  </p>
                </div>

                {/* 5 Dustbin Stickers Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {(canonicalBins.length === 5 ? canonicalBins : bins.slice(0, 5)).map((bin) => {
                    const qrUrl = getBinQrUrl(bin.binCode);
                    return (
                      <div 
                        key={bin.id} 
                        className="bg-white p-4 rounded-xl border-2 border-slate-900 relative flex flex-col items-center text-center shadow-xs"
                        style={{ borderStyle: 'solid' }}
                      >
                        {/* Scissor Cut Line Header */}
                        <div className="absolute -top-3 left-3 bg-white px-1 text-[9px] font-mono text-slate-400">
                          ✂ - - - CUT LINE - - -
                        </div>

                        {/* Placard Header */}
                        <div className="w-full bg-slate-900 text-white py-1.5 px-2 rounded-lg mb-2">
                          <span className="text-[11px] font-black tracking-wide text-emerald-400 block">
                            HAILO DIGITAL HUB
                          </span>
                          <span className="text-[8px] text-slate-300 font-semibold block">
                            SMART WASTE MANAGEMENT
                          </span>
                        </div>

                        {/* Call to action */}
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded mb-2">
                          SCAN TO REPORT WASTE ISSUES
                        </div>

                        {/* Large QR */}
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs my-1">
                          <QRCodeSVG
                            value={qrUrl}
                            size={120}
                            level="H"
                            includeMargin={false}
                          />
                        </div>

                        {/* Bin ID & Location */}
                        <div className="w-full bg-slate-900 text-white py-1 px-2 rounded font-mono text-xs font-black my-1">
                          BIN ID: {bin.binCode}
                        </div>

                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase block">
                          LOCATION: {bin.location}
                        </span>

                        <span className="text-[8px] font-mono text-slate-400 truncate max-w-full block">
                          {qrUrl}
                        </span>

                        <span className="text-[8px] font-bold text-slate-500 mt-1">
                          {bin.isActive !== false ? '● ACTIVE MUNICIPAL SMART BIN' : '○ TEMPORARILY INACTIVE'}
                        </span>
                      </div>
                    );
                  })}

                  {/* 6th Box: Municipal Attachment Guide */}
                  <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400 flex flex-col justify-between text-left text-xs">
                    <div>
                      <div className="w-full bg-slate-900 text-white py-1 px-2 rounded text-center mb-2">
                        <span className="text-[10px] font-bold text-emerald-400">OPERATOR PLACARD GUIDE</span>
                      </div>
                      <ol className="list-decimal list-inside text-[9px] space-y-1 text-slate-600 font-medium">
                        <li>Clean dustbin lid surface thoroughly.</li>
                        <li>Peel backing &amp; affix placard firmly.</li>
                        <li>Test scan using smartphone camera.</li>
                        <li>Verify URL routes to /report/BIN-00X.</li>
                        <li>Placards are UV-rated and weatherproof.</li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-center">
                      <span className="text-[8px] font-mono text-slate-400 block">
                        HAILO Municipal Batch #5-BIN • Standard ISO A4
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
