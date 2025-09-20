import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaClipboardList, 
  FaChartLine, 
  FaCalendarAlt,
  FaBookOpen,
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
  FaEye
} from "react-icons/fa";

export default function Student_Grades() {
  const { grades, studentInfo } = usePage().props;
  const [selectedSemester, setSelectedSemester] = useState("1st");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [isLoading, setIsLoading] = useState(false);

  // HCI Principle 1: Visibility of system status - Loading states
  useEffect(() => {
    setIsLoading(true);
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedSemester]);

  // Mock grade data with more comprehensive information
  const gradeData = {
    "1st": {
      semester: "1st Semester",
      quarters: {
        Q1: [
          { subject: "Mathematics", grade: 92, remarks: "Excellent", teacher: "Ms. Johnson", credits: 3 },
          { subject: "Science", grade: 88, remarks: "Very Good", teacher: "Mr. Smith", credits: 3 },
          { subject: "English", grade: 95, remarks: "Outstanding", teacher: "Mrs. Davis", credits: 3 },
          { subject: "Filipino", grade: 90, remarks: "Excellent", teacher: "Ms. Cruz", credits: 3 },
          { subject: "Social Studies", grade: 87, remarks: "Very Good", teacher: "Mr. Garcia", credits: 2 },
          { subject: "Physical Education", grade: 94, remarks: "Excellent", teacher: "Coach Martinez", credits: 2 }
        ],
        Q2: [
          { subject: "Mathematics", grade: 89, remarks: "Very Good", teacher: "Ms. Johnson", credits: 3 },
          { subject: "Science", grade: 91, remarks: "Excellent", teacher: "Mr. Smith", credits: 3 },
          { subject: "English", grade: 93, remarks: "Excellent", teacher: "Mrs. Davis", credits: 3 },
          { subject: "Filipino", grade: 88, remarks: "Very Good", teacher: "Ms. Cruz", credits: 3 },
          { subject: "Social Studies", grade: 85, remarks: "Very Good", teacher: "Mr. Garcia", credits: 2 },
          { subject: "Physical Education", grade: 96, remarks: "Outstanding", teacher: "Coach Martinez", credits: 2 }
        ]
      }
    },
    "2nd": {
      semester: "2nd Semester",
      quarters: {
        Q3: [
          { subject: "Mathematics", grade: 94, remarks: "Excellent", teacher: "Ms. Johnson", credits: 3 },
          { subject: "Science", grade: 90, remarks: "Excellent", teacher: "Mr. Smith", credits: 3 },
          { subject: "English", grade: 97, remarks: "Outstanding", teacher: "Mrs. Davis", credits: 3 }
        ]
      }
    }
  };

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const calculateAverage = (quarters) => {
    if (!quarters || Object.keys(quarters).length === 0) return 0;
    
    let totalGrades = 0;
    let totalCredits = 0;
    
    Object.values(quarters).forEach(quarter => {
      if (Array.isArray(quarter)) {
        quarter.forEach(subject => {
          const grade = subject.grade || 0;
          const credits = subject.credits || 1;
          totalGrades += grade * credits;
          totalCredits += credits;
        });
      }
    });
    
    return totalCredits > 0 ? Math.round((totalGrades / totalCredits) * 100) / 100 : 0;
  };

  const currentSemesterData = gradeData[selectedSemester] || { quarters: {} };
  const semesterAverage = calculateAverage(currentSemesterData.quarters);

  // HCI Principle 2: Match between system and real world - Familiar grading terms
  const getGradeInfo = (grade) => {
    if (grade >= 97) return { color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Outstanding", icon: <FaStar /> };
    if (grade >= 94) return { color: "text-green-600 bg-green-50 border-green-200", label: "Excellent", icon: <FaAward /> };
    if (grade >= 90) return { color: "text-blue-600 bg-blue-50 border-blue-200", label: "Very Good", icon: <FaTrophy /> };
    if (grade >= 85) return { color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Good", icon: <FaCheckCircle /> };
    if (grade >= 80) return { color: "text-orange-600 bg-orange-50 border-orange-200", label: "Satisfactory", icon: <FaInfoCircle /> };
    return { color: "text-red-600 bg-red-50 border-red-200", label: "Needs Improvement", icon: <FaExclamationTriangle /> };
  };

  const getGPA = (average) => {
    if (average >= 97) return "4.0";
    if (average >= 94) return "3.7";
    if (average >= 90) return "3.3";
    if (average >= 85) return "3.0";
    if (average >= 80) return "2.7";
    return "2.0";
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
          
          {/* Enhanced Header */}
          <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                  <FaChartLine className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Academic Grades</h1>
                  <p className="text-gray-600 flex items-center space-x-2">
                    <FaCalendarAlt className="text-sm" />
                    <span>Academic Year 2024-2025</span>
                    <span className="text-gray-400">•</span>
                    <span>Current GPA: {getGPA(semesterAverage)}</span>
                  </p>
                </div>
              </div>
              
              {/* Action Buttons - HCI Principle 7: Flexibility and efficiency of use */}
              <div className="flex items-center space-x-3">
                <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <FaDownload className="mr-2" />
                  Export
                </button>
                <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <FaPrint className="mr-2" />
                  Print
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Performance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current GPA</p>
                      <p className="text-3xl font-bold text-gray-900">{getGPA(semesterAverage)}</p>
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <FaArrowUp className="mr-1" />
                        +0.2 from last semester
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FaGraduationCap className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Grade</p>
                      <p className="text-3xl font-bold text-gray-900">{semesterAverage}</p>
                      <p className="text-xs text-green-600 mt-1">{getGradeInfo(semesterAverage).label}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FaChartBar className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Highest Grade</p>
                      <p className="text-3xl font-bold text-gray-900">97</p>
                      <p className="text-xs text-emerald-600 mt-1">English Literature</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FaStar className="text-emerald-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                      <p className="text-3xl font-bold text-gray-900">6</p>
                      <p className="text-xs text-blue-600 mt-1">All subjects passing</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaBookOpen className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Section - HCI Principle 3: User control and freedom */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    {/* Semester Selection */}
                    <div className="flex items-center space-x-2">
                      <FaCalendarAlt className="text-gray-500" />
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.keys(gradeData).map((semester) => (
                          <option key={semester} value={semester}>
                            {gradeData[semester].semester}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search subjects or teachers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      />
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">View:</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'cards' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Cards
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'table' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Table
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading State - HCI Principle 1: Visibility of system status */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <FaSpinner className="animate-spin text-blue-600 text-xl" />
                    <span className="text-gray-600">Loading grades...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quarterly Grades */}
                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(currentSemesterData.quarters).map(([quarter, subjects]) => {
                        const filteredSubjects = filterSubjects(subjects);
                        const quarterAverage = filteredSubjects.reduce((sum, s) => sum + s.grade, 0) / filteredSubjects.length;
                        
                        return (
                          <div key={quarter} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <FaTrophy className="text-xl" />
                                  <div>
                                    <h3 className="text-xl font-bold">
                                      {quarter === 'Q1' ? '1st Quarter' :
                                       quarter === 'Q2' ? '2nd Quarter' :
                                       quarter === 'Q3' ? '3rd Quarter' : '4th Quarter'}
                                    </h3>
                                    <p className="text-purple-100 text-sm">
                                      {filteredSubjects.length} subjects
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold">{Math.round(quarterAverage * 100) / 100}</div>
                                  <div className="text-xs text-purple-100">Average</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-6">
                              <div className="space-y-4">
                                {filteredSubjects.map((subject, index) => {
                                  const gradeInfo = getGradeInfo(subject.grade);
                                  return (
                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <h4 className="font-semibold text-gray-900">{subject.subject}</h4>
                                          <span className="text-xs text-gray-500">({subject.credits} credits)</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{subject.teacher}</p>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${gradeInfo.color}`}>
                                          {gradeInfo.icon}
                                          <span className="font-bold text-lg">{subject.grade}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q1</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q2</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {currentSemesterData.quarters.Q1?.map((subject, index) => {
                              const q2Grade = currentSemesterData.quarters.Q2?.[index]?.grade || 0;
                              const average = q2Grade ? (subject.grade + q2Grade) / 2 : subject.grade;
                              const gradeInfo = getGradeInfo(average);
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{subject.subject}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {subject.teacher}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {subject.credits}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-semibold text-gray-900">{subject.grade}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-semibold text-gray-900">{q2Grade || '-'}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gradeInfo.color}`}>
                                      {Math.round(average * 100) / 100}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {gradeInfo.label}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Grade Distribution - HCI Principle 8: Aesthetic and minimalist design */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <FaChartBar className="mr-2 text-indigo-600" />
                  Grade Distribution
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Outstanding", range: "97-100", count: 2, color: "bg-emerald-500" },
                    { label: "Excellent", range: "94-96", count: 4, color: "bg-green-500" },
                    { label: "Very Good", range: "90-93", count: 6, color: "bg-blue-500" },
                    { label: "Good", range: "85-89", count: 0, color: "bg-yellow-500" }
                  ].map((item, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 ${item.color} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                        {item.count}
                      </div>
                      <div className="font-semibold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.range}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
