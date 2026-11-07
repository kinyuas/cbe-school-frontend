// src/pages/parent/modals/SubmitSkillModal.jsx
import React, { useState } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

const CATEGORIES = [
  'Sports', 'Music', 'Drama', 'Art & Design', 'Leadership', 'ICT',
  'Agriculture', 'Home Science', 'Debate', 'Community Service', 'Technical/Practical', 'Other'
];

const SubmitSkillModal = ({ pupil, currentTerm, onClose, onSuccess }) => {
  const [category, setCategory] = useState('');
  const [skill, setSkill] = useState('');
  const [evidence, setEvidence] = useState('');
  const [proficiency, setProficiency] = useState('Developing');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return toast.error('Select a category');
    if (!skill.trim()) return toast.error('Describe the skill');
    if (skill.length > 100) return toast.error('Keep skill description under 100 chars');
    if (evidence.length > 500) return toast.error('Evidence under 500 chars');

    if (!window.confirm(
      `Once submitted for ${currentTerm.term} you cannot edit it. The class teacher will review it. Continue?`
    )) return;

    setSubmitting(true);
    try {
      const res = await api.post('/parent/skills/submit', {
        pupilId: pupil._id,
        term: currentTerm.term,
        year: new Date().getFullYear(),
        category,
        skill: skill.trim(),
        evidence: evidence.trim(),
        proficiency,
      });
      if (res.data?.success) {
        toast.success('Submitted! Your child\'s class teacher will review it.');
        onSuccess?.();
      } else {
        toast.error(res.data?.message || 'Failed to submit');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Submit Skill / Talent</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex gap-2">
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>You may submit <strong>one</strong> skill per term. Once sent, it cannot be edited.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            >
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Skill / Talent * <span className="text-xs text-gray-400">(max 100 chars)</span></label>
            <input
              type="text" value={skill} onChange={(e) => setSkill(e.target.value)}
              maxLength={100}
              placeholder="e.g. Played goalkeeper for community team"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Proficiency Level</label>
            <select
              value={proficiency} onChange={(e) => setProficiency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option>Beginner</option>
              <option>Developing</option>
              <option>Proficient</option>
              <option>Advanced</option>
              <option>Exceptional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Evidence / Story <span className="text-xs text-gray-400">(optional, max 500 chars)</span></label>
            <textarea
              value={evidence} onChange={(e) => setEvidence(e.target.value)}
              rows="3" maxLength={500}
              placeholder="e.g. Led the team to win the district tournament in December…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitSkillModal;