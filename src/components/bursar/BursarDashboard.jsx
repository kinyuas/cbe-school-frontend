// src/components/bursar/BursarDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiDollarSign, 
  FiUsers, 
  FiTrendingUp, 
  FiAlertCircle, 
  FiAward, 
  FiActivity,
  FiPieChart
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const fmtMoney = (v) => `KSh ${Number(v || 0).toLocaleString()}`;

const BursarDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    api.get(`/fees/stats?year=${currentYear}`)
      .then(res => { if (res.data?.success) setStats(res.data.data); })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [currentYear]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  const terms = ['Term 1', 'Term 2', 'Term 3'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Year {currentYear} • Termly Fee Analysis</p>
        </div>
        <Link to="/bursar/payments" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          + Record Payment
        </Link>
      </div>
      
      {/* Overall Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Total Expected ({currentYear})</p>
          <h3 className="text-2xl font-bold mt-1">{fmtMoney(stats?.totalExpected)}</h3>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-green-100 text-sm font-medium">Total Collected</p>
          <h3 className="text-2xl font-bold mt-1">{fmtMoney(stats?.totalPaid)}</h3>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-red-100 text-sm font-medium">Total Outstanding</p>
          <h3 className="text-2xl font-bold mt-1">{fmtMoney(stats?.totalBalance)}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <p className="text-gray-500 text-sm font-medium">Overall Collection Rate</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.collectionRate || 0}%</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${stats?.collectionRate || 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Term Breakdown Cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiPieChart className="text-blue-600" /> Termly Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {terms.map(term => {
            const tData = stats?.termStats?.[term] || { expected: 0, paid: 0, balance: 0, rate: 0 };
            const hasFees = tData.expected > 0;

            return (
              <div key={term} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-5 py-3 border-b flex justify-between items-center ${hasFees ? 'bg-gray-50' : 'bg-gray-100'}`}>
                  <h3 className="font-bold text-gray-800">{term}</h3>
                  {hasFees ? (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      tData.rate >= 100 ? 'bg-green-100 text-green-700' : 
                      tData.rate > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tData.rate}% Collected
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-500">No Fee Set</span>
                  )}
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Expected</span>
                    <span className="font-semibold text-gray-800">{fmtMoney(tData.expected)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Collected</span>
                    <span className="font-semibold text-green-600">{fmtMoney(tData.paid)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-semibold text-gray-700">Outstanding</span>
                    <span className={`font-bold ${tData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmtMoney(tData.balance)}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full ${tData.rate >= 100 ? 'bg-green-500' : tData.rate > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(100, tData.rate)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiActivity className="text-blue-600"/> Fee Collection Activity
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
             <p className="text-gray-400 text-sm">Visual chart integration ready (Chart.js / Recharts)</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FiAward className="text-yellow-400"/> Smart Recommendations
          </h3>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <FiAlertCircle className="text-red-400 w-5 h-5 flex-shrink-0"/>
              <p className="text-gray-300">
                Term 1 collection rate is {stats?.termStats?.['Term 1']?.rate || 0}%. 
                {(stats?.termStats?.['Term 1']?.rate || 0) < 50 ? ' Urgent follow-up needed.' : ' Keep pushing.'}
              </p>
            </li>
            <li className="flex gap-3">
              <FiTrendingUp className="text-green-400 w-5 h-5 flex-shrink-0"/>
              <p className="text-gray-300">
                Overall rate is currently at {stats?.collectionRate || 0}%. 
                {(stats?.collectionRate || 0) > 70 ? ' Excellent work.' : ' Focus on clearing arrears.'}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BursarDashboard;