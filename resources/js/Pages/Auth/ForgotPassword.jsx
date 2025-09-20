import React, { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaEnvelope, FaArrowLeft, FaKey, FaPaperPlane } from "react-icons/fa";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  // Get email from URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    try {
      const response = await axios.post("/auth/forgot-password", { email });
      
      Swal.fire({
        title: 'OTP Sent Successfully!',
        html: `
          <div class="text-left">
            <p class="mb-3">📧 OTP has been sent to your email</p>
            <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-3">
              <h4 class="font-semibold text-green-800 mb-2">Email sent to:</h4>
              <p class="text-sm text-green-700">${response.data.email_sent_to}</p>
            </div>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h4 class="font-semibold text-blue-800 mb-2">Next steps:</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• Check your email inbox</li>
                <li>• Enter the 6-digit OTP code</li>
                <li>• Create your new password</li>
                <li>• OTP expires in 15 minutes</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continue to Reset',
        confirmButtonColor: '#10b981'
      }).then(() => {
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
      });
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else if (error.response?.status === 404) {
        Swal.fire({
          title: 'Email Not Found',
          html: `
            <div class="text-left">
              <p class="mb-3">❌ Account not found</p>
              <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-3">
                <h4 class="font-semibold text-red-800 mb-2">Error:</h4>
                <p class="text-sm text-red-700">No account found with this email address.</p>
              </div>
              <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <h4 class="font-semibold text-yellow-800 mb-2">Please check:</h4>
                <ul class="text-sm text-yellow-700 space-y-1">
                  <li>• Email address is correct</li>
                  <li>• Account exists in the system</li>
                  <li>• Contact administrator if needed</li>
                </ul>
              </div>
            </div>
          `,
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: error.response?.data?.message || 'Failed to send OTP. Please try again.',
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
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent animate-pulse opacity-30"></div>
          
          <img 
            src="/onsts.png" 
            alt="School Logo" 
            className="w-20 mx-auto mb-4 drop-shadow-2xl relative z-10"
          />
          <h1 className="text-xl font-bold mb-2 relative z-10">FORGOT PASSWORD</h1>
          <p className="text-blue-100 text-sm opacity-90 relative z-10">
            Reset your ONSTS account password
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-full shadow-lg inline-block mb-4">
                <FaKey className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Reset Your Password</h2>
              <p className="text-gray-600 text-sm">
                {email ? 'Click "Send OTP" to receive a password reset code.' : 'Enter your email address and we\'ll send you an OTP to reset your password.'}
              </p>
            </div>

            {/* Email Display/Input Field */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!new URLSearchParams(window.location.search).get('email')}
                className={`w-full px-4 py-3 pl-12 border-2 border-blue-900 rounded-full text-blue-900 placeholder-transparent focus:outline-none focus:border-blue-600 focus:shadow-lg focus:shadow-blue-200/50 transition-all duration-300 peer ${
                  new URLSearchParams(window.location.search).get('email') ? 'bg-blue-50 cursor-not-allowed' : 'bg-transparent'
                } ${errors.email ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="EMAIL ADDRESS"
              />
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4" />
              <label className={`absolute left-12 transition-all duration-300 pointer-events-none ${
                email 
                  ? 'top-0 -translate-y-1/2 text-xs text-blue-600 bg-white px-2 font-semibold' 
                  : 'top-1/2 -translate-y-1/2 text-gray-600'
              }`}>
                EMAIL ADDRESS
              </label>
              {new URLSearchParams(window.location.search).get('email') && (
                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <span>✓ Email from login form</span>
                </div>
              )}
              {errors.email && (
                <span className="text-red-600 text-xs font-semibold mt-1 block flex items-center gap-1">
                  <span>⚠️</span> {errors.email}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base rounded-full shadow-lg shadow-blue-300/50 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95 disabled:from-blue-300 disabled:to-indigo-300 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending OTP...
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-4 h-4" />
                  SEND OTP
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4">
              <Link 
                href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
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

export default ForgotPassword;
