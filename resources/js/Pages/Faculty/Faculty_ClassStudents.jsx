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
  FaUser,
  FaEye,
  FaChartLine,
  FaDownload
} from "react-icons/fa";

export default function FacultyClassStudents({ class: classData, students = [], activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const filteredStudents = students.filter(student =>
    (student?.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lrn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleGoBack = () => {
    router.visit('/faculty/classes');
  };

  const handleViewProfile = (studentId) => {
    router.visit(`/faculty/student/${studentId}/profile`);
  };

  const handleExportStudentList = () => {
    console.log('🟢 Export student list from Class Students page:', { 
      classId: classData.id, 
      className: classData.subject?.name,
      section: classData.section?.section_name,
      studentsCount: filteredStudents.length
    });
    
    // Show loading state
    Swal.fire({
      title: 'Exporting Student List...',
      text: `Preparing Excel file for ${filteredStudents.length} students`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Use direct window navigation - this bypasses any fetch/AJAX issues
    const exportUrl = `/faculty/classes/${classData.id}/export-students`;
    console.log('🟢 Navigating to export URL:', exportUrl);
    console.log('🟢 Class ID:', classData.id);
    console.log('🟢 Full export URL will be:', window.location.origin + exportUrl);
    
    // Try direct window navigation first
    console.log('🟢 Using window.location.href for export');
    window.location.href = exportUrl;
    
    // Close loading dialog after a short delay
    setTimeout(() => {
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Export Started!',
        text: `Student list download should begin shortly`,
        timer: 2000,
        showConfirmButton: false
      });
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back to Classes</span>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportStudentList}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaDownload className="w-4 h-4" />
                Export Student List
              </button>
              
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Card View
                </button>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Class Students
          </h1>
          <p className="text-gray-600">View and manage your class students</p>
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

        {/* Controls and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>
            
            
            <div className="flex items-center justify-center bg-purple-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{filteredStudents.length}</div>
                <div className="text-sm text-gray-600">Students Found</div>
              </div>
            </div>
          </div>
        </div>

        {/* Student List Interface */}
        {filteredStudents.length > 0 ? (
          viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold">Student</th>
                      <th className="px-3 py-4 text-center font-semibold">LRN</th>
                      <th className="px-3 py-4 text-center font-semibold">Email</th>
                      <th className="px-3 py-4 text-center font-semibold">Grade Level</th>
                      <th className="px-4 py-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                        <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">
                                  {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                                </div>
                                <div className="text-sm text-gray-600">{student?.lrn || 'No LRN'}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <span className="font-medium text-gray-700">
                              {student?.lrn || 'N/A'}
                            </span>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <span className="font-medium text-gray-700">
                              {student?.email || 'N/A'}
                            </span>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <span className="font-medium text-gray-700">
                              {student?.grade_level || 'N/A'}
                            </span>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleViewProfile(student.id)}
                              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1 mx-auto"
                            >
                              <FaEye className="w-3 h-3" />
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <div key={student.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                      {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                      </h3>
                      <p className="text-sm text-gray-600">{student?.email || 'No Email'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">LRN:</span>
                      <span className="text-sm text-gray-800">{student?.lrn || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Grade Level:</span>
                      <span className="text-sm text-gray-800">{student?.grade_level || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleViewProfile(student.id)}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaEye className="w-4 h-4" />
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Students Found</h3>
            <p className="text-gray-600">There are no students enrolled in this class yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
