// src/components/admin/ReportCard.jsx
import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPrinter } from 'react-icons/fi';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReportCard = ({
  student,
  schoolInfo,
  selectedClass,
  selectedStream,
  selectedTerm,
  selectedYear,
  allSubjects,
  subjectAverages,
  competencyLevels,
  getGrade,
  getCompetencyLevel,
  getRecommendation,
  onClose,
  combinedExamResults = null,
  examNames = [],
  feeSummary = null,
  showStreamColumn = false,
}) => {
  const printRef = useRef();
  const [termHistory, setTermHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTermHistory();
    // eslint-disable-next-line
  }, [student]);

  const loadTermHistory = async () => {
    setLoading(true);
    try {
      const historyResponse = await api.get(`/results/student/${student.id}/history`);
      if (historyResponse.data?.success) {
        setTermHistory(historyResponse.data.data || []);
      } else {
        setTermHistory([]);
      }
    } catch (error) {
      console.error('Error loading term history:', error);
      setTermHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Report Card - ${student.name}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; }
            @media print {
              .no-print { display: none; }
              .page-break { page-break-after: always; }
            }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin: 0; }
            .header h2 { font-size: 18px; margin: 5px 0; }
            .header p { font-size: 14px; margin: 3px 0; }
            .divider { border-top: 2px solid #333; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th { background: #f0f0f0; font-weight: bold; text-align: center; border: 1px solid #333; padding: 5px; }
            td { border: 1px solid #333; padding: 5px; text-align: center; }
            .text-left { text-align: left; }
            .footer { margin-top: 30px; font-size: 12px; }
            .recommendation { margin-top: 20px; padding: 10px; border: 1px solid #ddd; background: #f9f9f9; }
            .competency-table { margin-top: 15px; }
            .competency-table td { padding: 4px 8px; }
            .fee-table { margin-top: 15px; }
            .fee-table td { padding: 4px 8px; }
            .fee-table .label { text-align: left; font-weight: bold; }
            .fee-table .amount { text-align: right; }
            .exam-section { margin-top: 20px; }
            .exam-section h4 { margin: 10px 0 5px 0; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            .chart-container { width: 100%; height: 200px; margin: 20px 0; }
            .term-history { margin-top: 20px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); }
          <\/script>
        </body>
      </html>
    `);
  };

  const totalMarks = allSubjects.reduce((sum, subject) => sum + (student[subject] || 0), 0);
  const averageScore = allSubjects.length > 0 ? totalMarks / allSubjects.length : 0;
  const grade = getGrade(averageScore);
  const competency = getCompetencyLevel(averageScore);
  const recommendation = getRecommendation(averageScore);

  const chartData = termHistory.map(term => ({
    term: term.termName || term.term,
    average: term.averageScore || 0,
    grade: term.grade || 'N/A'
  }));

  const fee = feeSummary || {
    totalFee: 0,
    paid: 0,
    balance: 0,
    isFullyPaid: false,
    hasCredit: false,
    credit: 0,
    termBreakdown: [],
  };

  const balanceIsCredit = fee.balance < 0;
  const balanceIsZero = fee.balance === 0;

  // Are we in combined mode with multiple exams?
  const isCombinedMode = combinedExamResults && examNames.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print">
          <h2 className="text-lg font-bold">Student Report Card</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
              <FiPrinter className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* School Header */}
              <div className="header text-center">
                <h1 className="text-2xl font-bold">{schoolInfo.name || 'School Name'}</h1>
                <p>{schoolInfo.address || ''}</p>
                <p>{schoolInfo.phone || ''} | {schoolInfo.email || ''}</p>
                <p className="text-sm mt-1"><em>{schoolInfo.motto || 'Quality Education for All'}</em></p>
                <div className="divider"></div>
                <h2 className="text-xl font-bold">STUDENT REPORT CARD</h2>
                <p>{selectedTerm} {selectedYear} | {selectedClass}{showStreamColumn && student.stream ? ` ${student.stream}` : ''}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-3 gap-4 mt-4 border p-3 rounded">
                <div><strong>Name:</strong> {student.name}</div>
                <div><strong>Admission No:</strong> {student.admNo}</div>
                {showStreamColumn && (
                  <div><strong>Stream:</strong> {student.stream || 'N/A'}</div>
                )}
                <div><strong>Class:</strong> {selectedClass}</div>
                <div><strong>Term:</strong> {selectedTerm}</div>
                <div><strong>Year:</strong> {selectedYear}</div>
              </div>

              {/* ============================================================ */}
              {/* COMBINED EXAM RESULTS — one table, exam column groups        */}
              {/* ============================================================ */}
              {isCombinedMode && (
                <div className="exam-section mt-6">
                  <h3 className="font-bold text-lg">Exam Results Breakdown</h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-2 text-left align-bottom">
                            Subject
                          </th>
                          {examNames.map(examName => (
                            <th
                              key={examName}
                              colSpan={3}
                              className="border border-gray-400 bg-blue-100 px-2 py-2 text-center font-bold"
                            >
                              {examName}
                            </th>
                          ))}
                          <th colSpan={3} className="border border-gray-400 bg-green-100 px-2 py-2 text-center font-bold">
                            Weighted Final
                          </th>
                        </tr>
                        <tr>
                          {examNames.map(examName => (
                            <React.Fragment key={`${examName}-sub`}>
                              <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Score</th>
                              <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Grade</th>
                              <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Comp</th>
                            </React.Fragment>
                          ))}
                          <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Score</th>
                          <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Grade</th>
                          <th className="border border-gray-400 bg-gray-50 px-1 py-1 text-center text-[10px]">Comp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubjects.map(subject => {
                          const finalMarks = student[subject] || 0;
                          const finalGrade = getGrade(finalMarks);
                          const finalComp = getCompetencyLevel(finalMarks);
                          return (
                            <tr key={subject}>
                              <td className="border border-gray-400 px-2 py-1 text-left font-medium">{subject}</td>
                              {examNames.map(examName => {
                                const marks = combinedExamResults[examName]?.[student.id]?.[subject];
                                const hasMarks = marks !== undefined && marks !== null && marks !== 0;
                                const subjGrade = hasMarks ? getGrade(marks) : '-';
                                const subjComp = hasMarks ? getCompetencyLevel(marks) : null;
                                return (
                                  <React.Fragment key={`${examName}-${subject}`}>
                                    <td className="border border-gray-400 px-1 py-1 text-center">{hasMarks ? marks : '-'}</td>
                                    <td className="border border-gray-400 px-1 py-1 text-center font-semibold">{subjGrade}</td>
                                    <td
                                      className="border border-gray-400 px-1 py-1 text-center font-semibold"
                                      style={{ color: subjComp?.color || '#333' }}
                                    >
                                      {subjComp?.level || '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-bold">{finalMarks}</td>
                              <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold">{finalGrade}</td>
                              <td
                                className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold"
                                style={{ color: finalComp.color }}
                              >
                                {finalComp.level}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100">
                          <td className="border border-gray-400 px-2 py-1 text-left font-bold">Total</td>
                          {examNames.map(examName => {
                            const subjectTotals = allSubjects
                              .map(s => combinedExamResults[examName]?.[student.id]?.[s])
                              .filter(m => m !== undefined && m !== null && m !== 0);
                            const examTotal = subjectTotals.reduce((a, b) => a + Number(b), 0);
                            return (
                              <React.Fragment key={`${examName}-total`}>
                                <td className="border border-gray-400 px-1 py-1 text-center font-bold">{examTotal || '-'}</td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-bold">{totalMarks}</td>
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50">-</td>
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50">-</td>
                        </tr>
                        <tr className="bg-gray-100">
                          <td className="border border-gray-400 px-2 py-1 text-left font-bold">Average</td>
                          {examNames.map(examName => {
                            const subjectMarks = allSubjects
                              .map(s => combinedExamResults[examName]?.[student.id]?.[s])
                              .filter(m => m !== undefined && m !== null && m !== 0);
                            const examAvg = subjectMarks.length > 0
                              ? subjectMarks.reduce((a, b) => a + Number(b), 0) / subjectMarks.length
                              : 0;
                            return (
                              <React.Fragment key={`${examName}-avg`}>
                                <td className="border border-gray-400 px-1 py-1 text-center font-bold">{examAvg ? examAvg.toFixed(1) : '-'}</td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-bold">{averageScore.toFixed(1)}%</td>
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold">{grade}</td>
                          <td
                            className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold"
                            style={{ color: competency.color }}
                          >
                            {competency.level}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SINGLE EXAM RESULTS — same column-grouped layout             */}
              {/* ============================================================ */}
              {!isCombinedMode && (
                <div className="exam-section mt-6">
                  <h3 className="font-bold text-lg">Exam Results</h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th
                            rowSpan={2}
                            className="border border-gray-400 bg-gray-100 px-2 py-2 text-left align-bottom"
                          >
                            Subject
                          </th>
                          <th colSpan={3} className="border border-gray-400 bg-blue-100 px-2 py-2 text-center font-bold">
                            Score Details
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Score</th>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Grade</th>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Competency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubjects.map(subject => {
                          const marks = student[subject] || 0;
                          const subjectGrade = getGrade(marks);
                          const subjectCompetency = getCompetencyLevel(marks);
                          return (
                            <tr key={subject}>
                              <td className="border border-gray-400 px-2 py-1 text-left font-medium">{subject}</td>
                              <td className="border border-gray-400 px-2 py-1 text-center">{marks}</td>
                              <td className="border border-gray-400 px-2 py-1 text-center font-semibold">{subjectGrade}</td>
                              <td
                                className="border border-gray-400 px-2 py-1 text-center font-semibold"
                                style={{ color: subjectCompetency.color }}
                              >
                                {subjectCompetency.level}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100">
                          <td className="border border-gray-400 px-2 py-1 text-left font-bold">Total</td>
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50 font-bold">{totalMarks}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50">-</td>
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50">-</td>
                        </tr>
                        <tr className="bg-gray-100">
                          <td className="border border-gray-400 px-2 py-1 text-left font-bold">Average</td>
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50 font-bold">{averageScore.toFixed(1)}%</td>
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50 font-semibold">{grade}</td>
                          <td
                            className="border border-gray-400 px-2 py-1 text-center bg-green-50 font-semibold"
                            style={{ color: competency.color }}
                          >
                            {competency.level}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Competency Level Key */}
              <div className="mt-3">
                <h4 className="font-semibold text-sm">Competency Level Key:</h4>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {competencyLevels.map(level => (
                    <div key={level.level} className="text-center text-xs border rounded p-1">
                      <span style={{ color: level.color, fontWeight: 'bold' }}>{level.level}</span>
                      <p className="text-[10px] text-gray-500">{level.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Term History Chart */}
              {termHistory.length > 0 && (
                <div className="term-history">
                  <h4 className="font-bold text-sm">Performance History (Last 4 Terms)</h4>
                  <div className="chart-container" style={{ height: '200px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.slice(-4)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="term" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#4CAF50" name="Average Score (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="recommendation mt-4">
                <h4 className="font-bold">Recommendation</h4>
                <p className="text-sm mt-1">{recommendation}</p>
              </div>

              {/* FEE STATEMENT */}
              <div className="mt-6">
                <h4 className="font-bold">Fee Statement — {selectedYear}</h4>

                {fee.totalFee === 0 && fee.paid === 0 ? (
                  <p className="text-xs text-gray-500 mt-1">* No fee records found for this student.</p>
                ) : (
                  <>
                    <table className="fee-table">
                      <tbody>
                        <tr>
                          <td className="label">Total Fee ({selectedYear})</td>
                          <td className="amount">KSh {fee.totalFee.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="label">Amount Paid</td>
                          <td className="amount">KSh {fee.paid.toLocaleString()}</td>
                        </tr>
                        <tr className="total-row">
                          <td className="label">
                            {balanceIsCredit ? 'Credit (Overpaid)' : 'Balance'}
                          </td>
                          <td
                            className="amount"
                            style={{
                              color: balanceIsCredit ? 'green' : (balanceIsZero ? 'green' : 'red'),
                              fontWeight: 'bold',
                            }}
                          >
                            {balanceIsCredit
                              ? `-KSh ${Math.abs(fee.balance).toLocaleString()}`
                              : `KSh ${fee.balance.toLocaleString()}`}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {fee.termBreakdown && fee.termBreakdown.length > 0 && (
                      <div className="mt-3">
                        <h5 className="font-semibold text-xs mb-1">Term-by-Term Status</h5>
                        <table className="fee-table">
                          <thead>
                            <tr>
                              <th className="text-left">Term</th>
                              <th>Expected</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.termBreakdown.map((t, i) => (
                              <tr key={i}>
                                <td className="text-left">{t.term}</td>
                                <td>KSh {t.expected.toLocaleString()}</td>
                                <td>
                                  {t.cleared ? (
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Cleared</span>
                                  ) : (
                                    <span style={{ color: 'red' }}>
                                      KSh {t.outstanding.toLocaleString()}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {fee.balance > 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        * Please clear the balance of KSh {fee.balance.toLocaleString()} to avoid penalties.
                      </p>
                    )}

                    {balanceIsCredit && (
                      <p className="text-xs text-green-600 mt-2">
                        * This student has a credit of KSh {Math.abs(fee.balance).toLocaleString()} that will be applied to future terms.
                      </p>
                    )}

                    {balanceIsZero && fee.totalFee > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        * Fees for {selectedYear} are fully cleared.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Signature Section */}
              <div className="footer mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 text-center">
                  <div>
                    <p className="text-sm">_____________________</p>
                    <p className="text-xs">Class Teacher</p>
                  </div>
                  <div>
                    <p className="text-sm">_____________________</p>
                    <p className="text-xs">Principal/Director</p>
                  </div>
                  <div>
                    <p className="text-sm">_____________________</p>
                    <p className="text-xs">Parent/Guardian</p>
                  </div>
                </div>
                <div className="text-center text-xs text-gray-500 mt-4">
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                  <p>This report card is computer generated and does not require a signature</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCard;