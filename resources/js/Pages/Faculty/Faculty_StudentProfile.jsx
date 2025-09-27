import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaUser, 
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaBook,
  FaUserGraduate,
  FaUsers
} from "react-icons/fa";

export default function FacultyStudentProfile({ student, enrollment, studentSection, activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Student Profile
          </h1>
          <p className="text-gray-600">View student information and academic details</p>
        </div>

        {/* Student ID Card Design */}
        <div className="max-w-4xl mx-auto">
          {/* School Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1">OPOL NATIONAL SECONDARY TECHNICAL HIGH SCHOOL (SHS)</h1>
              <p className="text-purple-100 text-sm">Senior High School Department</p>
              <p className="text-purple-100 text-xs mt-1">Student Information System</p>
            </div>
          </div>

          {/* Main ID Card Content */}
          <div className="bg-white shadow-2xl rounded-b-2xl overflow-hidden">
            {/* Student Photo and Basic Info */}
            <div className="p-8">
              <div className="flex items-start gap-8">
                {/* Student Photo */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-white">
                    {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
                  </div>
                  <div className="text-center mt-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Student Photo</div>
                  </div>
                </div>

                {/* Student Information */}
                <div className="flex-1 space-y-6">
                  {/* Name Section */}
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Full Name</div>
                    <div className="text-3xl font-bold text-gray-800 leading-tight">
                      {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                    </div>
                  </div>

                  {/* ID and Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Student ID</div>
                      <div className="text-xl font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg border-l-4 border-purple-500">
                        {student?.student_id || 'NOT ASSIGNED'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Section</div>
                      <div className="text-xl font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg border-l-4 border-indigo-500">
                        {studentSection?.section_name || 'Not Assigned'}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Contact Information</div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 text-gray-700">
                        <FaEnvelope className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{student?.email || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</div>
                  {enrollment && (
                    <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                      enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800 border border-green-300' : 
                      enrollment.status === 'approved' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 
                      'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    }`}>
                      {enrollment.status || 'Unknown'}
                    </span>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">School Year</div>
                  <div className="text-sm font-bold text-gray-700">
                    {enrollment?.schoolYear ? `${enrollment.schoolYear.year_start}-${enrollment.schoolYear.year_end}` : 'Not Available'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FaGraduationCap className="w-4 h-4" />
                  <span>Senior High School Student</span>
                </div>
                <div className="text-purple-200">
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
