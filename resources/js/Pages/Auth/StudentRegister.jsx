import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
  FaGraduationCap, 
  FaShieldAlt, 
  FaChartLine, 
  FaCalendarAlt, 
  FaUsers,
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaUserPlus,
  FaCheckCircle,
  FaCode,
  FaClock,
  FaRedo
} from 'react-icons/fa';

export default function StudentRegister() {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    middlename: '',
    email: '',
    password: '',
    password_confirmation: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Email verification states
  const [step, setStep] = useState(1); // 1: form, 2: verification, 3: complete registration
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Page transition animation on mount
  useEffect(() => {
    const container = document.querySelector('.page-container');
    if (container) {
      container.classList.add('animate-fadeIn');
    }
  }, []);

  // Countdown timer for resend code
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle navigation with smooth transition
  const handleNavigation = (url) => {
    setIsNavigating(true);
    
    // Add fade out animation
    const container = document.querySelector('.page-container');
    if (container) {
      container.classList.add('animate-fadeOut');
    }
    
    // Navigate after animation completes
    setTimeout(() => {
      router.visit(url, {
        onStart: () => {
          // Show loading indicator
          const loadingEl = document.createElement('div');
          loadingEl.className = 'fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center z-50 transition-opacity duration-300';
          loadingEl.innerHTML = `
            <div class="text-center text-white">
              <div class="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-lg font-medium">Loading...</p>
            </div>
          `;
          document.body.appendChild(loadingEl);
        },
        onFinish: () => {
          setIsNavigating(false);
          // Remove loading indicator
          const loadingEl = document.querySelector('.fixed.inset-0.bg-gradient-to-br');
          if (loadingEl) {
            loadingEl.remove();
          }
        }
      });
    }, 300);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstname.trim()) {
      newErrors.firstname = 'First name is required';
    }

    if (!formData.lastname.trim()) {
      newErrors.lastname = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    return newErrors;
  };

  // Send verification code to email
  const sendVerificationCode = async () => {
    // Validate complete form including passwords
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSendingCode(true);
    setErrors({});

    try {
      // Get CSRF token (optional since route is excluded from CSRF verification)
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const response = await fetch('/auth/send-verification-code', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          email: formData.email,
          firstname: formData.firstname,
          lastname: formData.lastname
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message || 'Failed to send verification code.' });
        }
        return;
      }

      if (data.success) {
        setStep(2);
        setCountdown(60); // 60 seconds countdown for resend
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Verification code sent to your email!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Send verification code error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify the code entered by user
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Please enter a valid 6-digit verification code.' });
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      // Get CSRF token (optional since route is excluded from CSRF verification)
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const response = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          code: verificationCode,
          email: formData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ code: data.message || 'Invalid verification code.' });
        return;
      }

      if (data.success) {
        setIsEmailVerified(true);
        setStep(3);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Email verified successfully!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Verify code error:', error);
      setErrors({ code: 'Network error. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend verification code
  const resendVerificationCode = async () => {
    setIsSendingCode(true);
    setErrors({});

    try {
      // Get CSRF token (optional since route is excluded from CSRF verification)
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const response = await fetch('/auth/resend-verification-code', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          email: formData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ code: data.message || 'Failed to resend verification code.' });
        return;
      }

      if (data.success) {
        setCountdown(60);
        setVerificationCode(''); // Clear the input
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'New verification code sent!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Resend code error:', error);
      setErrors({ code: 'Network error. Please try again.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check for CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!csrfToken) {
      setErrors({ general: 'Security token not found. Please refresh the page and try again.' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${window.location.protocol}//${window.location.host}/register/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message || 'Registration failed. Please try again.' });
        }
        return;
      }

      if (data.success) {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Registration successful! Redirecting to login...';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          document.body.removeChild(successMessage);
          handleNavigation('/login');
        }, 2000);
      } else {
        setErrors({ general: data.message || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head title="Student Registration - ONSTS" />
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px] max-h-[95vh]">
          
          {/* Left Panel - Registration Form */}
          <div className="w-full lg:w-1/2 p-3 lg:p-4 flex flex-col justify-start py-6 overflow-y-auto">
            <div className="max-w-md mx-auto w-full flex-shrink-0">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Create Your Account</h2>
                <p className="text-gray-600 text-xs">Join ONSTS and start your journey</p>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                </div>
              </div>

              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaUser className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Personal Information</h3>
                    <p className="text-gray-600 text-xs">
                      Please provide your basic information to get started
                    </p>
                  </div>

                  {/* General Error Display */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <p className="text-red-600 text-sm font-medium">{errors.general}</p>
                      </div>
                    </div>
                  )}

                <form onSubmit={(e) => { e.preventDefault(); sendVerificationCode(); }} className="space-y-4">
                {/* Name Fields Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* First Name */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="First name"
                        required
                      />
                    </div>
                    {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname}</p>}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Last Name *
                    </label>
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Last name"
                        required
                      />
                    </div>
                    {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname}</p>}
                  </div>
                </div>

                {/* Middle Name */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Middle Name (Optional)
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input
                      type="text"
                      name="middlename"
                      value={formData.middlename}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="Middle name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Password Fields Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <FaEyeSlash className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <FaCheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Confirm password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
                      </button>
                    </div>
                    {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                  </div>
                </div>

                {/* General Error */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg text-sm"
                  >
                    {isSendingCode ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending Code...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FaEnvelope className="w-4 h-4" />
                        Send Verification Code
                      </div>
                    )}
                  </button>
                </form>
                </div>
              )}

              {/* Step 2: Email Verification */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaCode className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Check Your Email</h3>
                    <p className="text-gray-600 text-xs">
                      We've sent a 6-digit verification code to<br />
                      <span className="font-semibold text-blue-600">{formData.email}</span>
                    </p>
                  </div>

                  {/* General Error Display */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <p className="text-red-600 text-sm font-medium">{errors.general}</p>
                      </div>
                    </div>
                  )}

                  {/* Verification Code Input */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-2 text-center">
                      Enter Verification Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(value);
                          if (errors.code) {
                            setErrors(prev => ({ ...prev, code: '' }));
                          }
                        }}
                        className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="000000"
                        maxLength="6"
                      />
                    </div>
                    {errors.code && <p className="text-red-500 text-xs mt-1 text-center">{errors.code}</p>}
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={verifyCode}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg text-sm"
                  >
                    {isVerifying ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Verifying...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FaCheckCircle className="w-4 h-4" />
                        Verify Email
                      </div>
                    )}
                  </button>

                  {/* Resend Code Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm mb-3">Didn't receive the code?</p>
                      {countdown > 0 ? (
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                          <FaClock className="w-4 h-4" />
                          <span>Resend available in {countdown} seconds</span>
                        </div>
                      ) : (
                        <button
                          onClick={resendVerificationCode}
                          disabled={isSendingCode}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 mx-auto"
                        >
                          <FaRedo className="w-3 h-3" />
                          {isSendingCode ? 'Sending...' : 'Resend Code'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => setStep(1)}
                    className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
                  >
                    ← Back to Form
                  </button>
                </div>
              )}

              {/* Step 3: Complete Registration */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Step Header - More Compact */}
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaCheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Email Verified!</h3>
                    <p className="text-gray-600 text-xs">
                      Ready to create your account
                    </p>
                  </div>

                  {/* Compact Account Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-3">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <FaUser className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="font-semibold text-xs">Account Summary</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-medium text-blue-700">Name:</span>
                        <span className="text-xs text-blue-900 font-semibold">
                          {formData.firstname} {formData.lastname}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-t border-blue-200/30">
                        <span className="text-xs font-medium text-blue-700">Email:</span>
                        <span className="text-xs text-blue-900 font-semibold">{formData.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-t border-blue-200/30">
                        <span className="text-xs font-medium text-blue-700">Status:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-700 font-semibold">Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General Error */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <p className="text-red-600 text-xs font-medium">{errors.general}</p>
                      </div>
                    </div>
                  )}

                  {/* Create Account Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg text-sm"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FaUserPlus className="w-4 h-4" />
                        Create My Account
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* Login Link */}
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation('/login');
                    }}
                  >
                    Sign In
                  </Link>
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center text-xs text-gray-500">
                2024 ONSTS. Secure • Reliable • Innovative
              </div>
            </div>
          </div>

          {/* Right Panel - ONSTS Branding */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-6 lg:p-8 flex flex-col justify-center items-center text-white relative overflow-hidden min-h-[400px] lg:min-h-full">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
              <div className="absolute bottom-10 right-10 w-24 h-24 border border-white/20 rounded-full"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white/20 rounded-full"></div>
            </div>
            
            {/* Logo and Branding */}
            <div className="relative z-10 text-center w-full max-w-md mx-auto">
              <div className="mb-6">
                <img 
                  src="/onsts.png" 
                  alt="ONSTS Logo" 
                  className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-4 rounded-full bg-white p-2 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg hidden">
                  <FaGraduationCap className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 leading-tight">Join ONSTS</h1>
              <p className="text-base lg:text-lg mb-2 font-medium leading-relaxed">Online Student Tracking System</p>
              <p className="text-blue-100 mb-6 lg:mb-8 text-sm lg:text-base leading-relaxed">Start Your Educational Journey Today</p>
              
              {/* Feature Highlights */}
              <div className="space-y-3 text-left w-full max-w-sm mx-auto">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 hover:bg-white/20">
                  <div className="flex-shrink-0">
                    <FaShieldAlt className="w-4 h-4 lg:w-5 lg:h-5 text-green-300" />
                  </div>
                  <span className="text-sm lg:text-base font-medium">Easy Online Enrollment</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 hover:bg-white/20">
                  <div className="flex-shrink-0">
                    <FaChartLine className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-300" />
                  </div>
                  <span className="text-sm lg:text-base font-medium">Real-time Grade Access</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 hover:bg-white/20">
                  <div className="flex-shrink-0">
                    <FaCalendarAlt className="w-4 h-4 lg:w-5 lg:h-5 text-pink-300" />
                  </div>
                  <span className="text-sm lg:text-base font-medium">Digital Schedule Management</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 hover:bg-white/20">
                  <div className="flex-shrink-0">
                    <FaUsers className="w-4 h-4 lg:w-5 lg:h-5 text-purple-300" />
                  </div>
                  <span className="text-sm lg:text-base font-medium">24/7 Student Portal Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
