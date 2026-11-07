// src/pages/SuperAdmin/SuperAdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiShield, FiArrowLeft } from 'react-icons/fi';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'code'
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/administrator/login-request', { email });
      toast.success('Login code sent to your email');
      setStep('code');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unauthorized access');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/administrator/login-verify', { email, code });
      localStorage.setItem('superAdminToken', res.data.token);
      toast.success('Welcome Super Admin');
      navigate('/sys-admin-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        
        <div className="text-center mb-8">
          <div className="bg-indigo-600/20 p-4 rounded-full inline-block mb-4">
            <FiShield className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin Access</h1>
          <p className="text-gray-400 text-sm mt-1">Restricted System Control</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Admin Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Secure Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
             <p className="text-sm text-gray-400 text-center mb-4">Code sent to <b>{email}</b></p>
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 text-center">6-Digit Code</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-gray-700 text-white text-center tracking-widest text-xl pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-gray-400 text-sm flex items-center justify-center gap-1 hover:text-white">
              <FiArrowLeft /> Back to Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SuperAdminLogin;