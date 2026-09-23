// src/components/admin/MyStudents.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiSearch, FiArrowUp, FiArrowDown, FiUsers, FiDownload, 
  FiFile, FiFileText, FiFilter, FiX, FiMonitor, FiSmartphone, 
  FiTablet, FiUserCheck
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    viewportWidth: 0,
    viewportHeight: 0,
    pixelRatio: 1,
    isTouchDevice: false
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        pixelRatio,
        isTouchDevice
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// ===== AI Responsive Helper =====
const useResponsiveClasses = (deviceInfo) => {
  return {
    cardPadding: deviceInfo.isMobile ? 'p-4' : 'p-6',
    headingSize: deviceInfo.isMobile ? 'text-lg' : 'text-xl',
    textSize: deviceInfo.isMobile ? 'text-sm' : 'text-base',
    buttonSize: deviceInfo.isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    gridGap: deviceInfo.isMobile ? 'gap-2' : 'gap-4',
    statsGrid: deviceInfo.isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
  };
};

const MyStudents = () => {
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  
  // Download states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('excel');
  const [downloadClass, setDownloadClass] = useState('');
  const [downloadStream, setDownloadStream] = useState('');
  const [downloadStreams, setDownloadStreams] = useState([]); // streams for the download class
  const [schoolInfo, setSchoolInfo] = useState({ name: '', motto: '', phone: '', email: '', poBox: '' });

  useEffect(() => {
    fetchStudents();
    loadSchoolInfo();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
    // eslint-disable-next-line
  }, [searchTerm, sortBy, sortOrder, students, selectedClass, selectedStream]);

  const loadSchoolInfo = () => {
    try {
      const storedSchool = localStorage.getItem('schoolInfo');
      if (storedSchool) {
        const school = JSON.parse(storedSchool);
        setSchoolInfo({
          name: school.name || school.schoolName || 'SCHOOL NAME',
          motto: school.motto || 'Excellence in Education',
          phone: school.phone || school.phoneNumber || '+254 XXX XXX XXX',
          email: school.email || school.schoolEmail || 'info@school.ac.ke',
          poBox: school.poBox || school.address || 'P.O. Box 00000'
        });
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/pupils');
      
      let studentsData = [];
      if (response.data && response.data.success) {
        studentsData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        studentsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        studentsData = response.data.data;
      }
      
      setStudents(studentsData);
      setFilteredStudents(studentsData);
      
      const classes = [...new Set(studentsData.map(s => s.class).filter(Boolean))];
      setAvailableClasses(classes);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error fetching students');
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Update streams when class changes (for the filter bar)
  useEffect(() => {
    if (selectedClass) {
      const studentsInClass = students.filter(s => s.class === selectedClass);
      const streams = [...new Set(studentsInClass.map(s => s.stream).filter(Boolean))];
      setAvailableStreams(streams);
      setSelectedStream('');
    } else {
      setAvailableStreams([]);
      setSelectedStream('');
    }
  }, [selectedClass, students]);

  // Update streams when download class changes (for the download modal)
  useEffect(() => {
    if (downloadClass && downloadClass !== 'all') {
      const studentsInClass = students.filter(s => s.class === downloadClass);
      const streams = [...new Set(studentsInClass.map(s => s.stream).filter(Boolean))];
      setDownloadStreams(streams);
      setDownloadStream('all'); // default to all streams so the whole class is included
    } else {
      setDownloadStreams([]);
      setDownloadStream('all');
    }
  }, [downloadClass, students]);

  const filterAndSortStudents = () => {
    if (!Array.isArray(students)) {
      setFilteredStudents([]);
      return;
    }
    
    let filtered = [...students];
    
    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }
    
    if (selectedStream && selectedStream !== 'all') {
      filtered = filtered.filter(student => student.stream === selectedStream);
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      let aValue = sortBy === 'name' ? (a.name || '').toLowerCase() : (a.admNo || '');
      let bValue = sortBy === 'name' ? (b.name || '').toLowerCase() : (b.admNo || '');
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredStudents(filtered);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ===== WORD DOWNLOAD HTML =====
  const generateWordHTML = (studentsToDownload, className, streamName, schoolData) => {
    // Only include the stream column when no specific stream was selected
    // (i.e. when we're downloading the whole class or all streams of a class).
    const includeStreamColumn = !(streamName && streamName !== 'all');
    const titleText = `${className}${streamName && streamName !== 'all' ? ` - ${streamName}` : ''} Student List`;
    
    const tableRows = studentsToDownload.map((student, index) => `
        <tr>
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${index + 1}</td>
          <td style="padding: 8px 4px; border: 1px solid #000;">${student.name || '-'}</td>
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.admNo || '-'}</td>
          ${includeStreamColumn ? `<td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.stream || '-'}</td>` : ''}
          <td style="text-align: center; padding: 8px 4px; border: 1px solid #000;">${student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : '-')}</td>
          <td style="padding: 8px 4px; border: 1px solid #000;">&nbsp;</td>
        </tr>
      `).join('');

    const streamHeader = includeStreamColumn
      ? '<th style="border: 1px solid #000; padding: 8px 4px; text-align: center; background-color: #f2f2f2;">STREAM</th>'
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titleText}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', 'Arial', serif; margin: 0; padding: 20px; background: white; }
    .header { text-align: center; width: 100%; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000; }
    .school-name { font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .motto { font-size: 12px; font-style: italic; margin-bottom: 8px; }
    .address { font-size: 10px; margin-bottom: 10px; }
    .title { font-size: 18px; font-weight: bold; text-decoration: underline; margin: 10px 0; text-transform: uppercase; }
    .info-row { font-size: 10px; margin-bottom: 5px; display: flex; justify-content: space-between; }
    .student-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
    .student-table th { border: 1px solid #000; padding: 8px 4px; text-align: center; background-color: #f2f2f2; font-weight: bold; }
    .student-table td { border: 1px solid #000; padding: 8px 4px; vertical-align: middle; }
    .signature-line { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; width: 100%; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; text-align: center; width: 100%; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${schoolData.name}</div>
    <div class="motto">"${schoolData.motto}"</div>
    <div class="address">${schoolData.poBox} | Tel: ${schoolData.phone} | Email: ${schoolData.email}</div>
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
        <th style="width: 5%;">#</th>
        <th style="width: ${includeStreamColumn ? '35%' : '45%'};">NAME</th>
        <th style="width: 10%;">ADM</th>
        ${streamHeader}
        <th style="width: 5%;">GEN</th>
        <th style="width: ${includeStreamColumn ? '35%' : '45%'};">REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
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
  };

  // ===== HANDLE DOWNLOAD =====
  const handleDownload = () => {
    if (!downloadClass) {
      toast.error('Please select a class to download');
      return;
    }
    
    let studentsToDownload = [];
    
    if (downloadClass === 'all') {
      studentsToDownload = students;
    } else {
      // ✅ Always include the whole class across all streams by default
      studentsToDownload = students.filter(s => s.class === downloadClass);
      // Only narrow down if a specific stream is chosen
      if (downloadStream && downloadStream !== 'all') {
        studentsToDownload = studentsToDownload.filter(s => s.stream === downloadStream);
      }
    }
    
    if (studentsToDownload.length === 0) {
      toast.error('No students found to download');
      return;
    }
    
    // Include stream column if the download spans multiple streams or all classes
    const includeStreamColumn = !(downloadStream && downloadStream !== 'all');
    
    const fileName = `${downloadClass}${downloadStream && downloadStream !== 'all' ? `_${downloadStream}` : ''}_students`;
    const titleText = `${downloadClass}${downloadStream && downloadStream !== 'all' ? ` - ${downloadStream}` : ''} Student List`;
    
    if (downloadFormat === 'excel') {
      const downloadData = studentsToDownload.map((student, index) => {
        const row = {
          '#': index + 1,
          'Name': student.name,
          'Admission': student.admNo,
        };
        if (includeStreamColumn) row['Stream'] = student.stream || 'N/A';
        row['Gender'] = student.gender === 'Male' ? 'M' : (student.gender === 'Female' ? 'F' : 'N/A');
        row['REMARKS'] = '';
        return row;
      });
      
      const headers = Object.keys(downloadData[0]);
      const csvRows = [
        `"${schoolInfo.name}"`,
        `"${schoolInfo.motto}"`,
        `"${schoolInfo.poBox} | Tel: ${schoolInfo.phone} | Email: ${schoolInfo.email}"`,
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
      const htmlContent = generateWordHTML(
        studentsToDownload, 
        downloadClass, 
        downloadStream, 
        schoolInfo
      );
      
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

  // Group students by class after filtering and sorting
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {});

  const totalStudents = filteredStudents.length;

  // Download Modal Component
  const DownloadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl ${deviceInfo.isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6 w-full max-w-md'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>
            Download Class Lists
          </h2>
          <button onClick={() => setShowDownloadModal(false)} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Download Format:</label>
            <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-4'}`}>
              <button
                onClick={() => setDownloadFormat('excel')}
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'
                }`}
              >
                <FiFile className="w-4 h-4" /> EXCEL
              </button>
              <button
                onClick={() => setDownloadFormat('word')}
                className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  downloadFormat === 'word' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                }`}
              >
                <FiFileText className="w-4 h-4" /> WORD
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Class</label>
            <select
              value={downloadClass}
              onChange={(e) => setDownloadClass(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                deviceInfo.isMobile ? 'text-base' : ''
              }`}
            >
              <option value="">Select Class</option>
              <option value="all">All Classes ({students.length} students)</option>
              {availableClasses.map((className) => {
                const classCount = students.filter(s => s.class === className).length;
                return (
                  <option key={className} value={className}>
                    {className} ({classCount} students)
                  </option>
                );
              })}
            </select>
          </div>
          
          {/* ✅ Stream dropdown only shows when the class actually has streams */}
          {downloadClass && downloadClass !== 'all' && downloadStreams.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Stream <span className="text-xs text-gray-500 font-normal">(optional)</span>
              </label>
              <select
                value={downloadStream}
                onChange={(e) => setDownloadStream(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              >
                <option value="all">All Streams (Whole Class)</option>
                {downloadStreams.map(stream => (
                  <option key={stream} value={stream}>{stream}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Leave as "All Streams" to download every learner in the class.
              </p>
            </div>
          )}
        </div>
        
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'space-x-3'} mt-6`}>
          <button 
            onClick={() => setShowDownloadModal(false)} 
            className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400`}
          >
            CANCEL
          </button>
          <button 
            onClick={handleDownload} 
            className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}
          >
            DOWNLOAD SELECTED
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout title="My Learners" subtitle="CBE - View all learners by class">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Learners" subtitle="CBE - View and manage all learners">
      
      {/* Search, Filter and Download Bar */}
      <div className={`bg-white rounded-xl shadow-md ${deviceInfo.isMobile ? 'p-3' : 'p-4'} mb-6`}>
        <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'flex-wrap gap-4'} items-center`}>
          <div className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1 min-w-[200px]'}`}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={deviceInfo.isMobile ? "Search learners..." : "Search by learner name or admission number..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  deviceInfo.isMobile ? 'text-base' : ''
                }`}
              />
            </div>
          </div>
          
          {availableClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          )}
          
          {selectedClass && availableStreams.length > 0 && (
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${
                deviceInfo.isMobile ? 'w-full text-base' : ''
              }`}
            >
              <option value="">All Streams</option>
              {availableStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => setShowDownloadModal(true)}
            className={`bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors ${
              deviceInfo.isMobile ? 'w-full px-4 py-2.5 text-base' : 'px-4 py-2'
            }`}
          >
            <FiDownload /> DOWNLOAD LISTS
          </button>
          
          <div className={`flex ${deviceInfo.isMobile ? 'w-full gap-2' : 'gap-2'}`}>
            <button
              onClick={() => toggleSort('name')}
              className={`flex-1 px-4 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                sortBy === 'name'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
              }`}
            >
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Name</span>
              {sortBy === 'name' && (
                sortOrder === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleSort('admNo')}
              className={`flex-1 px-4 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                sortBy === 'admNo'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
              }`}
            >
              <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>Adm</span>
              {sortBy === 'admNo' && (
                sortOrder === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {searchTerm && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
              Found <span className="font-semibold text-green-600">{totalStudents}</span> learners matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>

      {/* Students Count Summary */}
      <div className={`grid ${responsive.statsGrid} ${responsive.gridGap} mb-6`}>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Total Learners</p>
          <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{totalStudents}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Classes</p>
          <p className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{Object.keys(groupedStudents).length}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Sort By</p>
          <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold capitalize`}>
            {sortBy === 'name' ? 'Name' : 'Admission No'}
          </p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Order</p>
          <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold capitalize`}>
            {sortOrder === 'asc' ? 'A to Z' : 'Z to A'}
          </p>
        </div>
      </div>

      {/* No Results Message */}
      {totalStudents === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FiUsers className={`${deviceInfo.isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400 mx-auto mb-4`} />
          <h3 className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 mb-2`}>
            No Learners Found
          </h3>
          <p className="text-gray-500">Try adjusting your search or check back later</p>
        </div>
      )}

      {/* Class-wise Student Cards */}
      {totalStudents > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedStudents).map(([className, classStudents]) => (
            <div key={className} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
                <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-1' : 'justify-between items-center'}`}>
                  <div>
                    <h2 className={`${deviceInfo.isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-800`}>
                      {className}
                    </h2>
                    <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      {classStudents.length} learners
                    </p>
                  </div>
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-semibold text-green-700`}>
                      CBE Class
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {classStudents.map((student, index) => (
                  <div 
                    key={student._id || index} 
                    className={`${deviceInfo.isMobile ? 'px-3 py-3' : 'px-6 py-4'} hover:bg-green-50 transition-colors duration-150`}
                  >
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                      <div className="flex-1">
                        <div className={`flex ${deviceInfo.isMobile ? 'items-start gap-2' : 'items-center gap-3'}`}>
                          <div className={`${deviceInfo.isMobile ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 truncate`}>
                              {student.name || 'Unknown'}
                            </h3>
                            <div className={`flex ${deviceInfo.isMobile ? 'flex-wrap gap-2' : 'items-center gap-3'} mt-0.5`}>
                              <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                                Adm: {student.admNo || 'N/A'}
                              </p>
                              {student.stream && (
                                <p className={`${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
                                  Stream: {student.stream}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!deviceInfo.isMobile && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {student.class || 'Unassigned'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDownloadModal && <DownloadModal />}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .p-4 { padding: 12px !important; }
          .mobile-view .gap-4 { gap: 12px !important; }
          .mobile-view input, .mobile-view select { font-size: 16px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .responsive-wrapper { transition: all 0.3s ease; }
      `}</style>
    </Layout>
  );
};

export default MyStudents;