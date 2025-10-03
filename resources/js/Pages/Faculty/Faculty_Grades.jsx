import React, { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import Swal from 'sweetalert2';
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
  FaSave,
  FaEdit,
  FaCheck,
  FaTimes,
  FaEye,
  FaChartLine,
  FaDownload,
  FaLock,
  FaTable,
  FaList
} from "react-icons/fa";

export default function FacultyGrades({ sections = [], auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionStudents, setSectionStudents] = useState([]);
  const [studentGrades, setStudentGrades] = useState({});
  const [editingGrades, setEditingGrades] = useState({});
  const [savingGrades, setSavingGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const filteredStudents = sectionStudents.filter(student =>
    (student?.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lrn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available subjects for selected section
  const availableSubjects = selectedSection ? 
    sections.find(s => s.id == selectedSection)?.subjects || [] : [];

  // Load section students and grades when section and subject are selected
  useEffect(() => {
    if (selectedSection && selectedSubject) {
      setLoading(true);
      router.get(`/faculty/grades/section/${selectedSection}/subject/${selectedSubject}`, {}, {
        preserveState: true,
        onSuccess: (page) => {
          setSectionStudents(page.props.students || []);
          
          // Initialize grades from backend data
          const initialGrades = {};
          (page.props.students || []).forEach(student => {
            const existingGrade = (page.props.grades || []).find(g => g.student_id === student.student_info_id);
            initialGrades[student.id] = {
              first_quarter: existingGrade?.first_quarter || '',
              second_quarter: existingGrade?.second_quarter || '',
              third_quarter: existingGrade?.third_quarter || '',
              fourth_quarter: existingGrade?.fourth_quarter || '',
              semester_grade: existingGrade?.semester_grade || '',
              _original: existingGrade || {}
            };
          });
          setStudentGrades(initialGrades);
          setLoading(false);
        },
        onError: () => {
          setLoading(false);
          Swal.fire('Error', 'Failed to load section data', 'error');
        }
      });
    }
  }, [selectedSection, selectedSubject]);

  // Grade calculation function
  const calculateSemesterGrade = (quarters) => {
    const validGrades = quarters.filter(q => q && parseFloat(q) > 0);
    if (validGrades.length === 0) return '';
    const sum = validGrades.reduce((acc, grade) => acc + parseFloat(grade), 0);
    return (sum / validGrades.length).toFixed(2);
  };

  // Handle grade input changes
  const handleGradeChange = (studentId, quarter, value) => {
    const newGrades = { ...studentGrades };
    if (!newGrades[studentId]) {
      newGrades[studentId] = {
        first_quarter: '', second_quarter: '', third_quarter: '', fourth_quarter: '',
        semester_grade: '', status: 'ongoing', remarks: ''
      };
    }
    
    newGrades[studentId][quarter] = value;
    
    // Auto-calculate semester grade
    const quarters = [
      newGrades[studentId].first_quarter,
      newGrades[studentId].second_quarter,
      newGrades[studentId].third_quarter,
      newGrades[studentId].fourth_quarter
    ];
    newGrades[studentId].semester_grade = calculateSemesterGrade(quarters);
    
    setStudentGrades(newGrades);
  };

  // Handle grade saving
  const handleSaveGrades = async (studentId) => {
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const gradeData = studentGrades[studentId];
      
      // Validate that at least one quarter is filled
      const quarters = [gradeData.first_quarter, gradeData.second_quarter, gradeData.third_quarter, gradeData.fourth_quarter];
      const filledQuarters = quarters.filter(q => q && q > 0);
      
      if (filledQuarters.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Grades Entered',
          text: 'Please enter at least one quarter grade before saving.',
          confirmButtonColor: '#f59e0b'
        });
        setSavingGrades(prev => ({ ...prev, [studentId]: false }));
        return;
      }

      // Find the student's info ID for the grades table
      const student = sectionStudents.find(s => s.id === studentId);
      const studentInfoId = student?.student_info_id;

      // Save grades via API
      router.post(`/faculty/grades/save`, {
        student_id: studentInfoId,
        subject_id: selectedSubject,
        section_id: selectedSection,
        ...gradeData
      }, {
        onSuccess: () => {
          setSavingGrades(prev => ({ ...prev, [studentId]: false }));
          setEditingGrades(prev => ({ ...prev, [studentId]: false }));
          
          Swal.fire({
            icon: 'success',
            title: 'Grades Saved!',
            text: 'Student grades have been saved successfully.',
            confirmButtonColor: '#10b981'
          });
        },
        onError: (errors) => {
          setSavingGrades(prev => ({ ...prev, [studentId]: false }));
          const errorMessage = errors.message || 'Failed to save grades. Please try again.';
          
          Swal.fire({
            icon: 'error',
            title: 'Save Failed',
            text: errorMessage,
            confirmButtonColor: '#ef4444'
          });
        }
      });
      
    } catch (error) {
      console.error('Error saving grades:', error);
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Failed to save grades. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Toggle editing mode
  const toggleEditMode = (studentId) => {
    setEditingGrades(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const getGradeColor = (grade) => {
    if (!grade || grade === '') return 'text-gray-400';
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return 'text-green-600 font-semibold';
    if (numGrade >= 85) return 'text-blue-600 font-semibold';
    if (numGrade >= 80) return 'text-yellow-600 font-semibold';
    if (numGrade >= 75) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const getRemarks = (grade) => {
    if (!grade || grade === '') return 'No Grade';
    const numGrade = parseFloat(grade);
    return numGrade >= 75 ? 'Passed' : 'Failed';
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Grade Input
          </h1>
          <p className="text-gray-600">Manage and input grades by section and subject</p>
        </div>

        {/* Section and Subject Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedSubject(""); // Reset subject when section changes
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              >
                <option value="">Choose a section...</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.section_name} - {section.strand_name} ({section.student_count || 0} students)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedSection}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all disabled:bg-gray-100"
              >
                <option value="">Choose a subject...</option>
                {availableSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                View Mode
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-3 py-3 text-sm font-medium transition-all ${
                    viewMode === 'table' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FaTable className="inline mr-1" /> Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 px-3 py-3 text-sm font-medium transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FaList className="inline mr-1" /> Cards
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Students
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, LRN, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Grades Table/Cards */}
        {selectedSection && selectedSubject && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaGraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {availableSubjects.find(s => s.id == selectedSubject)?.name || 'Subject'} - {sections.find(s => s.id == selectedSection)?.section_name || 'Section'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {filteredStudents.length} students
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredStudents.length}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(studentGrades).filter(g => g.semester_grade && parseFloat(g.semester_grade) >= 75).length}
                    </div>
                    <div className="text-sm text-gray-600">Passing</div>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-600 text-white">
                    <tr>
                      <th className="text-left px-3 py-4 font-semibold">Student</th>
                      <th className="text-center px-3 py-4 font-semibold">1st Quarter</th>
                      <th className="text-center px-3 py-4 font-semibold">2nd Quarter</th>
                      <th className="text-center px-3 py-4 font-semibold">3rd Quarter</th>
                      <th className="text-center px-3 py-4 font-semibold">4th Quarter</th>
                      <th className="text-center px-3 py-4 font-semibold">Final Grade</th>
                      <th className="text-center px-3 py-4 font-semibold">Remarks</th>
                      <th className="text-center px-3 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const grades = studentGrades[student.id] || {};
                      const isEditing = editingGrades[student.id];
                      const isSaving = savingGrades[student.id];
                      
                      return (
                        <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-3 py-4">
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
                          
                          {/* Quarter Grade Inputs */}
                          {['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'].map((quarter) => {
                            const originalGrade = studentGrades[student.id]?._original;
                            const hasExistingGrade = originalGrade && originalGrade[quarter] && parseFloat(originalGrade[quarter]) > 0;
                            
                            return (
                              <td key={quarter} className="px-3 py-4 text-center">
                                {isEditing ? (
                                  hasExistingGrade ? (
                                    // Read-only for existing grades
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={grades[quarter] || ''}
                                        readOnly
                                        className="w-16 px-2 py-1 border rounded text-center bg-green-50 border-green-300 text-green-800"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                      />
                                      <FaLock className="absolute -top-1 -right-1 w-3 h-3 text-green-600" />
                                    </div>
                                  ) : (
                                    // Editable for new grades
                                    <input
                                      type="number"
                                      value={grades[quarter] || ''}
                                      onChange={(e) => handleGradeChange(student.id, quarter, e.target.value)}
                                      className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      placeholder="0"
                                    />
                                  )
                                ) : (
                                  <span className={`font-semibold ${getGradeColor(grades[quarter])}`}>
                                    {grades[quarter] || 'N/A'}
                                    {hasExistingGrade && <FaLock className="inline ml-1 w-3 h-3 text-green-600" />}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-3 py-4 text-center">
                            <span className={`font-bold text-lg ${getGradeColor(grades.semester_grade)}`}>
                              {grades.semester_grade || 'N/A'}
                            </span>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getRemarks(grades.semester_grade) === 'Passed' 
                                ? 'bg-green-100 text-green-800' 
                                : getRemarks(grades.semester_grade) === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getRemarks(grades.semester_grade)}
                            </span>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveGrades(student.id)}
                                    disabled={isSaving}
                                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {isSaving ? (
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <FaCheck className="w-3 h-3" />
                                    )}
                                    Save
                                  </button>
                                  <button
                                    onClick={() => toggleEditMode(student.id)}
                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors text-sm"
                                  >
                                    <FaTimes className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => toggleEditMode(student.id)}
                                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // Card View
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => {
                  const grades = studentGrades[student.id] || {};
                  const isEditing = editingGrades[student.id];
                  const isSaving = savingGrades[student.id];
                  
                  return (
                    <div key={student.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                          {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                          </h3>
                          <p className="text-sm text-gray-600">{student?.lrn || 'No LRN'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'].map((quarter, idx) => {
                          const originalGrade = studentGrades[student.id]?._original;
                          const hasExistingGrade = originalGrade && originalGrade[quarter] && parseFloat(originalGrade[quarter]) > 0;
                          
                          return (
                            <div key={quarter} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Q{idx + 1}:</span>
                              {isEditing ? (
                                hasExistingGrade ? (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={grades[quarter] || ''}
                                      readOnly
                                      className="w-16 px-2 py-1 border rounded text-center bg-green-50 border-green-300 text-green-800 text-sm"
                                    />
                                    <FaLock className="absolute -top-1 -right-1 w-3 h-3 text-green-600" />
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={grades[quarter] || ''}
                                    onChange={(e) => handleGradeChange(student.id, quarter, e.target.value)}
                                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    placeholder="0"
                                  />
                                )
                              ) : (
                                <span className={`font-semibold ${getGradeColor(grades[quarter])}`}>
                                  {grades[quarter] || 'N/A'}
                                  {hasExistingGrade && <FaLock className="inline ml-1 w-3 h-3 text-green-600" />}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Final Grade:</span>
                            <span className={`font-bold ${getGradeColor(grades.semester_grade)}`}>
                              {grades.semester_grade || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">Remarks:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getRemarks(grades.semester_grade) === 'Passed' 
                                ? 'bg-green-100 text-green-800' 
                                : getRemarks(grades.semester_grade) === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getRemarks(grades.semester_grade)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveGrades(student.id)}
                              disabled={isSaving}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {isSaving ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <FaCheck className="w-3 h-3" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => toggleEditMode(student.id)}
                              className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 transition-colors text-sm"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toggleEditMode(student.id)}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors text-sm flex items-center justify-center gap-1"
                          >
                            <FaEdit className="w-3 h-3" />
                            Edit Grades
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filteredStudents.length} students
                </div>
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2">
                  <FaSave />
                  Submit to Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {(!selectedSection || !selectedSubject) && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Select Section & Subject</h3>
            <p className="text-gray-600">Choose a section and subject from the dropdowns above to start inputting grades</p>
            
            {!selectedSection && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Step 1:</strong> Select a section to see available subjects
                </p>
              </div>
            )}
            
            {selectedSection && !selectedSubject && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Step 2:</strong> Select a subject to view students and input grades
                </p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Students...</h3>
            <p className="text-gray-600">Please wait while we fetch the student data</p>
          </div>
        )}
      </div>
    </div>
  );
}
