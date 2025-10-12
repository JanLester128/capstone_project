import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Student_Sidebar from '../layouts/Student_Sidebar';
import { 
  FaGraduationCap, 
  FaUser, 
  FaBookOpen, 
  FaChartLine, 
  FaTrophy, 
  FaCalendarAlt,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

// HCI Principle 1: Visibility of system status
// HCI Principle 2: Match between system and real world
// HCI Principle 4: Consistency and standards
export default function Student_Grades() {
  console.log('📊 Student_Grades: Component loaded successfully!');
  const { auth, gradesData = [], academicInfo = {}, error } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // HCI Principle 3: User control and freedom
  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // HCI Principle 6: Recognition rather than recall - Clear calculations
  const calculateGPA = () => {
    if (!gradesData || gradesData.length === 0) return '0.00';
    const total = gradesData.reduce((sum, grade) => sum + (grade.final_grade || 0), 0);
    return (total / gradesData.length).toFixed(2);
  };

  const getPassedSubjects = () => {
    if (!gradesData) return 0;
    return gradesData.filter(grade => (grade.final_grade || 0) >= 75).length;
  };

  const getAcademicStatus = () => {
    const gpa = parseFloat(calculateGPA());
    if (gpa >= 90) return { text: 'Outstanding', color: 'text-green-600', bg: 'bg-green-50' };
    if (gpa >= 85) return { text: 'Very Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (gpa >= 80) return { text: 'Good', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    if (gpa >= 75) return { text: 'Satisfactory', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getGradeStatus = (grade) => {
    if (grade >= 90) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (grade >= 85) return { status: 'Very Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (grade >= 80) return { status: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (grade >= 75) return { status: 'Satisfactory', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const academicStatus = getAcademicStatus();

  return (
    <>
      <Head title="My Grades - Student Portal" />
      <div className="flex h-screen bg-gray-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* HCI Principle 1: Visibility of system status - Clear header with context */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaGraduationCap className="text-blue-600" />
                  My Grades
                </h1>
                <p className="text-gray-600 mt-1">
                  {academicInfo.school_year} • {academicInfo.current_semester} • {academicInfo.grade_level}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${academicStatus.bg} ${academicStatus.color}`}>
                  {academicStatus.text}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaUser className="w-4 h-4" />
                  <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
                </div>
              </div>
            </div>
          </header>

          {/* HCI Principle 8: Aesthetic and minimalist design - Clean main content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* HCI Principle 9: Help users recognize, diagnose, and recover from errors */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <FaExclamationTriangle className="text-red-500 text-xl" />
                    <div>
                      <h3 className="text-red-800 font-semibold">Unable to Load Grades</h3>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                      <p className="text-red-600 text-sm mt-2">Please refresh the page or contact your teacher if the problem persists.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HCI Principle 2: Match between system and real world - Familiar academic layout */}
              {!error && gradesData.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <FaInfoCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Grades Available Yet</h3>
                  <p className="text-gray-600">Your grades will appear here once your teachers have submitted and approved them.</p>
                  <p className="text-gray-500 text-sm mt-2">Check back regularly for updates on your academic progress.</p>
                </div>
              )}

              {/* HCI Principle 6: Recognition rather than recall - Clear performance overview */}
              {!error && gradesData.length > 0 && (
                <>
                  {/* Academic Performance Summary */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <FaChartLine className="text-blue-600 text-xl" />
                      <h2 className="text-xl font-semibold text-gray-800">Academic Performance Overview</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                        <FaBookOpen className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Subjects</p>
                        <p className="text-2xl font-bold text-blue-600">{gradesData.length}</p>
                      </div>
                      <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
                        <FaChartLine className="w-8 h-8 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">General Average</p>
                        <p className="text-2xl font-bold text-green-600">{calculateGPA()}</p>
                      </div>
                      <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-100">
                        <FaTrophy className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Passed Subjects</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {getPassedSubjects()}/{gradesData.length}
                        </p>
                      </div>
                      <div className={`text-center p-6 rounded-xl border ${academicStatus.bg} ${academicStatus.bg.replace('50', '100')}`}>
                        <FaCheckCircle className={`w-8 h-8 mx-auto mb-3 ${academicStatus.color}`} />
                        <p className="text-sm font-medium text-gray-600 mb-1">Academic Standing</p>
                        <p className={`text-lg font-bold ${academicStatus.color}`}>
                          {academicStatus.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* HCI Principle 4: Consistency and standards - Familiar table layout */}
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                      <div className="flex items-center gap-2">
                        <FaBookOpen className="text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Detailed Grade Report</h2>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Individual subject performance breakdown</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                              Subject Details
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                              Instructor
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              1st Quarter
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              2nd Quarter
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              3rd Quarter
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              4th Quarter
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              Final Grade
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                              Remarks
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {gradesData.map((grade, index) => {
                            const gradeStatus = getGradeStatus(grade.final_grade || 0);
                            return (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {grade.subject_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {grade.subject_code} • {grade.semester} Semester
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {grade.faculty_name || 'Not Assigned'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-medium ${
                                    grade.first_quarter ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {grade.first_quarter || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-medium ${
                                    grade.second_quarter ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {grade.second_quarter || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-medium ${
                                    grade.third_quarter ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {grade.third_quarter || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-medium ${
                                    grade.fourth_quarter ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {grade.fourth_quarter || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-lg font-bold ${
                                    grade.final_grade ? gradeStatus.color : 'text-gray-400'
                                  }`}>
                                    {grade.final_grade || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {grade.final_grade ? (
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${gradeStatus.bg} ${gradeStatus.color}`}>
                                      {gradeStatus.status}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">Pending</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HCI Principle 10: Help and documentation - Clear grading scale */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FaInfoCircle className="text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Philippine Senior High School Grading Scale</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-lg font-bold text-green-800">90-100</p>
                        <p className="text-sm text-green-600 font-medium">Outstanding</p>
                        <p className="text-xs text-green-500 mt-1">Excellent Performance</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-lg font-bold text-blue-800">85-89</p>
                        <p className="text-sm text-blue-600 font-medium">Very Satisfactory</p>
                        <p className="text-xs text-blue-500 mt-1">Very Good Performance</p>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-lg font-bold text-indigo-800">80-84</p>
                        <p className="text-sm text-indigo-600 font-medium">Satisfactory</p>
                        <p className="text-xs text-indigo-500 mt-1">Good Performance</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-lg font-bold text-yellow-800">75-79</p>
                        <p className="text-sm text-yellow-600 font-medium">Fairly Satisfactory</p>
                        <p className="text-xs text-yellow-500 mt-1">Passing Grade</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-lg font-bold text-red-800">Below 75</p>
                        <p className="text-sm text-red-600 font-medium">Did Not Meet Expectations</p>
                        <p className="text-xs text-red-500 mt-1">Needs Improvement</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Note:</strong> Grades are based on the Department of Education (DepEd) grading system for Senior High School. 
                        A minimum grade of 75 is required to pass each subject.
                      </p>
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
