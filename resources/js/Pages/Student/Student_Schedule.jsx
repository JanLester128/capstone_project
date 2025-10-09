import React, { useState, useEffect } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import axios from 'axios';
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaCalendarAlt, 
  FaClock, 
  FaMapMarkerAlt, 
  FaBookOpen,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaSpinner,
  FaUser,
  FaDownload,
  FaPrint,
  FaSearch,
  FaGraduationCap,
  FaCalendarWeek,
  FaPlay,
  FaPause,
  FaStop,
  FaList,
  FaTable,
  FaRocket,
  FaWifi,
  FaTimes,
  FaSyncAlt,
  FaHome,
  FaQuestionCircle,
  FaLightbulb,
  FaShieldAlt,
  FaFileAlt,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt as FaLocation,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaExpand,
  FaCompress,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFilter,
  FaEye,
  FaTachometerAlt,
  FaCalendarDay,
  FaCalendarCheck,
  FaBell,
  FaChartLine,
  FaAward,
  FaTrophy
} from "react-icons/fa";

export default function Student_Schedule() {
  const { auth } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [error, setError] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState('pending');

  // HCI Principle 1: Visibility of system status - Enhanced state management
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [pageLoadTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedDay, setSelectedDay] = useState('all');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // HCI Principle 7: Flexibility and efficiency of use - Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+F for search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]')?.focus();
      }
      // Alt+H for help
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        setShowHelp(!showHelp);
      }
      // Ctrl+P for print
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
      // F5 for refresh
      if (e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      }
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
      // Escape to clear search or close panels
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('');
        } else if (showHelp) {
          setShowHelp(false);
        } else if (showFilters) {
          setShowFilters(false);
        }
      }
      // Tab to switch view modes
      if (e.key === 'Tab' && e.altKey) {
        e.preventDefault();
        setViewMode(viewMode === 'list' ? 'timetable' : 'list');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, searchTerm, viewMode, showFilters, isFullscreen]);

  // Fetch schedule data from API
  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('loading');
      
      const response = await axios.get('/student/schedule-data', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const data = response.data;
      
      if (data.success) {
        setScheduleData(data);
        setEnrollmentStatus(data.enrollment_status || 'pending');
        setConnectionStatus('online');
        setLastRefresh(new Date());
      } else {
        setError(data.message || 'Failed to fetch schedule data');
        setEnrollmentStatus('pending');
        setConnectionStatus('error');
      }
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setError('Failed to load schedule data. Please try again.');
      setEnrollmentStatus('pending');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced refresh handler
  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await fetchScheduleData();
  };

  // Temporary function for testing section assignment
  const assignToSection = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/student/assign-section', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        fetchScheduleData();
      } else {
        setError(data.message || 'Failed to assign section');
      }
    } catch (err) {
      console.error('Error assigning section:', err);
      setError('Failed to assign section. Please try again.');
    }
  };

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getScheduleForDay = (day) => {
    if (!scheduleData?.schedules) return [];
    return scheduleData.schedules[day] || [];
  };

  const getStatusMessage = () => {
    if (loading) {
      return {
        icon: <FaSpinner className="w-12 h-12 text-blue-500 animate-spin" />,
        title: "Loading Schedule",
        message: "Please wait while we fetch your class schedule...",
        bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
        borderColor: "border-blue-300",
        textColor: "text-blue-800"
      };
    }

    if (error) {
      return {
        icon: <FaTimesCircle className="w-12 h-12 text-red-500" />,
        title: "Error Loading Schedule",
        message: error,
        bgColor: "bg-gradient-to-br from-red-50 to-pink-50",
        borderColor: "border-red-300",
        textColor: "text-red-800"
      };
    }

    switch (enrollmentStatus) {
      case 'pending':
        return {
          icon: <FaClock className="w-12 h-12 text-yellow-500" />,
          title: "Schedule Pending Approval",
          message: "Your enrollment is under review. Once approved, your class schedule will be available here.",
          bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50",
          borderColor: "border-yellow-300",
          textColor: "text-yellow-800"
        };
      case 'enrolled_no_section':
        return {
          icon: <FaInfoCircle className="w-12 h-12 text-blue-500" />,
          title: "Awaiting Section Assignment",
          message: "Your enrollment has been approved! Please wait while the coordinator assigns you to a section.",
          bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
          borderColor: "border-blue-300",
          textColor: "text-blue-800",
          action: <button 
            onClick={assignToSection}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Assign to Section
          </button>
        };
      case 'enrolled_no_schedule':
        return {
          icon: <FaInfoCircle className="w-12 h-12 text-purple-500" />,
          title: "Section Assigned - Schedule Pending",
          message: "You have been assigned to a section. Class schedules are being prepared by the faculty.",
          bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
          borderColor: "border-purple-300",
          textColor: "text-purple-800"
        };
      case 'enrolled':
        return {
          icon: <FaCheckCircle className="w-12 h-12 text-green-500" />,
          title: "Schedule Active",
          message: "Welcome to your official class schedule! All classes are confirmed for the semester.",
          bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
          borderColor: "border-green-300",
          textColor: "text-green-800"
        };
      default:
        return {
          icon: <FaExclamationTriangle className="w-12 h-12 text-blue-500" />,
          title: "Enrollment Required",
          message: "Please complete your enrollment to access your class schedule.",
          bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
          borderColor: "border-blue-300",
          textColor: "text-blue-800"
        };
    }
  };

  const statusInfo = getStatusMessage();

  const getSubjectColor = (index) => {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-orange-100 border-orange-300 text-orange-800',
      'bg-red-100 border-red-300 text-red-800',
      'bg-teal-100 border-teal-300 text-teal-800'
    ];
    return colors[index % colors.length];
  };

  const getTotalClasses = () => {
    if (!scheduleData?.schedules) return 0;
    return Object.values(scheduleData.schedules).reduce((total, dayClasses) => total + dayClasses.length, 0);
  };

  const getUniqueSubjects = () => {
    if (!scheduleData?.schedules) return 0;
    const subjects = new Set();
    Object.values(scheduleData.schedules).forEach(dayClasses => {
      dayClasses.forEach(classItem => subjects.add(classItem.subject_name));
    });
    return subjects.size;
  };

  // Get all classes in a flat array for list view
  const getAllClasses = () => {
    if (!scheduleData?.schedules) return [];
    const allClasses = [];
    Object.entries(scheduleData.schedules).forEach(([day, classes]) => {
      classes.forEach(classItem => {
        allClasses.push({
          ...classItem,
          day: day
        });
      });
    });
    return allClasses;
  };

  // Filter classes based on search term
  const getFilteredClasses = () => {
    const allClasses = getAllClasses();
    if (!searchTerm) return allClasses;
    
    return allClasses.filter(cls => 
      cls.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.day.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <>
      <Head title="Class Schedule - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          
          {/* Enhanced Header with System Status - HCI Principle 1: Visibility of system status */}
          <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl border-b border-gray-200 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-30">
                  <FaRocket className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Class Schedule</h1>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <div className="flex items-center space-x-1">
                      <FaClock className="text-sm" />
                      <span className="text-sm font-medium">
                        {currentTime.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <span className="text-blue-200">•</span>
                    <div className="flex items-center space-x-1">
                      <FaCalendarCheck className="text-sm" />
                      <span className="text-sm font-medium">Academic Schedule</span>
                    </div>
                    <span className="text-blue-200">•</span>
                    <div className="flex items-center space-x-1">
                      <FaUser className="text-sm" />
                      <span className="text-sm font-medium">
                        {auth?.user?.firstname || 'Student'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Action Buttons - HCI Principle 7: Flexibility and efficiency of use */}
              <div className="flex items-center space-x-3">
                {/* Connection Status */}
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs ${
                  connectionStatus === 'online' ? 'bg-green-100 text-green-700' :
                  connectionStatus === 'offline' ? 'bg-red-100 text-red-700' :
                  connectionStatus === 'loading' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {connectionStatus === 'online' && <FaWifi />}
                  {connectionStatus === 'offline' && <FaTimes />}
                  {connectionStatus === 'loading' && <FaSpinner className="animate-spin" />}
                  {connectionStatus === 'error' && <FaExclamationTriangle />}
                  <span className="capitalize">{connectionStatus}</span>
                </div>

                {/* Fullscreen Toggle */}
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200"
                  title="Toggle fullscreen (F11)"
                >
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>

                {/* Filter Toggle */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 shadow-md ${
                    showFilters ? 'bg-white text-blue-700' : 'text-white bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                  title="Toggle filters (Ctrl+F)"
                >
                  <FaFilter className="mr-2" />
                  Filters
                </button>

                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20"
                  title="Get help and information (Alt+H)"
                >
                  <FaQuestionCircle className="mr-2" />
                  Help
                </button>

                <button 
                  onClick={() => window.print()}
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20"
                  title="Print schedule (Ctrl+P)"
                >
                  <FaPrint className="mr-2" />
                  Print
                </button>

                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20 disabled:opacity-50"
                  title="Refresh schedule (F5)"
                >
                  <FaSyncAlt className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* System Status Bar */}
            <div className="mt-4 flex items-center justify-between text-xs text-blue-100">
              <div className="flex items-center space-x-4">
                <span>Page loaded: {pageLoadTime.toLocaleTimeString()}</span>
                <span>•</span>
                <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                <span>•</span>
                <span>Status: {enrollmentStatus}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>View: {viewMode}</span>
                <span>•</span>
                <span>Sort: {sortBy} ({sortOrder})</span>
              </div>
            </div>

            {/* Enhanced Help Panel - HCI Principle 10: Help and documentation */}
            {showHelp && (
              <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg flex items-center">
                    <FaLightbulb className="mr-2 text-yellow-300" />
                    How to use your schedule
                  </h3>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-100">
                  <div>
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <FaEye className="mr-2" />
                      Viewing Schedule
                    </h4>
                    <ul className="space-y-1">
                      <li>• Switch between List and Timetable views</li>
                      <li>• Search for specific subjects or teachers</li>
                      <li>• Filter by day or time slots</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <FaSearch className="mr-2" />
                      Navigation
                    </h4>
                    <ul className="space-y-1">
                      <li>• Use search to find classes quickly</li>
                      <li>• Click on classes for more details</li>
                      <li>• Print or export your schedule</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <FaRocket className="mr-2" />
                      Keyboard Shortcuts
                    </h4>
                    <ul className="space-y-1">
                      <li>• Alt+H: Toggle help</li>
                      <li>• Ctrl+F: Focus search</li>
                      <li>• Ctrl+P: Print schedule</li>
                      <li>• F5: Refresh data</li>
                      <li>• Alt+Tab: Switch views</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-600 bg-opacity-30 rounded-lg">
                  <p className="text-xs text-blue-100">
                    <strong>💡 Pro Tip:</strong> Your schedule updates automatically when changes are made by faculty. 
                    Use the refresh button to get the latest updates.
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Filter Panel - HCI Principle 7: Flexibility and efficiency of use */}
            {showFilters && (
              <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center">
                    <FaFilter className="mr-2" />
                    Filters & Search
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Search</label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search subjects or teachers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Day Filter</label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    >
                      <option value="all" className="text-gray-900">All Days</option>
                      <option value="Monday" className="text-gray-900">Monday</option>
                      <option value="Tuesday" className="text-gray-900">Tuesday</option>
                      <option value="Wednesday" className="text-gray-900">Wednesday</option>
                      <option value="Thursday" className="text-gray-900">Thursday</option>
                      <option value="Friday" className="text-gray-900">Friday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    >
                      <option value="time" className="text-gray-900">Time</option>
                      <option value="subject" className="text-gray-900">Subject</option>
                      <option value="teacher" className="text-gray-900">Teacher</option>
                      <option value="day" className="text-gray-900">Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Order</label>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white hover:bg-opacity-30 transition-all duration-200"
                    >
                      {sortOrder === 'asc' ? <FaSortUp className="mr-2" /> : <FaSortDown className="mr-2" />}
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Enhanced Status Message - HCI Principle 8: Aesthetic and minimalist design */}
              {(enrollmentStatus !== 'enrolled' || loading || error || getTotalClasses() === 0) && (
                <div className={`${statusInfo.bgColor} border-2 ${statusInfo.borderColor} rounded-xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]`}>
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="relative">
                        {statusInfo.icon}
                        {/* Animated ring for active status */}
                        <div className="absolute inset-0 rounded-full border-2 border-current opacity-20 animate-ping"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h2 className={`text-3xl font-bold ${statusInfo.textColor} tracking-tight`}>{statusInfo.title}</h2>
                      <p className={`text-lg ${statusInfo.textColor} max-w-2xl mx-auto leading-relaxed`}>{statusInfo.message}</p>
                      
                      {/* Progress indicator for loading */}
                      {loading && (
                        <div className="mt-4">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                          </div>
                          <p className="text-xs text-blue-700 mt-2">Loading your schedule...</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        {error && (
                          <button 
                            onClick={handleRefresh}
                            className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
                          >
                            <FaSyncAlt className="mr-3" />
                            Try Again
                          </button>
                        )}
                        {statusInfo.action}
                        
                        {/* Additional help button */}
                        <button 
                          onClick={() => setShowHelp(true)}
                          className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <FaQuestionCircle className="mr-3" />
                          Need Help?
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {enrollmentStatus === 'enrolled' && !loading && !error && scheduleData && getTotalClasses() > 0 && (
                <>
                  {/* Enhanced Semester Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-8 text-center">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                        <FaCalendarCheck className="text-white text-xl" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                          {scheduleData.school_year ? `${scheduleData.school_year} First Semester` : '2025-2026 First Semester'}
                        </h2>
                        <p className="text-gray-600 mt-1">Your Official Class Schedule</p>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white bg-opacity-50 rounded-lg p-4">
                        <FaBookOpen className="text-blue-500 text-2xl mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Total Classes</p>
                        <p className="text-2xl font-bold text-blue-600">{getTotalClasses()}</p>
                      </div>
                      <div className="bg-white bg-opacity-50 rounded-lg p-4">
                        <FaGraduationCap className="text-green-500 text-2xl mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Subjects</p>
                        <p className="text-2xl font-bold text-green-600">{getUniqueSubjects()}</p>
                      </div>
                      <div className="bg-white bg-opacity-50 rounded-lg p-4">
                        <FaUser className="text-purple-500 text-2xl mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Section</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {scheduleData.student?.section || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced View Mode Tabs */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-50">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 px-8 py-4 text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 ${
                          viewMode === 'list'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <FaList className="text-lg" />
                        <span>List View</span>
                        {viewMode === 'list' && <FaCheckCircle className="text-sm" />}
                      </button>
                      <button
                        onClick={() => setViewMode('timetable')}
                        className={`flex-1 px-8 py-4 text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 ${
                          viewMode === 'timetable'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <FaTable className="text-lg" />
                        <span>Timetable View</span>
                        {viewMode === 'timetable' && <FaCheckCircle className="text-sm" />}
                      </button>
                    </div>

                    {/* List View */}
                    {viewMode === 'list' && (
                      <div className="p-6">
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Class List</h3>
                          
                          {/* Search Bar */}
                          <div className="relative mb-4">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search subjects or teachers..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                            />
                          </div>

                          {/* Class Table */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subject
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Day
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Room
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Instructor
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {getFilteredClasses().map((classItem, index) => (
                                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {classItem.subject_name}
                                      </div>
                                      {classItem.subject_code && (
                                        <div className="text-sm text-gray-500 italic">
                                          ({classItem.subject_code})
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {classItem.day}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {classItem.time_range}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {classItem.room || 'TBA'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {classItem.faculty_name}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            {getFilteredClasses().length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <FaBookOpen className="mx-auto text-3xl mb-2" />
                                <p>No classes found matching your search.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timetable View */}
                    {viewMode === 'timetable' && (
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search subjects or teachers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <FaBookOpen className="text-blue-500" />
                              <span>{getTotalClasses()} Classes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FaGraduationCap className="text-green-500" />
                              <span>{getUniqueSubjects()} Subjects</span>
                            </div>
                            {scheduleData.student && (
                              <div className="flex items-center space-x-2">
                                <FaUser className="text-purple-500" />
                                <span>{scheduleData.student.section}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timetable Grid */}
                        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300 w-24">
                                    Time
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Monday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Tuesday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Wednesday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Thursday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Friday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                                    Saturday
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    Sunday
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const timeSlots = [
                                    '7:30 - 8:00', '8:00 - 8:30', '8:30 - 9:00', '9:00 - 9:30', '9:30 - 10:00',
                                    '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00', '12:00 - 12:30',
                                    '12:30 - 1:00', '1:00 - 1:30', '1:30 - 2:00', '2:00 - 2:30', '2:30 - 3:00',
                                    '3:00 - 3:30', '3:30 - 4:00', '4:00 - 4:30', '4:30 - 5:00', '5:00 - 5:30',
                                    '5:30 - 6:00', '6:00 - 6:30', '6:30 - 7:00', '7:00 - 7:30', '7:30 - 8:00',
                                    '8:00 - 8:30', '8:30 - 9:00'
                                  ];
                                  
                                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                  
                                  // Create a grid to track occupied cells
                                  const grid = {};
                                  days.forEach(day => {
                                    grid[day] = {};
                                  });
                                  
                                  // Function to convert time to slot index
                                  const timeToSlotIndex = (timeStr) => {
                                    const [time, period] = timeStr.split(' ');
                                    let [hours, minutes] = time.split(':').map(Number);
                                    
                                    if (period === 'PM' && hours !== 12) hours += 12;
                                    if (period === 'AM' && hours === 12) hours = 0;
                                    
                                    const totalMinutes = hours * 60 + minutes;
                                    const startMinutes = 7 * 60 + 30; // 7:30 AM
                                    const slotMinutes = (totalMinutes - startMinutes) / 30;
                                    
                                    return Math.floor(slotMinutes);
                                  };
                                  
                                  // Parse schedule data and fill grid
                                  if (scheduleData?.schedules) {
                                    Object.entries(scheduleData.schedules).forEach(([day, classes]) => {
                                      classes.forEach(classItem => {
                                        if (classItem.time_range) {
                                          const [startTime, endTime] = classItem.time_range.split(' - ');
                                          const startSlot = timeToSlotIndex(startTime);
                                          const endSlot = timeToSlotIndex(endTime);
                                          
                                          if (startSlot >= 0 && startSlot < timeSlots.length && endSlot > startSlot) {
                                            const duration = endSlot - startSlot;
                                            grid[day][startSlot] = {
                                              ...classItem,
                                              duration: duration
                                            };
                                            
                                            // Mark occupied slots
                                            for (let i = startSlot + 1; i < endSlot; i++) {
                                              grid[day][i] = 'occupied';
                                            }
                                          }
                                        }
                                      });
                                    });
                                  }
                                  
                                  const getSubjectColor = (subject) => {
                                    const colors = {
                                      'IT Elective 6: Internet of Things': 'bg-green-400',
                                      'Capstone Project and Research 2': 'bg-yellow-400',
                                      'Systems Administration and Maintenance': 'bg-yellow-300',
                                      'IT Elective 5: Cloud Computing': 'bg-green-300'
                                    };
                                    return colors[subject] || 'bg-blue-300';
                                  };
                                  
                                  return timeSlots.map((timeSlot, index) => (
                                    <tr key={index} className="border-b border-gray-200">
                                      <td className="px-2 py-2 text-xs text-center font-medium text-gray-700 border-r border-gray-300 bg-gray-50">
                                        {timeSlot}
                                      </td>
                                      {days.map(day => {
                                        const cell = grid[day][index];
                                        
                                        if (cell === 'occupied') {
                                          return null; // This cell is part of a multi-slot class
                                        }
                                        
                                        if (cell && typeof cell === 'object') {
                                          return (
                                            <td 
                                              key={day} 
                                              className={`px-2 py-1 text-xs text-center border-r border-gray-300 ${getSubjectColor(cell.subject_name)} text-gray-800`}
                                              rowSpan={cell.duration}
                                            >
                                              <div className="font-semibold leading-tight">
                                                {cell.subject_name}
                                              </div>
                                              <div className="text-xs mt-1">
                                                {cell.room || 'TBA'}
                                              </div>
                                              <div className="text-xs">
                                                {cell.faculty_name}
                                              </div>
                                            </td>
                                          );
                                        }
                                        
                                        return (
                                          <td key={day} className="px-2 py-2 border-r border-gray-300 bg-white">
                                            {/* Empty cell */}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
