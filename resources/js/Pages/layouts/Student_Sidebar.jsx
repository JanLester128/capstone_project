import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import axios from "axios";
import Swal from 'sweetalert2';
import { 
  FaHome, 
  FaUserGraduate, 
  FaChartBar, 
  FaCalendarAlt, 
  FaUser, 
  FaSignOutAlt,
  FaSchool,
  FaBell,
  FaBars,
  FaTimes,
  FaBookOpen,
  FaCog,
  FaQuestionCircle,
  FaGraduationCap,
  FaChevronRight,
  FaCircle,
  FaChevronDown,
  FaChevronUp,
  FaPalette
} from "react-icons/fa";

export default function StudentSidebar({ auth, onToggle }) {
  const { url } = usePage();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [theme, setTheme] = useState('Default');
  const [userInfo, setUserInfo] = useState(null);

  // Notify parent component of initial state on mount
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, []);

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('student_token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/user');
          
          if (response.data) {
            // The /user endpoint returns the user object directly
            setUserInfo(response.data);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Fallback to auth prop if available
        if (auth?.user) {
          setUserInfo(auth.user);
        }
      }
    };

    fetchUserInfo();
  }, [auth]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Save state to localStorage
    localStorage.setItem('student_sidebar_collapsed', JSON.stringify(newState));
    if (onToggle) onToggle(newState);
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout? Any unsaved changes will be lost.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true
    });

    if (result.isConfirmed) {
      try {
        await axios.post('/auth/logout');
        // Clear local storage
        localStorage.clear();
        window.location.href = '/login';
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to logout. Please try again.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  };

  // HCI Principle 4: Consistency and standards - Consistent navigation structure
  const menuItems = [
    {
      path: '/student/dashboard',
      icon: FaHome,
      label: 'Dashboard',
      description: 'Overview & Stats',
      badge: null
    },
    {
      path: '/student/schedule',
      icon: FaGraduationCap,
      label: 'Class',
      description: 'Class Timetable',
      badge: null
    },
    {
      path: '/student/grades',
      icon: FaChartBar,
      label: 'Grades',
      description: 'Academic Records',
      badge: null
    },
    {
      path: '/student/enrollment',
      icon: FaCalendarAlt,
      label: 'Enrollment',
      description: 'Course Registration',
      badge: null
    },
    // Note: Notifications menu item removed as requested
  ];

  // HCI Principle 1: Visibility of system status - Show current page
  const isActive = (path) => {
    return url === path || url.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-xl border-r border-gray-200 transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'justify-between p-6'} border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <FaSchool className="text-blue-600 text-lg" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">ONSTS</h1>
              <p className="text-blue-100 text-xs">Student Portal</p>
            </div>
          </div>
        )}
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-200"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <FaBars className="text-sm" /> : <FaTimes className="text-sm" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item, index) => {
            const isCurrentActive = url === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={index}
                href={item.path}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isCurrentActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className={`text-lg flex-shrink-0 transition-transform duration-200 ${
                    isCurrentActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                  } ${hoveredItem === item.path ? 'scale-110' : ''}`} />
                  
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-sm truncate ${
                          isCurrentActive ? 'text-white' : 'text-gray-700 group-hover:text-white'
                        }`}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                            item.badge === 'New' || typeof item.badge === 'number'
                              ? 'text-white bg-red-500'
                              : 'text-blue-700 bg-blue-100'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${
                        isCurrentActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-blue-100'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Active indicator for collapsed state */}
                {isCollapsed && isCurrentActive && (
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-green-500 rounded-full shadow-sm"></div>
                )}
                
                {/* Hover arrow */}
                {!isCollapsed && !isCurrentActive && (
                  <FaChevronRight className={`ml-2 text-xs text-gray-400 transition-transform duration-200 ${
                    hoveredItem === item.path ? 'translate-x-1' : ''
                  }`} />
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-300">{item.description}</div>
                    <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modern Profile Section */}
      <div className="relative p-4 border-t border-gray-200 bg-gray-50">
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="profile-dropdown-container w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
                {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {userInfo?.firstname && userInfo?.lastname 
                    ? `${userInfo.firstname} ${userInfo.lastname}` 
                    : 'Student User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {userInfo?.email || 'Loading...'}
                </div>
              </div>
              {showProfileDropdown ? (
                <FaChevronUp className="text-gray-400 text-sm flex-shrink-0" />
              ) : (
                <FaChevronDown className="text-gray-400 text-sm flex-shrink-0" />
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[70] mx-2 profile-dropdown-container">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
                      {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 text-sm truncate">
                        {userInfo?.firstname && userInfo?.lastname 
                          ? `${userInfo.firstname} ${userInfo.lastname}` 
                          : 'Student User'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {userInfo?.email || 'Loading...'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="px-4 py-2">
                  <Link
                    href="/student/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <FaUser className="text-gray-400 text-sm" />
                    <span>Profile</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="px-4 py-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <FaSignOutAlt className="text-sm" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="profile-dropdown-container w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-lg transition-all duration-200"
              title={userInfo?.firstname && userInfo?.lastname 
                ? `${userInfo.firstname} ${userInfo.lastname}` 
                : 'Student User'}
            >
              {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
              {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
            </button>

            {/* Collapsed Profile Dropdown */}
            {showProfileDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[70] w-64 profile-dropdown-container">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
                      {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 text-sm truncate">
                        {userInfo?.firstname && userInfo?.lastname 
                          ? `${userInfo.firstname} ${userInfo.lastname}` 
                          : 'Student User'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {userInfo?.email || 'Loading...'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="px-4 py-2">
                  <Link
                    href="/student/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <FaUser className="text-gray-400 text-sm" />
                    <span>Profile</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="px-4 py-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <FaSignOutAlt className="text-sm" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
