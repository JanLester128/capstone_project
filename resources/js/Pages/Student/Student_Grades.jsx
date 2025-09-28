import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaClipboardList, 
  FaChartLine, 
  FaCalendarAlt,
  FaBookOpen,
  FaBook,
  FaAward,
  FaTrophy,
  FaCheckCircle,
  FaGraduationCap,
  FaUser,
  FaDownload,
  FaPrint,
  FaFilter,
  FaSearch,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaChartBar,
  FaPercentage,
  FaStar,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaCheck,
  FaTimes
} from "react-icons/fa";

export default function Student_Grades() {
  const { grades = [], studentInfo, schoolYear, totalApprovedGrades = 0, message } = usePage().props;
  
  // Debug: Log the received data
  console.log('Student Grades Data:', { grades, studentInfo, schoolYear, totalApprovedGrades, message });
  const [selectedSemester, setSelectedSemester] = useState("1st");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sortBy, setSortBy] = useState('subject');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [showTooltip, setShowTooltip] = useState(null);

  // HCI Principle 1: Visibility of system status - Loading states
  useEffect(() => {
    setIsLoading(true);
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedSemester]);

  // HCI Principle 7: Flexibility and efficiency of use - Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+F for search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]')?.focus();
      }
      // Alt+H for help
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        setShowHelp(!showHelp);
      }
      // Ctrl+P for print
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
      // Escape to clear search or close help
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('');
        } else if (showHelp) {
          setShowHelp(false);
        }
      }
      // Arrow keys for view mode switching
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setViewMode(viewMode === 'table' ? 'cards' : 'table');
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setViewMode(viewMode === 'cards' ? 'table' : 'cards');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, searchTerm, viewMode]);

  // Process real grades data from backend
  const processGradesData = () => {
    if (!grades || grades.length === 0) {
      return {};
    }

    const processed = {};
    
    grades.forEach(subjectData => {
      subjectData.semesters.forEach(semesterData => {
        const semesterKey = semesterData.semester === '1' ? '1st' : '2nd';
        
        if (!processed[semesterKey]) {
          processed[semesterKey] = {
            semester: `${semesterKey} Semester`,
            quarters: {
              Q1: [],
              Q2: [],
              Q3: [],
              Q4: []
            }
          };
        }

        // Add subject data to each quarter
        const subjectGrade = {
          subject: subjectData.subject_name,
          q1: semesterData.first_quarter || 0,
          q2: semesterData.second_quarter || 0,
          q3: semesterData.third_quarter || 0,
          q4: semesterData.fourth_quarter || 0,
          semester_grade: semesterData.semester_grade || 0,
          remarks: semesterData.remarks || 'No remarks',
          teacher: semesterData.faculty_name || 'N/A',
          status: semesterData.status || 'ongoing',
          approved_at: semesterData.approved_at,
          approved_by: semesterData.approved_by
        };

        // Add to quarters if grades exist
        if (subjectGrade.q1 > 0) processed[semesterKey].quarters.Q1.push({...subjectGrade, grade: subjectGrade.q1});
        if (subjectGrade.q2 > 0) processed[semesterKey].quarters.Q2.push({...subjectGrade, grade: subjectGrade.q2});
        if (subjectGrade.q3 > 0) processed[semesterKey].quarters.Q3.push({...subjectGrade, grade: subjectGrade.q3});
        if (subjectGrade.q4 > 0) processed[semesterKey].quarters.Q4.push({...subjectGrade, grade: subjectGrade.q4});
      });
    });

    return processed;
  };

  const gradeData = processGradesData();

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const calculateAverage = (quarters) => {
    if (!quarters || Object.keys(quarters).length === 0) return 0;
    
    let totalGrades = 0;
    let totalCredits = 0;
    
    Object.values(quarters).forEach(quarter => {
      quarter.forEach(subject => {
        totalGrades += subject.grade * (subject.credits || 1);
        totalCredits += (subject.credits || 1);
      });
    });
    
    return totalCredits > 0 ? (totalGrades / totalCredits).toFixed(1) : 0;
  };

  // Calculate real statistics from approved grades
  const calculateGradeStats = () => {
    // Always return safe default values
    const defaultStats = {
      totalSubjects: 0,
      averageGrade: '0.0',
      highestGrade: '0.0',
      highestSubject: 'N/A',
      gpa: '0.00'
    };

    if (!grades || grades.length === 0) {
      return defaultStats;
    }

    let allGrades = [];
    let subjectCount = 0;
    let highestGrade = 0;
    let highestSubject = 'N/A';

    try {
      grades.forEach(subjectData => {
        if (subjectData && subjectData.semesters) {
          subjectData.semesters.forEach(semesterData => {
            if (semesterData && semesterData.semester_grade && !isNaN(semesterData.semester_grade) && semesterData.semester_grade > 0) {
              const grade = parseFloat(semesterData.semester_grade);
              allGrades.push(grade);
              subjectCount++;
              
              if (grade > highestGrade) {
                highestGrade = grade;
                highestSubject = subjectData.subject_name || 'Unknown Subject';
              }
            }
          });
        }
      });

      if (allGrades.length === 0) {
        return defaultStats;
      }

      const averageGrade = allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length;
      const gpa = (averageGrade / 25 * 4);

      return {
        totalSubjects: subjectCount,
        averageGrade: isNaN(averageGrade) ? '0.0' : averageGrade.toFixed(1),
        highestGrade: isNaN(highestGrade) ? '0.0' : highestGrade.toFixed(1),
        highestSubject: highestSubject || 'N/A',
        gpa: isNaN(gpa) ? '0.00' : gpa.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating grade stats:', error);
      return defaultStats;
    }
  };

  const gradeStats = calculateGradeStats();
  const currentSemesterData = gradeData[selectedSemester] || { quarters: {} };
  const semesterAverage = calculateAverage(currentSemesterData.quarters);

  // HCI Principle 2: Match between system and real world - Familiar grading terms
  const getGradeInfo = (grade) => {
    const numGrade = parseFloat(grade) || 0;
    if (numGrade >= 97) return { color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Outstanding", icon: <FaStar /> };
    if (numGrade >= 94) return { color: "text-green-600 bg-green-50 border-green-200", label: "Excellent", icon: <FaAward /> };
    if (numGrade >= 90) return { color: "text-blue-600 bg-blue-50 border-blue-200", label: "Very Good", icon: <FaTrophy /> };
    if (numGrade >= 85) return { color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Good", icon: <FaCheckCircle /> };
    if (numGrade >= 80) return { color: "text-orange-600 bg-orange-50 border-orange-200", label: "Satisfactory", icon: <FaInfoCircle /> };
    if (numGrade > 0) return { color: "text-red-600 bg-red-50 border-red-200", label: "Needs Improvement", icon: <FaExclamationTriangle /> };
    return { color: "text-gray-600 bg-gray-50 border-gray-200", label: "No grades yet", icon: <FaInfoCircle /> };
  };

  const getGPA = (average) => {
    const numAverage = parseFloat(average) || 0;
    if (numAverage >= 97) return "4.0";
    if (numAverage >= 94) return "3.7";
    if (numAverage >= 90) return "3.3";
    if (numAverage >= 85) return "3.0";
    if (numAverage >= 80) return "2.7";
    if (numAverage > 0) return "2.0";
    return "0.0";
  };

  // Filter subjects based on search and quarter
  const filterSubjects = (subjects) => {
    return subjects.filter(subject => 
      subject.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.teacher.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <>
      <Head title="My Grades - ONSTS" />
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
                    {/* Enhanced Header - HCI Principle 1: Visibility of system status */}
          <header className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-xl border-b border-gray-200 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                  <FaGraduationCap className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Academic Performance</h1>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <div className="flex items-center space-x-1">
                      <FaCalendarAlt className="text-sm" />
                      <span className="text-sm font-medium">
                        {schoolYear ? `${schoolYear.year_start} - ${schoolYear.year_end}` : 'Academic Year 2024-2025'}
                      </span>
                    </div>
                    <span className="text-blue-200">•</span>
                    <div className="flex items-center space-x-1">
                      <FaStar className="text-yellow-300 text-sm" />
                      <span className="text-sm font-medium">GPA: {gradeStats.gpa}</span>
                    </div>
                    <span className="text-blue-200">•</span>
                    <div className="flex items-center space-x-1">
                      <FaUser className="text-sm" />
                      <span className="text-sm font-medium">
                        {studentInfo ? studentInfo.name : 'Student'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons - HCI Principle 7: Flexibility and efficiency of use */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20"
                  title="Get help and information (Alt+H)"
                >
                  <FaInfoCircle className="mr-2" />
                  Help
                </button>
                <button 
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20"
                  title="Export grades to PDF (Ctrl+E)"
                >
                  <FaDownload className="mr-2" />
                  Export
                </button>
                <button 
                  className="flex items-center px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-md border border-white/20"
                  title="Print grades (Ctrl+P)"
                >
                  <FaPrint className="mr-2" />
                  Print
                </button>
              </div>
            </div>
            
            {/* Help Panel - HCI Principle 10: Help and documentation */}
            {showHelp && (
              <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">
                <h3 className="text-white font-semibold mb-2 flex items-center">
                  <FaInfoCircle className="mr-2" />
                  How to use this page
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-100">
                  <div>
                    <p className="mb-2"><strong>Viewing Grades:</strong> Only approved grades from your teachers are shown here.</p>
                    <p className="mb-2"><strong>Search:</strong> Use the search box to find specific subjects or teachers.</p>
                  </div>
                  <div>
                    <p className="mb-2"><strong>Keyboard Shortcuts:</strong> Alt+H (Help), Ctrl+E (Export), Ctrl+P (Print)</p>
                    <p className="mb-2"><strong>GPA Calculation:</strong> Based on approved semester grades using 4.0 scale.</p>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* No Grades Message */}
              {(!grades || grades.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center mb-8">
                  <FaInfoCircle className="text-yellow-500 text-4xl mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Approved Grades Available</h3>
                  <p className="text-yellow-700">
                    {message || "Your grades are being processed by the registrar. Approved grades will appear here once they are ready."}
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Total approved grades: {totalApprovedGrades}
                  </p>
                  {schoolYear && (
                    <p className="text-sm text-blue-600 mt-2">
                      School Year: {schoolYear.year_start} - {schoolYear.year_end}
                    </p>
                  )}
                </div>
              )}

              {/* Show content only if grades are available */}
              {grades && grades.length > 0 && (
              <>
              
              {/* Enhanced Grades Table with Approval Status - HCI Principle 8: Aesthetic and minimalist design */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <FaClipboardList className="text-blue-600" />
                      </div>
                      Your Approved Grades
                    </h3>
                    <p className="text-sm text-gray-600">View your academic performance and progress</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Status Legend</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                        <span className="text-gray-800 font-medium">Approved</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></div>
                        <span className="text-gray-800 font-medium">Pending</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                        <span className="text-gray-800 font-medium">Rejected</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide">Subject</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Teacher</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Q1</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Q2</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Q3</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Q4</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Final Grade</th>
                        <th className="text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">Status</th>
                        <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wide">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((subjectData, index) => (
                        subjectData.semesters.map((semesterData, semIndex) => (
                          <tr key={`${index}-${semIndex}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                            <td className="py-5 px-6">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                  <FaBook className="text-white text-lg" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-base">{subjectData.subject_name}</p>
                                  <p className="text-sm font-medium text-gray-600">Semester {semesterData.semester}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex flex-col items-center space-y-1">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <FaUser className="text-gray-600 text-sm" />
                                </div>
                                <span className="text-gray-800 text-sm font-medium">{semesterData.faculty_name}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm border-2 ${
                                  semesterData.first_quarter >= 90 ? 'bg-green-50 text-green-800 border-green-200' :
                                  semesterData.first_quarter >= 85 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  semesterData.first_quarter >= 80 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                  semesterData.first_quarter >= 75 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                  semesterData.first_quarter ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {semesterData.first_quarter || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm border-2 ${
                                  semesterData.second_quarter >= 90 ? 'bg-green-50 text-green-800 border-green-200' :
                                  semesterData.second_quarter >= 85 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  semesterData.second_quarter >= 80 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                  semesterData.second_quarter >= 75 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                  semesterData.second_quarter ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {semesterData.second_quarter || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm border-2 ${
                                  semesterData.third_quarter >= 90 ? 'bg-green-50 text-green-800 border-green-200' :
                                  semesterData.third_quarter >= 85 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  semesterData.third_quarter >= 80 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                  semesterData.third_quarter >= 75 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                  semesterData.third_quarter ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {semesterData.third_quarter || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm border-2 ${
                                  semesterData.fourth_quarter >= 90 ? 'bg-green-50 text-green-800 border-green-200' :
                                  semesterData.fourth_quarter >= 85 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  semesterData.fourth_quarter >= 80 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                  semesterData.fourth_quarter >= 75 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                  semesterData.fourth_quarter ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {semesterData.fourth_quarter || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex flex-col items-center space-y-2">
                                <div className={`px-4 py-3 rounded-xl shadow-lg border-2 ${
                                  semesterData.semester_grade >= 90 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' :
                                  semesterData.semester_grade >= 85 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' :
                                  semesterData.semester_grade >= 80 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' :
                                  semesterData.semester_grade >= 75 ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300' : 
                                  'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
                                }`}>
                                  <span className={`text-2xl font-black ${
                                    semesterData.semester_grade >= 90 ? 'text-green-700' :
                                    semesterData.semester_grade >= 85 ? 'text-blue-700' :
                                    semesterData.semester_grade >= 80 ? 'text-yellow-700' :
                                    semesterData.semester_grade >= 75 ? 'text-orange-700' : 'text-red-700'
                                  }`}>
                                    {semesterData.semester_grade || '-'}
                                  </span>
                                </div>
                                {semesterData.semester_grade >= 75 && (
                                  <div className="flex items-center space-x-1">
                                    <FaCheckCircle className="text-green-600 text-sm" />
                                    <span className="text-xs font-bold text-green-700">PASSED</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex flex-col items-center space-y-2">
                                <div className="flex items-center justify-center">
                                  <span className="px-4 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-800 flex items-center space-x-2 shadow-md border border-green-200">
                                    <FaCheck className="text-sm" />
                                    <span>APPROVED</span>
                                  </span>
                                </div>
                                {semesterData.approved_at && (
                                  <div className="bg-gray-50 px-2 py-1 rounded-md">
                                    <p className="text-xs font-medium text-gray-700">
                                      {new Date(semesterData.approved_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="max-w-xs">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-gray-800 mb-1">
                                    {semesterData.remarks || 'No remarks'}
                                  </p>
                                  {semesterData.approved_by && (
                                    <div className="flex items-center space-x-1 mt-2">
                                      <FaUser className="text-gray-500 text-xs" />
                                      <p className="text-xs font-medium text-gray-600">
                                        Approved by: {semesterData.approved_by}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Grade Summary Footer */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Subjects</p>
                      <p className="text-2xl font-bold text-blue-600">{gradeStats.totalSubjects}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Grade</p>
                      <p className="text-2xl font-bold text-green-600">{gradeStats.averageGrade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">GPA (4.0 Scale)</p>
                      <p className="text-2xl font-bold text-purple-600">{gradeStats.gpa}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Performance Overview Cards - HCI Principle 6: Recognition rather than recall */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onMouseEnter={() => setShowTooltip('gpa')}
                  onMouseLeave={() => setShowTooltip(null)}
                  title="Grade Point Average on 4.0 scale"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Current GPA</p>
                      <p className="text-4xl font-bold mb-1">{gradeStats.gpa}</p>
                      <div className="flex items-center text-purple-200 text-xs">
                        <FaInfoCircle className="mr-1" />
                        <span>4.0 Scale</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white bg-opacity-30 rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-40">
                      <FaGraduationCap className="text-purple-600 text-2xl" />
                    </div>
                  </div>
                  {showTooltip === 'gpa' && (
                    <div className="mt-3 text-xs bg-white bg-opacity-10 rounded-lg p-2">
                      <p>GPA calculated from approved semester grades using standard 4.0 scale conversion</p>
                    </div>
                  )}
                </div>

                <div 
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onMouseEnter={() => setShowTooltip('average')}
                  onMouseLeave={() => setShowTooltip(null)}
                  title="Overall average of all approved grades"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Average Grade</p>
                      <p className="text-4xl font-bold mb-1">{gradeStats.averageGrade}</p>
                      <div className="flex items-center text-green-200 text-xs">
                        <span className={`px-2 py-1 rounded-full bg-white bg-opacity-20 ${getGradeInfo(gradeStats.averageGrade).color}`}>
                          {getGradeInfo(gradeStats.averageGrade).label}
                        </span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white bg-opacity-30 rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-40">
                      <FaChartBar className="text-green-600 text-2xl" />
                    </div>
                  </div>
                  {showTooltip === 'average' && (
                    <div className="mt-3 text-xs bg-white bg-opacity-10 rounded-lg p-2">
                      <p>Average of all approved semester grades across all subjects</p>
                    </div>
                  )}
                </div>

                <div 
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onMouseEnter={() => setShowTooltip('highest')}
                  onMouseLeave={() => setShowTooltip(null)}
                  title="Your best performing subject"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Highest Grade</p>
                      <p className="text-4xl font-bold mb-1">{gradeStats.highestGrade}</p>
                      <div className="flex items-center text-emerald-200 text-xs">
                        <FaTrophy className="mr-1" />
                        <span className="truncate max-w-24">{gradeStats.highestSubject}</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white bg-opacity-30 rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-40">
                      <FaStar className="text-emerald-600 text-2xl" />
                    </div>
                  </div>
                  {showTooltip === 'highest' && (
                    <div className="mt-3 text-xs bg-white bg-opacity-10 rounded-lg p-2">
                      <p>Your highest approved grade: {gradeStats.highestGrade} in {gradeStats.highestSubject}</p>
                    </div>
                  )}
                </div>

                <div 
                  className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onMouseEnter={() => setShowTooltip('subjects')}
                  onMouseLeave={() => setShowTooltip(null)}
                  title="Number of subjects with approved grades"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Subjects</p>
                      <p className="text-4xl font-bold mb-1">{gradeStats.totalSubjects}</p>
                      <div className="flex items-center text-blue-200 text-xs">
                        <FaCheckCircle className="mr-1" />
                        <span>Approved</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white bg-opacity-30 rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-40">
                      <FaBookOpen className="text-blue-600 text-2xl" />
                    </div>
                  </div>
                  {showTooltip === 'subjects' && (
                    <div className="mt-3 text-xs bg-white bg-opacity-10 rounded-lg p-2">
                      <p>Number of subjects with grades approved by registrar</p>
                    </div>
                  )}
                </div>
              </div>


              </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
