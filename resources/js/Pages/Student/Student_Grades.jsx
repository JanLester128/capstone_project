import React, { useState } from "react";
import { usePage } from "@inertiajs/react";
import Student_Sidebar from "../layouts/Student_Sidebar";
import { 
  FaClipboardList, 
  FaChartLine, 
  FaCalendarAlt,
  FaBookOpen,
  FaAward,
  FaTrophy,
  FaCheckCircle
} from "react-icons/fa";

export default function Student_Grades() {
  const { grades, studentInfo } = usePage().props;
  const [selectedSemester, setSelectedSemester] = useState("1st");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem('student_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // TODO: Replace with actual grade data from API
  const gradeData = {};

  const handleSemesterChange = (semester) => {
    setSelectedSemester(semester);
  };

  const calculateAverage = (quarters) => {
    if (!quarters || Object.keys(quarters).length === 0) return 0;
    
    let totalGrades = 0;
    let totalSubjects = 0;
    
    Object.values(quarters).forEach(quarter => {
      if (Array.isArray(quarter)) {
        quarter.forEach(subject => {
          totalGrades += subject.grade || 0;
          totalSubjects++;
        });
      }
    });
    
    const overallAverage = totalSubjects > 0 ? totalGrades / totalSubjects : 0;
    return Math.round(overallAverage * 100) / 100;
  };

  const currentSemesterData = gradeData[selectedSemester] || { quarters: {} };
  const semesterAverage = calculateAverage(currentSemesterData.quarters);

  const getGradeColor = (grade) => {
    if (grade >= 90) return "text-green-600 bg-green-50";
    if (grade >= 85) return "text-blue-600 bg-blue-50";
    if (grade >= 80) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Student_Sidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 p-8 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header - Enhanced with Breadcrumbs and Status */}
        <div className="mb-8">
          {/* Breadcrumb Navigation - Heuristic 3: User Control */}
          <nav className="text-gray-500 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><span>Home</span></li>
              <li><span className="mx-2">/</span></li>
              <li><span className="text-gray-800 font-medium">My Grades</span></li>
            </ol>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                My Grades
              </h1>
              <p className="text-gray-600">View your academic performance and progress</p>
              {/* System Status - Heuristic 1: Visibility of System Status */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <FaCheckCircle className="w-4 h-4" />
                  <span>Grades Updated: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Academic Year 2024-2025</span>
                </div>
              </div>
            </div>
            
            {/* Help and Actions - Heuristic 10: Help and Documentation */}
            <div className="hidden md:flex items-center gap-3">
              <button className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">
                <FaBookOpen className="w-4 h-4" />
                <span>Grade Guide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaChartLine className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Current Average</p>
                <p className="text-2xl font-bold text-gray-800">{semesterAverage}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaAward className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Highest Grade</p>
                <p className="text-2xl font-bold text-gray-800">97</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-800">6</p>
              </div>
            </div>
          </div>
        </div>

        {/* Semester Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Select Semester</h2>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Academic Year 2024-2025</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            {Object.keys(gradeData).map((semester) => (
              <button
                key={semester}
                onClick={() => handleSemesterChange(semester)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  selectedSemester === semester
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {gradeData[semester] ? gradeData[semester].semester : semester}
              </button>
            ))}
          </div>
        </div>

        {/* Quarterly Grades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(currentSemesterData.quarters).map(([quarter, subjects]) => (
            <div key={quarter} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6">
                <div className="flex items-center gap-3">
                  <FaTrophy className="w-6 h-6" />
                  <h3 className="text-xl font-bold">
                    {quarter === 'Q1' ? '1st Quarter' :
                     quarter === 'Q2' ? '2nd Quarter' :
                     quarter === 'Q3' ? '3rd Quarter' : '4th Quarter'}
                  </h3>
                </div>
                <p className="text-purple-100 mt-2">
                  Average: {Math.round((subjects.reduce((sum, s) => sum + s.grade, 0) / subjects.length) * 100) / 100}
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {subjects.map((subject, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{subject.subject}</h4>
                        <p className="text-sm text-gray-600">{subject.remarks}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getGradeColor(subject.grade)}`}>
                        {subject.grade}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Summary */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Outstanding</div>
              <div className="text-sm text-gray-600">90-100</div>
              <div className="text-lg font-semibold text-green-800">12 grades</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">Very Good</div>
              <div className="text-sm text-gray-600">85-89</div>
              <div className="text-lg font-semibold text-blue-800">8 grades</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">Good</div>
              <div className="text-sm text-gray-600">80-84</div>
              <div className="text-lg font-semibold text-yellow-800">4 grades</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">Needs Improvement</div>
              <div className="text-sm text-gray-600">Below 80</div>
              <div className="text-lg font-semibold text-red-800">0 grades</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
