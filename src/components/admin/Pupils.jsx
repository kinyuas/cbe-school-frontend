import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../common/Layout';
import AddPupilModal from '../modals/AddPupilModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiX, FiSearch, FiUsers, FiAlertCircle, FiDownload, FiFileText, 
  FiFile, FiArrowRight, FiAward, FiUserPlus, FiInfo,
  FiEdit2, FiTrash2, FiCheckCircle, FiAlertTriangle, FiSend,
  FiFilter, FiMonitor, FiSmartphone, FiTablet
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    screenWidth: 0,
    screenHeight: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    os: 'unknown',
    browser: 'unknown',
    pixelRatio: 1,
    viewportWidth: 0,
    viewportHeight: 0,
    connectionType: 'unknown',
    isTouchDevice: false
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Detect OS
      let os = 'unknown';
      if (/Windows/i.test(ua)) os = 'windows';
      else if (/Mac OS X/i.test(ua)) os = 'macos';
      else if (/Linux/i.test(ua)) os = 'linux';
      else if (/Android/i.test(ua)) os = 'android';
      else if (/iOS|iPhone|iPad/i.test(ua)) os = 'ios';
      
      // Detect Browser
      let browser = 'unknown';
      if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'chrome';
      else if (/Firefox/i.test(ua)) browser = 'firefox';
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';
      else if (/Edge/i.test(ua)) browser = 'edge';
      else if (/Opera|OPR/i.test(ua)) browser = 'opera';
      
      // Detect connection type
      let connectionType = 'unknown';
      if (navigator.connection) {
        connectionType = navigator.connection.effectiveType || 'unknown';
      }
      
      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';
      
      setDeviceInfo({
        type,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        isMobile,
        isTablet,
        isDesktop,
        os,
        browser,
        pixelRatio,
        viewportWidth: width,
        viewportHeight: height,
        connectionType,
        isTouchDevice
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== AI Responsive Component Wrapper =====
const ResponsiveWrapper = ({ children, deviceInfo, className = '' }) => {
  const getResponsiveClass = () => {
    if (deviceInfo.isMobile) return 'mobile-view';
    if (deviceInfo.isTablet) return 'tablet-view';
    return 'desktop-view';
  };

  return (
    <div className={`responsive-wrapper ${getResponsiveClass()} ${className}`}>
      {children}
    </div>
  );
};

// ===== AI Grid Layout Helper =====
const useResponsiveGrid = (deviceInfo) => {
  if (deviceInfo.isMobile) return 'grid-cols-1';
  if (deviceInfo.isTablet) return 'grid-cols-2 md:grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
};

const Pupils = () => {
  const navigate = useNavigate();
  
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsiveGrid = useResponsiveGrid(deviceInfo);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  
  // State variables
  const [pupils, setPupils] = useState([]);
  const [transferredLearners, setTransferredLearners] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPupil, setEditingPupil] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStream, setSelectedStream] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState({ classes: [], name: '', motto: '', poBox: '', phone: '', email: '' });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  
  // Data retention state - stores previously entered data
  const [retainedData, setRetainedData] = useState({
    studentName: '',
    admNo: '',
    birthCertNo: '',
    dateOfBirth: '',
    gender: '',
    className: '',
    stream: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    medicalInfo: '',
    previousSchool: ''
  });

  // Data retention helper - saves form data when modal closes
  const saveRetainedData = (formData) => {
    setRetainedData(prev => ({
      ...prev,
      ...formData
    }));
    // Also save to localStorage for persistence across page refreshes
    try {
      localStorage.setItem('retainedStudentData', JSON.stringify({ ...retainedData, ...formData }));
    } catch (e) {
      console.log('Could not save retained data to localStorage');
    }
  };

  // Load retained data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retainedStudentData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRetainedData(parsed);
        console.log('Loaded retained student data:', parsed);
      }
    } catch (e) {
      console.log('Could not load retained data from localStorage');
    }
  }, []);

  // Clear retained data after successful save
  const clearRetainedData = () => {
    setRetainedData({
      studentName: '',
      admNo: '',
      birthCertNo: '',
      dateOfBirth: '',
      gender: '',
      className: '',
      stream: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      address: '',
      medicalInfo: '',
      previousSchool: ''
    });
    try {
      localStorage.removeItem('retainedStudentData');
    } catch (e) {
      console.log('Could not clear retained data from localStorage');
    }
  };

  // Promote/Graduate Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteClassData, setPromoteClassData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [promoteAction, setPromoteAction] = useState('promote');
  
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedPupil, setSelectedPupil] = useState(null);
  const [transferData, setTransferData] = useState({
    reason: '',
    destinationSchool: '',
    remarks: ''
  });
  
  // Student Detail Modal
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  
  // Download Modal State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('excel');
  const [downloadClass, setDownloadClass] = useState('');
  const [downloadStream, setDownloadStream] = useState('');
  const [availableStreamsForDownload, setAvailableStreamsForDownload] = useState([]);

  // Load data from API on mount
  useEffect(() => {
    loadData();
  }, []);

  // Update streams when class changes for filtering
  useEffect(() => {
    if (selectedClass && selectedClass !== 'all') {
      const pupilsInClass = pupils.filter(p => p.class === selectedClass);
      const streams = [...new Set(pupilsInClass.map(s => s.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, pupils]);

  // Update streams for download modal when download class changes
  useEffect(() => {
    if (downloadClass && downloadClass !== 'all') {
      const studentsInClass = pupils.filter(p => p.class === downloadClass);
      const streams = [...new Set(studentsInClass.map(s => s.stream).filter(Boolean))];
      setAvailableStreamsForDownload(streams);
      setDownloadStream('');
    } else {
      setAvailableStreamsForDownload([]);
      setDownloadStream('');
    }
  }, [downloadClass, pupils]);

  const loadData = async () => {
    setLoading(true);
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo(school);
        const activeClasses = (school.classes || [])
          .filter(c => c.isActive !== false)
          .map(c => c.name);
        setAvailableClasses(activeClasses);
      } else {
        setAvailableClasses(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']);
      }
      
      const pupilsResponse = await api.get('/pupils');
      if (pupilsResponse.data.success) {
        setPupils(pupilsResponse.data.data || []);
      }
      
      const transferredResponse = await api.get('/transferred');
      if (transferredResponse.data.success) {
        setTransferredLearners(transferredResponse.data.data || []);
      }
      
      const alumniResponse = await api.get('/alumni');
      if (alumniResponse.data.success) {
        setAlumni(alumniResponse.data.data || []);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getNextClass = (currentClass) => {
    const classOrder = availableClasses;
    const currentIndex = classOrder.indexOf(currentClass);
    
    if (currentIndex === -1) return null;
    if (currentIndex === classOrder.length - 1) return 'graduate';
    return classOrder[currentIndex + 1];
  };

  const handlePromoteClass = (className) => {
    const classStudents = pupils.filter(p => p.class === className);
    if (classStudents.length === 0) {
      toast.error(`No students found in ${className}`);
      return;
    }
    
    const nextClass = getNextClass(className);
    if (!nextClass) {
      toast.error(`Cannot promote from ${className}. No higher class configured.`);
      return;
    }
    
    setPromoteClassData({ className, nextClass, students: classStudents });
    setSelectedStudents(classStudents.map(s => s._id));
    setPromoteAction(nextClass === 'graduate' ? 'graduate' : 'promote');
    setShowPromoteModal(true);
  };

  const handleGraduateClass = (className) => {
    const classStudents = pupils.filter(p => p.class === className);
    if (classStudents.length === 0) {
      toast.error(`No students found in ${className}`);
      return;
    }
    
    setPromoteClassData({ className, nextClass: 'alumni', students: classStudents });
    setSelectedStudents(classStudents.map(s => s._id));
    setPromoteAction('graduate');
    setShowPromoteModal(true);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === promoteClassData?.students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(promoteClassData?.students.map(s => s._id) || []);
    }
  };

  const confirmPromotion = async () => {
    if (!promoteClassData || selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    
    try {
      if (promoteAction === 'graduate') {
        const response = await api.post('/pupils/graduate', { pupilIds: selectedStudents });
        if (response.data.success) {
          toast.success(response.data.message);
          loadData();
        }
      } else {
        const response = await api.post('/pupils/promote', { 
          pupilIds: selectedStudents,
          currentClass: promoteClassData.className,
          nextClass: promoteClassData.nextClass
        });
        if (response.data.success) {
          toast.success(response.data.message);
          loadData();
        }
      }
    } catch (error) {
      console.error('Error in promotion:', error);
      toast.error(error.response?.data?.message || 'Failed to process promotion');
    }
    
    setShowPromoteModal(false);
    setPromoteClassData(null);
    setSelectedStudents([]);
  };

  const handleTransferClick = (pupil) => {
    setSelectedPupil(pupil);
    setTransferData({
      reason: '',
      destinationSchool: '',
      remarks: ''
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async () => {
    if (!transferData.reason) {
      toast.error('Please provide a transfer reason');
      return;
    }
    
    try {
      const response = await api.post(`/pupils/${selectedPupil._id}/transfer`, transferData);
      if (response.data.success) {
        toast.success(`${selectedPupil.name} has been transferred successfully`);
        loadData();
        setShowTransferModal(false);
        setSelectedPupil(null);
      } else {
        toast.error(response.data.message || 'Failed to transfer student');
      }
    } catch (error) {
      console.error('Error transferring student:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer student');
    }
  };

  const handleViewStudent = (pupil) => {
    setViewingStudent(pupil);
    setShowStudentDetail(true);
  };

  const handleEditStudent = (pupil) => {
    setEditingPupil(pupil);
    setIsEditModalOpen(true);
  };

  const handleUpdatePupil = async (updatedData) => {
    try {
      const response = await api.put(`/pupils/${editingPupil._id}`, updatedData);
      if (response.data.success) {
        toast.success('Student updated successfully');
        loadData();
        setIsEditModalOpen(false);
        setEditingPupil(null);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      
      // Enhanced error handling with field-specific feedback
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(field => {
          toast.error(`${field}: ${errors[field]}`);
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to update student');
      }
    }
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/pupils/${id}`);
        if (response.data.success) {
          toast.success('Student deleted successfully');
          loadData();
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error(error.response?.data?.message || 'Failed to delete student');
      }
    }
  };

  const handleAddPupil = async (pupilData) => {
    try {
      const response = await api.post('/pupils', pupilData);
      if (response.data.success) {
        toast.success('Student added successfully');
        // Clear retained data on successful save
        clearRetainedData();
        loadData();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding student:', error);
      
      // Enhanced error handling with field-specific feedback
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        let errorMessages = [];
        Object.keys(errors).forEach(field => {
          errorMessages.push(`${field}: ${errors[field]}`);
          toast.error(`${field}: ${errors[field]}`);
        });
        
        // Show a summary toast with all errors
        toast.error(`Please fix ${Object.keys(errors).length} field(s) and try again.`);
        
        // Save the data that was entered for retention
        saveRetainedData(pupilData);
      } else {
        toast.error(error.response?.data?.message || 'Failed to add student');
        // Save the data that was entered for retention
        saveRetainedData(pupilData);
      }
    }
  };

  const filteredPupils = pupils.filter(pupil => {
    const matchesSearch = searchTerm === '' || 
      pupil.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pupil.admNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || pupil.class === selectedClass;
    const matchesStream = !selectedStream || selectedStream === '' || pupil.stream === selectedStream;
    return matchesSearch && matchesClass && matchesStream;
  });

  const sortedPupils = [...filteredPupils].sort((a, b) => {
    let aVal, bVal;
    if (sortBy === 'name') {
      aVal = a.name || '';
      bVal = b.name || '';
    } else {
      aVal = a.admNo || '';
      bVal = b.admNo || '';
    }
    if (sortOrder === 'asc') {
      return aVal.localeCompare(bVal);
    } else {
      return bVal.localeCompare(aVal);
    }
  });

  const groupedPupils = sortedPupils.reduce((acc, pupil) => {
    if (!acc[pupil.class]) {
      acc[pupil.class] = [];
    }
    acc[pupil.class].push(pupil);
    return acc;
  }, {});

  const handleDownloadSubmit = () => {
    if (!downloadClass) {
      toast.error('Please select a class');
      return;
    }
    
    let studentsToDownload = [];
    
    if (downloadClass === 'all') {
      studentsToDownload = pupils;
    } else {
      studentsToDownload = pupils.filter(p => p.class === downloadClass);
      if (downloadStream && downloadStream !== 'all') {
        studentsToDownload = studentsToDownload.filter(p => p.stream === downloadStream);
      }
    }
    
    if (studentsToDownload.length === 0) {
      toast.error('No students found to download');
      return;
    }
    
    const fileName = `${downloadClass}${downloadStream && downloadStream !== 'all' ? `_${downloadStream}` : ''}_students`;
    const titleText = `${downloadClass}${downloadStream && downloadStream !== 'all' ? ` - ${downloadStream}` : ''} Student List`;
    
    // Get school info for header
    const schoolName = schoolInfo.name || 'SCHOOL NAME';
    const schoolMotto = schoolInfo.motto || 'Excellence in Education';
    const schoolPoBox = schoolInfo.poBox || 'P.O. Box 00000';
    const schoolPhone = schoolInfo.phone || '+254 XXX XXX XXX';
    const schoolEmail = schoolInfo.email || 'info@school.ac.ke';
    
    if (downloadFormat === 'excel') {
      const downloadData = studentsToDownload.map((student, index) => ({
        '#': index + 1,
        'Name': student.name,
        'Adm': student.admNo,
        'Gen': student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : (student.gender || 'N/A')),
        'Str': student.stream || 'N/A',
        'REMARKS': ''
      }));
      
      const headers = Object.keys(downloadData[0]);
      const csvRows = [
        `"${schoolName}"`,
        `"${schoolMotto}"`,
        `"${schoolPoBox} | Tel: ${schoolPhone} | Email: ${schoolEmail}"`,
        `"${titleText}"`,
        `"Generated: ${new Date().toLocaleString()}"`,
        `"Total Students: ${studentsToDownload.length}"`,
        '',
        headers.join(','),
        ...downloadData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${studentsToDownload.length} students`);
    } else {
      // Word format - EXACT DIMENSIONS AS IMAGE
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titleText} - ${schoolName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', 'Arial', serif;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    .header {
      text-align: center;
      width: 100%;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #000;
    }
    .school-name {
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .motto {
      font-size: 12px;
      font-style: italic;
      margin-bottom: 8px;
    }
    .address {
      font-size: 10px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      text-decoration: underline;
      margin: 10px 0;
      text-transform: uppercase;
    }
    .info-row {
      font-size: 10px;
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
    }
    
    .student-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 15px;
    }
    
    .student-table th,
    .student-table td {
      border: 1px solid #000;
      padding: 8px 4px;
      vertical-align: top;
    }
    
    .student-table th:first-child,
    .student-table td:first-child {
      width: 5%;
      text-align: center;
    }
    .student-table th:nth-child(2),
    .student-table td:nth-child(2) {
      width: 25%;
      text-align: left;
    }
    .student-table th:nth-child(3),
    .student-table td:nth-child(3) {
      width: 8%;
      text-align: center;
    }
    .student-table th:nth-child(4),
    .student-table td:nth-child(4) {
      width: 5%;
      text-align: center;
    }
    .student-table th:nth-child(5),
    .student-table td:nth-child(5) {
      width: 7%;
      text-align: center;
    }
    .student-table th:nth-child(6),
    .student-table td:nth-child(6) {
      width: 50%;
      text-align: left;
    }
    
    .student-table td {
      height: 35px;
    }
    
    .signature-line {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      width: 100%;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 9px;
      text-align: center;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${schoolName}</div>
    <div class="motto">"${schoolMotto}"</div>
    <div class="address">${schoolPoBox} | Tel: ${schoolPhone} | Email: ${schoolEmail}</div>
    <div class="title">${titleText}</div>
    <div class="info-row">
      <span>Generated on: ${new Date().toLocaleDateString()}</span>
      <span>Time: ${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="info-row">
      <span>Academic Year: ${new Date().getFullYear()}</span>
      <span>Total Students: ${studentsToDownload.length}</span>
    </div>
  </div>
  
  <table class="student-table">
    <thead>
      <tr>
        <th>#</th>
        <th>NAME</th>
        <th>ADM</th>
        <th>GEN</th>
        <th>STR</th>
        <th>REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${studentsToDownload.map((student, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${student.name || '-'}</td>
          <td style="text-align: center;">${student.admNo || '-'}</td>
          <td style="text-align: center;">${student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : (student.gender || '-'))}</td>
          <td style="text-align: center;">${student.stream || '-'}</td>
          <td>&nbsp;<!-- Empty space for teacher's remarks --></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="signature-line">
    <div>_____________________<br>Class Teacher's Signature</div>
    <div>_____________________<br>Deputy Head Teacher</div>
    <div>_____________________<br>Head Teacher</div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${studentsToDownload.length} students`);
    }
    
    setShowDownloadModal(false);
    setDownloadClass('');
    setDownloadStream('');
  };

  // Download Modal Component
  const DownloadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Download Class Lists</h2>
          <button onClick={() => setShowDownloadModal(false)} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Download Format:</label>
            <div className="flex gap-4">
              <button
                onClick={() => setDownloadFormat('excel')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'
                }`}
              >
                <FiFile className="w-4 h-4" /> EXCEL
              </button>
              <button
                onClick={() => setDownloadFormat('word')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'word' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                }`}
              >
                <FiFileText className="w-4 h-4" /> WORD (1/3-2/3 Layout)
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Note: Word format displays student details on left third with blank space on right for notes
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Class</label>
            <select
              value={downloadClass}
              onChange={(e) => setDownloadClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Class</option>
              <option value="all">All Classes ({pupils.length} students)</option>
              {availableClasses.map((className) => {
                const classCount = pupils.filter(p => p.class === className).length;
                return (
                  <option key={className} value={className}>
                    {className} ({classCount} students)
                  </option>
                );
              })}
            </select>
          </div>
          
          {downloadClass && downloadClass !== 'all' && availableStreamsForDownload.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">Stream (Optional)</label>
              <select
                value={downloadStream}
                onChange={(e) => setDownloadStream(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Streams</option>
                {availableStreamsForDownload.map(stream => (
                  <option key={stream} value={stream}>{stream}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {downloadStream && downloadStream !== 'all' 
                  ? '✓ When downloading a specific stream, the Stream column will be excluded' 
                  : 'Select a stream to download only that stream'}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3 mt-6">
          <button onClick={() => setShowDownloadModal(false)} className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
            CANCEL
          </button>
          <button onClick={handleDownloadSubmit} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            DOWNLOAD SELECTED
          </button>
        </div>
      </div>
    </div>
  );

  const StudentDetailModal = () => {
    if (!viewingStudent) return null;
    
    const studentResults = JSON.parse(localStorage.getItem('results') || '[]').filter(r => r.pupilId === viewingStudent._id);
    const years = [...new Set(studentResults.map(r => r.year || new Date(r.createdAt).getFullYear()))];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{viewingStudent.name}</h2>
              <p className="text-sm text-gray-500">
                Admission: {viewingStudent.admNo} • Birth Cert: {viewingStudent.birthCertNo || 'N/A'} • Gender: {viewingStudent.gender === 'Male' ? 'M' : (viewingStudent.gender === 'Female' ? 'F' : (viewingStudent.gender || 'N/A'))}
                <br />Current: {viewingStudent.class}
              </p>
            </div>
            <button onClick={() => setShowStudentDetail(false)} className="text-gray-500 hover:text-gray-700">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6 bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Academic Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Academic Years</p>
                  <p className="text-lg font-bold text-blue-600">{years.length || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Academic Progression</p>
                  <p className="text-sm">{years.map(y => `${y}: ${viewingStudent.previousClass || viewingStudent.class}`).join(' → ')}</p>
                </div>
              </div>
            </div>
            
            {years.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Academic Results by Year</h3>
                {years.map(year => (
                  <div key={year} className="mb-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-semibold">Academic Year {year}</div>
                    <div className="p-3">
                      <p className="text-sm">Class: {viewingStudent.class}</p>
                      <p className="text-sm text-gray-500">Subjects: {studentResults.filter(r => r.year === year).length || 0} assessments</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">Parent Name</p>
                  <p className="font-medium">{viewingStudent.parentName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parent Contact</p>
                  <p className="font-medium">{viewingStudent.parentPhone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parent Email</p>
                  <p className="font-medium">{viewingStudent.parentEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{viewingStudent.dateOfBirth || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Birth Certificate</p>
                  <p className="font-medium">{viewingStudent.birthCertNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{viewingStudent.gender === 'Male' ? 'M' : (viewingStudent.gender === 'Female' ? 'F' : (viewingStudent.gender || 'N/A'))}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <button onClick={() => { setShowStudentDetail(false); handleEditStudent(viewingStudent); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700">
                EDIT DETAILS
              </button>
              <button onClick={() => { setShowStudentDetail(false); handleTransferClick(viewingStudent); }} className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-700">
                TRANSFER
              </button>
              <button onClick={() => { setShowStudentDetail(false); handlePromoteClass(viewingStudent.class); }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">
                PROMOTE
              </button>
              <button className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700">
                CAREER INSIGHTS
              </button>
              <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700">
                FEE BALANCE
              </button>
              <button className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-700">
                ACADEMIC HISTORY
              </button>
            </div>
            
            <div className="flex justify-between mt-4 pt-4 border-t">
              <button className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1">
                <FiAlertTriangle className="w-3 h-3" /> REPORT INDISCIPLINE
              </button>
              <button onClick={() => { setShowStudentDetail(false); handleDeleteStudent(viewingStudent._id); }} className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1">
                <FiTrash2 className="w-3 h-3" /> DELETE STUDENT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PromoteModal = () => {
    if (!promoteClassData) return null;
    
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        deviceInfo.isMobile ? 'p-2' : ''
      }`}>
        <div className={`bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto ${
          deviceInfo.isMobile ? 'mx-2' : ''
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>
              {promoteAction === 'graduate' ? 'Graduate Class' : 'Promote Class'}
            </h2>
            <button onClick={() => setShowPromoteModal(false)} className="text-gray-500 hover:text-gray-700">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">
              {promoteAction === 'graduate' 
                ? `${promoteClassData.className} → Graduate to Alumni`
                : `${promoteClassData.className} → ${promoteClassData.nextClass}`}
            </p>
          </div>
          
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">Selected: {selectedStudents.length} of {promoteClassData.students.length} learners</p>
            <button onClick={selectAllStudents} className="text-blue-600 text-sm hover:underline">
              {selectedStudents.length === promoteClassData.students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10">Select</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adm</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  {!deviceInfo.isMobile && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stream</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Contact</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promoteClassData.students.map(student => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudentSelection(student._id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">{student.admNo}</td>
                    <td className="px-3 py-2 text-sm font-medium">{student.name}</td>
                    {!deviceInfo.isMobile && (
                      <>
                        <td className="px-3 py-2 text-sm">{student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : (student.gender || 'N/A'))}</td>
                        <td className="px-3 py-2 text-sm">{student.stream || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm">{student.parentPhone || 'N/A'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
            <button onClick={confirmPromotion} className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}>
              {promoteAction === 'graduate' ? 'GRADUATE SELECTED' : 'PROMOTE SELECTED'}
            </button>
            <button onClick={() => setShowPromoteModal(false)} className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400`}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransferModal = () => {
    if (!selectedPupil) return null;
    
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        deviceInfo.isMobile ? 'p-2' : ''
      }`}>
        <div className={`bg-white rounded-xl p-6 w-full max-w-md ${
          deviceInfo.isMobile ? 'mx-2' : ''
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>Transfer Learner</h2>
            <button onClick={() => setShowTransferModal(false)} className="text-gray-500 hover:text-gray-700">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              You are transferring 1 learner. This will move them to the transferred learners section.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Transfer Reason *</label>
              <select
                value={transferData.reason}
                onChange={(e) => setTransferData({...transferData, reason: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Select Reason</option>
                <option value="Change of School">Change of School</option>
                <option value="Family Relocation">Family Relocation</option>
                <option value="Financial Reasons">Financial Reasons</option>
                <option value="Academic Reasons">Academic Reasons</option>
                <option value="Health Reasons">Health Reasons</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Destination School (Optional)</label>
              <input
                type="text"
                value={transferData.destinationSchool}
                onChange={(e) => setTransferData({...transferData, destinationSchool: e.target.value})}
                placeholder="Enter destination school name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Remarks (Optional)</label>
              <textarea
                value={transferData.remarks}
                onChange={(e) => setTransferData({...transferData, remarks: e.target.value})}
                placeholder="Additional remarks..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows="3"
              />
            </div>
          </div>
          
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
            <button onClick={handleTransferSubmit} className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700`}>
              TRANSFER 1 LEARNER
            </button>
            <button onClick={() => setShowTransferModal(false)} className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400`}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  };

  // AI Responsive get button size helper
  const getButtonSize = () => {
    if (deviceInfo.isMobile) return 'px-4 py-2.5 text-sm';
    return 'px-4 py-2 text-sm';
  };

  if (loading) {
    return (
      <Layout title="All Students" subtitle="Manage and view all students">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  if (pupils.length === 0) {
    return (
      <Layout title="All Students" subtitle="Manage and view all students">
        {/* AI Device Info Bar */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            {deviceInfo.isMobile ? (
              <FiSmartphone className="text-blue-600" />
            ) : deviceInfo.isTablet ? (
              <FiTablet className="text-blue-600" />
            ) : (
              <FiMonitor className="text-blue-600" />
            )}
            <span className="text-gray-600">{deviceInfo.type.charAt(0).toUpperCase() + deviceInfo.type.slice(1)} View</span>
            {deviceInfo.isTouchDevice && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Touch</span>
            )}
          </div>
          <button onClick={() => setShowDeviceInfo(!showDeviceInfo)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-full">
            {showDeviceInfo ? 'Hide' : 'Show'} Info
          </button>
        </div>

        {showDeviceInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="font-semibold">Device:</span> {deviceInfo.type}</div>
            <div><span className="font-semibold">OS:</span> {deviceInfo.os}</div>
            <div><span className="font-semibold">Browser:</span> {deviceInfo.browser}</div>
            <div><span className="font-semibold">Viewport:</span> {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight}</div>
          </div>
        )}

        <div className={`flex flex-wrap ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-center gap-4'} mb-6`}>
          <button onClick={() => setShowDownloadModal(true)} className={`${deviceInfo.isMobile ? 'w-full' : ''} bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 ${getButtonSize()}`}>
            <FiDownload /> DOWNLOAD LISTS
          </button>
          <button onClick={() => setIsModalOpen(true)} className={`${deviceInfo.isMobile ? 'w-full' : ''} btn-primary flex items-center justify-center gap-2 ${getButtonSize()}`}>
            <FiUsers /> + ADD NEW STUDENT
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                deviceInfo.isMobile ? 'text-base' : ''
              }`} 
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4"><FiUsers className="w-12 h-12 text-gray-400" /></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Students Yet</h3>
            <p className="text-gray-500 mb-6">Click the "ADD NEW STUDENT" button to get started</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">Add Your First Student</button>
          </div>
        </div>
        
        <AddPupilModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleAddPupil}
          retainedData={retainedData}
          onDataChange={saveRetainedData}
        />
        {showDownloadModal && <DownloadModal />}
      </Layout>
    );
  }

  // Main display
  return (
    <Layout title="All Students" subtitle="Manage and view all students">
      {/* AI Device Info Bar */}
      <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          {deviceInfo.isMobile ? (
            <FiSmartphone className="text-blue-600" />
          ) : deviceInfo.isTablet ? (
            <FiTablet className="text-blue-600" />
          ) : (
            <FiMonitor className="text-blue-600" />
          )}
          <span className="text-gray-600">{deviceInfo.type.charAt(0).toUpperCase() + deviceInfo.type.slice(1)} View</span>
          {deviceInfo.isTouchDevice && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Touch</span>
          )}
          <span className="text-xs text-gray-400 ml-2">
            {deviceInfo.viewportWidth}×{deviceInfo.viewportHeight}
          </span>
        </div>
        <button onClick={() => setShowDeviceInfo(!showDeviceInfo)} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full">
          {showDeviceInfo ? 'Hide' : 'Show'} Device Info
        </button>
      </div>

      {showDeviceInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><span className="font-semibold">Device:</span> {deviceInfo.type}</div>
          <div><span className="font-semibold">OS:</span> {deviceInfo.os}</div>
          <div><span className="font-semibold">Browser:</span> {deviceInfo.browser}</div>
          <div><span className="font-semibold">Viewport:</span> {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight}</div>
          <div><span className="font-semibold">Connection:</span> {deviceInfo.connectionType}</div>
          <div><span className="font-semibold">Touch:</span> {deviceInfo.isTouchDevice ? 'Yes' : 'No'}</div>
        </div>
      )}

      <div className={`flex flex-wrap ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-between items-center gap-4'} mb-6`}>
        <button onClick={() => setShowDownloadModal(true)} className={`${deviceInfo.isMobile ? 'w-full' : ''} bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 ${getButtonSize()}`}>
          <FiDownload /> DOWNLOAD LISTS
        </button>
        <button onClick={() => setIsModalOpen(true)} className={`${deviceInfo.isMobile ? 'w-full' : ''} btn-primary flex items-center justify-center gap-2 ${getButtonSize()}`}>
          <FiUsers /> + ADD NEW STUDENT
        </button>
      </div>

      {/* Search and Filters - AI Responsive */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className={`flex flex-wrap ${deviceInfo.isMobile ? 'flex-col' : ''} gap-4 items-center`}>
          <div className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1 min-w-[200px]'}`}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder={`${deviceInfo.isMobile ? 'Search...' : 'Search students by name or admission...'}`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`} 
              />
            </div>
          </div>
          
          {/* Class Filter */}
          {availableClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="all">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          )}
          
          {/* Stream Filter - appears when class is selected */}
          {selectedClass !== 'all' && availableStreams.length > 0 && (
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="">All Streams</option>
              {availableStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          )}
          
          {/* Sort Controls */}
          <div className={`flex ${deviceInfo.isMobile ? 'w-full justify-between' : 'gap-2 ml-auto'}`}>
            <button 
              onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} 
              className={`px-2 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 ${
                deviceInfo.isMobile ? 'flex-1 text-center' : ''
              }`}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => { setSortBy('admission'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} 
              className={`px-2 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 ${
                deviceInfo.isMobile ? 'flex-1 text-center' : ''
              }`}
            >
              Adm {sortBy === 'admission' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
        
        {/* Filter Summary */}
        {(selectedClass !== 'all' || selectedStream) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filters:</span>
            {selectedClass !== 'all' && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                Class: {selectedClass}
              </span>
            )}
            {selectedStream && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                Stream: {selectedStream}
              </span>
            )}
            <button 
              onClick={() => { setSelectedClass('all'); setSelectedStream(''); setSearchTerm(''); }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Class-wise Student Cards - AI Responsive Grid */}
      {Object.entries(groupedPupils).map(([className, classPupils]) => (
        <div key={className} className="mb-8">
          <div className={`flex flex-wrap ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between'} items-center mb-4`}>
            <h2 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800`}>
              {className} <span className="text-sm font-normal text-gray-500">({classPupils.length})</span>
            </h2>
            <div className={`flex ${deviceInfo.isMobile ? 'w-full justify-start' : ''} gap-2`}>
              <button 
                onClick={() => handlePromoteClass(className)}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1"
              >
                <FiArrowRight className="w-3 h-3" /> {deviceInfo.isMobile ? 'PROMOTE' : 'PROMOTE'}
              </button>
              <button 
                onClick={() => handleGraduateClass(className)}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-purple-700 flex items-center gap-1"
              >
                <FiAward className="w-3 h-3" /> {deviceInfo.isMobile ? 'GRAD' : 'GRADUATE'}
              </button>
            </div>
          </div>
          
          {/* AI Responsive Grid */}
          <div className={`grid ${responsiveGrid} gap-3`}>
            {classPupils.map((pupil) => (
              <div
                key={pupil._id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer border border-gray-100 ${
                  deviceInfo.isMobile ? 'p-3' : 'p-3'
                }`}
                onClick={() => handleViewStudent(pupil)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-sm'} font-bold text-gray-800 truncate`}>
                      {pupil.name}
                    </h3>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
                      Adm: {pupil.admNo}
                    </p>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-xs'} text-gray-400 mt-1`}>
                      {pupil.gender === 'Male' ? 'M' : (pupil.gender === 'Female' ? 'F' : (pupil.gender || 'N/A'))} 
                      {pupil.stream && ` • ${pupil.stream}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                      {pupil.class}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <AddPupilModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddPupil}
        retainedData={retainedData}
        onDataChange={saveRetainedData}
      />
      
      <AddPupilModal 
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); setEditingPupil(null); }} 
        onSave={handleUpdatePupil} 
        editingPupil={editingPupil} 
      />
      
      {showPromoteModal && <PromoteModal />}
      {showTransferModal && <TransferModal />}
      {showStudentDetail && <StudentDetailModal />}
      {showDownloadModal && <DownloadModal />}

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-4 {
            padding: 12px !important;
          }
          .mobile-view .gap-3 {
            gap: 8px !important;
          }
          .mobile-view .text-base {
            font-size: 16px !important;
          }
          .mobile-view input, .mobile-view select {
            font-size: 16px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
      `}</style>
    </Layout>
  );
};

export default Pupils;