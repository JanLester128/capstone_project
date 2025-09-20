import React, { useState, useEffect } from "react";
import { Head } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import useAuth from "../../hooks/useAuth";
import { 
  FaCalendarAlt, 
  FaBell, 
  FaGraduationCap, 
  FaChartLine, 
  FaBookOpen, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
  FaUser,
  FaSchool,
  FaTrophy,
  FaClipboardList
} from "react-icons/fa";

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState('pending');
  const [currentTime, setCurrentTime] = useState(new Date());

  // HCI Principle 1: Visibility of system status - Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Fetch user schedule, notifications, and enrollment status
    setNotifications([
      { id: 1, type: 'info', message: 'Welcome to the new semester!', time: '2 hours ago' },
      { id: 2, type: 'warning', message: 'Assignment due tomorrow', time: '1 day ago' },
      { id: 3, type: 'success', message: 'Enrollment approved', time: '3 days ago' }
    ]);
  }, [user]);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  // HCI Principle 2: Match between system and real world - Natural language for status
  const getEnrollmentStatusDisplay = () => {
    switch (enrollmentStatus) {
      case 'approved':
        return { 
          icon: <FaCheckCircle className="text-green-500" />, 
          text: 'Enrolled', 
          color: 'text-green-600 bg-green-50 border-green-200' 
        };
      case 'pending':
        return { 
          icon: <FaClock className="text-yellow-500" />, 
          text: 'Under Review', 
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200' 
        };
      case 'rejected':
        return { 
          icon: <FaExclamationTriangle className="text-red-500" />, 
          text: 'Action Required', 
          color: 'text-red-600 bg-red-50 border-red-200' 
        };
      default:
        return { 
          icon: <FaInfoCircle className="text-blue-500" />, 
          text: 'Not Enrolled', 
          color: 'text-blue-600 bg-blue-50 border-blue-200' 
        };
    }
  };

  const statusDisplay = getEnrollmentStatusDisplay();

  return (
    <>
      <Head title="Student Dashboard - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          
          {/* Enhanced Header with Status Visibility */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <FaGraduationCap className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Welcome back, {user?.firstname || 'Student'}!
                    </h1>
                    <p className="text-gray-600 flex items-center space-x-2">
                      <FaClock className="text-sm" />
                      <span>{currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                      <span className="text-gray-400">•</span>
                      <span>{currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${statusDisplay.color}`}>
                  {statusDisplay.icon}
                  <span className="font-medium">{statusDisplay.text}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.firstname} {user?.lastname}</p>
                  <p className="text-xs text-gray-500 capitalize flex items-center">
                    <FaUser className="mr-1" />
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Quick Stats Cards - HCI Principle 6: Recognition rather than recall */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Semester</p>
                      <p className="text-2xl font-bold text-gray-900">1st Sem</p>
                      <p className="text-xs text-gray-500 mt-1">2025-2026</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaSchool className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Enrolled Subjects</p>
                      <p className="text-2xl font-bold text-gray-900">8</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <FaCheckCircle className="mr-1" />
                        All confirmed
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FaBookOpen className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overall GPA</p>
                      <p className="text-2xl font-bold text-gray-900">3.75</p>
                      <p className="text-xs text-blue-600 mt-1">Dean's List</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FaTrophy className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">95%</p>
                      <p className="text-xs text-green-600 mt-1">Excellent</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FaChartLine className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Today's Schedule - HCI Principle 8: Aesthetic and minimalist design */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FaCalendarAlt className="mr-2 text-blue-600" />
                        Today's Schedule
                      </h2>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                        View Full Schedule
                        <FaArrowRight className="ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {schedule.length === 0 ? (
                      <div className="text-center py-8">
                        <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-4" />
                        <p className="text-gray-500">No classes scheduled for today</p>
                        <p className="text-sm text-gray-400 mt-1">Enjoy your free day!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Sample schedule items */}
                        <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex-shrink-0 w-16 text-center">
                            <p className="text-sm font-medium text-blue-600">8:00</p>
                            <p className="text-xs text-blue-500">AM</p>
                          </div>
                          <div className="flex-1 ml-4">
                            <h3 className="font-medium text-gray-900">Mathematics</h3>
                            <p className="text-sm text-gray-600">Room 101 • Prof. Smith</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notifications - HCI Principle 7: Flexibility and efficiency of use */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FaBell className="mr-2 text-yellow-600" />
                      Recent Updates
                      {notifications.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {notifications.length}
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="p-6">
                    {notifications.length === 0 ? (
                      <div className="text-center py-4">
                        <FaBell className="mx-auto text-3xl text-gray-300 mb-2" />
                        <p className="text-gray-500 text-sm">No new notifications</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions - HCI Principle 3: User control and freedom */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaClipboardList className="mr-2 text-indigo-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105">
                    <FaCalendarAlt className="mr-3 text-xl" />
                    <span className="font-medium">View Schedule</span>
                  </button>
                  <button className="flex items-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105">
                    <FaChartLine className="mr-3 text-xl" />
                    <span className="font-medium">Check Grades</span>
                  </button>
                  <button className="flex items-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                    <FaUser className="mr-3 text-xl" />
                    <span className="font-medium">Update Profile</span>
                  </button>
                  <button className="flex items-center p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105">
                    <FaGraduationCap className="mr-3 text-xl" />
                    <span className="font-medium">Enrollment</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
