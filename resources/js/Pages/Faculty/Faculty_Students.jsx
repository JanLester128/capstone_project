import React, { useState, useEffect } from "react";
import { Head, usePage, router } from "@inertiajs/react";
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
  FaPrint,
  FaSearch,
  FaFilter,
  FaUsers,
  FaUserCheck,
  FaSpinner,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaIdCard,
  FaUserGraduate,
  FaBook,
  FaTable,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaDownload,
  FaFileExport,
  FaArrowUp,
  FaLevelUpAlt,
  FaCheckCircle
} from "react-icons/fa";

export default function Faculty_Students() {
  const { enrolledStudents = [], user, flash } = usePage().props;
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrand, setFilterStrand] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('lastname');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    setStudents(enrolledStudents);
  }, [enrolledStudents]);

  const printModalContent = () => {
    window.print();
  };

  const handleViewStudent = (student) => {
    setSelectedStudent({
      ...student,
      scheduleData: student.schedules || []
    });
    setShowModal(true);
  };

  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.lrn && student.lrn.includes(searchTerm));

      const matchesStrand = filterStrand === "all" || student.strand_name === filterStrand;
      const matchesSection = filterSection === "all" || student.section_name === filterSection;
      const matchesGrade = filterGrade === "all" || student.grade_level === filterGrade;

      return matchesSearch && matchesStrand && matchesSection && matchesGrade;
    });
  };

  const getSortedStudents = (studentsToSort) => {
    return [...studentsToSort].sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="opacity-50" />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const filteredStudents = getFilteredStudents();
  const sortedStudents = getSortedStudents(filteredStudents);

  const getUniqueValues = (field) => {
    return [...new Set(students.map(student => student[field]).filter(Boolean))];
  };

  return (
    <>
      <Head title="Faculty - Students" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
        <FacultySidebar 
          user={user} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        
        <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Enrolled Students</h1>
                  <p className="text-gray-600">View and manage enrolled student records and certificates</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                    <div className="flex items-center space-x-2">
                      <FaUsers className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Total Students:</span>
                      <span className="text-lg font-bold text-blue-600">{students.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or LRN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Strand</label>
                  <select
                    value={filterStrand}
                    onChange={(e) => setFilterStrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Strands</option>
                    {getUniqueValues('strand_name').map(strand => (
                      <option key={strand} value={strand}>{strand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Section</label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Sections</option>
                    {getUniqueValues('section_name').map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Grade</label>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Grades</option>
                    {getUniqueValues('grade_level').map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('lastname')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Student Name</span>
                          {getSortIcon('lastname')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Email</span>
                          {getSortIcon('email')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('strand_name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Strand</span>
                          {getSortIcon('strand_name')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('section_name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Section</span>
                          {getSortIcon('section_name')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('grade_level')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Grade</span>
                          {getSortIcon('grade_level')}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedStudents.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.firstname} {student.lastname}
                              </div>
                              <div className="text-sm text-gray-500">
                                LRN: {student.lrn || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.strand_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {student.section_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">Grade {student.grade_level || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewStudent(student)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <FaEye className="w-4 h-4" />
                            <span>View COR</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedStudents.length === 0 && (
                <div className="text-center py-12">
                  <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                  <p className="text-gray-600">No enrolled students match your current filters.</p>
                </div>
              )}
            </div>
          </div>
        </main>
        {/* Enhanced Student COR Modal */}
        {showModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col cor-printable">
              {/* COR Header */}
              <div className="bg-white border-b flex-shrink-0">
                <div className="text-center py-1 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL - SENIOR HIGH SCHOOL</h3>
                  <p className="text-xs text-gray-600">Opol, Misamis Oriental</p>
                  <div className="mt-1">
                    <p className="text-xs font-semibold">CLASS PROGRAM</p>
                    <p className="text-xs">School Year: [2025 - 2026] • Semester: 1st Semester</p>
                    <p className="text-xs font-medium">GRADE 11 - "{selectedStudent.section_name || 'SECTION'}" ({selectedStudent.strand_name || 'STRAND'} NAME)</p>
                  </div>
                </div>
              </div>

              {/* Main Content - Scrollable */}
              <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Student Information */}
                  <div className="p-1 border-b">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p><strong>Student Name:</strong> {selectedStudent.firstname} {selectedStudent.lastname}</p>
                        <p><strong>Email:</strong> {selectedStudent.email}</p>
                        <p><strong>Grade Level:</strong> {selectedStudent.grade_level || 'Grade 11'}</p>
                      </div>
                      <div>
                        <p><strong>Student Status:</strong> <span className="ml-1 px-1 py-0.5 rounded text-xs bg-green-100 text-green-800">{selectedStudent.student_status || 'New Student'}</span></p>
                        <p><strong>LRN:</strong> {selectedStudent.lrn || 'N/A'}</p>
                        <p><strong>Birthdate:</strong> {selectedStudent.birthdate ? new Date(selectedStudent.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Class Schedule */}
                  <div className="p-1">
                    <h4 className="text-xs font-semibold mb-1 text-gray-800">Class Schedule</h4>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Time</th>
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Monday</th>
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Tuesday</th>
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Wednesday</th>
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Thursday</th>
                              <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Friday</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Time slots */}
                            {[
                              { time: '7:30-8:00am', label: 'Flag Ceremony (Monday Only)', colspan: true },
                              { time: '8:00-10:00am', start: '08:00:00', end: '10:00:00' },
                              { time: '10:00-10:30am', label: 'Break Time (Recess)', colspan: true },
                              { time: '10:30am-12:30pm', start: '10:30:00', end: '12:30:00' },
                              { time: '12:30-1:30pm', label: 'Break Time (Lunch)', colspan: true },
                              { time: '1:30-3:30pm', start: '13:30:00', end: '15:30:00' },
                              { time: '3:30-4:30pm', start: '15:30:00', end: '16:30:00' },
                              { time: '4:30-4:45pm', label: 'Flag Lowering (Friday Only)', colspan: true }
                            ].map((slot, index) => (
                              <tr key={index}>
                                <td className="border border-gray-400 px-1 py-0.5 text-xs font-medium bg-gray-50">
                                  {slot.time}
                                </td>
                                {slot.colspan ? (
                                  <td className="border border-gray-400 px-1 py-0.5 text-xs text-center bg-green-200" colSpan="5">
                                    {slot.label}
                                  </td>
                                ) : (
                                  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                    // Find schedules that match this day and time slot
                                    const schedules = (selectedStudent.scheduleData || []).filter(s =>
                                      s.day_of_week === day &&
                                      s.start_time === slot.start
                                    );

                                    return (
                                      <td key={day} className="border border-gray-400 px-1 py-0.5 text-xs text-center">
                                        {schedules.length > 0 ? (
                                          schedules.map((schedule, idx) => (
                                            <div key={idx} className={idx > 0 ? 'mt-1 pt-1 border-t border-gray-300' : ''}>
                                              <div className="font-medium text-blue-800 text-xs leading-tight">{schedule.subject_name}</div>
                                              <div className="text-gray-600 text-xs leading-tight">({schedule.faculty_firstname} {schedule.faculty_lastname})</div>
                                              {schedule.room && <div className="text-gray-500 text-xs leading-tight">{schedule.room}</div>}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-gray-400 text-xs">-</div>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

              {/* Action Buttons - Fixed Footer */}
              <div className="p-1 border-t bg-gray-50 flex justify-end space-x-2 flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={printModalContent}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <FaPrint className="w-3 h-3" />
                  <span>Print COR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Styles for Faculty COR */}
        <style>{`
          @media print {
            /* Hide everything first */
            body * { visibility: hidden !important; }
            
            /* Show only COR content */
            .cor-printable, .cor-printable * { visibility: visible !important; }
            
            /* Position COR properly */
            .cor-printable { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important; 
              background: white !important;
              margin: 0 !important;
              padding: 20px !important;
            }
            
            /* Clean styling */
            .print\\:hidden { display: none !important; }
            .shadow-xl { box-shadow: none !important; }
            .border { border: 1px solid black !important; }
            table { border-collapse: collapse !important; }
            th, td { border: 1px solid black !important; padding: 8px !important; }
          }
        `}</style>
      </div>
    </>
  );
}
