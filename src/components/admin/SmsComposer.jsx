// src/components/admin/SmsComposer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiSend, FiUsers, FiDollarSign, FiInfo,
  FiAlertCircle, FiRefreshCw, FiBarChart2, FiCheckCircle,
} from 'react-icons/fi';

// ============================================================
// HELPERS
// ============================================================
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const CLASS_ORDER = [
  'Play Group', 'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];
const classOrder = (n) => {
  const i = CLASS_ORDER.indexOf(n);
  return i === -1 ? 999 : i;
};

const formatExamDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '';
  }
};

// ============================================================
// 🆕 SUBMIT PAYMENT MODAL
// ============================================================
const SubmitPaymentModal = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/sms/submit-payment', {
        amountKes: Number(amount),
        mpesaCode: code.trim()
      });
      toast.success(res.data.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h2 className="text-lg font-bold mb-2">Submit M-Pesa Payment</h2>
        <p className="text-xs text-gray-500 mb-4">
          Pay to Paybill <strong>542542</strong>, Account <strong>71184</strong>. Then enter the details below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount Paid (KES)</label>
            <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded-lg p-2" placeholder="e.g. 1200" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">M-Pesa Receipt Code</label>
            <input type="text" required value={code} onChange={e => setCode(e.target.value)} className="w-full border rounded-lg p-2 font-mono uppercase" placeholder="e.g. SJX1234XYZ" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// CREDIT / PAYMENT BANNER
// ============================================================
const CreditBanner = ({ accountInfo, onRefresh, onSubmitPaymentClick }) => {
  if (!accountInfo) return null;
  const sellPrice = accountInfo.sellPrice || 1.20;
  const paybill = accountInfo.provider?.paybill || '542542';
  const accountNumber = accountInfo.provider?.accountNumber || '71184';

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">SMS Credits Balance</p>
          <p className="text-2xl font-bold text-emerald-700">
            {accountInfo.creditBalance} SMS
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Sell price: <strong>KSH {sellPrice}</strong>/SMS · Provider: {accountInfo.provider?.name || 'Africa\'s Talking'}
          </p>
        </div>
        <div className="text-xs text-gray-600 space-y-1 md:text-right">
          <p className="font-semibold text-gray-800">Buy more SMS via M-Pesa</p>
          <p>Paybill: <strong className="text-emerald-700 text-sm">{paybill}</strong></p>
          {accountNumber && (
            <p>Account: <strong className="text-emerald-700 font-mono text-sm">{accountNumber}</strong></p>
          )}
          <p className="text-[10px] text-gray-400">→ Once paid, click the button below to submit your receipt.</p>
          <div className="flex flex-col md:flex-row items-center justify-end gap-2 mt-2">
            <button
              onClick={onSubmitPaymentClick}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition"
            >
              <FiCheckCircle /> Submit Payment Receipt
            </button>
            <button
              onClick={onRefresh}
              className="w-full md:w-auto text-blue-600 hover:underline flex items-center justify-center gap-1 text-[11px] py-1"
            >
              <FiRefreshCw className="w-3 h-3" /> Refresh balance
            </button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2 italic">
        After paying to Paybill {paybill} (Account {accountNumber}), submit your M-Pesa receipt code for the Super Admin to approve.
      </p>
    </div>
  );
};

