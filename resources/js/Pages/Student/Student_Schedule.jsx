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
  FaStop
} from "react-icons/fa";

export default function Student_Schedule() {
  const { auth } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState('enrolled');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const weeklySchedule = [
    {
      day: 'Monday',
      classes: [
        { id: 1, subject: 'Mathematics', time: '8:00 AM - 9:00 AM', room: 'Room 101', teacher: 'Ms. Johnson', type: 'Core', color: 'blue' },
        { id: 2, subject: 'Science', time: '9:15 AM - 10:15 AM', room: 'Lab 201', teacher: 'Mr. Smith', type: 'Core', color: 'green' },
        { id: 3, subject: 'English', time: '10:30 AM - 11:30 AM', room: 'Room 102', teacher: 'Mrs. Davis', type: 'Core', color: 'purple' }
      ]
    },
    {
      day: 'Tuesday',
      classes: [
        { id: 4, subject: 'Filipino', time: '8:00 AM - 9:00 AM', room: 'Room 103', teacher: 'Ms. Cruz', type: 'Core', color: 'orange' },
        { id: 5, subject: 'Social Studies', time: '9:15 AM - 10:15 AM', room: 'Room 104', teacher: 'Mr. Garcia', type: 'Core', color: 'red' }
      ]
    },
    {
      day: 'Wednesday',
      classes: [
        { id: 6, subject: 'Mathematics', time: '8:00 AM - 9:00 AM', room: 'Room 101', teacher: 'Ms. Johnson', type: 'Core', color: 'blue' },
        { id: 7, subject: 'Physical Education', time: '2:00 PM - 3:00 PM', room: 'Gymnasium', teacher: 'Coach Martinez', type: 'Elective', color: 'teal' }
      ]
    }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getScheduleForDay = (day) => {
    const daySchedule = weeklySchedule.find(d => d.day === day);
    return daySchedule ? daySchedule.classes : [];
  };

  const getStatusMessage = () => {
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

  const getSubjectColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 border-blue-300 text-blue-800',
      green: 'bg-green-100 border-green-300 text-green-800',
      purple: 'bg-purple-100 border-purple-300 text-purple-800',
      orange: 'bg-orange-100 border-orange-300 text-orange-800',
      red: 'bg-red-100 border-red-300 text-red-800',
      teal: 'bg-teal-100 border-teal-300 text-teal-800'
    };
    return colors[color] || 'bg-gray-100 border-gray-300 text-gray-800';
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
                <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <FaDownload className="mr-2" />
                  Export
                </button>
                <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <FaPrint className="mr-2" />
                  Print
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {enrollmentStatus !== 'enrolled' && (
                <div className={`${statusInfo.bgColor} border-2 ${statusInfo.borderColor} rounded-xl p-8 shadow-lg`}>
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">{statusInfo.icon}</div>
                    <div>
                      <h2 className={`text-2xl font-bold ${statusInfo.textColor}`}>{statusInfo.title}</h2>
                      <p className={`text-lg ${statusInfo.textColor} mt-2`}>{statusInfo.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {enrollmentStatus === 'enrolled' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
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
                        <span>{weeklySchedule.reduce((total, day) => total + day.classes.length, 0)} Classes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaGraduationCap className="text-green-500" />
                        <span>6 Subjects</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {enrollmentStatus === 'enrolled' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <FaCalendarWeek className="mr-3" />
                      Weekly Schedule
                    </h2>
                    <p className="text-blue-100 mt-2">Academic Year 2024-2025 • 1st Semester</p>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      {daysOfWeek.map((day, dayIndex) => {
                        const dayClasses = getScheduleForDay(day);
                        const filteredClasses = dayClasses.filter(cls => 
                          cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cls.teacher.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        
                        return (
                          <div key={dayIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                              <h3 className="text-lg font-bold text-gray-800">{day}</h3>
                              <span className="text-sm text-gray-600">
                                {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}
                              </span>
                            </div>
                            <div className="p-4">
                              {filteredClasses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {filteredClasses.map((classItem, classIndex) => (
                                    <div key={classIndex} className={`p-4 rounded-lg border-2 hover:shadow-md transition-all duration-200 ${getSubjectColor(classItem.color)}`}>
                                      <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-bold text-lg">{classItem.subject}</h4>
                                        <span className="px-2 py-1 bg-white bg-opacity-50 text-xs rounded-full font-medium">
                                          {classItem.type}
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center">
                                          <FaClock className="mr-2 w-4 h-4" />
                                          <span className="font-medium">{classItem.time}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <FaMapMarkerAlt className="mr-2 w-4 h-4" />
                                          <span>{classItem.room}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <FaUser className="mr-2 w-4 h-4" />
                                          <span>{classItem.teacher}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <FaCalendarAlt className="mx-auto text-3xl mb-2" />
                                  <p>No classes scheduled</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
