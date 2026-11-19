// src/pages/SuperAdmin/SuperAdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiUsers, FiPlus, FiRefreshCw, FiPower, FiHome, FiUserCheck,
  FiDollarSign, FiLogOut, FiAlertCircle, FiShield, FiAward,
  FiSearch, FiX, FiFilter, FiBookOpen, FiTrendingUp, FiCheckCircle,
  FiSlash, FiMail, FiChevronDown, FiDatabase, FiCreditCard, FiMessageSquare
} from 'react-icons/fi';

// ============================================================
// COMPONENTS
// ============================================================
const StatTile = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-gray-800/70 border border-gray-700/70 rounded-xl px-4 py-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
    </div>
  </div>
);

const SchoolCard = ({ school, onToggleStatus, onTogglePortal, onRefreshStats }) => {
  const initials = school.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`group relative bg-gray-800/80 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${
        school.isActive
          ? 'border-gray-700/70 hover:border-indigo-500/50'
          : 'border-red-900/40 opacity-80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            school.isActive
              ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
              : 'bg-red-900/30 text-red-300 ring-1 ring-red-700/40'
          }`}
        >
          {initials || <FiHome />}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white truncate" title={school.name}>
            {school.name}
          </h3>
          <p className="text-[11px] text-indigo-400 font-mono mt-0.5">
            #{school.schoolCode}
          </p>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            school.isActive
              ? 'bg-green-900/40 text-green-400 ring-1 ring-green-800/50'
              : 'bg-red-900/40 text-red-400 ring-1 ring-red-800/50'
          }`}
        >
          {school.isActive ? 'Active' : 'Suspended'}
        </span>
      </div>

      {/* Admin email & Cluster Info */}
      <div className="px-4 space-y-1 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5 truncate">
          <FiMail className="w-3 h-3 flex-shrink-0 text-gray-500" />
          <span className="truncate" title={school.adminEmail}>{school.adminEmail}</span>
        </div>
        
        {school.clusterName && (
          <div className="flex items-center gap-1.5 truncate">
            <FiDatabase className="w-3 h-3 flex-shrink-0 text-indigo-400" />
            <span className="truncate text-indigo-300" title={school.clusterName}>
              {school.clusterName}
            </span>
          </div>
        )}
      </div>

      {/* Compact stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 mt-1">
        <div className="bg-gray-900/60 rounded-lg px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Students</p>
          <p className="text-sm font-bold text-white">{school.stats?.students ?? 0}</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Teachers</p>
          <p className="text-sm font-bold text-white">{school.stats?.teachers ?? 0}</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Bursar</p>
          <p className={`text-sm font-bold ${school.stats?.bursars > 0 ? 'text-green-400' : 'text-gray-500'}`}>
            {school.stats?.bursars > 0 ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-1.5">
        <button
          onClick={() => onToggleStatus(school.schoolCode, school.isActive)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            school.isActive
              ? 'bg-red-900/25 text-red-400 hover:bg-red-900/40'
              : 'bg-green-900/25 text-green-400 hover:bg-green-900/40'
          }`}
        >
          <FiPower className="w-3 h-3" />
          {school.isActive ? 'Suspend' : 'Activate'}
        </button>

        <button
          onClick={() => onTogglePortal(school.schoolCode, school.allowParentPupilPortal)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            school.allowParentPupilPortal
              ? 'bg-purple-900/25 text-purple-400 hover:bg-purple-900/40'
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
          title="Parent / Pupil portal"
        >
          {school.allowParentPupilPortal ? 'Portal ON' : 'Portal OFF'}
        </button>

        <button
          onClick={() => onRefreshStats(school.schoolCode)}
          className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-colors"
          title="Recount stats from school DB"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', adminEmail: '' });
  const [registering, setRegistering] = useState(false);

  // 🆕 Platform SMS State
  const [platformStats, setPlatformStats] = useState({
    platformBalance: 0,
    totalAllocated: 0,
    totalPurchased: 0,
    recentPurchases: []
  });
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupUnits, setTopupUnits] = useState('');
  
  // 🆕 Pending Payments State
  const [pendingPayments, setPendingPayments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const token = localStorage.getItem('superAdminToken');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/administrator/schools', {
        params: {
          search: debouncedSearch,
          status: statusFilter,
          sort: sortBy,
        },
      });
      setSchools(res.data.schools || []);
      setSummary(res.data.summary || null);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('superAdminToken');
        navigate('/sys-admin-login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load schools.');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, navigate]);

  // 🆕 Fetch Platform SMS Stats
  const fetchPlatformStats = async () => {
    try {
      const res = await api.get('/sms/platform-stats');
      if (res.data?.success) {
        setPlatformStats(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load platform stats. Using defaults.', e);
      setPlatformStats({
        platformBalance: 0,
        totalAllocated: 0,
        totalPurchased: 0,
        recentPurchases: []
      });
    }
  };

  // 🆕 Fetch Pending Payments
  const fetchPendingPayments = async () => {
    try {
      const res = await api.get('/sms/pending-payments');
      if (res.data.success) setPendingPayments(res.data.data);
    } catch (e) {
      console.error('Failed to fetch pending payments', e);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/sys-admin-login');
      return;
    }
    fetchSchools();
    fetchPlatformStats();
    fetchPendingPayments();
  }, [token, navigate, fetchSchools]);

  const handleRegisterSchool = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await api.post('/administrator/register-school', formData);
      toast.success(`School Registered! Code: ${res.data.schoolCode}`);
      setShowModal(false);
      setFormData({ name: '', adminEmail: '' });
      fetchSchools();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to register school';
      if (msg.includes('cluster') || msg.includes('Configuration')) {
        toast.error(msg, { duration: 8000 }); 
      } else {
        toast.error(msg);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sms/platform-topup', { units: Number(topupUnits) });
      toast.success('Platform balance updated!');
      setShowTopupModal(false);
      setTopupUnits('');
      fetchPlatformStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Top-up failed');
    }
  };

  const toggleSchoolStatus = async (schoolCode, currentStatus) => {
    try {
      await api.put(`/administrator/school/${schoolCode}/status`, {
        isActive: !currentStatus,
      });
      toast.success(`School ${!currentStatus ? 'Activated' : 'Suspended'}`);
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update school status');
    }
  };

  const toggleParentPupilPortal = async (schoolCode, currentAllow) => {
    try {
      await api.patch(`/administrator/school/${schoolCode}/parent-pupil-portal`, {
        allow: !currentAllow,
      });
      toast.success(`Parent/Pupil portal ${!currentAllow ? 'Enabled' : 'Disabled'}`);
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update portal access');
    }
  };

  const refreshSingleStats = async (schoolCode) => {
    try {
      await api.post(`/administrator/school/${schoolCode}/refresh-stats`);
      toast.success(`Stats refreshed for ${schoolCode}`);
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to refresh stats');
    }
  };

  const refreshAllStats = async () => {
    if (!window.confirm('Recount stats for ALL schools? This may take a moment.')) return;
    setRefreshingAll(true);
    try {
      const res = await api.post('/administrator/schools/refresh-all-stats');
      toast.success(`Refreshed ${res.data.refreshed} schools${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk refresh failed');
    } finally {
      setRefreshingAll(false);
    }
  };

  // 🆕 Approve/Reject Payment Handler
  const handleApprove = async (requestId, action) => {
    const confirmMsg = action === 'approve' 
      ? 'Confirm you have verified this M-Pesa code in your bank statement? This will instantly credit the school.'
      : 'Are you sure you want to REJECT this payment request?';
      
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const res = await api.post('/sms/approve-payment', { requestId, action });
      toast.success(res.data.message);
      fetchPendingPayments();
      fetchPlatformStats();
      fetchSchools(); // refresh school stats to show updated counts if needed
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('token');
    navigate('/sys-admin-login');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || sortBy !== 'recent';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('recent');
  };

  const isLowBalance = platformStats.platformBalance < 1000;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {/* ============ TOP BAR ============ */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FiShield className="text-indigo-500" /> Super Admin Dashboard
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Manage all CBE System Schools
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate('/sys-admin/scholarships')}
              className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FiAward className="w-3.5 h-3.5" /> Scholarships
            </button>
            <button
              onClick={refreshAllStats}
              disabled={refreshingAll}
              className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 text-gray-300 disabled:opacity-50"
              title="Recount stats for every school"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin' : ''}`} />
              {refreshingAll ? 'Refreshing…' : 'Refresh Stats'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <FiLogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* ============ 🆕 PENDING M-PESA PAYMENTS ============ */}
        {pendingPayments.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/40 to-gray-900 border border-amber-600/50 rounded-2xl p-4 sm:p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4" /> Action Required: Pending M-Pesa Payments
            </h3>
            <div className="overflow-x-auto rounded-lg border border-amber-700/30">
              <table className="w-full text-xs text-left text-gray-300">
                <thead className="bg-black/40 text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">M-Pesa Code</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">SMS Requested</th>
                    <th className="px-4 py-3 text-center rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-gray-800/40">
                  {pendingPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-amber-900/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{p.schoolName}</span> 
                        <span className="text-indigo-400 text-[10px] ml-1 bg-indigo-900/30 px-1.5 py-0.5 rounded">({p.schoolCode})</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-200 font-bold">{p.mpesaCode}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-bold">KSH {p.amountKes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">{p.unitsRequested} SMS</td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(p._id, 'approve')} 
                          className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-lg shadow-green-900/30 flex items-center gap-1"
                        >
                          <FiCheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button 
                          onClick={() => handleApprove(p._id, 'reject')} 
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-lg shadow-red-900/30 flex items-center gap-1"
                        >
                          <FiX className="w-3 h-3" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ PLATFORM SMS BALANCE & TOP-UP PANEL ============ */}
        <div className={`mb-6 rounded-2xl border p-5 sm:p-6 shadow-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 transition-all ${isLowBalance ? 'bg-gradient-to-br from-red-900/40 to-gray-900 border-red-700/50' : 'bg-gradient-to-br from-indigo-900/40 to-gray-900 border-indigo-700/50'}`}>
          
          {/* Balance Display */}
          <div className="flex-shrink-0">
            <p className="text-xs uppercase font-bold text-gray-400 flex items-center gap-2 mb-1">
              <FiMessageSquare className={isLowBalance ? 'text-red-400' : 'text-indigo-400'} /> Platform SMS Balance
            </p>
            <div className="flex items-end gap-3">
              <p className={`text-4xl sm:text-5xl font-extrabold ${isLowBalance ? 'text-red-400' : 'text-white'}`}>
                {platformStats.platformBalance.toLocaleString()} <span className="text-lg sm:text-xl text-gray-400 font-medium">SMS</span>
              </p>
            </div>
            {isLowBalance ? (
              <span className="inline-flex mt-2 bg-red-500/20 text-red-300 text-xs px-2.5 py-1 rounded-md border border-red-500/30 items-center gap-1 font-semibold">
                <FiAlertCircle /> Low Balance Alert Sent to Phone & Email
              </span>
            ) : (
              <p className="text-[11px] text-gray-400 mt-2">
                Total Allocated: <strong className="text-gray-200">{platformStats.totalAllocated}</strong> | Total Purchased: <strong className="text-gray-200">{platformStats.totalPurchased}</strong>
              </p>
            )}
          </div>

          {/* Instructions for Top-Up */}
          <div className="bg-black/30 p-4 rounded-xl text-[11px] text-gray-300 border border-gray-700/50 max-w-md w-full">
            <p className="font-bold text-white mb-2 flex items-center gap-1.5 text-sm">
              <FiCreditCard /> How to Top-Up Africa's Talking
            </p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Log in to <a href="https://account.africastalking.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Africa's Talking Dashboard</a>.</li>
              <li>Go to <strong>Billing &gt; Buy Airtime</strong>.</li>
              <li>Pay via M-Pesa to AT Paybill <strong className="text-white">525900</strong>.</li>
              <li>Once AT confirms the receipt, click <strong>Update Platform Balance</strong> to log your purchase here.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-2 w-full xl:w-auto">
            <button
              onClick={() => setShowTopupModal(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50 transition-all"
            >
              <FiPlus /> Update Platform Balance
            </button>
          </div>
        </div>

        {/* ============ RECENT SMS PURCHASES BY SCHOOLS ============ */}
        {platformStats.recentPurchases?.length > 0 && (
          <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-green-400" /> Recent School SMS Purchases
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-700/50">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/80 text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3 text-right">SMS Bought</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 font-mono rounded-tr-lg">M-Pesa Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-gray-800/20">
                  {platformStats.recentPurchases.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{p.schoolName}</span> 
                        <span className="text-indigo-400 text-[10px] ml-1 bg-indigo-900/30 px-1.5 py-0.5 rounded">({p.schoolCode})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-bold">+{p.unitsAllocated}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-200">KSH {p.amountKes.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-gray-400">{p.mpesaCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ SUMMARY TILES ============ */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6">
            <StatTile icon={FiHome} label="Schools" value={summary.total} accent="bg-indigo-600/20 text-indigo-400" />
            <StatTile icon={FiCheckCircle} label="Active" value={summary.active} accent="bg-green-600/20 text-green-400" />
            <StatTile icon={FiSlash} label="Suspended" value={summary.suspended} accent="bg-red-600/20 text-red-400" />
            <StatTile icon={FiUsers} label="Students" value={summary.totalStudents} accent="bg-blue-600/20 text-blue-400" />
            <StatTile icon={FiBookOpen} label="Teachers" value={summary.totalTeachers} accent="bg-purple-600/20 text-purple-400" />
            <StatTile icon={FiDollarSign} label="Bursars" value={summary.totalBursars} accent="bg-amber-600/20 text-amber-400" />
          </div>
        )}

        {/* ============ TOOLBAR ============ */}
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 mb-5 flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code or admin email…"
              className="w-full bg-gray-900/70 border border-gray-700 text-sm text-white pl-9 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <FiFilter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-900/70 border border-gray-700 text-sm text-white pl-8 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="active">Active only</option>
              <option value="suspended">Suspended only</option>
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <FiTrendingUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-gray-900/70 border border-gray-700 text-sm text-white pl-8 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="code">Code (low→high)</option>
              <option value="students">Most students</option>
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-white px-2 py-1.5 flex items-center gap-1"
            >
              <FiX className="w-3 h-3" /> Clear
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="ml-auto bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-900/30"
          >
            <FiPlus className="w-3.5 h-3.5" /> New School
          </button>
        </div>

        {/* ============ RESULTS HEADER ============ */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {loading ? 'Loading…' : `${schools.length} school${schools.length !== 1 ? 's' : ''} shown`}
          </p>
        </div>

        {/* ============ GRID ============ */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700/60">
            <FiHome className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-300">
              {hasActiveFilters ? 'No schools match your filters' : 'No Schools Registered'}
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Click "New School" to get started.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {schools.map((school) => (
              <SchoolCard
                key={school._id}
                school={school}
                onToggleStatus={toggleSchoolStatus}
                onTogglePortal={toggleParentPupilPortal}
                onRefreshStats={refreshSingleStats}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ REGISTER MODAL ============ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">Register New School</h2>

            <form onSubmit={handleRegisterSchool} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">School Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Kianjiru High School"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin@school.com"
                  required
                />
              </div>

              <div className="bg-amber-900/20 border border-amber-700/50 p-3 rounded-lg flex gap-3 text-amber-200 text-xs">
                <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>
                  Registering a school will automatically assign the next available 4-digit code and connect it to an idle database.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {registering ? 'Registering...' : 'Register School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ 🆕 MANUAL TOP-UP MODAL ============ */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-2 text-white">Update Platform Balance</h2>
            <p className="text-xs text-gray-400 mb-4">
              Enter the number of SMS you just purchased from Africa's Talking. This will increase your platform balance so schools can continue buying.
            </p>

            <form onSubmit={handleTopup} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMS Amount Bought</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={topupUnits}
                  onChange={(e) => setTopupUnits(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold transition-all"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTopupModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/30">
                  Add to Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;