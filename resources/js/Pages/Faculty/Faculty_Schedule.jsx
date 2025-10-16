import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaCalendarAlt, 
    FaClock, 
    FaMapMarkerAlt, 
    FaBook, 
    FaUsers,
    FaExclamationTriangle,
    FaChevronLeft,
    FaChevronRight
} from 'react-icons/fa';

export default function Faculty_Schedule({ 
    schedule = [], 
    academicCalendar = {},
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedDay, setSelectedDay] = useState('all');

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
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

    const getDayColor = (day) => {
        const colors = {
            'Monday': 'bg-blue-100 text-blue-800',
            'Tuesday': 'bg-green-100 text-green-800',
            'Wednesday': 'bg-yellow-100 text-yellow-800',
            'Thursday': 'bg-purple-100 text-purple-800',
            'Friday': 'bg-red-100 text-red-800',
            'Saturday': 'bg-indigo-100 text-indigo-800',
            'Sunday': 'bg-pink-100 text-pink-800'
        };
        return colors[day] || 'bg-gray-100 text-gray-800';
    };

    const filteredSchedule = selectedDay === 'all' 
        ? schedule 
        : schedule.filter(item => item.day_of_week === selectedDay);

    const groupedSchedule = daysOfWeek.reduce((acc, day) => {
        acc[day] = schedule.filter(item => item.day_of_week === day)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return acc;
    }, {});

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Faculty Schedule - Error" />
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
            <Head title="My Schedule - Faculty" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaCalendarAlt className="mr-3 text-blue-600" />
                                My Schedule
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Your class timetable for {academicCalendar.semester} {academicCalendar.year_start}-{academicCalendar.year_end}
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Total Classes</p>
                                <p className="font-semibold text-blue-600">{schedule.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Day Filter */}
                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedDay('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedDay === 'all' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Days
                            </button>
                            {daysOfWeek.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        selectedDay === day 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {schedule.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                            <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Available</h3>
                            <p className="text-gray-600">You don't have any classes scheduled yet. Contact the registrar for class assignments.</p>
                        </div>
                    ) : (
                        <>
                            {/* Weekly View */}
                            {selectedDay === 'all' ? (
                                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                                    {daysOfWeek.map(day => (
                                        <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200">
                                            <div className={`p-4 rounded-t-lg ${getDayColor(day)}`}>
                                                <h3 className="font-semibold text-center">{day}</h3>
                                                <p className="text-xs text-center mt-1">
                                                    {groupedSchedule[day].length} {groupedSchedule[day].length === 1 ? 'class' : 'classes'}
                                                </p>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {groupedSchedule[day].length === 0 ? (
                                                    <p className="text-gray-500 text-sm text-center">No classes</p>
                                                ) : (
                                                    groupedSchedule[day].map((classItem) => (
                                                        <div key={classItem.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-medium text-sm text-gray-900">{classItem.subject_name}</h4>
                                                                <span className="text-xs text-gray-500">{classItem.subject_code}</span>
                                                            </div>
                                                            <div className="space-y-1 text-xs text-gray-600">
                                                                <div className="flex items-center">
                                                                    <FaClock className="mr-1" />
                                                                    {getTimeSlot(classItem.start_time, classItem.end_time)}
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <FaUsers className="mr-1" />
                                                                    {classItem.section_name}
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <FaMapMarkerAlt className="mr-1" />
                                                                    {classItem.room}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Daily View */
                                <div className="space-y-4">
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium mr-3 ${getDayColor(selectedDay)}`}>
                                                {selectedDay}
                                            </span>
                                            {filteredSchedule.length} {filteredSchedule.length === 1 ? 'Class' : 'Classes'}
                                        </h2>
                                        
                                        {filteredSchedule.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8">No classes scheduled for {selectedDay}</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filteredSchedule.map((classItem) => (
                                                    <div key={classItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900">{classItem.subject_name}</h3>
                                                                <p className="text-sm text-gray-600">{classItem.subject_code}</p>
                                                            </div>
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                {classItem.semester}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="space-y-2 text-sm text-gray-600">
                                                            <div className="flex items-center">
                                                                <FaClock className="mr-2 text-blue-500" />
                                                                {getTimeSlot(classItem.start_time, classItem.end_time)}
                                                            </div>
                                                            <div className="flex items-center">
                                                                <FaUsers className="mr-2 text-green-500" />
                                                                {classItem.section_name} • {classItem.strand_name || 'Core'}
                                                            </div>
                                                            <div className="flex items-center">
                                                                <FaMapMarkerAlt className="mr-2 text-red-500" />
                                                                {classItem.room}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                                            <div className="flex items-center justify-between">
                                                                <Link
                                                                    href={`/faculty/classes/${classItem.id}/students`}
                                                                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                                                >
                                                                    View Students
                                                                </Link>
                                                                <span className="text-xs text-gray-500">
                                                                    {classItem.students_count || 0} students
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Quick Actions */}
                    {schedule.length > 0 && (
                        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Link
                                    href="/faculty/semester"
                                    className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <FaBook className="text-blue-600 mr-3 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">Grade Management</p>
                                        <p className="text-sm text-gray-600">Manage grades for all classes</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/classes"
                                    className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <FaUsers className="text-green-600 mr-3 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">Class Lists</p>
                                        <p className="text-sm text-gray-600">View student lists</p>
                                    </div>
                                </Link>
                                
                                <Link
                                    href="/faculty/loads"
                                    className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <FaCalendarAlt className="text-purple-600 mr-3 text-xl" />
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
