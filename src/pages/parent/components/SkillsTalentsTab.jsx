// src/pages/parent/components/SkillsTalentsTab.jsx
import React, { useState } from 'react';
import api from '../../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiAward, FiPlus, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import SubmitSkillModal from '../modals/SubmitSkillModal';

const getCurrentTermWindow = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  if (m >= 1 && m <= 4) return { term: 'Term 1', label: 'Jan – Apr', deadline: '2026-04-30' };
  if (m >= 5 && m <= 8) return { term: 'Term 2', label: 'May – Aug', deadline: '2026-08-31' };
  return { term: 'Term 3', label: 'Sep – Dec', deadline: '2026-12-31' };
};

const SkillsTalentsTab = ({ pupil }) => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: skills = [], isLoading: loadingSkills } = useQuery({
    queryKey: ['parent', 'skills', pupil._id],
    queryFn: async () => {
      const res = await api.get(`/skills/pupil/${pupil._id}`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!pupil._id,
    placeholderData: (prev) => prev, 
  });

  const { data: submissions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['parent', 'skillSubmissions', pupil._id],
    queryFn: async () => {
      const res = await api.get(`/parent/skills/submissions/${pupil._id}`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
    staleTime: 60 * 1000,
    enabled: !!pupil._id,
    placeholderData: (prev) => prev, 
  });

  const loading = loadingSkills || loadingSubs;
  const currentTerm = getCurrentTermWindow();
  const currentTermSubmission = submissions.find(
    s => s.term === currentTerm.term && s.year === new Date().getFullYear()
  );
  const canSubmit = !currentTermSubmission;

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading skills…</div>;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Term banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-3 sm:p-4 text-white">
        <h3 className="font-bold text-xs sm:text-sm">Current Submission Window</h3>
        <p className="text-lg sm:text-2xl font-bold mt-1">{currentTerm.term} · {currentTerm.label}</p>
        <p className="text-[11px] sm:text-xs opacity-90 mt-1">
          {canSubmit
            ? `You can submit ONE skill/talent for this term. Deadline: ${new Date(currentTerm.deadline).toLocaleDateString()}`
            : `✓ Submitted. Once sent it cannot be edited — it is queued for the class teacher.`}
        </p>
      </div>

      {/* Submission action */}
      {canSubmit ? (
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 active:bg-purple-800 flex items-center justify-center gap-2 touch-manipulation min-h-[48px] text-sm"
        >
          <FiPlus /> Submit a Skill / Talent for {currentTerm.term}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2 text-xs sm:text-sm text-green-800">
          <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Submitted for {currentTerm.term}</p>
            <p className="text-[10px] sm:text-xs mt-0.5">
              {currentTermSubmission.skill} — {currentTermSubmission.category}
              {' '}
              <span className="ml-1 sm:ml-2 inline-flex items-center gap-1 text-[9px] sm:text-[10px] bg-white border rounded-full px-1.5 sm:px-2 py-0.5">
                {currentTermSubmission.status === 'approved' && <><FiCheckCircle /> Approved</>}
                {currentTermSubmission.status === 'pending' && <><FiClock /> Awaiting review</>}
                {currentTermSubmission.status === 'rejected' && <><FiAlertCircle /> Not approved</>}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3">Your Submissions ({submissions.length})</h3>
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s._id} className="border rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{s.skill}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {s.category} • {s.term} {s.year} • {new Date(s.submittedAt).toLocaleDateString()}
                  </p>
                  {s.evidence && <p className="text-[10px] sm:text-xs text-gray-600 mt-1 italic truncate">“{s.evidence}”</p>}
                </div>
                <span className={`self-start text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
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

      {/* Verified skills */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 flex-wrap">
          <FiAward className="text-purple-600" /> Verified Skills & Talents
          <span className="text-[10px] sm:text-xs text-gray-400 font-normal">(approved by class teacher)</span>
        </h3>
        {skills.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No verified skills yet. Teacher adds these after review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs min-w-[360px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-2 py-1.5">Skill</th>
                  <th className="text-left px-2 py-1.5">Category</th>
                  <th className="text-left px-2 py-1.5">Level</th>
                  <th className="text-left px-2 py-1.5">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {skills.map(s => (
                  <tr key={s._id}>
                    <td className="px-2 py-1.5 font-medium truncate">{s.skill}</td>
                    <td className="px-2 py-1.5 truncate">{s.category}</td>
                    <td className="px-2 py-1.5 truncate">{s.proficiency}</td>
                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">
                      {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <SubmitSkillModal
          pupil={pupil}
          currentTerm={currentTerm}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['parent', 'skills', pupil._id] });
            queryClient.invalidateQueries({ queryKey: ['parent', 'skillSubmissions', pupil._id] });
          }}
        />
      )}
    </div>
  );
};

export default SkillsTalentsTab;