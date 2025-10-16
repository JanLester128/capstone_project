import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaHome, 
    FaCalendarAlt, 
    FaChalkboardTeacher, 
    FaUsers, 
    FaGraduationCap,
    FaClock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaBell,
    FaChartBar,
    FaBook,
    FaClipboardList
} from 'react-icons/fa';

export default function Faculty_Dashboard({ 
    facultyLoad = null,
    classes = [],
    notifications = [],
    academicCalendar = {},
    gradesSummary = {},
    auth = null
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    // Use actual data from props with fallback to empty/default values
    const currentFacultyLoad = facultyLoad || {
        total_loads: 0,
        max_loads: 0,
        remaining_loads: 0,
        is_overloaded: false,
        utilization_percentage: 0
    };

    const currentClasses = classes || [];

    const currentAcademicCalendar = academicCalendar || {
        semester: 'No Active Semester',
        year_start: new Date().getFullYear(),
        year_end: new Date().getFullYear() + 1,
        current_quarter: 'No Active Quarter',
        is_quarter_open: false
    };

    const currentGradesSummary = gradesSummary || {
        total_classes: 0,
        completed_classes: 0,
        pending_classes: 0,
        completion_percentage: 0
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Faculty Dashboard - ONSTS" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaHome className="mr-3 text-blue-600" />
                                Faculty Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Welcome back! Here's your teaching overview for {currentAcademicCalendar.semester} {currentAcademicCalendar.year_start}-{currentAcademicCalendar.year_end}
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Current Quarter</p>
                                <p className="font-semibold text-blue-600">{currentAcademicCalendar.current_quarter}</p>
                            </div>
                            {currentAcademicCalendar.is_quarter_open && (
                                <div className="flex items-center text-green-600">
                                    <FaCheckCircle className="mr-1" />
                                    <span className="text-sm">Grading Open</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Quick Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        {/* Teaching Load */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <FaChalkboardTeacher className="text-blue-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Teaching Load</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {currentFacultyLoad.total_loads}/{currentFacultyLoad.max_loads}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {currentFacultyLoad.utilization_percentage}% Utilized
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Total Classes */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <FaUsers className="text-green-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Total Classes</p>
                                    <p className="text-2xl font-bold text-gray-900">{currentClasses.length}</p>
                                    <p className="text-xs text-gray-500">
                                        {currentClasses.reduce((sum, cls) => sum + (cls.students_count || 0), 0)} Students
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Grade Progress */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-yellow-100 rounded-full">
                                    <FaGraduationCap className="text-yellow-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Grade Progress</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {currentGradesSummary.completion_percentage}%
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {currentGradesSummary.completed_classes}/{currentGradesSummary.total_classes} Complete
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <FaBell className="text-purple-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Notifications</p>
                                    <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                                    <p className="text-xs text-gray-500">Unread</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Quick Actions Card */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FaClipboardList className="mr-2 text-blue-600" />
                                Quick Actions
                            </h3>
                            <div className="space-y-3">
                                <Link
                                    href="/faculty/semester"
                                    className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <FaCalendarAlt className="text-blue-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">Semester & Grading</p>
                                        <p className="text-sm text-gray-600">Manage quarterly grades</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/classes"
                                    className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <FaUsers className="text-green-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">My Classes</p>
                                        <p className="text-sm text-gray-600">View class lists</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/schedule"
                                    className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <FaClock className="text-purple-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">My Schedule</p>
                                        <p className="text-sm text-gray-600">View timetable</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Recent Classes */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FaBook className="mr-2 text-green-600" />
                                My Classes
                            </h3>
                            <div className="space-y-3">
                                {currentClasses.slice(0, 3).map((classItem) => (
                                    <div key={classItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-900">{classItem.subject_name}</p>
                                            <p className="text-sm text-gray-600">{classItem.section_name} • {classItem.strand_name}</p>
                                            <p className="text-xs text-gray-500">{classItem.students_count} students</p>
                                        </div>
                                        <Link
                                            href={`/faculty/grade-encoding/${classItem.id}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Manage Grades
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/faculty/classes"
                                className="block text-center text-blue-600 hover:text-blue-800 text-sm font-medium mt-4"
                            >
                                View All Classes
                            </Link>
                        </div>

                        {/* Academic Calendar */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FaCalendarAlt className="mr-2 text-yellow-600" />
                                Academic Calendar
                            </h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="font-medium text-blue-900">Current Semester</p>
                                    <p className="text-sm text-blue-700">{currentAcademicCalendar.semester}</p>
                                    <p className="text-xs text-blue-600">
                                        AY {currentAcademicCalendar.year_start}-{currentAcademicCalendar.year_end}
                                    </p>
                                </div>
                                
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="font-medium text-green-900">Current Quarter</p>
                                    <p className="text-sm text-green-700">{currentAcademicCalendar.current_quarter}</p>
                                    <div className="flex items-center mt-1">
                                        {currentAcademicCalendar.is_quarter_open ? (
                                            <>
                                                <FaCheckCircle className="text-green-600 mr-1 text-xs" />
                                                <span className="text-xs text-green-600">Grading Open</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaExclamationTriangle className="text-yellow-600 mr-1 text-xs" />
                                                <span className="text-xs text-yellow-600">Grading Closed</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Load Progress Bar */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaChartBar className="mr-2 text-blue-600" />
                                Teaching Load Overview
                            </h3>
                            <Link
                                href="/faculty/loads"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                View Details
                            </Link>
                        </div>
                        
                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Current Load: {currentFacultyLoad.total_loads}/{currentFacultyLoad.max_loads}</span>
                                <span>{currentFacultyLoad.utilization_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all ${
                                        currentFacultyLoad.is_overloaded ? 'bg-red-500' : 
                                        currentFacultyLoad.utilization_percentage >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(currentFacultyLoad.utilization_percentage, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="font-semibold text-blue-900">{currentFacultyLoad.total_loads}</p>
                                <p className="text-blue-700">Current Loads</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="font-semibold text-green-900">{currentFacultyLoad.remaining_loads}</p>
                                <p className="text-green-700">Available Slots</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="font-semibold text-gray-900">{currentFacultyLoad.max_loads}</p>
                                <p className="text-gray-700">Maximum Load</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
