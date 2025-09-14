import React, { useState } from "react";
import { usePage } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import EnrollmentForm from "../layouts/EnrollmentForm";
import { FaUserGraduate, FaFileAlt, FaCheckCircle, FaTimesCircle, FaClock, FaInfoCircle, FaExclamationTriangle, FaSchool } from 'react-icons/fa';

export default function StudentEnroll({ auth, user, availableStrands = [], activeSchoolYear = null }) {
  const { enrollmentStatus, flash } = usePage().props;
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const getEnrollmentStatusInfo = () => {
    switch (enrollmentStatus?.status) {
      case 'pending':
        return {
          icon: <FaClock className="w-8 h-8 text-yellow-600" />,
          title: "Enrollment Pending",
          message: "Your enrollment application is currently under review by the coordinator.",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800"
        };
      case 'approved':
        return {
          icon: <FaCheckCircle className="w-8 h-8 text-green-600" />,
          title: "Enrollment Approved",
          message: "Congratulations! Your enrollment has been approved. You can now access your class schedule.",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800"
        };
      case 'rejected':
        return {
          icon: <FaTimesCircle className="w-8 h-8 text-red-600" />,
          title: "Enrollment Rejected",
          message: "Your enrollment application was not approved. Please contact the coordinator for more information.",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800"
        };
      default:
        return {
          icon: <FaUserGraduate className="w-8 h-8 text-purple-600" />,
          title: "Ready to Enroll",
          message: "Complete your enrollment application to begin your academic journey with us.",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          textColor: "text-purple-800"
        };
    }
  };

  const statusInfo = getEnrollmentStatusInfo();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar */}
      <Student_Sidebar auth={auth} notifications={[]} onToggle={setIsCollapsed} />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header Section - Enhanced with Breadcrumbs */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Breadcrumb Navigation - Heuristic 3: User Control */}
            <nav className="text-blue-200 text-sm mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li><span>Home</span></li>
                <li><span className="mx-2">/</span></li>
                <li><span className="text-white font-medium">Enrollment</span></li>
              </ol>
            </nav>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <FaUserGraduate className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Student Enrollment</h1>
                  <p className="text-blue-100 text-lg">Begin your academic journey with us</p>
                  {/* System Status - Heuristic 1: Visibility of System Status */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-blue-200 text-sm">
                      <FaClock className="w-4 h-4" />
                      <span>Enrollment Period: Open</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-200 text-sm">
                      <FaCheckCircle className="w-4 h-4" />
                      <span>System Online</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Help Button - Heuristic 10: Help and Documentation */}
              <div className="hidden md:flex">
                <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white hover:bg-white/20 transition-colors">
                  <FaInfoCircle className="w-4 h-4" />
                  <span>Need Help?</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Enrollment Status or Welcome Section */}
        {enrollmentStatus ? (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                {getEnrollmentStatusInfo().icon}
                <h2 className="text-2xl font-semibold text-gray-800">
                  {getEnrollmentStatusInfo().title}
                </h2>
              </div>
              
              <div className={`${getEnrollmentStatusInfo().bgColor} ${getEnrollmentStatusInfo().borderColor} border rounded-lg p-6 max-w-2xl mx-auto`}>
                <p className={`${getEnrollmentStatusInfo().textColor} font-medium text-lg`}>
                  {getEnrollmentStatusInfo().message}
                </p>
              </div>

              {enrollmentStatus.status === 'pending' && (
                <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 text-blue-700 mb-3">
                    <FaInfoCircle className="w-5 h-5" />
                    <span className="font-semibold text-lg">What happens next?</span>
                  </div>
                  <ul className="text-blue-600 space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Your application is being reviewed by the academic coordinator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>You will receive an email notification once a decision is made</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>The review process typically takes 3-5 business days</span>
                    </li>
                  </ul>
                </div>
              )}

              {enrollmentStatus.status === 'rejected' && (
                <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 text-red-700 mb-3">
                    <FaInfoCircle className="w-5 h-5" />
                    <span className="font-semibold text-lg">Next Steps</span>
                  </div>
                  <p className="text-red-600 text-left">
                    Please contact the registrar's office or submit a new application with the required corrections.
                  </p>
                </div>
              )}

              {enrollmentStatus.status === 'approved' && (
                <div className="flex items-center justify-center gap-3 text-green-600 text-xl">
                  <FaCheckCircle className="w-6 h-6" />
                  <span className="font-semibold">Enrollment Approved - Welcome!</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Hero Section */}
            <div className="text-center mb-12">
              {!activeSchoolYear ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <FaExclamationTriangle className="w-8 h-8 text-yellow-600" />
                    <h2 className="text-2xl font-bold text-yellow-800">Enrollment Not Available</h2>
                  </div>
                  <p className="text-yellow-700 text-lg leading-relaxed">
                    REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. 
                    Please check back later or contact the registrar's office for more information.
                  </p>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-4 bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                      <FaUserGraduate className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-3xl font-bold text-gray-800 mb-1">Ready to Enroll?</h2>
                      <p className="text-gray-600">Complete your application in just a few steps</p>
                    </div>
                  </div>
                  
                  <div className="max-w-3xl mx-auto mb-8">
                    <p className="text-lg text-gray-700 leading-relaxed">
                      Welcome to our enrollment system! Choose your preferred academic strand and submit your application. 
                      Our coordinators will review your submission and guide you through the next steps.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowEnrollmentForm(true)}
                    className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-2xl transition-all duration-300 flex items-center gap-4 mx-auto text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <FaUserGraduate className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                    Enroll Now
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
                    <FaClock className="w-4 h-4" />
                    <span className="text-sm">Takes only 5-10 minutes</span>
                  </div>
                </>
              )}
            </div>

            {/* Information Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Required Documents */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaFileAlt className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Required Documents</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    PSA Birth Certificate
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Report Card (Form 138)
                  </li>
                </ul>
              </div>

              {/* Academic Strands */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaSchool className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Academic Strands</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    STEM (Science & Technology)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    ABM (Business & Management)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    HUMSS (Humanities)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    GAS (General Academic)
                  </li>
                </ul>
              </div>

              {/* Why Choose Us */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaCheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Why Choose Us?</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    Experienced Faculty
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    Quality Education
                  </li>
                </ul>
              </div>
            </div>

          </>
        )}

        <EnrollmentForm 
          isOpen={showEnrollmentForm} 
          onClose={() => setShowEnrollmentForm(false)} 
          user={user || auth?.user}
          availableStrands={availableStrands}
          activeSchoolYear={activeSchoolYear}
        />
        </div>
      </div>
    </div>
  );
}
