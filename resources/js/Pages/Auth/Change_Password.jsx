import React, { useState } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";
import { 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaKey
} from "react-icons/fa";
import Swal from "sweetalert2";
import Sidebar from "../layouts/Sidebar";

export default function ChangePassword({ userType = "faculty", ...props }) {
  // Get userType from props or URL parameters
  const actualUserType = props.userType || userType;
  const [form, setForm] = useState({
    new_password: "",
    confirm_password: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'new_password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = {};
    
    if (!form.new_password) {
      validationErrors.new_password = "New password is required";
    } else if (form.new_password.length < 8) {
      validationErrors.new_password = "Password must be at least 8 characters";
    }
    
    if (!form.confirm_password) {
      validationErrors.confirm_password = "Please confirm your password";
    } else if (form.new_password !== form.confirm_password) {
      validationErrors.confirm_password = "Passwords do not match";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const endpoint = actualUserType === "faculty" ? "/auth/change-password/faculty" : "/auth/change-password/coordinator";
      
      // Use unified auth token
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await axios.post(`${window.location.protocol}//${window.location.host}${endpoint}`, {
        new_password: form.new_password,
        confirm_password: form.confirm_password
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      setLoading(false);

      // Immediately update user data and clear password change flags
      if (response.data?.user) {
        const updatedUser = {
          ...response.data.user,
          password_changed: true,
          password_change_required: false
        };
        
        // Update all possible localStorage keys
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        
        // If new token is provided, update it
        if (response.data?.token) {
          localStorage.setItem('auth_token', response.data.token);
        }
      }

      // Clear password change requirements immediately
      localStorage.removeItem('password_change_required');
      localStorage.removeItem('login_redirect_in_progress');

      Swal.fire({
        title: 'Password Changed Successfully!',
        text: 'Your password has been updated. Redirecting to your dashboard...',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#059669',
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl shadow-2xl',
          title: 'text-gray-800',
          content: 'text-gray-600'
        }
      }).then(() => {
        // Clear any existing session data that might cause conflicts
        sessionStorage.clear();
        
        // Clear the change-password page from localStorage to prevent tracking issues
        localStorage.removeItem('current_page');
        localStorage.setItem('current_page', '/faculty/dashboard');
        
        // Force a complete page reload to ensure fresh authentication state
        window.location.replace(`${window.location.protocol}//${window.location.host}/faculty/dashboard`);
      });

    } catch (err) {
      setLoading(false);
      
      if (err.message === 'Authentication token not found. Please log in again.') {
        setErrors({ form: 'Authentication token not found. Please log in again.' });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (err.response?.status === 401) {
        setErrors({ form: 'Unauthorized access. Please log in again.' });
        // Clear invalid token and redirect
        localStorage.removeItem("auth_token");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ form: 'Password change failed. Please try again.' });
      }
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return "bg-red-500";
    if (passwordStrength < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 50) return "Weak";
    if (passwordStrength < 75) return "Medium";
    return "Strong";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <FaShieldAlt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Change Password</h1>
          <p className="text-white/70">
            You must change your password before accessing your {actualUserType} dashboard
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold text-sm mb-1">Security Requirement</h3>
              <p className="text-yellow-200/80 text-sm">
                For security reasons, you must change your temporary password before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-white font-semibold mb-2">
                New Password
              </label>
              <div className="relative">
                <FaKey className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="new_password"
                  value={form.new_password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {form.new_password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                    <span className="text-white/70 text-xs font-medium">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.new_password && (
                <p className="text-red-400 text-sm mt-2">{errors.new_password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <FaCheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-red-400 text-sm mt-2">{errors.confirm_password}</p>
              )}
            </div>

            {/* Form Error */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <p className="text-red-400 text-sm">{errors.form}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Changing Password...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FaShieldAlt />
                  Change Password
                </div>
              )}
            </button>
          </form>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-white/5 rounded-2xl">
            <h4 className="text-white font-semibold text-sm mb-2">Password Requirements:</h4>
            <ul className="text-white/70 text-xs space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase and lowercase letters</li>
              <li>• Contains at least one number</li>
              <li>• Different from your current password</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
