import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import axios from "axios";
import { 
  FaHome, 
  FaClipboardList, 
  FaCalendarAlt, 
  FaUsers, 
  FaGraduationCap,
  FaUser, 
  FaSignOutAlt,
  FaSchool,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserCheck,
  FaBars,
  FaTimes,
  FaInfoCircle
} from "react-icons/fa";
import Swal from 'sweetalert2';

export default function FacultySidebar({ onToggle }) {
  const { url } = usePage();
  const [userRole, setUserRole] = useState('faculty');
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Notify parent component of initial state on mount
  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('faculty-sidebar-collapsed', JSON.stringify(newState));
    if (onToggle) onToggle(newState);
  };

  useEffect(() => {
    // Get user info to determine if they have coordinator access
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/user');
          
          // Check if user is coordinator role OR has is_coordinator flag
          const userIsCoordinator = response.data.role === 'coordinator' || response.data.is_coordinator === true;
          setIsCoordinator(userIsCoordinator);
          setUserRole(response.data.role);
          
          console.log('User role check:', {
            role: response.data.role,
            is_coordinator: response.data.is_coordinator,
            final_coordinator_status: userIsCoordinator
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
    
    // Set up interval to refresh user info every 5 seconds to catch role changes
    const interval = setInterval(fetchUserInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        title: 'text-gray-800 font-semibold',
        content: 'text-gray-600'
      }
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        // Get token before clearing for logout request
        const token = localStorage.getItem('auth_token');
        
        // Send logout request to backend with proper headers
        const response = await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include'
        });

        // Clear all authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_session');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('current_page');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('student_token');
        localStorage.removeItem('registrar_token');
        localStorage.removeItem('faculty_token');
        localStorage.removeItem('coordinator_token');
        
        // Clear axios headers
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization'];
        }

        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Logged Out Successfully',
          text: 'You have been logged out. Redirecting to login page...',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-xl shadow-2xl',
            title: 'text-gray-800 font-semibold'
          }
        });

        // Redirect to login
        window.location.href = '/login';

      } catch (error) {
        console.error('Logout error:', error);
        
        // Clear data anyway and redirect
        localStorage.clear();
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization'];
        }
        
        await Swal.fire({
          icon: 'info',
          title: 'Logged Out',
          text: 'Session cleared. Redirecting to login page...',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-xl shadow-2xl'
          }
        });
        
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Base menu items for all faculty
  const baseMenuItems = [
    { name: "Dashboard", href: "/faculty/dashboard", icon: FaHome, description: "Overview and quick stats" },
    { name: "My Schedule", href: "/faculty/schedule", icon: FaCalendarAlt, description: "View your class timetable" },
    { name: "Class Lists", href: "/faculty/classes", icon: FaUsers, description: "Manage your classes" },
    { name: "Grade Input", href: "/faculty/grades", icon: FaGraduationCap, description: "Input student grades" },
  ];

  // Additional menu items for coordinators
  const coordinatorMenuItems = [
    { name: "Enrollment Management", href: "/faculty/enrollment", icon: FaUserGraduate, description: "Review student enrollments" },
    { name: "Student Assignment", href: "/faculty/students", icon: FaUserCheck, description: "Assign students to sections" },
  ];

  // Combine menu items based on coordinator status
  const menuItems = [
    ...baseMenuItems,
    ...(isCoordinator ? coordinatorMenuItems : []),
    { name: "Profile", href: "/faculty/profile", icon: FaUser, description: "Update your profile" },
  ];

  const isActive = (href) => url === href;

  return (
    <>
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      <aside className={`${isCollapsed ? 'w-16' : 'w-72'} bg-white shadow-2xl border-r border-purple-200 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out`}>
        {/* Toggle Button - Enhanced visibility */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-10 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <FaBars className="text-xs" /> : <FaTimes className="text-xs" />}
        </button>

        {/* Sidebar Header - Improved spacing */}
        <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 transition-all duration-300`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
            <div className="p-2 bg-purple-100 rounded-xl border border-purple-200 flex-shrink-0">
              <img 
                src="/onsts.png" 
                alt="ONSTS Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <FaSchool className="w-8 h-8 text-purple-600 hidden" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent truncate">
                  ONSTS
                </h1>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-purple-600 font-medium">Faculty Portal</span>
                  {isCoordinator && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      Coordinator
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Navigation - Enhanced accessibility */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-4 overflow-y-auto transition-all duration-300`}>
          {!isCollapsed && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-3 px-3">
                Main Menu
              </h3>
            </div>
          )}
          <ul className="space-y-1" role="navigation" aria-label="Main navigation">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.href);
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative ${
                    active
                      ? "bg-purple-600 text-white shadow-lg transform scale-105"
                      : "text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md"
                  }`}
                    title={isCollapsed ? `${item.name} - ${item.description}` : ""}
                    aria-label={`${item.name} - ${item.description}`}
                    role="menuitem"
                  >
                    <IconComponent className={`text-base transition-all duration-300 ${active ? "scale-110" : "group-hover:scale-110"} flex-shrink-0`} />
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block truncate">{item.name}</span>
                          <span className={`text-xs opacity-75 block truncate ${active ? 'text-purple-100' : 'text-purple-500'}`}>
                            {item.description}
                          </span>
                        </div>
                        {active && (
                          <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                        )}
                      </>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Status Indicator */}
        {!isCollapsed && (
          <div className="px-4 py-2 border-t border-purple-200 bg-purple-25">
            <div className="flex items-center gap-2 text-xs text-purple-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
              <FaInfoCircle className="ml-auto cursor-help" title="All systems operational" />
            </div>
          </div>
        )}

        {/* Logout Button - Enhanced design */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 transition-all duration-300`}>
          <button 
            onClick={handleLogout}
            disabled={isLoading}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group text-purple-600 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
            title={isCollapsed ? "Logout" : ""}
            aria-label="Logout from system"
          >
            <FaSignOutAlt className={`text-base transition-transform duration-300 group-hover:scale-110 ${isLoading ? 'animate-spin' : ''}`} />
            {!isCollapsed && (
              <span className="font-medium text-sm">
                {isLoading ? 'Logging out...' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
