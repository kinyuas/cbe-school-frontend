// src/components/admin/ReportCard.jsx
import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPrinter, FiDownload, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
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
  examNames = []
}) => {
  const printRef = useRef();
  const [studentFees, setStudentFees] = useState({
    previousBalance: 0,
    currentTermFee: 0,
    totalDue: 0,
    paid: 0,
    balance: 0
  });
  const [termHistory, setTermHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [student]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Load student fees from database
      const feesResponse = await api.get(`/fees/student/${student.id}`);
      if (feesResponse.data?.success) {
        const fees = feesResponse.data.data || {};
        setStudentFees({
          previousBalance: fees.previousBalance || 0,
          currentTermFee: fees.currentTermFee || 0,
          totalDue: (fees.previousBalance || 0) + (fees.currentTermFee || 0),
          paid: fees.paid || 0,
          balance: ((fees.previousBalance || 0) + (fees.currentTermFee || 0)) - (fees.paid || 0)
        });
      }

      // Load term history for the student
      const historyResponse = await api.get(`/results/student/${student.id}/history`);
      if (historyResponse.data?.success) {
        setTermHistory(historyResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      // Set default values if API fails
      setStudentFees({
        previousBalance: 0,
        currentTermFee: 0,
        totalDue: 0,
        paid: 0,
        balance: 0
      });
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

  const getCompetencyColor = (level) => {
    const comp = competencyLevels.find(c => c.level === level);
    return comp?.color || '#333';
  };

  const getCompetencyDescription = (level) => {
    const comp = competencyLevels.find(c => c.level === level);
    return comp?.description || '';
  };

  // Calculate total and average
  const totalMarks = allSubjects.reduce((sum, subject) => sum + (student[subject] || 0), 0);
  const averageScore = allSubjects.length > 0 ? totalMarks / allSubjects.length : 0;
  const grade = getGrade(averageScore);
  const competency = getCompetencyLevel(averageScore);
  const recommendation = getRecommendation(averageScore);

  // Prepare term history data for chart
  const chartData = termHistory.map(term => ({
    term: term.termName || term.term,
    average: term.averageScore || 0,
    grade: term.grade || 'N/A'
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
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
                <p>{selectedTerm} {selectedYear} | {selectedClass} {selectedStream}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-3 gap-4 mt-4 border p-3 rounded">
                <div><strong>Name:</strong> {student.name}</div>
                <div><strong>Admission No:</strong> {student.admNo}</div>
                <div><strong>Stream:</strong> {student.stream || 'N/A'}</div>
                <div><strong>Class:</strong> {selectedClass}</div>
                <div><strong>Term:</strong> {selectedTerm}</div>
                <div><strong>Year:</strong> {selectedYear}</div>
              </div>

              {/* Combined Exam Results Section */}
              {combinedExamResults && examNames.length > 0 && (
                <div className="exam-section">
                  <h3 className="font-bold text-lg mt-4">Exam Results Breakdown</h3>
                  {examNames.map((examName, idx) => (
                    <div key={idx} className="mt-3">
                      <h4 className="font-semibold text-sm">{examName}</h4>
                      <table>
                        <thead>
                          <tr>
                            <th className="text-left">Subject</th>
                            <th>Score (%)</th>
                            <th>Grade</th>
                            <th>Competency Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allSubjects.map(subject => {
                            const examResult = combinedExamResults[examName]?.[student.id]?.[subject] || 0;
                            const subjectGrade = getGrade(examResult);
                            const subjectCompetency = getCompetencyLevel(examResult);
                            return (
                              <tr key={subject}>
                                <td className="text-left">{subject}</td>
                                <td>{examResult || '-'}</td>
                                <td>{examResult ? subjectGrade : '-'}</td>
                                <td>
                                  {examResult ? (
                                    <span style={{ color: subjectCompetency.color, fontWeight: 'bold' }}>
                                      {subjectCompetency.level}
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              {/* Combined Performance Summary */}
              <div className="mt-4">
                <h3 className="font-bold text-lg">Final Combined Results</h3>
                <table>
                  <thead>
                    <tr>
                      <th className="text-left">Subject</th>
                      <th>Weighted Score (%)</th>
                      <th>Grade</th>
                      <th>Competency Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubjects.map(subject => {
                      const marks = student[subject] || 0;
                      const subjectGrade = getGrade(marks);
                      const subjectCompetency = getCompetencyLevel(marks);
                      return (
                        <tr key={subject}>
                          <td className="text-left">{subject}</td>
                          <td>{marks}</td>
                          <td>{subjectGrade}</td>
                          <td>
                            <span style={{ color: subjectCompetency.color, fontWeight: 'bold' }}>
                              {subjectCompetency.level}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td className="text-left">Total</td>
                      <td>{totalMarks}</td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr className="total-row">
                      <td className="text-left">Average</td>
                      <td>{averageScore.toFixed(1)}%</td>
                      <td>{grade}</td>
                      <td style={{ color: competency.color }}>{competency.level}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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

              {/* Fees Information - From Database */}
              <div className="mt-4">
                <h4 className="font-bold">Fee Statement</h4>
                <table className="fee-table">
                  <tbody>
                    <tr>
                      <td className="label">Previous Term Balance</td>
                      <td className="amount">KSh {studentFees.previousBalance.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="label">Current Term Fee</td>
                      <td className="amount">KSh {studentFees.currentTermFee.toFixed(2)}</td>
                    </tr>
                    <tr className="total-row">
                      <td className="label">Total Due</td>
                      <td className="amount">KSh {studentFees.totalDue.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="label">Amount Paid</td>
                      <td className="amount">KSh {studentFees.paid.toFixed(2)}</td>
                    </tr>
                    <tr className="total-row">
                      <td className="label">Balance</td>
                      <td className="amount" style={{ color: studentFees.balance > 0 ? 'red' : 'green' }}>
                        KSh {studentFees.balance.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {studentFees.balance > 0 && (
                  <p className="text-xs text-red-600 mt-1">* Please clear the balance to avoid penalties</p>
                )}
                {studentFees.balance === 0 && studentFees.totalDue === 0 && (
                  <p className="text-xs text-gray-500 mt-1">* No fee records found for this student</p>
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