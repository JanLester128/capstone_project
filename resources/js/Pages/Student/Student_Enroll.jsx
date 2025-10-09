import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import axios from 'axios';
import Student_Sidebar from "../layouts/Student_Sidebar";
import EnrollmentForm from "../layouts/EnrollmentForm";
import {
  FaUserGraduate,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSchool,
  FaArrowRight,
  FaCalendarAlt,
  FaUser,
  FaIdCard,
  FaGraduationCap,
  FaBookOpen,
  FaClipboardCheck,
  FaSpinner,
  FaTachometerAlt,
  FaWifi,
  FaTimes,
  FaSyncAlt,
  FaEye,
  FaEdit,
  FaSignInAlt,
  FaHome,
  FaQuestionCircle,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaDownload,
  FaUpload,
  FaShieldAlt,
  FaLightbulb,
  FaRocket
} from 'react-icons/fa';

export default function StudentEnroll({ auth, user, availableStrands = [], activeSchoolYear = null }) {
  const { enrollmentOpen, flash } = usePage().props;
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // HCI Principle 1: Visibility of system status - Enhanced state management
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [pageLoadTime] = useState(new Date());
  const [enrollmentStatus, setEnrollmentStatus] = useState({ status: 'pending' });
  const [loading, setLoading] = useState(true);

  // Real-time clock for better system status visibility
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

  // Fetch enrollment status on component mount
  useEffect(() => {
    fetchEnrollmentStatus();
  }, []);

  const fetchEnrollmentStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/student/enrollment-status', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const data = response.data;
      setEnrollmentStatus({ status: data.status || 'not_enrolled' });
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
      setEnrollmentStatus({ status: 'not_enrolled' });
    } finally {
      setLoading(false);
    }
  };

  // HCI Principle 1: Visibility of system status - Clear status information
  const getEnrollmentStatusInfo = () => {
    switch (enrollmentStatus?.status) {
      case 'pending':
        return {
          icon: <FaClock className="w-12 h-12 text-yellow-500" />,
          title: "Enrollment Under Review",
          message: "Your enrollment application is currently being reviewed by the academic coordinator. You will be notified once a decision is made.",
          bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50",
          borderColor: "border-yellow-300",
          textColor: "text-yellow-800",
          actionColor: "bg-yellow-100 text-yellow-800",
          status: "In Progress"
        };
      case 'approved':
        return {
          icon: <FaCheckCircle className="w-12 h-12 text-green-500" />,
          title: "Enrollment Approved",
          message: "Congratulations! Your enrollment has been approved. You can now access your class schedule and begin your academic journey.",
          bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
          borderColor: "border-green-300",
          textColor: "text-green-800",
          actionColor: "bg-green-100 text-green-800",
          status: "Completed"
        };
      case 'rejected':
        return {
          icon: <FaTimesCircle className="w-12 h-12 text-red-500" />,
          title: "Enrollment Requires Attention",
          message: "Your enrollment application needs additional information or corrections. Please contact the academic coordinator or resubmit your application.",
          bgColor: "bg-gradient-to-br from-red-50 to-pink-50",
          borderColor: "border-red-300",
          textColor: "text-red-800",
          actionColor: "bg-red-100 text-red-800",
          status: "Action Required"
        };
      case 'enrolled':
        return {
          icon: <FaCheckCircle className="w-12 h-12 text-green-500" />,
          title: "Enrollment Successful",
          message: "You have successfully enrolled. Please note that you will need to visit the coordinator's office for further instructions.",
          bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
          borderColor: "border-green-300",
          textColor: "text-green-800",
          actionColor: "bg-green-100 text-green-800",
          status: "Enrolled"
        };
      case 'not_enrolled':
        return {
          icon: <FaUserGraduate className="w-12 h-12 text-blue-500" />,
          title: "Ready to Begin Enrollment",
          message: "Welcome! You can now start your enrollment process. Please complete all required information and submit your application.",
          bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
          borderColor: "border-blue-300",
          textColor: "text-blue-800",
          actionColor: "bg-blue-100 text-blue-800",
          status: "Ready to Enroll"
        };
      default:
        // Check if enrollment is closed
        if (!enrollmentOpen && activeSchoolYear) {
          return {
            icon: <FaClock className="w-12 h-12 text-red-500" />,
            title: "Enrollment Period Closed",
            message: "The enrollment period for this academic year has been closed by the registrar. Please contact the registrar's office for assistance or wait for the next enrollment period.",
            bgColor: "bg-gradient-to-br from-red-50 to-pink-50",
            borderColor: "border-red-300",
            textColor: "text-red-800",
            actionColor: "bg-red-100 text-red-800",
            status: "Closed"
          };
        }
        
        return {
          icon: <FaUserGraduate className="w-12 h-12 text-blue-500" />,
          title: "Ready to Begin Enrollment",
          message: "Start your academic journey by completing the enrollment process. All required information and documents should be prepared beforehand.",
          bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
          borderColor: "border-blue-300",
          textColor: "text-blue-800",
          actionColor: "bg-blue-100 text-blue-800",
          status: "Not Started"
        };
    }
  };

  const statusInfo = getEnrollmentStatusInfo();

  // Check if enrollment is actually available based on dates
  const isEnrollmentDateActive = () => {
    if (!activeSchoolYear?.enrollment_start || !activeSchoolYear?.enrollment_end) {
      return false;
    }
    
    const now = new Date();
    const startDate = new Date(activeSchoolYear.enrollment_start);
    const endDate = new Date(activeSchoolYear.enrollment_end);
    
    return now >= startDate && now <= endDate;
  };

  // HCI Principle 5: Error prevention - Check prerequisites
  const canEnroll = () => {
    // Check for enrollment period errors in flash messages
    const hasEnrollmentError = flash?.error && (
      flash.error.includes('Enrollment has not started') ||
      flash.error.includes('enrollment period') ||
      flash.error.includes('Enrollment period')
    );
    
    const isDateActive = isEnrollmentDateActive();
    
    return activeSchoolYear && 
           availableStrands.length > 0 && 
           (!enrollmentStatus?.status || enrollmentStatus?.status === 'not_enrolled') && 
           enrollmentOpen && 
           isDateActive &&
           !hasEnrollmentError;
  };

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  return (
    <>
      <Head title="Student Enrollment - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>

          {/* Enhanced Header with System Status - HCI Principle 1 */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <FaRocket className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Student Enrollment</h1>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FaClock className="text-sm" />
                    <span className="text-sm">
                      {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm">
                      {activeSchoolYear ?
                        `${activeSchoolYear.semester} Semester ${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` :
                        'Academic Year Information'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Status Indicators */}
              <div className="flex items-center space-x-3">
                {/* Connection Status */}
                <div className={`flex items-center space-x-2 px-2 py-1 rounded-lg text-xs ${
                  connectionStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {connectionStatus === 'online' ? <FaWifi /> : <FaTimes />}
                  <span className="capitalize">{connectionStatus}</span>
                </div>

                {/* Enrollment Status Badge */}
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border shadow-sm ${statusInfo.actionColor}`}>
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                  <span className="font-medium text-sm">{statusInfo.status}</span>
                </div>

                {/* Help Button */}
                <button
                  onClick={() => document.getElementById('help-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Need Help? (F1)"
                >
                  <FaQuestionCircle />
                </button>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-3 text-xs text-gray-500 text-right">
              Page loaded: {pageLoadTime.toLocaleTimeString()} • Last updated: {currentTime.toLocaleTimeString()}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            
            {/* Grade 12 Progression Notice for Students */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">Grade 12 Progression Requirements:</p>
                  <p className="text-blue-700 mt-1">
                    If you are progressing from Grade 11 to Grade 12, please note that faculty will handle your enrollment process. 
                    You must present your Grade 11 report cards showing passing grades before enrollment can be completed.
                    Please contact the academic coordinator's office with your documents.
                  </p>
                </div>
              </div>
            </div>
            <div className="max-w-4xl mx-auto space-y-6">

              {/* Flash Error Messages */}
              {flash?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Enrollment Error</h3>
                    <p className="text-sm text-red-700 mt-1">{flash.error}</p>
                  </div>
                </div>
              )}

              {/* Flash Messages - HCI Principle 1: Visibility of system status */}
              {flash?.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaCheckCircle className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 font-medium">Success!</p>
                    <p className="text-green-700 text-sm">{flash.success}</p>
                  </div>
                </div>
              )}

              {flash?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{flash.error}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Main Status Card - HCI Principle 8: Aesthetic and minimalist design */}
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
                    <h2 className={`text-3xl font-bold ${statusInfo.textColor} tracking-tight`}>
                      {statusInfo.title}
                    </h2>
                    <p className={`text-lg ${statusInfo.textColor} max-w-2xl mx-auto leading-relaxed`}>
                      {statusInfo.message}
                    </p>
                    
                    {/* Progress indicator for pending status */}
                    {enrollmentStatus?.status === 'pending' && (
                      <div className="mt-4">
                        <div className="w-full bg-yellow-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">Processing your application...</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    {/* No enrollment status or not enrolled - Show Start Enrollment button */}
                    {(!enrollmentStatus?.status || enrollmentStatus?.status === 'not_enrolled') && canEnroll() && (
                      <button
                        onClick={() => setShowEnrollmentForm(true)}
                        className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <FaGraduationCap className="mr-3 text-xl" />
                        Start Enrollment Process
                        <FaArrowRight className="ml-3" />
                      </button>
                    )}

                    {/* Enrollment Closed - Show closed message */}
                    {(!enrollmentStatus?.status || enrollmentStatus?.status === 'not_enrolled') && activeSchoolYear && (!enrollmentOpen || !isEnrollmentDateActive() || (flash?.error && (flash.error.includes('Enrollment has not started') || flash.error.includes('enrollment period') || flash.error.includes('Enrollment period')))) && (
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-300 text-red-800 font-bold rounded-lg shadow-lg">
                          <FaClock className="mr-3 text-2xl text-red-600" />
                          <span className="text-xl">ENROLLMENT CLOSED</span>
                          <FaClock className="ml-3 text-2xl text-red-600" />
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                          <div className="flex items-start space-x-3">
                            <FaInfoCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-yellow-800 font-medium">
                                {!isEnrollmentDateActive() ? 'Enrollment Period Not Active' : 'Enrollment Closed'}
                              </p>
                              <p className="text-sm text-yellow-700 mt-1">
                                {!isEnrollmentDateActive() ? (
                                  <>
                                    {activeSchoolYear?.enrollment_start && activeSchoolYear?.enrollment_end ? (
                                      <>
                                        Enrollment is only available from{' '}
                                        <span className="font-semibold">
                                          {new Date(activeSchoolYear.enrollment_start).toLocaleDateString()}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold">
                                          {new Date(activeSchoolYear.enrollment_end).toLocaleDateString()}
                                        </span>.
                                        Please wait for the enrollment period to begin.
                                      </>
                                    ) : (
                                      'Enrollment period dates are not yet configured. Please contact the registrar\'s office for information about when enrollment will be available.'
                                    )}
                                  </>
                                ) : (
                                  'The enrollment has been closed by the registrar. Please contact the registrar\'s office for assistance.'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pending status - Show disabled button */}
                    {enrollmentStatus?.status === 'pending' && (
                      <button
                        disabled
                        className="flex items-center px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold rounded-lg cursor-not-allowed opacity-75 shadow-lg"
                      >
                        <FaClock className="mr-3 text-xl" />
                        Enrollment Pending Review
                        <FaSpinner className="ml-3 animate-spin" />
                      </button>
                    )}

                    {/* Rejected status - Show resubmit button */}
                    {enrollmentStatus?.status === 'rejected' && (
                      <button
                        onClick={() => setShowEnrollmentForm(true)}
                        className="flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <FaFileAlt className="mr-3 text-xl" />
                        Resubmit Application
                        <FaArrowRight className="ml-3" />
                      </button>
                    )}

                    {/* Enrolled status - Show ENROLLED note (no button) */}
                    {enrollmentStatus?.status === 'enrolled' && (
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 font-bold rounded-lg shadow-lg">
                          <FaCheckCircle className="mr-3 text-2xl text-green-600" />
                          <span className="text-xl">ENROLLED</span>
                          <FaCheckCircle className="ml-3 text-2xl text-green-600" />
                        </div>

                        {/* Grade 12 Note */}
                        {user?.grade_level === '12' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                            <div className="flex items-start space-x-3">
                              <FaInfoCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-blue-800 font-medium">Grade 12 Students</p>
                                <p className="text-sm text-blue-700 mt-1">
                                  For Grade 12 enrollment, please visit the coordinator's office with your Grade 11 report card and academic records.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Approved status - Show schedule button */}
                    {enrollmentStatus?.status === 'approved' && (
                      <button
                        onClick={() => window.location.href = '/student/schedule'}
                        className="flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <FaCalendarAlt className="mr-3 text-xl" />
                        View Class Schedule
                        <FaArrowRight className="ml-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Information Cards - HCI Principle 6: Recognition rather than recall */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-blue-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-md">
                      <FaSchool className="text-blue-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">Academic Year</h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {activeSchoolYear ?
                          `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` :
                          'Not Available'
                        }
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          activeSchoolYear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {activeSchoolYear ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-green-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-md">
                      <FaBookOpen className="text-green-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">Available Strands</h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {availableStrands.length} programs available
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          availableStrands.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {availableStrands.length > 0 ? 'Ready' : 'Limited'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-purple-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-md">
                      <FaShieldAlt className="text-purple-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">Student Profile</h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {user?.firstname} {user?.lastname}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Grade {user?.grade_level || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Requirements Section - HCI Principle 10: Help and documentation */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <FaClipboardCheck className="mr-3 text-indigo-600 text-2xl" />
                    Enrollment Requirements
                  </h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">
                    Required Documents
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {[
                    { text: 'Student Photo (2x2 ID Picture)', icon: FaUser, color: 'blue' },
                    { text: 'Previous Academic Records (if transferring)', icon: FaFileAlt, color: 'green' },
                    { text: 'Birth Certificate (Upload Image)', icon: FaIdCard, color: 'purple' },
                    { text: 'Report Card (Upload Image)', icon: FaGraduationCap, color: 'orange' }
                  ].map((requirement, index) => {
                    const IconComponent = requirement.icon;
                    return (
                      <div key={index} className={`flex items-center space-x-4 p-4 bg-gradient-to-r from-${requirement.color}-50 to-${requirement.color}-100 rounded-xl border border-${requirement.color}-200 hover:shadow-md transition-all duration-200`}>
                        <div className={`w-10 h-10 bg-${requirement.color}-200 rounded-lg flex items-center justify-center`}>
                          <IconComponent className={`text-${requirement.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800">{requirement.text}</span>
                          <div className="flex items-center mt-1">
                            <FaCheckCircle className="text-green-500 text-xs mr-1" />
                            <span className="text-xs text-green-600">Ready to upload</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FaLightbulb className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 font-bold mb-2">💡 Pro Tips for Faster Processing</p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Ensure all documents are clear and readable</li>
                        <li>• Use high-quality scans or photos</li>
                        <li>• Double-check all information before submission</li>
                        <li>• Keep digital copies for your records</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Help Section - HCI Principle 9: Help users recognize, diagnose, and recover from errors */}
              <div id="help-section" className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl border border-indigo-200 p-8 shadow-lg">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Need Assistance? 🤝</h3>
                  <p className="text-gray-600">Our support team is here to help you through the enrollment process</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaUser className="text-blue-600 text-2xl" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Academic Coordinator</h4>
                      <p className="text-sm text-gray-600 mb-4">For enrollment assistance and academic guidance</p>
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex items-center justify-center">
                          <FaPhone className="mr-2" />
                          <span>Office Hours: 8AM-5PM</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <FaMapMarkerAlt className="mr-2" />
                          <span>Main Building, Room 101</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaIdCard className="text-green-600 text-2xl" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Registrar Office</h4>
                      <p className="text-sm text-gray-600 mb-4">For document verification and official records</p>
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex items-center justify-center">
                          <FaEnvelope className="mr-2" />
                          <span>registrar@onsts.edu</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <FaMapMarkerAlt className="mr-2" />
                          <span>Admin Building, Ground Floor</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaQuestionCircle className="text-purple-600 text-2xl" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Technical Support</h4>
                      <p className="text-sm text-gray-600 mb-4">For system issues and technical assistance</p>
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex items-center justify-center">
                          <FaPhone className="mr-2" />
                          <span>24/7 Online Support</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <FaEnvelope className="mr-2" />
                          <span>support@onsts.edu</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 pt-6 border-t border-indigo-200">
                  <div className="flex flex-wrap justify-center gap-4">
                    <button className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors duration-200">
                      <FaDownload className="mr-2" />
                      <span className="text-sm">Download Guide</span>
                    </button>
                    <button className="flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors duration-200">
                      <FaQuestionCircle className="mr-2" />
                      <span className="text-sm">FAQ</span>
                    </button>
                    <button className="flex items-center px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg transition-colors duration-200">
                      <FaPhone className="mr-2" />
                      <span className="text-sm">Contact Us</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Enhanced Enrollment Form Modal with Transparent Blurry Background */}
      {showEnrollmentForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Transparent Blurry Background Overlay */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md transition-all duration-300"
            onClick={() => setShowEnrollmentForm(false)}
            style={{
              backdropFilter: 'blur(8px) saturate(180%)',
              WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              background: 'rgba(0, 0, 0, 0.25)'
            }}
          />
          
          {/* Modal Content Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl">
              {/* Loading Overlay */}
              {isFormLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4 mx-auto" />
                    <p className="text-gray-600 font-medium">Processing your enrollment...</p>
                  </div>
                </div>
              )}
              
              {/* Enhanced Modal Animation */}
              <div className="transform transition-all duration-300 scale-100 opacity-100">
                <EnrollmentForm
                  isOpen={showEnrollmentForm}
                  user={user}
                  availableStrands={availableStrands}
                  activeSchoolYear={activeSchoolYear}
                  onClose={() => {
                    setIsFormLoading(false);
                    setShowEnrollmentForm(false);
                    // Refresh enrollment status after form submission
                    fetchEnrollmentStatus();
                  }}
                  onSubmit={() => setIsFormLoading(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
