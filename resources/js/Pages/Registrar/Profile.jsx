import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaEye, 
  FaEyeSlash,
  FaKey,
  FaBell,
  FaLock,
  FaGlobe,
  FaPalette,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const Profile = ({ auth, flash }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // HCI Principle 6: Recognition rather than recall - User profile data
  const [userProfile, setUserProfile] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return {
          name: 'Jan Lester Camus',
          email: 'registrar@onsts.edu.ph',
          phone: '+63 912 345 6789',
          address: 'Opol, Misamis Oriental',
          role: 'Registrar',
          department: 'Academic Records Office',
          employee_id: 'REG-2024-001',
          joined_date: '2024-01-15'
        };
      }
    }
    return {
      name: 'Jan Lester Camus',
      email: 'registrar@onsts.edu.ph',
      phone: '+63 912 345 6789',
      address: 'Opol, Misamis Oriental',
      role: 'Registrar',
      department: 'Academic Records Office',
      employee_id: 'REG-2024-001',
      joined_date: '2024-01-15'
    };
  });

  const { data, setData, put, processing, errors, reset } = useForm({
    name: userProfile.name || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    address: userProfile.address || '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  // HCI Principle 1: Visibility of system status
  const [systemPreferences, setSystemPreferences] = useState({
    notifications: true,
    email_alerts: true,
    dark_mode: false,
    language: 'en',
    timezone: 'Asia/Manila'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update local storage
      const updatedProfile = { ...userProfile, ...data };
      localStorage.setItem('auth_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      
      setIsEditing(false);
      
      // HCI Principle 9: Help users recognize success
      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your profile information has been successfully updated.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
      
    } catch (error) {
      // HCI Principle 9: Help users recognize and recover from errors
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'There was an error updating your profile. Please try again.',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
    setData({
      name: userProfile.name || '',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      address: userProfile.address || '',
      current_password: '',
      password: '',
      password_confirmation: '',
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: FaUser },
    { id: 'security', label: 'Security', icon: FaLock },
    { id: 'preferences', label: 'Preferences', icon: FaPalette },
    { id: 'notifications', label: 'Notifications', icon: FaBell }
  ];

  return (
    <>
      <Head title="Profile - ONSTS Registrar Portal" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <FaUser className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Profile Settings</h1>
                <p className="text-gray-600">Manage your account information and preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FaUser className="text-white text-2xl" />
                  </div>
                  <h3 className="font-semibold text-gray-800">{userProfile.name}</h3>
                  <p className="text-sm text-gray-600">{userProfile.role}</p>
                  <p className="text-xs text-gray-500">{userProfile.employee_id}</p>
                </div>
                
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                        }`}
                      >
                        <Icon className="text-sm" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
                {/* Profile Information Tab */}
                {activeTab === 'profile' && (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold text-gray-800">Profile Information</h2>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                          <FaEdit className="text-sm" />
                          Edit Profile
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Full Name */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaUser className="inline mr-2 text-blue-600" />
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                            placeholder="Enter your full name"
                          />
                          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaEnvelope className="inline mr-2 text-blue-600" />
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                            placeholder="Enter your email address"
                          />
                          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaPhone className="inline mr-2 text-blue-600" />
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                            placeholder="Enter your phone number"
                          />
                          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>

                        {/* Department */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaMapMarkerAlt className="inline mr-2 text-blue-600" />
                            Department
                          </label>
                          <input
                            type="text"
                            value={userProfile.department}
                            disabled
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <FaMapMarkerAlt className="inline mr-2 text-blue-600" />
                          Address
                        </label>
                        <textarea
                          value={data.address}
                          onChange={(e) => setData('address', e.target.value)}
                          disabled={!isEditing}
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                            isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                          placeholder="Enter your address"
                        />
                        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                      </div>

                      {/* Action Buttons */}
                      {isEditing && (
                        <div className="flex gap-4 pt-4">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            {loading ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                          >
                            <FaTimes />
                            Cancel
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Security Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <FaLock className="text-blue-600 text-lg" />
                          <div>
                            <h3 className="font-semibold text-blue-800">Account Security</h3>
                            <p className="text-sm text-blue-600">Your account is protected with strong security measures.</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-800">Change Password</h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                              type="password"
                              value={data.password}
                              onChange={(e) => setData('password', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter new password"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              value={data.password_confirmation}
                              onChange={(e) => setData('password_confirmation', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Confirm new password"
                            />
                          </div>

                          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                            <FaKey />
                            Update Password
                          </button>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-800">Security Information</h3>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FaCheckCircle className="text-green-600" />
                                <span className="text-sm text-green-800">Two-Factor Authentication</span>
                              </div>
                              <span className="text-xs text-green-600 font-medium">Enabled</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FaCheckCircle className="text-green-600" />
                                <span className="text-sm text-green-800">Email Verification</span>
                              </div>
                              <span className="text-xs text-green-600 font-medium">Verified</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FaLock className="text-blue-600" />
                                <span className="text-sm text-blue-800">Last Login</span>
                              </div>
                              <span className="text-xs text-blue-600 font-medium">Today, 2:30 PM</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">System Preferences</h2>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaGlobe className="inline mr-2 text-blue-600" />
                            Language
                          </label>
                          <select
                            value={systemPreferences.language}
                            onChange={(e) => setSystemPreferences({...systemPreferences, language: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="en">English</option>
                            <option value="fil">Filipino</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FaGlobe className="inline mr-2 text-blue-600" />
                            Timezone
                          </label>
                          <select
                            value={systemPreferences.timezone}
                            onChange={(e) => setSystemPreferences({...systemPreferences, timezone: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                            <option value="UTC">UTC (GMT+0)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800">Display Settings</h3>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-800">Dark Mode</h4>
                            <p className="text-sm text-gray-600">Switch to dark theme for better viewing in low light</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={systemPreferences.dark_mode}
                              onChange={(e) => setSystemPreferences({...systemPreferences, dark_mode: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Notification Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-800">System Notifications</h4>
                            <p className="text-sm text-gray-600">Receive notifications about system updates and maintenance</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={systemPreferences.notifications}
                              onChange={(e) => setSystemPreferences({...systemPreferences, notifications: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-800">Email Alerts</h4>
                            <p className="text-sm text-gray-600">Receive important alerts via email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={systemPreferences.email_alerts}
                              onChange={(e) => setSystemPreferences({...systemPreferences, email_alerts: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FaBell className="text-blue-600 text-lg mt-1" />
                          <div>
                            <h3 className="font-semibold text-blue-800 mb-2">Notification Preferences Saved</h3>
                            <p className="text-sm text-blue-600">Your notification settings are automatically saved when you make changes.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
