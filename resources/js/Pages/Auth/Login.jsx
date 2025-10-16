import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AuthManager } from '../../auth';
import { FaGraduationCap, FaShieldAlt, FaChartLine, FaCalendarAlt, FaUsers, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaSpinner } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Login() {
  // CRITICAL FIX: Immediately check if we should render this component
  const currentPath = window.location.pathname;
  
  // FIXED: Only render Login component on actual login page
  if (currentPath !== '/login' && currentPath !== '/') {
    console.log('🚫 Login: Not on login page (' + currentPath + '), not rendering Login component');
    return null; // Don't render anything
  }
  
  // Use Inertia form handling instead of manual state
  const { data, setData, post, processing, errors, clearErrors } = useForm({
    email: '',
    password: '',
    remember: false
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    console.log('🔍 Login: Component loaded - BACKEND HANDLES REDIRECTS NOW');
    
    // Clear any stuck redirect flags
    sessionStorage.removeItem('login_redirect_in_progress');
    sessionStorage.removeItem('auth_redirect_in_progress');
    
    // FIXED: Let backend handle authentication redirects, frontend just shows form
    console.log('📝 Login: Backend handles auth redirects, showing login form');
    setIsInitializing(false);
  }, []);
  // Page transition animation on mount
  useEffect(() => {
    const container = document.querySelector('.page-container');
    if (container) {
      container.classList.add('animate-fadeIn');
    }
  }, []);

  // Show loading while initializing to prevent flash
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <Head title="Login - ONSTS" />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Please wait...</p>
        </div>
      </div>
    );
  }



  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    
    if (processing || isNavigating) {
      console.log('🔄 Login: Already processing, ignoring submit');
      return;
    }

    console.log('📤 Login: Submitting form to backend');
    setIsNavigating(true);
    
    try {
      // Use fetch for better error handling of session conflicts
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          remember: data.remember
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Login: Success response received');
        
        // Store session data
        if (result.session_token) {
          localStorage.setItem('session_token', result.session_token);
        }
        
        // Store user data
        AuthManager.setUser(result.user);
        
        // Redirect to appropriate dashboard
        window.location.href = result.redirect_url;
      } else {
        // Handle errors including session conflicts
        console.log('❌ Login: Error response:', result);
        
        if (result.errors) {
          // Handle validation errors with SweetAlert
          console.log('Validation errors:', result.errors);
          
          let errorMessage = result.message || 'Login failed. Please check your credentials.';
          
          // Check for specific error types
          if (result.errors.email) {
            errorMessage = result.errors.email[0];
          }
          
          await Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: errorMessage,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Try Again'
          });
        } else if (result.message || result.error) {
          // Handle session conflict or other errors with SweetAlert
          console.log('Session conflict or other error:', result.message || result.error);
          
          const errorMessage = result.message || result.error;
          
          // Check if it's a session conflict
          if (errorMessage.includes('already logged in')) {
            await Swal.fire({
              icon: 'warning',
              title: 'Already Logged In',
              text: errorMessage,
              confirmButtonColor: '#f59e0b',
              confirmButtonText: 'Understood',
              footer: '<small>Please log out from the other session first or contact support for assistance.</small>'
            });
          } else {
            await Swal.fire({
              icon: 'error',
              title: 'Login Error',
              text: errorMessage,
              confirmButtonColor: '#dc2626',
              confirmButtonText: 'Try Again'
            });
          }
        }
        
        setIsNavigating(false);
      }
    } catch (error) {
      console.error('❌ Login: Network error:', error);
      
      await Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Unable to connect to the server. Please check your internet connection and try again.',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Retry'
      });
      
      setIsNavigating(false);
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
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
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
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline transition-colors duration-200 flex items-center gap-1 disabled:opacity-50"
                  onClick={() => {
                    // Navigate to forgot password page with current email if provided
                    const email = data.email.trim();
                    const forgotPasswordUrl = email 
                      ? `/forgot-password?email=${encodeURIComponent(email)}`
                      : '/forgot-password';
                    handleNavigation(forgotPasswordUrl);
                  }}
                  disabled={isNavigating || processing}
                >
                  <span>🔑</span>
                  Forgot Password?
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
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {processing ? (
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
                New student?{' '}
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
              <p className="text-gray-600 text-xs text-center mt-2">
                Need help? Contact the registrar's office
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>2025 ONSTS. Secure • Reliable • Innovative</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
