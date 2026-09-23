import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  FiAward, FiUserCheck, FiUsers, FiMail, FiLock, 
  FiUserPlus, FiAlertCircle, FiKey, FiArrowLeft, FiHash
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
    pixelRatio: 1
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = !isMobile && !isTablet;
      
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
        pixelRatio
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
    containerPadding: deviceInfo.isMobile ? 'p-4' : 'p-8',
    headingSize: deviceInfo.isMobile ? 'text-2xl' : 'text-3xl',
    buttonSize: deviceInfo.isMobile ? 'py-2.5 text-sm' : 'py-2',
    cardPadding: deviceInfo.isMobile ? 'p-3' : 'p-4',
    gridCols: deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-2',
    iconSize: deviceInfo.isMobile ? 'w-6 h-6' : 'w-8 h-8',
    logoSize: deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'
  };
};

const Login = () => {
  // AI Device Detection
  const deviceInfo = useDeviceDetection();
  const responsive = useResponsiveClasses(deviceInfo);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Admin registration state
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('form');
  const [regData, setRegData] = useState({
    schoolName: '',
    schoolEmail: '',
    schoolCode: '',
    phoneNumber: '',
    address: '',
    website: '',
    adminName: '',
    adminPhone: ''
  });
  
  const navigate = useNavigate();
  const { 
    login, 
    completeLogin, 
    resendAdminCode,
    sendVerificationCode, 
    signup, 
    loginStep, 
    setLoginStep,
    tempLoginData,
    loading: authLoading,
    user,
    isAuthenticated
  } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && isAuthenticated) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'teacher') {
        navigate('/teacher/dashboard', { replace: true });
      }
    }
  }, [user, isAuthenticated, navigate]);

  // ===== PORTAL SELECTION HANDLERS =====
  const handleSelectAdminPortal = () => {
    setSelectedRole('admin');
    setEmail('');
    setPassword('');
  };

  const handleSelectTeacherPortal = () => {
    setSelectedRole('teacher');
    setEmail('');
    setPassword('');
  };

  const handleBackToPortals = () => {
    setSelectedRole('');
    setEmail('');
    setPassword('');
  };

  // ===== REGISTRATION HANDLERS =====
  const handleRegChange = (e) => {
    const { name, value } = e.target;
    setRegData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendVerification = async () => {
    if (!regData.schoolName.trim()) {
      toast.error('Please enter school name');
      return;
    }
    if (!regData.schoolEmail.trim()) {
      toast.error('Please enter school email');
      return;
    }
    if (!regData.schoolCode.trim() || regData.schoolCode.length < 6) {
      toast.error('School code must be at least 6 characters');
      return;
    }
    if (!regData.adminName.trim()) {
      toast.error('Please enter administrator name');
      return;
    }
    
    setLoading(true);
    try {
      const result = await sendVerificationCode(regData.schoolEmail, regData.schoolName);
      if (result.success) {
        // Toast already shown by AuthContext.sendVerificationCode
        setRegistrationStep('verification');
      } else {
        toast.error(result.message || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('Error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignUp = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    try {
      const result = await signup(regData, verificationCode);
      if (result.success) {
        // Toast already shown by AuthContext.signup
        navigate('/admin/dashboard');
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN HANDLERS =====
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast.error('Please select a role first');
      return;
    }
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, selectedRole);
      
      if (result.success) {
        if (result.requiresVerification) {
          // Toast for "code sent" already shown by AuthContext.login
          setLoginStep('verification');
        } else {
          // ✅ REMOVED: toast.success('Login successful!') — no success toast for teacher login
          const userData = result.user;
          if (!userData) {
            setLoading(false);
            return;
          }
          if (userData.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (userData.role === 'teacher') {
            navigate('/teacher/dashboard', { replace: true });
          }
        }
      }
      // ✅ REMOVED: toast.error(result.message || 'Login failed')
      // No error toast when email/password is wrong — silent failure
    } catch (error) {
      // ✅ REMOVED: toast.error('Login failed. Please try again.')
      // Silent catch — no toast on network error either
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLogin = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    try {
      const result = await completeLogin(verificationCode);
      if (result.success) {
        // ✅ REMOVED: toast.success('Login successful!') — no success toast for admin verify
        const role = result.user.role;
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'teacher') {
          navigate('/teacher/dashboard', { replace: true });
        }
      }
      // ✅ REMOVED: toast.error(result.message || 'Verification failed')
      // No error toast on wrong verification code
    } catch (error) {
      // ✅ REMOVED: toast.error('Login verification failed. Please try again.')
      // Silent catch
    } finally {
      setLoading(false);
      setVerificationCode('');
    }
  };

  // ============ HANDLE RESEND CODE ============
  const handleResendCode = async () => {
    const email = tempLoginData?.email;
    
    if (!email) {
      toast.error('No email found. Please try logging in again.');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await resendAdminCode(email);
      
      if (result.success) {
        // Toast already shown by AuthContext.resendAdminCode
        setVerificationCode('');
        
        setTimeout(() => {
          const input = document.querySelector('input[type="text"]');
          if (input) input.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Unexpected error in handleResendCode:', error);
      // ✅ REMOVED: toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false);
    }
  };

  // ============ VERIFICATION STEP (Admin Only) ============
  if (loginStep === 'verification') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full ${responsive.containerPadding}`}>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full">
                <FiKey className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-white`} />
              </div>
            </div>
            <h1 className={`${responsive.headingSize} font-bold text-gray-800 mb-2`}>Verify Login</h1>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit verification code to<br />
              <span className="font-semibold text-green-600">{tempLoginData?.email}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Code expires in 15 minutes
            </p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-2 text-center">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                maxLength="6"
                className={`w-full text-center ${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-gray-400 text-center mt-1">
                Enter the 6-digit code sent to your email
              </p>
            </div>
            
            <button
              onClick={handleCompleteLogin}
              disabled={loading || verificationCode.length !== 6}
              className={`w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 ${responsive.buttonSize}`}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            
            <div className="flex justify-between text-sm">
              <button
                onClick={() => {
                  setLoginStep('credentials');
                  setVerificationCode('');
                }}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                disabled={loading}
              >
                <FiArrowLeft className="w-4 h-4" /> Back to Login
              </button>
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <FiKey className="w-4 h-4" />
                {loading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Fusion XE CBE System: Transforming Learning Through Technology. Developed by Stancylus Kalong'o | Contact: 0746919850
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ REGISTRATION VERIFICATION STEP ============
  if (registrationStep === 'verification') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full ${responsive.containerPadding}`}>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full">
                <FiMail className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-white`} />
              </div>
            </div>
            <h1 className={`${responsive.headingSize} font-bold text-gray-800 mb-2`}>Verify Your Email</h1>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit verification code to<br />
              <span className="font-semibold text-green-600">{regData.schoolEmail}</span>
            </p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-2 text-center">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                maxLength="6"
                className={`w-full text-center ${deviceInfo.isMobile ? 'text-xl' : 'text-2xl'} tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                placeholder="000000"
                autoFocus
              />
            </div>
            
            <button
              onClick={handleVerifyAndSignUp}
              disabled={loading || verificationCode.length !== 6}
              className={`w-full bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors disabled:opacity-50 font-semibold ${responsive.buttonSize}`}
            >
              {loading ? 'Verifying...' : 'Verify & Register'}
            </button>
            
            <div className="flex justify-between text-sm">
              <button
                onClick={() => {
                  setRegistrationStep('form');
                  setVerificationCode('');
                }}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <FiArrowLeft className="w-4 h-4" /> Back to Form
              </button>
              <button
                onClick={handleSendVerification}
                className="text-green-600 hover:text-green-700"
              >
                Resend Code
              </button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Fusion XE CBE System: Transforming Learning Through Technology. Developed by Stancylus Kalong'o | Contact: 0746919850
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ REGISTRATION FORM ============
  if (showRegistration) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full ${responsive.containerPadding}`}>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full">
                <FiUserPlus className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-white`} />
              </div>
            </div>
            <h1 className={`${responsive.headingSize} font-bold text-gray-800 mb-2`}>Register New School</h1>
            <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Create an account to start using CBE System</p>
          </div>
          
          <div className={`space-y-3 ${deviceInfo.isMobile ? 'max-h-[50vh]' : 'max-h-[60vh]'} overflow-y-auto pr-2`}>
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className={`font-semibold text-blue-800 mb-2 flex items-center gap-2 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                <FiAward className="w-4 h-4" /> School Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className={`block text-gray-700 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium mb-0.5`}>School Name *</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={regData.schoolName}
                    onChange={handleRegChange}
                    placeholder="Enter school name"
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-sm' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-gray-700 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium mb-0.5`}>School Email *</label>
                  <input
                    type="email"
                    name="schoolEmail"
                    value={regData.schoolEmail}
                    onChange={handleRegChange}
                    placeholder="school@example.com"
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-sm' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-gray-700 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium mb-0.5`}>School Code (Password) *</label>
                  <input
                    type="text"
                    name="schoolCode"
                    value={regData.schoolCode}
                    onChange={handleRegChange}
                    placeholder="6+ characters"
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-sm' : ''}`}
                  />
                  <p className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} text-gray-400 mt-0.5`}>This will be your admin login password</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <h3 className={`font-semibold text-green-800 mb-2 flex items-center gap-2 ${deviceInfo.isMobile ? 'text-xs' : 'text-sm'}`}>
                <FiUserCheck className="w-4 h-4" /> Administrator
              </h3>
              <div className="space-y-2">
                <div>
                  <label className={`block text-gray-700 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium mb-0.5`}>Administrator Name *</label>
                  <input
                    type="text"
                    name="adminName"
                    value={regData.adminName}
                    onChange={handleRegChange}
                    placeholder="Full name"
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-sm' : ''}`}
                  />
                </div>
                <div>
                  <label className={`block text-gray-700 ${deviceInfo.isMobile ? 'text-[10px]' : 'text-xs'} font-medium mb-0.5`}>Phone (Optional)</label>
                  <input
                    type="tel"
                    name="adminPhone"
                    value={regData.adminPhone}
                    onChange={handleRegChange}
                    placeholder="Contact number"
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-sm' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className={`flex ${deviceInfo.isMobile ? 'flex-col gap-2' : 'gap-3'} pt-4`}>
            <button
              onClick={() => {
                setShowRegistration(false);
                setRegistrationStep('form');
                setVerificationCode('');
              }}
              className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors ${deviceInfo.isMobile ? 'text-sm' : ''}`}
            >
              Back
            </button>
            <button
              onClick={handleSendVerification}
              disabled={loading}
              className={`${deviceInfo.isMobile ? 'w-full' : 'flex-1'} bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors disabled:opacity-50 font-semibold ${deviceInfo.isMobile ? 'text-sm' : ''}`}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Fusion XE CBE System: Transforming Learning Through Technology. Developed by Stancylus Kalong'o | Contact: 0746919850
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN LOGIN - PORTAL SELECTION ============
  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center ${deviceInfo.isMobile ? 'p-3' : 'p-4'}`}>
      <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full ${responsive.containerPadding}`}>
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full">
              <FiAward className={`${responsive.logoSize} text-white`} />
            </div>
          </div>
          <h1 className={`${responsive.headingSize} font-bold text-gray-800 mb-1`}>CBE System</h1>
          <p className={`${deviceInfo.isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>Competency Based Education</p>
        </div>
        
        {!selectedRole && (
          <div className={`grid ${responsive.gridCols} gap-4 mb-6`}>
            <button
              onClick={handleSelectAdminPortal}
              className="p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all hover:shadow-md"
            >
              <div className="text-center">
                <div className="text-gray-500 mb-2">
                  <FiUserCheck className={`${responsive.iconSize} mx-auto`} />
                </div>
                <div className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>Admin Portal</div>
              </div>
            </button>
            
            <button
              onClick={handleSelectTeacherPortal}
              className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all hover:shadow-md"
            >
              <div className="text-center">
                <div className="text-gray-500 mb-2">
                  <FiUsers className={`${responsive.iconSize} mx-auto`} />
                </div>
                <div className={`${deviceInfo.isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>Teacher Portal</div>
              </div>
            </button>
          </div>
        )}

        {selectedRole === 'admin' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-green-600">Admin Login</h2>
            </div>
            
            <div>
              <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-base' : ''}`}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${deviceInfo.isMobile ? 'text-base' : ''}`}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToPortals}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 py-2"
              >
                {loading ? 'Processing...' : 'Login as Admin'}
              </button>
            </div>
            
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  setShowRegistration(true);
                  setSelectedRole('');
                }}
                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <FiUserPlus className="w-4 h-4" />
                Register New School
              </button>
            </div>
          </form>
        )}

        {selectedRole === 'teacher' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-blue-600">Teacher Login</h2>
            </div>
            
            <div>
              <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-base' : ''}`}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-gray-700 font-medium ${deviceInfo.isMobile ? 'text-sm' : 'text-base'} mb-1`}>TSC Number</label>
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${deviceInfo.isMobile ? 'text-base' : ''}`}
                  placeholder="Enter your TSC number"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use your TSC number as your password
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToPortals}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 py-2"
              >
                {loading ? 'Processing...' : 'Login as Teacher'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className={`${deviceInfo.isMobile ? 'text-[8px]' : 'text-[10px]'} text-gray-400 leading-relaxed`}>
            Fusion XE CBE System: Transforming Learning Through Technology. Developed by Stancylus Kalong'o | Contact: 0746919850
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;