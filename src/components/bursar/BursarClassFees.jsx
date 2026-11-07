// src/components/bursar/BursarClassFees.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiEdit2, 
  FiSave, 
  FiX, 
  FiBookOpen, 
  FiCalendar,
  FiPlus,
  FiDollarSign
} from 'react-icons/fi';

const fmtMoney = (v) => `KSh ${Number(v || 0).toLocaleString()}`;

// Standard CBE Class Order for sorting
const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

const classOrder = (name) => {
  const i = CLASS_ORDER.indexOf(name);
  return i === -1 ? 999 : i;
};

const BursarClassFees = () => {
  const currentYear = new Date().getFullYear();
  // Generate years: Current - 2 up to Current + 1
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({ 
    id: null, 
    class: '', 
    year: currentYear,
    term1: '', 
    term2: '', 
    term3: '' 
  });

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch school classes
      const schoolRes = await api.get('/school/settings');
      if (schoolRes.data?.success) {
        const activeClasses = (schoolRes.data.data.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name)
          .sort((a, b) => classOrder(a) - classOrder(b));
        setSchoolClasses(activeClasses);
      }

      // 2. Fetch class fees for the selected year
      const feesRes = await api.get(`/fees/class-fee?year=${selectedYear}`);
      if (feesRes.data?.success) {
        setFees(feesRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
    // eslint-disable-next-line
  }, [selectedYear]);

  // Map fees to classes for easy rendering
  const feeMap = useMemo(() => {
    const map = {};
    fees.forEach(f => { map[f.class] = f; });
    return map;
  }, [fees]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpenModal = (className, existingFee) => {
    if (existingFee) {
      setEditForm({
        id: existingFee._id,
        class: className,
        year: selectedYear,
        term1: existingFee.term1 || '',
        term2: existingFee.term2 || '',
        term3: existingFee.term3 || ''
      });
    } else {
      setEditForm({
        id: null,
        class: className,
        year: selectedYear,
        term1: '',
        term2: '',
        term3: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!editForm.term1 && !editForm.term2 && !editForm.term3) {
      return toast.error('Please enter at least one term fee');
    }

    const payload = {
      class: editForm.class,
      year: selectedYear,
      term1: parseFloat(editForm.term1) || 0,
      term2: parseFloat(editForm.term2) || 0,
      term3: parseFloat(editForm.term3) || 0,
    };

    try {
      if (editForm.id) {
        await api.put(`/fees/class-fee/${editForm.id}`, payload);
        toast.success('Fee structure updated');
      } else {
        await api.post('/fees/class-fee', payload);
        toast.success('Fee structure created and applied to students');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiBookOpen className="text-blue-600" /> Class Fee Structures
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage termly fee structures for all active classes.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <FiCalendar className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Select Year:</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-white border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-bold outline-none cursor-pointer"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>
                {y} {y === currentYear ? '(Current)' : y === currentYear + 1 ? '(Next Year)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : schoolClasses.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No active classes found. Please configure classes in School Settings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Class Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Term 1</th>
                  <th className="px-6 py-4 font-semibold text-right">Term 2</th>
                  <th className="px-6 py-4 font-semibold text-right">Term 3</th>
                  <th className="px-6 py-4 font-semibold text-right bg-blue-50/50">Total Annual</th>
                  <th className="px-6 py-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schoolClasses.map(className => {
                  const fee = feeMap[className];
                  const total = fee ? (fee.term1 || 0) + (fee.term2 || 0) + (fee.term3 || 0) : 0;
                  
                  return (
                    <tr key={className} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">
                        {className}
                      </td>
                      
                      {fee ? (
                        <>
                          <td className="px-6 py-4 text-right text-gray-700">{fmtMoney(fee.term1)}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{fmtMoney(fee.term2)}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{fmtMoney(fee.term3)}</td>
                          <td className="px-6 py-4 text-right font-bold text-blue-700 bg-blue-50/50">
                            {fmtMoney(total)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-right text-gray-400 italic">Not set</td>
                          <td className="px-6 py-4 text-right text-gray-400 italic">Not set</td>
                          <td className="px-6 py-4 text-right text-gray-400 italic">Not set</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-400 bg-gray-50">-</td>
                        </>
                      )}

                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenModal(className, fee)} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            fee 
                              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                              : 'text-white bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {fee ? <><FiEdit2 className="w-3.5 h-3.5" /> Edit</> : <><FiPlus className="w-3.5 h-3.5" /> Set Fee</>}
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

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex gap-3">
        <FiDollarSign className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Note:</strong> Updating a fee structure applies it to all active students in that class. 
          When setting fees for next year (e.g., {currentYear + 1}), you can do so during Term 3 of the current year to prepare for the upcoming academic year.
        </p>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            
            {/* Modal Header */}
            <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h2 className="text-lg font-bold">{editForm.id ? 'Edit' : 'Set'} Class Fee</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editForm.class} • {selectedYear}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg"
              >
                <FiX className="w-5 h-5"/>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Name</label>
                <input 
                  type="text" 
                  disabled 
                  value={editForm.class} 
                  className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 font-bold cursor-not-allowed" 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['term1', 'term2', 'term3'].map((t, i) => (
                  <div key={t}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                      Term {i+1}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs font-bold">KSh</span>
                      <input 
                        type="number" 
                        min="0"
                        step="1"
                        value={editForm[t]} 
                        onChange={e => setEditForm({...editForm, [t]: e.target.value})} 
                        className="w-full pl-9 pr-2 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Total Annual Fee:</span>
                <span className="text-lg font-bold text-blue-700">
                  {fmtMoney(
                    (parseFloat(editForm.term1) || 0) + 
                    (parseFloat(editForm.term2) || 0) + 
                    (parseFloat(editForm.term3) || 0)
                  )}
                </span>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <FiSave /> Save Fee Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BursarClassFees;