// ============================================================
// RESULTS TAB
// ============================================================
const ResultsTab = ({ accountInfo, onAfterSend }) => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [sending, setSending] = useState(false);

  // Selection
  const [isWholeSchool, setIsWholeSchool] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedStream, setSelectedStream] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedExamNames, setSelectedExamNames] = useState([]);
  const [examWeights, setExamWeights] = useState({});

  const [estimate, setEstimate] = useState(null);

  // ---- Load classes + exams on mount ----
  useEffect(() => {
    (async () => {
      setLoadingFilters(true);
      try {
        const [schoolRes, examsRes] = await Promise.all([
          api.get('/school/settings'),
          api.get('/exams'),
        ]);

        if (schoolRes.data?.success) {
          const active = (schoolRes.data.data.classes || [])
            .filter((c) => c.isActive !== false)
            .map((c) => c.name)
            .sort((a, b) => classOrder(a) - classOrder(b));
          setClasses(active);
        }

        if (examsRes.data?.success) {
          setExams(examsRes.data.data || []);
        }
      } catch (e) {
        toast.error('Failed to load classes/exams');
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, []);

  // ---- Available exams filtered by term + year, sorted by date desc ----
  const availableExams = useMemo(() => {
    return exams
      .filter((e) => e.term === selectedTerm && Number(e.year) === Number(selectedYear))
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da; // newest first
      });
  }, [exams, selectedTerm, selectedYear]);

  // Clean up selected exams when term/year changes and exam is no longer valid
  useEffect(() => {
    const validNames = new Set(availableExams.map((e) => e.title));
    setSelectedExamNames((prev) => prev.filter((n) => validNames.has(n)));
  }, [availableExams]);

  // Default weights: equal, when 2+ exams selected and weight missing
  useEffect(() => {
    if (selectedExamNames.length < 2) {
      setExamWeights({});
      return;
    }
    setExamWeights((prev) => {
      const equal = +(1 / selectedExamNames.length).toFixed(4);
      const next = {};
      selectedExamNames.forEach((n) => {
        next[n] = prev[n] ?? equal;
      });
      return next;
    });
  }, [selectedExamNames.length]);

  // ---- Streams available for the selected classes ----
  const availableStreams = useMemo(() => {
    if (!classes.length) return [];
    return []; // populated below if class streams exist — placeholder
  }, [classes]);

  // ---- Cost estimate (debounced) ----
  useEffect(() => {
    if (!selectedExamNames.length) { setEstimate(null); return; }
    if (!isWholeSchool && selectedClasses.length === 0) { setEstimate(null); return; }

    const t = setTimeout(async () => {
      setLoadingEstimate(true);
      try {
        const payload = {
          classNames: isWholeSchool ? ['__ALL__'] : selectedClasses,
          stream: selectedStream === 'all' ? undefined : selectedStream,
          examNames: selectedExamNames,
          examWeights: selectedExamNames.length > 1 ? examWeights : undefined,
          term: selectedTerm,
          year: selectedYear,
        };
        const res = await api.post('/sms/estimate-results', payload);
        if (res.data?.success) setEstimate(res.data.data);
      } catch (e) {
        setEstimate(null);
      } finally {
        setLoadingEstimate(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [isWholeSchool, selectedClasses, selectedStream, selectedTerm, selectedYear, selectedExamNames, examWeights]);

  const toggleClass = (name) => {
    setSelectedClasses((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const toggleExam = (title) => {
    setSelectedExamNames((prev) =>
      prev.includes(title) ? prev.filter((x) => x !== title) : [...prev, title]
    );
  };

  const selectAllExams = () => {
    setSelectedExamNames(
      selectedExamNames.length === availableExams.length
        ? []
        : availableExams.map((e) => e.title)
    );
  };

  const setWeight = (examName, value) => {
    setExamWeights((prev) => ({ ...prev, [examName]: value }));
  };

  const handleSend = async () => {
    if (!selectedExamNames.length) return toast.error('Select at least one exam');
    if (!isWholeSchool && selectedClasses.length === 0) return toast.error('Select at least one class or enable Whole School');
    if (!estimate) return toast.error('Wait for the cost estimate');

    if (!window.confirm(
      `Send results SMS to ${estimate.recipients} parent(s)?\n` +
      `Total SMS parts: ${estimate.totalSmsParts}\n` +
      `Cost: KSH ${estimate.totalCost.toFixed(2)}`
    )) return;

    setSending(true);
    try {
      const payload = {
        classNames: isWholeSchool ? ['__ALL__'] : selectedClasses,
        stream: selectedStream === 'all' ? undefined : selectedStream,
        examNames: selectedExamNames,
        examWeights: selectedExamNames.length > 1 ? examWeights : undefined,
        term: selectedTerm,
        year: selectedYear,
        mode: 'per-pupil',
      };
      const res = await api.post('/sms/send-results', payload);

      if (res.data?.success) {
        toast.success(res.data.message);
        onAfterSend?.();
        setEstimate(null);
        setSelectedExamNames([]);
        setSelectedClasses([]);
        setIsWholeSchool(false);
      } else {
        toast.error(res.data?.message || 'Send failed');
      }
    } catch (e) {
      if (e.response?.data?.code === 'INSUFFICIENT_CREDIT') {
        toast.error(e.response.data.message, { duration: 7000 });
      } else {
        toast.error(e.response?.data?.message || 'Send failed');
      }
    } finally {
      setSending(false);
    }
  };

  const creditBalance = accountInfo?.creditBalance ?? 0;
  const canAfford = estimate ? creditBalance >= estimate.totalSmsParts : false;
  const isCombined = selectedExamNames.length > 1;
  const totalWeight = isCombined
    ? Object.values(examWeights).reduce((s, w) => s + (parseFloat(w) || 0), 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Scope: whole school / classes */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold text-gray-600 uppercase">Recipients Scope</p>
          <label className="flex items-center gap-2 text-sm font-semibold text-blue-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isWholeSchool}
              onChange={(e) => setIsWholeSchool(e.target.checked)}
              className="w-4 h-4"
            />
            Whole School
          </label>
        </div>

        {!isWholeSchool && (
          <>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[11px] text-gray-500">
                Select classes ({selectedClasses.length} selected)
              </p>
              <button
                onClick={() => setSelectedClasses(
                  selectedClasses.length === classes.length ? [] : [...classes]
                )}
                className="text-[11px] text-blue-600 hover:underline"
              >
                {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 grid grid-cols-2 md:grid-cols-3 gap-1">
              {loadingFilters ? (
                <p className="text-xs text-gray-400 col-span-3 py-2">Loading classes...</p>
              ) : classes.length === 0 ? (
                <p className="text-xs text-gray-400 col-span-3 py-2">No active classes</p>
              ) : classes.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-xs px-1 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(c)}
                    onChange={() => toggleClass(c)}
                    className="w-3.5 h-3.5"
                  />
                  {c}
                </label>
              ))}
            </div>
          </>
        )}

        {isWholeSchool && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
            <FiInfo className="inline mr-1" />
            Results will be sent to <strong>all active pupils</strong> across all classes.
          </div>
        )}
      </div>

      {/* Term + Year + Stream */}
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y} {y === CURRENT_YEAR ? '(Current)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Stream (optional)</label>
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="all">All Streams</option>
            {availableStreams.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Exams picker */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            Exams ({selectedExamNames.length} selected)
            {isCombined && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">COMBINED</span>}
          </p>
          <button
            onClick={selectAllExams}
            className="text-[11px] text-blue-600 hover:underline"
          >
            {selectedExamNames.length === availableExams.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
          {loadingFilters ? (
            <p className="text-xs text-gray-400 text-center py-3">Loading exams...</p>
          ) : availableExams.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              No exams found for {selectedTerm} {selectedYear}
            </p>
          ) : availableExams.map((exam) => (
            <label
              key={exam._id || exam.title}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedExamNames.includes(exam.title)}
                onChange={() => toggleExam(exam.title)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-1">
                  {exam.title}
                  {exam.type && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {exam.type}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500">
                  {formatExamDate(exam.date)}
                  {exam.term ? ` · ${exam.term}` : ''}
                  {exam.year ? ` · ${exam.year}` : ''}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Exam weights (only when 2+ selected) */}
      {isCombined && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-purple-800 uppercase">
              Exam Weights (total = {totalWeight.toFixed(2)})
            </p>
            <button
              onClick={() => {
                const equal = +(1 / selectedExamNames.length).toFixed(4);
                const next = {};
                selectedExamNames.forEach((n) => { next[n] = equal; });
                setExamWeights(next);
              }}
              className="text-[11px] text-purple-700 hover:underline"
            >
              Reset to equal
            </button>
          </div>
          <div className="space-y-1">
            {selectedExamNames.map((name) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-purple-900">{name}</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={examWeights[name] ?? ''}
                  onChange={(e) => setWeight(name, parseFloat(e.target.value) || 0)}
                  className="w-20 border rounded px-2 py-1 text-xs"
                />
              </div>
            ))}
          </div>
          {Math.abs(totalWeight - 1) > 0.01 && (
            <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
              <FiAlertCircle /> Weights should sum to 1.0 (currently {totalWeight.toFixed(2)})
            </p>
          )}
        </div>
      )}

      {/* Live estimate */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
        <p className="flex items-center gap-1 font-bold text-yellow-800 mb-1">
          <FiDollarSign /> Cost Estimate
        </p>
        {loadingEstimate ? (
          <p className="text-xs text-yellow-700 flex items-center gap-1">
            <FiRefreshCw className="animate-spin w-3 h-3" /> Computing...
          </p>
        ) : !estimate ? (
          <p className="text-xs text-yellow-700">
            Select {isWholeSchool ? 'exams' : 'classes and exams'} to see cost
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs text-yellow-900">
              <div>Recipients: <strong>{estimate.recipients}</strong></div>
              <div>Total SMS parts: <strong>{estimate.totalSmsParts}</strong></div>
              <div>Parts/SMS: <strong>{estimate.partsPerSms}</strong></div>
              <div>Total cost: <strong>KSH {estimate.totalCost.toFixed(2)}</strong></div>
              {estimate.pupilsWithoutResults > 0 && (
                <div className="col-span-2 text-[10px] text-gray-500">
                  {estimate.pupilsWithoutResults} pupil(s) in scope have no results and will be skipped
                </div>
              )}
            </div>

            {!canAfford && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-semibold">
                <FiAlertCircle /> Insufficient credits. Need {estimate.totalSmsParts}, have {creditBalance}.
              </p>
            )}

            {estimate.sampleMessage && (
              <div className="mt-3 bg-white border border-yellow-100 rounded p-2 text-[11px] text-gray-700 break-words font-mono">
                <strong className="block text-[10px] text-gray-500 not-italic font-sans mb-1">Sample message preview:</strong>
                {estimate.sampleMessage}
              </div>
            )}
          </>
        )}
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={
          sending ||
          !estimate ||
          estimate.recipients === 0 ||
          !canAfford ||
          (!isWholeSchool && selectedClasses.length === 0) ||
          selectedExamNames.length === 0
        }
        className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {sending ? (
          <><FiRefreshCw className="animate-spin" /> Sending Results SMS...</>
        ) : (
          <><FiBarChart2 /> Send Results SMS</>
        )}
      </button>
    </div>
  );
};

// ============================================================
// COMMON MESSAGE (BROADCAST) TAB
// ============================================================
const ComposerTab = ({ accountInfo, onAfterSend }) => {
  const [recipientType, setRecipientType] = useState('parent');
  const [message, setMessage] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!message.trim()) { setEstimate(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const payload = { mode: 'broadcast', recipientType, message };
        const res = await api.post('/sms/estimate-cost', payload);
        if (res.data?.success) setEstimate(res.data.data);
      } catch (e) {
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [recipientType, message]);

  const handleSend = async () => {
    if (!message.trim()) return toast.error('Enter a message');
    if (!estimate) return toast.error('Wait for cost estimate');

    if (!window.confirm(`Send ${estimate.totalSmsParts} SMS (≈ KSH ${estimate.totalCost.toFixed(2)})?`)) {
      return;
    }

    setSending(true);
    try {
      const payload = { mode: 'broadcast', recipientType, message };
      const res = await api.post('/sms/send', payload);
      
      if (res.data?.success) {
        toast.success(res.data.message);
        setMessage('');
        setEstimate(null);
        onAfterSend?.();
      } else {
        toast.error(res.data?.message || 'Send failed');
      }
    } catch (e) {
      if (e.response?.data?.code === 'INSUFFICIENT_CREDIT') {
        toast.error(e.response.data.message, { duration: 6000 });
      } else {
        toast.error(e.response?.data?.message || 'Send failed');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recipient type */}
      <div className="bg-white border rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Send To</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'parent', label: 'Parents' },
            { key: 'teacher', label: 'Teachers' },
            { key: 'both', label: 'Both' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRecipientType(opt.key)}
              className={`py-2 rounded-lg border-2 text-sm font-semibold ${
                recipientType === opt.key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message body */}
      <div className="bg-white border rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
          Message (School name will be added automatically)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g., School closes at 12:00 noon tomorrow for a staff meeting."
          className="w-full border rounded-lg px-3 py-2 text-sm"
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
          <span>{message.length}/500 chars · SMS parts: {estimate?.partsPerSms || Math.max(1, Math.ceil((message.length + 15) / 160))}</span>
          {loading && <FiRefreshCw className="animate-spin w-3 h-3" />}
        </div>
      </div>

      {/* Estimate */}
      {estimate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <p className="flex items-center gap-1 font-bold text-yellow-800 mb-1">
            <FiDollarSign /> Cost Estimate
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-yellow-900">
            <div>Recipients: <strong>{estimate.recipients}</strong></div>
            <div>Parts/SMS: <strong>{estimate.partsPerSms || estimate.parts || 1}</strong></div>
            <div>Total SMS: <strong>{estimate.totalSmsParts}</strong></div>
            <div>Total Cost: <strong>KSH {estimate.totalCost.toFixed(2)}</strong></div>
          </div>
          {accountInfo && estimate.totalSmsParts > accountInfo.creditBalance && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <FiAlertCircle /> Insufficient credits. Buy more via M-Pesa first.
            </p>
          )}
        </div>
      )}

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={sending || !estimate || (accountInfo && estimate.totalSmsParts > accountInfo.creditBalance)}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {sending ? (
          <><FiRefreshCw className="animate-spin" /> Sending...</>
        ) : (
          <><FiSend /> Send SMS</>
        )}
      </button>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const SmsComposer = () => {
  const [activeTab, setActiveTab] = useState('composer'); // composer | results
  const [accountInfo, setAccountInfo] = useState(null);
  
  // 🆕 Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadAccountInfo = async () => {
    try {
      const res = await api.get('/sms/account-info');
      if (res.data?.success) setAccountInfo(res.data.data);
    } catch (e) {
      console.warn('Account info failed', e.message);
    }
  };

  useEffect(() => { loadAccountInfo(); }, []);

  const tabs = [
    { key: 'composer', label: 'Common Message (Broadcast)', icon: FiSend },
    { key: 'results', label: 'Results SMS', icon: FiBarChart2 },
  ];

  return (
    <div className="space-y-4">
      {/* Banner with new submit button */}
      <CreditBanner 
        accountInfo={accountInfo} 
        onRefresh={loadAccountInfo} 
        onSubmitPaymentClick={() => setShowPaymentModal(true)}
      />

      {/* Tabs */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex border-b">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-3 px-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
                  active
                    ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4">
          {activeTab === 'composer' && (
            <ComposerTab accountInfo={accountInfo} onAfterSend={loadAccountInfo} />
          )}
          {activeTab === 'results' && (
            <ResultsTab accountInfo={accountInfo} onAfterSend={loadAccountInfo} />
          )}
        </div>
      </div>

      {/* 🆕 Render Payment Modal */}
      {showPaymentModal && (
        <SubmitPaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={loadAccountInfo}
        />
      )}
    </div>
  );
};

export default SmsComposer;