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
  FaTimes
} from "react-icons/fa";

export default function StudentSidebar({ auth, notifications = [], onToggle }) {
  const { url } = usePage();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

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

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
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
          showConfirmButton: false
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
          showConfirmButton: false
        });
        
        window.location.href = '/login';
      }
    }
  };

  // Get unread notifications count from props
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const menuItems = [
    { name: "Dashboard", href: "/student/dashboard", icon: FaHome },
    { name: "Enroll", href: "/student/enroll", icon: FaUserGraduate },
    { name: "Grades", href: "/student/grades", icon: FaChartBar },
    { name: "Schedule", href: "/student/schedule", icon: FaCalendarAlt },
    { name: "Notifications", href: "/student/notifications", icon: FaBell, badge: unreadNotifications },
    { name: "Profile", href: "/student/profile", icon: FaUser },
  ];

  const isActive = (href) => url === href;

  return (
    <div className={`fixed left-0 top-0 h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl z-50 border-r border-slate-700/50 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="absolute -right-4 top-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
      >
        {isCollapsed ? <FaBars className="w-4 h-4" /> : <FaTimes className="w-4 h-4" />}
      </button>

      {/* Logo/Brand Section */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-blue-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <img 
                src="/onsts.png" 
                alt="ONSTS Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <FaSchool className="w-8 h-8 text-white hidden" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                ONSTS
              </h1>
              <p className="text-slate-300 text-xs font-medium tracking-wide">Student Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 py-4 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);
          
          return (
            <div key={item.name} className="relative group">
              <Link
                href={item.href}
                className={`flex items-center rounded-xl transition-all duration-300 relative overflow-hidden ${
                  isCollapsed 
                    ? 'justify-center p-3 mx-auto w-12 h-12' 
                    : 'gap-3 px-4 py-3'
                } ${
                  active
                    ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg backdrop-blur-sm border border-blue-400/30"
                    : "text-slate-300 hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-blue-800/30 hover:text-white hover:shadow-md"
                } ${!isCollapsed && !active ? 'hover:translate-x-1' : ''}`}
              >
                <div className={`relative rounded-lg transition-all duration-300 ${
                  isCollapsed ? 'p-1.5' : 'p-2'
                } ${
                  active 
                    ? "bg-white/20 text-white shadow-md" 
                    : "bg-slate-700/50 text-slate-400 group-hover:bg-blue-600/30 group-hover:text-white"
                }`}>
                  <IconComponent className="w-4 h-4" />
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </div>
                
                {!isCollapsed && (
                  <>
                    <span className={`font-medium text-sm ${active ? "text-white" : "group-hover:text-white"}`}>
                      {item.name}
                    </span>
                    {item.badge && item.badge > 0 && !active && (
                      <div className="ml-auto bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                        {item.badge > 9 ? '9+' : item.badge}
                      </div>
                    )}
                    {active && (
                      <div className="absolute right-3 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </>
                )}
                
                {/* Hover effect background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-indigo-600/0 group-hover:from-blue-600/10 group-hover:to-indigo-600/10 transition-all duration-300 rounded-xl"></div>
              </Link>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                  {item.name}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout Section */}
      <div className={`flex-shrink-0 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-blue-800/30 backdrop-blur-sm ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {auth?.user && !isCollapsed && (
          <div className="mb-3 p-3 bg-gradient-to-r from-slate-700/50 to-blue-700/30 rounded-xl backdrop-blur-sm border border-slate-600/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {auth.user.firstname?.[0]}{auth.user.lastname?.[0]}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {auth.user.firstname} {auth.user.lastname}
                </p>
                <p className="text-slate-300 text-xs">Student Account</p>
              </div>
            </div>
          </div>
        )}

        {auth?.user && isCollapsed && (
          <div className="mb-2 flex justify-center">
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">
                  {auth.user.firstname?.[0]}{auth.user.lastname?.[0]}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
              
              {/* Tooltip for collapsed user info */}
              <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                <div>
                  <p className="font-medium text-xs">{auth.user.firstname} {auth.user.lastname}</p>
                  <p className="text-xs text-slate-300">Student</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`group flex items-center rounded-xl text-red-300 hover:bg-gradient-to-r hover:from-red-600/20 hover:to-pink-600/20 hover:text-white transition-all duration-300 w-full border border-red-500/20 hover:border-red-400/40 shadow-md hover:shadow-lg ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
            }`}
          >
            <div className={`rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500/30 group-hover:text-white transition-all duration-300 ${
              isCollapsed ? 'p-1.5' : 'p-2'
            }`}>
              <FaSignOutAlt className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="font-medium text-sm group-hover:text-white">Sign Out</span>
            )}
          </button>
          
          {/* Tooltip for collapsed logout */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
              Sign Out
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
