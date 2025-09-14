import React, { useState, useEffect } from "react";
import { Head } from "@inertiajs/react";
import Faculty_Sidebar from "../layouts/Faculty_Sidebar";
import useAuth from "../../hooks/useAuth";
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaGraduationCap, 
  FaChartLine,
  FaClock,
  FaBookOpen,
  FaBell,
  FaArrowRight
} from "react-icons/fa";

export default function FacultyDashboard() {
  const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Fetch faculty classes and students data
  }, []);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Quick action handlers
  const quickActions = [
    {
      title: "Grade Students",
      description: "Input and manage student grades",
      icon: FaGraduationCap,
      color: "blue",
      href: "/faculty/grades"
    },
    {
      title: "View Schedule",
      description: "Check your class timetable",
      icon: FaCalendarAlt,
      color: "green",
      href: "/faculty/schedule"
    },
    {
      title: "Manage Classes",
      description: "View and organize your classes",
      icon: FaUsers,
      color: "yellow",
      href: "/faculty/classes"
    },
    {
      title: "Update Profile",
      description: "Edit your personal information",
      icon: FaBookOpen,
      color: "purple",
      href: "/faculty/profile"
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
      green: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100",
      yellow: "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100",
      purple: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100",
      red: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      <Head title="Faculty Dashboard" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-purple-50 overflow-hidden">
        <Faculty_Sidebar onToggle={handleSidebarToggle} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-72'} min-w-0`}>
          {/* Enhanced Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Faculty Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.firstname || 'Faculty'}!</p>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                {/* Time and Date Display */}
                <div className="text-right hidden md:block">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FaClock className="text-purple-500" />
                    {formatTime(currentTime)}
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(currentTime)}</p>
                </div>
                {/* User Info */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">{user?.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
                    {user?.role === 'coordinator' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Coordinator
                      </span>
                    )}
                  </div>
                </div>
                {/* Notification Bell */}
                <button className="relative p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50">
                  <FaBell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Enhanced Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Classes</p>
                      <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                      <p className="text-xs text-green-600 mt-1">↗ Active this semester</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FaBookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900">{classes.reduce((sum, cls) => sum + (cls.students || 0), 0)}</p>
                      <p className="text-xs text-blue-600 mt-1">↗ Enrolled students</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FaUsers className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Today's Classes</p>
                      <p className="text-3xl font-bold text-gray-900">2</p>
                      <p className="text-xs text-purple-600 mt-1">→ Next at 2:00 PM</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <FaCalendarAlt className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Pending Grades</p>
                      <p className="text-3xl font-bold text-gray-900">8</p>
                      <p className="text-xs text-red-600 mt-1">⚠ Requires attention</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <FaChartLine className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Classes and Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* My Classes */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">My Classes</h3>
                    <button className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                      View All <FaArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-6">
                    {classes.length > 0 ? (
                      <div className="space-y-4">
                        {classes.slice(0, 3).map((cls) => (
                          <div key={cls.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 truncate">{cls.name}</h4>
                                <p className="text-sm text-gray-600 truncate">{cls.schedule}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-sm font-medium text-gray-900">{cls.students || 0} students</p>
                                <button className="text-xs text-purple-600 hover:text-purple-800">View Details</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FaBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No classes assigned yet</p>
                        <p className="text-sm text-gray-400">Contact your administrator for class assignments</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Student Activity */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <button className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                      View All <FaArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-6">
                    {students.length > 0 ? (
                      <div className="space-y-4">
                        {students.slice(0, 4).map((student) => (
                          <div key={student.id} className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {student.name?.charAt(0) || 'S'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                              <p className="text-xs text-gray-600 truncate">{student.course} - Grade: {student.grade}</p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {student.timestamp || '2m ago'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FaUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No recent activity</p>
                        <p className="text-sm text-gray-400">Student activities will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Actions */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <p className="text-sm text-gray-600">Frequently used features for efficient workflow</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => {
                      const IconComponent = action.icon;
                      return (
                        <button 
                          key={action.title}
                          className={`p-4 border rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${getColorClasses(action.color)}`}
                          onClick={() => window.location.href = action.href}
                        >
                          <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white shadow-sm flex items-center justify-center">
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <p className="font-semibold text-sm mb-1">{action.title}</p>
                            <p className="text-xs opacity-75">{action.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
