import React, { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import Swal from 'sweetalert2';
import { AuthManager } from '../../auth';
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
  FaList,
  FaBook,
  FaSpinner,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaWifi,
  FaSignal,
  FaLightbulb,
  FaQuestionCircle,
  FaUndo,
  FaRedo,
  FaHistory
} from "react-icons/fa";

export default function FacultyGrades({ sections = [], currentSubject = null, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionStudents, setSectionStudents] = useState([]);
  const [studentGrades, setStudentGrades] = useState({});
  const [editingGrades, setEditingGrades] = useState({});
  const [savingGrades, setSavingGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [currentView, setCurrentView] = useState('sections'); // 'sections', 'subjects', 'students'
  
  // HCI Principle 1: Visibility of system status
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [lastSaved, setLastSaved] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [operationHistory, setOperationHistory] = useState([]);
  
  // Real-time clock and connection monitoring
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // HCI Principle 7: Keyboard shortcuts for efficiency
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save all grades
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const editingStudentIds = Object.keys(editingGrades).filter(id => editingGrades[id]);
        if (editingStudentIds.length > 0) {
          editingStudentIds.forEach(studentId => {
            if (!savingGrades[studentId] && !Object.keys(validationErrors).some(key => key.startsWith(studentId))) {
              handleSaveGrades(studentId);
            }
          });
        }
      }
      
      // Escape to cancel editing
      if (e.key === 'Escape') {
        const editingStudentIds = Object.keys(editingGrades).filter(id => editingGrades[id]);
        if (editingStudentIds.length > 0) {
          editingStudentIds.forEach(studentId => {
            setEditingGrades(prev => ({ ...prev, [studentId]: false }));
          });
        }
      }
      
      // Ctrl/Cmd + H for help
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        document.querySelector('[title="Help & Instructions"]')?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingGrades, savingGrades, validationErrors]);

  const filteredStudents = sectionStudents.filter(student =>
    (student?.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student?.lrn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle section selection
  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    setCurrentView('subjects');
    setSectionStudents([]);
    setStudentGrades({});
  };

  // Handle subject selection - Fixed missing function
  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setCurrentView('students');
    loadStudentsAndGrades(selectedSection.id, subject.id);
  };

  // Fetch existing grades when section and subject are selected
  useEffect(() => {
    if (selectedSection && selectedSubject && sectionStudents.length > 0) {
      console.log('🔄 Triggering fetchExistingGrades...');
      fetchExistingGrades();
    } else {
      console.log('⏸️ Not fetching grades yet:', {
        hasSection: !!selectedSection,
        hasSubject: !!selectedSubject,
        studentCount: sectionStudents.length
      });
    }
  }, [selectedSection, selectedSubject, sectionStudents]);

  // Load students and grades for selected section and subject
  const loadStudentsAndGrades = (sectionId, subjectId) => {
    setLoading(true);
    
    // Use Inertia router for proper authentication
    router.get(`/faculty/grades/section/${sectionId}/subject/${subjectId}`, {}, {
      preserveState: true,
      only: ['students', 'grades'], // Only fetch these props
      onSuccess: (page) => {
        const students = page.props.students || [];
        const grades = page.props.grades || [];
        
        setSectionStudents(students);
        
        // Initialize grades from backend data - FIXED student ID matching
        const initialGrades = {};
        students.forEach(student => {
          const existingGrade = grades.find(g => g.student_id === student.id); // Use student.id not student_info_id
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
        
        // Also fetch grades using the new API endpoint as backup
        console.log('📊 Loaded initial grades:', initialGrades);
        console.log('📊 Raw grades from backend:', grades);
        
        // Always try to fetch grades, even if initial load didn't find any
        setTimeout(() => fetchExistingGrades(sectionId, subjectId), 500); // Pass the IDs directly
      },
      onError: (errors) => {
        console.error('Failed to load students:', errors);
        Swal.fire('Error', 'Failed to load students', 'error');
        setLoading(false);
      }
    });
  };

  const handleBack = () => {
    if (currentView === 'students') {
      setCurrentView('subjects');
      setSelectedSubject(null);
      setSectionStudents([]);
      setStudentGrades({});
    } else if (currentView === 'subjects') {
      setCurrentView('sections');
      setSelectedSection(null);
      setSelectedSubject(null);
    }
  };

  // Fetch existing grades from database
  const fetchExistingGrades = async (sectionIdParam = null, subjectIdParam = null) => {
    try {
      const sectionId = sectionIdParam || selectedSection?.id || selectedSection;
      const subjectId = subjectIdParam || selectedSubject?.id || selectedSubject;
      
      console.log('🔍 Fetching grades for:', { sectionId, subjectId, sectionIdParam, subjectIdParam });
      
      // Get authentication token
      const token = AuthManager.getToken();
      
      const response = await fetch(`/faculty/grades/fetch?section_id=${sectionId}&subject_id=${subjectId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin'
      });

      console.log('📡 Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Fetch response data:', data);
        
        if (data.success && data.grades && data.grades.length > 0) {
          // Convert grades array to object keyed by student_id
          const gradesObject = {};
          data.grades.forEach(grade => {
            gradesObject[grade.student_id] = {
              first_quarter: grade.first_quarter,
              second_quarter: grade.second_quarter,
              third_quarter: grade.third_quarter,
              fourth_quarter: grade.fourth_quarter,
              semester_grade: grade.semester_grade,
              _original: {
                first_quarter: grade.first_quarter,
                second_quarter: grade.second_quarter,
                third_quarter: grade.third_quarter,
                fourth_quarter: grade.fourth_quarter,
                semester_grade: grade.semester_grade
              }
            };
          });
          
          // Merge with existing grades instead of replacing
          setStudentGrades(prevGrades => {
            const mergedGrades = { ...prevGrades };
            Object.keys(gradesObject).forEach(studentId => {
              mergedGrades[studentId] = {
                ...mergedGrades[studentId],
                ...gradesObject[studentId]
              };
            });
            console.log('✅ Merged existing grades:', mergedGrades);
            return mergedGrades;
          });
        } else {
          console.log('⚠️ No grades found in fetchExistingGrades response');
          console.log('Response data:', data);
        }
      } else {
        console.error('❌ Fetch failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching existing grades:', error);
    }
  };

  // Determine which quarters to show based on subject semester
  const getQuartersForSemester = (semester) => {
    if (semester === 1) {
      return ['first_quarter', 'second_quarter']; // 1st Semester = Q1 + Q2
    } else if (semester === 2) {
      return ['third_quarter', 'fourth_quarter']; // 2nd Semester = Q3 + Q4
    }
    return ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter']; // Default: all quarters
  };

  // Get the quarters that should be displayed for the current subject
  const subjectToUse = currentSubject || selectedSubject;
  
  // Debug logging to check semester value
  if (subjectToUse) {
    console.log('🔍 Subject Debug:', {
      subject_name: subjectToUse.name,
      semester_value: subjectToUse.semester,
      semester_type: typeof subjectToUse.semester,
      expected_quarters: getQuartersForSemester(subjectToUse.semester)
    });
  }
  
  const activeQuarters = subjectToUse ? getQuartersForSemester(subjectToUse.semester) : ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'];

  // Quarter display names
  const quarterNames = {
    'first_quarter': '1st Quarter',
    'second_quarter': '2nd Quarter', 
    'third_quarter': '3rd Quarter',
    'fourth_quarter': '4th Quarter'
  };

  // Grade calculation function - calculate based on active quarters only
  const calculateSemesterGrade = (quarters) => {
    const validGrades = quarters.filter(q => q && parseFloat(q) > 0);
    // Only calculate final grade when all active quarters have grades
    if (validGrades.length !== activeQuarters.length) return '';
    const sum = validGrades.reduce((acc, grade) => acc + parseFloat(grade), 0);
    return (sum / validGrades.length).toFixed(2);
  };

  // HCI Principle 5: Error prevention & Principle 9: Help users recognize errors
  const validateGradeInput = (value, quarter, studentId) => {
    const errors = [];
    
    if (value !== '' && isNaN(value)) {
      errors.push('Grade must be a number');
    }
    if (value !== '' && (value < 0 || value > 100)) {
      errors.push('Grade must be between 0 and 100');
    }
    
    return errors;
  };

  // Handle grade input changes with enhanced validation and feedback
  const handleGradeChange = (studentId, quarter, value) => {
    // HCI Principle 5: Error prevention
    const errors = validateGradeInput(value, quarter, studentId);
    
    // Update validation errors
    const newValidationErrors = { ...validationErrors };
    const errorKey = `${studentId}_${quarter}`;
    
    if (errors.length > 0) {
      newValidationErrors[errorKey] = errors;
      setValidationErrors(newValidationErrors);
      return; // Don't update if invalid
    } else {
      delete newValidationErrors[errorKey];
      setValidationErrors(newValidationErrors);
    }

    const newGrades = { ...studentGrades };
    if (!newGrades[studentId]) {
      newGrades[studentId] = {
        first_quarter: '', second_quarter: '', third_quarter: '', fourth_quarter: '',
        semester_grade: '', status: 'ongoing', remarks: ''
      };
    }
    
    newGrades[studentId][quarter] = value;
    
    // Auto-calculate semester grade based on active quarters only
    const quarters = activeQuarters.map(quarter => newGrades[studentId][quarter]);
    newGrades[studentId].semester_grade = calculateSemesterGrade(quarters);
    
    setStudentGrades(newGrades);
    
    // HCI Principle 1: Track unsaved changes
    const newUnsavedChanges = { ...unsavedChanges };
    newUnsavedChanges[studentId] = true;
    setUnsavedChanges(newUnsavedChanges);
    
    // Add to operation history
    const operation = {
      id: Date.now(),
      type: 'grade_change',
      studentId,
      quarter,
      value,
      timestamp: new Date()
    };
    setOperationHistory(prev => [operation, ...prev.slice(0, 9)]); // Keep last 10 operations
  };

  // HCI Principle 1: Enhanced grade saving with better status feedback
  const handleSaveGrades = async (studentId) => {
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const gradeData = studentGrades[studentId];
      
      // HCI Principle 5: Enhanced validation with specific feedback
      const quarters = activeQuarters.map(quarter => gradeData[quarter]);
      const filledQuarters = quarters.filter(q => q && q > 0);
      
      if (filledQuarters.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Grades Entered',
          html: `
            <div class="text-left">
              <p class="mb-2">Please enter at least one quarter grade before saving.</p>
              <div class="bg-blue-50 p-3 rounded-lg">
                <p class="text-sm text-blue-800 font-medium">💡 Tip:</p>
                <p class="text-sm text-blue-700">You can save partial grades and complete them later.</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'Got it'
        });
        setSavingGrades(prev => ({ ...prev, [studentId]: false }));
        return;
      }

      // Find the student's info for the grades table
      const student = sectionStudents.find(s => s.id === studentId);
      const studentName = `${student?.firstname} ${student?.lastname}`;

      // HCI Principle 1: Show saving progress
      const savingToast = Swal.fire({
        title: 'Saving Grades...',
        html: `Saving grades for ${studentName}`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Save grades via API - Use the actual user ID, not student_info_id
      router.post(`/faculty/grades/save`, {
        student_id: studentId, // This is the actual user ID
        subject_id: selectedSubject?.id || selectedSubject,
        section_id: selectedSection?.id || selectedSection,
        semester: (subjectToUse?.semester || 1),
        ...gradeData
      }, {
        preserveState: true,
        onSuccess: () => {
          setSavingGrades(prev => ({ ...prev, [studentId]: false }));
          setEditingGrades(prev => ({ ...prev, [studentId]: false }));
          
          // Clear unsaved changes
          const newUnsavedChanges = { ...unsavedChanges };
          delete newUnsavedChanges[studentId];
          setUnsavedChanges(newUnsavedChanges);
          
          // Update last saved timestamp
          setLastSaved(prev => ({ ...prev, [studentId]: new Date() }));
          
          // Add to operation history
          const operation = {
            id: Date.now(),
            type: 'save_success',
            studentId,
            studentName,
            timestamp: new Date()
          };
          setOperationHistory(prev => [operation, ...prev.slice(0, 9)]);
          
          Swal.fire({
            icon: 'success',
            title: 'Grades Saved Successfully!',
            html: `
              <div class="text-center">
                <p class="mb-2">Grades for <strong>${studentName}</strong> have been saved.</p>
                <div class="bg-green-50 p-3 rounded-lg">
                  <p class="text-sm text-green-800">✅ Data saved at ${new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            `,
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
          });
        },
        onError: (errors) => {
          setSavingGrades(prev => ({ ...prev, [studentId]: false }));
          const errorMessage = errors.message || 'Failed to save grades. Please try again.';
          
          // Add to operation history
          const operation = {
            id: Date.now(),
            type: 'save_error',
            studentId,
            studentName,
            error: errorMessage,
            timestamp: new Date()
          };
          setOperationHistory(prev => [operation, ...prev.slice(0, 9)]);
          
          Swal.fire({
            icon: 'error',
            title: 'Save Failed',
            html: `
              <div class="text-left">
                <p class="mb-2">Failed to save grades for <strong>${studentName}</strong></p>
                <div class="bg-red-50 p-3 rounded-lg mb-3">
                  <p class="text-sm text-red-800 font-medium">Error Details:</p>
                  <p class="text-sm text-red-700">${errorMessage}</p>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg">
                  <p class="text-sm text-blue-800 font-medium">💡 Troubleshooting:</p>
                  <ul class="text-sm text-blue-700 list-disc list-inside">
                    <li>Check your internet connection</li>
                    <li>Verify all grades are between 0-100</li>
                    <li>Try saving again in a few moments</li>
                  </ul>
                </div>
              </div>
            `,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Try Again'
          });
        }
      });
      
    } catch (error) {
      console.error('Error saving grades:', error);
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
      
      await Swal.fire({
        icon: 'error',
        title: 'Unexpected Error',
        html: `
          <div class="text-left">
            <p class="mb-2">An unexpected error occurred while saving grades.</p>
            <div class="bg-red-50 p-3 rounded-lg mb-3">
              <p class="text-sm text-red-800 font-medium">Technical Details:</p>
              <p class="text-sm text-red-700 font-mono">${error.message}</p>
            </div>
            <div class="bg-yellow-50 p-3 rounded-lg">
              <p class="text-sm text-yellow-800 font-medium">⚠️ What to do:</p>
              <ul class="text-sm text-yellow-700 list-disc list-inside">
                <li>Refresh the page and try again</li>
                <li>Contact IT support if the problem persists</li>
                <li>Your data may still be saved - check before re-entering</li>
              </ul>
            </div>
          </div>
        `,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Understood'
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

  // Calculate pass/fail status
  const getPassFailStatus = (grades, grade) => {
    const quarters = activeQuarters.map(quarter => grades[quarter]);
    const completedQuarters = quarters.filter(q => q && parseFloat(q) > 0);
    
    // Only show Pass/Fail when all active quarters are complete
    if (completedQuarters.length !== activeQuarters.length) return 'Ongoing';
    
    const numGrade = parseFloat(grade);
    return numGrade >= 75 ? 'Passed' : 'Failed';
  };

  const getRemarks = (grade, studentId) => {
    if (!grade || grade === '') return 'No Grade';
    
    const grades = studentGrades[studentId] || {};
    return getPassFailStatus(grades, grade);
  };

  // Handle submit to registrar - Simplified approach
  const handleSubmitToRegistrar = async (completedStudents) => {
    try {
      // Show progress
      Swal.fire({
        title: 'Submitting Grades...',
        html: `
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Submitting grades for ${completedStudents.length} students to registrar...</p>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
      });

      // Submit all students at once using a single request
      const studentIds = completedStudents.map(s => s.id);
      
      router.post('/faculty/submit-all-grades-for-approval', {
        student_ids: studentIds,
        section_id: selectedSection?.id || selectedSection,
        subject_id: selectedSubject?.id || selectedSubject
      }, {
        preserveState: true,
        onSuccess: (page) => {
          // Add to operation history for each student
          completedStudents.forEach(student => {
            const operation = {
              id: Date.now() + Math.random(),
              type: 'submit_success',
              studentId: student.id,
              studentName: `${student.firstname} ${student.lastname}`,
              timestamp: new Date()
            };
            setOperationHistory(prev => [operation, ...prev.slice(0, 9)]);
          });

          Swal.fire({
            title: 'Submission Successful!',
            html: `
              <div class="text-center">
                <div class="text-6xl mb-4">✅</div>
                <p class="mb-3">Successfully submitted grades for <strong>${completedStudents.length} students</strong> to the registrar.</p>
                <div class="bg-green-50 p-3 rounded-lg">
                  <p class="text-sm text-green-800">The registrar will review and approve these grades.</p>
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
        },
        onError: (errors) => {
          console.error('Submission errors:', errors);
          const errorMessage = errors.message || Object.values(errors)[0] || 'Unknown error occurred';
          
          Swal.fire({
            title: 'Submission Failed',
            html: `
              <div class="text-left">
                <p class="mb-3">Failed to submit grades for approval.</p>
                <div class="bg-red-50 p-3 rounded-lg">
                  <p class="text-sm text-red-800 font-medium">Error:</p>
                  <p class="text-sm text-red-700">${errorMessage}</p>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg mt-3">
                  <p class="text-sm text-blue-800 font-medium">💡 Try:</p>
                  <ul class="text-sm text-blue-700 list-disc list-inside">
                    <li>Make sure all grades are saved first</li>
                    <li>Check your internet connection</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              </div>
            `,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });

    } catch (error) {
      console.error('Error submitting to registrar:', error);
      Swal.fire({
        title: 'Submission Error',
        text: 'An unexpected error occurred while submitting grades.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300`}>
        {/* Enhanced Header with HCI Principles */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Grade Input System
              </h1>
              <p className="text-gray-600">Manage and input grades by section and subject</p>
            </div>
            
            {/* HCI Principle 1: System Status Indicators */}
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                connectionStatus === 'online' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {connectionStatus === 'online' ? <FaWifi /> : <FaExclamationTriangle />}
                <span className="capitalize">{connectionStatus}</span>
              </div>
              
              {/* Current Time */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                <FaClock />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
              
              {/* Unsaved Changes Indicator */}
              {Object.keys(unsavedChanges).length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm animate-pulse">
                  <FaExclamationTriangle />
                  <span>{Object.keys(unsavedChanges).length} unsaved</span>
                </div>
              )}
              
              {/* Help Button - HCI Principle 10 */}
              <button
                onClick={() => {
                  Swal.fire({
                    title: 'Grade Input Help',
                    html: `
                      <div class="text-left space-y-3">
                        <div class="bg-blue-50 p-3 rounded-lg">
                          <h4 class="font-semibold text-blue-800 mb-2">📚 How to Use:</h4>
                          <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Select a section to view subjects</li>
                            <li>• Choose a subject to input grades</li>
                            <li>• Enter grades (0-100) for each quarter</li>
                            <li>• Click Save to store grades</li>
                          </ul>
                        </div>
                        <div class="bg-green-50 p-3 rounded-lg">
                          <h4 class="font-semibold text-green-800 mb-2">✅ Grade Scale:</h4>
                          <ul class="text-sm text-green-700 space-y-1">
                            <li>• 90-100: Excellent</li>
                            <li>• 85-89: Very Good</li>
                            <li>• 80-84: Good</li>
                            <li>• 75-79: Satisfactory</li>
                            <li>• Below 75: Needs Improvement</li>
                          </ul>
                        </div>
                        <div class="bg-yellow-50 p-3 rounded-lg">
                          <h4 class="font-semibold text-yellow-800 mb-2">💡 Tips & Shortcuts:</h4>
                          <ul class="text-sm text-yellow-700 space-y-1">
                            <li>• Save frequently to avoid data loss</li>
                            <li>• Grades are auto-calculated when complete</li>
                            <li>• Use Edit mode to modify grades</li>
                            <li>• <kbd class="bg-yellow-200 px-1 rounded">Ctrl+S</kbd> Save all editing grades</li>
                            <li>• <kbd class="bg-yellow-200 px-1 rounded">Esc</kbd> Cancel all editing</li>
                            <li>• <kbd class="bg-yellow-200 px-1 rounded">Ctrl+H</kbd> Show this help</li>
                          </ul>
                        </div>
                      </div>
                    `,
                    confirmButtonColor: '#8B5CF6',
                    confirmButtonText: 'Got it!'
                  });
                }}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                title="Help & Instructions"
              >
                <FaQuestionCircle />
              </button>
            </div>
          </div>
          
          {/* Operation History - HCI Principle 1: Visibility */}
          {operationHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <FaHistory className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Recent Activity</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                {operationHistory.slice(0, 3).map(op => (
                  <div key={op.id} className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      op.type === 'save_success' ? 'bg-green-500' :
                      op.type === 'save_error' ? 'bg-red-500' : 
                      op.type === 'submit_success' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}></span>
                    <span>
                      {op.type === 'save_success' && `✅ Saved grades for ${op.studentName}`}
                      {op.type === 'save_error' && `❌ Failed to save for ${op.studentName}`}
                      {op.type === 'submit_success' && `📤 Submitted ${op.studentName} to registrar`}
                      {op.type === 'grade_change' && `📝 Updated ${op.quarter} grade`}
                    </span>
                    <span className="text-gray-400">
                      {op.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation and Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setCurrentView('sections')}
              className={`px-3 py-1 rounded text-sm transition-all ${
                currentView === 'sections' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              Sections
            </button>
            {selectedSection && (
              <>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => setCurrentView('subjects')}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    currentView === 'subjects' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  {selectedSection.section_name} - Subjects
                </button>
              </>
            )}
            {selectedSubject && (
              <>
                <span className="text-gray-400">/</span>
                <span className="px-3 py-1 bg-purple-600 text-white rounded text-sm">
                  {selectedSubject.name} - Students
                </span>
              </>
            )}
          </div>

          {/* Back Button */}
          {currentView !== 'sections' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors mb-4"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          {/* Search and View Mode (only show when viewing students) */}
          {currentView === 'students' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    aria-label="Search students"
                  />
                  {/* HCI Principle 3: Clear search button */}
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* HCI Principle 6: Recognition rather than recall - Show search results */}
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                    <FaInfoCircle className="inline w-4 h-4 mr-2 text-blue-500" />
                    {filteredStudents.length} of {sectionStudents.length} students found
                    {filteredStudents.length === 0 && (
                      <span className="text-orange-600 ml-2">- Try different keywords</span>
                    )}
                  </div>
                )}
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
          )}
          
          {/* HCI Principle 1: Progress Indicator */}
          {currentView === 'students' && filteredStudents.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Grading Progress</h4>
                <span className="text-sm text-gray-600">
                  {filteredStudents.filter(s => {
                    const grades = studentGrades[s.id] || {};
                    const quarters = activeQuarters.map(quarter => grades[quarter]);
                    return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                  }).length} of {filteredStudents.length} complete
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${filteredStudents.length > 0 ? 
                      (filteredStudents.filter(s => {
                        const grades = studentGrades[s.id] || {};
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                      }).length / filteredStudents.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className="font-medium">
                  {filteredStudents.length > 0 ? 
                    Math.round((filteredStudents.filter(s => {
                      const grades = studentGrades[s.id] || {};
                      const quarters = activeQuarters.map(quarter => grades[quarter]);
                      return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                    }).length / filteredStudents.length) * 100) : 0}% Complete
                </span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Sections View */}
        {currentView === 'sections' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div
                key={section.id}
                onClick={() => handleSectionSelect(section)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <FaUsers className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">{section.student_count || 0} students</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                  {section.section_name}
                </h3>
                
                <p className="text-gray-600 mb-3">{section.strand_name}</p>
                
                <div className="text-sm text-purple-600 font-medium">
                  {section.subjects?.length || 0} subjects available →
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subjects View */}
        {currentView === 'subjects' && selectedSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedSection.subjects?.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleSubjectSelect(subject)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <FaBook className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">{subject.semester}</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {subject.name}
                </h3>
                
                <p className="text-gray-600 mb-3">{subject.code}</p>
                
                <div className="text-sm text-blue-600 font-medium">
                  Input grades →
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Students/Grades View */}
        {currentView === 'students' && selectedSection && selectedSubject && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaGraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedSubject?.name || 'Subject'} - {selectedSection?.section_name || 'Section'}
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
                      {Object.entries(studentGrades).filter(([studentId, grades]) => {
                        // Only count as passing if all active quarters are complete and final grade >= 75
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        const completedQuarters = quarters.filter(q => q && parseFloat(q) > 0);
                        return completedQuarters.length === activeQuarters.length && grades.semester_grade && parseFloat(grades.semester_grade) >= 75;
                      }).length}
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
                      {activeQuarters.map(quarter => (
                        <th key={quarter} className="text-center px-3 py-4 font-semibold">
                          {quarterNames[quarter]}
                        </th>
                      ))}
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
                          {activeQuarters.map((quarter) => {
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
                                    // Editable for new grades with enhanced UX
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={grades[quarter] || ''}
                                        onChange={(e) => handleGradeChange(student.id, quarter, e.target.value)}
                                        className={`w-20 px-2 py-2 border rounded-lg text-center font-medium transition-all duration-200 ${
                                          validationErrors[`${student.id}_${quarter}`] 
                                            ? 'border-red-500 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-purple-300'
                                        } ${unsavedChanges[student.id] ? 'bg-yellow-50 border-yellow-400' : ''}`}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        placeholder="0-100"
                                        title={`Enter grade for ${quarterNames[quarter]} (0-100)`}
                                        aria-label={`${quarterNames[quarter]} grade for ${student.firstname} ${student.lastname}`}
                                      />
                                      {/* HCI Principle 1: Unsaved changes indicator */}
                                      {unsavedChanges[student.id] && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" 
                                             title="Unsaved changes"></div>
                                      )}
                                      {/* HCI Principle 9: Error feedback */}
                                      {validationErrors[`${student.id}_${quarter}`] && (
                                        <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 bg-red-100 px-2 py-1 rounded shadow-lg z-10">
                                          {validationErrors[`${student.id}_${quarter}`][0]}
                                        </div>
                                      )}
                                    </div>
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
                            {(() => {
                              const quarters = activeQuarters.map(quarter => grades[quarter]);
                              const completedQuarters = quarters.filter(q => q && parseFloat(q) > 0);
                              
                              if (completedQuarters.length === activeQuarters.length) {
                                return (
                                  <span className={`font-bold text-lg ${getGradeColor(grades.semester_grade)}`}>
                                    {grades.semester_grade}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-gray-400 text-sm">
                                    Incomplete ({completedQuarters.length}/{activeQuarters.length})
                                  </span>
                                );
                              }
                            })()}
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getRemarks(grades.semester_grade, student.id) === 'Passed' 
                                ? 'bg-green-100 text-green-800' 
                                : getRemarks(grades.semester_grade, student.id) === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : getRemarks(grades.semester_grade, student.id) === 'Ongoing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getRemarks(grades.semester_grade, student.id)}
                            </span>
                          </td>
                          
                          <td className="px-3 py-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {isEditing ? (
                                <>
                                  {/* HCI Principle 1: Clear status feedback */}
                                  <button
                                    onClick={() => handleSaveGrades(student.id)}
                                    disabled={isSaving || Object.keys(validationErrors).some(key => key.startsWith(student.id))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                                      isSaving 
                                        ? 'bg-blue-500 text-white cursor-not-allowed' 
                                        : Object.keys(validationErrors).some(key => key.startsWith(student.id))
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg transform hover:scale-105'
                                    }`}
                                    title={
                                      isSaving ? 'Saving grades...' :
                                      Object.keys(validationErrors).some(key => key.startsWith(student.id)) ? 'Fix validation errors first' :
                                      'Save grades for this student'
                                    }
                                  >
                                    {isSaving ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <FaCheck className="w-4 h-4" />
                                        Save
                                      </>
                                    )}
                                  </button>
                                  
                                  {/* HCI Principle 3: User control - Cancel option */}
                                  <button
                                    onClick={() => {
                                      if (unsavedChanges[student.id]) {
                                        Swal.fire({
                                          title: 'Discard Changes?',
                                          text: 'You have unsaved changes. Are you sure you want to cancel?',
                                          icon: 'warning',
                                          showCancelButton: true,
                                          confirmButtonColor: '#ef4444',
                                          cancelButtonColor: '#6b7280',
                                          confirmButtonText: 'Yes, discard',
                                          cancelButtonText: 'Keep editing'
                                        }).then((result) => {
                                          if (result.isConfirmed) {
                                            toggleEditMode(student.id);
                                            // Clear unsaved changes
                                            const newUnsavedChanges = { ...unsavedChanges };
                                            delete newUnsavedChanges[student.id];
                                            setUnsavedChanges(newUnsavedChanges);
                                          }
                                        });
                                      } else {
                                        toggleEditMode(student.id);
                                      }
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 text-sm font-medium flex items-center gap-2 hover:shadow-lg"
                                    title="Cancel editing"
                                  >
                                    <FaTimes className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => toggleEditMode(student.id)}
                                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-medium flex items-center gap-2 hover:shadow-lg transform hover:scale-105"
                                  title="Edit grades for this student"
                                >
                                  <FaEdit className="w-4 h-4" />
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
                        {activeQuarters.map((quarter, idx) => {
                          const originalGrade = studentGrades[student.id]?._original;
                          const hasExistingGrade = originalGrade && originalGrade[quarter] && parseFloat(originalGrade[quarter]) > 0;
                          
                          return (
                            <div key={quarter} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">{quarterNames[quarter].replace(' Quarter', '')}:</span>
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
                            {(() => {
                              const quarters = activeQuarters.map(quarter => grades[quarter]);
                              const completedQuarters = quarters.filter(q => q && parseFloat(q) > 0);
                              
                              if (completedQuarters.length === activeQuarters.length) {
                                return (
                                  <span className={`font-bold ${getGradeColor(grades.semester_grade)}`}>
                                    {grades.semester_grade}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-gray-400 text-sm">
                                    Incomplete ({completedQuarters.length}/{activeQuarters.length})
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">Remarks:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getRemarks(grades.semester_grade, student.id) === 'Passed' 
                                ? 'bg-green-100 text-green-800' 
                                : getRemarks(grades.semester_grade, student.id) === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : getRemarks(grades.semester_grade, student.id) === 'Ongoing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getRemarks(grades.semester_grade, student.id)}
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

            {/* Enhanced Footer with Submit to Registrar - HCI Principles */}
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex justify-between items-center">
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-gray-600">
                    Showing {filteredStudents.length} students
                  </div>
                  {/* HCI Principle 1: System status visibility */}
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700">
                        {filteredStudents.filter(s => {
                          const grades = studentGrades[s.id] || {};
                          const quarters = activeQuarters.map(quarter => grades[quarter]);
                          return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                        }).length} Complete
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-700">
                        {Object.keys(unsavedChanges).length} Unsaved
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700">
                        {Object.keys(validationErrors).length} Errors
                      </span>
                    </span>
                  </div>
                </div>
                
                {/* Enhanced Submit to Registrar Button */}
                <div className="flex items-center space-x-3">
                  {/* HCI Principle 10: Help and documentation */}
                  <button
                    onClick={() => {
                      Swal.fire({
                        title: 'Submit to Registrar',
                        html: `
                          <div class="text-left space-y-3">
                            <div class="bg-blue-50 p-3 rounded-lg">
                              <h4 class="font-semibold text-blue-800 mb-2">📋 What happens when you submit?</h4>
                              <ul class="text-sm text-blue-700 space-y-1">
                                <li>• All completed grades are sent for registrar approval</li>
                                <li>• Grades become locked and cannot be edited</li>
                                <li>• Registrar will review and approve/reject</li>
                                <li>• You'll be notified of the approval status</li>
                              </ul>
                            </div>
                            <div class="bg-yellow-50 p-3 rounded-lg">
                              <h4 class="font-semibold text-yellow-800 mb-2">⚠️ Before submitting:</h4>
                              <ul class="text-sm text-yellow-700 space-y-1">
                                <li>• Save all unsaved changes</li>
                                <li>• Fix any validation errors</li>
                                <li>• Double-check all grades for accuracy</li>
                                <li>• Ensure all quarters are complete</li>
                              </ul>
                            </div>
                          </div>
                        `,
                        confirmButtonColor: '#8B5CF6',
                        confirmButtonText: 'Got it!'
                      });
                    }}
                    className="text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Learn about submitting to registrar"
                  >
                    <FaQuestionCircle className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      const completedStudents = filteredStudents.filter(s => {
                        const grades = studentGrades[s.id] || {};
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                      });
                      
                      const hasUnsaved = Object.keys(unsavedChanges).length > 0;
                      const hasErrors = Object.keys(validationErrors).length > 0;
                      
                      if (hasUnsaved || hasErrors) {
                        Swal.fire({
                          title: 'Cannot Submit',
                          html: `
                            <div class="text-left">
                              <p class="mb-3">Please resolve the following issues before submitting:</p>
                              ${hasUnsaved ? '<p class="text-yellow-700">• Save all unsaved changes</p>' : ''}
                              ${hasErrors ? '<p class="text-red-700">• Fix all validation errors</p>' : ''}
                            </div>
                          `,
                          icon: 'warning',
                          confirmButtonColor: '#f59e0b'
                        });
                        return;
                      }
                      
                      if (completedStudents.length === 0) {
                        Swal.fire({
                          title: 'No Complete Grades',
                          text: 'Please complete grades for at least one student before submitting.',
                          icon: 'info',
                          confirmButtonColor: '#8B5CF6'
                        });
                        return;
                      }
                      
                      Swal.fire({
                        title: 'Submit to Registrar?',
                        html: `
                          <div class="text-left">
                            <p class="mb-3">You are about to submit grades for <strong>${completedStudents.length} students</strong> to the registrar for approval.</p>
                            <div class="bg-yellow-50 p-3 rounded-lg mb-3">
                              <p class="text-sm text-yellow-800 font-medium">⚠️ Important:</p>
                              <p class="text-sm text-yellow-700">Once submitted, these grades cannot be modified until approved or rejected by the registrar.</p>
                            </div>
                            <p class="text-sm text-gray-600">Are you sure you want to continue?</p>
                          </div>
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#8B5CF6',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Yes, Submit',
                        cancelButtonText: 'Cancel'
                      }).then((result) => {
                        if (result.isConfirmed) {
                          // Implement actual submission logic
                          handleSubmitToRegistrar(completedStudents);
                        }
                      });
                    }}
                    disabled={
                      Object.keys(unsavedChanges).length > 0 || 
                      Object.keys(validationErrors).length > 0 ||
                      filteredStudents.filter(s => {
                        const grades = studentGrades[s.id] || {};
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                      }).length === 0
                    }
                    className={`px-6 py-3 rounded-lg font-medium flex items-center gap-3 transition-all duration-200 ${
                      Object.keys(unsavedChanges).length > 0 || 
                      Object.keys(validationErrors).length > 0 ||
                      filteredStudents.filter(s => {
                        const grades = studentGrades[s.id] || {};
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                      }).length === 0
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg transform hover:scale-105'
                    }`}
                    title={
                      Object.keys(unsavedChanges).length > 0 ? 'Save all changes first' :
                      Object.keys(validationErrors).length > 0 ? 'Fix validation errors first' :
                      'Submit completed grades to registrar for approval'
                    }
                  >
                    <FaSave className="w-5 h-5" />
                    Submit to Registrar
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                      {filteredStudents.filter(s => {
                        const grades = studentGrades[s.id] || {};
                        const quarters = activeQuarters.map(quarter => grades[quarter]);
                        return quarters.filter(q => q && parseFloat(q) > 0).length === activeQuarters.length;
                      }).length}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'sections' && sections.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Sections Available</h3>
            <p className="text-gray-600">You don't have any sections assigned for grade input</p>
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
