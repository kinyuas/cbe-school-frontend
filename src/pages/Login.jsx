// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  FiAward, FiUserCheck, FiUsers, FiMail, FiLock,
  FiKey, FiArrowLeft, FiHash, FiUser, FiBookOpen, FiChevronRight, FiAlertCircle
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false, isTablet: false, isDesktop: true
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      setDeviceInfo({ isMobile, isTablet, isDesktop: !isMobile && !isTablet });
    };
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

const Login = () => {
  const deviceInfo = useDeviceDetection();
  const navigate = useNavigate();

  const {
    login,
    completeLogin,
    loginStep,
    setLoginStep,
    tempLoginData,
    user,
    isAuthenticated,
    getHomeRoute,
    setSession,           // 👈 new — see AuthContext diff below
  } = useAuth();

  // Main State
  const [portal, setPortal] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [parentPupilRole, setParentPupilRole] = useState('pupil');

  // Verification State
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Parent/Pupil Portal Status State
  const [allowParentPupil, setAllowParentPupil] = useState(true);
  const [checkingSchool, setCheckingSchool] = useState(false);

  // Redirect if already logged in (safety net)
  useEffect(() => {
    if (user && isAuthenticated) {
      const home = getHomeRoute();
      if (home && home !== '/login') {
        navigate(home, { replace: true });
      }
    }
  }, [user, isAuthenticated, navigate, getHomeRoute]);

  // Check if the Parent/Pupil portal is enabled for this school
  useEffect(() => {
    const checkPortalStatus = async () => {
      if (schoolCode.length >= 4) {
        setCheckingSchool(true);
        try {
          const res = await api.get(`/school/lookup/${schoolCode}`);
          if (res.data && res.data.success) {
            setAllowParentPupil(res.data.allowParentPupilPortal !== false);
          } else {
            setAllowParentPupil(true);
          }
        } catch (e) {
          setAllowParentPupil(true);
        } finally {
          setCheckingSchool(false);
        }
      }
    };

    const timer = setTimeout(checkPortalStatus, 500);
    return () => clearTimeout(timer);
  }, [schoolCode]);

  // ===== HANDLERS =====
  const handleSelectPortal = (selectedPortal) => {
    setPortal(selectedPortal);
    setSchoolCode('');
    setIdentifier('');
    setPassword('');
    setParentPupilRole('pupil');
  };

  const handleBackToPortals = () => {
    setPortal('');
    setSchoolCode('');
    setIdentifier('');
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (portal === 'parent_pupil' && !allowParentPupil && schoolCode.length >= 4) {
      return toast.error('Parent/Pupil portal is currently disabled for this school.');
    }

    if (!schoolCode || !identifier) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // ── ADMIN ─────────────────────────────────────────────
      if (portal === 'admin') {
        const result = await login(`${schoolCode}-${identifier}`, password, 'admin');

        if (result?.requiresVerification) {
          setLoginStep('verification');
        } else if (result?.user) {
          // Effect will navigate, but do it explicitly too
          const home = getHomeRoute();
          navigate(home && home !== '/login' ? home : '/login', { replace: true });
        }
      }
      // ── TEACHER ───────────────────────────────────────────
      else if (portal === 'teacher') {
        const result = await login(`${schoolCode}-${identifier}`, password, 'teacher');
        if (result?.user) {
          const home = getHomeRoute();
          navigate(home && home !== '/login' ? home : '/login', { replace: true });
        }
      }
      // ── PARENT / PUPIL ────────────────────────────────────
      else if (portal === 'parent_pupil') {
        // Backend endpoint expects `email` to carry the AdmNo and `loginType`
        // to be 'parent' or 'pupil'. We call the API directly, then push the
        // session into AuthContext so state + auth header + idle timers all
        // update correctly. That's what makes the redirect actually work.
        const res = await api.post('/auth/login', {
          schoolCode,
          email: identifier,
          password,
          loginType: parentPupilRole,
        });

        if (res.data?.token && res.data?.user) {
          // setSession sets localStorage, Authorization header, and context user
          setSession(res.data.token, res.data.user);

          // Derive home route from the returned role so it's resilient even if
          // getHomeRoute hasn't re-run with fresh state yet.
          const role = res.data.user.role;
          const home =
            role === 'parent' ? '/parent/dashboard' :
            role === 'pupil'  ? '/pupil/dashboard'  :
            getHomeRoute();

          toast.success('Login successful');
          navigate(home || '/login', { replace: true });
        } else {
          toast.error(res.data?.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login submit error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLogin = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await completeLogin(verificationCode);
      if (result?.success) {
        const home = getHomeRoute();
        navigate(home && home !== '/login' ? home : '/login', { replace: true });
      }
      setVerificationCode('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Determine button color based on selected portal
  const getButtonColor = () => {
    if (portal === 'admin') return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:ring-emerald-500';
    if (portal === 'teacher') return 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 focus:ring-blue-500';
    return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:ring-purple-500';
  };

  // ============ VERIFICATION SCREEN ============
  if (loginStep === 'verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full inline-block mb-3">
              <FiKey className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verify Login</h1>
            <p className="text-gray-600 text-sm">
              We sent a code to <span className="font-semibold text-green-600">{tempLoginData?.email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="000000"
              autoFocus
            />

            <button
              onClick={handleCompleteLogin}
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div className="flex justify-between text-sm pt-2">
              <button onClick={() => setLoginStep('credentials')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <FiArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => {
                toast.success('Please check your email or wait a moment before requesting a new code.');
              }} className="text-green-600 hover:text-green-700">
                Resend Code
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN LOGIN SCREEN ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full inline-block mb-3 shadow-lg">
            <FiAward className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">CBE System</h1>
          <p className="text-sm text-gray-500">Competency Based Education</p>
        </div>

        {/* Portal Selection */}
        {!portal && (
          <div className="space-y-4">
            <h2 className="text-center text-gray-600 font-medium mb-5">Select your portal</h2>

            {/* School Admin Card */}
            <button
              onClick={() => handleSelectPortal('admin')}
              className="w-full p-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-full">
                    <FiUserCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-800 text-lg">School Admin</div>
                    <div className="text-xs text-gray-500">Manage school & bursar access</div>
                  </div>
                </div>
                <FiChevronRight className="text-gray-300 w-5 h-5" />
              </div>
            </button>

            {/* Teacher Card */}
            <button
              onClick={() => handleSelectPortal('teacher')}
              className="w-full p-1 rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-full">
                    <FiUsers className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-800 text-lg">Teacher</div>
                    <div className="text-xs text-gray-500">Access classes & record skills</div>
                  </div>
                </div>
                <FiChevronRight className="text-gray-300 w-5 h-5" />
              </div>
            </button>

            {/* Parent / Pupil Card */}
            <button
              onClick={() => handleSelectPortal('parent_pupil')}
              className="w-full p-1 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-50 p-3 rounded-full">
                    <FiBookOpen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-800 text-lg">Parent / Pupil</div>
                    <div className="text-xs text-gray-500">View results & reports</div>
                  </div>
                </div>
                <FiChevronRight className="text-gray-300 w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        {/* Login Form */}
        {portal && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
            <button
              type="button"
              onClick={handleBackToPortals}
              className="text-sm text-gray-500 flex items-center gap-1 mb-3 hover:text-gray-800 transition-colors"
            >
              <FiArrowLeft /> Back to Portals
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {portal === 'admin' ? 'School Admin Login' : portal === 'teacher' ? 'Teacher Login' : 'Parent / Pupil Login'}
            </h2>

            {/* School Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Code</label>
              <div className="relative">
                <FiHash className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="1001"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Parent/Pupil disabled warning */}
            {portal === 'parent_pupil' && !allowParentPupil && schoolCode.length >= 4 && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm">
                <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>The Parent/Pupil portal has been disabled for this school by the Super Admin. You cannot log in.</p>
              </div>
            )}

            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {portal === 'parent_pupil'
                  ? (parentPupilRole === 'pupil' ? 'Admission Number' : 'Admission Number (of your child)')
                  : 'Email Address'}
              </label>
              <div className="relative">
                {portal === 'parent_pupil' ? (
                  <FiUser className="absolute left-3 top-3 text-gray-400" />
                ) : (
                  <FiMail className="absolute left-3 top-3 text-gray-400" />
                )}
                <input
                  type={portal === 'parent_pupil' ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portal === 'parent_pupil' ? '4502' : 'admin@school.com'}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  required
                />
              </div>
              {portal === 'parent_pupil' && parentPupilRole === 'parent' && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Enter any one child's admission number — you'll see all your children after login.
                </p>
              )}
            </div>

            {/* Password */}
            {portal !== 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {portal === 'teacher'
                    ? 'TSC Number'
                    : parentPupilRole === 'parent'
                      ? 'Parent ID No'
                      : 'Birth Cert No'}
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Role Toggle for Parent/Pupil */}
            {portal === 'parent_pupil' && (
              <div className="flex gap-6 text-sm mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    checked={parentPupilRole === 'pupil'}
                    onChange={() => setParentPupilRole('pupil')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  /> Pupil
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    checked={parentPupilRole === 'parent'}
                    onChange={() => setParentPupilRole('parent')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  /> Parent
                </label>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (portal === 'parent_pupil' && !allowParentPupil && schoolCode.length >= 4)}
              className={`w-full text-white py-3 rounded-lg font-semibold transition-all mt-4 disabled:opacity-50 shadow-md ${getButtonColor()}`}
            >
              {loading ? 'Processing...' : portal === 'admin' ? 'Send Secure Code' : 'Login'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Fusion XE CBE System: Transforming Learning Through Technology.<br />
            Developed by Stancylus Kalong'o | Contact: 0746919850
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;