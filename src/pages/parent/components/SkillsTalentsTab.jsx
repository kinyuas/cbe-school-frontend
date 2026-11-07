// src/pages/parent/components/SkillsTalentsTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { FiAward, FiPlus, FiLock, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import SubmitSkillModal from '../modals/SubmitSkillModal';

/**
 * Rules:
 *   - Parent can submit ONE skill per term (Jan-Apr / May-Aug / Sep-Dec).
 *   - After submission, no editing allowed (locked).
 *   - Class teacher reviews and, if approved, pushes to official skill record → feeds career engine + report card.
 */

const getCurrentTermWindow = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  if (m >= 1 && m <= 4) return { term: 'Term 1', label: 'Jan – Apr', deadline: '2026-04-30' };
  if (m >= 5 && m <= 8) return { term: 'Term 2', label: 'May – Aug', deadline: '2026-08-31' };
  return { term: 'Term 3', label: 'Sep – Dec', deadline: '2026-12-31' };
};

const SkillsTalentsTab = ({ pupil }) => {
  const [skills, setSkills] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [skillsRes, subsRes] = await Promise.all([
        api.get(`/skills/pupil/${pupil._id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/parent/skills/submissions/${pupil._id}`).catch(() => ({ data: { data: [] } })),
      ]);
      setSkills(skillsRes.data?.data || []);
      setSubmissions(subsRes.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [pupil._id]);

  const currentTerm = getCurrentTermWindow();
  const currentTermSubmission = submissions.find(
    s => s.term === currentTerm.term && s.year === new Date().getFullYear()
  );
  const canSubmit = !currentTermSubmission;

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading skills…</div>;

  return (
    <div className="space-y-4">
      {/* Term banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
        <h3 className="font-bold text-sm">Current Submission Window</h3>
        <p className="text-2xl font-bold mt-1">{currentTerm.term} · {currentTerm.label}</p>
        <p className="text-xs opacity-90 mt-1">
          {canSubmit
            ? `You can submit ONE skill/talent for this term. Deadline: ${new Date(currentTerm.deadline).toLocaleDateString()}`
            : `✓ Submitted. Once sent it cannot be edited — it is queued for the class teacher.`}
        </p>
      </div>

      {/* Parent submission action */}
      {canSubmit ? (
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
        >
          <FiPlus /> Submit a Skill / Talent for {currentTerm.term}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2 text-sm text-green-800">
          <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Submitted for {currentTerm.term}</p>
            <p className="text-xs mt-0.5">
              {currentTermSubmission.skill} — {currentTermSubmission.category}
              {' '}
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-white border rounded-full px-2 py-0.5">
                {currentTermSubmission.status === 'approved' && <><FiCheckCircle /> Approved</>}
                {currentTermSubmission.status === 'pending' && <><FiClock /> Awaiting teacher review</>}
                {currentTermSubmission.status === 'rejected' && <><FiAlertCircle /> Not approved</>}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Your Submissions ({submissions.length})</h3>
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s._id} className="border rounded-lg p-3 text-sm flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{s.skill}</p>
                  <p className="text-xs text-gray-500">
                    {s.category} • {s.term} {s.year} • Submitted {new Date(s.submittedAt).toLocaleDateString()}
                  </p>
                  {s.evidence && <p className="text-xs text-gray-600 mt-1 italic">“{s.evidence}”</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 whitespace-nowrap ${
                  s.status === 'approved' ? 'bg-green-100 text-green-700' :
                  s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.status === 'approved' && <FiCheckCircle />}
                  {s.status === 'rejected' && <FiAlertCircle />}
                  {s.status === 'pending' && <FiClock />}
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher-approved official skills (feeds report card & careers) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiAward className="text-purple-600" /> Verified Skills & Talents
          <span className="text-xs text-gray-400 font-normal">(approved by class teacher, used in report card)</span>
        </h3>
        {skills.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No verified skills yet. Teacher adds these after review.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1.5">Skill</th>
                <th className="text-left px-2 py-1.5">Category</th>
                <th className="text-left px-2 py-1.5">Proficiency</th>
                <th className="text-left px-2 py-1.5">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {skills.map(s => (
                <tr key={s._id}>
                  <td className="px-2 py-1.5 font-medium">{s.skill}</td>
                  <td className="px-2 py-1.5">{s.category}</td>
                  <td className="px-2 py-1.5">{s.proficiency}</td>
                  <td className="px-2 py-1.5 text-gray-500">
                    {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <SubmitSkillModal
          pupil={pupil}
          currentTerm={currentTerm}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadAll(); }}
        />
      )}
    </div>
  );
};

export default SkillsTalentsTab;