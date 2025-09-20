import React, { useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaUser, 
  FaEdit, 
  FaSave, 
  FaTimes,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaIdCard,
  FaGraduationCap,
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaUpload,
  FaUserCircle
} from "react-icons/fa";

export default function Student_Profile() {
  const { auth, student, personalInfo, flash } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    firstname: auth?.user?.firstname || '',
    lastname: auth?.user?.lastname || '',
    middlename: auth?.user?.middlename || '',
    email: auth?.user?.email || '',
    phone: personalInfo?.phone || '',
    address: personalInfo?.address || '',
    birthdate: personalInfo?.birthdate || '',
    password: '',
    confirmPassword: ''
  });

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // HCI Principle 5: Error prevention - Real-time validation
  const validateField = (name, value) => {
    switch (name) {
      case 'firstname':
      case 'lastname':
        if (!value.trim()) return `${name === 'firstname' ? 'First' : 'Last'} name is required`;
        if (value.length < 2) return `${name === 'firstname' ? 'First' : 'Last'} name must be at least 2 characters`;
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) return 'Please enter a valid phone number';
        return '';
      case 'password':
        if (value && value.length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'confirmPassword':
        if (value && value !== formData.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const handleSave = async () => {
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'middlename') { // Middle name is optional
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Saving profile data:', formData);
      setIsEditing(false);
      
      // Show success message
      // In real implementation, this would come from the backend
      
    } catch (error) {
      setErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstname: auth?.user?.firstname || '',
      lastname: auth?.user?.lastname || '',
      middlename: auth?.user?.middlename || '',
      email: auth?.user?.email || '',
      phone: personalInfo?.phone || '',
      address: personalInfo?.address || '',
      birthdate: personalInfo?.birthdate || '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <>
      <Head title="My Profile - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          
          {/* Enhanced Header */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <FaUser className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                  <p className="text-gray-600">Manage your personal information and account settings</p>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <FaCheckCircle className="text-green-500" />
                  <span className="text-green-800 font-medium text-sm">Verified</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Flash Messages - HCI Principle 1: Visibility of system status */}
              {flash?.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaCheckCircle className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 font-medium">Success!</p>
                    <p className="text-green-700 text-sm">{flash.success}</p>
                  </div>
                </div>
              )}

              {flash?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{flash.error}</p>
                  </div>
                </div>
              )}

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{errors.general}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Profile Card - HCI Principle 6: Recognition rather than recall */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-center">
                      <div className="relative inline-block mb-6">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mx-auto">
                          <span className="text-white font-bold text-4xl">
                            {auth?.user?.firstname?.[0]}{auth?.user?.lastname?.[0]}
                          </span>
                        </div>
                        <button className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105">
                          <FaCamera className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {auth?.user?.firstname} {auth?.user?.lastname}
                      </h2>
                      <p className="text-gray-600 mb-4 flex items-center justify-center">
                        <FaGraduationCap className="mr-2" />
                        Student
                      </p>
                      
                      <div className="flex items-center justify-center space-x-2 text-green-600 mb-6">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Active Account</span>
                      </div>

                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                          isEditing 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isLoading ? (
                          <FaSpinner className="animate-spin" />
                        ) : isEditing ? (
                          <>
                            <FaTimes />
                            <span>Cancel Editing</span>
                          </>
                        ) : (
                          <>
                            <FaEdit />
                            <span>Edit Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaShieldAlt className="mr-2 text-blue-600" />
                      Account Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Student ID</span>
                        <span className="font-semibold text-gray-900">STU-{String(auth?.user?.id || '000001').padStart(6, '0')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Member Since</span>
                        <span className="font-semibold text-gray-900">
                          {auth?.user?.created_at ? new Date(auth.user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-semibold text-gray-900">
                          {new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
                      <h3 className="text-2xl font-bold flex items-center">
                        <FaUserCircle className="mr-3" />
                        Personal Information
                      </h3>
                      <p className="text-blue-100 mt-2">Keep your information up to date for better communication</p>
                    </div>

                    <div className="p-6">
                      <form className="space-y-6">
                        
                        {/* Name Fields - HCI Principle 4: Consistency and standards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FaIdCard className="inline w-4 h-4 mr-2 text-blue-600" />
                              First Name *
                            </label>
                            <input
                              type="text"
                              name="firstname"
                              value={formData.firstname}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? errors.firstname 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                            {errors.firstname && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <FaExclamationTriangle className="mr-1" />
                                {errors.firstname}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Middle Name
                            </label>
                            <input
                              type="text"
                              name="middlename"
                              value={formData.middlename}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                              placeholder="Optional"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Last Name *
                            </label>
                            <input
                              type="text"
                              name="lastname"
                              value={formData.lastname}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? errors.lastname 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                            {errors.lastname && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <FaExclamationTriangle className="mr-1" />
                                {errors.lastname}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FaEnvelope className="inline w-4 h-4 mr-2 text-blue-600" />
                              Email Address *
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? errors.email 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                            {errors.email && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <FaExclamationTriangle className="mr-1" />
                                {errors.email}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FaPhone className="inline w-4 h-4 mr-2 text-blue-600" />
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? errors.phone 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                              placeholder="Optional"
                            />
                            {errors.phone && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <FaExclamationTriangle className="mr-1" />
                                {errors.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Address and Birthdate */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FaMapMarkerAlt className="inline w-4 h-4 mr-2 text-blue-600" />
                              Address
                            </label>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                              placeholder="Optional"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FaCalendarAlt className="inline w-4 h-4 mr-2 text-blue-600" />
                              Birthdate
                            </label>
                            <input
                              type="date"
                              name="birthdate"
                              value={formData.birthdate}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                isEditing 
                                  ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Password Section - HCI Principle 10: Help and documentation */}
                        {isEditing && (
                          <div className="border-t pt-6">
                            <div className="flex items-center space-x-2 mb-4">
                              <FaLock className="text-gray-600" />
                              <h4 className="text-lg font-semibold text-gray-900">Change Password</h4>
                              <FaInfoCircle className="text-blue-500" title="Leave blank to keep current password" />
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <p className="text-blue-800 text-sm">
                                <FaInfoCircle className="inline mr-2" />
                                Leave password fields blank if you don't want to change your current password.
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  New Password
                                </label>
                                <div className="relative">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-3 border rounded-lg pr-12 transition-all duration-200 ${
                                      errors.password 
                                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                    }`}
                                    placeholder="Leave blank to keep current"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                  </button>
                                </div>
                                {errors.password && (
                                  <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <FaExclamationTriangle className="mr-1" />
                                    {errors.password}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Confirm Password
                                </label>
                                <input
                                  type={showPassword ? "text" : "password"}
                                  name="confirmPassword"
                                  value={formData.confirmPassword}
                                  onChange={handleInputChange}
                                  className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                    errors.confirmPassword 
                                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                  }`}
                                  placeholder="Confirm new password"
                                />
                                {errors.confirmPassword && (
                                  <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <FaExclamationTriangle className="mr-1" />
                                    {errors.confirmPassword}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {isEditing && (
                          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={isLoading}
                              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                            >
                              {isLoading ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaSave />
                              )}
                              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={handleCancel}
                              disabled={isLoading}
                              className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                            >
                              <FaTimes />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
