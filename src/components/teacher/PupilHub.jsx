// src/components/teacher/PupilHub.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiFileText, FiVideo, FiPlus, FiTrash2, FiUploadCloud, 
  FiCheckCircle, FiBookOpen, FiLink, FiLoader, FiMessageSquare,
  FiUser, FiExternalLink, FiDownload
} from 'react-icons/fi';

const CBE_SUBJECTS_MAP = {
  'Grade 1': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 2': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 3': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Hygiene and Nutrition', 'Religious Education', 'Creative Arts'],
  'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education'],
  'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
  'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Science and Technology', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical and Health Education', 'Agriculture and Nutrition'],
  'Grade 7': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
  'Grade 8': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
  'Grade 9': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Pre-Technical Studies', 'Social Studies', 'Religious Education', 'Creative Arts and Sports', 'Business Studies', 'Agriculture', 'Computer Science'],
};

export default function PupilHub() {
  const [activeTab, setActiveTab] = useState('assignments');
  const [classes, setClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ==============================
  // LIST STATE (For viewing/deleting)
  // ==============================
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [existingResources, setExistingResources] = useState([]);
  const [pupils, setPupils] = useState([]);

  // ==============================
  // ASSIGNMENT / TEST STATE
  // ==============================
  const [form, setForm] = useState({
    title: '', subject: '', class: '', type: 'assignment', 
    description: '', dueDate: '', questions: [], fileUrl: ''
  });

  // ==============================
  // RESOURCE STATE
  // ==============================
  const [resourceForm, setResourceForm] = useState({
    title: '', subject: '', class: '', type: 'Revision Note',
    url: '', fileUrl: ''
  });

  // ==============================
  // FEEDBACK STATE
  // ==============================
  const [feedbackForm, setFeedbackForm] = useState({
    pupilId: '', subject: '', comment: ''
  });

  useEffect(() => {
    fetchSetupData();
    fetchLists();
  }, []);

  const fetchSetupData = async () => {
    try {
      const [schoolRes, pupilsRes] = await Promise.all([
        api.get('/school/settings'),
        api.get('/teacher-hub/my-students').catch(() => ({ data: { data: [] } }))
      ]);
      
      if (schoolRes.data?.success) {
        const activeClasses = (schoolRes.data.data.classes || []).filter(c => c.isActive !== false).map(c => c.name);
        setClasses(activeClasses);
      }
      if (pupilsRes.data?.data) {
        setPupils(pupilsRes.data.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchLists = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        api.get('/teacher-hub/assignments').catch(() => ({ data: { data: [] } })),
        api.get('/teacher-hub/resources').catch(() => ({ data: { data: [] } }))
      ]);
      setExistingAssignments(aRes.data.data || []);
      setExistingResources(rRes.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await api.delete(`/teacher-hub/${type}/${id}`);
      toast.success(`${type === 'assignments' ? 'Assignment' : 'Resource'} deleted`);
      fetchLists(); // Refresh list
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleClassChange = (selectedClass, isResource = false) => {
    const subjectsForClass = CBE_SUBJECTS_MAP[selectedClass] || ['English', 'Kiswahili', 'Mathematics', 'Science'];
    setAvailableSubjects(subjectsForClass);
    if (isResource) setResourceForm(prev => ({ ...prev, class: selectedClass, subject: '' }));
    else setForm(prev => ({ ...prev, class: selectedClass, subject: '' }));
  };

  const handleFileUpload = async (e, isResource = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/teacher-hub/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        toast.success('File uploaded successfully!');
        if (isResource) setResourceForm(prev => ({ ...prev, fileUrl: res.data.url, url: res.data.url }));
        else setForm(prev => ({ ...prev, fileUrl: res.data.url }));
      }
    } catch (err) { toast.error('File upload failed'); } 
    finally { setUploading(false); }
  };

  // ==============================
  // AI TEST BUILDER
  // ==============================
  const addQuestion = () => setForm(prev => ({ ...prev, questions: [...prev.questions, { questionText: '', options: ['', '', '', ''], correctAnswer: '' }] }));
  const updateQuestion = (index, field, value) => {
    const newQuestions = [...form.questions];
    if (field === 'option') newQuestions[index].options[value[0]] = value[1];
    else newQuestions[index][field] = value;
    setForm(prev => ({ ...prev, questions: newQuestions }));
  };
  const removeQuestion = (index) => setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));

  // ==============================
  // SUBMIT HANDLERS
  // ==============================
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.class || !form.subject) return toast.error('Please fill all required fields');
    if (form.type === 'test' && form.questions.length === 0) return toast.error('Please add at least one question');

    setSaving(true);
    try {
      await api.post('/teacher-hub/assignments', form);
      toast.success('Published successfully!');
      setForm({ title: '', subject: '', class: '', type: 'assignment', description: '', dueDate: '', questions: [], fileUrl: '' });
      setAvailableSubjects([]);
      fetchLists();
    } catch (err) { toast.error('Failed to save'); } 
    finally { setSaving(false); }
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    if (!resourceForm.title || !resourceForm.class || !resourceForm.subject) return toast.error('Please fill all required fields');
    if (!resourceForm.url && !resourceForm.fileUrl) return toast.error('Please provide a URL or upload a file');

    setSaving(true);
    try {
      await api.post('/teacher-hub/resources', resourceForm);
      toast.success('Resource saved!');
      setResourceForm({ title: '', subject: '', class: '', type: 'Revision Note', url: '', fileUrl: '' });
      setAvailableSubjects([]);
      fetchLists();
    } catch (err) { toast.error('Failed to save'); } 
    finally { setSaving(false); }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackForm.pupilId || !feedbackForm.comment) return toast.error('Please select a student and write a comment');
    setSaving(true);
    try {
      await api.post('/teacher-hub/feedback', feedbackForm);
      toast.success('Feedback sent to student!');
      setFeedbackForm({ pupilId: '', subject: '', comment: '' });
    } catch (err) { toast.error('Failed to send feedback'); } 
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading hub...</div>;

  return (
    <Layout title="Pupil Learning Hub" subtitle="Manage assignments, tests, resources, and feedback">
      
      {/* TABS */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1 overflow-x-auto">
        <button onClick={() => setActiveTab('assignments')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap ${activeTab === 'assignments' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <FiFileText /> Assignments & Tests
        </button>
        <button onClick={() => setActiveTab('resources')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap ${activeTab === 'resources' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <FiBookOpen /> Learning Library
        </button>
        <button onClick={() => setActiveTab('feedback')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap ${activeTab === 'feedback' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <FiMessageSquare /> Student Feedback
        </button>
      </div>

      {/* ================= ASSIGNMENTS TAB ================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-lg mb-4 text-indigo-700">Create New Assignment / Test</h3>
            <form onSubmit={handleAssignmentSubmit} className="space-y-4 max-w-3xl">
              
              <div className="flex gap-4 mb-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer ${form.type === 'assignment' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50'}`}>
                  <input type="radio" value="assignment" checked={form.type === 'assignment'} onChange={e => setForm({...form, type: e.target.value})} className="hidden" />
                  <FiFileText /> Assignment (PDF/Doc)
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer ${form.type === 'test' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'hover:bg-gray-50'}`}>
                  <input type="radio" value="test" checked={form.type === 'test'} onChange={e => setForm({...form, type: e.target.value})} className="hidden" />
                  <FiCheckCircle /> AI Test (Interactive)
                </label>
              </div>

              <input required placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border p-3 rounded-lg" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select required value={form.class} onChange={e => handleClassChange(e.target.value)} className="w-full border p-3 rounded-lg bg-white">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select required disabled={!form.class} value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full border p-3 rounded-lg bg-white disabled:bg-gray-100">
                  <option value="">{form.class ? 'Select Subject' : 'Select Class First'}</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" required value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full border p-3 rounded-lg text-gray-600" />
                <div className="relative">
                  <input type="file" id="assignment-file" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                  <label htmlFor="assignment-file" className="flex items-center justify-center gap-2 w-full border p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 text-gray-700">
                    {uploading ? <FiLoader className="animate-spin" /> : <FiUploadCloud />} 
                    {uploading ? 'Uploading...' : form.fileUrl ? 'File Attached ✓' : 'Attach PDF / Doc'}
                  </label>
                </div>
              </div>

              <textarea placeholder="Instructions..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border p-3 rounded-lg" rows="2" />

              {/* AI TEST BUILDER */}
              {form.type === 'test' && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800">Questions ({form.questions.length})</h4>
                    <button type="button" onClick={addQuestion} className="text-purple-600 font-bold text-sm flex items-center gap-1 hover:underline"><FiPlus /> Add Question</button>
                  </div>
                  {form.questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-gray-50 p-4 rounded-lg mb-3 relative">
                      <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-3 right-3 text-red-500"><FiTrash2 /></button>
                      <input required placeholder="Question..." value={q.questionText} onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)} className="w-full border p-2 rounded mb-2 text-sm" />
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {q.options.map((opt, oIndex) => (
                          <input key={oIndex} required placeholder={`Option ${oIndex + 1}`} value={opt} onChange={e => updateQuestion(qIndex, 'option', [oIndex, e.target.value])} className="border p-2 rounded text-sm" />
                        ))}
                      </div>
                      <select required value={q.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)} className="w-full border p-2 rounded text-sm bg-white">
                        <option value="">Select Correct Answer</option>
                        {q.options.map((opt, i) => opt && <option key={i} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold w-full hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Publishing...' : 'Publish to Pupils'}
              </button>
            </form>
          </div>

          {/* LIST EXISTING ASSIGNMENTS */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Published Assignments</h3>
            {existingAssignments.length === 0 ? <p className="text-gray-500 text-sm">Nothing published yet.</p> : (
              <div className="space-y-3">
                {existingAssignments.map(a => (
                  <div key={a._id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{a.title} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">{a.class} - {a.subject}</span></p>
                      <p className="text-xs text-gray-500">{a.type === 'test' ? 'AI Test' : 'Document/PDF'} • Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDelete('assignments', a._id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><FiTrash2 /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= RESOURCES TAB ================= */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-lg mb-4 text-emerald-700">Upload Resource</h3>
            <form onSubmit={handleResourceSubmit} className="space-y-4 max-w-2xl">
              <input required placeholder="Resource Title" value={resourceForm.title} onChange={e => setResourceForm({...resourceForm, title: e.target.value})} className="w-full border p-3 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select required value={resourceForm.class} onChange={e => handleClassChange(e.target.value, true)} className="w-full border p-3 rounded-lg bg-white">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select required disabled={!resourceForm.class} value={resourceForm.subject} onChange={e => setResourceForm({...resourceForm, subject: e.target.value})} className="w-full border p-3 rounded-lg bg-white disabled:bg-gray-100">
                  <option value="">{resourceForm.class ? 'Select Subject' : 'Select Class First'}</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <select value={resourceForm.type} onChange={e => setResourceForm({...resourceForm, type: e.target.value})} className="w-full border p-3 rounded-lg bg-white">
                <option value="Revision Note">Revision Note</option>
                <option value="Past Paper">Past Paper</option>
                <option value="Video">Video (YouTube Link)</option>
                <option value="Book">Book / PDF</option>
              </select>
              <input type="url" placeholder="Paste Link (YouTube/Drive) OR upload below" value={resourceForm.url} onChange={e => setResourceForm({...resourceForm, url: e.target.value})} className="w-full border p-3 rounded-lg" />
              <input type="file" id="resource-file" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
              <label htmlFor="resource-file" className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 rounded-lg cursor-pointer hover:bg-emerald-100">
                {uploading ? <FiLoader className="animate-spin text-emerald-600 text-3xl mb-2" /> : <FiUploadCloud className="text-emerald-600 text-3xl mb-2" />}
                <span className="text-sm font-bold text-emerald-700">{resourceForm.fileUrl ? 'File Attached ✓' : 'Upload File from Phone/PC'}</span>
              </label>
              <button type="submit" disabled={saving || uploading} className="bg-emerald-600 text-white px-4 py-3 rounded-lg font-bold w-full hover:bg-emerald-700 disabled:opacity-50">Save Resource</button>
            </form>
          </div>

          {/* LIST EXISTING RESOURCES */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Uploaded Resources</h3>
            {existingResources.length === 0 ? <p className="text-gray-500 text-sm">No resources uploaded yet.</p> : (
              <div className="space-y-3">
                {existingResources.map(r => (
                  <div key={r._id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{r.title} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">{r.class} - {r.subject}</span></p>
                      <a href={r.url || r.fileUrl} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"><FiExternalLink /> View Uploaded File</a>
                    </div>
                    <button onClick={() => handleDelete('resources', r._id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><FiTrash2 /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FEEDBACK TAB ================= */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-bold text-lg mb-4 text-orange-600">Write Student Feedback</h3>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Select Student</label>
              <select required value={feedbackForm.pupilId} onChange={e => setFeedbackForm({...feedbackForm, pupilId: e.target.value})} className="w-full border p-3 rounded-lg bg-white">
                <option value="">Choose a student...</option>
                {pupils.map(p => <option key={p._id} value={p._id}>{p.name} ({p.admNo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Subject (Optional)</label>
              <input placeholder="e.g., Mathematics" value={feedbackForm.subject} onChange={e => setFeedbackForm({...feedbackForm, subject: e.target.value})} className="w-full border p-3 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Comment / Feedback</label>
              <textarea required rows="4" placeholder="Type your feedback here..." value={feedbackForm.comment} onChange={e => setFeedbackForm({...feedbackForm, comment: e.target.value})} className="w-full border p-3 rounded-lg" />
            </div>
            <button type="submit" disabled={saving} className="bg-orange-500 text-white px-4 py-3 rounded-lg font-bold w-full hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        </div>
      )}

    </Layout>
  );
}