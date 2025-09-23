import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
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
  FaTable
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch schedule data from API
  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/student/schedule', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setScheduleData(data);
        setEnrollmentStatus(data.enrollment_status || 'pending');
      } else {
        setError(data.message || 'Failed to fetch schedule data');
        setEnrollmentStatus('pending');
      }
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setError('Failed to load schedule data. Please try again.');
      setEnrollmentStatus('pending');
    } finally {
      setLoading(false);
    }
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
          
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <FaCalendarAlt className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Class Schedule</h1>
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
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <FaPrint className="mr-2" />
                  Print
                </button>
                <button 
                  onClick={fetchScheduleData}
                  className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                >
                  <FaSpinner className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {(enrollmentStatus !== 'enrolled' || loading || error || getTotalClasses() === 0) && (
                <div className={`${statusInfo.bgColor} border-2 ${statusInfo.borderColor} rounded-xl p-8 shadow-lg`}>
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">{statusInfo.icon}</div>
                    <div>
                      <h2 className={`text-2xl font-bold ${statusInfo.textColor}`}>{statusInfo.title}</h2>
                      <p className={`text-lg ${statusInfo.textColor} mt-2`}>{statusInfo.message}</p>
                      {error && (
                        <button 
                          onClick={fetchScheduleData}
                          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                        >
                          Try Again
                        </button>
                      )}
                      {statusInfo.action}
                    </div>
                  </div>
                </div>
              )}

              {enrollmentStatus === 'enrolled' && !loading && !error && scheduleData && getTotalClasses() > 0 && (
                <>
                  {/* Semester Header */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {scheduleData.school_year ? `${scheduleData.school_year} First Semester` : '2025-2026 First Semester'}
                    </h2>
                  </div>

                  {/* View Mode Tabs */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="flex border-b border-gray-200">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'list'
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FaList className="inline mr-2" />
                        List
                      </button>
                      <button
                        onClick={() => setViewMode('timetable')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'timetable'
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FaTable className="inline mr-2" />
                        Timetable
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
