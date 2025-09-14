import React, { useState } from "react";
import { usePage } from "@inertiajs/react";
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
  FaInfoCircle
} from "react-icons/fa";

export default function Student_Profile() {
  const { auth, student, personalInfo } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Here you would typically send the data to your backend
    console.log('Saving profile data:', formData);
    setIsEditing(false);
    
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
    setIsEditing(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Student_Sidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 p-8 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header - Enhanced with Breadcrumbs and Status */}
        <div className="mb-8">
          {/* Breadcrumb Navigation - Heuristic 3: User Control */}
          <nav className="text-gray-500 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><span>Home</span></li>
              <li><span className="mx-2">/</span></li>
              <li><span className="text-gray-800 font-medium">My Profile</span></li>
            </ol>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                My Profile
              </h1>
              <p className="text-gray-600">Manage your personal information and account settings</p>
              {/* System Status - Heuristic 1: Visibility of System Status */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <FaCheckCircle className="w-4 h-4" />
                  <span>Profile verified</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Last updated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {/* Help Button - Heuristic 10: Help and Documentation */}
            <div className="hidden md:flex">
              <button className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                <FaInfoCircle className="w-4 h-4" />
                <span>Profile Help</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mx-auto">
                    <span className="text-white font-bold text-4xl">
                      {auth?.user?.firstname?.[0]}{auth?.user?.lastname?.[0]}
                    </span>
                  </div>
                  <button className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors">
                    <FaCamera className="w-4 h-4" />
                  </button>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {auth?.user?.firstname} {auth?.user?.lastname}
                </h2>
                <p className="text-gray-600 mb-4">Student</p>
                
                <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Active</span>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    isEditing 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <FaTimes className="w-4 h-4" />
                      Cancel Editing
                    </>
                  ) : (
                    <>
                      <FaEdit className="w-4 h-4" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Student ID</span>
                  <span className="font-semibold text-gray-800">{auth?.user?.id || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Joined</span>
                  <span className="font-semibold text-gray-800">
                    {auth?.user?.created_at ? new Date(auth.user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <FaUser className="w-6 h-6" />
                  Personal Information
                </h3>
                <p className="text-blue-100 mt-2">Update your personal details and contact information</p>
              </div>

              <div className="p-6">
                <form className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaIdCard className="inline w-4 h-4 mr-2" />
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
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
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaEnvelope className="inline w-4 h-4 mr-2" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaPhone className="inline w-4 h-4 mr-2" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Address and Birthdate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaMapMarkerAlt className="inline w-4 h-4 mr-2" />
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaCalendarAlt className="inline w-4 h-4 mr-2" />
                        Birthdate
                      </label>
                      <input
                        type="date"
                        name="birthdate"
                        value={formData.birthdate}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                          isEditing 
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password Change Section - Only show when editing */}
                  {isEditing && (
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h4>
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
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pr-12"
                              placeholder="Leave blank to keep current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                            </button>
                          </div>
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex gap-4 pt-6 border-t">
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        <FaSave className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        <FaTimes className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
