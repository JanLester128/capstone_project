import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaKey, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt, FaCheck } from "react-icons/fa";

const ResetPassword = ({ email }) => {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit OTP" });
      return;
    }

    setProcessing(true);
    try {
      await axios.post("/auth/verify-otp", { email, otp });
      setOtpVerified(true);
      setErrors({});
      Swal.fire({
        title: 'OTP Verified!',
        text: 'Please enter your new password.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      setErrors({ otp: error.response?.data?.message || "Invalid OTP" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpVerified) {
      await verifyOTP();
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      const response = await axios.post("/auth/reset-password", {
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation
      });
      
      Swal.fire({
        title: 'Password Reset Successful!',
        html: `
          <div class="text-left">
            <p class="mb-3">✅ Your password has been reset successfully</p>
            <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-3">
              <h4 class="font-semibold text-green-800 mb-2">Success:</h4>
              <p class="text-sm text-green-700">You can now log in with your new password.</p>
            </div>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h4 class="font-semibold text-blue-800 mb-2">Next steps:</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• Use your new password to log in</li>
                <li>• Keep your password secure</li>
                <li>• Consider updating your security settings</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#10b981'
      }).then(() => {
        window.location.href = '/login';
      });
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        Swal.fire({
          title: 'Reset Failed',
          text: error.response?.data?.message || 'Failed to reset password. Please try again.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-white/40 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-green-700 via-teal-700 to-green-800 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent animate-pulse opacity-30"></div>
          
          <img 
            src="/onsts.png" 
            alt="School Logo" 
            className="w-20 mx-auto mb-4 drop-shadow-2xl relative z-10"
          />
          <h1 className="text-xl font-bold mb-2 relative z-10">RESET PASSWORD</h1>
          <p className="text-green-100 text-sm opacity-90 relative z-10">
            Enter OTP and create new password
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className={`p-3 rounded-full shadow-lg inline-block mb-4 ${
                otpVerified 
                  ? 'bg-gradient-to-r from-green-600 to-teal-600' 
                  : 'bg-gradient-to-r from-orange-600 to-red-600'
              }`}>
                {otpVerified ? <FaCheck className="w-5 h-5 text-white" /> : <FaShieldAlt className="w-5 h-5 text-white" />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {otpVerified ? 'Create New Password' : 'Verify OTP Code'}
              </h2>
              <p className="text-gray-600 text-sm">
                {otpVerified 
                  ? 'Enter a strong password for your account.'
                  : `Enter the 6-digit OTP sent to: ${email}`
                }
              </p>
            </div>

            {!otpVerified && (
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-600 rounded-full bg-transparent text-orange-800 text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-orange-500 focus:shadow-lg focus:shadow-orange-200/50 transition-all duration-300"
                  placeholder="000000"
                />
                <label className="absolute -top-2 left-4 text-xs text-orange-600 bg-white px-2 font-semibold">
                  OTP CODE
                </label>
                {errors.otp && (
                  <span className="text-red-600 text-xs font-semibold mt-1 block text-center">
                    {errors.otp}
                  </span>
                )}
              </div>
            )}

            {otpVerified && (
              <>
                {/* New Password */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 border-2 border-green-600 rounded-full bg-transparent text-green-800 placeholder-transparent focus:outline-none focus:border-green-500 focus:shadow-lg focus:shadow-green-200/50 transition-all duration-300"
                    placeholder="NEW PASSWORD"
                  />
                  <label className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                    password 
                      ? 'top-0 -translate-y-1/2 text-xs text-green-600 bg-white px-2 font-semibold' 
                      : 'top-1/2 -translate-y-1/2 text-gray-600'
                  }`}>
                    NEW PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-green-600 transition-colors duration-300"
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                  {errors.password && (
                    <span className="text-red-600 text-xs font-semibold mt-1 block">
                      {errors.password}
                    </span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 border-2 border-green-600 rounded-full bg-transparent text-green-800 placeholder-transparent focus:outline-none focus:border-green-500 focus:shadow-lg focus:shadow-green-200/50 transition-all duration-300"
                    placeholder="CONFIRM PASSWORD"
                  />
                  <label className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                    passwordConfirmation 
                      ? 'top-0 -translate-y-1/2 text-xs text-green-600 bg-white px-2 font-semibold' 
                      : 'top-1/2 -translate-y-1/2 text-gray-600'
                  }`}>
                    CONFIRM PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={toggleConfirmPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-green-600 transition-colors duration-300"
                  >
                    {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className={`w-full py-3 text-white font-bold text-base rounded-full shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-3 ${
                otpVerified
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 shadow-green-300/50 hover:from-green-700 hover:to-teal-700 disabled:from-green-300 disabled:to-teal-300'
                  : 'bg-gradient-to-r from-orange-600 to-red-600 shadow-orange-300/50 hover:from-orange-700 hover:to-red-700 disabled:from-orange-300 disabled:to-red-300'
              }`}
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {otpVerified ? 'Resetting Password...' : 'Verifying OTP...'}
                </>
              ) : (
                <>
                  <FaKey className="w-4 h-4" />
                  {otpVerified ? 'RESET PASSWORD' : 'VERIFY OTP'}
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4">
              <Link 
                href="/login" 
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-300 flex items-center gap-2 justify-center"
              >
                <FaArrowLeft className="w-3 h-3" />
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
