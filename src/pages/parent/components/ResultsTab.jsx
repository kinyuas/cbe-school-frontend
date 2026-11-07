// src/pages/parent/components/ResultsTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { FiBookOpen, FiX, FiBriefcase, FiAlertCircle } from 'react-icons/fi';

const getGradeFromMark = (m) => {
  if (m >= 80) return 'A';  if (m >= 75) return 'A-';
  if (m >= 70) return 'B+'; if (m >= 65) return 'B';
  if (m >= 60) return 'B-'; if (m >= 55) return 'C+';
  if (m >= 50) return 'C';  if (m >= 45) return 'C-';
  if (m >= 40) return 'D+'; if (m >= 35) return 'D';
  if (m >= 30) return 'D-'; return 'E';
};

const getCompFromMark = (m) => {
  if (m >= 80) return { label: 'EE',  color: 'text-purple-600' };
  if (m >= 60) return { label: 'ME',  color: 'text-green-600' };
  if (m >= 40) return { label: 'AE',  color: 'text-blue-600' };
  if (m >= 20) return { label: 'BE',  color: 'text-yellow-600' };
  return { label: 'WBE', color: 'text-red-600' };
};

// ─── EXACT TEACHER PORTAL AI LOGIC & DATABASE ─────────────────────────────
const SKILL_BOOST = {
  'Sports':              { field: 'Sports & Recreation',         boost: 12 },
  'Music':               { field: 'Creative Arts',               boost: 12 },
  'Drama':               { field: 'Creative Arts',               boost: 10 },
  'Art & Design':        { field: 'Creative Arts',               boost: 10 },
  'Leadership':          { field: 'Business & Economics',        boost: 10 },
  'ICT':                 { field: 'ICT & Engineering',           boost: 15 },
  'Agriculture':         { field: 'Agriculture & Environment',   boost: 10 },
  'Home Science':        { field: 'Creative Arts',               boost: 8  },
  'Debate':              { field: 'Law & Humanities',            boost: 10 },
  'Community Service':   { field: 'Education & Social Sciences', boost: 8  },
  'Technical/Practical': { field: 'ICT & Engineering',           boost: 12 }
};

