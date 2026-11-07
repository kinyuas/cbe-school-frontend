// src/components/admin/SchoolSettings.jsx
import React, { useState, useEffect, useRef } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { compressImage } from '../../utils/imageCompress';
import {
  FiSave, FiPlus, FiTrash2, FiX, FiCheck, FiRefreshCw,
  FiBookOpen, FiUserPlus, FiMail, FiPhone, FiAward, FiTarget,
  FiFileText, FiImage, FiUpload, FiInfo, FiEye
} from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ============================================================
   Device detection
   ============================================================ */
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
    viewportWidth: 0, viewportHeight: 0
  });
  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent;
      const w = window.innerWidth;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || w < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (w >= 768 && w < 1024);
      setDeviceInfo({
        type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        isMobile, isTablet, isDesktop: !isMobile && !isTablet,
        viewportWidth: w, viewportHeight: window.innerHeight
      });
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);
  return deviceInfo;
};

const Card = ({ title, icon, children, deviceInfo, accent = 'text-green-600' }) => (
  <div className="bg-white rounded-xl shadow-md p-5 mb-5">
    <h2 className={`font-bold text-gray-800 mb-4 flex items-center gap-2 ${deviceInfo.isMobile ? 'text-base' : 'text-lg'}`}>
      <span className={accent}>{icon}</span> {title}
    </h2>
    {children}
  </div>
);

/* ============================================================
   Static class catalogue
   ============================================================ */
const CBE_LEVELS = {
  'Early Years Education': ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2'],
  'Lower Primary': ['Grade 1', 'Grade 2', 'Grade 3'],
  'Upper Primary': ['Grade 4', 'Grade 5', 'Grade 6'],
  'Junior Secondary': ['Grade 7', 'Grade 8', 'Grade 9'],
  'Senior Secondary': ['Grade 10', 'Grade 11', 'Grade 12'],
};
const LEVEL_ORDER = Object.keys(CBE_LEVELS);
const ALL_CBE_CLASSES = LEVEL_ORDER.flatMap((l) => CBE_LEVELS[l]);
const CLASS_ORDER = ALL_CBE_CLASSES;

/* ============================================================
   MAIN
   ============================================================ */
