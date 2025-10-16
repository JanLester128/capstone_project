import React, { useState, useEffect } from "react";
import { Link, Head } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaKey, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt, FaCheck, FaGraduationCap } from "react-icons/fa";

const ResetPassword = () => {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get email from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (emailParam) setEmail(emailParam);
    
    // If no email, redirect to forgot password
    if (!emailParam) {
      window.location.href = '/forgot-password';
    }
  }, []);

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const validatePassword = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      newErrors.password = "Password must contain uppercase, lowercase, number, and special character";
    }
    
    if (!passwordConfirmation) {
      newErrors.password_confirmation = "Password confirmation is required";
    } else if (password !== passwordConfirmation) {
      newErrors.password_confirmation = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      const response = await axios.post("/auth/reset-password", {
        otp,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      
      if (response.data.success) {
        await Swal.fire({
          title: 'Password Reset Successful!',
          text: 'Your password has been updated. You can now log in with your new password.',
          icon: 'success',
          confirmButtonText: 'Go to Login',
          confirmButtonColor: '#10b981'
        });
        
        window.location.href = '/login';
      } else {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        await Swal.fire({
          title: 'Password Reset Failed',
          text: error.response?.data?.message || error.message || 'An error occurred while resetting your password.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Head title="Reset Password - ONSTS" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <FaGraduationCap className="text-blue-600 text-2xl" />
              </div>
              <h1 className="text-3xl font-bold text-white">ONSTS</h1>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Reset Your Password</h2>
            <p className="text-blue-200">Enter your new secure password</p>
          </div>

          {/* Reset Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-Digit OTP *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-bold ${
                    errors.otp ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="000000"
                  maxLength="6"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                {errors.otp && (
                  <p className="text-red-500 text-sm mt-1">{errors.otp}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Check your email for the 6-digit verification code
                </p>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Password Requirements:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <FaCheck className={`text-xs ${password.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className={`text-xs ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className={`text-xs ${/\d/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                    One number
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className={`text-xs ${/[@$!%*?&]/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                    One special character (@$!%*?&)
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <FaKey />
                    Reset Password
                  </>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                <FaArrowLeft className="text-xs" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
