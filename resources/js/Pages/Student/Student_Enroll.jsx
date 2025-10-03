import React, { useState } from "react";
import { Head, usePage } from "@inertiajs/react";
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
  FaSpinner
} from 'react-icons/fa';

export default function StudentEnroll({ auth, user, availableStrands = [], activeSchoolYear = null }) {
  const { enrollmentStatus, enrollmentOpen, flash } = usePage().props;
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

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
    if (!activeSchoolYear?.enrollment_start_date || !activeSchoolYear?.enrollment_end_date) {
      return false;
    }
    
    const now = new Date();
    const startDate = new Date(activeSchoolYear.enrollment_start_date);
    const endDate = new Date(activeSchoolYear.enrollment_end_date);
    
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
           !enrollmentStatus?.status && 
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

          {/* Enhanced Header */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <FaUserGraduate className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Student Enrollment</h1>
                  <p className="text-gray-600">
                    {activeSchoolYear ?
                      `${activeSchoolYear.semester} Semester ${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` :
                      'Academic Year Information'
                    }
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${statusInfo.actionColor}`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                <span className="font-medium text-sm">{statusInfo.status}</span>
              </div>
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

              {/* Main Status Card */}
              <div className={`${statusInfo.bgColor} border-2 ${statusInfo.borderColor} rounded-xl p-8 shadow-lg`}>
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    {statusInfo.icon}
                  </div>

                  <div className="space-y-3">
                    <h2 className={`text-2xl font-bold ${statusInfo.textColor}`}>
                      {statusInfo.title}
                    </h2>
                    <p className={`text-lg ${statusInfo.textColor} max-w-2xl mx-auto leading-relaxed`}>
                      {statusInfo.message}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    {/* No enrollment status - Show Start Enrollment button */}
                    {!enrollmentStatus?.status && canEnroll() && (
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
                    {!enrollmentStatus?.status && activeSchoolYear && (!enrollmentOpen || !isEnrollmentDateActive() || (flash?.error && (flash.error.includes('Enrollment has not started') || flash.error.includes('enrollment period') || flash.error.includes('Enrollment period')))) && (
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
                                    {activeSchoolYear?.enrollment_start_date && activeSchoolYear?.enrollment_end_date ? (
                                      <>
                                        Enrollment is only available from{' '}
                                        <span className="font-semibold">
                                          {new Date(activeSchoolYear.enrollment_start_date).toLocaleDateString()}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold">
                                          {new Date(activeSchoolYear.enrollment_end_date).toLocaleDateString()}
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

              {/* Information Cards - HCI Principle 6: Recognition rather than recall */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaSchool className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Academic Year</h3>
                      <p className="text-sm text-gray-600">
                        {activeSchoolYear ?
                          `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` :
                          'Not Available'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FaBookOpen className="text-green-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Available Strands</h3>
                      <p className="text-sm text-gray-600">
                        {availableStrands.length} programs available
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FaUser className="text-purple-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Student ID</h3>
                      <p className="text-sm text-gray-600">
                        Your unique student identifier
                      </p>
                    </div>
                  </div>
                </div>

            {/* Grade 12 Progression Requirements - HCI Principle 10: Help and documentation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaClipboardCheck className="mr-2 text-indigo-600" />
                  Enrollment Requirements
                </h3>
                  {[
                    'Student Photo (2x2 ID Picture)',
                    'Previous Academic Records (if transferring)',
                    'Birth Certificate (Upload Image)',
                    'Report Card (Upload Image)'
                  ].map((requirement, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <FaCheckCircle className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{requirement}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <FaInfoCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Important Note</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Please ensure all documents are ready before starting the enrollment process.
                        Incomplete applications may cause delays in processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information - HCI Principle 9: Help users recognize, diagnose, and recover from errors */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUser className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Academic Coordinator</p>
                      <p className="text-sm text-gray-600">For enrollment assistance</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FaIdCard className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Registrar Office</p>
                      <p className="text-sm text-gray-600">For document verification</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Enrollment Form Modal */}
      {showEnrollmentForm && (
        <EnrollmentForm
          isOpen={showEnrollmentForm}
          user={user}
          availableStrands={availableStrands}
          activeSchoolYear={activeSchoolYear}
          onClose={() => setShowEnrollmentForm(false)}
        />
      )}
    </>
  );
}
