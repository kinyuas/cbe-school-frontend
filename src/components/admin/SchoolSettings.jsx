// src/components/admin/SchoolSettings.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../common/Layout';
import api from '../../services/api';
import { FiSave, FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiInfo, FiRefreshCw, FiBookOpen, FiUsers, FiMonitor, FiSmartphone, FiTablet, FiServer } from 'react-icons/fi';
import toast from 'react-hot-toast';

// AI Device Detection Hook
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
    viewportHeight: 0
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
        viewportHeight: height
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

// AI Responsive Component Wrapper
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

// AI Content Optimizer
const ContentOptimizer = ({ content, deviceInfo }) => {
  const getOptimizedContent = () => {
    if (deviceInfo.isMobile) {
      // Mobile optimization: shorter text, larger buttons, vertical layout
      return {
        buttonSize: 'large',
        textSize: 'medium',
        layout: 'vertical',
        showDetails: false
      };
    } else if (deviceInfo.isTablet) {
      return {
        buttonSize: 'medium',
        textSize: 'medium',
        layout: 'grid-2',
        showDetails: true
      };
    } else {
      return {
        buttonSize: 'default',
        textSize: 'default',
        layout: 'grid-4',
        showDetails: true
      };
    }
  };

  const optimized = getOptimizedContent();
  return React.cloneElement(content, { ...content.props, ...optimized });
};

