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
  FaCheckCircle
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

  // Page transition animation on mount
  useEffect(() => {
    const container = document.querySelector('.page-container');
    if (container) {
      container.classList.add('animate-fadeIn');
    }
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${window.location.protocol}//${window.location.host}/auth/register/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[600px] max-h-[85vh]">
          
          {/* Left Panel - Registration Form */}
          <div className="w-1/2 p-8 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Account</h2>
                <p className="text-gray-600 text-sm">Join ONSTS and start your journey</p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <FaUserPlus className="w-4 h-4" />
                      Create ONSTS Account
                    </div>
                  )}
                </button>
              </form>

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
          <div className="w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-8 flex flex-col justify-center items-center text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
              <div className="absolute bottom-10 right-10 w-24 h-24 border border-white/20 rounded-full"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white/20 rounded-full"></div>
            </div>
            
            {/* Logo and Branding */}
            <div className="relative z-10 text-center">
              <div className="mb-6">
                <img 
                  src="/onsts.png" 
                  alt="ONSTS Logo" 
                  className="w-24 h-24 mx-auto mb-4 rounded-full bg-white p-2 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg hidden">
                  <FaGraduationCap className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold mb-2">Join ONSTS</h1>
              <p className="text-lg mb-2 font-medium">Online Student Tracking System</p>
              <p className="text-blue-100 mb-8 text-sm">Start Your Educational Journey Today</p>
              
              {/* Feature Highlights */}
              <div className="space-y-3 text-left max-w-sm">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <FaShieldAlt className="w-5 h-5 text-green-300" />
                  <span className="text-sm">Easy Online Enrollment</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <FaChartLine className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm">Real-time Grade Access</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <FaCalendarAlt className="w-5 h-5 text-pink-300" />
                  <span className="text-sm">Digital Schedule Management</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <FaUsers className="w-5 h-5 text-purple-300" />
                  <span className="text-sm">24/7 Student Portal Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
