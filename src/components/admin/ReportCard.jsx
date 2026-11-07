// src/components/admin/ReportCard.jsx
import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPrinter } from 'react-icons/fi';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  skills = [],
  careerInsights = [],
  showSkillsOnReport = false,
  showCareerOnReport = false,
  showFeesOnReportCard = false,
  classHasAnySkills = false,
  // 🆕 Next-term fee: { nextTerm, nextYear, nextTermFee, pupilClass }
  nextTermFee = null,
}) => {
  const printRef = useRef();
  const [termHistory, setTermHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeCareerInsights = Array.isArray(careerInsights) ? careerInsights : [];

  const schoolLogo =
    schoolInfo?.logo ||
    schoolInfo?.schoolLogo ||
    schoolInfo?.logoUrl ||
    '';

  useEffect(() => {
    loadTermHistory();
  }, [student?.id]);

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
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <title>Report Card - ${student.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm 6mm 8mm;
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              font-family: 'Times New Roman', serif;
              font-size: 9.5px;
              line-height: 1.25;
              color: #111;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            @media print {
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
            }

            .rc-header { padding: 0 0 4px 0; margin: 0 0 4px 0; text-align: center; border-bottom: 1.5px solid #1a365d; }
            .rc-header table { border: none !important; border-collapse: collapse; width: auto !important; margin: 0 auto !important; }
            .rc-header table td { border: none !important; vertical-align: middle !important; padding: 0 !important; }
            .rc-logo-cell { width: 65px !important; padding-right: 10px !important; }
            .rc-logo { width: 60px !important; height: 60px !important; object-fit: contain; display: block; border: 0; }
            .rc-logo-placeholder { width: 60px !important; height: 60px !important; border: 1px dashed #ccc !important; border-radius: 4px !important; text-align: center; line-height: 60px; color: #999; font-size: 8px; }
            .rc-header-text { text-align: left; }
            .rc-school-name { font-size: 15px !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #1a365d; margin: 0; line-height: 1.1; }
            .rc-motto { font-size: 9px !important; font-style: italic; color: #6b7280; margin: 1px 0 0 0; line-height: 1.15; }
            .rc-contact { font-size: 8.5px !important; color: #4b5563; line-height: 1.25; margin: 0; }

            .rc-title-block { text-align: center; margin: 4px 0 5px 0; }
            .rc-title { font-size: 12px !important; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
            .rc-subtitle { font-size: 9px !important; margin-top: 1px; color: #333; }

            .rc-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px 10px; border: 0.5px solid #bbb; border-radius: 3px; padding: 4px 8px; font-size: 9px !important; margin-bottom: 4px; background: #fafafa; line-height: 1.35; }
            .rc-info > div { padding: 0; }

            table { width: 100% !important; border-collapse: collapse; font-size: 9px !important; margin-top: 2px !important; }
            th { background: #f0f0f0; font-weight: bold; text-align: center; border: 0.5px solid #666; padding: 1.5px 2px !important; font-size: 8.5px !important; line-height: 1.1; }
            td { border: 0.5px solid #666; padding: 1.5px 2px !important; text-align: center; font-size: 9px !important; line-height: 1.15; }
            .text-left { text-align: left; }

            .rc-section { margin-top: 4px !important; page-break-inside: avoid; }
            .rc-section h3, .rc-section h4 { font-size: 10px !important; font-weight: bold; margin: 0 0 2px 0 !important; padding-bottom: 1px; border-bottom: 1px solid #1a365d; color: #1a365d; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.15; }

            .mt-3 { margin-top: 4px !important; }
            .mt-3 h4 { font-size: 10px !important; margin: 0 0 2px 0 !important; }
            .mt-3 > .grid, .mt-3 .grid { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 2px !important; margin-top: 2px !important; }
            .mt-3 .grid > div { padding: 1px 2px !important; font-size: 8px !important; line-height: 1.15; border: 0.5px solid #999; border-radius: 2px; text-align: center; }
            .mt-3 .grid > div p { font-size: 7px !important; margin: 0; line-height: 1.1; }

            .term-history { margin-top: 4px !important; }
            .term-history h4 { font-size: 10px !important; margin: 0 0 1px 0 !important; }
            /* 🆕 Print styles for the chart */
            .chart-container { width: 100% !important; display: flex; justify-content: center; }
            .chart-container svg { max-height: 100% !important; }

            .skills-section, .career-section { margin-top: 4px !important; }
            .skills-section h4, .career-section h4 { font-size: 10px !important; margin: 0 0 2px 0 !important; }
            .career-section ol { font-size: 9px !important; padding-left: 16px !important; margin: 0 !important; line-height: 1.3; }
            .career-section li { margin-bottom: 1px !important; }

            .rc-recommendation { margin-top: 4px !important; padding: 3px 8px !important; border-left: 2px solid #1a365d; background: #f5f8fb; font-size: 9px !important; line-height: 1.3; }
            .rc-recommendation h4 { margin: 0 0 1px 0 !important; font-size: 10px !important; color: #1a365d; }
            .rc-recommendation p { font-size: 9px !important; margin: 0 !important; }

            .fee-table { font-size: 9px !important; margin-top: 2px !important; }
            .fee-table td { padding: 1px 4px !important; font-size: 9px !important; border: none !important; }
            .fee-table .label { text-align: left; font-weight: bold; }
            .fee-table .amount { text-align: right; }
            .total-row { font-weight: bold; background: #f9f9f9; }

            /* 🆕 Next Term Fee inline row */
            .rc-next-term-fee { margin-top: 3px !important; padding: 0 !important; border: none !important; background: transparent !important; page-break-inside: avoid; }
            .rc-next-term-fee .fee-table { margin-top: 0 !important; }
            .rc-next-term-fee .fee-table .label { font-weight: bold; color: #1a365d; font-size: 9.5px !important; }
            .rc-next-term-fee .fee-table .amount { font-weight: bold; color: #1a365d; font-size: 9.5px !important; }

            .rc-footer { margin-top: 6px !important; padding-top: 3px !important; border-top: 0.5px solid #ccc; font-size: 9px !important; }
            .rc-footer .grid { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; text-align: center; gap: 6px !important; }
            .rc-footer p { font-size: 9px !important; margin: 1px 0 !important; line-height: 1.3; }

            .mb-3 { margin-bottom: 4px !important; }
            .mb-4 { margin-bottom: 4px !important; }
            .mt-4 { margin-top: 4px !important; }
            .mt-5 { margin-top: 4px !important; }
            .mt-6 { margin-top: 6px !important; }
            .pt-4 { padding-top: 3px !important; }
            .p-6 { padding: 0 !important; }
            .p-3 { padding: 3px !important; }
            .p-2 { padding: 2px !important; }
            .gap-2 { gap: 2px !important; }
            .gap-3 { gap: 3px !important; }
            .rounded-lg { border-radius: 3px !important; }
            .text-xs { font-size: 9px !important; }
            .text-sm { font-size: 9.5px !important; }
            .text-base { font-size: 10.5px !important; }
            .text-lg { font-size: 12px !important; }
            .font-bold { font-weight: bold; }
            .italic { font-style: italic; }
            .text-center { text-align: center; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: 1fr; }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
            }
          <\/script>
        </body>
      </html>
    `);

    win.document.close();
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
  })).slice(-4); // Keep only last 4 terms

  const fee = feeSummary || {
    totalFee: 0, paid: 0, balance: 0,
    isFullyPaid: false, hasCredit: false, credit: 0, termBreakdown: [],
  };

  const balanceIsCredit = fee.balance < 0;
  const balanceIsZero = fee.balance === 0;
  const isCombinedMode = combinedExamResults && examNames.length > 1;

  /* ============================================================
     🆕 Next Term Fee — compact inline row (single line, fee-table style)
     ============================================================ */
  const renderNextTermFeeInline = () => {
    if (!nextTermFee) return null;

    const amount = Number(nextTermFee.nextTermFee) || 0;
    const hasAmount = amount > 0;
    const termLabel = `${nextTermFee.nextTerm || ''} ${nextTermFee.nextYear || ''}`.trim();

    return (
      <div className="rc-next-term-fee mt-2">
        <table className="fee-table">
          <tbody>
            <tr>
              <td className="label">Next Term Fee — {termLabel}</td>
              <td className="amount">
                {hasAmount ? `KSh ${amount.toLocaleString()}` : 'Not set'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  /* ============================================================
     🆕 Chart calculations for precise dimensions
     ============================================================ */
  // 4cm height @ ~96ppi = 151px
  // 2cm width per term @ ~96ppi = 76px per term (plus 40px for the Y-axis)
  const chartHeight = 151;
  const yAxisWidth = 35;
  const termWidth = 76;
  const minChartWidth = 300;
  const calculatedWidth = Math.max(minChartWidth, (chartData.length * termWidth) + yAxisWidth);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print z-10">
          <h2 className="text-lg font-bold">Student Report Card</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700">
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
              <div className="rc-header pb-2 mb-3">
                <table style={{ width: 'auto', margin: '0 auto', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td className="rc-logo-cell" style={{ width: '100px', paddingRight: '14px', verticalAlign: 'middle', border: 'none' }}>
                        {schoolLogo ? (
                          <img src={schoolLogo} alt="School Logo" className="rc-logo" style={{ width: '90px', height: '90px', objectFit: 'contain', display: 'block', border: 0 }} />
                        ) : (
                          <div className="rc-logo-placeholder" style={{ width: '90px', height: '90px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center', lineHeight: '90px', color: '#999', fontSize: '10px' }}>
                            No Logo
                          </div>
                        )}
                      </td>

                      <td className="rc-header-text" style={{ textAlign: 'left', verticalAlign: 'middle', border: 'none', paddingLeft: '6px' }}>
                        <h1 className="rc-school-name" style={{ fontSize: '23px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#1a365d', margin: 0, lineHeight: 1.15, fontFamily: '"Times New Roman", Georgia, serif' }}>
                          {schoolInfo.name || 'School Name'}
                        </h1>

                        {schoolInfo.motto && (
                          <p className="rc-motto" style={{ fontSize: '12px', fontStyle: 'italic', color: '#6b7280', margin: '3px 0 0 0', letterSpacing: '0.2px', fontFamily: '"Times New Roman", Georgia, serif' }}>
                            "{schoolInfo.motto}"
                          </p>
                        )}

                        {(schoolInfo.address || schoolInfo.phone || schoolInfo.email) && (
                          <div style={{ marginTop: '5px', fontSize: '10.5px', color: '#4b5563', lineHeight: 1.45, fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.15px' }}>
                            {schoolInfo.address && (<div style={{ marginBottom: '1px' }}>{schoolInfo.address}</div>)}
                            {(schoolInfo.phone || schoolInfo.email) && (
                              <div>
                                {schoolInfo.phone || ''}
                                {schoolInfo.phone && schoolInfo.email ? ' · ' : ''}
                                {schoolInfo.email || ''}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rc-title-block text-center my-4">
                <h2 className="rc-title text-lg font-bold underline uppercase tracking-wider">
                  Student Report Card
                </h2>
                <p className="rc-subtitle text-sm text-gray-700 mt-1">
                  {selectedTerm} {selectedYear}
                  {' • '}
                  {selectedClass}
                  {showStreamColumn && student.stream ? ` ${student.stream}` : ''}
                </p>
              </div>

              {/* INFO BLOCK WITH POSITIONS */}
              <div className="rc-info grid grid-cols-1 md:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50 text-sm mb-3">
                <div><strong>Name:</strong> {student.name}</div>
                <div><strong>Admission No:</strong> {student.admNo}</div>
                {showStreamColumn && (<div><strong>Stream:</strong> {student.stream || 'N/A'}</div>)}
                <div><strong>Class:</strong> {selectedClass}</div>
                <div><strong>Term:</strong> {selectedTerm}</div>
                <div><strong>Year:</strong> {selectedYear}</div>
                {student.classPosition !== undefined && (
                  <div><strong>Class Position:</strong> {student.classPosition}</div>
                )}
                {showStreamColumn && student.streamPosition !== undefined && (
                  <div><strong>Stream Position:</strong> {student.streamPosition}</div>
                )}
              </div>

              {isCombinedMode && (
                <div className="rc-section exam-section mt-5">
                  <h3 className="font-bold text-base border-b-2 border-blue-900 pb-1 mb-2 text-blue-900 uppercase">
                    Exam Results Breakdown
                  </h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-2 text-left align-bottom">Subject</th>
                          {examNames.map(examName => (
                            <th key={examName} colSpan={3} className="border border-gray-400 bg-blue-100 px-2 py-2 text-center font-bold">{examName}</th>
                          ))}
                          <th colSpan={3} className="border border-gray-400 bg-green-100 px-2 py-2 text-center font-bold">Weighted Final</th>
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
                                    <td className={`border border-gray-400 px-1 py-1 text-center ${!hasMarks ? 'text-red-400 bg-gray-50' : ''}`}>
                                      {hasMarks ? marks : '-'}
                                    </td>
                                    <td className="border border-gray-400 px-1 py-1 text-center font-semibold">{subjGrade}</td>
                                    <td className="border border-gray-400 px-1 py-1 text-center font-semibold" style={{ color: subjComp?.color || '#333' }}>
                                      {subjComp?.level || '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-bold">{finalMarks}</td>
                              <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold">{finalGrade}</td>
                              <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold" style={{ color: finalComp.color }}>{finalComp.level}</td>
                            </tr>
                          );
                        })}

                        <tr className="bg-gray-100">
                          <td className="border border-gray-400 px-2 py-1 text-left font-bold">Total / Average</td>
                          {examNames.map(examName => {
                            const subjectMarks = allSubjects
                              .map(s => combinedExamResults[examName]?.[student.id]?.[s])
                              .filter(m => m !== undefined && m !== null && m !== 0);

                            const examTotal = subjectMarks.reduce((a, b) => a + Number(b), 0);
                            const examAvg = subjectMarks.length > 0 ? (examTotal / subjectMarks.length) : 0;

                            return (
                              <React.Fragment key={`${examName}-avg`}>
                                <td className="border border-gray-400 px-1 py-1 text-center font-bold">
                                  {examAvg ? examAvg.toFixed(1) : '-'}
                                </td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                                <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-bold">{averageScore.toFixed(1)}%</td>
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold">{grade}</td>
                          <td className="border border-gray-400 px-1 py-1 text-center bg-green-50 font-semibold" style={{ color: competency.color }}>{competency.level}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 italic text-center">
                    * Missing exam marks are ignored in the Weighted Final calculation. Weights are redistributed proportionally for available exams.
                  </div>
                </div>
              )}

              {!isCombinedMode && (
                <div className="rc-section exam-section mt-5">
                  <h3 className="font-bold text-base border-b-2 border-blue-900 pb-1 mb-2 text-blue-900 uppercase">
                    Exam Results
                  </h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-2 text-left align-bottom">Subject</th>
                          <th colSpan={3} className="border border-gray-400 bg-blue-100 px-2 py-2 text-center font-bold">Score Details</th>
                        </tr>
                        <tr>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Score</th>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Grade</th>
                          <th className="border border-gray-400 bg-gray-50 px-2 py-1 text-center text-[10px]">Competency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubjects.map(subject => {
                          const marks = student[subject];
                          const hasMarks = marks !== undefined;
                          const subjectGrade = hasMarks ? getGrade(marks) : 'X';
                          const subjectCompetency = hasMarks ? getCompetencyLevel(marks) : { level: 'X', color: '#999' };
                          return (
                            <tr key={subject}>
                              <td className="border border-gray-400 px-2 py-1 text-left font-medium">{subject}</td>
                              <td className="border border-gray-400 px-2 py-1 text-center">{hasMarks ? marks : 'X'}</td>
                              <td className="border border-gray-400 px-2 py-1 text-center font-semibold">{subjectGrade}</td>
                              <td className="border border-gray-400 px-2 py-1 text-center font-semibold" style={{ color: subjectCompetency.color }}>
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
                          <td className="border border-gray-400 px-2 py-1 text-center bg-green-50 font-semibold" style={{ color: competency.color }}>
                            {competency.level}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

              {/* 🆕 Performance History Chart — Fixed Dimensions */}
              {chartData.length > 0 && (
                <div className="term-history rc-section">
                  <h4 className="font-bold text-sm mb-1">Performance History (Last 4 Terms)</h4>
                  <div className="chart-container" style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ width: `${calculatedWidth}px`, height: `${chartHeight}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={chartData} 
                          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="term" 
                            tick={{ fontSize: 10, fill: '#555' }} 
                            axisLine={{ stroke: '#999' }}
                            tickLine={{ stroke: '#999' }}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            ticks={[0, 25, 50, 75, 100]} 
                            tick={{ fontSize: 10, fill: '#555' }}
                            axisLine={{ stroke: '#999' }}
                            tickLine={{ stroke: '#999' }}
                          />
                          <Tooltip 
                            formatter={(value) => [`${value}%`, 'Average']}
                            contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px' }}
                          />
                          <Bar 
                            dataKey="average" 
                            fill="#4CAF50" 
                            barSize={32} 
                            radius={[2, 2, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1" style={{ width: `${calculatedWidth}px`, maxWidth: '100%' }}>
                    Average Score (%)
                  </div>
                </div>
              )}

              {showSkillsOnReport && (
                <div className="skills-section rc-section mt-4">
                  <h4 className="font-bold text-sm border-b pb-1 mb-2">Skills & Talents</h4>
                  {safeSkills.length > 0 ? (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Category</th>
                          <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Skill</th>
                          <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Proficiency</th>
                          <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeSkills.map((s, i) => (
                          <tr key={i}>
                            <td className="border border-gray-400 px-2 py-1">{s.category}</td>
                            <td className="border border-gray-400 px-2 py-1">{s.skill}</td>
                            <td className="border border-gray-400 px-2 py-1">{s.proficiency}</td>
                            <td className="border border-gray-400 px-2 py-1 text-left">{s.evidence || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs italic text-gray-500">
                      No skills or talents recorded for this student this term.
                    </p>
                  )}
                </div>
              )}

              {showCareerOnReport && safeCareerInsights.length > 0 && (
                <div className="career-section rc-section mt-4">
                  <h4 className="font-bold text-sm border-b pb-1 mb-2">Career Insights</h4>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    {safeCareerInsights.map((c, i) => (
                      <li key={i}>
                        <span className="font-semibold">{c.career}</span> — {Number(c.match).toFixed(1)}% match.
                        <span className="italic text-gray-600"> {c.rationale}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="recommendation rc-recommendation mt-4">
                <h4 className="font-bold">Recommendation</h4>
                <p className="text-sm mt-1">{recommendation}</p>
              </div>

              {showFeesOnReportCard && (
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
                            <td className="label">{balanceIsCredit ? 'Credit (Overpaid)' : 'Balance'}</td>
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
                                      <span style={{ color: 'red' }}>KSh {t.outstanding.toLocaleString()}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* 🆕 Next Term Fee — inline right after term-by-term table */}
                          {renderNextTermFeeInline()}
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
              )}

              <div className="footer rc-footer mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 text-center">
                  <div>
                    <p className="text-sm">_____________________</p>
                    <p className="text-xs">Class Teacher</p>
                  </div>
                  <div>
                    <p className="text-sm">_____________________</p>
                    <p className="text-xs">Principal/Head Teacher</p>
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