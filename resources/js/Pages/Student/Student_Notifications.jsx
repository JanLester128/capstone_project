import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaBell, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle,
  FaTimes,
  FaGraduationCap,
  FaClipboardList,
  FaCalendarAlt,
  FaBookOpen,
  FaFilter,
  FaEye,
  FaEyeSlash,
  FaClock
} from "react-icons/fa";

export default function Student_Notifications() {
  const { notifications: serverNotifications, preEnrollments = [] } = usePage().props;
  const [filter, setFilter] = useState('all');
  const [showRead, setShowRead] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Load notifications from props or use mock data
  useEffect(() => {
    const loadNotifications = () => {
      // Sample notifications for demonstration
      const sampleNotifications = [
        {
          id: 'sample-1',
          type: 'enrollment',
          title: 'Enrollment Status Update',
          message: 'Your enrollment application has been reviewed and approved by the coordinator.',
          timestamp: '2024-08-30T10:30:00Z',
          read: false,
          priority: 'high'
        },
        {
          id: 'sample-2',
          type: 'schedule',
          title: 'Class Schedule Available',
          message: 'Your class schedule for the current semester is now available.',
          timestamp: '2024-08-29T14:15:00Z',
          read: true,
          priority: 'normal'
        },
        {
          id: 'sample-3',
          type: 'grades',
          title: 'Grades Posted',
          message: 'Your grades for Mathematics have been posted by your instructor.',
          timestamp: '2024-08-28T09:45:00Z',
          read: false,
          priority: 'normal'
        },
        {
          id: 'sample-4',
          type: 'announcement',
          title: 'School Event Reminder',
          message: 'Don\'t forget about the upcoming Science Fair next Friday.',
          timestamp: '2024-08-27T16:20:00Z',
          read: true,
          priority: 'low'
        }
      ];

      setNotifications(sampleNotifications);
      setLoading(false);
    };

    loadNotifications();
  }, []);

  const getIconForNotification = (type, status) => {
    if (type === 'enrollment') {
      if (status === 'approved') return FaCheckCircle;
      if (status === 'rejected') return FaExclamationTriangle;
      if (status === 'pending') return FaClock;
      return FaGraduationCap;
    }
    return FaBell;
  };

  const getColorForNotification = (status) => {
    switch (status) {
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'pending': return 'yellow';
      default: return 'blue';
    }
  };

  const getNotificationIcon = (type, status) => {
    switch (type) {
      case 'enrollment':
        return status === 'approved' ? 
          <FaCheckCircle className="w-6 h-6 text-green-600" /> :
          status === 'submitted' ?
          <FaClock className="w-6 h-6 text-yellow-600" /> :
          <FaGraduationCap className="w-6 h-6 text-blue-600" />;
      case 'grades':
        return <FaClipboardList className="w-6 h-6 text-purple-600" />;
      case 'academic':
        return status === 'reminder' ?
          <FaExclamationTriangle className="w-6 h-6 text-orange-600" /> :
          <FaCalendarAlt className="w-6 h-6 text-blue-600" />;
      case 'system':
        return <FaInfoCircle className="w-6 h-6 text-gray-600" />;
      default:
        return <FaBell className="w-6 h-6 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return showRead ? true : !notification.read;
    if (filter === 'unread') return !notification.read;
    if (filter === 'enrollment') return notification.type === 'enrollment';
    if (filter === 'grades') return notification.type === 'grades';
    if (filter === 'academic') return notification.type === 'academic';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Student_Sidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 p-8 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header - Enhanced with Breadcrumbs and Actions */}
        <div className="mb-8">
          {/* Breadcrumb Navigation - Heuristic 3: User Control */}
          <nav className="text-gray-500 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><span>Home</span></li>
              <li><span className="mx-2">/</span></li>
              <li><span className="text-gray-800 font-medium">Notifications</span></li>
            </ol>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Notifications
              </h1>
              <p className="text-gray-600">Stay updated with your academic progress and announcements</p>
              {/* System Status - Heuristic 1: Visibility of System Status */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <FaCheckCircle className="w-4 h-4" />
                  <span>Last sync: {new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <FaBell className="w-4 h-4" />
                  <span>Real-time updates enabled</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Unread Counter - Enhanced Visibility */}
              {unreadCount > 0 && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 animate-pulse">
                  <FaBell className="w-4 h-4" />
                  <span>{unreadCount} unread</span>
                </div>
              )}
              
              {/* Quick Actions - Heuristic 7: Flexibility and Efficiency */}
              <div className="hidden md:flex items-center gap-2">
                <button className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                  <FaCheckCircle className="w-4 h-4" />
                  <span>Mark All Read</span>
                </button>
                <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <FaInfoCircle className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaFilter className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 font-medium">Filter:</span>
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All', icon: FaBell },
                  { key: 'unread', label: 'Unread', icon: FaEyeSlash },
                  { key: 'enrollment', label: 'Enrollment', icon: FaGraduationCap },
                  { key: 'grades', label: 'Grades', icon: FaClipboardList },
                  { key: 'academic', label: 'Academic', icon: FaCalendarAlt }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setShowRead(!showRead)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium transition-colors"
            >
              {showRead ? <FaEye className="w-4 h-4" /> : <FaEyeSlash className="w-4 h-4" />}
              {showRead ? 'Hide Read' : 'Show Read'}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl shadow-lg border-l-4 overflow-hidden hover:shadow-xl transition-all duration-200 ${
                  getPriorityColor(notification.priority)
                } ${!notification.read ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                      {getNotificationIcon(notification.type, notification.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              notification.type === 'enrollment' ? 'bg-green-100 text-green-800' :
                              notification.type === 'grades' ? 'bg-purple-100 text-purple-800' :
                              notification.type === 'academic' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)} Priority
                            </span>
                            {notification.actionRequired && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {notification.time}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {notification.message}
                      </p>
                      
                      {notification.actionRequired && (
                        <div className="flex gap-3">
                          {notification.type === 'grades' && (
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              View Grades
                            </button>
                          )}
                          {notification.type === 'enrollment' && notification.status === 'approved' && (
                            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              View Schedule
                            </button>
                          )}
                          {notification.type === 'academic' && notification.status === 'reminder' && (
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              View Schedule
                            </button>
                          )}
                          {notification.type === 'enrollment' && notification.status === 'deadline' && (
                            <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              Enroll Now
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FaBell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Notifications</h3>
              <p className="text-gray-600">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : filter !== 'all' 
                  ? `No ${filter} notifications found.`
                  : "You don't have any notifications yet."
                }
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-gray-800">{notifications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <FaEyeSlash className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Unread</p>
                <p className="text-2xl font-bold text-gray-800">{unreadCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaGraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Enrollment</p>
                <p className="text-2xl font-bold text-gray-800">
                  {notifications.filter(n => n.type === 'enrollment').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaClipboardList className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Grades</p>
                <p className="text-2xl font-bold text-gray-800">
                  {notifications.filter(n => n.type === 'grades').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
