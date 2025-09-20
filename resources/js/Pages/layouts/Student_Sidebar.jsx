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
  FaCircle
} from "react-icons/fa";

export default function StudentSidebar({ auth, notifications = [], onToggle }) {
  const { url } = usePage();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [hoveredItem, setHoveredItem] = useState(null);

  // Notify parent component of initial state on mount
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, []);

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
        await axios.post('/logout');
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
      icon: FaCalendarAlt,
      label: 'Schedule',
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
      path: '/student/enroll',
      icon: FaUserGraduate,
      label: 'Enrollment',
      description: 'Course Registration',
      badge: 'New'
    },
    {
      path: '/student/notifications',
      icon: FaBell,
      label: 'Notifications',
      description: 'Updates & Alerts',
      badge: notifications.length > 0 ? notifications.length : null
    },
    {
      path: '/student/profile',
      icon: FaUser,
      label: 'Profile',
      description: 'Personal Info',
      badge: null
    }
  ];

  // HCI Principle 1: Visibility of system status - Show current page
  const isActive = (path) => {
    return url === path || url.startsWith(path);
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-xl border-r border-gray-200 transition-all duration-300 z-50 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <FaGraduationCap className="text-blue-600" />
            </div>
            <div className="text-white">
              <h1 className="font-bold text-lg">ONSTS</h1>
              <p className="text-xs text-blue-100">Student Portal</p>
            </div>
          </div>
        )}
        
        {/* Toggle Button - HCI Principle 3: User control and freedom */}
        <button
          onClick={handleToggle}
          className={`p-2 rounded-lg text-white hover:bg-white/20 transition-colors duration-200 ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Active Indicator */}
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full"></div>
                )}
                
                {/* Icon */}
                <Icon className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'} text-lg ${
                  active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                
                {/* Label and Description */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                          typeof item.badge === 'number'
                            ? 'text-white bg-red-500'
                            : 'text-blue-700 bg-blue-100'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                  </div>
                )}

                {/* Hover Arrow */}
                {!isCollapsed && !active && (
                  <FaChevronRight className={`ml-2 text-xs text-gray-400 transition-transform duration-200 ${
                    hoveredItem === item.path ? 'translate-x-1' : ''
                  }`} />
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-300">{item.description}</div>
                    {/* Tooltip Arrow */}
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer Section */}
      <div className="border-t border-gray-200 p-4">
        {/* Help & Settings - HCI Principle 10: Help and documentation */}
        {!isCollapsed && (
          <div className="space-y-2 mb-4">
            <Link
              href="/help"
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              <FaQuestionCircle className="mr-3 text-gray-400" />
              Help & Support
            </Link>
            <Link
              href="/student/settings"
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              <FaCog className="mr-3 text-gray-400" />
              Settings
            </Link>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <FaSignOutAlt className={`${isCollapsed ? '' : 'mr-3'} group-hover:scale-110 transition-transform duration-200`} />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {/* Status Indicator */}
        {!isCollapsed && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <FaCircle className="mr-2 text-green-500 animate-pulse" />
              <span>Online</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