const SchoolSettings = () => {
  const deviceInfo = useDeviceDetection();
  const logoInputRef = useRef(null);

  const [schoolInfo, setSchoolInfo] = useState({
    name: '', email: '', phone: '', address: '', motto: '',
    logo: '', website: '', maxStreamsPerClass: 1, classes: []
  });
  const [newClassName, setNewClassName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [streamNames, setStreamNames] = useState({});
  const [maxStreams, setMaxStreams] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isLoadingPupils, setIsLoadingPupils] = useState(false);

  // Bursar
  const [bursar, setBursar] = useState(null);
  const [feesControl, setFeesControl] = useState({ controlledBy: 'admin', adminWriteAccess: true });
  const [showBursarForm, setShowBursarForm] = useState(false);
  const [bursarForm, setBursarForm] = useState({ name: '', email: '', phone: '', password: '', code: '' });
  const [bursarStep, setBursarStep] = useState('form');
  const [bursarLoading, setBursarLoading] = useState(false);
  const [showBursarPassword, setShowBursarPassword] = useState(false);

  // Skills config
  const [skillsConfig, setSkillsConfig] = useState({
    categories: [], proficiencyLevels: [],
    requireEvidenceNotes: false, allowTeacherDelete: true
  });
  const [newCategory, setNewCategory] = useState('');
  const [newProficiency, setNewProficiency] = useState({ name: '', rank: '' });

  // AI weighting
  const [aiWeighting, setAiWeighting] = useState({
    academic: 60, skills: 30, interests: 10, dynamicEnabled: false
  });

  // Career mapping
  const [careerMapping, setCareerMapping] = useState([]);

  // Report card config
  const [reportCardConfig, setReportCardConfig] = useState({
    showFeesOnReportCard: false,
    showFeesOnClassReport: false,
    showFeesOnStreamReport: false,
    showFeesOnCombinedReport: false,
    whoCanEnableFees: 'admin'
  });

  const getClassOrder = (name) => {
    const i = CLASS_ORDER.indexOf(name);
    return i === -1 ? 999 : i;
  };
  const sortClassesByOrder = (arr) =>
    [...arr].sort((a, b) => getClassOrder(a.name) - getClassOrder(b.name));

  const activeClasses = sortClassesByOrder(schoolInfo.classes.filter((c) => c.isActive));
  const inactiveClasses = sortClassesByOrder(schoolInfo.classes.filter((c) => !c.isActive));

  useEffect(() => { loadSchoolData(); }, []);

  /* ============================================================
     LOAD
     ============================================================ */
  const loadSchoolData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/school/settings');
      if (res.data.success && res.data.data) {
        const s = res.data.data;
        let classes = s.classes || [];
        if (classes.length && typeof classes[0] === 'string') {
          classes = classes.map((name) => ({ name, streams: [], isActive: true }));
        }

        setSchoolInfo({
          name: s.schoolName || s.name || '',
          email: s.schoolEmail || s.email || '',
          phone: s.phoneNumber || s.phone || '',
          address: s.address || '',
          motto: s.motto || '',
          logo: s.schoolLogo || '',
          website: s.website || '',
          maxStreamsPerClass: s.maxStreamsPerClass || 1,
          classes,
        });
        setMaxStreams(s.maxStreamsPerClass || 1);

        const streams = {};
        classes.forEach((c) => { streams[c.name] = c.streams || []; });
        setStreamNames(streams);

        setBursar(s.bursar || null);
        setFeesControl(s.feesControl || { controlledBy: 'admin', adminWriteAccess: true });

        if (s.skillsConfig) setSkillsConfig({
          categories: s.skillsConfig.categories || [],
          proficiencyLevels: s.skillsConfig.proficiencyLevels || [],
          requireEvidenceNotes: !!s.skillsConfig.requireEvidenceNotes,
          allowTeacherDelete: s.skillsConfig.allowTeacherDelete !== false
        });

        if (s.aiWeighting) setAiWeighting({
          academic: s.aiWeighting.academic ?? 60,
          skills: s.aiWeighting.skills ?? 30,
          interests: s.aiWeighting.interests ?? 10,
          dynamicEnabled: !!s.aiWeighting.dynamicEnabled
        });

        setCareerMapping(s.careerPathwayMapping || []);

        if (s.reportCardConfig) setReportCardConfig({
          showFeesOnReportCard: !!s.reportCardConfig.showFeesOnReportCard,
          showFeesOnClassReport: !!s.reportCardConfig.showFeesOnClassReport,
          showFeesOnStreamReport: !!s.reportCardConfig.showFeesOnStreamReport,
          showFeesOnCombinedReport: !!s.reportCardConfig.showFeesOnCombinedReport,
          whoCanEnableFees: s.reportCardConfig.whoCanEnableFees || 'admin'
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load school data');
    } finally { setLoading(false); }
  };

  /* ============================================================
     SCHOOL INFO HANDLERS
     ============================================================ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSchoolInfo((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------- LOGO UPLOAD ---------- */
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Select an image (PNG, JPG)');
      return;
    }

    const t = toast.loading('Processing logo...');
    try {
      const compressed = await compressImage(file, {
        maxWidth: 400, maxHeight: 400, quality: 0.85, maxBytes: 400 * 1024
      });

      setSchoolInfo((prev) => ({ ...prev, logo: compressed }));

      setIsSavingLogo(true);
      const res = await api.put('/school/logo', { schoolLogo: compressed });
      if (res.data.success) {
        toast.success(`Logo saved (${Math.round(compressed.length / 1024)} KB)`, { id: t });
      } else {
        toast.error(res.data.message || 'Failed to save logo', { id: t });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to process image', { id: t });
    } finally {
      setIsSavingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    if (!window.confirm('Remove the school logo?')) return;
    setSchoolInfo((prev) => ({ ...prev, logo: '' }));
    try {
      const res = await api.put('/school/logo', { schoolLogo: null });
      if (res.data.success) toast.success('Logo removed');
    } catch { toast.error('Failed to remove logo'); }
  };

  /* ---------- MAX STREAMS ---------- */
  const handleMaxStreams = (e) => {
    const v = parseInt(e.target.value);
    setMaxStreams(v);
    setSchoolInfo((prev) => ({ ...prev, maxStreamsPerClass: v }));
  };

  /* ---------- STREAM HELPERS ---------- */
  // 🆕 If maxStreams === 1 and user tries to add a stream, auto-bump the cap
  const addStream = (cls) => {
    const curr = streamNames[cls] || [];
    let cap = maxStreams;

    if (cap < 2) {
      const ok = window.confirm(
        `You currently have only ${cap} stream allowed per class.\n\n` +
        `Enable streams (raise limit to 2+)?`
      );
      if (!ok) return;
      cap = Math.max(2, curr.length + 1);
      setMaxStreams(cap);
      setSchoolInfo((prev) => ({ ...prev, maxStreamsPerClass: cap }));
      toast.success(`Streams enabled — limit is now ${cap}`);
    }

    if (curr.length >= cap) {
      toast.error(`Max ${cap} stream(s). Raise the limit to add more.`);
      return;
    }
    setStreamNames((prev) => ({ ...prev, [cls]: [...curr, ''] }));
  };

  const removeStream = (cls, idx) => {
    setStreamNames((prev) => ({ ...prev, [cls]: (prev[cls] || []).filter((_, i) => i !== idx) }));
  };

  const updateStream = (cls, idx, val) => {
    setStreamNames((prev) => {
      const arr = [...(prev[cls] || [])];
      arr[idx] = val;
      return { ...prev, [cls]: arr };
    });
  };

  /* ---------- CLASS TOGGLE ---------- */
  const toggleClassActive = (name) => {
    setSchoolInfo((prev) => ({
      ...prev,
      classes: prev.classes.map((c) =>
        c.name === name ? { ...c, isActive: !c.isActive } : c
      ),
    }));
  };

  const addClass = (name) => {
    const exists = schoolInfo.classes.some((c) => c.name === name);
    if (exists) {
      setSchoolInfo((prev) => ({
        ...prev,
        classes: prev.classes.map((c) =>
          c.name === name ? { ...c, isActive: true } : c
        ),
      }));
      return;
    }
    const cls = { name, streams: [], isActive: true };
    setSchoolInfo((prev) => ({
      ...prev,
      classes: sortClassesByOrder([...prev.classes, cls]),
    }));
    setStreamNames((prev) => ({ ...prev, [name]: [] }));
  };

  const removeClass = (name) => {
    if (!window.confirm(`Remove "${name}" completely?`)) return;
    setSchoolInfo((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.name !== name),
    }));
    setStreamNames((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const addCustomClass = () => {
    const name = newClassName.trim();
    if (!name) return toast.error('Enter class name');
    if (schoolInfo.classes.some((c) => c.name === name)) return toast.error('Already exists');
    addClass(name);
    setNewClassName('');
    setShowAddClass(false);
  };

  /* ============================================================
     SAVE SETTINGS
     ============================================================ */
  const saveSettings = async () => {
    if (!schoolInfo.name.trim()) return toast.error('School name is required');
    setIsSaving(true);
    try {
      const finalClasses = schoolInfo.classes.map((c) => ({
        name: c.name,
        streams: (streamNames[c.name] || [])
          .map((s) => String(s || '').trim())
          .filter(Boolean),
        isActive: c.isActive !== false,
      }));

      // 🆕 Auto-bump maxStreams if any class exceeds it
      const largestStreamCount = Math.max(0, ...finalClasses.map((c) => c.streams.length));
      const effectiveMax = Math.max(maxStreams, largestStreamCount);

      const payload = {
        name: schoolInfo.name,
        phoneNumber: schoolInfo.phone,
        address: schoolInfo.address,
        website: schoolInfo.website,
        motto: schoolInfo.motto,
        maxStreamsPerClass: effectiveMax,
        classes: finalClasses,
      };

      const res = await api.put('/school/settings', payload);
      if (res.data.success) {
        if (effectiveMax !== maxStreams) {
          toast.success(`Settings saved — stream limit auto-raised to ${effectiveMax}`);
        } else {
          toast.success('Settings saved');
        }
        await loadSchoolData();
      } else {
        toast.error(res.data.message || 'Save failed');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally { setIsSaving(false); }
  };

  /* ============================================================
     BURSAR (unchanged logic)
     ============================================================ */
  const sendBursarCode = async () => {
    if (!bursarForm.name.trim()) return toast.error('Name required');
    if (!/^\S+@\S+\.\S+$/.test(bursarForm.email)) return toast.error('Valid email required');
    if (!bursarForm.phone.trim()) return toast.error('Phone required');
    if (!/^\d{6}$/.test(bursarForm.password)) return toast.error('Password must be 6 digits');

    setBursarLoading(true);
    try {
      const res = await api.post('/school/bursar/send-code', {
        name: bursarForm.name, email: bursarForm.email,
        phone: bursarForm.phone, password: bursarForm.password,
      });
      if (res.data.success) {
        toast.success('Verification code sent');
        setBursarStep('verify');
      } else toast.error(res.data.message || 'Failed to send code');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error sending code');
    } finally { setBursarLoading(false); }
  };

  const registerBursar = async () => {
    if (!bursarForm.code || bursarForm.code.length !== 6) return toast.error('Enter 6-digit code');
    setBursarLoading(true);
    try {
      const res = await api.post('/school/bursar/register', { code: bursarForm.code });
      if (res.data.success) {
        toast.success('Bursar registered');
        setShowBursarForm(false);
        setBursarStep('form');
        setBursarForm({ name: '', email: '', phone: '', password: '', code: '' });
        await loadSchoolData();
      } else toast.error(res.data.message || 'Registration failed');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error registering bursar');
    } finally { setBursarLoading(false); }
  };

  const toggleBursarStatus = async () => {
    if (!bursar) return;
    const next = bursar.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${next === 'active' ? 'Reactivate' : 'Deactivate'} bursar?`)) return;
    try {
      const res = await api.patch('/school/bursar/status', { status: next });
      if (res.data.success) { toast.success(`Bursar ${next}`); await loadSchoolData(); }
    } catch { toast.error('Failed to update status'); }
  };

  const deleteBursar = async () => {
    if (!window.confirm('Delete bursar account?')) return;
    try {
      const res = await api.delete('/school/bursar');
      if (res.data.success) { toast.success('Bursar deleted'); await loadSchoolData(); }
    } catch { toast.error('Failed to delete bursar'); }
  };

  const transferFees = async () => {
    if (!window.confirm('Transfer fees control to Admin?')) return;
    try {
      const res = await api.post('/school/bursar/transfer-fees-to-admin');
      if (res.data.success) { toast.success('Transferred to Admin'); await loadSchoolData(); }
    } catch { toast.error('Failed to transfer'); }
  };

  /* ============================================================
     SKILLS CONFIG
     ============================================================ */
  const addSkillCategory = () => {
    if (!newCategory.trim()) return toast.error('Enter category');
    if (skillsConfig.categories.some((c) => c.name.toLowerCase() === newCategory.trim().toLowerCase()))
      return toast.error('Already exists');
    setSkillsConfig((prev) => ({
      ...prev,
      categories: [...prev.categories, { name: newCategory.trim(), active: true, order: prev.categories.length + 1 }],
    }));
    setNewCategory('');
  };

  const removeSkillCategory = (idx) => setSkillsConfig((prev) => ({
    ...prev, categories: prev.categories.filter((_, i) => i !== idx),
  }));

  const addProficiency = () => {
    if (!newProficiency.name.trim()) return toast.error('Enter level name');
    if (skillsConfig.proficiencyLevels.some((l) => l.name.toLowerCase() === newProficiency.name.trim().toLowerCase()))
      return toast.error('Already exists');
    const rank = newProficiency.rank ? parseInt(newProficiency.rank) : skillsConfig.proficiencyLevels.length + 1;
    const updated = [...skillsConfig.proficiencyLevels, { name: newProficiency.name.trim(), rank, active: true }]
      .sort((a, b) => a.rank - b.rank);
    setSkillsConfig((prev) => ({ ...prev, proficiencyLevels: updated }));
    setNewProficiency({ name: '', rank: '' });
  };

  const removeProficiency = (idx) => setSkillsConfig((prev) => ({
    ...prev, proficiencyLevels: prev.proficiencyLevels.filter((_, i) => i !== idx),
  }));

  const saveSkillsConfig = async () => {
    try {
      const res = await api.put('/school/skills-config', skillsConfig);
      if (res.data.success) {
        toast.success('Skills config saved');
        await loadSchoolData();
      }
    } catch { toast.error('Failed to save skills config'); }
  };

  /* ============================================================
     AI WEIGHTING & CAREER MAPPING
     ============================================================ */
  const saveAiWeighting = async () => {
    const total = aiWeighting.academic + aiWeighting.skills + aiWeighting.interests;
    if (total !== 100) return toast.error(`Weights must total 100% (currently ${total}%)`);
    try {
      const res = await api.put('/school/ai-weighting', aiWeighting);
      if (res.data.success) toast.success('AI weighting saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
  };

  const addCareerMapping = () => {
    if (!skillsConfig.categories.length) return toast.error('Add skill categories first');
    setCareerMapping((prev) => [...prev, { categoryName: skillsConfig.categories[0].name, careerClusters: [] }]);
  };

  const updateCareerMapping = (idx, field, val) => {
    setCareerMapping((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      if (field === 'categoryName') return { ...it, categoryName: val };
      if (field === 'careerClusters') return { ...it, careerClusters: val.split(',').map((s) => s.trim()).filter(Boolean) };
      return it;
    }));
  };

  const removeCareerMapping = (idx) => setCareerMapping((prev) => prev.filter((_, i) => i !== idx));

  const saveCareerMapping = async () => {
    try {
      const res = await api.put('/school/career-mapping', { mapping: careerMapping });
      if (res.data.success) toast.success('Career mapping saved');
    } catch { toast.error('Failed to save career mapping'); }
  };

  /* ============================================================
     REPORT CARD CONFIG
     ============================================================ */
  const toggleReportCard = (field) =>
    setReportCardConfig((prev) => ({ ...prev, [field]: !prev[field] }));

  const saveReportCardConfig = async () => {
    try {
      const res = await api.put('/school/report-card-config', reportCardConfig);
      if (res.data.success) toast.success('Report card config saved');
    } catch { toast.error('Failed to save'); }
  };

  /* ============================================================
     LOAD STREAMS FROM PUPILS
     ============================================================ */
  const loadStreamsFromPupils = async () => {
    setIsLoadingPupils(true);
    try {
      const res = await api.get('/pupils');
      if (res.data.success && res.data.data) {
        const map = {};
        res.data.data.forEach((p) => {
          if (p.class && p.stream) {
            if (!map[p.class]) map[p.class] = new Set();
            map[p.class].add(p.stream.trim());
          }
        });

        const updated = { ...streamNames };
        let changed = false;
        let maxFound = 0;
        Object.keys(map).forEach((cls) => {
          const arr = Array.from(map[cls]).filter(Boolean);
          if (arr.length) {
            updated[cls] = arr;
            changed = true;
            if (arr.length > maxFound) maxFound = arr.length;
          }
        });

        if (changed) {
          setStreamNames(updated);
          setSchoolInfo((prev) => ({
            ...prev,
            classes: prev.classes.map((c) => ({ ...c, streams: updated[c.name] || [] })),
          }));

          // 🆕 Auto-bump maxStreams if pupils have more streams than current config
          if (maxFound > maxStreams) {
            setMaxStreams(maxFound);
            setSchoolInfo((prev) => ({ ...prev, maxStreamsPerClass: maxFound }));
            toast.success(`Streams loaded — limit auto-raised to ${maxFound}`);
          } else {
            toast.success('Streams loaded from pupils');
          }
        } else toast('No streams found on pupils');
      }
    } catch { toast.error('Failed to load streams'); }
    finally { setIsLoadingPupils(false); }
  };

  /* ============================================================
     RENDER
     ============================================================ */
  const btn = deviceInfo.isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm';

  if (loading) {
    return (
      <Layout title="School Settings" subtitle="Configure your school">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  // 🆕 Live preview of skills (what teachers will actually see)
  const previewCategories = skillsConfig.categories.length > 0
    ? skillsConfig.categories
    : [];
  const previewLevels = skillsConfig.proficiencyLevels.length > 0
    ? [...skillsConfig.proficiencyLevels].sort((a, b) => (a.rank || 0) - (b.rank || 0))
    : [];

  return (
    <Layout title="School Settings" subtitle="Configure your school">

      {/* ============ 1. SCHOOL IDENTITY ============ */}
      <Card title="School Identity" icon={<FiImage />} deviceInfo={deviceInfo} accent="text-blue-600">
        <div className={`grid gap-5 ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[160px]">
            {schoolInfo.logo ? (
              <>
                <img src={schoolInfo.logo} alt="School logo" className="max-h-24 max-w-full object-contain mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => logoInputRef.current?.click()} disabled={isSavingLogo}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full disabled:opacity-50">
                    {isSavingLogo ? 'Saving...' : 'Change'}
                  </button>
                  <button onClick={removeLogo} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 mb-3 text-center">PNG / JPG · auto-compressed</p>
                <button onClick={() => logoInputRef.current?.click()} disabled={isSavingLogo}
                  className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-full disabled:opacity-50">
                  {isSavingLogo ? 'Saving...' : 'Upload Logo'}
                </button>
              </>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>

          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
              <input type="text" name="name" value={schoolInfo.name} onChange={handleChange}
                placeholder="e.g., Neema Academy" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motto</label>
              <input type="text" name="motto" value={schoolInfo.motto} onChange={handleChange}
                placeholder="e.g., Quality Education for All" className="input-field w-full" />
            </div>
          </div>
        </div>

        <div className={`grid gap-3 mt-4 ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={schoolInfo.email} onChange={handleChange}
              placeholder="school@example.com" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" name="phone" value={schoolInfo.phone} onChange={handleChange}
              placeholder="+254 700 000000" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input type="text" name="website" value={schoolInfo.website} onChange={handleChange}
              placeholder="www.school.com" className="input-field w-full" />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" name="address" value={schoolInfo.address} onChange={handleChange}
            placeholder="Full address" className="input-field w-full" />
        </div>
      </Card>

      {/* ============ 2. CLASSES & STREAMS (🆕 rewritten) ============ */}
      <Card title="Classes & Streams" icon={<FiBookOpen />} deviceInfo={deviceInfo} accent="text-green-600">
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Streams / Class</label>
            <select value={maxStreams} onChange={handleMaxStreams}
              className={`input-field ${deviceInfo.isMobile ? 'w-full' : 'w-40'}`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n === 1 ? '1 (no streams)' : n}</option>
              ))}
            </select>
          </div>
          <button onClick={loadStreamsFromPupils} disabled={isLoadingPupils}
            className={`bg-blue-600 text-white rounded-lg flex items-center gap-2 ${btn} disabled:opacity-50`}>
            <FiRefreshCw className={isLoadingPupils ? 'animate-spin' : ''} />
            Load from Pupils
          </button>
        </div>

        {/* 🆕 Hint when streams disabled */}
        {maxStreams === 1 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-800">
            <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Streams are disabled (1 per class).</strong> Set the max above to 2+ to
              enable streams. If you try to add a stream while this is 1, you'll be prompted
              to enable them.
            </div>
          </div>
        )}

        {/* CBE Category picker */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            CBE Categories — tick to add
          </p>
          <div className={`grid gap-3 ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
            {LEVEL_ORDER.map((level) => (
              <div key={level} className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-semibold text-gray-700 text-xs mb-2">{level}</h4>
                {(CBE_LEVELS[level] || []).map((cls) => {
                  const entry = schoolInfo.classes.find((c) => c.name === cls);
                  const isActive = entry?.isActive === true;
                  const inList = !!entry;
                  return (
                    <label key={cls}
                      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-xs ${isActive ? 'bg-green-50' : 'hover:bg-gray-100'}`}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => {
                          if (isActive) toggleClassActive(cls);
                          else addClass(cls);
                        }}
                        className="w-3.5 h-3.5 text-blue-600"
                      />
                      <span className={isActive ? 'font-medium text-green-700' : inList ? 'text-gray-500 line-through' : ''}>
                        {cls}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Active class cards */}
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Active Classes ({activeClasses.length})
        </p>

        {activeClasses.length === 0 ? (
          <p className="text-center py-6 text-gray-400 italic text-sm">
            No classes yet — tick a category above
          </p>
        ) : (
          <div className="space-y-2">
            {activeClasses.map((cls) => {
              const streamsForClass = streamNames[cls.name] || [];
              return (
                <div key={cls.name} className="border rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{cls.name}</span>
                      {streamsForClass.length > 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          {streamsForClass.length} stream{streamsForClass.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => toggleClassActive(cls.name)}
                        className="text-red-500 text-xs hover:underline">Deactivate</button>
                      {!ALL_CBE_CLASSES.includes(cls.name) && (
                        <button onClick={() => removeClass(cls.name)}
                          className="text-red-600 text-xs hover:underline">Remove</button>
                      )}
                    </div>
                  </div>

                  {/* 🆕 Streams ALWAYS visible (not only when maxStreams > 1) */}
                  <div className="mt-2 pl-3 border-l-2 border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Streams</p>
                      {streamsForClass.length === 0 && maxStreams === 1 && (
                        <button onClick={() => addStream(cls.name)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                          + Enable streams
                        </button>
                      )}
                    </div>

                    {/* Show existing streams as chips */}
                    {streamsForClass.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {streamsForClass.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 px-2 py-0.5 rounded text-[11px] font-medium">
                            {s || '(unnamed)'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Editable streams */}
                    {streamsForClass.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center mb-1">
                        <input type="text" value={s}
                          onChange={(e) => updateStream(cls.name, i, e.target.value)}
                          placeholder={`Stream ${i + 1} (e.g., A, Blue)`}
                          className="input-field flex-1 text-xs py-1" />
                        <button onClick={() => removeStream(cls.name, i)} className="text-red-500">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {streamsForClass.length < maxStreams && (
                      <button onClick={() => addStream(cls.name)}
                        className="text-green-600 text-xs flex items-center gap-1 mt-1">
                        <FiPlus className="w-3 h-3" /> Add Stream
                      </button>
                    )}
                    {streamsForClass.length >= maxStreams && maxStreams > 1 && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        Limit reached ({maxStreams}). Raise "Max Streams / Class" above to add more.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom class + inactive */}
        {showAddClass ? (
          <div className="mt-4 flex gap-2">
            <input type="text" value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Custom class name" className="input-field flex-1" />
            <button onClick={addCustomClass} className={`bg-green-600 text-white rounded-lg ${btn}`}>
              <FiCheck className="inline w-4 h-4" /> Add
            </button>
            <button onClick={() => setShowAddClass(false)} className={`bg-gray-400 text-white rounded-lg ${btn}`}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddClass(true)}
            className="mt-4 text-green-600 text-sm flex items-center gap-1">
            <FiPlus className="w-4 h-4" /> Add Custom Class
          </button>
        )}

        {inactiveClasses.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-1">Inactive:</p>
            <div className="flex flex-wrap gap-2">
              {inactiveClasses.map((c) => (
                <button key={c.name} onClick={() => toggleClassActive(c.name)}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs hover:bg-gray-300">
                  {c.name} <FiRefreshCw className="inline w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ============ 3. REPORT CARD DISPLAY ============ */}
      <Card title="Report Card Display" icon={<FiFileText />} deviceInfo={deviceInfo} accent="text-pink-600">
        <div className="space-y-2">
          {[
            { key: 'showFeesOnReportCard', label: 'Show fees on individual report cards' },
            { key: 'showFeesOnClassReport', label: 'Show fees on class reports' },
            { key: 'showFeesOnStreamReport', label: 'Show fees on stream reports' },
            { key: 'showFeesOnCombinedReport', label: 'Show fees on combined exam reports' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={reportCardConfig[key]}
                onChange={() => toggleReportCard(key)} className="w-4 h-4" />
              {label}
            </label>
          ))}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who can enable fees on reports
            </label>
            <select value={reportCardConfig.whoCanEnableFees}
              onChange={(e) => setReportCardConfig((prev) => ({ ...prev, whoCanEnableFees: e.target.value }))}
              className="input-field w-full md:w-64">
              <option value="admin">Admin only</option>
              <option value="admin_bursar">Admin + Bursar</option>
            </select>
          </div>
          <button onClick={saveReportCardConfig}
            className={`mt-3 bg-pink-600 text-white rounded-lg ${btn}`}>
            <FiSave className="inline w-4 h-4 mr-1" /> Save
          </button>
        </div>
      </Card>

      {/* ============ 4. SKILLS & TALENTS (🆕 with live preview) ============ */}
      <Card title="Skills & Talents" icon={<FiAward />} deviceInfo={deviceInfo} accent="text-orange-600">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Categories</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {skillsConfig.categories.map((cat, i) => (
              <span key={i} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                {cat.name}
                <button onClick={() => removeSkillCategory(i)} className="text-red-500">
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!skillsConfig.categories.length && (
              <span className="text-xs italic text-gray-400">None yet</span>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category (e.g., Sports, Music, ICT)"
              className="input-field flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addSkillCategory()} />
            <button onClick={addSkillCategory} className="bg-orange-600 text-white rounded-lg px-3 py-1.5 text-sm">
              <FiPlus className="inline w-3 h-3" /> Add
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Proficiency Levels</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {skillsConfig.proficiencyLevels.map((lvl, i) => (
              <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                {lvl.name} ({lvl.rank})
                <button onClick={() => removeProficiency(i)} className="text-red-500">
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!skillsConfig.proficiencyLevels.length && (
              <span className="text-xs italic text-gray-400">None yet</span>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newProficiency.name}
              onChange={(e) => setNewProficiency((p) => ({ ...p, name: e.target.value }))}
              placeholder="Level name (e.g., Beginner, Advanced)"
              className="input-field flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addProficiency()} />
            <input type="number" value={newProficiency.rank}
              onChange={(e) => setNewProficiency((p) => ({ ...p, rank: e.target.value }))}
              placeholder="Rank" className="input-field w-20 text-sm" />
            <button onClick={addProficiency} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm">
              <FiPlus className="inline w-3 h-3" /> Add
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={skillsConfig.requireEvidenceNotes}
              onChange={(e) => setSkillsConfig((p) => ({ ...p, requireEvidenceNotes: e.target.checked }))}
              className="w-4 h-4" />
            Require evidence notes
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={skillsConfig.allowTeacherDelete}
              onChange={(e) => setSkillsConfig((p) => ({ ...p, allowTeacherDelete: e.target.checked }))}
              className="w-4 h-4" />
            Allow teachers to delete entries
          </label>
        </div>

        {/* 🆕 LIVE PREVIEW — what teachers/pupils will see */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <FiEye className="w-3.5 h-3.5" /> Preview — what teachers/pupils will see
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-medium text-orange-700 mb-1">Category dropdown:</p>
              {previewCategories.length === 0 ? (
                <p className="text-gray-400 italic">No categories — teachers will see an empty dropdown</p>
              ) : (
                <ul className="bg-white border rounded p-2 space-y-0.5">
                  {previewCategories.map((c) => (
                    <li key={c.name} className="text-gray-700">• {c.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-medium text-blue-700 mb-1">Proficiency dropdown:</p>
              {previewLevels.length === 0 ? (
                <p className="text-gray-400 italic">No levels — teachers will see an empty dropdown</p>
              ) : (
                <ul className="bg-white border rounded p-2 space-y-0.5">
                  {previewLevels.map((l) => (
                    <li key={l.name} className="text-gray-700">
                      • {l.name} <span className="text-gray-400">(rank {l.rank})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <button onClick={saveSkillsConfig} className={`mt-4 bg-orange-600 text-white rounded-lg ${btn}`}>
          <FiSave className="inline w-4 h-4 mr-1" /> Save
        </button>
      </Card>

      {/* ============ 5. BURSAR ============ */}
      <Card title="Bursar / Accountant" icon={<FiUserPlus />} deviceInfo={deviceInfo} accent="text-purple-600">
        {!bursar && !showBursarForm && (
          <div className="text-center py-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">No bursar registered</p>
            <button onClick={() => setShowBursarForm(true)}
              className={`bg-purple-600 text-white rounded-lg ${btn}`}>
              <FiUserPlus className="inline w-4 h-4 mr-1" /> Register
            </button>
          </div>
        )}

        {showBursarForm && bursarStep === 'form' && (
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
            {['name', 'email', 'phone'].map((f) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{f} *</label>
                <input type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'}
                  name={f} value={bursarForm[f]}
                  onChange={(e) => setBursarForm((p) => ({ ...p, [f]: e.target.value }))}
                  className="input-field w-full text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Login Password (6 digits) *</label>
              <div className="relative">
                <input type={showBursarPassword ? 'text' : 'password'}
                  value={bursarForm.password}
                  onChange={(e) => setBursarForm((p) => ({
                    ...p, password: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))}
                  maxLength={6} inputMode="numeric"
                  className="input-field w-full pr-12 tracking-widest font-mono" />
                <button type="button" onClick={() => setShowBursarPassword(!showBursarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showBursarPassword ? '🙈' : '👁'}
                </button>
              </div>
              <button type="button"
                onClick={() => {
                  const c = Math.floor(100000 + Math.random() * 900000).toString();
                  setBursarForm((p) => ({ ...p, password: c }));
                  setShowBursarPassword(true);
                }}
                className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full mt-2">
                🔄 Generate
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={sendBursarCode} disabled={bursarLoading || bursarForm.password.length !== 6}
                className={`bg-purple-600 text-white rounded-lg disabled:opacity-50 ${btn}`}>
                {bursarLoading ? 'Sending...' : 'Send Code'}
              </button>
              <button onClick={() => {
                setShowBursarForm(false); setBursarStep('form');
                setBursarForm({ name: '', email: '', phone: '', password: '', code: '' });
              }} className={`bg-gray-300 text-gray-700 rounded-lg ${btn}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showBursarForm && bursarStep === 'verify' && (
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
            <p className="text-xs text-gray-600">Code sent to <strong>{bursarForm.email}</strong></p>
            <input type="text" value={bursarForm.code}
              onChange={(e) => setBursarForm((p) => ({
                ...p, code: e.target.value.replace(/\D/g, '').slice(0, 6),
              }))}
              maxLength={6} placeholder="000000"
              className="input-field w-full text-center text-xl tracking-widest" />
            <div className="flex gap-2">
              <button onClick={registerBursar} disabled={bursarLoading || bursarForm.code.length !== 6}
                className={`bg-green-600 text-white rounded-lg disabled:opacity-50 ${btn}`}>
                {bursarLoading ? 'Registering...' : 'Verify & Register'}
              </button>
              <button onClick={() => setBursarStep('form')}
                className={`bg-gray-300 text-gray-700 rounded-lg ${btn}`}>
                Back
              </button>
            </div>
          </div>
        )}

        {bursar && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
              <div>
                <p className="font-bold">{bursar.name}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <FiMail className="w-3 h-3" /> {bursar.email}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <FiPhone className="w-3 h-3" /> {bursar.phone}
                </p>
                <p className="text-xs mt-1">
                  Status: <span className={bursar.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {bursar.status}
                  </span>
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                feesControl.controlledBy === 'bursar'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                Fees: {feesControl.controlledBy}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleBursarStatus} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs">
                {bursar.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </button>
              <button onClick={transferFees} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">
                Transfer Fees to Admin
              </button>
              <button onClick={deleteBursar} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs">
                Delete
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ============ 6. ADVANCED ============ */}
      <details className="bg-white rounded-xl shadow-md p-5 mb-5">
        <summary className="cursor-pointer font-bold text-gray-800 text-sm flex items-center gap-2">
          <FiTarget className="text-indigo-600" /> Advanced: AI Weighting & Career Mapping
        </summary>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">AI Career Insight Weighting</p>
            {['academic', 'skills', 'interests'].map((f) => (
              <div key={f} className="mb-2">
                <label className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span className="capitalize">{f}</span>
                  <span>{aiWeighting[f]}%</span>
                </label>
                <input type="range" min="0" max="100" value={aiWeighting[f]}
                  onChange={(e) => setAiWeighting((p) => ({ ...p, [f]: parseInt(e.target.value) || 0 }))}
                  className="w-full" />
              </div>
            ))}
            <p className={`text-xs font-semibold ${
              aiWeighting.academic + aiWeighting.skills + aiWeighting.interests === 100
                ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {aiWeighting.academic + aiWeighting.skills + aiWeighting.interests}%
            </p>
            <label className="flex items-center gap-2 text-xs mt-2">
              <input type="checkbox" checked={aiWeighting.dynamicEnabled}
                onChange={(e) => setAiWeighting((p) => ({ ...p, dynamicEnabled: e.target.checked }))}
                className="w-4 h-4" />
              Dynamic weighting
            </label>
            <button onClick={saveAiWeighting} className={`mt-3 bg-indigo-600 text-white rounded-lg ${btn}`}>
              <FiSave className="inline w-4 h-4 mr-1" /> Save
            </button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs font-semibold text-gray-700 mb-2">Career Pathway Mapping</p>
            {careerMapping.map((item, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center mb-2">
                <select value={item.categoryName}
                  onChange={(e) => updateCareerMapping(i, 'categoryName', e.target.value)}
                  className="input-field flex-1 min-w-[140px] text-sm">
                  {skillsConfig.categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <input type="text" value={item.careerClusters.join(', ')}
                  onChange={(e) => updateCareerMapping(i, 'careerClusters', e.target.value)}
                  placeholder="Careers (comma-separated)"
                  className="input-field flex-[2] min-w-[180px] text-sm" />
                <button onClick={() => removeCareerMapping(i)} className="text-red-500 p-2">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={addCareerMapping} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm">
                <FiPlus className="inline w-3 h-3" /> Add
              </button>
              <button onClick={saveCareerMapping} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">
                <FiSave className="inline w-3 h-3" /> Save
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* SAVE ALL */}
      <div className={`flex ${deviceInfo.isMobile ? 'flex-col' : 'justify-end'}`}>
        <button onClick={saveSettings} disabled={isSaving}
          className={`bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 ${
            deviceInfo.isMobile ? 'w-full py-4 text-base' : 'px-6 py-3'
          }`}>
          <FiSave /> {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
        </button>
      </div>
    </Layout>
  );
};

export default SchoolSettings;