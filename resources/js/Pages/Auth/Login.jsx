import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { AuthManager } from '../../auth';
import { FaGraduationCap, FaShieldAlt, FaChartLine, FaCalendarAlt, FaUsers, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaSpinner } from 'react-icons/fa';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Check for existing session on component mount
  useEffect(() => {
    const existingSession = AuthManager.checkForExistingSession();
    if (existingSession.hasSession) {
      // User is already authenticated, redirect to appropriate dashboard
      const redirectUrl = AuthManager.getRedirectUrl();
      router.visit(redirectUrl);
    }
  }, []);

  // Page transition animation on mount
  useEffect(() => {
    const container = document.querySelector('.page-container');
    if (container) {
      container.classList.add('animate-fadeIn');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message || 'Login failed. Please try again.' });
        }
        return;
      }

      if (data.success) {
        // Generate session ID
        const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use AuthManager to store authentication data
        const dashboardUrl = AuthManager.login(data.user, data.token, sessionId);
        
        // Show success message briefly before redirect
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2';
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>Login successful! Redirecting...</span>
        `;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
          if (data.password_change_required) {
            // Store authentication data before redirect
            AuthManager.setUser(data.user);
            AuthManager.setToken(data.token);
            
            // Redirect to change password page with proper URL
            window.location.href = `/auth/change-password?userType=${data.user.role}`;
          } else {
            router.visit(dashboardUrl);
          }
        }, 1000);
      } else {
        setErrors({ general: data.message || 'Login failed. Please check your credentials.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 page-container">
      <Head title="Login - ONSTS" />
      
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[600px] max-h-[90vh]">
        {/* Left Panel - ONSTS Branding */}
        <div className="w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-8 flex flex-col justify-center items-center text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 border border-white/20 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white/20 rounded-full animate-pulse delay-500"></div>
          </div>
          
          {/* Logo and Branding */}
          <div className="relative z-10 text-center">
            <div className="mb-6">
              <img 
                src="/onsts.png" 
                alt="ONSTS Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-white p-2 shadow-lg transition-transform hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg hidden">
                <FaGraduationCap className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold mb-2">ONSTS</h1>
            <p className="text-xl mb-2 font-medium">Online Student Tracking System</p>
            <p className="text-blue-100 mb-8 text-sm">Empowering Education Through Digital Innovation</p>
            
            {/* Feature Highlights */}
            <div className="space-y-3 text-left max-w-sm">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors">
                <FaShieldAlt className="w-5 h-5 text-green-300 flex-shrink-0" />
                <span className="text-sm">Secure Student Portal</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors">
                <FaChartLine className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                <span className="text-sm">Real-time Grade Tracking</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors">
                <FaCalendarAlt className="w-5 h-5 text-pink-300 flex-shrink-0" />
                <span className="text-sm">Digital Schedule Management</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors">
                <FaUsers className="w-5 h-5 text-purple-300 flex-shrink-0" />
                <span className="text-sm">Faculty Communication</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-1/2 p-8 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your portal</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email address"
                    required
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <span>⚠</span> {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                    required
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <span>⚠</span> {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    // Navigate to forgot password page with current email if provided
                    const email = formData.email.trim();
                    const forgotPasswordUrl = email 
                      ? `/forgot-password?email=${encodeURIComponent(email)}`
                      : '/forgot-password';
                    handleNavigation(forgotPasswordUrl);
                  }}
                  disabled={isNavigating || isLoading}
                >
                  <span>🔑</span>
                  Forgot password?
                </button>
              </div>

              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-red-600 text-sm font-medium">{errors.general}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <FaSignInAlt className="w-4 h-4" />
                    Sign In to ONSTS
                  </div>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                New to ONSTS?{' '}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/register/student');
                  }}
                  className="text-blue-600 hover:text-blue-800 font-semibold focus:outline-none focus:underline"
                  disabled={isNavigating}
                >
                  Create Student Account
                </button>
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p> 2025 ONSTS. Secure • Reliable • Innovative</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
