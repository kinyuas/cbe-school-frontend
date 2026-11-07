// src/components/bursar/BursarPayments.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiSearch, FiPlus, FiX, FiEye, FiUser, FiCalendar, FiCheckCircle, FiTrendingUp
} from 'react-icons/fi';

const fmtMoney = (v) => `KSh ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');

const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];
const classOrder = (n) => {
  const i = CLASS_ORDER.indexOf(n);
  return i === -1 ? 999 : i;
};

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const TERM_IDX = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 };

const BursarPayments = () => {
  const currentYear = new Date().getFullYear();
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Global State
  const [students, setStudents] = useState([]);
  const [allStudentFees, setAllStudentFees] = useState({});
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState(currentYear);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Forms
  const [form, setForm] = useState({
    amount: '', term: 'Term 1', method: 'Cash', receipt: ''
  });

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    try {
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success) {
        const activeClasses = (schoolRes.data.data.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name)
          .sort((a, b) => classOrder(a) - classOrder(b));
        setSchoolClasses(activeClasses);
      }

      const pupilsRes = await api.get('/pupils');
      setStudents(pupilsRes.data?.data || []);

      const promises = YEARS.map(y => api.get(`/fees?year=${y}`));
      const responses = await Promise.all(promises);
      
      const feeMap = {};
      responses.forEach(res => {
        if (res.data?.success) {
          (res.data.data || []).forEach(f => {
            const sid = f.studentId?._id || f.studentId;
            if (!sid) return;
            if (!feeMap[sid]) feeMap[sid] = [];
            feeMap[sid].push(f);
          });
        }
      });

      setAllStudentFees(feeMap);

    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ============================================================
  // HELPERS
  // ============================================================
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.admNo.includes(search);
      const matchClass = !filterClass || s.class === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  // Core Calculation Logic (Respects termJoined)
  const calculateStudentLedger = (docs, focusYear) => {
    if (!docs || docs.length === 0) {
      return { totalExpected: 0, totalPaid: 0, balance: 0, priorCredit: 0, termRows: [], payments: [] };
    }

    let priorArrears = 0;
    let priorCredit = 0;

    // 1. Calculate prior years
    docs.filter(d => d.year < focusYear).forEach(doc => {
      const startIdx = TERM_IDX[doc.termJoined || 'Term 1'];
      const t1 = startIdx <= 0 ? (doc.feeStructure?.term1 || 0) : 0;
      const t2 = startIdx <= 1 ? (doc.feeStructure?.term2 || 0) : 0;
      const t3 = startIdx <= 2 ? (doc.feeStructure?.term3 || 0) : 0;
      
      const expected = t1 + t2 + t3;
      const paid = (doc.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const balance = expected - paid;

      if (balance > 0) priorArrears += balance;
      else if (balance < 0) priorCredit += Math.abs(balance);
    });

    // 2. Focus Year Calculations
    const focusDoc = docs.find(d => d.year === focusYear);
    const startIdx = TERM_IDX[focusDoc?.termJoined || 'Term 1'];
    
    // Mask out terms they haven't joined yet
    const t1 = startIdx <= 0 ? (focusDoc?.feeStructure?.term1 || 0) : 0;
    const t2 = startIdx <= 1 ? (focusDoc?.feeStructure?.term2 || 0) : 0;
    const t3 = startIdx <= 2 ? (focusDoc?.feeStructure?.term3 || 0) : 0;
    const focusExpected = t1 + t2 + t3;

    const focusPayments = (focusDoc?.payments || []).filter(p => Number(p.year) === focusYear);
    
    const seen = new Set();
    const uniquePayments = [];
    focusPayments.forEach(p => {
      const key = `${p.receiptNumber}__${p.date}__${p.amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePayments.push(p);
      }
    });

    uniquePayments.sort((a, b) => new Date(a.date) - new Date(b.date));
    const focusPaid = uniquePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 3. Allocate
    let pool = focusPaid + priorCredit;
    let currentArrears = priorArrears;
    const termRows = [];

    if (currentArrears > 0) {
      const applied = Math.min(pool, currentArrears);
      pool -= applied;
      currentArrears -= applied;
      termRows.push({
        term: `Arrears (Year < ${focusYear})`,
        expected: priorArrears,
        applied,
        status: currentArrears === 0 ? 'Cleared' : (applied > 0 ? 'Partial' : 'Pending'),
        isPrior: true
      });
    } else if (priorCredit > 0) {
      termRows.push({
        term: `Prior Credit (Year < ${focusYear})`,
        expected: 0,
        applied: 0,
        status: 'Credit Added',
        isPrior: true,
        creditAmount: priorCredit
      });
    }

    const termAmounts = [t1, t2, t3];
    for (let i = 0; i < 3; i++) {
      const expected = termAmounts[i];
      const applied = Math.min(pool, expected);
      pool -= applied;

      termRows.push({
        term: TERMS[i],
        expected,
        applied,
        status: applied >= expected && expected > 0 ? 'Cleared' 
              : (applied > 0 ? 'Partial' 
              : (expected === 0 ? (i < startIdx ? 'Not Joined' : 'Not Set') : 'Pending')),
        isPrior: false
      });
    }

    const totalExpected = priorArrears + focusExpected;
    const totalAvailable = focusPaid + priorCredit;
    const balance = totalExpected - totalAvailable;

    return {
      totalExpected,
      totalPaid: focusPaid, 
      priorCredit,
      balance,
      termRows,
      payments: uniquePayments.reverse()
    };
  };

  // For Table View
  const tableData = useMemo(() => {
    const map = {};
    filteredStudents.forEach(student => {
      const docs = allStudentFees[student._id] || [];
      map[student._id] = calculateStudentLedger(docs, filterYear);
    });
    return map;
  }, [filteredStudents, allStudentFees, filterYear]);

  // For Modal View
  const viewData = useMemo(() => {
    if (!selectedStudent) return null;
    const docs = allStudentFees[selectedStudent._id] || [];
    return calculateStudentLedger(docs, filterYear);
  }, [selectedStudent, allStudentFees, filterYear]);

  // ============================================================
  // RECORD PAYMENT
  // ============================================================
  const handleRecordClick = (student) => {
    setSelectedStudent(student);
    setForm({ amount: '', term: 'Term 1', method: 'Cash', receipt: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');

    try {
      await api.post('/fees/payment', {
        studentId: selectedStudent._id,
        amount: Number(form.amount),
        term: form.term,
        year: filterYear,
        paymentMethod: form.method,
        receiptNumber: form.receipt || `REC-${Date.now().toString().slice(-6)}`
      });
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) return <div className="p-8 text-center text-gray-500">Loading students...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiUser className="text-blue-600" /> Student Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">Record, view, and manage student fee payments.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or adm no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
        >
          <option value="">All Classes</option>
          {schoolClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterYear}
          onChange={e => setFilterYear(parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white font-semibold"
        >
          {YEARS.map(y => <option key={y} value={y}>{y} {y === currentYear ? '(Current)' : ''}</option>)}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4 text-right">Expected ({filterYear})</th>
                <th className="px-6 py-4 text-right">Paid ({filterYear})</th>
                <th className="px-6 py-4 text-right">Balance Due</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No students found.</td>
                </tr>
              ) : filteredStudents.map(student => {
                const data = tableData[student._id];
                const balance = data?.balance || 0;
                
                return (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.admNo}</p>
                    </td>
                    <td className="px-6 py-4">{student.class}</td>
                    <td className="px-6 py-4 text-right font-medium">{fmtMoney(data?.totalExpected)}</td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">{fmtMoney(data?.totalPaid)}</td>
                    <td className="px-6 py-4 text-right font-bold">
                      <span className={balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                        {balance < 0 ? `-${fmtMoney(Math.abs(balance))}` : fmtMoney(balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedStudent(student); setShowViewModal(true); }}
                          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1"
                        >
                          <FiEye /> View
                        </button>
                        <button
                          onClick={() => handleRecordClick(student)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                        >
                          <FiPlus /> Record
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RECORD PAYMENT MODAL */}
      {/* ============================================================ */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h2 className="text-lg font-bold">Record Payment</h2>
                <p className="text-xs text-gray-400">{selectedStudent.name} • {filterYear}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white"><FiX className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (KSh)</label>
                <input
                  type="number" required min="1"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Method</label>
                  <select value={form.method} onChange={e => setForm({...form, method: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    <option>Cash</option><option>M-Pesa</option><option>Bank</option><option>Cheque</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 mt-4">
                Confirm Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW HISTORY MODAL */}
      {/* ============================================================ */}
      {showViewModal && selectedStudent && viewData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Header */}
            <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold">Payment History</h2>
                <p className="text-xs text-gray-400">{selectedStudent.name} • {selectedStudent.class} • {filterYear}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-white"><FiX className="w-5 h-5"/></button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Due ({filterYear})</p>
                  <p className="text-xl font-bold text-blue-800 mt-1">{fmtMoney(viewData.totalExpected)}</p>
                  {viewData.priorCredit > 0 && (
                    <p className="text-[10px] text-blue-500 mt-1">Includes prior arrears</p>
                  )}
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase">Paid ({filterYear})</p>
                  <p className="text-xl font-bold text-green-800 mt-1">{fmtMoney(viewData.totalPaid)}</p>
                </div>
                <div className={`border p-4 rounded-xl text-center ${viewData.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'}`}>
                  <p className={`text-xs font-semibold uppercase ${viewData.balance > 0 ? 'text-red-600' : 'text-teal-600'}`}>
                    {viewData.balance < 0 ? 'Overpayment (Credit)' : 'Balance Due'}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${viewData.balance > 0 ? 'text-red-800' : 'text-teal-800'}`}>
                    {viewData.balance < 0 ? `-${fmtMoney(Math.abs(viewData.balance))}` : fmtMoney(viewData.balance)}
                  </p>
                </div>
              </div>

              {/* Term Breakdown */}
              <div>
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
                      {viewData.termRows.map((row, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${row.isPrior ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 font-semibold">
                            {row.term}
                            {row.isPrior && <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Carried Forward</span>}
                          </td>
                          <td className="px-4 py-3 text-right">{fmtMoney(row.expected)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{fmtMoney(row.applied)}</td>
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
                                <FiTrendingUp /> +{fmtMoney(row.creditAmount)}
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

              {/* Payment Log */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiCalendar className="text-green-600" /> Payments Received ({filterYear})
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Receipt #</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewData.payments.length === 0 ? (
                        <tr><td colSpan="5" className="p-4 text-center text-gray-500">No payments recorded for {filterYear}.</td></tr>
                      ) : viewData.payments.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{fmtDate(p.date)}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtTime(p.date)}</td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{p.paymentMethod}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{fmtMoney(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BursarPayments;