const CAREER_DB = [
  { name: 'Medicine & Surgery (MBChB)', field: 'Medicine & Health Sciences', icon: '🩺', subjects: ['Biology', 'Chemistry'], minAvg: 75 },
  { name: 'Pharmacy', field: 'Medicine & Health Sciences', icon: '💊', subjects: ['Biology', 'Chemistry'], minAvg: 70 },
  { name: 'Nursing', field: 'Medicine & Health Sciences', icon: '🏥', subjects: ['Biology', 'Chemistry'], minAvg: 65 },
  { name: 'Computer Science', field: 'ICT & Engineering', icon: '💻', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Software Engineering', field: 'ICT & Engineering', icon: '🖥️', subjects: ['Mathematics', 'Physics'], minAvg: 65 },
  { name: 'Electrical Engineering', field: 'ICT & Engineering', icon: '⚡', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Civil Engineering', field: 'ICT & Engineering', icon: '🏗️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Mechanical Engineering', field: 'ICT & Engineering', icon: '⚙️', subjects: ['Mathematics', 'Physics'], minAvg: 68 },
  { name: 'Agriculture', field: 'Agriculture & Environment', icon: '🌾', subjects: ['Biology', 'Agriculture'], minAvg: 58 },
  { name: 'Environmental Science', field: 'Agriculture & Environment', icon: '🌍', subjects: ['Biology', 'Geography'], minAvg: 58 },
  { name: 'Statistics', field: 'Business & Economics', icon: '📉', subjects: ['Mathematics'], minAvg: 65 },
  { name: 'Actuarial Science', field: 'Business & Economics', icon: '📈', subjects: ['Mathematics'], minAvg: 70 },
  { name: 'Architecture', field: 'Built Environment', icon: '🏛️', subjects: ['Mathematics', 'Art & Design'], minAvg: 65 },
  { name: 'Law (LLB)', field: 'Law & Humanities', icon: '⚖️', subjects: ['English', 'Kiswahili', 'History'], minAvg: 70 },
  { name: 'Commerce (BCom)', field: 'Business & Economics', icon: '📊', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Business Administration', field: 'Business & Economics', icon: '💼', subjects: ['Mathematics', 'Business Studies'], minAvg: 60 },
  { name: 'Education (B.Ed)', field: 'Education & Social Sciences', icon: '👩‍🏫', subjects: ['English', 'Mathematics'], minAvg: 55 },
  { name: 'Journalism & Media', field: 'Media & Communication', icon: '🎙️', subjects: ['English', 'Kiswahili'], minAvg: 60 },
  { name: 'Psychology', field: 'Education & Social Sciences', icon: '🧠', subjects: ['Biology', 'English'], minAvg: 60 },
  { name: 'Fine Art & Design', field: 'Creative Arts', icon: '🎨', subjects: ['Art & Design', 'English'], minAvg: 55 },
  { name: 'Music & Performing Arts', field: 'Creative Arts', icon: '🎼', subjects: ['Music', 'English'], minAvg: 55 },
  { name: 'Theatre Arts & Film', field: 'Creative Arts', icon: '🎬', subjects: ['English', 'Literature'], minAvg: 55 },
  { name: 'Sports Science', field: 'Sports & Recreation', icon: '🏅', subjects: ['Physical Education', 'Biology'], minAvg: 55 },
  { name: 'Fashion & Textile Design', field: 'Creative Arts', icon: '👗', subjects: ['Art & Design', 'Home Science'], minAvg: 55 }
];

const normalizeSubject = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const getSkillName = (s) => (s?.skill || s?.skillName || '').trim();

// ─── EXACT TEACHER LOGIC FOR ANALYSIS ───
const analyzeCareer = (results, options = {}) => {
  const { skills = [] } = options;

  if (!results || results.length === 0) {
    return { insights: [], avgScore: 0, skillsUsed: skills };
  }

  const bySubject = {};
  results.forEach(r => {
    const s = (r.subject || '').trim();
    if (!s) return;
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(Number(r.marks) || 0);
  });

  const subjectAvg = {};
  Object.entries(bySubject).forEach(([subj, marks]) => {
    subjectAvg[subj] = marks.reduce((a, b) => a + b, 0) / marks.length;
  });

  const subjectKeys = Object.keys(subjectAvg);
  const avgScore = subjectKeys.length > 0
    ? subjectKeys.reduce((sum, k) => sum + subjectAvg[k], 0) / subjectKeys.length
    : 0;

  const getScore = (target) => {
    const t = normalizeSubject(target);
    for (const key of subjectKeys) {
      const n = normalizeSubject(key);
      if (n === t || n.includes(t) || t.includes(n)) return subjectAvg[key];
    }
    return null;
  };

  const skillBoosts = skills.map(sk => {
    const b = SKILL_BOOST[sk.category];
    if (!b) return null;
    const multiplier = {
      'Beginner': 0.3, 'Developing': 0.5, 'Proficient': 0.7,
      'Advanced': 1.0, 'Exceptional': 1.3
    }[sk.proficiency] || 0.5;
    return { field: b.field, boost: b.boost * multiplier, skill: sk };
  }).filter(Boolean);

  const scored = CAREER_DB.map(career => {
    let subjScore = 0, subjCount = 0;
    const matchedSubjects = [];

    career.subjects.forEach(s => {
      const sc = getScore(s);
      if (sc !== null) {
        subjScore += sc;
        subjCount++;
        matchedSubjects.push({ name: s, score: sc });
      }
    });

    const rawAcademic = subjCount > 0 ? subjScore / subjCount : 0;
    const requiredCount = career.subjects.length;
    const coverageFactor = requiredCount > 0 ? (subjCount / requiredCount) : 0;
    const academicScore = rawAcademic * coverageFactor;

    let skillBoost = 0;
    const matchedSkillsForField = [];
    skillBoosts.forEach(sb => {
      if (sb.field === career.field) {
        skillBoost += sb.boost;
        matchedSkillsForField.push(sb.skill);
      }
    });

    const finalScore = Math.min(100, academicScore + skillBoost);
    const meetsMin = avgScore >= career.minAvg;

    return {
      ...career,
      matchScore: Math.round(finalScore),
      meetsMin,
      academicScore: Math.round(academicScore),
      skillBoost: Math.round(skillBoost),
      matchedSubjects,
      matchedSkillsForField,
      coveragePercent: Math.round(coverageFactor * 100),
    };
  });

  const top3 = scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3)
    .map(c => {
      const parts = [];

      if (c.matchedSubjects.length > 0) {
        const subjList = c.matchedSubjects
          .slice(0, 2)
          .map(m => `${m.name} (${Math.round(m.score)}%)`)
          .join(', ');
        parts.push(`Strong in ${subjList}`);
      }

      if (c.matchedSkillsForField.length > 0) {
        const names = c.matchedSkillsForField
          .slice(0, 2)
          .map(sk => getSkillName(sk))
          .filter(Boolean);
        if (names.length > 0) parts.push(`Talent in ${names.join(' & ')}`);
      }

      if (c.coveragePercent < 100 && c.matchedSubjects.length > 0) {
        parts.push(`(${c.coveragePercent}% subjects)`);
      }

      const reason = parts.length > 0 ? parts.join(' • ') : 'Matches overall performance';
      return { ...c, reason };
    });

  return { insights: top3, avgScore: Math.round(avgScore), skillsUsed: skills };
};

// ─── EXACT UI MODAL FROM TEACHER ───
const CareerInsightsModal = ({ viewingCareerPupil, careerInsights, careerAnalysisMeta, loadingCareers, onClose }) => {
  if (!viewingCareerPupil) return null;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-3">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <FiBriefcase className="w-5 h-5" /> AI Career & Talent Insights
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {viewingCareerPupil.name} • {viewingCareerPupil.class}
              {viewingCareerPupil.stream && ` • ${viewingCareerPupil.stream}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1.5 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {loadingCareers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-3 text-sm text-gray-600">Analysing results & talents...</p>
            </div>
          ) : careerInsights.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Not enough data to suggest careers</p>
              <p className="text-xs text-gray-400 mt-1">Add exam results and skills first</p>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mb-3 text-center flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase">Academic Avg Score</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.avgScore}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Talents Analysed</p>
                  <p className="text-xl font-bold text-indigo-700">{careerAnalysisMeta.skillsUsed?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                {careerInsights.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                    <span className="text-2xl flex-shrink-0">{medals[i]}</span>
                    <span className="text-2xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{c.name}</h3>
                      <p className="text-[10px] text-gray-500 truncate">{c.field}</p>
                      <p className="text-[11px] text-indigo-600 mt-0.5 truncate font-medium bg-indigo-50/50 px-1.5 py-0.5 rounded inline-block">✓ {c.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-indigo-600">{c.matchScore}%</p>
                      <p className="text-[9px] text-gray-400">match</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-3">
                Suggestions are indicative. Consider the learner's interests too.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultsTab = ({ pupil }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [computedExams, setComputedExams] = useState([]);

  // Career state
  const [showCareerModal, setShowCareerModal] = useState(false);
  const [viewingCareerPupil, setViewingCareerPupil] = useState(null);
  const [careerInsights, setCareerInsights] = useState([]);
  const [careerAnalysisMeta, setCareerAnalysisMeta] = useState({ avgScore: 0, skillsUsed: [] });
  const [loadingCareers, setLoadingCareers] = useState(false);

  // ── Load results + compute positions per exam locally (Mirroring Admin logic) ──
  useEffect(() => {
    if (!pupil?._id) return;

    (async () => {
      try {
        setLoading(true);

        // 1. Fetch pupil's own results
        const res = await api.get(`/results/pupil/${pupil._id}`);
        const fetchedResults = res.data?.success ? (res.data.data || []) : [];
        setResults(fetchedResults);

        // 2. Group results by exam
        const byExam = {};
        fetchedResults.forEach(r => {
          const key = r.examName || 'Exam';
          if (!byExam[key]) {
            byExam[key] = {
              examName: key,
              term: r.term,
              year: r.year,
              date: r.updatedAt || r.createdAt,
              subjects: [],
              totalMarks: 0,
              subjectsWithMarks: 0,
            };
          }
          const marks = Number(r.marks) || 0;
          byExam[key].subjects.push({ subject: r.subject, marks });
          byExam[key].totalMarks += marks;
          byExam[key].subjectsWithMarks++;
        });

        const examList = Object.values(byExam)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        // 3. For each exam, fetch the whole class to calculate accurate positions
        const computed = await Promise.all(examList.map(async (exam) => {
          const totalSubjectsInClass = exam.subjects.length;
          const averageScore = totalSubjectsInClass > 0
            ? Math.round(exam.totalMarks / totalSubjectsInClass)
            : 0;
          const comp = getCompFromMark(averageScore);

          try {
            // Fetch all results for this class and exam directly from /results
            const params = {
              class: pupil.class,
              examName: exam.examName,
              term: exam.term,
              year: exam.year,
            };
            const classRes = await api.get('/results', { params });
            const classResults = classRes.data?.data || [];
            
            // Build map of all students and their total marks
            const studentMap = new Map();
            classResults.forEach(r => {
              const pid = r.pupilId?._id || r.pupilId;
              const stream = r.pupilId?.stream || r.stream || '';
              
              if (!studentMap.has(pid)) {
                studentMap.set(pid, { id: pid, stream, totalMarks: 0, subjectsWithMarks: 0 });
              }
              const s = studentMap.get(pid);
              s.totalMarks += Number(r.marks) || Number(r.score) || 0;
              s.subjectsWithMarks++;
            });

            // Calculate total unique subjects in the class
            const uniqueSubjects = new Set(classResults.map(r => r.subject));
            const totalSubjCount = uniqueSubjects.size || totalSubjectsInClass;

            // Filter complete students and sort by marks
            const complete = Array.from(studentMap.values())
              .filter(s => s.subjectsWithMarks >= totalSubjCount)
              .sort((a, b) => b.totalMarks - a.totalMarks);

            // Stream grouping
            const streamGroups = {};
            complete.forEach(s => {
              const st = s.stream || 'No Stream';
              if (!streamGroups[st]) streamGroups[st] = [];
              streamGroups[st].push(s);
            });

            let myClassPos = 'N/A';
            let myStreamPos = 'N/A';

            // Find class position
            let classRank = 1;
            for (let i = 0; i < complete.length; i++) {
              if (i > 0 && complete[i].totalMarks === complete[i - 1].totalMarks) {
                complete[i].classPos = complete[i - 1].classPos;
              } else {
                complete[i].classPos = classRank;
              }
              if (complete[i].id === pupil._id) myClassPos = complete[i].classPos;
              classRank++;
            }

            // Find stream position
            if (pupil.stream) {
              const myStreamGroup = streamGroups[pupil.stream] || [];
              let streamRank = 1;
              for (let i = 0; i < myStreamGroup.length; i++) {
                if (i > 0 && myStreamGroup[i].totalMarks === myStreamGroup[i - 1].totalMarks) {
                  myStreamGroup[i].streamPos = myStreamGroup[i - 1].streamPos;
                } else {
                  myStreamGroup[i].streamPos = streamRank;
                }
                if (myStreamGroup[i].id === pupil._id) myStreamPos = myStreamGroup[i].streamPos;
                streamRank++;
              }
            }

            return { 
              ...exam, 
              averageScore, 
              comp, 
              classPosition: myClassPos, 
              streamPosition: myStreamPos,
              classSize: complete.length,
              streamSize: pupil.stream ? (streamGroups[pupil.stream]?.length || 0) : 0,
              pupilStream: pupil.stream,
              hasMissingMarks: complete.find(s => s.id === pupil._id) === undefined
            };

          } catch (err) {
            console.error('Error fetching class results for rank:', err);
            return { 
              ...exam, 
              averageScore, 
              comp, 
              classPosition: 'N/A', 
              streamPosition: 'N/A',
              hasMissingMarks: false
            };
          }
        }));

        setComputedExams(computed);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  }, [pupil?._id, pupil?.stream]);

  // ── Fetch AI Career Data ──
  const generateCareerInsights = async (student) => {
    setLoadingCareers(true);
    try {
      const [resultsRes, skillsRes] = await Promise.all([
        api.get(`/results/pupil/${student._id}`),
        api.get(`/skills/pupil/${student._id}`)
      ]);

      const resultsData = resultsRes.data?.success ? (resultsRes.data.data || []) : [];
      const skills = skillsRes.data?.success ? (skillsRes.data.data || []) : [];

      const analysis = analyzeCareer(resultsData, { skills });

      setCareerInsights(analysis.insights);
      setCareerAnalysisMeta({ avgScore: analysis.avgScore, skillsUsed: analysis.skillsUsed });
    } catch (error) {
      console.error('Error generating career insights:', error);
      toast.error('Could not fetch results or skills for analysis');
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleViewCareerInsights = async () => {
    setViewingCareerPupil(pupil);
    setShowCareerModal(true);
    setCareerInsights([]);
    await generateCareerInsights(pupil);
  };

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading results & calculating positions…</div>;

  if (computedExams.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <FiBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">No exam results uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-4">
        <div>
          <h3 className="font-bold text-indigo-900 text-sm">Discover Career Paths</h3>
          <p className="text-[11px] text-indigo-700">Based on your results & skills.</p>
        </div>
        <button
          onClick={handleViewCareerInsights}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
        >
          <FiBriefcase className="w-3.5 h-3.5" /> View Insights
        </button>
      </div>

      {computedExams.map((exam, i) => {
        const isRecent = i === 0;
        const hasStream = !!exam.pupilStream;

        return (
          <div key={`${exam.examName}-${exam.term}-${exam.year}-${i}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-4 py-3 flex flex-wrap justify-between items-center gap-2 ${isRecent ? 'bg-green-50 border-b border-green-100' : 'bg-gray-50 border-b border-gray-100'}`}>
              <div>
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  {exam.examName}
                  {isRecent && <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full">NEW</span>}
                </h3>
                <p className="text-xs text-gray-500">
                  {exam.term} {exam.year} • Uploaded {exam.date ? new Date(exam.date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="text-right">
                {/* Position Badge */}
                <div className="flex flex-wrap justify-end gap-2 text-[10px] text-gray-600 font-bold bg-white px-2 py-1 rounded-md border shadow-sm mb-1">
                  <span>
                    Class Pos:{' '}
                    <span className="text-blue-600">{exam.classPosition}</span>
                    {exam.classSize > 0 && (
                      <span className="text-gray-400"> / {exam.classSize}</span>
                    )}
                  </span>
                  {hasStream && (
                    <span>
                      Str Pos:{' '}
                      <span className="text-blue-600">{exam.streamPosition}</span>
                      {exam.streamSize > 0 && (
                        <span className="text-gray-400"> / {exam.streamSize}</span>
                      )}
                    </span>
                  )}
                </div>

                <p className={`text-xl font-bold ${exam.comp.color}`}>{exam.averageScore}%</p>
                <p className="text-[10px] text-gray-500 uppercase">
                  {exam.comp.label} · Grade {getGradeFromMark(exam.averageScore)}
                </p>
              </div>
            </div>

            {/* Missing-marks notice */}
            {exam.hasMissingMarks && (
              <div className="flex items-start gap-1.5 bg-amber-50 border-b border-amber-100 px-3 py-1.5 text-[11px] text-amber-800">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Some subjects are still pending — position will appear once all marks are entered.
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Subject</th>
                    <th className="text-center px-3 py-2">Score</th>
                    <th className="text-center px-3 py-2">Grade</th>
                    <th className="text-center px-3 py-2">Competency</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exam.subjects.map((s, idx) => {
                    const c = getCompFromMark(s.marks);
                    return (
                      <tr key={`${s.subject}-${idx}`}>
                        <td className="px-3 py-2 font-medium">{s.subject}</td>
                        <td className={`px-3 py-2 text-center font-bold ${
                          s.marks >= 80 ? 'text-purple-600' :
                          s.marks >= 60 ? 'text-green-600' :
                          s.marks >= 40 ? 'text-blue-600' : 'text-red-600'
                        }`}>{s.marks}</td>
                        <td className="px-3 py-2 text-center font-semibold">{getGradeFromMark(s.marks)}</td>
                        <td className={`px-3 py-2 text-center font-semibold ${c.color}`}>{c.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {showCareerModal && (
        <CareerInsightsModal
          viewingCareerPupil={viewingCareerPupil}
          careerInsights={careerInsights}
          careerAnalysisMeta={careerAnalysisMeta}
          loadingCareers={loadingCareers}
          onClose={() => { setShowCareerModal(false); setViewingCareerPupil(null); setCareerInsights([]); }}
        />
      )}
    </div>
  );
};

export default ResultsTab;