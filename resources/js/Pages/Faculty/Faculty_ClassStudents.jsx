import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaUsers, 
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaSearch,
  FaUser
} from "react-icons/fa";

export default function FacultyClassStudents({ class: classData, students = [], activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(student =>
    (student?.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.student_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGoBack = () => {
    router.visit('/faculty/classes');
  };

  const handleViewProfile = (studentId) => {
    router.visit(`/faculty/student/${studentId}/profile`);
  };

  const handleInputGrades = (studentId) => {
    router.visit(`/faculty/classes/${classData.id}/student/${studentId}/grades`);
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
              <span>Back to Classes</span>
            </button>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Class Students
          </h1>
          <p className="text-gray-600">View and manage students in your class</p>
        </div>

        {/* Class Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{classData?.subject?.name || 'Unknown Subject'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaClock className="w-4 h-4 text-purple-500" />
              <span>{classData?.day_of_week} {classData?.start_time} - {classData?.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-indigo-500" />
              <span>{classData?.section?.section_name || 'No Section'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4 text-green-500" />
              <span>{classData?.room || 'No Room Assigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaGraduationCap className="w-4 h-4 text-orange-500" />
              <span>{classData?.subject?.strand?.name || 'No Strand'}</span>
            </div>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name, email, or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{filteredStudents.length}</div>
                <div className="text-sm text-gray-600">Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length > 0 ? (
          <div className="space-y-4">
            {filteredStudents.map((student, index) => (
              <div key={student?.id || index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <FaIdCard className="w-3 h-3" />
                          <span>{student?.student_id || 'No ID'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaEnvelope className="w-3 h-3" />
                          <span>{student?.email || 'No Email'}</span>
                        </div>
                        {student?.phone && (
                          <div className="flex items-center gap-1">
                            <FaPhone className="w-3 h-3" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProfile(student.id)}
                      className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <FaUser className="w-3 h-3" />
                      View Profile
                    </button>
                    <button
                      onClick={() => handleInputGrades(student.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <FaGraduationCap className="w-3 h-3" />
                      Input Grades
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Students Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 
                "No students match your search criteria." : 
                "No students are currently enrolled in this class."
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
