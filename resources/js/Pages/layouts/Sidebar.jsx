import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import axios from "axios";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaBookOpen,
  FaCalendarAlt,
  FaGraduationCap,
  FaSchool,
  FaSignOutAlt,
  FaUserCog,
  FaChartBar,
  FaBars,
  FaTimes,
  FaBell,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaSpinner,
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaPalette,
  FaCog
} from "react-icons/fa";
import Swal from "sweetalert2";

const Sidebar = ({ onToggle }) => {
  const currentPath = window.location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('registrar-sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Error reading sidebar state from localStorage:', error);
      return false;
    }
  });
  
  // HCI Principle 1: Visibility of system status - Enhanced
  const [systemStatus, setSystemStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: new Date().toLocaleTimeString(),
    pendingActions: 0,
    // Note: notifications removed
    serverHealth: 'healthy',
    lastActivity: new Date().toLocaleTimeString()
  });
  
  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // HCI Principle 6: Recognition rather than recall - User profile info
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAcademicDropdown, setShowAcademicDropdown] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('registrar_token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/user');
          
          if (response.data) {
            // The /user endpoint returns the user object directly
            setUserProfile(response.data);
          }
        } else {
          // Fallback to localStorage
          const savedUser = localStorage.getItem('auth_user');
          if (savedUser) {
            try {
              setUserProfile(JSON.parse(savedUser));
            } catch (e) {
              console.error('Error parsing saved user:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to localStorage
        const savedUser = localStorage.getItem('auth_user');
        if (savedUser) {
          try {
            setUserProfile(JSON.parse(savedUser));
          } catch (e) {
            console.error('Error parsing saved user:', e);
          }
        }
      }
    };

    fetchUserProfile();
  }, []);

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
        toggleSidebar();
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

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('registrar-sidebar-collapsed', JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving sidebar state to localStorage:', error);
    }
    if (onToggle) onToggle(newState);
  };

  const isActive = (path) => currentPath.startsWith(path);

  // HCI Principle 5: Error prevention & Principle 9: Error recovery
  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) return;

    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout? Any unsaved changes will be lost.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true, // HCI Principle 4: Consistency
      focusCancel: true // HCI Principle 5: Error prevention
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
            'Authorization': `Bearer ${token}`,
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Clear all authentication data
        const keysToRemove = [
          'auth_token', 'auth_user', 'auth_session', 'last_activity', 
          'current_page', 'user', 'token', 'student_token', 
          'registrar_token', 'faculty_token', 'coordinator_token'
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
      if (showAcademicDropdown && !event.target.closest('.academic-dropdown-container') && !event.target.closest('.academic-dropdown-button')) {
        setShowAcademicDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown, showAcademicDropdown]);

  // HCI Principle 6: Recognition rather than recall - Menu items with descriptions
  const menuItems = [
    {
      path: "/registrar/dashboard",
      icon: FaTachometerAlt,
      label: "Dashboard",
      description: "Overview & analytics",
      shortcut: "Alt+D"
    },
    {
      path: "/registrar/students",
      icon: FaUserGraduate,
      label: "Students",
      description: "Student management",
      shortcut: "Alt+S"
    },
    {
      path: "/registrar/strands",
      icon: FaLayerGroup,
      label: "Strands",
      description: "Academic tracks",
      shortcut: "Alt+T"
    },
    {
      path: "/registrar/sections",
      icon: FaSchool,
      label: "Sections",
      description: "Class sections",
      shortcut: "Alt+E"
    },
    {
      path: "/registrar/faculty",
      icon: FaChalkboardTeacher,
      label: "Faculty",
      description: "Teacher management",
      shortcut: "Alt+F"
    },
    {
      type: "dropdown",
      icon: FaGraduationCap,
      label: "Academic Management",
      description: "Academic operations",
      shortcut: "Alt+A",
      items: [
        {
          path: "/registrar/subjects",
          icon: FaBookOpen,
          label: "Subjects",
          description: "Course catalog"
        },
        {
          path: "/registrar/schedules",
          icon: FaCalendarAlt,
          label: "Schedules",
          description: "Class timetables"
        },
        {
          path: "/registrar/school-years",
          icon: FaGraduationCap,
          label: "School Years",
          description: "Academic periods"
        }
      ]
    },
    {
      path: "/registrar/reports",
      icon: FaChartBar,
      label: "Reports",
      description: "Analytics & insights",
      shortcut: "Alt+R"
    },
    {
      path: "/registrar/settings",
      icon: FaUserCog,
      label: "Settings",
      description: "System configuration",
      shortcut: "Alt+G"
    }
  ];

  const [theme, setTheme] = useState('light');

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
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
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <FaSchool className="text-blue-600 text-lg" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">ONSTS</h1>
                <p className="text-blue-100 text-xs">Registrar Portal</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-200"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <FaBars className="text-sm" /> : <FaTimes className="text-sm" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-hidden py-1">
          <ul className="px-2 space-y-0.5 h-full overflow-hidden">
            {menuItems.map((item, index) => {
              const isCurrentActive = currentPath.startsWith(item.path);
              const Icon = item.icon;
              
              if (item.type === 'dropdown') {
                // Check if any sub-item is active
                const isAnySubItemActive = item.items.some(subItem => currentPath.startsWith(subItem.path));
                
                return (
                  <li key={index} className="relative">
                    <button
                      onClick={() => {
                        console.log('Dropdown clicked, current state:', showAcademicDropdown);
                        setShowAcademicDropdown(!showAcademicDropdown);
                      }}
                      className={`w-full group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 academic-dropdown-button ${
                        isAnySubItemActive
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? `${item.label} - ${item.description}` : ''}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className={`text-lg flex-shrink-0 transition-transform duration-200 ${
                          isAnySubItemActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                        }`} />
                        
                        {!isCollapsed && (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium text-xs truncate ${
                                  isAnySubItemActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
                                }`}>
                                  {item.label}
                                </span>
                              </div>
                            </div>
                            <div className={`transition-transform duration-200 ${showAcademicDropdown ? 'rotate-180' : ''}`}>
                              <FaChevronDown className={`text-xs ${
                                isAnySubItemActive ? 'text-white' : 'text-gray-400'
                              }`} />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Active indicator for collapsed state */}
                      {isCollapsed && isAnySubItemActive && (
                        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-full shadow-sm"></div>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-300">{item.description}</div>
                        <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                      )}
                    </button>

                    {/* Inline Dropdown for Expanded Sidebar */}
                    {showAcademicDropdown && !isCollapsed && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[100] academic-dropdown-container">
                        {item.items.map((subItem, subIndex) => {
                          const isSubItemActive = currentPath.startsWith(subItem.path);
                          const SubIcon = subItem.icon;

                          return (
                            <Link
                              key={subIndex}
                              href={subItem.path}
                              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${
                                isSubItemActive 
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={() => setShowAcademicDropdown(false)}
                            >
                              <SubIcon className={`text-sm ${
                                isSubItemActive ? 'text-white' : 'text-gray-400'
                              }`} />
                              <span className="font-medium">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* External Dropdown for Collapsed Sidebar */}
                    {showAcademicDropdown && isCollapsed && (
                      <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[100] w-64 academic-dropdown-container max-h-64 overflow-y-auto">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                        {item.items.map((subItem, subIndex) => {
                          const isSubItemActive = currentPath.startsWith(subItem.path);
                          const SubIcon = subItem.icon;

                          return (
                            <Link
                              key={subIndex}
                              href={subItem.path}
                              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-200 ${
                                isSubItemActive 
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => setShowAcademicDropdown(false)}
                            >
                              <SubIcon className={`text-sm ${
                                isSubItemActive ? 'text-white' : 'text-gray-400'
                              }`} />
                              <div>
                                <div className="font-medium">{subItem.label}</div>
                                <div className={`text-xs ${
                                  isSubItemActive ? 'text-blue-100' : 'text-gray-500'
                                }`}>{subItem.description}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li key={index}>
                  <Link
                    href={item.path}
                    className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 ${
                      isCurrentActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? `${item.label} - ${item.description}` : ''}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className={`text-sm flex-shrink-0 transition-transform duration-200 ${
                        isCurrentActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                      }`} />
                      
                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <span className={`font-medium text-xs truncate ${
                            isCurrentActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Active indicator for collapsed state */}
                    {isCollapsed && isCurrentActive && (
                      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-full shadow-sm"></div>
                    )}
                    
                    {/* Hover arrow */}
                    {!isCollapsed && !isCurrentActive && (
                      <FaChevronRight className="ml-2 text-xs text-gray-400 transition-transform duration-200 group-hover:translate-x-1" />
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
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Modern Profile Section */}
        <div className={`relative ${isCollapsed ? 'p-1' : 'p-2'} border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-100 flex-shrink-0`}>
          {!isCollapsed ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {userProfile?.firstname ? userProfile.firstname.charAt(0).toUpperCase() : 'R'}
                  {userProfile?.lastname ? userProfile.lastname.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-gray-800 text-xs truncate">
                    {userProfile?.firstname && userProfile?.lastname 
                      ? `${userProfile.firstname} ${userProfile.lastname}` 
                      : 'Registrar User'}
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
                        {userProfile?.firstname ? userProfile.firstname.charAt(0).toUpperCase() : 'R'}
                        {userProfile?.lastname ? userProfile.lastname.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 text-sm truncate">
                          {userProfile?.firstname && userProfile?.lastname 
                            ? `${userProfile.firstname} ${userProfile.lastname}` 
                            : 'Registrar User'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {userProfile?.email || 'Loading...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="px-4 py-2">
                    <Link
                      href="/registrar/profile"
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
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-lg transition-all duration-200"
                title={userProfile?.firstname && userProfile?.lastname 
                  ? `${userProfile.firstname} ${userProfile.lastname}` 
                  : 'Registrar User'}
              >
                {userProfile?.firstname ? userProfile.firstname.charAt(0).toUpperCase() : 'R'}
                {userProfile?.lastname ? userProfile.lastname.charAt(0).toUpperCase() : 'U'}
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
                        {userProfile?.firstname ? userProfile.firstname.charAt(0).toUpperCase() : 'R'}
                        {userProfile?.lastname ? userProfile.lastname.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 text-sm truncate">
                          {userProfile?.firstname && userProfile?.lastname 
                            ? `${userProfile.firstname} ${userProfile.lastname}` 
                            : 'Registrar User'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {userProfile?.email || 'Loading...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="px-4 py-2">
                    <Link
                      href="/registrar/profile"
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
        
        {/* Enhanced System Status Footer - Visibility of System Status */}
        <div className={`bg-gray-50 border-t border-gray-200 flex-shrink-0 ${isCollapsed ? 'px-1 py-1' : 'px-2 py-1'}`}>
          {!isCollapsed ? (
            <div className="space-y-1">
              {/* Connection Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    systemStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600 text-xs">
                    {systemStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} title={systemStatus.isOnline ? 'System Online' : 'System Offline'}></div>
              {/* Note: notifications indicator removed */}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
