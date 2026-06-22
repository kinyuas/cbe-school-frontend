// src/components/admin/FeeManagement.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { 
  FiDollarSign, 
  FiPlus, 
  FiSearch, 
  FiEdit2, 
  FiTrash2, 
  FiSave, 
  FiX,
  FiUsers,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
  FiPrinter,
  FiDownload,
  FiCalendar,
  FiBookOpen,
  FiCheckCircle,
  FiAlertCircle,
  FiClock
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const FeeManagement = () => {
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [feeStats, setFeeStats] = useState(null);
  const [feeMap, setFeeMap] = useState({});

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: '',
    term: '',
    receiptNumber: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Class fee form state
  const [classFeeForm, setClassFeeForm] = useState({
    class: '',
    year: new Date().getFullYear(),
    term1: '',
    term2: '',
    term3: ''
  });

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const years = [2023, 2024, 2025, 2026, 2027];
  const paymentMethods = ['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other'];

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedClass]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading fee management data...');
      
      // Load school settings to get classes
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success) {
        const school = schoolRes.data.data;
        const classes = school.classes || [];
        setSchoolClasses(classes.filter(c => c.isActive !== false).map(c => c.name));
        console.log('School classes loaded:', classes);
      }

      // Load all students
      const studentsRes = await api.get('/pupils');
      if (studentsRes.data?.success) {
        const studentsData = studentsRes.data.data || [];
        setStudents(studentsData);
        console.log(`Loaded ${studentsData.length} students`);
      }

      // Load fees with filters
      const feesRes = await api.get('/fees', { 
        params: { 
          year: selectedYear, 
          class: selectedClass || undefined 
        }
      });
      
      let feesData = [];
      if (feesRes.data?.success) {
        feesData = feesRes.data.data || [];
        setFees(feesData);
        console.log(`Loaded ${feesData.length} fee records`);
        
        // Create a map for quick lookup
        const feeMapData = {};
        feesData.forEach(fee => {
          const studentId = fee.studentId?._id || fee.studentId;
          if (studentId) {
            feeMapData[studentId] = fee;
          }
        });
        setFeeMap(feeMapData);
        console.log('Fee map created:', Object.keys(feeMapData).length);
      }

      // Load fee statistics
      const statsRes = await api.get('/fees/stats', { 
        params: { year: selectedYear }
      });
      if (statsRes.data?.success) {
        setFeeStats(statsRes.data.data);
        console.log('Fee stats loaded:', statsRes.data.data);
      }

    } catch (error) {
      console.error('Error loading fee data:', error);
      toast.error('Failed to load fee data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentForm.studentId) {
      toast.error('Please select a student');
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!paymentForm.term) {
      toast.error('Please select a term');
      return;
    }

    try {
      const response = await api.post('/fees/payment', {
        studentId: paymentForm.studentId,
        amount: parseFloat(paymentForm.amount),
        term: paymentForm.term,
        receiptNumber: paymentForm.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowPaymentModal(false);
        setPaymentForm({
          studentId: '',
          amount: '',
          term: '',
          receiptNumber: '',
          paymentMethod: 'Cash',
          notes: ''
        });
        loadData();
      } else {
        toast.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClassFeeSubmit = async (e) => {
    e.preventDefault();
    
    if (!classFeeForm.class) {
      toast.error('Please select a class');
      return;
    }

    try {
      const response = await api.post('/fees/class-fee', {
        class: classFeeForm.class,
        year: classFeeForm.year,
        term1: parseFloat(classFeeForm.term1) || 0,
        term2: parseFloat(classFeeForm.term2) || 0,
        term3: parseFloat(classFeeForm.term3) || 0
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowClassFeeModal(false);
        setClassFeeForm({
          class: '',
          year: new Date().getFullYear(),
          term1: '',
          term2: '',
          term3: ''
        });
        loadData();
      } else {
        toast.error('Failed to set class fee');
      }
    } catch (error) {
      console.error('Error setting class fee:', error);
      toast.error('Failed to set class fee: ' + (error.response?.data?.message || error.message));
    }
  };

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentForm({
      ...paymentForm,
      studentId: student._id
    });
    setShowPaymentModal(true);
  };

  const getStudentFee = (studentId) => {
    return feeMap[studentId] || null;
  };

  const getTotalFee = (fee) => {
    if (!fee) return 0;
    return (fee.feeStructure?.term1 || 0) + 
           (fee.feeStructure?.term2 || 0) + 
           (fee.feeStructure?.term3 || 0);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return <FiCheckCircle className="w-4 h-4" />;
      case 'partial': return <FiClock className="w-4 h-4" />;
      case 'pending': return <FiAlertCircle className="w-4 h-4" />;
      case 'overdue': return <FiAlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.admNo?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class === selectedClass;
    return matchesSearch && matchesClass;
  });

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
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Students</p>
              <p className="text-2xl font-bold text-blue-600">{feeStats?.totalStudents || 0}</p>
            </div>
            <FiUsers className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">KSh {feeStats?.totalPaid?.toLocaleString() || 0}</p>
            </div>
            <FiTrendingUp className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Balance</p>
              <p className="text-2xl font-bold text-red-600">KSh {feeStats?.totalBalance?.toLocaleString() || 0}</p>
            </div>
            <FiDollarSign className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Collection Rate</p>
              <p className="text-2xl font-bold text-purple-600">{feeStats?.collectionRate || 0}%</p>
            </div>
            <FiFileText className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search student by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {schoolClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => setShowClassFeeModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiBookOpen className="w-4 h-4" /> Set Class Fee
            </button>
          </div>
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adm No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Term 1</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Term 2</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Term 3</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FiUsers className="w-12 h-12 text-gray-300 mb-2" />
                      <p>No students found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const fee = getStudentFee(student._id);
                  const totalFee = getTotalFee(fee);
                  return (
                    <tr key={student._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">{student.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{student.admNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{student.class || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {fee?.feeStructure?.term1 ? `KSh ${fee.feeStructure.term1.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {fee?.feeStructure?.term2 ? `KSh ${fee.feeStructure.term2.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {fee?.feeStructure?.term3 ? `KSh ${fee.feeStructure.term3.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {totalFee > 0 ? `KSh ${totalFee.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-bold">
                        {fee ? `KSh ${fee.totalPaid?.toLocaleString() || 0}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        {fee ? (
                          <span className={fee.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            KSh {fee.balance?.toLocaleString() || 0}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fee ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(fee.status)}`}>
                            {getStatusIcon(fee.status)}
                            {fee.status ? fee.status.charAt(0).toUpperCase() + fee.status.slice(1) : 'N/A'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not Set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openPaymentModal(student)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 flex items-center gap-1 mx-auto"
                        >
                          <FiPlus className="w-3 h-3" /> Pay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {selectedStudent && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="font-semibold">{selectedStudent.name}</p>
                <p className="text-sm text-gray-500">Adm: {selectedStudent.admNo} | Class: {selectedStudent.class}</p>
                {(() => {
                  const fee = getStudentFee(selectedStudent._id);
                  const totalFee = getTotalFee(fee);
                  return (
                    <div className="mt-2 text-sm">
                      <p>Total Fee: <span className="font-bold">KSh {totalFee.toLocaleString()}</span></p>
                      <p>Paid: <span className="font-bold text-green-600">KSh {fee?.totalPaid?.toLocaleString() || 0}</span></p>
                      <p>Balance: <span className={`font-bold ${fee?.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        KSh {fee?.balance?.toLocaleString() || 0}
                      </span></p>
                    </div>
                  );
                })()}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Amount (KSh) *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    step="1"
                    required
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Term *</label>
                  <select
                    value={paymentForm.term}
                    onChange={(e) => setPaymentForm({ ...paymentForm, term: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Term</option>
                    {terms.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter receipt number"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
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

      {/* Class Fee Modal */}
      {showClassFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Set Class Fee Structure</h2>
              <button onClick={() => setShowClassFeeModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleClassFeeSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Class *</label>
                  <select
                    value={classFeeForm.class}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, class: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {schoolClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Year</label>
                  <select
                    value={classFeeForm.year}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, year: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Term 1 Fee (KSh)</label>
                  <input
                    type="number"
                    value={classFeeForm.term1}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, term1: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                    placeholder="Enter Term 1 fee"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Term 2 Fee (KSh)</label>
                  <input
                    type="number"
                    value={classFeeForm.term2}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, term2: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                    placeholder="Enter Term 2 fee"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Term 3 Fee (KSh)</label>
                  <input
                    type="number"
                    value={classFeeForm.term3}
                    onChange={(e) => setClassFeeForm({ ...classFeeForm, term3: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                    placeholder="Enter Term 3 fee"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowClassFeeModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" /> Set Class Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FeeManagement;