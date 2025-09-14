import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { router } from '@inertiajs/react';
import Swal from "sweetalert2";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaEdit,
  FaSave,
  FaTimes,
  FaUserCircle,
  FaGraduationCap,
  FaKey
} from "react-icons/fa";

export default function FacultyProfile({ user: initialUser, isCoordinator: initialIsCoordinator, assignedStrand: initialAssignedStrand }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(initialIsCoordinator);
  const [assignedStrand, setAssignedStrand] = useState(initialAssignedStrand);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    new_password_confirmation: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Remove the useEffect and fetchUserProfile since data comes from props
  // useEffect(() => {
  //   fetchUserProfile();
  // }, []);

  // const fetchUserProfile = async () => {
  //   // Removed - data now comes from route props
  // };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordData.new_password || !passwordData.new_password_confirmation) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please fill in all password fields.'
      });
      return;
    }

    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'New password and confirmation do not match.'
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      Swal.fire({
        icon: 'error',
        title: 'Password Too Short',
        text: 'Password must be at least 8 characters long.'
      });
      return;
    }

    setPasswordLoading(true);
    
    router.post('/auth/change-password/faculty', {
      new_password: passwordData.new_password,
      confirm_password: passwordData.new_password_confirmation
    }, {
      onSuccess: () => {
        Swal.fire({
          icon: 'success',
          title: 'Password Changed!',
          text: 'Your password has been updated successfully.',
          timer: 2000,
          showConfirmButton: false
        });
        setPasswordData({
          new_password: '',
          new_password_confirmation: ''
        });
        setShowPasswordForm(false);
        setPasswordLoading(false);
      },
      onError: (errors) => {
        console.error('Error changing password:', errors);
        const errorMessage = errors.message || 'Failed to change password';
        Swal.fire({
          icon: 'error',
          title: 'Password Change Failed',
          text: errorMessage
        });
        setPasswordLoading(false);
      }
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading profile...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and security settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <FaUserCircle className="text-purple-600 text-3xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {user?.firstname} {user?.lastname}
                    </h2>
                    <p className="text-gray-600">{user?.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {user?.role === 'faculty' ? 'Faculty' : user?.role}
                      </span>
                      {isCoordinator && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Coordinator
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      <FaUser className="inline mr-2" />
                      First Name
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-gray-800 font-medium">{user?.firstname}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      <FaUser className="inline mr-2" />
                      Last Name
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-gray-800 font-medium">{user?.lastname}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      <FaEnvelope className="inline mr-2" />
                      Email Address
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-gray-800 font-medium">{user?.email}</p>
                    </div>
                  </div>

                  {assignedStrand && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        <FaGraduationCap className="inline mr-2" />
                        Assigned Strand
                      </label>
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-purple-800 font-medium">{assignedStrand.name} ({assignedStrand.code})</p>
                        <p className="text-purple-600 text-sm">{assignedStrand.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings Card */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FaLock className="mr-2 text-purple-600" />
                  Security Settings
                </h3>
              </div>

              <div className="p-6">
                {!showPasswordForm ? (
                  <div>
                    <p className="text-gray-600 text-sm mb-4">
                      Keep your account secure by regularly updating your password.
                    </p>
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      <FaKey />
                      <span>Change Password</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            new_password: e.target.value
                          }))}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          minLength="8"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.new_password_confirmation}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            new_password_confirmation: e.target.value
                          }))}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          minLength="8"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                      >
                        <FaSave />
                        <span>{passwordLoading ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            new_password: '',
                            new_password_confirmation: ''
                          });
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                      >
                        <FaTimes />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Account Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Account Status</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Account Type</span>
                    <span className="text-gray-800 font-medium capitalize">
                      {isCoordinator ? 'Faculty (Coordinator)' : 'Faculty'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  {isCoordinator && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Coordinator Access</span>
                      <span className="text-purple-600 font-medium">Enabled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
