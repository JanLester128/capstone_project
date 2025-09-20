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
} from "react-icons/fa";
import Swal from "sweetalert2";

const Sidebar = ({ onToggle }) => {
  const currentPath = window.location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('registrar-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // HCI Principle 1: Visibility of system status
  const [systemStatus, setSystemStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: new Date().toLocaleTimeString(),
    pendingActions: 0,
    notifications: 0
  });
  
  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // HCI Principle 6: Recognition rather than recall - User profile info
  const [userProfile, setUserProfile] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return { name: 'Registrar', email: 'registrar@onsts.edu.ph', role: 'Registrar' };
      }
    }
    return { name: 'Registrar', email: 'registrar@onsts.edu.ph', role: 'Registrar' };
  });

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

  // Notify parent component of initial state on mount
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, []);

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
    localStorage.setItem('registrar-sidebar-collapsed', JSON.stringify(newState));
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

  // HCI Principle 6: Recognition rather than recall - Menu items with descriptions
  const menuItems = [
    {
      path: "/registrar/dashboard",
      icon: FaTachometerAlt,
      label: "Dashboard",
      description: "Overview",
      shortcut: "Alt+D"
    },
    {
      path: "/registrar/students",
      icon: FaUserGraduate,
      label: "Students",
      description: "Manage records",
      shortcut: "Alt+S"
    },
    {
      path: "/registrar/sections",
      icon: FaLayerGroup,
      label: "Sections",
      description: "Class sections",
      shortcut: "Alt+E"
    },
    {
      path: "/registrar/faculty",
      icon: FaChalkboardTeacher,
      label: "Faculty",
      description: "Teaching staff",
      shortcut: "Alt+F"
    },
    {
      path: "/registrar/subjects",
      icon: FaBookOpen,
      label: "Subjects",
      description: "Curriculum",
      shortcut: "Alt+U"
    },
    {
      path: "/registrar/class",
      icon: FaLayerGroup,
      label: "Programs",
      description: "Academic strands",
      shortcut: "Alt+P"
    },
    {
      path: "/registrar/schedules",
      icon: FaCalendarAlt,
      label: "Schedules",
      description: "Timetables",
      shortcut: "Alt+C"
    },
    {
      path: "/registrar/grades",
      icon: FaGraduationCap,
      label: "Grades",
      description: "Assessments",
      shortcut: "Alt+G"
    },
    {
      path: "/registrar/semesters",
      icon: FaSchool,
      label: "Semesters",
      description: "Academic periods",
      shortcut: "Alt+T"
    },
    {
      path: "/registrar/profile",
      icon: FaUser,
      label: "Profile",
      description: "Account settings",
      shortcut: "Alt+R"
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
          role="button"
          aria-label="Close sidebar"
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-screen bg-white text-gray-800 shadow-xl border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 w-6 h-6 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${isCollapsed ? "Expand" : "Collapse"} sidebar (Alt+M)`}
        >
          {isCollapsed ? <FaBars className="text-xs" /> : <FaTimes className="text-xs" />}
        </button>

        {/* Sidebar Header */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b border-gray-200 transition-all duration-300 flex-shrink-0`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="p-1.5 bg-blue-100 rounded-lg border border-blue-200">
              <img src="/onsts.png" alt="ONSTS Logo" className="w-6 h-6 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-800">
                  ONSTS
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Registrar Portal</span>
                  {/* HCI Principle 1: System status visibility */}
                  <div className="flex items-center gap-1">
                    {connectionStatus === 'connected' ? (
                      <FaCheckCircle className="text-green-500 text-xs" title="Connected" />
                    ) : connectionStatus === 'offline' ? (
                      <FaExclamationTriangle className="text-orange-500 text-xs" title="Offline" />
                    ) : (
                      <FaSpinner className="text-blue-500 text-xs animate-spin" title="Connecting..." />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Status indicators when collapsed */}
          {isCollapsed && (
            <div className="mt-1 flex justify-center">
              {connectionStatus === 'connected' ? (
                <FaCheckCircle className="text-green-500 text-xs" title="System Online" />
              ) : connectionStatus === 'offline' ? (
                <FaExclamationTriangle className="text-orange-500 text-xs" title="System Offline" />
              ) : (
                <FaSpinner className="text-blue-500 text-xs animate-spin" title="Connecting..." />
              )}
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-3 transition-all duration-300 min-h-0`}>
          <ul className="space-y-1" role="menubar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isCurrentActive = isActive(item.path);
              
              return (
                <li key={item.path} role="none">
                  <Link
                    href={item.path}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'} rounded-xl transition-all duration-300 group relative border ${
                      isCurrentActive
                        ? "bg-blue-600 text-white shadow-lg border-blue-700 transform scale-[1.01]"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-transparent hover:border-gray-200 hover:shadow-sm"
                    }`}
                    title={isCollapsed ? `${item.label} - ${item.description} (${item.shortcut})` : item.shortcut}
                    role="menuitem"
                    aria-current={isCurrentActive ? "page" : undefined}
                  >
                    <div className={`flex items-center justify-center ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'} transition-all duration-300`}>
                      <Icon className={`${isCollapsed ? 'text-sm' : 'text-base'} transition-all duration-300 ${
                        isCurrentActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-blue-600"
                      }`} />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs block leading-tight truncate">
                              {item.label}
                            </span>
                            <span className={`text-xs block leading-tight truncate ${
                              isCurrentActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-600'
                            }`}>
                              {item.description}
                            </span>
                          </div>
                          
                          {isCurrentActive && (
                            <div className="flex items-center ml-2">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Active indicator for collapsed state */}
                    {isCollapsed && isCurrentActive && (
                      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-full shadow-sm"></div>
                    )}
                    
                    {/* Hover tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
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

        {/* Logout Button */}
        <div className={`${isCollapsed ? 'p-1' : 'p-3'} border-t border-gray-200 transition-all duration-300 flex-shrink-0`}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2 rounded-lg transition-all duration-300 group text-gray-600 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isCollapsed ? "Logout (Alt+L)" : "Logout (Alt+L)"}
            aria-label="Logout from system"
          >
            {isLoggingOut ? (
              <FaSpinner className="text-sm animate-spin" />
            ) : (
              <FaSignOutAlt className="text-sm transition-transform duration-300 group-hover:scale-110" />
            )}
            {!isCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <span className="font-medium text-sm block truncate">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
                <span className="text-xs opacity-75 truncate">
                  {isLoggingOut ? 'Please wait' : 'Secure sign out'}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
