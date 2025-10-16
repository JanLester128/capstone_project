import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaUsers, 
    FaBook, 
    FaClock, 
    FaMapMarkerAlt, 
    FaGraduationCap,
    FaExclamationTriangle,
    FaEdit,
    FaEye,
    FaCalendarAlt
} from 'react-icons/fa';

export default function Faculty_Classes({ 
    classes = [], 
    academicCalendar = {},
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('all');

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const filteredClasses = classes.filter(classItem => {
        const matchesSearch = classItem.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             classItem.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (classItem.strand_name && classItem.strand_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesSemester = selectedSemester === 'all' || classItem.semester === selectedSemester;
        
        return matchesSearch && matchesSemester;
    });

    const formatTime = (timeString) => {
        if (!timeString) return '';
        
        try {
            // Handle both HH:MM and HH:MM:SS formats
            const [hours, minutes] = timeString.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return timeString; // Return original if formatting fails
        }
    };

    const getTimeSlot = (startTime, endTime) => {
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    };

    const getSemesterColor = (semester) => {
        return semester === '1st' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Faculty Classes - Error" />
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
            <Head title="My Classes - Faculty" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaUsers className="mr-3 text-blue-600" />
                                My Classes
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Manage your classes for {academicCalendar.semester} {academicCalendar.year_start}-{academicCalendar.year_end}
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Total Classes</p>
                                <p className="font-semibold text-blue-600">{classes.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Total Students</p>
                                <p className="font-semibold text-green-600">
                                    {classes.reduce((sum, cls) => sum + cls.students_count, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Search and Filter */}
                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search classes by subject, section, or strand..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Semesters</option>
                                    <option value="1st">1st Semester</option>
                                    <option value="2nd">2nd Semester</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {classes.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                            <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
                            <p className="text-gray-600">You don't have any classes assigned yet. Contact the registrar for class assignments.</p>
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                            <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
                            <p className="text-gray-600">No classes match your current search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredClasses.map((classItem) => (
                                <div key={classItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{classItem.subject_name}</h3>
                                                <p className="text-sm text-gray-600">{classItem.subject_code}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSemesterColor(classItem.semester)}`}>
                                                {classItem.semester}
                                            </span>
                                        </div>

                                        {/* Class Details */}
                                        <div className="space-y-3 mb-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <FaUsers className="mr-2 text-blue-500" />
                                                <span className="font-medium">{classItem.section_name}</span>
                                                {classItem.strand_name && (
                                                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                        {classItem.strand_name}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center text-sm text-gray-600">
                                                <FaClock className="mr-2 text-green-500" />
                                                <span>{classItem.schedule_display || `${classItem.day_of_week} ${getTimeSlot(classItem.start_time, classItem.end_time)}`}</span>
                                            </div>
                                            
                                            <div className="flex items-center text-sm text-gray-600">
                                                <FaMapMarkerAlt className="mr-2 text-red-500" />
                                                <span>{classItem.room}</span>
                                            </div>
                                        </div>

                                        {/* Student Count */}
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Enrolled Students</span>
                                                <span className="text-lg font-bold text-blue-600">{classItem.students_count}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex space-x-2">
                                            <Link
                                                href={`/faculty/grade-encoding/${classItem.id}`}
                                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                                            >
                                                <FaEdit className="mr-1" />
                                                Manage Grades
                                            </Link>
                                            <Link
                                                href={`/faculty/classes/${classItem.id}/students`}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                                            >
                                                <FaEye className="mr-1" />
                                                Students
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary Stats */}
                    {classes.length > 0 && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center">
                                    <FaBook className="text-blue-500 text-xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Total Subjects</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {new Set(classes.map(c => c.subject_name)).size}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center">
                                    <FaUsers className="text-green-500 text-xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Total Sections</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {new Set(classes.map(c => c.section_name)).size}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center">
                                    <FaGraduationCap className="text-purple-500 text-xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Total Students</p>
                                        <p className="text-lg font-bold text-purple-600">
                                            {classes.reduce((sum, cls) => sum + cls.students_count, 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center">
                                    <FaCalendarAlt className="text-orange-500 text-xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Avg. Class Size</p>
                                        <p className="text-lg font-bold text-orange-600">
                                            {classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + cls.students_count, 0) / classes.length) : 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    {classes.length > 0 && (
                        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Link
                                    href="/faculty/semester"
                                    className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <FaGraduationCap className="text-blue-600 mr-3 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">Grade Management</p>
                                        <p className="text-sm text-gray-600">Input quarterly grades</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/schedule"
                                    className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <FaClock className="text-green-600 mr-3 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">View Schedule</p>
                                        <p className="text-sm text-gray-600">Check your timetable</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/loads"
                                    className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <FaBook className="text-purple-600 mr-3 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">Teaching Loads</p>
                                        <p className="text-sm text-gray-600">View load summary</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
