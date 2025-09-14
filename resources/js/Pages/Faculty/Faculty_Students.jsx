import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
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
  FaTimes
} from "react-icons/fa";

export default function FacultyStudents({ enrolledStudents = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrand, setFilterStrand] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [strands, setStrands] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Fetch enrolled students data, strands, grades, and sections
    setLoading(false);
  }, []);

  useEffect(() => {
    setStudents(enrolledStudents);
  }, [enrolledStudents]);

  useEffect(() => {
    if (enrolledStudents && enrolledStudents.length > 0) {
      // Extract unique values for filters from props data
      const uniqueStrands = [...new Set(enrolledStudents.map(s => s.strand?.name).filter(Boolean))];
      const uniqueGrades = [...new Set(enrolledStudents.map(s => s.grade_level).filter(Boolean))];
      const uniqueSections = [...new Set(enrolledStudents.map(s => s.section?.name).filter(Boolean))];
      
      setStrands(uniqueStrands);
      setGrades(uniqueGrades);
      setSections(uniqueSections);
    }
  }, [enrolledStudents]);

  const handleViewStudent = (studentId) => {
    // Find student from existing data instead of making API call
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setShowModal(true);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Student not found.',
      });
    }
  };

  const filteredStudents = students.filter(student => {
    const studentName = `${student.user?.firstname || ''} ${student.user?.lastname || ''}`.trim();
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStrand = filterStrand === "all" || (student.strand?.name === filterStrand);
    const matchesGrade = filterGrade === "all" || (student.personalInfo?.grade_level === filterGrade);
    const matchesSection = filterSection === "all" || (student.section?.name === filterSection);
    
    return matchesSearch && matchesStrand && matchesGrade && matchesSection;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-4xl text-purple-600" />
            <span className="ml-3 text-lg text-gray-600">Loading students data...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Assignment</h1>
          <p className="text-gray-600">Manage and view enrolled students in your strand</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enrolled Students</p>
              <p className="text-3xl font-bold text-purple-600">{students.length}</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-full">
              <FaUsers className="text-purple-600 text-2xl" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
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
            <div>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Grades</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Students ({filteredStudents.length})
            </h2>
          </div>
          
          <div className="p-6">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-500">No students found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredStudents.map(student => (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {student.user?.firstname} {student.user?.lastname}
                          </h3>
                          <p className="text-sm text-gray-600">{student.user?.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {student.personalInfo?.grade_level || 'N/A'}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              {student.strand?.name || 'N/A'}
                            </span>
                            {student.section?.name && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {student.section.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewStudent(student.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center space-x-1"
                      >
                        <FaEye className="text-sm" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Student Profile</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">First Name</label>
                    <p className="text-gray-800 font-medium">{selectedStudent.user?.firstname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Name</label>
                    <p className="text-gray-800 font-medium">{selectedStudent.user?.lastname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-800">{selectedStudent.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Grade Level</label>
                    <p className="text-gray-800">{selectedStudent.personalInfo?.grade_level || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Strand</label>
                    <p className="text-gray-800 font-medium">{selectedStudent.strand?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Section</label>
                    <p className="text-gray-800">{selectedStudent.section?.section_name || 'Not Assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">School Year</label>
                    <p className="text-gray-800">{selectedStudent.schoolYear?.year_start}-{selectedStudent.schoolYear?.year_end || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedStudent.status === 'enrolled' 
                        ? 'bg-green-100 text-green-800'
                        : selectedStudent.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStudent.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strand Preferences (if available) */}
              {selectedStudent.strandPreferences && selectedStudent.strandPreferences.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Strand Preferences</h3>
                  <div className="space-y-2">
                    {selectedStudent.strandPreferences.map((preference, index) => (
                      <div key={preference.id} className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-800">{preference.strand?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