const SchoolSettings = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    motto: '',
    logo: '',
    website: '',
    maxStreamsPerClass: 1,
    classes: []
  });

  const [newClassName, setNewClassName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [streamNames, setStreamNames] = useState({});
  const [maxStreams, setMaxStreams] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPupils, setIsLoadingPupils] = useState(false);
  const [selectedCbeClasses, setSelectedCbeClasses] = useState([]);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);

  // CBE Standard Classes (Competency-Based Education) - Complete List with Play Group, PP1, PP2
  const cbeClasses = [
    // Early Years Education
    { 
      name: 'Play Group', 
      level: 'Early Years Education',
      description: 'Early Years Education - Play Group (3-4 years)'
    },
    { 
      name: 'Pre-Primary 1', 
      level: 'Early Years Education',
      description: 'Early Years Education - Level 1 (4-5 years)'
    },
    { 
      name: 'Pre-Primary 2', 
      level: 'Early Years Education',
      description: 'Early Years Education - Level 2 (5-6 years)'
    },
    // Lower Primary
    { 
      name: 'Grade 1', 
      level: 'Lower Primary',
      description: 'Lower Primary - Grade 1 (6-7 years)'
    },
    { 
      name: 'Grade 2', 
      level: 'Lower Primary',
      description: 'Lower Primary - Grade 2 (7-8 years)'
    },
    { 
      name: 'Grade 3', 
      level: 'Lower Primary',
      description: 'Lower Primary - Grade 3 (8-9 years)'
    },
    // Upper Primary
    { 
      name: 'Grade 4', 
      level: 'Upper Primary',
      description: 'Upper Primary - Grade 4 (9-10 years)'
    },
    { 
      name: 'Grade 5', 
      level: 'Upper Primary',
      description: 'Upper Primary - Grade 5 (10-11 years)'
    },
    { 
      name: 'Grade 6', 
      level: 'Upper Primary',
      description: 'Upper Primary - Grade 6 (11-12 years)'
    },
    // Junior Secondary
    { 
      name: 'Grade 7', 
      level: 'Junior Secondary',
      description: 'Junior Secondary - Grade 7 (12-13 years)'
    },
    { 
      name: 'Grade 8', 
      level: 'Junior Secondary',
      description: 'Junior Secondary - Grade 8 (13-14 years)'
    },
    { 
      name: 'Grade 9', 
      level: 'Junior Secondary',
      description: 'Junior Secondary - Grade 9 (14-15 years)'
    },
    // Senior Secondary
    { 
      name: 'Grade 10', 
      level: 'Senior Secondary',
      description: 'Senior Secondary - Grade 10 (15-16 years)'
    },
    { 
      name: 'Grade 11', 
      level: 'Senior Secondary',
      description: 'Senior Secondary - Grade 11 (16-17 years)'
    },
    { 
      name: 'Grade 12', 
      level: 'Senior Secondary',
      description: 'Senior Secondary - Grade 12 (17-18 years)'
    }
  ];

  // Group CBE classes by level
  const cbeLevels = {
    'Early Years Education': ['Play Group', 'Pre-Primary 1', 'Pre-Primary 2'],
    'Lower Primary': ['Grade 1', 'Grade 2', 'Grade 3'],
    'Upper Primary': ['Grade 4', 'Grade 5', 'Grade 6'],
    'Junior Secondary': ['Grade 7', 'Grade 8', 'Grade 9'],
    'Senior Secondary': ['Grade 10', 'Grade 11', 'Grade 12']
  };

  useEffect(() => {
    loadSchoolData();
  }, []);

  // AI Responsive Logging
  useEffect(() => {
    console.log('AI Device Detection:', {
      deviceType: deviceInfo.type,
      screenSize: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
      viewport: `${deviceInfo.viewportWidth}x${deviceInfo.viewportHeight}`,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      pixelRatio: deviceInfo.pixelRatio,
      isMobile: deviceInfo.isMobile,
      isTablet: deviceInfo.isTablet
    });
  }, [deviceInfo]);

  const loadSchoolData = async () => {
    setLoading(true);
    try {
      console.log('Loading school data from database...');
      
      const response = await api.get('/school/settings');
      console.log('API Response:', response.data);
      
      if (response.data.success && response.data.data) {
        const school = response.data.data;
        console.log('School data from database:', school);
        
        let classes = school.classes || [];
        if (classes.length > 0 && typeof classes[0] === 'string') {
          classes = classes.map(name => ({
            name: name,
            streams: [],
            isActive: true
          }));
        }
        
        const mappedSchoolInfo = {
          name: school.schoolName || school.name || '',
          email: school.schoolEmail || school.email || '',
          phone: school.phoneNumber || school.phone || '',
          address: school.address || '',
          motto: school.motto || '',
          logo: school.schoolLogo || '',
          website: school.website || '',
          maxStreamsPerClass: school.maxStreamsPerClass || 1,
          classes: classes
        };
        
        setSchoolInfo(mappedSchoolInfo);
        setMaxStreams(school.maxStreamsPerClass || 1);
        
        // Load streams from database - NO HARDCODED STREAMS
        const savedStreams = {};
        if (classes && classes.length > 0) {
          classes.forEach(cls => {
            savedStreams[cls.name] = cls.streams || [];
          });
          console.log('Loaded streams from database:', savedStreams);
        }
        setStreamNames(savedStreams);
        
        // Check which CBE classes are already added
        const existingClassNames = classes.map(c => c.name);
        const selected = cbeClasses
          .filter(c => existingClassNames.includes(c.name))
          .map(c => c.name);
        setSelectedCbeClasses(selected);
        
      } else {
        toast.error('Failed to load school data from database');
      }
    } catch (error) {
      console.error('Error loading school data from database:', error);
      toast.error('Failed to load school data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load actual streams from pupil data in database
  const loadStreamsFromPupils = async () => {
    setIsLoadingPupils(true);
    try {
      console.log('Loading streams from pupil data in database...');
      const response = await api.get('/pupils');
      
      if (response.data.success && response.data.data) {
        const pupils = response.data.data;
        console.log('Pupils data from database:', pupils);
        
        const classStreamMap = {};
        pupils.forEach(pupil => {
          if (pupil.class && pupil.stream) {
            if (!classStreamMap[pupil.class]) {
              classStreamMap[pupil.class] = new Set();
            }
            classStreamMap[pupil.class].add(pupil.stream);
          }
        });
        
        const updatedStreams = { ...streamNames };
        let hasUpdates = false;
        
        Object.keys(classStreamMap).forEach(className => {
          const streams = Array.from(classStreamMap[className]);
          if (streams.length > 0) {
            updatedStreams[className] = streams;
            hasUpdates = true;
            console.log(`Found streams for ${className} in database:`, streams);
          }
        });
        
        if (hasUpdates) {
          setStreamNames(updatedStreams);
          
          setSchoolInfo(prev => ({
            ...prev,
            classes: prev.classes.map(cls => ({
              ...cls,
              streams: updatedStreams[cls.name] || []
            }))
          }));
          
          toast.success('Loaded streams from pupil data in database');
        } else {
          toast.info('No streams found in pupil data');
        }
      }
    } catch (error) {
      console.error('Error loading streams from pupils:', error);
      toast.error('Failed to load streams from pupils');
    } finally {
      setIsLoadingPupils(false);
    }
  };

  const handleSchoolInfoChange = (e) => {
    const { name, value } = e.target;
    setSchoolInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleMaxStreamsChange = (e) => {
    const value = parseInt(e.target.value);
    setMaxStreams(value);
    setSchoolInfo(prev => ({ ...prev, maxStreamsPerClass: value }));
  };

  const handleStreamChange = (className, streamIndex, value) => {
    setStreamNames(prev => {
      const updatedStreams = [...(prev[className] || [])];
      updatedStreams[streamIndex] = value;
      return { ...prev, [className]: updatedStreams };
    });
  };

  const addStream = (className) => {
    const currentStreams = streamNames[className] || [];
    if (currentStreams.length >= maxStreams) {
      toast.error(`Maximum ${maxStreams} stream(s) allowed per class`);
      return;
    }
    
    setStreamNames(prev => ({
      ...prev,
      [className]: [...(prev[className] || []), '']
    }));
  };

  const removeStream = (className, streamIndex) => {
    setStreamNames(prev => ({
      ...prev,
      [className]: (prev[className] || []).filter((_, i) => i !== streamIndex)
    }));
  };

  const updateClassStreams = (className) => {
    const streams = streamNames[className] || [];
    const validStreams = streams.filter(s => s.trim() !== '');
    
    setSchoolInfo(prev => ({
      ...prev,
      classes: prev.classes.map(cls => 
        cls.name === className 
          ? { ...cls, streams: validStreams }
          : cls
      )
    }));
    
    toast.success(`Streams for ${className} updated locally. Click SAVE to save to database.`);
  };

  const toggleClassActive = (className) => {
    setSchoolInfo(prev => ({
      ...prev,
      classes: prev.classes.map(cls =>
        cls.name === className
          ? { ...cls, isActive: !cls.isActive }
          : cls
      )
    }));
  };

  const addCbeClasses = (classNames) => {
    const newClasses = [];
    const existingNames = schoolInfo.classes.map(c => c.name);
    
    classNames.forEach(name => {
      if (!existingNames.includes(name)) {
        const cbeClass = cbeClasses.find(c => c.name === name);
        if (cbeClass) {
          newClasses.push({
            name: cbeClass.name,
            streams: [],
            isActive: true
          });
          setStreamNames(prev => ({
            ...prev,
            [cbeClass.name]: []
          }));
        }
      }
    });
    
    if (newClasses.length > 0) {
      setSchoolInfo(prev => ({
        ...prev,
        classes: [...prev.classes, ...newClasses]
      }));
      setSelectedCbeClasses([...selectedCbeClasses, ...classNames]);
      toast.success(`${newClasses.length} CBE class(es) added successfully! Add streams and save.`);
    } else {
      toast.info('Selected classes are already added');
    }
  };

  const addCustomClass = () => {
    if (!newClassName.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    
    if (schoolInfo.classes.some(c => c.name === newClassName.trim())) {
      toast.error('Class already exists');
      return;
    }
    
    setSchoolInfo(prev => ({
      ...prev,
      classes: [...prev.classes, {
        name: newClassName.trim(),
        streams: [],
        isActive: true
      }]
    }));
    
    setStreamNames(prev => ({
      ...prev,
      [newClassName.trim()]: []
    }));
    
    setNewClassName('');
    setShowAddClass(false);
    toast.success(`Class "${newClassName.trim()}" added. Click SAVE to save to database.`);
  };

  const removeCustomClass = (className) => {
    const isCbeClass = cbeClasses.some(c => c.name === className);
    if (isCbeClass) {
      setSelectedCbeClasses(prev => prev.filter(name => name !== className));
    }
    
    if (window.confirm(`Remove "${className}"? This action cannot be undone.`)) {
      setSchoolInfo(prev => ({
        ...prev,
        classes: prev.classes.filter(cls => cls.name !== className)
      }));
      
      setStreamNames(prev => {
        const newStreams = { ...prev };
        delete newStreams[className];
        return newStreams;
      });
      
      toast.success(`Class "${className}" removed. Click SAVE to save to database.`);
    }
  };

  const saveSettings = async () => {
    if (!schoolInfo.name.trim()) {
      toast.error('School name is required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const finalClasses = schoolInfo.classes.map(cls => ({
        name: cls.name,
        streams: streamNames[cls.name]?.filter(s => s.trim() !== '') || [],
        isActive: cls.isActive !== false
      }));
      
      console.log('Saving to database:', finalClasses);
      
      const updatedSchoolInfo = {
        name: schoolInfo.name,
        phoneNumber: schoolInfo.phone,
        address: schoolInfo.address,
        website: schoolInfo.website,
        motto: schoolInfo.motto,
        maxStreamsPerClass: maxStreams,
        classes: finalClasses
      };
      
      const response = await api.put('/school/settings', updatedSchoolInfo);
      console.log('API save response:', response.data);
      
      if (response.data.success) {
        toast.success('School settings saved to database successfully!');
        await loadSchoolData();
      } else {
        throw new Error('API save failed');
      }
      
    } catch (error) {
      console.error('Error saving settings to database:', error);
      toast.error('Failed to save settings to database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeClasses = schoolInfo.classes.filter(c => c.isActive);
  const inactiveClasses = schoolInfo.classes.filter(c => !c.isActive);

  // Get classes grouped by CBE level
  const getClassesByLevel = (level) => {
    return cbeClasses.filter(c => c.level === level);
  };

  // AI Responsive Grid Layout
  const getGridLayout = () => {
    if (deviceInfo.isMobile) return 'grid-cols-1';
    if (deviceInfo.isTablet) return 'grid-cols-2 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5';
  };

  // AI Responsive Button Size
  const getButtonSize = () => {
    if (deviceInfo.isMobile) return 'px-6 py-3 text-base';
    if (deviceInfo.isTablet) return 'px-5 py-2.5 text-sm';
    return 'px-4 py-2 text-sm';
  };

  if (loading) {
    return (
      <Layout title="School Settings" subtitle="Configure school details, classes and streams">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="ml-4 text-gray-600">Loading school data from database...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="School Settings" subtitle="Configure school details, classes and streams">
      
      {/* AI Device Info Toggle */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {deviceInfo.isMobile ? (
            <FiSmartphone className="text-blue-600 text-xl" />
          ) : deviceInfo.isTablet ? (
            <FiTablet className="text-blue-600 text-xl" />
          ) : (
            <FiMonitor className="text-blue-600 text-xl" />
          )}
          <span className="text-sm text-gray-600 font-medium">
            {deviceInfo.type.charAt(0).toUpperCase() + deviceInfo.type.slice(1)} View
          </span>
        </div>
        <button
          onClick={() => setShowDeviceInfo(!showDeviceInfo)}
          className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full"
        >
          {showDeviceInfo ? 'Hide' : 'Show'} Device Info
        </button>
      </div>

      {/* AI Device Info Panel */}
      {showDeviceInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs">
          <h4 className="font-bold text-blue-800 mb-2">AI Device Detection Info</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="font-semibold">Device Type:</span> {deviceInfo.type}</div>
            <div><span className="font-semibold">OS:</span> {deviceInfo.os}</div>
            <div><span className="font-semibold">Browser:</span> {deviceInfo.browser}</div>
            <div><span className="font-semibold">Pixel Ratio:</span> {deviceInfo.pixelRatio}x</div>
            <div><span className="font-semibold">Screen:</span> {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
            <div><span className="font-semibold">Viewport:</span> {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight}</div>
            <div><span className="font-semibold">Mobile:</span> {deviceInfo.isMobile ? 'Yes' : 'No'}</div>
            <div><span className="font-semibold">Tablet:</span> {deviceInfo.isTablet ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}

      {/* School Information Section - AI Responsive */}
      <ResponsiveWrapper deviceInfo={deviceInfo} className="mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className={`font-bold text-gray-800 mb-4 flex items-center gap-2 ${
            deviceInfo.isMobile ? 'text-lg' : 'text-xl'
          }`}>
            <FiInfo className="text-blue-600" /> School Information
          </h2>
          
          <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-gray-700 font-medium mb-2">School Name *</label>
              <input
                type="text"
                name="name"
                value={schoolInfo.name}
                onChange={handleSchoolInfoChange}
                placeholder="Enter school name"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">School Email</label>
              <input
                type="email"
                name="email"
                value={schoolInfo.email}
                onChange={handleSchoolInfoChange}
                placeholder="school@example.com"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={schoolInfo.phone}
                onChange={handleSchoolInfoChange}
                placeholder="+254 700 000000"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Website</label>
              <input
                type="text"
                name="website"
                value={schoolInfo.website}
                onChange={handleSchoolInfoChange}
                placeholder="www.school.com"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
            </div>
            
            <div className={deviceInfo.isMobile ? 'col-span-1' : 'md:col-span-2'}>
              <label className="block text-gray-700 font-medium mb-2">School Address</label>
              <input
                type="text"
                name="address"
                value={schoolInfo.address}
                onChange={handleSchoolInfoChange}
                placeholder="Full address"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
            </div>
            
            <div className={deviceInfo.isMobile ? 'col-span-1' : 'md:col-span-2'}>
              <label className="block text-gray-700 font-medium mb-2">School Motto / Slogan</label>
              <input
                type="text"
                name="motto"
                value={schoolInfo.motto}
                onChange={handleSchoolInfoChange}
                placeholder="Quality Education for All"
                className={`input-field w-full ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
            </div>
          </div>
        </div>
      </ResponsiveWrapper>

      {/* Class Streams Configuration Section - AI Responsive */}
      <ResponsiveWrapper deviceInfo={deviceInfo} className="mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className={`font-bold text-gray-800 mb-4 flex items-center gap-2 ${
            deviceInfo.isMobile ? 'text-lg' : 'text-xl'
          }`}>
            <FiBookOpen className="text-green-600" /> Class & Streams Configuration
          </h2>
          
          <div className={`mb-4 flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'flex-wrap gap-4'}`}>
            <button
              onClick={loadStreamsFromPupils}
              disabled={isLoadingPupils}
              className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 ${
                getButtonSize()
              }`}
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoadingPupils ? 'animate-spin' : ''}`} /> 
              {isLoadingPupils ? 'Loading...' : 'Load Streams from Pupils'}
            </button>
            <button
              onClick={loadSchoolData}
              className={`bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 text-sm ${
                getButtonSize()
              }`}
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Maximum Streams per Class
            </label>
            <select
              value={maxStreams}
              onChange={handleMaxStreamsChange}
              className={`input-field ${deviceInfo.isMobile ? 'w-full' : 'w-48'}`}
            >
              <option value={1}>1 (No streams)</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {maxStreams === 1 ? 'No streams will be shown' : `Maximum ${maxStreams} streams per class can be added`}
            </p>
          </div>

          {/* CBE Class Selection - AI Responsive */}
          <div className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className={`font-bold text-blue-800 mb-3 flex items-center gap-2 ${
              deviceInfo.isMobile ? 'text-base' : ''
            }`}>
              <FiUsers className="w-5 h-5" /> CBE Standard Classes
            </h3>
            <p className="text-xs text-gray-600 mb-3">Select classes based on the Competency-Based Education (CBE) curriculum</p>
            
            <div className={`grid ${getGridLayout()} gap-3`}>
              {Object.entries(cbeLevels).map(([level, classes]) => (
                <div key={level} className="bg-white rounded-lg p-3 border">
                  <h4 className={`font-semibold text-gray-700 mb-2 ${deviceInfo.isMobile ? 'text-sm' : ''}`}>
                    {level}
                  </h4>
                  {classes.map(className => {
                    const isSelected = selectedCbeClasses.includes(className);
                    return (
                      <label key={className} className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-2 rounded ${
                        deviceInfo.isMobile ? 'text-sm' : ''
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedCbeClasses(prev => prev.filter(c => c !== className));
                            } else {
                              setSelectedCbeClasses(prev => [...prev, className]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className={deviceInfo.isMobile ? 'text-xs' : 'text-sm'}>
                          {className}
                          {className === 'Play Group' && ' (3-4 yrs)'}
                          {className === 'Pre-Primary 1' && ' (4-5 yrs)'}
                          {className === 'Pre-Primary 2' && ' (5-6 yrs)'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => addCbeClasses(selectedCbeClasses.filter(name => 
                !schoolInfo.classes.some(c => c.name === name)
              ))}
              disabled={selectedCbeClasses.length === 0 || selectedCbeClasses.every(name => 
                schoolInfo.classes.some(c => c.name === name)
              )}
              className={`mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 ${
                getButtonSize()
              }`}
            >
              Add Selected CBE Classes
            </button>
          </div>
          
          {/* Active Classes List - AI Responsive */}
          {schoolInfo.classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className={`${deviceInfo.isMobile ? 'text-base' : 'text-lg'}`}>No classes configured yet</p>
              <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>Select CBE classes above or add custom classes below</p>
            </div>
          ) : (
            <div className={`space-y-6 ${deviceInfo.isMobile ? 'max-h-96' : 'max-h-96'} overflow-y-auto`}>
              {activeClasses.map((cls) => {
                const isCbeClass = cbeClasses.some(c => c.name === cls.name);
                const cbeInfo = cbeClasses.find(c => c.name === cls.name);
                return (
                  <div key={cls.name} className="border border-gray-200 rounded-lg p-4">
                    <div className={`flex ${deviceInfo.isMobile ? 'flex-col items-start gap-2' : 'justify-between items-center'} mb-3`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-bold text-gray-800 ${deviceInfo.isMobile ? 'text-base' : 'text-lg'}`}>
                          {cls.name}
                        </h3>
                        {isCbeClass && cbeInfo && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full">
                            {cbeInfo.level}
                          </span>
                        )}
                        {isCbeClass && (
                          <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full">CBE</span>
                        )}
                      </div>
                      <div className={`flex ${deviceInfo.isMobile ? 'w-full justify-start' : ''} gap-2`}>
                        <button
                          onClick={() => toggleClassActive(cls.name)}
                          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <FiX className="w-4 h-4" /> Deactivate
                        </button>
                        {!isCbeClass && (
                          <button
                            onClick={() => removeCustomClass(cls.name)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                          >
                            <FiTrash2 className="w-4 h-4" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {maxStreams > 1 && (
                      <div className="space-y-2">
                        <label className="block text-gray-600 text-sm font-medium">Streams (Add from database)</label>
                        
                        {(streamNames[cls.name] || []).length > 0 ? (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(streamNames[cls.name] || []).map((stream, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                {stream || `Stream ${idx + 1}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No streams configured. Add streams below.</p>
                        )}
                        
                        {(streamNames[cls.name] || []).map((stream, idx) => (
                          <div key={idx} className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-2'} items-center`}>
                            <input
                              type="text"
                              value={stream}
                              onChange={(e) => handleStreamChange(cls.name, idx, e.target.value)}
                              placeholder={`Enter ${cls.name} stream name`}
                              className={`input-field ${deviceInfo.isMobile ? 'w-full' : 'flex-1'}`}
                            />
                            <button
                              onClick={() => removeStream(cls.name, idx)}
                              className="text-red-500 hover:text-red-700 p-2"
                              title="Remove stream"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        
                        {(streamNames[cls.name] || []).length < maxStreams && (
                          <button
                            onClick={() => addStream(cls.name)}
                            className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 mt-2"
                          >
                            <FiPlus className="w-4 h-4" /> ADD STREAM
                          </button>
                        )}
                        
                        <button
                          onClick={() => updateClassStreams(cls.name)}
                          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm mt-2 flex items-center gap-1 ${
                            deviceInfo.isMobile ? 'px-4 py-2' : 'px-3 py-1'
                          }`}
                        >
                          <FiCheck className="w-3 h-3" /> Update Streams
                        </button>
                      </div>
                    )}
                    
                    {maxStreams === 1 && (
                      <p className="text-gray-500 text-sm italic">No streams configured for this class</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Add Custom Class Section - AI Responsive */}
          {showAddClass ? (
            <div className="mt-4 border border-green-300 rounded-lg p-4 bg-green-50">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter new class name (e.g., A Level, Form 1, Remedial)"
                className={`input-field w-full mb-2 ${deviceInfo.isMobile ? 'text-base p-3' : ''}`}
              />
              <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
                <button
                  onClick={addCustomClass}
                  className={`bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1 ${
                    getButtonSize()
                  }`}
                >
                  <FiCheck className="w-4 h-4" /> Add Class
                </button>
                <button
                  onClick={() => setShowAddClass(false)}
                  className={`bg-gray-400 hover:bg-gray-500 text-white rounded-lg flex items-center gap-1 ${
                    getButtonSize()
                  }`}
                >
                  <FiX className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddClass(true)}
              className={`mt-4 text-green-600 hover:text-green-700 text-sm flex items-center gap-1 ${
                deviceInfo.isMobile ? 'w-full justify-center py-2' : ''
              }`}
            >
              <FiPlus className="w-4 h-4" /> Add Custom Class
            </button>
          )}
          
          {/* Inactive Classes Section */}
          {inactiveClasses.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className={`font-semibold text-gray-600 mb-2 ${deviceInfo.isMobile ? 'text-sm' : ''}`}>
                Inactive Classes
              </h3>
              <div className="flex flex-wrap gap-2">
                {inactiveClasses.map((cls) => (
                  <button
                    key={cls.name}
                    onClick={() => toggleClassActive(cls.name)}
                    className={`bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm flex items-center gap-1 ${
                      deviceInfo.isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1'
                    }`}
                  >
                    {cls.name} <FiRefreshCw className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ResponsiveWrapper>

      {/* Save Button - AI Responsive */}
      <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-3' : 'justify-end gap-4'}`}>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 ${
            deviceInfo.isMobile ? 'w-full justify-center px-6 py-4 text-base' : 'px-6 py-3'
          }`}
        >
          <FiSave /> {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
        </button>
      </div>

      {/* AI Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-view .input-field {
            font-size: 16px !important;
            padding: 12px !important;
          }
          .mobile-view .p-6 {
            padding: 16px !important;
          }
          .mobile-view .gap-4 {
            gap: 12px !important;
          }
          .mobile-view .text-xl {
            font-size: 1.125rem !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .tablet-view .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .tablet-view .p-6 {
            padding: 20px !important;
          }
        }
        
        .desktop-view .grid-cols-4 {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        
        .responsive-wrapper {
          transition: all 0.3s ease;
        }
        
        .responsive-wrapper .input-field {
          transition: all 0.3s ease;
        }
      `}</style>
    </Layout>
  );
};

export default SchoolSettings;