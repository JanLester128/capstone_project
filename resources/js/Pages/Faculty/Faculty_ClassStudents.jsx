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
  FaDownload
} from "react-icons/fa";

export default function FacultyClassStudents({ class: classData, students = [], grades = [], activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingGrades, setEditingGrades] = useState({});
  const [studentGrades, setStudentGrades] = useState({});
  const [savingGrades, setSavingGrades] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const filteredStudents = students.filter(student =>
    (student?.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.student_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize student grades from props
  useEffect(() => {
    console.log('🔍 Initializing grades:', { students, grades });
    const initialGrades = {};
    students.forEach(student => {
      const existingGrade = Array.isArray(grades) ? grades.find(g => g && g.student_id === student.id) : null;
      console.log(`🔍 Student ${student.id} existing grade:`, existingGrade);
      initialGrades[student.id] = {
        first_quarter: existingGrade?.first_quarter || '',
        second_quarter: existingGrade?.second_quarter || '',
        third_quarter: existingGrade?.third_quarter || '',
        fourth_quarter: existingGrade?.fourth_quarter || '',
        semester_grade: existingGrade?.semester_grade || '',
        // Store original grades for locking logic
        _original: existingGrade || {}
      };
    });
    console.log('🔍 Initial grades set:', initialGrades);
    setStudentGrades(initialGrades);
  }, [students, grades]);
  const handleGoBack = () => {
    router.visit('/faculty/classes');
  };

  const handleViewProfile = (studentId) => {
    router.visit(`/faculty/student/${studentId}/profile`);
  };

  const calculateSemesterGrade = (quarters) => {
    const validQuarters = quarters.filter(q => q && q > 0);
    if (validQuarters.length === 0) return '';
    return (validQuarters.reduce((sum, q) => sum + parseFloat(q), 0) / validQuarters.length).toFixed(2);
  };

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
        return;
      }

      console.log('🔥 Grade data:', gradeData);
      
      // Use Inertia router instead of fetch
      router.post(`/faculty/classes/${classData.id}/student/${studentId}/grades`, gradeData, {
        onSuccess: (page) => {
          setIsSaving(false);
          setIsEditing(false);
          
          // Check if grades were submitted for approval
          const currentGrades = studentGrades[studentId] || {};
          const allQuartersFilled = (currentGrades.first_quarter && parseFloat(currentGrades.first_quarter) > 0) && 
                                   (currentGrades.second_quarter && parseFloat(currentGrades.second_quarter) > 0) && 
                                   (currentGrades.third_quarter && parseFloat(currentGrades.third_quarter) > 0) && 
                                   (currentGrades.fourth_quarter && parseFloat(currentGrades.fourth_quarter) > 0);
          
          Swal.fire({
            title: 'Success!',
            text: allQuartersFilled 
              ? 'Grades saved and submitted for registrar approval!' 
              : 'Grades saved successfully',
            icon: 'success',
            timer: allQuartersFilled ? 3000 : 2000,
            showConfirmButton: false
          });
        },
        onError: (errors) => {
          console.error('🔥 Save failed:', errors);
          const errorMessage = errors.message || 'Failed to save grades. Please try again.';
          
          Swal.fire({
            icon: 'warning',
            title: 'Cannot Edit Grades',
            html: `
              <div class="text-left">
                <p class="mb-3">${errorMessage}</p>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p class="text-sm text-yellow-800">
                    <strong>📋 Grade Submission Process:</strong><br>
                    1. Faculty submits grades<br>
                    2. Registrar reviews and approves<br>
                    3. Students can view approved grades
                  </p>
                </div>
              </div>
            `,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'Understood'
          });
        },
        onFinish: () => {
          setSavingGrades(prev => ({ ...prev, [studentId]: false }));
        }
      });
      
    } catch (error) {
      console.error('Error saving grades:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Failed to save grades. Please try again.',
        confirmButtonColor: '#ef4444'
      });
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
    }
  };

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
            Class Grades & Students
          </h1>
          <p className="text-gray-600">Input grades directly and manage your class students</p>
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
            
            
            <div className="flex items-center justify-center gap-4 bg-purple-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{filteredStudents.length}</div>
                <div className="text-sm text-gray-600">Students</div>
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

        {/* Grade Input Interface */}
        {filteredStudents.length > 0 ? (
          viewMode === 'table' ? (
            /* Table View with Direct Grade Input */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold">Student</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[100px]">1st Quarter</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[100px]">2nd Quarter</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[100px]">3rd Quarter</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[100px]">4th Quarter</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[120px]">Semester Grade</th>
                      <th className="px-3 py-4 text-center font-semibold min-w-[100px]">Remarks</th>
                      <th className="px-4 py-4 text-center font-semibold min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const grades = studentGrades[student.id] || {};
                      const isEditing = editingGrades[student.id];
                      const isSaving = savingGrades[student.id];
                      
                      return (
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
                                <div className="text-sm text-gray-600">{student?.email || 'No Email'}</div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Quarter Grade Inputs */}
                          {['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'].map((quarter) => {
                            // Check if this quarter has a saved grade from database (not current input)
                            const originalGrade = studentGrades[student.id]?._original;
                            const hasExistingGrade = originalGrade && originalGrade[quarter] && parseFloat(originalGrade[quarter]) > 0;
                            console.log(`🔍 Quarter ${quarter} for student ${student.id}:`, { originalGrade, hasExistingGrade });
                            
                            return (
                              <td key={quarter} className="px-3 py-4 text-center">
                                {isEditing ? (
                                  hasExistingGrade ? (
                                    // Read-only for existing grades to prevent tampering
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={studentGrades[student.id]?.[quarter] || ''}
                                        readOnly
                                        className="w-full px-2 py-1 text-center border border-green-300 rounded bg-green-50 text-green-800 font-bold cursor-not-allowed"
                                        title="Grade already submitted - cannot be modified"
                                      />
                                      <div className="absolute top-0 right-0 -mt-1 -mr-1">
                                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          🔒
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    // Editable for new grades
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={studentGrades[student.id]?.[quarter] || ''}
                                      onChange={(e) => handleGradeChange(student.id, quarter, e.target.value)}
                                      className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                      placeholder="0-100"
                                    />
                                  )
                                ) : (
                                  <span className={`font-medium ${getGradeColor(studentGrades[student.id]?.[quarter])}`}>
                                    {studentGrades[student.id]?.[quarter] || '-'}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          
                          {/* Semester Grade */}
                          <td className="px-3 py-4 text-center">
                            <span className={`font-bold text-lg ${getGradeColor(studentGrades[student.id]?.semester_grade)}`}>
                              {studentGrades[student.id]?.semester_grade || '-'}
                            </span>
                          </td>
                          
                          {/* Remarks */}
                          <td className="px-3 py-4">
                            <div className="flex flex-col gap-2">
                              {isEditing ? (
                                <textarea
                                  value={studentGrades[student.id]?.remarks || ''}
                                  onChange={(e) => handleGradeChange(student.id, 'remarks', e.target.value)}
                                  placeholder="Enter remarks..."
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                                  rows="2"
                                />
                              ) : (
                                <div className="text-sm text-gray-700 min-h-[2rem]">
                                  {studentGrades[student.id]?.remarks || 'No remarks'}
                                </div>
                              )}
                              
                              {/* Grade Status */}
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold text-center ${
                                  getRemarks(studentGrades[student.id]?.semester_grade) === 'Passed' ? 'bg-green-100 text-green-800' :
                                  getRemarks(studentGrades[student.id]?.semester_grade) === 'Failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {getRemarks(studentGrades[student.id]?.semester_grade)}
                                </span>
                                
                                {/* Approval Status */}
                                {studentGrades[student.id]?._original?.approval_status && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-center ${
                                    studentGrades[student.id]._original.approval_status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                    studentGrades[student.id]._original.approval_status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                    studentGrades[student.id]._original.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {studentGrades[student.id]._original.approval_status === 'approved' ? '✓ Approved' :
                                     studentGrades[student.id]._original.approval_status === 'pending_approval' ? '⏳ Pending' :
                                     studentGrades[student.id]._original.approval_status === 'rejected' ? '✗ Rejected' :
                                     'Unknown'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
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
                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <FaTimes className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {(() => {
                                    // Check current student grades for button states
                                    const currentGrades = studentGrades[student.id] || {};
                                    const hasAnyGrade = (currentGrades.first_quarter && parseFloat(currentGrades.first_quarter) > 0) || 
                                                       (currentGrades.second_quarter && parseFloat(currentGrades.second_quarter) > 0) || 
                                                       (currentGrades.third_quarter && parseFloat(currentGrades.third_quarter) > 0) || 
                                                       (currentGrades.fourth_quarter && parseFloat(currentGrades.fourth_quarter) > 0);
                                    const allQuartersFilled = (currentGrades.first_quarter && parseFloat(currentGrades.first_quarter) > 0) && 
                                                             (currentGrades.second_quarter && parseFloat(currentGrades.second_quarter) > 0) && 
                                                             (currentGrades.third_quarter && parseFloat(currentGrades.third_quarter) > 0) && 
                                                             (currentGrades.fourth_quarter && parseFloat(currentGrades.fourth_quarter) > 0);
                                    
                                    if (allQuartersFilled) {
                                      const approvalStatus = currentGrades._original?.approval_status;
                                      
                                      if (approvalStatus === 'approved') {
                                        return (
                                          <button
                                            disabled
                                            className="bg-blue-500 text-white px-3 py-1 rounded cursor-not-allowed transition-colors text-sm flex items-center gap-1"
                                            title="Grade approved by registrar"
                                          >
                                            <FaCheck className="w-3 h-3" />
                                            Approved
                                          </button>
                                        );
                                      } else if (approvalStatus === 'pending_approval') {
                                        return (
                                          <button
                                            disabled
                                            className="bg-yellow-500 text-white px-3 py-1 rounded cursor-not-allowed transition-colors text-sm flex items-center gap-1"
                                            title="Waiting for registrar approval"
                                          >
                                            <FaClock className="w-3 h-3" />
                                            Pending
                                          </button>
                                        );
                                      } else if (approvalStatus === 'rejected') {
                                        return (
                                          <button
                                            onClick={() => toggleEditMode(student.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors text-sm flex items-center gap-1"
                                            title="Grade rejected - click to edit"
                                          >
                                            <FaTimes className="w-3 h-3" />
                                            Rejected
                                          </button>
                                        );
                                      } else {
                                        return (
                                          <button
                                            disabled
                                            className="bg-green-500 text-white px-3 py-1 rounded cursor-not-allowed transition-colors text-sm flex items-center gap-1"
                                            title="All quarters complete - submitted for approval"
                                          >
                                            <FaCheck className="w-3 h-3" />
                                            Submitted
                                          </button>
                                        );
                                      }
                                    } else if (hasAnyGrade) {
                                      return (
                                        <button
                                          onClick={() => toggleEditMode(student.id)}
                                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                          title="Add more quarters"
                                        >
                                          <FaEdit className="w-3 h-3" />
                                          Add More
                                        </button>
                                      );
                                    } else {
                                      return (
                                        <button
                                          onClick={() => toggleEditMode(student.id)}
                                          className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                                        >
                                          <FaEdit className="w-3 h-3" />
                                          Input Grades
                                        </button>
                                      );
                                    }
                                  })()}
                                  <button
                                    onClick={() => handleViewProfile(student.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <FaEye className="w-3 h-3" />
                                    View
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View with Grade Input */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredStudents.map((student) => {
                const grades = studentGrades[student.id] || {};
                const isEditing = editingGrades[student.id];
                const isSaving = savingGrades[student.id];
                
                return (
                  <div key={student.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                    {/* Student Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
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
                      
                      <div className="flex items-center gap-2">
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
                              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                            >
                              <FaTimes className="w-3 h-3" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {(() => {
                              // Check current student grades for button states
                              const currentGrades = studentGrades[student.id] || {};
                              const hasAnyGrade = (currentGrades.first_quarter && parseFloat(currentGrades.first_quarter) > 0) || 
                                                 (currentGrades.second_quarter && parseFloat(currentGrades.second_quarter) > 0) || 
                                                 (currentGrades.third_quarter && parseFloat(currentGrades.third_quarter) > 0) || 
                                                 (currentGrades.fourth_quarter && parseFloat(currentGrades.fourth_quarter) > 0);
                              const allQuartersFilled = (currentGrades.first_quarter && parseFloat(currentGrades.first_quarter) > 0) && 
                                                       (currentGrades.second_quarter && parseFloat(currentGrades.second_quarter) > 0) && 
                                                       (currentGrades.third_quarter && parseFloat(currentGrades.third_quarter) > 0) && 
                                                       (currentGrades.fourth_quarter && parseFloat(currentGrades.fourth_quarter) > 0);
                              
                              if (allQuartersFilled) {
                                return (
                                  <button
                                    disabled
                                    className="bg-green-500 text-white px-3 py-1 rounded cursor-not-allowed transition-colors text-sm flex items-center gap-1"
                                    title="All quarters complete - finalized"
                                  >
                                    <FaCheck className="w-3 h-3" />
                                    Finalized
                                  </button>
                                );
                              } else if (hasAnyGrade) {
                                return (
                                  <button
                                    onClick={() => toggleEditMode(student.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                    title="Add more quarters"
                                  >
                                    <FaEdit className="w-3 h-3" />
                                    Add More Quarters
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => toggleEditMode(student.id)}
                                    className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <FaEdit className="w-3 h-3" />
                                    Edit Grades
                                  </button>
                                );
                              }
                            })()}
                            <button
                              onClick={() => handleViewProfile(student.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                            >
                              <FaEye className="w-3 h-3" />
                              Profile
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Grades Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {[
                        { key: 'first_quarter', label: '1st Quarter' },
                        { key: 'second_quarter', label: '2nd Quarter' },
                        { key: 'third_quarter', label: '3rd Quarter' },
                        { key: 'fourth_quarter', label: '4th Quarter' }
                      ].map(({ key, label }) => {
                        // Check original database grades, not current input
                        const gradesArray = Array.isArray(grades) ? grades : [];
                        const existingGrade = gradesArray.find(g => g && g.student_id === student.id);
                        const hasExistingGrade = existingGrade && existingGrade[key] && parseFloat(existingGrade[key]) > 0;
                        
                        return (
                          <div key={key} className="bg-gray-50 rounded-lg p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            {isEditing ? (
                              hasExistingGrade ? (
                                // Read-only for existing grades to prevent tampering
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={grades[key]}
                                    readOnly
                                    className="w-full px-3 py-2 border border-green-300 rounded bg-green-50 text-green-800 font-bold cursor-not-allowed"
                                    title="Grade already submitted - cannot be modified"
                                  />
                                  <div className="absolute top-1 right-1">
                                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      🔒
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                // Editable for new grades
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={grades[key] || ''}
                                  onChange={(e) => handleGradeChange(student.id, key, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                  placeholder="0-100"
                                />
                              )
                            ) : (
                              <div className={`text-lg font-semibold ${getGradeColor(grades[key])}`}>
                                {grades[key] || '-'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Semester Grade Summary */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Semester Grade</div>
                          <div className={`text-2xl font-bold ${getGradeColor(grades.semester_grade)}`}>
                            {grades.semester_grade || '-'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">Remarks</div>
                          <div className={`text-xl font-bold px-3 py-1 rounded-full ${
                            getRemarks(grades.semester_grade) === 'Passed' ? 'bg-green-100 text-green-800' :
                            getRemarks(grades.semester_grade) === 'Failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getRemarks(grades.semester_grade)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
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
        
        {/* Grade Input Instructions */}
        {filteredStudents.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <FaChartLine className="w-5 h-5" />
              Philippine SHS Grading System Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Progressive Grade Entry:</h4>
                <ul className="space-y-1 text-blue-600">
                  <li>• <span className="text-purple-600 font-semibold">New Student:</span> Click "Edit" to enter first grades</li>
                  <li>• <span className="text-blue-600 font-semibold">Partial Grades:</span> Click "Add More" to add additional quarters</li>
                  <li>• <span className="text-green-600 font-semibold">Complete:</span> All 4 quarters filled - automatically finalized</li>
                  <li>• Semester grade auto-calculates from entered quarters</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Grading Scale:</h4>
                <ul className="space-y-1 text-blue-600">
                  <li>• <span className="font-semibold text-green-600">90-100: A (Excellent)</span></li>
                  <li>• <span className="font-semibold text-blue-600">85-89: B+ (Very Good)</span></li>
                  <li>• <span className="font-semibold text-yellow-600">80-84: B (Good)</span></li>
                  <li>• <span className="font-semibold text-orange-600">75-79: C+ (Satisfactory)</span></li>
                  <li>• <span className="font-semibold text-red-600">Below 75: Needs Improvement</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
