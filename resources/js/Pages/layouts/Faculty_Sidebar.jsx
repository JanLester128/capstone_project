import React, { useState, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";
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
  FaUserPlus,
  FaExchangeAlt,
  FaBars,
  FaTimes,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaPalette,
  FaBell,
  FaCog,
  FaLevelUpAlt
} from "react-icons/fa";
import Swal from 'sweetalert2';
import { AuthManager } from '../../auth';

export default function FacultySidebar({ onToggle }) {
  const { url } = usePage();
  const [currentUrl, setCurrentUrl] = useState(url);
  const [userRole, setUserRole] = useState('faculty');
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [theme, setTheme] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({});

  // Update current URL when page URL changes and store in AuthManager
  useEffect(() => {
    setCurrentUrl(url);
    // Use AuthManager to store current page
    AuthManager.storeCurrentPage(url);
  }, [url]);

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

  const toggleSubmenu = (itemName) => {
    setExpandedMenus(prev => {
      const newState = {
        ...prev,
        [itemName]: !prev[itemName]
      };
      
      // Scroll the submenu into view after a short delay
      if (newState[itemName]) {
        setTimeout(() => {
          const submenuElement = document.querySelector(`[data-submenu="${itemName}"]`);
          if (submenuElement) {
            submenuElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'nearest'
            });
          }
        }, 100);
      }
      
      return newState;
    });
  };

  // Manual refresh function for coordinator status
  const manualRefreshCoordinatorStatus = async () => {
    console.log('🔄 Manual refresh triggered...');
    const currentStatus = isCoordinator;
    
    const refreshSuccess = await AuthManager.forceRefreshUser();
    if (refreshSuccess) {
      const user = AuthManager.getUser();
      if (user) {
        const newCoordinatorStatus = user.role === 'coordinator' || (user.role === 'faculty' && user.is_coordinator === true);
        
        console.log('🔄 Manual refresh results:', {
          currentStatus,
          newStatus: newCoordinatorStatus,
          userRole: user.role,
          is_coordinator: user.is_coordinator
        });
        
        setIsCoordinator(newCoordinatorStatus);
        setUserInfo(user);
        setUserRole(user.role);
        
        if (currentStatus !== newCoordinatorStatus) {
          Swal.fire({
            title: newCoordinatorStatus ? 'Coordinator Access Granted!' : 'Coordinator Access Removed',
            text: newCoordinatorStatus ? 'You now have coordinator privileges.' : 'Your coordinator privileges have been removed.',
            icon: newCoordinatorStatus ? 'success' : 'info',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            title: 'Status Refreshed',
            text: 'Your coordinator status is up to date.',
            icon: 'info',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    }
  };

  useEffect(() => {
    // Get user info to determine if they have coordinator access
    const fetchUserInfo = async () => {
      try {
        // Get user data from AuthManager first
        let user = AuthManager.getUser();
        
        // If no user data in AuthManager, try to refresh from server
        if (!user) {
          console.log('🔍 Faculty_Sidebar: No user in AuthManager, refreshing from server...');
          const refreshSuccess = await refreshUserData();
          if (refreshSuccess) {
            user = AuthManager.getUser();
          }
        }
        
        if (user) {
          console.log('🔍 Faculty_Sidebar: User data loaded:', {
            id: user.id,
            email: user.email,
            role: user.role,
            is_coordinator: user.is_coordinator,
            is_coordinator_type: typeof user.is_coordinator,
            full_user: user
          });
          
          setUserInfo(user);
          setUserRole(user.role);
          setIsCoordinator(user.is_coordinator || false);
          
          console.log('🔍 Faculty_Sidebar: State set to:', {
            userRole: user.role,
            isCoordinator: user.is_coordinator || false
          });
        } else {
          console.warn('No user data found in AuthManager or server');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Define refreshUserData function before using it
    const refreshUserData = async () => {
      try {
        const token = AuthManager.getToken();
        if (!token) return false;

        // Try the protected route first
        let response = await fetch('/user/refresh', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        // If protected route fails, try the unprotected user route
        if (!response.ok) {
          console.log('Protected /user/refresh failed, trying /user route');
          response = await fetch('/user', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
        }

        // If that also fails, try the debug route
        if (!response.ok) {
          console.log('Both protected routes failed, trying debug route');
          response = await fetch('/debug/user-info', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
        }

        if (response.ok) {
          const data = await response.json();
          // Handle both response formats
          const userData = data.success ? data.user : data;
          if (userData && userData.id) {
            console.log('🔄 Faculty_Sidebar: Refreshed user data:', {
              id: userData.id,
              role: userData.role,
              is_coordinator: userData.is_coordinator,
              is_coordinator_type: typeof userData.is_coordinator
            });
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

    // Function to check coordinator access
    const hasCoordinatorAccess = () => {
      const user = AuthManager.getUser();
      if (!user) return false;
      return user.role === 'coordinator' || (user.role === 'faculty' && user.is_coordinator === true);
    };
    
    // Set up periodic check for coordinator status changes (every 5 seconds for faster response)
    const statusCheckInterval = setInterval(async () => {
      const currentCoordinatorStatus = hasCoordinatorAccess();
      
      // Use the new force refresh method from AuthManager
      const refreshSuccess = await AuthManager.forceRefreshUser();
      
      if (refreshSuccess) {
        const newCoordinatorStatus = hasCoordinatorAccess();
        
        // If coordinator status changed, update state immediately
        if (currentCoordinatorStatus !== newCoordinatorStatus) {
          console.log('🔄 Coordinator status changed, updating sidebar...', {
            from: currentCoordinatorStatus,
            to: newCoordinatorStatus
          });
          
          setIsCoordinator(newCoordinatorStatus);
          
          // Update user info state as well
          const updatedUser = AuthManager.getUser();
          if (updatedUser) {
            setUserInfo(updatedUser);
            setUserRole(updatedUser.role);
            
            console.log('🔄 Updated sidebar state:', {
              userRole: updatedUser.role,
              isCoordinator: newCoordinatorStatus,
              is_coordinator_field: updatedUser.is_coordinator
            });
          }
          
          // Show notification about status change
          if (newCoordinatorStatus) {
            Swal.fire({
              title: 'Coordinator Access Granted!',
              text: 'You now have coordinator privileges. New menu options are now available.',
              icon: 'success',
              timer: 3000,
              showConfirmButton: false
            });
          } else {
            Swal.fire({
              title: 'Coordinator Access Removed',
              text: 'Your coordinator privileges have been removed.',
              icon: 'info',
              timer: 3000,
              showConfirmButton: false
            });
          }
        }
      }
    }, 3000); // Check every 3 seconds for faster response
    
    return () => {
      clearInterval(statusCheckInterval);
    };
  }, []);

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

  // Additional menu items for coordinators with student type separation
  const coordinatorMenuItems = [
    { name: "Enrollment Management", href: "/faculty/enrollment", icon: FaUserGraduate, description: "Review student enrollments" },
    { name: "Manual Enrollment", href: "/faculty/manual-enrollment", icon: FaUserPlus, description: "Enroll students manually (for those without internet/email)" },
    { name: "Grade Progression", href: "/faculty/grade-progression", icon: FaLevelUpAlt, description: "Progress Grade 11 students to Grade 12" },
    { 
      name: "Student Management", 
      href: "/faculty/students", 
      icon: FaUserCheck, 
      description: "View enrolled students by type and section",
      hasSubmenu: true,
      submenu: [
        { name: "All Students", href: "/faculty/students?type=all", icon: FaUsers, description: "View all enrolled students" },
        { name: "New Students", href: "/faculty/students?type=new", icon: FaUserPlus, description: "First-time enrollees" },
        { name: "Continuing Students", href: "/faculty/students?type=continuing", icon: FaUserCheck, description: "Grade 12 and returning students" },
        { name: "Transferees", href: "/faculty/students?type=transferee", icon: FaExchangeAlt, description: "Students from other schools" }
      ]
    },
  ];

  // Combine menu items based on coordinator status
  const menuItems = [
    ...baseMenuItems,
    ...(isCoordinator ? coordinatorMenuItems : []),
  ];
  
  // Debug logging for menu items
  console.log('🔍 Faculty_Sidebar: Menu rendering debug:', {
    isCoordinator,
    baseMenuItemsCount: baseMenuItems.length,
    coordinatorMenuItemsCount: coordinatorMenuItems.length,
    totalMenuItemsCount: menuItems.length,
    coordinatorMenuItems: coordinatorMenuItems.map(item => item.name)
  });

  // Enhanced active state detection
  const isActive = (href) => {
    // Check current URL from usePage hook
    if (url === href) {
      return true;
    }
    
    // Check stored URL using AuthManager key
    const storedUrl = AuthManager.getCurrentPage();
    if (storedUrl === href) {
      return true;
    }
    
    // Check browser location as fallback
    if (typeof window !== 'undefined' && window.location.pathname === href) {
      return true;
    }
    
    return false;
  };


  return (
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
              <p className="text-blue-100 text-xs">Faculty Portal</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-200"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <FaBars className="text-sm" /> : <FaTimes className="text-sm" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden py-1">
        <ul className="px-2 space-y-0">
          
          {menuItems.map((item, index) => {
            const isCurrentActive = isActive(item.href);
            const Icon = item.icon;
            const hasSubmenu = item.hasSubmenu && item.submenu;
            const isExpanded = expandedMenus[item.name];
            
            return (
              <li key={index} className="relative">
                {/* Main Menu Item */}
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 text-left ${
                      isExpanded
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`text-lg flex-shrink-0 ${
                      isExpanded ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${
                            isExpanded ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {item.name}
                          </div>
                          <div className={`text-xs truncate ${
                            isExpanded ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {item.description}
                          </div>
                        </div>
                        {isExpanded ? (
                          <FaChevronUp className="text-sm text-blue-600" />
                        ) : (
                          <FaChevronDown className="text-sm text-gray-400" />
                        )}
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      isCurrentActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => {
                      AuthManager.storeCurrentPage(item.href);
                    }}
                  >
                    <Icon className={`text-lg flex-shrink-0 ${
                      isCurrentActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${
                          isCurrentActive ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {item.name}
                        </div>
                        <div className={`text-xs truncate ${
                          isCurrentActive ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                )}

                {/* Submenu Items */}
                {isExpanded && !isCollapsed && (
                  <ul className="ml-6 mt-0.5 space-y-0" data-submenu={item.name}>
                    {item.submenu.map((subItem, subIndex) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = isActive(subItem.href);
                      
                      return (
                        <li key={subIndex}>
                          <Link
                            href={subItem.href}
                            className={`flex items-center gap-3 px-3 py-1 rounded-lg transition-all duration-200 ${
                              isSubActive
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                            onClick={() => {
                              AuthManager.storeCurrentPage(subItem.href);
                            }}
                          >
                            <SubIcon className={`text-sm flex-shrink-0 ${
                              isSubActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm truncate ${
                                isSubActive ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {subItem.name}
                              </div>
                              <div className={`text-xs truncate ${
                                isSubActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {subItem.description}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-300">{item.description}</div>
                    <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Modern Profile Section */}
      <div className="relative p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-purple-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'F'}
                {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {userInfo?.firstname && userInfo?.lastname 
                    ? `${userInfo.firstname} ${userInfo.lastname}` 
                    : 'Faculty User'}
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'F'}
                      {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 text-sm truncate">
                        {userInfo?.firstname && userInfo?.lastname 
                          ? `${userInfo.firstname} ${userInfo.lastname}` 
                          : 'Faculty User'}
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
                    href="/faculty/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <FaUser className="text-gray-400 text-sm" />
                    <span>Profile</span>
                  </Link>
                  
                  {/* Refresh Coordinator Status Button */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      manualRefreshCoordinatorStatus();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 w-full text-left"
                  >
                    <FaCog className="text-gray-400 text-sm" />
                    <span>Refresh Status</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="px-4 py-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <FaSignOutAlt className="text-sm" />
                    <span>{isLoading ? 'Logging out...' : 'Log out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-lg transition-all duration-200"
              title={userInfo?.firstname && userInfo?.lastname 
                ? `${userInfo.firstname} ${userInfo.lastname}` 
                : 'Faculty User'}
            >
              {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'F'}
              {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
            </button>

            {/* Collapsed Profile Dropdown */}
            {showProfileDropdown && (
              <div className="fixed bottom-20 left-20 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[60] w-64 profile-dropdown-container">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {userInfo?.firstname ? userInfo.firstname.charAt(0).toUpperCase() : 'F'}
                      {userInfo?.lastname ? userInfo.lastname.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 text-sm truncate">
                        {userInfo?.firstname && userInfo?.lastname 
                          ? `${userInfo.firstname} ${userInfo.lastname}` 
                          : 'Faculty User'}
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
                    href="/faculty/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <FaUser className="text-gray-400 text-sm" />
                    <span>Profile</span>
                  </Link>
                  
                  {/* Refresh Coordinator Status Button */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      manualRefreshCoordinatorStatus();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 w-full text-left"
                  >
                    <FaCog className="text-gray-400 text-sm" />
                    <span>Refresh Status</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="px-4 py-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <FaSignOutAlt className="text-sm" />
                    <span>{isLoading ? 'Logging out...' : 'Log out'}</span>
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
