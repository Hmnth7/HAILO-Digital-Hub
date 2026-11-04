import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { Bin, WasteType, BinStatus } from '../types';
import { 
  Trash2, 
  Search, 
  Filter, 
  Plus, 
  Grid, 
  List, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Edit2,
  Trash,
  X,
  Sparkles,
  Sliders
} from 'lucide-react';

export const BinMonitoringPage: React.FC = () => {
  const { bins, addBin, editBin, removeBin, hardwareState } = useApp();
  const { navigate } = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'fill-desc' | 'fill-asc' | 'id-asc' | 'id-desc'>('fill-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalBin, setEditModalBin] = useState<Bin | null>(null);

  // Form states for Add Bin
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState<WasteType>('Mixed');
  const [newCapacity, setNewCapacity] = useState(100);
  const [newZone, setNewZone] = useState('Campus Grounds');

  // Edit states
  const [editLocation, setEditLocation] = useState('');
  const [editType, setEditType] = useState<WasteType>('Mixed');
  const [editCapacity, setEditCapacity] = useState(100);

  const filteredBins = useMemo(() => {
    return bins
      .filter(bin => {
        const matchesSearch = 
          bin.binCode.toLowerCase().includes(search.toLowerCase()) ||
          bin.location.toLowerCase().includes(search.toLowerCase()) ||
          bin.zone.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = 
          statusFilter === 'ALL' || 
          (statusFilter === 'ATTENTION' && bin.currentFillLevel >= 80) ||
          bin.status === statusFilter;

        const matchesType = typeFilter === 'ALL' || bin.wasteType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'fill-desc') return b.currentFillLevel - a.currentFillLevel;
        if (sortBy === 'fill-asc') return a.currentFillLevel - b.currentFillLevel;
        if (sortBy === 'id-asc') return a.binCode.localeCompare(b.binCode);
        if (sortBy === 'id-desc') return b.binCode.localeCompare(a.binCode);
        return 0;
      });
  }, [bins, search, statusFilter, typeFilter, sortBy]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    addBin({
      location: newLocation.trim(),
      wasteType: newType,
      capacity: Number(newCapacity),
      zone: newZone
    });
    setAddModalOpen(false);
    setNewLocation('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBin) return;
    editBin(editModalBin.binCode, {
      location: editLocation.trim(),
      wasteType: editType,
      capacity: Number(editCapacity)
    });
    setEditModalBin(null);
  };

  const getStatusBadge = (status: BinStatus) => {
    switch (status) {
      case 'OVERFLOW':
        return { label: 'OVERFLOW', color: 'bg-red-600 text-white font-bold animate-pulse' };
      case 'FULL':
        return { label: 'FULL', color: 'bg-red-500 text-white font-bold' };
      case 'ALMOST_FULL':
        return { label: 'ALMOST FULL', color: 'bg-amber-500 text-white font-semibold' };
      case 'APPROACHING_FULL':
        return { label: 'APPROACHING', color: 'bg-emerald-600 text-white font-medium' };
      case 'NORMAL':
      default:
        return { label: 'NORMAL', color: 'bg-emerald-500 text-white font-medium' };
    }
  };

  const getFillBarColor = (level: number) => {
    if (level >= 100) return 'bg-red-600 animate-pulse';
    if (level >= 95) return 'bg-red-500';
    if (level >= 80) return 'bg-amber-500';
    if (level >= 60) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Add Bin Action */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Bin Fleet Management</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {bins.length} Active Bins
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time ultrasonic fill monitoring, unique QR generation, and CRUD fleet configuration.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dustbin</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Bin ID (BIN-001, BIN-003), location, or zone..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ATTENTION">Needs Attention (≥80%)</option>
              <option value="NORMAL">Normal (0–59%)</option>
              <option value="APPROACHING_FULL">Approaching (60–79%)</option>
              <option value="ALMOST_FULL">Almost Full (80–94%)</option>
              <option value="FULL">Full (95–99%)</option>
              <option value="OVERFLOW">Overflow (100%)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase text-[11px]">Waste Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="Bio">Bio</option>
              <option value="Paper">Paper</option>
              <option value="Plastic">Plastic</option>
              <option value="Rest">Rest</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-semibold uppercase text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="fill-desc">Fill: Highest First</option>
              <option value="fill-asc">Fill: Lowest First</option>
              <option value="id-asc">Bin ID: Ascending</option>
              <option value="id-desc">Bin ID: Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBins.map((bin) => {
            const badge = getStatusBadge(bin.status);

            return (
              <div
                key={bin.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                  bin.status === 'OVERFLOW' 
                    ? 'border-red-300 ring-2 ring-red-500/20 bg-red-50/10' 
                    : bin.currentFillLevel >= 80 
                    ? 'border-amber-300 bg-amber-50/10' 
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => navigate(`/admin/bins/${bin.binCode}`)}
                          className="font-mono text-lg font-black text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors"
                        >
                          {bin.binCode}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {bin.wasteType}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">
                        {bin.location}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {bin.zone}
                      </span>
                    </div>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Fill Level */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-500">Fill Level</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-mono text-slate-900">
                          {bin.currentFillLevel}%
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          / {bin.capacity}L
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getFillBarColor(bin.currentFillLevel)}`}
                        style={{ width: `${Math.min(100, bin.currentFillLevel)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                    <span className="flex items-center gap-1">
                      {bin.binCode === 'BIN-003' || hardwareState.targetBinCode === bin.binCode ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          IoT Sensor Active
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          Sensor not connected
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-semibold">
                      {bin.binCode === 'BIN-003' || hardwareState.targetBinCode === bin.binCode 
                        ? `${hardwareState.currentDistanceCm} cm` 
                        : `${bin.sensorDistanceCm} cm`}
                    </span>
                  </div>
                </div>

                {/* Card Actions: Edit, Delete, Details, QR */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditModalBin(bin);
                        setEditLocation(bin.location);
                        setEditType(bin.wasteType);
                        setEditCapacity(bin.capacity);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit Bin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {bins.length > 5 && (
                      <button
                        onClick={() => removeBin(bin.binCode)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove Bin"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/report/${bin.binCode}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Test Citizen QR Page"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => navigate(`/admin/bins/${bin.binCode}`)}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Bin ID</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Waste Type</th>
                  <th className="py-3.5 px-4">Fill Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBins.map((bin) => {
                  const badge = getStatusBadge(bin.status);

                  return (
                    <tr
                      key={bin.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        {bin.binCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {bin.location}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                          {bin.wasteType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 w-10">
                            {bin.currentFillLevel}%
                          </span>
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getFillBarColor(bin.currentFillLevel)}`}
                              style={{ width: `${Math.min(100, bin.currentFillLevel)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {bin.lastUpdated}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/admin/bins/${bin.binCode}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Bin Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">Add New Smart Dustbin</h4>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Block – Room 102 Lobby"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waste Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Bio">Bio (Organic)</option>
                    <option value="Paper">Paper</option>
                    <option value="Plastic">Plastic</option>
                    <option value="Rest">Rest</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (Liters)</label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Zone</label>
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                <strong>Automatic Provisioning:</strong> The system will assign the next sequential code (e.g. <code>BIN-006</code>) and immediately generate its unique permanent QR placard URL.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Create Dustbin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bin Modal */}
      {editModalBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">Edit Dustbin {editModalBin.binCode}</h4>
              <button onClick={() => setEditModalBin(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waste Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Bio">Bio</option>
                    <option value="Paper">Paper</option>
                    <option value="Plastic">Plastic</option>
                    <option value="Rest">Rest</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (Liters)</label>
                  <input
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalBin(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
