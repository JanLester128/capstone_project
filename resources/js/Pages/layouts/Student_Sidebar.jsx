import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import axios from "axios";
import Swal from 'sweetalert2';
import { AuthManager } from '../../auth';
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
  FaPalette,
  FaTachometerAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaSpinner
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  
  // HCI Principle 1: Visibility of system status - Enhanced
  const [systemStatus, setSystemStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: new Date().toLocaleTimeString(),
    pendingActions: 0,
    serverHealth: 'healthy',
    lastActivity: new Date().toLocaleTimeString()
  });
  
  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Monitor connection status for better error handling
  useEffect(() => {
    const handleOnline = () => {
      setSystemStatus(prev => ({ ...prev, isOnline: true }));
      setConnectionStatus('connected');
    };
    
    const handleOffline = () => {
      setSystemStatus(prev => ({ ...prev, isOnline: false }));
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Notify parent component of state changes with a small delay to ensure proper initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onToggle) {
        onToggle(isCollapsed);
      }
    }, 50); // Small delay to ensure proper initialization
    
    return () => clearTimeout(timer);
  }, [isCollapsed, onToggle]);

  // HCI Principle 7: Flexibility and efficiency of use - Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + M to toggle sidebar
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        handleToggle();
      }
      // Alt + L for logout
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        handleLogout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get user data from AuthManager first
        let user = AuthManager.getUser();
        
        // If no user data in AuthManager, try to refresh from server
        if (!user) {
          console.log('🔍 Student_Sidebar: No user in AuthManager, refreshing from server...');
          const refreshSuccess = await refreshUserData();
          if (refreshSuccess) {
            user = AuthManager.getUser();
          }
        }
        
        if (user) {
          setUserInfo(user);
        } else if (auth?.user) {
          // Fallback to auth prop if available
          setUserInfo(auth.user);
          // Also store in AuthManager for future use
          AuthManager.setUser(auth.user);
        } else {
          console.warn('No user data found in AuthManager or auth prop');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Fallback to auth prop if available
        if (auth?.user) {
          setUserInfo(auth.user);
          AuthManager.setUser(auth.user);
        }
      }
    };

    // Define refreshUserData function
    const refreshUserData = async () => {
      try {
        // Try the new auth/user endpoint with session-based auth
        let response = await fetch('/auth/user', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include' // Include session cookies
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.success ? data.user : data;
          if (userData && userData.id) {
            console.log('🔄 Student_Sidebar: Refreshed user data:', userData);
            AuthManager.setUser(userData);
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Error refreshing user data:', error);
        return false;
      }
    };

    fetchUserInfo();
  }, [auth]);

  // Fetch enrollment status
  useEffect(() => {
    const fetchEnrollmentStatus = async () => {
      try {
        const response = await fetch('/student/enrollment-status', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setEnrollmentStatus(data);
        }
      } catch (error) {
        console.error('Error fetching enrollment status:', error);
      }
    };

    fetchEnrollmentStatus();
  }, []);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Save state to localStorage
    localStorage.setItem('student_sidebar_collapsed', JSON.stringify(newState));
    if (onToggle) onToggle(newState);
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors - Enhanced logout
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
      setIsLoggingOut(true);
      
      try {
        // Show loading state
        Swal.fire({
          title: 'Logging out...',
          text: 'Please wait while we securely log you out.',
          icon: 'info',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const token = localStorage.getItem('auth_token');
        
        // Attempt logout with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Don't throw error on 401 - user might already be logged out
        if (!response.ok && response.status !== 401) {
          console.warn('Logout request failed, but continuing with local cleanup:', response.status);
        }

        // Clear all authentication data
        const keysToRemove = [
          'auth_token', 'auth_user', 'auth_session', 'last_activity', 
          'current_page', 'user', 'token', 'student_token', 
          'registrar_token', 'faculty_token', 'coordinator_token',
          'student_sidebar_collapsed'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear axios headers
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization'];
        }

        // Success feedback
        await Swal.fire({
          icon: 'success',
          title: 'Logged Out Successfully',
          text: 'You have been securely logged out. Redirecting to login page...',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        window.location.href = '/login';

      } catch (error) {
        console.error('Logout error:', error);
        
        // Error recovery - clear data anyway
        localStorage.clear();
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization'];
        }
        
        // User-friendly error message
        await Swal.fire({
          icon: 'warning',
          title: 'Connection Issue',
          text: 'Unable to connect to server, but you have been logged out locally. Redirecting to login page...',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        
        window.location.href = '/login';
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  // HCI Principle 4: Consistency and standards - Enhanced navigation structure
  const getEnrollmentBadge = () => {
    if (!enrollmentStatus) return null;
    
    if (enrollmentStatus.enrollmentOpen && !enrollmentStatus.hasEnrollment) {
      return 'Open';
    } else if (enrollmentStatus.hasEnrollment) {
      switch (enrollmentStatus.enrollmentStatus) {
        case 'pending':
          return 'Pending';
        case 'approved':
          return 'Approved';
        case 'rejected':
          return 'Rejected';
        default:
          return null;
      }
    }
    return null;
  };

  const menuItems = [
    {
      path: '/student/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard',
      description: 'Overview & analytics',
      shortcut: 'Alt+D',
      badge: null
    },
    {
      path: '/student/schedule',
      icon: FaGraduationCap,
      label: 'My Classes',
      description: 'Class schedule & timetable',
      shortcut: 'Alt+C',
      badge: null
    },
    {
      path: '/student/grades',
      icon: FaChartBar,
      label: 'Grades',
      description: 'Academic performance',
      shortcut: 'Alt+G',
      badge: null
    },
    {
      path: '/student/enrollment',
      icon: FaUserGraduate,
      label: 'Enrollment Application',
      description: 'Complete enrollment with personal info & strand preferences',
      shortcut: 'Alt+E',
      badge: getEnrollmentBadge()
    }
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
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-xl border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'justify-between p-6'} border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
                <img 
                  src="/onsts.png" 
                  alt="ONSTS Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">ONSTS</h1>
                <p className="text-blue-100 text-xs">Student Portal</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img 
                src="/onsts.png" 
                alt="ONSTS Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <button
            onClick={handleToggle}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-200"
            title={isCollapsed ? "Expand sidebar (Alt+M)" : "Collapse sidebar (Alt+M)"}
          >
            {isCollapsed ? <FaBars className="text-sm" /> : <FaTimes className="text-sm" />}
          </button>
        </div>

        {/* System Status Bar - Enhanced visibility */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-600">
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-gray-500">
                {systemStatus.lastActivity}
              </div>
            </div>
          </div>
        )}

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
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Icon className={`text-lg flex-shrink-0 transition-transform duration-200 ${
                      isCurrentActive ? 'text-white' : 'text-gray-500 group-hover:text-white'
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
                        {item.shortcut && (
                          <p className={`text-xs mt-0.5 truncate ${
                            isCurrentActive ? 'text-blue-200' : 'text-gray-400 group-hover:text-blue-200'
                          }`}>
                            {item.shortcut}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active indicator for collapsed state */}
                  {isCollapsed && isCurrentActive && (
                    <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-full shadow-sm"></div>
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
                      {item.shortcut && (
                        <div className="text-xs text-gray-400 mt-1">{item.shortcut}</div>
                      )}
                      <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Enhanced Profile Section */}
        <div className="relative p-4 border-t border-gray-200 bg-gray-50">
          {!isCollapsed ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
                  {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-gray-800 text-xs truncate">
                    {userInfo?.firstname && userInfo?.lastname 
                      ? `${userInfo.firstname} ${userInfo.lastname}` 
                      : 'Student User'}
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
                <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[100] mx-2 profile-dropdown-container max-h-64 overflow-y-auto">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
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
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <FaSignOutAlt className="text-sm" />
                      <span>{isLoggingOut ? 'Logging out...' : 'Log out (Alt+L)'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-lg transition-all duration-200"
                title={userInfo?.firstname && userInfo?.lastname 
                  ? `${userInfo.firstname} ${userInfo.lastname}` 
                  : 'Student User'}
              >
                {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'S'}
                {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
              </button>
              
              {/* Emergency Logout Button for Collapsed State */}
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-all duration-200"
                title="Logout (Alt+L)"
              >
                <FaSignOutAlt className="text-xs" />
              </button>

              {/* Collapsed Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute bottom-full left-0 mb-4 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[100] w-64 profile-dropdown-container max-h-64 overflow-y-auto">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
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
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <FaSignOutAlt className="text-sm" />
                      <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
