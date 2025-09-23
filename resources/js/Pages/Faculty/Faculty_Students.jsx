import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { Head } from '@inertiajs/react';
import Swal from "sweetalert2";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaGraduationCap,
  FaEye,
  FaSearch,
  FaFilter,
  FaUsers,
  FaUserCheck,
  FaSpinner,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaIdCard,
  FaUserGraduate
} from "react-icons/fa";

export default function FacultyStudents({ auth, sections = [], enrolledStudents = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrand, setFilterStrand] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    setStudents(enrolledStudents);
  }, [enrolledStudents]);

  // Group students by section
  const studentsBySection = students.reduce((acc, student) => {
    const sectionKey = student.section ? `${student.section.section_name}` : 'Unassigned';
    if (!acc[sectionKey]) {
      acc[sectionKey] = {
        section: student.section,
        students: []
      };
    }
    acc[sectionKey].students.push(student);
    return acc;
  }, {});

  // Filter sections based on search and filters
  const filteredSections = Object.entries(studentsBySection).filter(([sectionName, data]) => {
    if (filterSection !== 'all' && data.section?.section_name !== filterSection) {
      return false;
    }
    if (filterStrand !== 'all' && data.section?.strand?.name !== filterStrand) {
      return false;
    }
    if (searchTerm) {
      const hasMatchingStudent = data.students.some(student => 
        `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return hasMatchingStudent;
    }
    return true;
  });

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Get unique strands and sections for filters
  const strands = [...new Set(sections.map(section => section.strand?.name).filter(Boolean))];
  const sectionNames = [...new Set(sections.map(section => section.section_name).filter(Boolean))];

  if (loading) {
    return (
      <>
        <Head title="Student Assignment - Faculty Portal" />
        <div className="flex min-h-screen bg-gray-50">
          <FacultySidebar onToggle={handleSidebarToggle} />
          <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
            <div className="flex items-center justify-center h-64">
              <FaSpinner className="animate-spin text-4xl text-purple-600" />
              <span className="ml-3 text-lg text-gray-600">Loading students data...</span>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="Student Assignment - Faculty Portal" />
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={handleSidebarToggle} />
        
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Assignment</h1>
                <p className="text-gray-600">View enrolled students organized by sections and strands</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaUsers className="text-blue-600" />
                    <span className="font-medium text-gray-900">{students.length}</span>
                    <span className="text-gray-600">Total Students</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaGraduationCap className="text-green-600" />
                    <span className="font-medium text-gray-900">{Object.keys(studentsBySection).length}</span>
                    <span className="text-gray-600">Sections</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Sections</option>
                  {sectionNames.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterStrand}
                  onChange={(e) => setFilterStrand(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Strands</option>
                  {strands.map(strand => (
                    <option key={strand} value={strand}>{strand}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Sections */}
          <div className="space-y-6">
            {filteredSections.length > 0 ? (
              filteredSections.map(([sectionName, data]) => (
                <div key={sectionName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div 
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 p-6 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-colors"
                    onClick={() => toggleSection(sectionName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                          <FaUsers className="text-white text-xl" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{sectionName}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            {data.section && (
                              <>
                                <span className="text-sm text-gray-600">
                                  Strand: <span className="font-medium text-purple-600">{data.section.strand?.name}</span>
                                </span>
                                <span className="text-sm text-gray-600">
                                  Students: <span className="font-medium text-green-600">{data.students.length}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                          {data.students.length} Students
                        </span>
                        {expandedSections[sectionName] ? (
                          <FaChevronUp className="text-gray-400" />
                        ) : (
                          <FaChevronDown className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Student List */}
                  {expandedSections[sectionName] && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.students.map(student => (
                          <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <FaUserGraduate className="text-white text-sm" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {student.firstname} {student.lastname}
                                </h4>
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <FaIdCard className="mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{student.student_id || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <FaEnvelope className="mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{student.email || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <FaCalendarAlt className="mr-2 text-gray-400 flex-shrink-0" />
                                    <span>Grade {student.grade_level || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    <FaUserCheck className="mr-1" />
                                    Enrolled
                                  </span>
                                  <button
                                    onClick={() => handleViewStudent(student)}
                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 flex items-center space-x-1 text-sm"
                                  >
                                    <FaEye className="text-xs" />
                                    <span>View</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FaUsers className="mx-auto text-gray-400 text-4xl mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                <p className="text-gray-600">No enrolled students match your current filters.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
