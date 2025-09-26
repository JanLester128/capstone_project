import React, { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { FaUsers, FaGraduationCap, FaCheckCircle, FaEye, FaFilter, FaSearch, FaDownload, FaFileExcel } from "react-icons/fa";
import Sidebar from "../layouts/Sidebar";

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Student Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-gray-900 font-semibold">{student.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{student.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Student ID</label>
                <p className="text-gray-900 font-mono">{student.student_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Grade Level</label>
                <p className="text-gray-900">Grade {student.grade_level}</p>
              </div>
            </div>
          </div>

          {/* Enrollment Information */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Enrollment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Strand</label>
                <p className="text-gray-900 font-semibold">{student.strand || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Section</label>
                <p className="text-gray-900">{student.section || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Enrollment Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  student.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' :
                  student.enrollment_status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  student.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {student.enrollment_status ? student.enrollment_status.charAt(0).toUpperCase() + student.enrollment_status.slice(1) : 'Not enrolled'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">School Year</label>
                <p className="text-gray-900">{student.school_year || '2024-2025'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {student.contact_info && (
            <div className="bg-green-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                  <p className="text-gray-900">{student.contact_info.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{student.contact_info.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {student.documents && student.documents.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Documents</h4>
              <div className="space-y-2">
                {student.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-gray-900">{doc.name}</span>
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RegistrarStudents = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { approvedStudents = [], enrolledStudents = [], strands = [], sections = [], flash } = usePage().props;
  const [activeTab, setActiveTab] = useState('approved');
  const [searchTerm, setSearchTerm] = useState("");
  const [strandFilter, setStrandFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const currentStudents = activeTab === 'approved' ? approvedStudents : enrolledStudents;

  const filteredStudents = currentStudents.filter((student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStrand = strandFilter === "" || student.strand === strandFilter;
    const matchesGrade = gradeFilter === "" || student.grade_level.toString() === gradeFilter;
    
    return matchesSearch && matchesStrand && matchesGrade;
  });

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const exportToExcel = () => {
    // This would implement Excel export functionality
    alert('Excel export functionality would be implemented here');
  };

  const totalApproved = approvedStudents.length;
  const totalEnrolled = enrolledStudents.length;
  const totalStrands = strands.length;
  const totalSections = sections.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} px-8 py-6 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          {flash?.success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              {flash.success}
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Student Management
              </h1>
              <p className="text-gray-600 mt-2">View and manage approved and enrolled students</p>
            </div>
            <button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105"
            >
              <FaFileExcel /> Export to Excel
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved Students</p>
                  <p className="text-3xl font-bold text-blue-600">{totalApproved}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaCheckCircle className="text-blue-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Enrolled Students</p>
                  <p className="text-3xl font-bold text-green-600">{totalEnrolled}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FaGraduationCap className="text-green-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Strands</p>
                  <p className="text-3xl font-bold text-purple-600">{totalStrands}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <FaUsers className="text-purple-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Sections</p>
                  <p className="text-3xl font-bold text-orange-600">{totalSections}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FaUsers className="text-orange-600 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white bg-opacity-80 rounded-xl p-1 mb-8 shadow-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <FaCheckCircle />
              Approved Students ({totalApproved})
            </button>
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'enrolled'
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <FaGraduationCap />
              Enrolled Students ({totalEnrolled})
            </button>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white bg-opacity-80 rounded-xl shadow-lg p-4 border border-gray-200 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
              <select
                value={strandFilter}
                onChange={(e) => setStrandFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="">All Strands</option>
                {strands.map((strand) => (
                  <option key={strand.id} value={strand.name}>{strand.name}</option>
                ))}
              </select>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="">All Grades</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Student Info</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Grade & Strand</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Section</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <FaUsers className="text-6xl text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg font-semibold">No students found</p>
                          <p className="text-gray-400">Try adjusting your search filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <p className="text-xs text-gray-500 font-mono">{student.student_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">Grade {student.grade_level}</p>
                            <p className="text-sm text-gray-600">{student.strand || 'Not assigned'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            student.section ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {student.section || 'Not assigned'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            activeTab === 'enrolled' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {activeTab === 'enrolled' ? 'Enrolled' : 'Approved'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openStudentModal(student)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <FaEye /> View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      <StudentDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
};

export default RegistrarStudents;
