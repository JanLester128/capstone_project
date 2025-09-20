import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
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
  FaClock,
  FaSearch,
  FaSort,
  FaTrash,
  FaArchive,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaUserGraduate,
  FaChartLine
} from "react-icons/fa";

export default function Student_Notifications() {
  const { notifications: serverNotifications, preEnrollments = [] } = usePage().props;
  const [filter, setFilter] = useState('all');
  const [showRead, setShowRead] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Enhanced mock notifications with more realistic data
  useEffect(() => {
    const loadNotifications = () => {
      setLoading(true);
      
      const sampleNotifications = [
        {
          id: 'notif-1',
          type: 'enrollment',
          status: 'approved',
          title: 'Enrollment Application Approved',
          message: 'Congratulations! Your enrollment application for the 1st Semester AY 2024-2025 has been approved by the academic coordinator. You can now access your class schedule and begin your academic journey.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          read: false,
          priority: 'high',
          actionRequired: true,
          category: 'Academic',
          sender: 'Academic Coordinator'
        },
        {
          id: 'notif-2',
          type: 'grades',
          status: 'posted',
          title: 'New Grades Available',
          message: 'Your grades for Mathematics (1st Quarter) have been posted by Ms. Johnson. Your current grade is 92 - Excellent work!',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          read: false,
          priority: 'normal',
          actionRequired: true,
          category: 'Academic',
          sender: 'Ms. Johnson'
        },
        {
          id: 'notif-3',
          type: 'schedule',
          status: 'updated',
          title: 'Class Schedule Update',
          message: 'There has been a room change for your English class. The new room is 205 instead of 102. Please make note of this change.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          read: true,
          priority: 'medium',
          actionRequired: false,
          category: 'Academic',
          sender: 'Registrar Office'
        },
        {
          id: 'notif-4',
          type: 'announcement',
          status: 'reminder',
          title: 'Science Fair Participation',
          message: 'Reminder: The annual Science Fair is happening next Friday, September 15th. All students are encouraged to participate. Registration deadline is tomorrow.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          read: true,
          priority: 'low',
          actionRequired: false,
          category: 'Events',
          sender: 'Science Department'
        },
        {
          id: 'notif-5',
          type: 'system',
          status: 'maintenance',
          title: 'System Maintenance Notice',
          message: 'The student portal will undergo scheduled maintenance this Sunday from 2:00 AM to 6:00 AM. Some features may be temporarily unavailable.',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          read: false,
          priority: 'low',
          actionRequired: false,
          category: 'System',
          sender: 'IT Department'
        }
      ];

      setTimeout(() => {
        setNotifications(sampleNotifications);
        setLoading(false);
      }, 500);
    };

    loadNotifications();
  }, []);

  // HCI Principle 6: Recognition rather than recall - Clear visual indicators
  const getNotificationIcon = (type, status) => {
    switch (type) {
      case 'enrollment':
        return status === 'approved' ? 
          <FaCheckCircle className="w-6 h-6 text-green-600" /> :
          status === 'pending' ?
          <FaClock className="w-6 h-6 text-yellow-600" /> :
          <FaUserGraduate className="w-6 h-6 text-blue-600" />;
      case 'grades':
        return <FaClipboardList className="w-6 h-6 text-purple-600" />;
      case 'schedule':
        return <FaCalendarAlt className="w-6 h-6 text-blue-600" />;
      case 'announcement':
        return <FaBell className="w-6 h-6 text-orange-600" />;
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

  // HCI Principle 7: Flexibility and efficiency of use - Advanced filtering
  const getFilteredAndSortedNotifications = () => {
    let filtered = notifications.filter(notification => {
      // Filter by type
      if (filter !== 'all' && notification.type !== filter) return false;
      
      // Filter by read status
      if (!showRead && notification.read) return false;
      
      // Filter by search term
      if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    });

    // Sort notifications
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredNotifications = getFilteredAndSortedNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  // HCI Principle 3: User control and freedom - Bulk actions
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleMarkAsRead = (notificationIds) => {
    setNotifications(prev => prev.map(n => 
      notificationIds.includes(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifications(new Set());
  };

  const toggleExpanded = (notificationId) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
  };

  // HCI Principle 2: Match between system and real world - Natural time formatting
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <>
      <Head title="Notifications - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          
          {/* Enhanced Header */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <FaBell className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-gray-600">Stay updated with your academic progress and announcements</p>
                </div>
              </div>
              
              {/* Status and Actions */}
              <div className="flex items-center space-x-4">
                {unreadCount > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-800 font-medium text-sm">{unreadCount} unread</span>
                  </div>
                )}
                
                <button 
                  onClick={() => handleMarkAsRead(notifications.filter(n => !n.read).map(n => n.id))}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  disabled={unreadCount === 0}
                >
                  <FaCheckCircle className="mr-2" />
                  Mark All Read
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Controls Panel - HCI Principle 8: Aesthetic and minimalist design */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    {/* Search */}
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      />
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center space-x-2">
                      <FaFilter className="text-gray-500" />
                      <div className="flex space-x-1">
                        {[
                          { key: 'all', label: 'All', icon: FaBell },
                          { key: 'enrollment', label: 'Enrollment', icon: FaUserGraduate },
                          { key: 'grades', label: 'Grades', icon: FaClipboardList },
                          { key: 'schedule', label: 'Schedule', icon: FaCalendarAlt }
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                              filter === key
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sort and View Options */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <FaSort className="text-gray-500" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priority">By Priority</option>
                        <option value="type">By Type</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setShowRead(!showRead)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm font-medium transition-colors duration-200"
                    >
                      {showRead ? <FaEye /> : <FaEyeSlash />}
                      <span>{showRead ? 'Hide Read' : 'Show Read'}</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedNotifications.size > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleMarkAsRead(Array.from(selectedNotifications))}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
                      >
                        <FaCheckCircle />
                        <span>Mark Read</span>
                      </button>
                      <button
                        onClick={() => setSelectedNotifications(new Set())}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors duration-200"
                      >
                        <FaTimes />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <FaSpinner className="animate-spin text-blue-600 text-xl" />
                    <span className="text-gray-600">Loading notifications...</span>
                  </div>
                </div>
              )}

              {/* Notifications List */}
              {!loading && (
                <div className="space-y-4">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => {
                      const isExpanded = expandedNotifications.has(notification.id);
                      const isSelected = selectedNotifications.has(notification.id);
                      
                      return (
                        <div
                          key={notification.id}
                          className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden hover:shadow-md transition-all duration-200 ${
                            getPriorityColor(notification.priority)
                          } ${!notification.read ? 'ring-2 ring-blue-200' : ''} ${
                            isSelected ? 'ring-2 ring-purple-200' : ''
                          }`}
                        >
                          <div className="p-6">
                            <div className="flex items-start space-x-4">
                              {/* Selection Checkbox */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedNotifications);
                                  if (e.target.checked) {
                                    newSelected.add(notification.id);
                                  } else {
                                    newSelected.delete(notification.id);
                                  }
                                  setSelectedNotifications(newSelected);
                                }}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />

                              {/* Icon */}
                              <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                                {getNotificationIcon(notification.type, notification.status)}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                      {notification.title}
                                    </h3>
                                    <div className="flex items-center space-x-3 mb-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        notification.type === 'enrollment' ? 'bg-green-100 text-green-800' :
                                        notification.type === 'grades' ? 'bg-purple-100 text-purple-800' :
                                        notification.type === 'schedule' ? 'bg-blue-100 text-blue-800' :
                                        notification.type === 'announcement' ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {notification.category}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {notification.priority} priority
                                      </span>
                                      {notification.actionRequired && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                          Action Required
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 ml-4">
                                    {!notification.read && (
                                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    )}
                                    <span className="text-sm text-gray-500 whitespace-nowrap">
                                      {formatTimeAgo(notification.timestamp)}
                                    </span>
                                  </div>
                                </div>
                                
                                <p className={`text-gray-600 leading-relaxed mb-4 ${
                                  isExpanded ? '' : 'line-clamp-2'
                                }`}>
                                  {notification.message}
                                </p>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xs text-gray-500">From: {notification.sender}</span>
                                    
                                    {/* Action Buttons */}
                                    {notification.actionRequired && (
                                      <div className="flex space-x-2">
                                        {notification.type === 'grades' && (
                                          <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200">
                                            View Grades
                                          </button>
                                        )}
                                        {notification.type === 'enrollment' && notification.status === 'approved' && (
                                          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200">
                                            View Schedule
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Expand/Collapse Button */}
                                  <button
                                    onClick={() => toggleExpanded(notification.id)}
                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                                  >
                                    <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaBell className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Notifications Found</h3>
                      <p className="text-gray-600">
                        {searchTerm ? `No notifications match "${searchTerm}"` :
                         filter !== 'all' ? `No ${filter} notifications found` :
                         !showRead ? "No unread notifications" :
                         "You don't have any notifications yet"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaBell className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Unread</p>
                      <p className="text-3xl font-bold text-gray-900">{unreadCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FaEyeSlash className="text-red-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">High Priority</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {notifications.filter(n => n.priority === 'high').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FaExclamationTriangle className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {notifications.filter(n => 
                          new Date(n.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        ).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-green-600 text-xl" />
                    </div>
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
