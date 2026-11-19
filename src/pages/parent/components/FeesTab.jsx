// src/pages/parent/components/FeesTab.jsx
import React from 'react';
import api from '../../../services/api';
import { useQuery } from '@tanstack/react-query';
import { FiDollarSign, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiCalendar } from 'react-icons/fi';

const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');

const FeesTab = ({ pupil }) => {
  const currentYear = new Date().getFullYear();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['parent', 'fees', pupil._id],
    queryFn: async () => {
      const res = await api.get(`/parent/fees/${pupil._id}`);
      return res.data?.data || null;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!pupil._id,
    placeholderData: (prev) => prev, 
  });

  if (isLoading) return <div className="text-center py-12 text-sm text-gray-500">Loading fee statement…</div>;

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-8 sm:p-12 text-center">
        <FiDollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600">{error?.response?.data?.message || 'No fee records for this pupil yet.'}</p>
      </div>
    );
  }

  const balanceIsCredit = data.balance < 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary cards — stacked on very small, 3-col on sm+ */}
      <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase">Total Due ({currentYear})</p>
          <p className="text-base sm:text-xl font-bold text-blue-800 mt-1">{fmt(data.totalFee)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-green-600 font-semibold uppercase">Paid ({currentYear})</p>
          <p className="text-base sm:text-xl font-bold text-green-800 mt-1">{fmt(data.paid)}</p>
        </div>
        <div className={`border p-3 sm:p-4 rounded-xl text-center ${data.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'}`}>
          <p className={`text-[10px] sm:text-xs font-semibold uppercase ${data.balance > 0 ? 'text-red-600' : 'text-teal-600'}`}>
            {balanceIsCredit ? 'Overpayment (Credit)' : 'Balance Due'}
          </p>
          <p className={`text-base sm:text-xl font-bold mt-1 ${data.balance > 0 ? 'text-red-800' : 'text-teal-800'}`}>
            {balanceIsCredit ? `-${fmt(Math.abs(data.balance))}` : fmt(data.balance)}
          </p>
        </div>
      </div>

      {/* Term breakdown table — horizontal scroll on mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiCheckCircle className="text-blue-500" /> Fee Allocation Breakdown
        </h3>
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-[11px] sm:text-sm text-left min-w-[520px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3">Term / Description</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Expected</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Applied</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.termBreakdown.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${row.isPrior ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">
                    {row.term}
                    {row.isPrior && <span className="ml-1 sm:ml-2 text-[9px] sm:text-[10px] bg-amber-200 text-amber-800 px-1 sm:px-1.5 py-0.5 rounded uppercase">Carried</span>}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">{fmt(row.expected)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-green-600 whitespace-nowrap">{fmt(row.applied)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                    {row.status === 'Cleared' ? (
                      <span className="bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold">Cleared</span>
                    ) : row.status === 'Partial' ? (
                      <span className="bg-yellow-100 text-yellow-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold">Partial</span>
                    ) : row.status === 'Not Joined' ? (
                      <span className="bg-gray-100 text-gray-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold italic">Not Joined</span>
                    ) : row.status === 'Not Set' ? (
                      <span className="bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold">Not Set</span>
                    ) : row.status === 'Credit Added' ? (
                      <span className="bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold inline-flex items-center justify-center gap-1">
                        <FiTrendingUp /> +{fmt(row.creditAmount)}
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments */}
      {data.payments && data.payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiCalendar className="text-green-600" /> Payments Received ({currentYear})
          </h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-[11px] sm:text-sm text-left min-w-[420px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3">Date</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3">Method</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3">Receipt #</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.payments.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{fmtDate(p.date)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-semibold">{p.paymentMethod || 'Cash'}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none">{p.receiptNumber || '—'}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-green-600 whitespace-nowrap">{fmt(p.amount)}</td>
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