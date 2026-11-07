// src/pages/parent/components/FeesTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { FiDollarSign, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiCalendar } from 'react-icons/fi';

const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');

const FeesTab = ({ pupil }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/parent/fees/${pupil._id}`);
        if (!cancelled) setData(res.data?.data || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e.response?.data?.message || 'Could not load fee statement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pupil._id]);

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading fee statement…</div>;
  
  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <FiDollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600">{error || 'No fee records for this pupil yet.'}</p>
      </div>
    );
  }

  const balanceIsCredit = data.balance < 0;

  return (
    <div className="space-y-6">
      
      {/* Top Summary Cards (Matches Bursar View Modal) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
          <p className="text-xs text-blue-600 font-semibold uppercase">Total Due ({currentYear})</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{fmt(data.totalFee)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
          <p className="text-xs text-green-600 font-semibold uppercase">Paid ({currentYear})</p>
          <p className="text-xl font-bold text-green-800 mt-1">{fmt(data.paid)}</p>
        </div>
        <div className={`border p-4 rounded-xl text-center ${data.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'}`}>
          <p className={`text-xs font-semibold uppercase ${data.balance > 0 ? 'text-red-600' : 'text-teal-600'}`}>
            {balanceIsCredit ? 'Overpayment (Credit)' : 'Balance Due'}
          </p>
          <p className={`text-xl font-bold mt-1 ${data.balance > 0 ? 'text-red-800' : 'text-teal-800'}`}>
            {balanceIsCredit ? `-${fmt(Math.abs(data.balance))}` : fmt(data.balance)}
          </p>
        </div>
      </div>

      {/* Term Breakdown Table (Exact Bursar Match) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiCheckCircle className="text-blue-500" /> Fee Allocation Breakdown
        </h3>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Term / Description</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Applied Payment</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.termBreakdown.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${row.isPrior ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3 font-semibold">
                    {row.term}
                    {row.isPrior && <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Carried Forward</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(row.expected)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(row.applied)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.status === 'Cleared' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Cleared</span>
                    ) : row.status === 'Partial' ? (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Partial</span>
                    ) : row.status === 'Not Joined' ? (
                      <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs font-bold italic">Not Joined</span>
                    ) : row.status === 'Not Set' ? (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Not Set</span>
                    ) : row.status === 'Credit Added' ? (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1">
                        <FiTrendingUp /> +{fmt(row.creditAmount)}
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Log Table */}
      {data.payments && data.payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiCalendar className="text-green-600" /> Payments Received ({currentYear})
          </h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.payments.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{fmtDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{p.paymentMethod || 'Cash'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.balance > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Please clear the outstanding balance of {fmt(data.balance)} to avoid penalties.</p>
        </div>
      )}
    </div>
  );
};

export default FeesTab;