import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
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
  FaSpinner
} from "react-icons/fa";

export default function Student_Schedule() {
  const { auth } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // State for dynamic schedule data
  const [scheduleData, setScheduleData] = useState({});
  const [studentInfo, setStudentInfo] = useState(null);
  const [schoolYear, setSchoolYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState('pending');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Fetch schedule data, enrollment status, and notifications
    setLoading(false);
  }, []);

  // TODO: Replace with actual schedule data from API
  const weeklySchedule = [];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getScheduleForDay = (day) => {
    const daySchedule = weeklySchedule.find(d => d.day === day);
    return daySchedule ? daySchedule.classes : [];
  };

  const getStatusMessage = () => {
    switch (enrollmentStatus) {
      case 'pending':
        return {
          icon: <FaClock className="w-8 h-8 text-yellow-600" />,
          title: "Schedule Not Available",
          message: "Your enrollment is still pending approval. Once your enrollment is approved by the coordinator, your class schedule will be available here.",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800"
        };
      case 'rejected':
        return {
          icon: <FaTimesCircle className="w-8 h-8 text-red-600" />,
          title: "Enrollment Required",
          message: "Your enrollment application was not approved. Please submit a new enrollment application to access your class schedule.",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800"
        };
      case 'enrolled':
        return {
          icon: <FaCheckCircle className="w-8 h-8 text-green-600" />,
          title: "Welcome to Your Schedule",
          message: "Your enrollment has been approved! Below is your official class schedule for this semester.",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800"
        };
      default:
        return {
          icon: <FaExclamationTriangle className="w-8 h-8 text-blue-600" />,
          title: "Enrollment Required",
          message: "Please complete your enrollment application first to access your class schedule.",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800"
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Student_Sidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 p-8 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header - Enhanced with Breadcrumbs and Status */}
        <div className="mb-8">
          {/* Breadcrumb Navigation - Heuristic 3: User Control */}
          <nav className="text-gray-500 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><span>Home</span></li>
              <li><span className="mx-2">/</span></li>
              <li><span className="text-gray-800 font-medium">Class Schedule</span></li>
            </ol>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Class Schedule
              </h1>
              <p className="text-gray-600">Your weekly class schedule and timetable</p>
              {/* System Status - Heuristic 1: Visibility of System Status */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <FaCheckCircle className="w-4 h-4" />
                  <span>Schedule synchronized</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Academic Year 2024-2025</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Indicator - Enhanced */}
              {unreadCount > 0 && (
                <div className="flex items-center gap-3 bg-blue-100 border border-blue-200 rounded-lg px-4 py-2 animate-pulse">
                  <FaInfoCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {/* Quick Actions - Heuristic 7: Flexibility and Efficiency */}
              <div className="hidden md:flex items-center gap-2">
                <button className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Export Schedule</span>
                </button>
                <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <FaInfoCircle className="w-4 h-4" />
                  <span>Help</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`mb-8 ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-2xl shadow-lg p-8`}>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${statusInfo.textColor} mb-2`}>
                {statusInfo.title}
              </h2>
              <p className={`${statusInfo.textColor} text-lg leading-relaxed`}>
                {statusInfo.message}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-lg text-gray-600">Loading your schedule...</span>
          </div>
        )}

        {/* COR Information - Show if enrollment is approved and schedule data exists */}
        {!loading && enrollmentStatus === 'enrolled' && weeklySchedule.length > 0 && (
          <>
            {/* COR Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Certificate of Registration (COR)</h2>
                <p className="text-gray-600">Academic Year {schoolYear} • {studentInfo?.semester || '1st Semester'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm border-2 border-black p-4">
                <div className="flex">
                  <span className="font-semibold min-w-[120px]">Registration No.:</span>
                  <span className="border-b border-black flex-1 ml-2">REG{String(auth?.user?.student?.id || auth?.user?.id || '000001').padStart(6, '0')}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold min-w-[80px]">Semester:</span>
                  <span className="border-b border-black flex-1 ml-2">{studentInfo?.semester || '1st Semester'}</span>
                </div>
                
                <div className="flex">
                  <span className="font-semibold min-w-[120px]">Date Enrolled:</span>
                  <span className="border-b border-black flex-1 ml-2">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold min-w-[80px]">School Year:</span>
                  <span className="border-b border-black flex-1 ml-2">{schoolYear}</span>
                </div>
                
                <div className="flex">
                  <span className="font-semibold min-w-[120px]">Student Name:</span>
                  <span className="border-b border-black flex-1 ml-2">{studentInfo?.name || `${auth.user.firstname} ${auth.user.lastname}`}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold min-w-[80px]">LRN:</span>
                  <span className="border-b border-black flex-1 ml-2">{studentInfo?.lrn || 'N/A'}</span>
                </div>
                
                <div className="flex">
                  <span className="font-semibold min-w-[120px]">Strand:</span>
                  <span className="border-b border-black flex-1 ml-2">{studentInfo?.strand || 'Not Assigned'}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold min-w-[80px]">Grade Level:</span>
                  <span className="border-b border-black flex-1 ml-2">{studentInfo?.grade_level || 'Grade 11'}</span>
                </div>
              </div>
            </div>

            {/* Schedule Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-800">{weeklySchedule.reduce((total, day) => total + day.classes.length, 0)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FaBookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Subjects</p>
                    <p className="text-2xl font-bold text-gray-800">{Object.keys(scheduleData).length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FaClock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Registration Status</p>
                    <p className="text-lg font-bold text-green-600">ENROLLED</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FaCalendarAlt className="w-6 h-6" />
                  Weekly Schedule
                </h2>
                <p className="text-blue-100 mt-2">Academic Year 2024-2025 • 1st Semester</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  {daysOfWeek.map((day, dayIndex) => (
                    <div key={dayIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-lg font-bold text-gray-800">{day}</h3>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {getScheduleForDay(day).map((classItem, classIndex) => (
                            <div key={classIndex} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">{classItem.subject}</h4>
                                <div className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                                  Active
                                </div>
                              </div>
                              
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <FaClock className="w-3 h-3" />
                                  <span>{classItem.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FaMapMarkerAlt className="w-3 h-3" />
                                  <span>{classItem.room}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FaBookOpen className="w-3 h-3" />
                                  <span>{classItem.teacher}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <FaInfoCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Important Notes</h3>
                  <div className="text-gray-600 space-y-2">
                    <p>• Classes start promptly at the scheduled time. Please arrive 5 minutes early.</p>
                    <p>• Bring all required materials and textbooks for each subject.</p>
                    <p>• Notify your teacher in advance if you cannot attend a class.</p>
                    <p>• Check the school bulletin board for any schedule changes or announcements.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
