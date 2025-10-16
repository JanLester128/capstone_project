import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import StudentSidebar from '../layouts/Student_Sidebar';
import { 
    FaChartBar, 
    FaTrophy, 
    FaCalendarAlt,
    FaBookOpen,
    FaCheckCircle,
    FaExclamationTriangle,
    FaClock,
    FaDownload,
    FaPrint,
    FaEye,
    FaSpinner,
    FaInfoCircle,
    FaGraduationCap,
    FaAward
} from 'react-icons/fa';

export default function StudentGrades({ user, currentSchoolYear, grades }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState('1');
    const [loading, setLoading] = useState(false);

    // HCI Principle 1: Visibility of system status - Grade status indicators
    const getGradeColor = (grade) => {
        if (!grade || grade === 0) return 'text-gray-400';
        if (grade >= 90) return 'text-green-600';
        if (grade >= 85) return 'text-blue-600';
        if (grade >= 80) return 'text-yellow-600';
        if (grade >= 75) return 'text-orange-600';
        return 'text-red-600';
    };

    const getGradeBgColor = (grade) => {
        if (!grade || grade === 0) return 'bg-gray-50';
        if (grade >= 90) return 'bg-green-50';
        if (grade >= 85) return 'bg-blue-50';
        if (grade >= 80) return 'bg-yellow-50';
        if (grade >= 75) return 'bg-orange-50';
        return 'bg-red-50';
    };

    const getGradeStatus = (gradeData) => {
        const semesterGrade = gradeData?.semester_grade;
        const semester = gradeData?.semester;
        
        // Determine which quarters to check based on semester
        let relevantQuarters = [];
        if (semester === '1st') {
            relevantQuarters = [gradeData?.first_quarter, gradeData?.second_quarter];
        } else if (semester === '2nd') {
            relevantQuarters = [gradeData?.third_quarter, gradeData?.fourth_quarter];
        } else {
            // Fallback: check first two quarters
            relevantQuarters = [gradeData?.first_quarter, gradeData?.second_quarter];
        }
        
        // Check if both relevant quarters are complete
        const bothQuartersComplete = relevantQuarters.every(quarter => quarter && quarter > 0);
        const anyQuarterStarted = relevantQuarters.some(quarter => quarter && quarter > 0);
        
        if (!bothQuartersComplete) {
            // If either quarter is missing, show as ongoing
            if (anyQuarterStarted) {
                return { status: 'Ongoing', icon: FaClock, color: 'yellow' };
            }
            return { status: 'Not Started', icon: FaClock, color: 'gray' };
        }
        
        // Both quarters complete, check final grade
        if (!semesterGrade || semesterGrade === 0) return { status: 'Pending', icon: FaClock, color: 'gray' };
        if (semesterGrade >= 75) return { status: 'Passed', icon: FaCheckCircle, color: 'green' };
        return { status: 'Failed', icon: FaExclamationTriangle, color: 'red' };
    };

    // HCI Principle 2: Match between system and real world - Philippine grading system
    const getGradeDescription = (grade) => {
        if (!grade || grade === 0) return 'No Grade';
        if (grade >= 98) return 'With Highest Honors';
        if (grade >= 95) return 'With High Honors';
        if (grade >= 90) return 'With Honors';
        if (grade >= 85) return 'Very Satisfactory';
        if (grade >= 80) return 'Satisfactory';
        if (grade >= 75) return 'Fairly Satisfactory';
        return 'Did Not Meet Expectations';
    };

    // HCI Principle 8: Aesthetic and minimalist design - Clean grade display
    const GradeCard = ({ subject, gradeData }) => {
        const semesterGrade = gradeData?.semester_grade;
        const gradeStatus = getGradeStatus(gradeData);
        const StatusIcon = gradeStatus.icon;
        
        // Check if both relevant quarters are complete to determine what to display
        const semester = gradeData?.semester;
        let relevantQuarters = [];
        if (semester === '1st') {
            relevantQuarters = [gradeData?.first_quarter, gradeData?.second_quarter];
        } else if (semester === '2nd') {
            relevantQuarters = [gradeData?.third_quarter, gradeData?.fourth_quarter];
        } else {
            // Fallback: check first two quarters
            relevantQuarters = [gradeData?.first_quarter, gradeData?.second_quarter];
        }
        const bothQuartersComplete = relevantQuarters.every(quarter => quarter && quarter > 0);
        
        // Display logic for semester grade
        const displayGrade = () => {
            if (!bothQuartersComplete) {
                return 'Ongoing';
            }
            return semesterGrade || '--';
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{subject?.name || 'Unknown Subject'}</h3>
                        <p className="text-sm text-gray-500">{subject?.code || 'N/A'}</p>
                        {gradeData?.faculty && (
                            <p className="text-sm text-gray-600 mt-1">
                                {gradeData.faculty.firstname} {gradeData.faculty.lastname}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className={`text-3xl font-bold ${
                            bothQuartersComplete ? getGradeColor(semesterGrade) : 'text-yellow-600'
                        }`}>
                            {displayGrade()}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-${gradeStatus.color}-600`}>
                            <StatusIcon className="text-sm" />
                            <span className="text-xs font-medium">{gradeStatus.status}</span>
                        </div>
                    </div>
                </div>

                {/* Quarter Grades */}
                {(() => {
                    // Determine which quarters to show based on semester
                    const semester = gradeData?.semester;
                    let quartersToShow = [];
                    
                    if (semester === '1st') {
                        // 1st semester: show Q1 and Q2 only
                        quartersToShow = ['first_quarter', 'second_quarter'];
                    } else if (semester === '2nd') {
                        // 2nd semester: show Q3 and Q4 only
                        quartersToShow = ['third_quarter', 'fourth_quarter'];
                    } else {
                        // Fallback: show all quarters
                        quartersToShow = ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter'];
                    }
                    
                    const gridCols = quartersToShow.length === 2 ? 'grid-cols-2' : 'grid-cols-4';
                    
                    return (
                        <div className={`grid ${gridCols} gap-3 mb-4`}>
                            {quartersToShow.map((quarter, index) => {
                                const quarterGrade = gradeData?.[quarter] || 0;
                                // Calculate quarter number based on the quarter name
                                const quarterNum = quarter === 'first_quarter' ? 1 : 
                                                 quarter === 'second_quarter' ? 2 :
                                                 quarter === 'third_quarter' ? 3 : 4;
                                
                                return (
                                    <div key={quarter} className={`p-3 rounded-lg ${getGradeBgColor(quarterGrade)}`}>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-gray-600">Q{quarterNum}</p>
                                            <p className={`text-lg font-bold ${getGradeColor(quarterGrade)}`}>
                                                {quarterGrade || '--'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Grade Description */}
                <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700">
                        {getGradeDescription(semesterGrade)}
                    </p>
                    {gradeData?.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{gradeData.remarks}</p>
                    )}
                </div>
            </div>
        );
    };

    // HCI Principle 6: Recognition rather than recall - Summary statistics
    const calculateSemesterStats = (semesterGrades) => {
        if (!semesterGrades || semesterGrades.length === 0) {
            return { average: 0, passed: 0, failed: 0, total: 0, isComplete: false, averageDisplay: '--' };
        }

        // Check if all subjects have completed grades based on their semester's required quarters
        const totalSubjects = semesterGrades.length;
        const completedGrades = semesterGrades.filter(grade => {
            const semester = grade?.semester;
            
            // Check if the relevant quarters for this semester are complete
            if (semester === '1st') {
                // 1st semester: need Q1 and Q2 to be complete
                return grade.first_quarter && grade.first_quarter > 0 && 
                       grade.second_quarter && grade.second_quarter > 0 &&
                       grade.semester_grade && grade.semester_grade > 0;
            } else if (semester === '2nd') {
                // 2nd semester: need Q3 and Q4 to be complete
                return grade.third_quarter && grade.third_quarter > 0 && 
                       grade.fourth_quarter && grade.fourth_quarter > 0 &&
                       grade.semester_grade && grade.semester_grade > 0;
            } else {
                // Fallback: check if semester_grade exists
                return grade.semester_grade && grade.semester_grade > 0;
            }
        });
        const isComplete = completedGrades.length === totalSubjects;
        
        // Only calculate average if semester is complete
        let average = 0;
        let averageDisplay = 'Ongoing';
        
        if (isComplete && completedGrades.length > 0) {
            average = completedGrades.reduce((sum, grade) => sum + grade.semester_grade, 0) / completedGrades.length;
            averageDisplay = Math.round(average * 100) / 100;
        } else if (completedGrades.length > 0) {
            // Some grades available but not complete
            averageDisplay = 'Ongoing';
        } else {
            // No grades yet
            averageDisplay = '--';
        }

        const passed = completedGrades.filter(grade => grade.semester_grade >= 75).length;
        const failed = completedGrades.length - passed;

        // Calculate quarter-level completion for progress display
        let completedQuarters = 0;
        let totalQuarters = 0;
        
        semesterGrades.forEach(grade => {
            const semester = grade?.semester;
            
            if (semester === '1st') {
                // 1st semester has 2 quarters: Q1 and Q2
                totalQuarters += 2;
                if (grade.first_quarter && grade.first_quarter > 0) completedQuarters++;
                if (grade.second_quarter && grade.second_quarter > 0) completedQuarters++;
            } else if (semester === '2nd') {
                // 2nd semester has 2 quarters: Q3 and Q4
                totalQuarters += 2;
                if (grade.third_quarter && grade.third_quarter > 0) completedQuarters++;
                if (grade.fourth_quarter && grade.fourth_quarter > 0) completedQuarters++;
            } else {
                // Fallback: treat as 1 unit
                totalQuarters += 1;
                if (grade.semester_grade && grade.semester_grade > 0) completedQuarters++;
            }
        });

        return { 
            average: Math.round(average * 100) / 100, 
            passed, 
            failed, 
            total: totalSubjects,
            completed: completedGrades.length, // Fully completed subjects
            completedQuarters: completedQuarters, // Individual quarters completed
            totalQuarters: totalQuarters, // Total quarters expected
            isComplete,
            averageDisplay
        };
    };

    const currentSemesterGrades = grades[selectedSemester] || [];
    const stats = calculateSemesterStats(currentSemesterGrades);

    // HCI Principle 4: Consistency and standards - Consistent stat cards
    const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-${color}-500 rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white text-xl" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Head title="My Grades" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <StudentSidebar 
                    auth={{ user }} 
                    onToggle={setSidebarCollapsed}
                />
                
                {/* Main Content */}
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Academic performance for {currentSchoolYear?.year_start}-{currentSchoolYear?.year_end}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Semester Selector */}
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="1">1st Semester</option>
                                    <option value="2">2nd Semester</option>
                                </select>
                                
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                    <FaDownload className="text-sm" />
                                    Export Grades
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                icon={FaChartBar}
                                title="General Average"
                                value={stats.averageDisplay}
                                subtitle={stats.isComplete ? "Current semester" : `${stats.completedQuarters}/${stats.totalQuarters} quarters completed`}
                                color="blue"
                            />
                            <StatCard
                                icon={FaCheckCircle}
                                title="Subjects Passed"
                                value={stats.passed}
                                subtitle={`Out of ${stats.total} subjects`}
                                color="green"
                            />
                            <StatCard
                                icon={FaExclamationTriangle}
                                title="Subjects Failed"
                                value={stats.isComplete ? stats.failed : '--'}
                                subtitle={stats.isComplete ? `Out of ${stats.total} subjects` : 'Pending completion'}
                                color="red"
                            />
                            <StatCard
                                icon={FaAward}
                                title="Academic Standing"
                                value={stats.isComplete ? 
                                    (stats.average >= 90 ? 'Honors' : stats.average >= 75 ? 'Good' : 'Needs Improvement') : 
                                    'In Progress'
                                }
                                subtitle={stats.isComplete ? "Current status" : "Semester ongoing"}
                                color="purple"
                            />
                        </div>

                        {/* Grades Display */}
                        {currentSemesterGrades.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {selectedSemester === '1' ? '1st' : '2nd'} Semester Grades
                                    </h2>
                                    <div className="text-sm text-gray-500">
                                        {stats.total} subjects enrolled
                                    </div>
                                </div>

                                {/* Semester Completion Status */}
                                {stats.total > 0 && (
                                    stats.isComplete ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaCheckCircle className="text-green-600" />
                                                <span className="text-sm font-medium text-green-800">
                                                    Semester Complete
                                                </span>
                                                <span className="text-sm text-green-700">
                                                    Final Average: {stats.averageDisplay}
                                                </span>
                                            </div>
                                            <p className="text-xs text-green-700">
                                                All grades have been finalized for this semester.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-yellow-800">
                                                    Semester Progress
                                                </span>
                                                <span className="text-sm text-yellow-700">
                                                    {stats.completedQuarters}/{stats.totalQuarters} quarters completed
                                                </span>
                                            </div>
                                            <div className="w-full bg-yellow-200 rounded-full h-2">
                                                <div 
                                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${(stats.completedQuarters / stats.totalQuarters) * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-yellow-700 mt-2">
                                                Your semester average will be calculated once all grades are finalized.
                                            </p>
                                        </div>
                                    )
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {currentSemesterGrades.map((gradeData, index) => (
                                        <GradeCard
                                            key={index}
                                            subject={gradeData.subject}
                                            gradeData={gradeData}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                                <div className="text-center">
                                    <FaChartBar className="mx-auto text-gray-300 text-5xl mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Grades Available</h3>
                                    <p className="text-gray-600 mb-4">
                                        Grades for the {selectedSemester === '1' ? '1st' : '2nd'} semester are not yet available.
                                    </p>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <FaInfoCircle />
                                            <p className="text-sm font-medium">Information</p>
                                        </div>
                                        <p className="text-sm text-blue-600 mt-1">
                                            Grades will appear here once your teachers have submitted them and they've been approved by the registrar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Grade Legend */}
                        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Scale</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <div>
                                        <p className="text-sm font-medium">90-100</p>
                                        <p className="text-xs text-gray-500">Outstanding</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <div>
                                        <p className="text-sm font-medium">85-89</p>
                                        <p className="text-xs text-gray-500">Very Satisfactory</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                    <div>
                                        <p className="text-sm font-medium">80-84</p>
                                        <p className="text-xs text-gray-500">Satisfactory</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                    <div>
                                        <p className="text-sm font-medium">75-79</p>
                                        <p className="text-xs text-gray-500">Fairly Satisfactory</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    <strong>Note:</strong> A grade of 75 or above is required to pass a subject. Grades below 75 are considered failing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
