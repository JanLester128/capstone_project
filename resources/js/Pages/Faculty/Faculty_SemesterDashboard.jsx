import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaCalendarAlt, 
    FaClipboardList, 
    FaClock, 
    FaExclamationTriangle, 
    FaCheckCircle, 
    FaTimesCircle,
    FaUsers,
    FaChartBar,
    FaBell,
    FaEdit,
    FaEye
} from 'react-icons/fa';

export default function Faculty_SemesterDashboard({ 
    classes = [], 
    notifications = [], 
    academicCalendar = {}, 
    quarterInfo = {},
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedQuarter, setSelectedQuarter] = useState(quarterInfo.current || '1st');

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
            case 'submitted':
                return 'text-green-600 bg-green-100';
            case 'in_progress':
                return 'text-yellow-600 bg-yellow-100';
            case 'not_started':
                return 'text-gray-600 bg-gray-100';
            case 'no_students':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'submitted':
                return 'Submitted';
            case 'in_progress':
                return 'In Progress';
            case 'not_started':
                return 'Not Started';
            case 'no_students':
                return 'No Students';
            default:
                return 'Unknown';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-600 bg-red-100 border-red-200';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'low':
                return 'text-blue-600 bg-blue-100 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const handleGradeEncoding = (classId) => {
        router.visit(`/faculty/grade-encoding/${classId}?quarter=${selectedQuarter}`);
    };

    const isDeadlineNear = () => {
        if (!academicCalendar.days_until_deadline) return false;
        return academicCalendar.days_until_deadline <= 3;
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Faculty Semester Dashboard - Error" />
                <Faculty_Sidebar onToggle={handleSidebarToggle} />
                
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    <div className="p-8">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Faculty Semester Dashboard" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Semester & Grading Management</h1>
                            <p className="text-gray-600 mt-1">
                                Manage quarterly grading for {academicCalendar.semester} Semester {academicCalendar.year_start}-{academicCalendar.year_end}
                            </p>
                        </div>
                        
                        {/* Quarter Selector */}
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-gray-700">Current Quarter:</label>
                            <select 
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="1st">1st Quarter</option>
                                <option value="2nd">2nd Quarter</option>
                                <option value="3rd">3rd Quarter</option>
                                <option value="4th">4th Quarter</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Academic Calendar Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <FaCalendarAlt className="text-blue-500 text-2xl mr-4" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Current Quarter</h3>
                                    <p className="text-2xl font-bold text-blue-600">{academicCalendar.current_quarter}</p>
                                    <p className="text-sm text-gray-500">
                                        {academicCalendar.is_quarter_open ? 'Open for grading' : 'Closed'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <FaClock className={`text-2xl mr-4 ${isDeadlineNear() ? 'text-red-500' : 'text-green-500'}`} />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Grade Deadline</h3>
                                    <p className={`text-sm font-medium ${isDeadlineNear() ? 'text-red-600' : 'text-green-600'}`}>
                                        {academicCalendar.grade_submission_deadline 
                                            ? new Date(academicCalendar.grade_submission_deadline).toLocaleDateString()
                                            : 'Not set'
                                        }
                                    </p>
                                    {academicCalendar.days_until_deadline !== null && (
                                        <p className="text-sm text-gray-500">
                                            {academicCalendar.days_until_deadline > 0 
                                                ? `${academicCalendar.days_until_deadline} days remaining`
                                                : 'Deadline passed'
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <FaClipboardList className="text-purple-500 text-2xl mr-4" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Total Classes</h3>
                                    <p className="text-2xl font-bold text-purple-600">{classes.length}</p>
                                    <p className="text-sm text-gray-500">Teaching assignments</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    {notifications.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FaBell className="mr-2" />
                                Recent Notifications
                            </h2>
                            <div className="space-y-3">
                                {notifications.slice(0, 3).map((notification) => (
                                    <div 
                                        key={notification.id}
                                        className={`p-4 rounded-lg border ${getPriorityColor(notification.priority)}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium">{notification.title}</h4>
                                                <p className="text-sm mt-1">{notification.message}</p>
                                            </div>
                                            <span className="text-xs">{notification.created_at}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Classes Grid */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Classes - {selectedQuarter} Quarter</h2>
                        
                        {classes.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                                <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
                                <p className="text-gray-600">You don't have any classes assigned yet. Contact the registrar for class assignments.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map((classItem) => {
                                    const gradeStatus = classItem.grade_status || { status: 'not_started', submitted_count: 0, total_students: 0, percentage: 0 };
                                    
                                    return (
                                        <div key={classItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{classItem.subject_name}</h3>
                                                    <p className="text-sm text-gray-600">{classItem.subject_code}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(gradeStatus.status)}`}>
                                                    {getStatusText(gradeStatus.status)}
                                                </span>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Section:</span>
                                                    <span className="font-medium">{classItem.section_name}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Strand:</span>
                                                    <span className="font-medium">{classItem.strand_name || 'Core'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Students:</span>
                                                    <span className="font-medium flex items-center">
                                                        <FaUsers className="mr-1" />
                                                        {classItem.students_count}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Schedule:</span>
                                                    <span className="font-medium">{classItem.schedule_display || `${classItem.schedule?.day} ${classItem.schedule?.time}`}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Grade Progress</span>
                                                    <span className="font-medium">{gradeStatus.percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full transition-all ${
                                                            gradeStatus.percentage === 100 ? 'bg-green-500' : 
                                                            gradeStatus.percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                                        }`}
                                                        style={{ width: `${gradeStatus.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {gradeStatus.submitted_count} of {gradeStatus.total_students} students graded
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleGradeEncoding(classItem.id)}
                                                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                                                    disabled={!academicCalendar.allow_grade_encoding}
                                                >
                                                    <FaEdit className="mr-1" />
                                                    {gradeStatus.is_locked ? 'View Grades' : 'Input Grades'}
                                                </button>
                                                <Link
                                                    href={`/faculty/classes/${classItem.id}/students`}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                                                >
                                                    <FaEye className="mr-1" />
                                                    View
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaCheckCircle className="text-green-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-lg font-bold text-green-600">
                                        {classes.filter(c => c.grade_status?.status === 'completed' || c.grade_status?.status === 'submitted').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaClock className="text-yellow-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">In Progress</p>
                                    <p className="text-lg font-bold text-yellow-600">
                                        {classes.filter(c => c.grade_status?.status === 'in_progress').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaTimesCircle className="text-gray-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">Not Started</p>
                                    <p className="text-lg font-bold text-gray-600">
                                        {classes.filter(c => c.grade_status?.status === 'not_started').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaChartBar className="text-blue-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">Overall Progress</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        {classes.length > 0 
                                            ? Math.round((classes.filter(c => c.grade_status?.status === 'completed' || c.grade_status?.status === 'submitted').length / classes.length) * 100)
                                            : 0
                                        }%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
