// src/components/admin/FeeManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import {
  FiDollarSign, FiPlus, FiSearch, FiEdit2, FiSave, FiX,
  FiUsers, FiFileText, FiTrendingUp, FiRefreshCw, FiEye,
  FiBookOpen, FiCheckCircle, FiAlertCircle, FiClock, FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ============================================================
// HELPERS
// ============================================================
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other'];

const fmtMoney = (v) => `KSh ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');

const BalanceDisplay = ({ value }) => {
  const v = Number(value || 0);
  if (v > 0) return <span className="text-red-600">{fmtMoney(v)}</span>;
  if (v < 0) return <span className="text-green-600">-{fmtMoney(Math.abs(v))}</span>;
  return <span className="text-green-600">KSh 0</span>;
};

const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];
const classOrder = (n) => {
  const i = CLASS_ORDER.indexOf(n);
  return i === -1 ? 999 : i;
};

const TERM_INDEX = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 };
const termIdx = (t) => TERM_INDEX[t] ?? 0;

// ============================================================
// COMPONENT
// ============================================================
const FeeManagement = () => {
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingClassFeeId, setEditingClassFeeId] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeStats, setFeeStats] = useState(null);
  const [feeMap, setFeeMap] = useState({});
  const [studentPoolMap, setStudentPoolMap] = useState({});
  const [studentFeeHistory, setStudentFeeHistory] = useState([]);
  const [viewYear, setViewYear] = useState(currentYear);

  const [paymentForm, setPaymentForm] = useState({
    studentId: '', amount: '', term: '', receiptNumber: '',
    paymentMethod: 'Cash', notes: ''
  });

  const [classFeeForm, setClassFeeForm] = useState({
    class: '', year: currentYear, term1: '', term2: '', term3: ''
  });

  // ============================================================
  // LOAD
  // ============================================================
  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [selectedYear, selectedClass]);

  const loadData = async () => {
    setLoading(true);
    try {
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success) {
        const school = schoolRes.data.data;
        const classes = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name)
          .sort((a, b) => classOrder(a) - classOrder(b));
        setSchoolClasses(classes);
      }

      const studentsRes = await api.get('/pupils');
      if (studentsRes.data?.success) setStudents(studentsRes.data.data || []);

      const yearsToFetch = [
        selectedYear - 2, selectedYear - 1, selectedYear,
        selectedYear + 1, selectedYear + 2,
      ];

      const allFees = [];
      for (const y of yearsToFetch) {
        const res = await api.get('/fees', {
          params: { year: y, class: selectedClass || undefined }
        });
        if (res.data?.success) {
          (res.data.data || []).forEach(f => allFees.push(f));
        }
      }

      const map = {};
      allFees
        .filter(f => Number(f.year) === Number(selectedYear))
        .forEach(fee => {
          const sid = fee.studentId?._id || fee.studentId;
          if (sid) map[sid] = fee;
        });
      setFeeMap(map);
      setFees(allFees.filter(f => Number(f.year) === Number(selectedYear)));

      const history = {};
      allFees.forEach(fee => {
        const sid = fee.studentId?._id || fee.studentId;
        if (!sid) return;
        if (!history[sid]) history[sid] = [];
        history[sid].push(fee);
      });
      setStudentPoolMap(history);

      const cfRes = await api.get('/fees/class-fee', { params: { year: selectedYear } });
      if (cfRes.data?.success) setClassFeeStructures(cfRes.data.data || []);

      const statsRes = await api.get('/fees/stats', { params: { year: selectedYear } });
      if (statsRes.data?.success) setFeeStats(statsRes.data.data);

    } catch (error) {
      console.error('Error loading fee data:', error);
      toast.error('Failed to load fee data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PAYMENT
  // ============================================================
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.studentId) return toast.error('Please select a student');
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return toast.error('Please enter a valid amount');
    if (!paymentForm.term) return toast.error('Please select a term');

    try {
      const response = await api.post('/fees/payment', {
        studentId: paymentForm.studentId,
        amount: parseFloat(paymentForm.amount),
        term: paymentForm.term,
        year: selectedYear,
        receiptNumber: paymentForm.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes
      });

      if (response.data.success) {
        const alloc = response.data.allocation || {};
        const parts = Object.entries(alloc).map(([t, a]) => `${t.replace('|', ' ')}: ${fmtMoney(a)}`).join(', ');
        toast.success(`Payment recorded${parts ? ` (${parts})` : ''}`);
        setShowPaymentModal(false);
        setPaymentForm({ studentId: '', amount: '', term: '', receiptNumber: '', paymentMethod: 'Cash', notes: '' });
        loadData();
      } else {
        toast.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment: ' + (error.response?.data?.message || error.message));
    }
  };

  // ============================================================
  // CLASS FEE
  // ============================================================
  const openClassFeeModalForNew = () => {
    setEditingClassFeeId(null);
    setClassFeeForm({ class: '', year: selectedYear, term1: '', term2: '', term3: '' });
    setShowClassFeeModal(true);
  };

  const openClassFeeModalForEdit = (cf) => {
    setEditingClassFeeId(cf._id);
    setClassFeeForm({
      class: cf.class,
      year: cf.year || selectedYear,
      term1: cf.term1 ?? '',
      term2: cf.term2 ?? '',
      term3: cf.term3 ?? ''
    });
    setShowClassFeeModal(true);
  };

  const handleClassFeeSubmit = async (e) => {
    e.preventDefault();
    if (!classFeeForm.class) return toast.error('Please select a class');

    const payload = {
      class: classFeeForm.class,
      year: parseInt(classFeeForm.year),
      term1: parseFloat(classFeeForm.term1) || 0,
      term2: parseFloat(classFeeForm.term2) || 0,
      term3: parseFloat(classFeeForm.term3) || 0
    };

    try {
      let response;
      if (editingClassFeeId) {
        response = await api.put(`/fees/class-fee/${editingClassFeeId}`, payload);
      } else {
        response = await api.post('/fees/class-fee', payload);
      }

      if (response.data?.success) {
        toast.success(editingClassFeeId ? 'Class fee updated' : 'Class fee set');
        setShowClassFeeModal(false);
        setEditingClassFeeId(null);
        setClassFeeForm({ class: '', year: selectedYear, term1: '', term2: '', term3: '' });
        loadData();
      } else {
        toast.error('Failed to save class fee');
      }
    } catch (error) {
      console.error('Error saving class fee:', error);
      toast.error('Failed to save class fee: ' + (error.response?.data?.message || error.message));
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentForm({ ...paymentForm, studentId: student._id });
    setShowPaymentModal(true);
  };

  const openViewModal = async (student) => {
    setSelectedStudent(student);
    setViewYear(selectedYear);
    setShowViewModal(true);
    setStudentFeeHistory([]);

    try {
      const years = [
        selectedYear - 2, selectedYear - 1, selectedYear,
        selectedYear + 1, selectedYear + 2,
      ];
      const docs = [];
      for (const y of years) {
        const res = await api.get('/fees', { params: { year: y } });
        if (res.data?.success) {
          const found = (res.data.data || []).find(f => {
            const sid = f.studentId?._id || f.studentId;
            return sid === student._id;
          });
          if (found) docs.push(found);
        }
      }
      docs.sort((a, b) => a.year - b.year);
      setStudentFeeHistory(docs);
    } catch (e) {
      console.error('Error fetching student fee history:', e);
    }
  };

  const getStudentFee = (studentId) => feeMap[studentId] || null;

  const getEffectiveTotalFee = (fee) => {
    if (!fee) return 0;
    const startIdx = termIdx(fee.termJoined || 'Term 1');
    const amounts = [
      fee.feeStructure?.term1 || 0,
      fee.feeStructure?.term2 || 0,
      fee.feeStructure?.term3 || 0,
    ];
    let total = 0;
    for (let i = startIdx; i < 3; i++) total += amounts[i];
    return total;
  };

  const computePaid = (fee) => {
    if (!fee) return 0;
    const payments = Array.isArray(fee.payments) ? fee.payments : [];
    return payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  };

  const computeBalance = (fee) => {
    if (!fee) return 0;
    return getEffectiveTotalFee(fee) - computePaid(fee);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <FiCheckCircle className="w-4 h-4" />;
      case 'partial': return <FiClock className="w-4 h-4" />;
      case 'pending': return <FiAlertCircle className="w-4 h-4" />;
      case 'overdue': return <FiAlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm ||
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admNo?.includes(searchTerm);
      const matchesClass = !selectedClass || student.class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const visibleClassFees = useMemo(() => {
    return [...classFeeStructures]
      .filter(c => Number(c.year) === Number(selectedYear))
      .sort((a, b) => classOrder(a.class) - classOrder(b.class));
  }, [classFeeStructures, selectedYear]);

   const buildFeeReport = (docs, focusYear) => {
    if (!docs || docs.length === 0) {
      return {
        rows: [], totalFeeFocus: 0, focusTermFee: 0, priorOutstanding: 0,
        paidFocus: 0, carryInFocus: 0, balanceFocus: 0, totalPoolPaid: 0,
        payments: [], focusYear,
      };
    }

    // 1. Collect + dedupe payments across all year docs
    const seen = new Set();
    const allPayments = [];
    docs.forEach(doc => {
      const pays = Array.isArray(doc.payments) ? doc.payments : [];
      pays.forEach(p => {
        const key = `${p.receiptNumber || 'NO-R'}__${p.date || p.createdAt || ''}__${Number(p.amount) || 0}__${p.paymentMethod || 'Cash'}`;
        if (seen.has(key)) return;
        seen.add(key);
        allPayments.push({
          ...p,
          amount: Number(p.amount) || 0,
          year: p.year || doc.year,
          term: p.term || 'Term 1',
          date: p.date || p.createdAt,
        });
      });
    });
    allPayments.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    // 2. Build rows for EVERY term across ALL years (oldest first)
    const allRows = [];
    docs.forEach(doc => {
      const startIdx = termIdx(doc.termJoined || 'Term 1');
      const amounts = [
        doc.feeStructure?.term1 || 0,
        doc.feeStructure?.term2 || 0,
        doc.feeStructure?.term3 || 0,
      ];
      TERMS.forEach((term, idx) => {
        if (idx < startIdx) return;
        if (amounts[idx] <= 0) return;
        allRows.push({
          year: doc.year, term, termIndex: idx, expected: amounts[idx],
        });
      });
    });
    allRows.sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.termIndex - b.termIndex
    );

    // 3. Total pool of unique payments (deduped)
    const pool = allPayments.reduce((s, p) => s + p.amount, 0);
    const totalPoolPaid = pool;

    // 4. Allocate the pool oldest-term-first
    let cumulativeExpected = 0;
    const enriched = allRows.map(row => {
      cumulativeExpected += row.expected;
      const paymentsOnThisTerm = allPayments.filter(
        p => Number(p.year) === row.year && p.term === row.term
      );
      const paidThisTerm = paymentsOnThisTerm.reduce((s, p) => s + p.amount, 0);
      const last = paymentsOnThisTerm[paymentsOnThisTerm.length - 1];

      const cumulativePaid = Math.min(pool, cumulativeExpected);
      const cleared = pool >= cumulativeExpected;
      const outstanding = Math.max(0, cumulativeExpected - pool);

      return {
        ...row,
        amountPaidThisTerm: paidThisTerm,
        cumulativePaid,
        cumulativeExpected,
        cleared,
        outstanding,
        method: last?.paymentMethod || '-',
        date: last?.date || last?.createdAt,
      };
    });

    // 5. Focus-year numbers
    const focusRows = enriched.filter(r => r.year === focusYear);
    const focusTermFee = focusRows.reduce((s, r) => s + r.expected, 0);

    const expectedThroughFocus = enriched
      .filter(r => r.year <= focusYear)
      .reduce((s, r) => s + r.expected, 0);

    const priorYearsExpected = enriched
      .filter(r => r.year < focusYear)
      .reduce((s, r) => s + r.expected, 0);

    const appliedBeforeFocus = Math.min(pool, priorYearsExpected);
    const priorOutstanding = Math.max(0, priorYearsExpected - appliedBeforeFocus);

    const appliedToFocus = Math.min(
      Math.max(0, pool - priorYearsExpected),
      focusTermFee
    );
    const surplusAfterFocus = Math.max(0, pool - expectedThroughFocus);

    const paidFocus = appliedToFocus + surplusAfterFocus;
    const totalFeeFocus = focusTermFee + priorOutstanding;
    const balanceFocus = totalFeeFocus - paidFocus;

    // 6. Payments list (newest first)
    const payments = [...allPayments]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map(p => ({
        date: p.date,
        method: p.paymentMethod || 'Cash',
        total: p.amount,
        term: p.term,
        year: p.year,
        receiptNumber: p.receiptNumber,
      }));

    // 7. ✅ Display rows: LAST 5 TERMS across ALL years (newest first)
    const displayRows = [...enriched]
      .sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.termIndex - a.termIndex
      )
      .slice(0, 5);

    return {
      rows: displayRows,
      allRows: enriched,
      totalFeeFocus,
      focusTermFee,
      priorOutstanding,
      paidFocus,
      carryInFocus: paidFocus,
      balanceFocus,
      totalPoolPaid,
      payments,
      focusYear,
    };
  };
  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <Layout title="Fee Management" subtitle="Manage student fees and payments">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="ml-4 text-gray-600">Loading fee data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Fee Management" subtitle="Manage student fees and payments">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Students" value={feeStats?.totalStudents || 0} icon={FiUsers} color="blue" />
        <SummaryCard label="Total Paid" value={fmtMoney(feeStats?.totalPaid)} icon={FiTrendingUp} color="green" />
        <SummaryCard
          label="Total Balance"
          value={<BalanceDisplay value={feeStats?.totalBalance} />}
          icon={FiDollarSign}
          color={feeStats?.totalBalance < 0 ? 'green' : 'red'}
        />
        <SummaryCard label="Collection Rate" value={`${feeStats?.collectionRate || 0}%`} icon={FiFileText} color="purple" />
      </div>

      {/* Class Fee Panel */}
      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FiBookOpen className="text-blue-600" />
            <h3 className="font-bold text-gray-800">Class Fee Structure — {selectedYear}</h3>
          </div>
          <button
            onClick={openClassFeeModalForNew}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <FiPlus className="w-4 h-4" /> Set Class Fee
          </button>
        </div>

        {visibleClassFees.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No class fees set for {selectedYear}. Click <strong>Set Class Fee</strong> to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Term 1</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Term 2</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Term 3</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleClassFees.map(cf => {
                  const total = (cf.term1 || 0) + (cf.term2 || 0) + (cf.term3 || 0);
                  return (
                    <tr key={cf._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{cf.class}</td>
                      <td className="px-4 py-2 text-right">{cf.term1 ? fmtMoney(cf.term1) : '-'}</td>
                      <td className="px-4 py-2 text-right">{cf.term2 ? fmtMoney(cf.term2) : '-'}</td>
                      <td className="px-4 py-2 text-right">{cf.term3 ? fmtMoney(cf.term3) : '-'}</td>
                      <td className="px-4 py-2 text-right font-bold text-blue-700">{fmtMoney(total)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => openClassFeeModalForEdit(cf)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs"
                        >
                          <FiEdit2 className="w-4 h-4" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[200px] relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Classes</option>
            {schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg">
            {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
          </select>

          <button onClick={loadData} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-bold text-gray-800">Fee Records</h3>
          <span className="text-sm text-gray-500">
            Showing {filteredStudents.length} of {students.length} students | Year: {selectedYear}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    <FiUsers className="w-12 h-12 text-gray-300 mb-2 mx-auto" />
                    <p>No students found</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const fee = getStudentFee(student._id);
                  const docs = studentPoolMap[student._id] || (fee ? [fee] : []);
                  const rowReport = buildFeeReport(docs, selectedYear);
                  const totalFee = rowReport.totalFeeFocus;
                  const paid = rowReport.paidFocus;
                  const balance = rowReport.balanceFocus;

                  const status = !fee ? null
                    : balance <= 0 ? 'paid'
                    : paid > 0 ? 'partial'
                    : 'pending';

                  return (
                    <tr key={student._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">{student.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{student.admNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{student.class || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {totalFee > 0 ? fmtMoney(totalFee) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-bold">
                        {fee ? fmtMoney(paid) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {fee ? <BalanceDisplay value={balance} /> : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fee ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not Set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(student)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1"
                          >
                            <FiEye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => openPaymentModal(student)}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 flex items-center gap-1"
                          >
                            <FiPlus className="w-3 h-3" /> Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedStudent && (() => {
        const report = buildFeeReport(studentFeeHistory, viewYear);
        const balanceIsCredit = report.balanceFocus < 0;
        const totalUploaded = report.payments.reduce((s, p) => s + p.total, 0);
        const availableYears = studentFeeHistory.map(d => d.year).sort((a, b) => a - b);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-5 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FiEye className="text-blue-600" /> Payment History
                </h2>
                <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-800">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-500">
                    Adm: {selectedStudent.admNo} | Class: {selectedStudent.class}
                    {selectedStudent.stream ? ` | Stream: ${selectedStudent.stream}` : ''}
                  </p>
                </div>

                {availableYears.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500 self-center mr-1">View year:</span>
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => setViewYear(y)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                          viewYear === y
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 uppercase">Total Fee ({viewYear})</p>
                    <p className="text-lg font-bold text-blue-700">{fmtMoney(report.totalFeeFocus)}</p>
                    {report.priorOutstanding > 0 && (
                      <p className="text-[10px] text-blue-500 mt-0.5">
                        incl. {fmtMoney(report.priorOutstanding)} arrears
                      </p>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 uppercase">Paid ({viewYear})</p>
                    <p className="text-lg font-bold text-green-700">{fmtMoney(report.paidFocus)}</p>
                  </div>

                  <div className={`border rounded-lg p-3 text-center ${
                    balanceIsCredit ? 'bg-green-50 border-green-200'
                      : report.balanceFocus > 0 ? 'bg-red-50 border-red-200'
                        : 'bg-green-50 border-green-200'
                  }`}>
                    <p className={`text-xs uppercase ${
                      balanceIsCredit ? 'text-green-600'
                        : report.balanceFocus > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {balanceIsCredit ? 'Credit (Overpaid)' : `Balance (${viewYear})`}
                    </p>
                    <p className={`text-lg font-bold ${
                      balanceIsCredit ? 'text-green-700'
                        : report.balanceFocus > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      <BalanceDisplay value={report.balanceFocus} />
                    </p>
                  </div>
                </div>

                {/* Payments Received */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      <FiDollarSign className="text-green-600" /> Payments Received
                    </h3>
                    <span className="text-xs text-gray-600">
                      Total uploaded: <strong className="text-green-700">{fmtMoney(totalUploaded)}</strong>
                      {' • '}{report.payments.length} payment{report.payments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {report.payments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No payments have been recorded for this student yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.payments.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                              <td className="px-3 py-2 text-gray-700">{fmtDate(p.date)}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{fmtTime(p.date)}</td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                                  {p.method || '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-green-700 font-bold">
                                {fmtMoney(p.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="4" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">
                              Total Uploaded
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">
                              {fmtMoney(totalUploaded)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Term Breakdown */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-bold text-sm text-gray-800">Term Breakdown — Last 5 Terms</h3>
                    <span className="text-xs text-gray-500">Newest first · viewed year highlighted</span>
                  </div>
                  {report.rows.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No terms with a fee set yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Paid (this term)</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cumulative Paid</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Paid</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.rows.map((row, i) => (
                            <tr
                              key={`${row.year}-${row.term}-${i}`}
                              className={`hover:bg-gray-50 ${row.year === viewYear ? 'bg-blue-50/60' : ''}`}
                            >
                              <td className="px-3 py-2 font-medium">{row.term}</td>
                              <td className="px-3 py-2 text-gray-600">{row.year}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{fmtMoney(row.expected)}</td>
                              <td className="px-3 py-2 text-right text-green-600 font-bold">{fmtMoney(row.amountPaidThisTerm)}</td>
                              <td className="px-3 py-2 text-right text-blue-600">{fmtMoney(row.cumulativePaid)}</td>
                              <td className="px-3 py-2">{row.method}</td>
                              <td className="px-3 py-2 text-gray-500">{fmtDate(row.date)}</td>
                              <td className="px-3 py-2 text-center">
                                {row.cleared ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-semibold">
                                    <FiCheckCircle className="w-3 h-3" /> Cleared
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-semibold">
                                    <FiAlertCircle className="w-3 h-3" /> {fmtMoney(row.outstanding)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t flex justify-end">
                <button onClick={() => setShowViewModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {selectedStudent && (() => {
              const fee = getStudentFee(selectedStudent._id);
              const docs = studentPoolMap[selectedStudent._id] || (fee ? [fee] : []);
              const report = buildFeeReport(docs, selectedYear);
              return (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="font-semibold">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-500">Adm: {selectedStudent.admNo} | Class: {selectedStudent.class}</p>
                  <div className="mt-2 text-sm">
                    <p>Total Fee: <span className="font-bold">{fmtMoney(report.totalFeeFocus)}</span></p>
                    <p>Paid: <span className="font-bold text-green-600">{fmtMoney(report.paidFocus)}</span></p>
                    <p>Balance: <span className="font-bold"><BalanceDisplay value={report.balanceFocus} /></span></p>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Amount (KSh) *</label>
                  <input
                    type="number" min="1" step="1" required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Extra amount is automatically carried over to the next unpaid term, including future years.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Term *</label>
                  <select
                    required
                    value={paymentForm.term}
                    onChange={(e) => setPaymentForm({ ...paymentForm, term: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Term</option>
                    {TERMS.map(term => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Enter receipt number"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Notes</label>
                  <textarea
                    rows="2"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Add notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" /> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASS FEE MODAL */}
      {showClassFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingClassFeeId ? 'Edit Class Fee' : 'Set Class Fee Structure'}
              </h2>
              <button
                onClick={() => { setShowClassFeeModal(false); setEditingClassFeeId(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleClassFeeSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Class *</label>
                  <select
                    required
                    value={classFeeForm.class}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, class: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    disabled={!!editingClassFeeId}
                  >
                    <option value="">Select Class</option>
                    {schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Year</label>
                  <select
                    value={classFeeForm.year}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, year: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    disabled={!!editingClassFeeId}
                  >
                    {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>

                {['term1', 'term2', 'term3'].map((key, i) => (
                  <div key={key}>
                    <label className="block text-gray-700 font-medium mb-2">Term {i + 1} Fee (KSh)</label>
                    <input
                      type="number" min="0" step="1"
                      value={classFeeForm[key]}
                      onChange={(e) => setClassFeeForm({ ...classFeeForm, [key]: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder={`Enter Term ${i + 1} fee`}
                    />
                  </div>
                ))}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                  <FiInfo className="inline mr-1" />
                  Students who joined mid-year (Term 2 or Term 3) will not be charged for terms before they joined.
                  The system uses each student's registration date to determine their starting term.
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowClassFeeModal(false); setEditingClassFeeId(null); }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" /> {editingClassFeeId ? 'Update' : 'Set'} Class Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    blue: 'text-blue-500', green: 'text-green-500',
    red: 'text-red-500', purple: 'text-purple-500',
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        {Icon && <Icon className={`w-8 h-8 ${colors[color]} opacity-50`} />}
      </div>
    </div>
  );
};

export default FeeManagement;