import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { FaClock, FaUsers, FaChartBar, FaCalendarAlt, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

export default function Faculty_LoadDashboard({ facultyLoad, classes, notifications, academicCalendar }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const getUtilizationColor = (percentage) => {
        if (percentage >= 100) return 'text-red-600 bg-red-100 border-red-200';
        if (percentage >= 80) return 'text-orange-600 bg-orange-100 border-orange-200';
        if (percentage >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-green-600 bg-green-100 border-green-200';
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const groupClassesByDay = (classes) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const grouped = {};
        
        days.forEach(day => {
            grouped[day] = classes.filter(cls => cls.day_of_week === day)
                                 .sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
        
        return grouped;
    };

    const groupedClasses = groupClassesByDay(classes);

    return (
        <>
            <Head title="My Teaching Loads" />
            <div className="flex min-h-screen bg-gray-50">
                <Faculty_Sidebar />
                <div className="flex-1 ml-16 lg:ml-72">
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Teaching Loads</h1>
                                    <p className="text-gray-600">View and manage your assigned classes and teaching schedule</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {currentTime.toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Load Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Load Utilization Card */}
                            <div className={`p-6 rounded-xl border-2 ${getUtilizationColor(facultyLoad.utilization_percentage)}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">Load Utilization</h3>
                                        <p className="text-sm opacity-75">Current teaching load status</p>
                                    </div>
                                    <FaChartBar className="w-8 h-8" />
                                </div>
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl font-bold">{facultyLoad.utilization_percentage.toFixed(0)}%</span>
                                        {facultyLoad.is_overloaded && (
                                            <FaExclamationTriangle className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                    <div className="w-full bg-white bg-opacity-50 rounded-full h-3">
                                        <div 
                                            className={`h-3 rounded-full ${facultyLoad.is_overloaded ? 'bg-red-500' : 'bg-current'}`}
                                            style={{ width: `${Math.min(facultyLoad.utilization_percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <p className="text-sm">
                                    {facultyLoad.total_loads} of {facultyLoad.max_loads} loads assigned
                                </p>
                            </div>

                            {/* Total Classes Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Total Classes</h3>
                                        <p className="text-sm text-gray-600">Active class assignments</p>
                                    </div>
                                    <FaUsers className="w-8 h-8 text-blue-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{classes.length}</div>
                                <p className="text-sm text-gray-600">
                                    {facultyLoad.remaining_loads} slots remaining
                                </p>
                            </div>

                            {/* Academic Calendar Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Current Semester</h3>
                                        <p className="text-sm text-gray-600">Academic period</p>
                                    </div>
                                    <FaCalendarAlt className="w-8 h-8 text-purple-500" />
                                </div>
                                <div className="text-xl font-bold text-gray-900 mb-1">
                                    {academicCalendar.semester}
                                </div>
                                <p className="text-sm text-gray-600">
                                    {academicCalendar.year_start}-{academicCalendar.year_end}
                                </p>
                                {academicCalendar.current_quarter && (
                                    <div className="mt-2">
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                            Quarter {academicCalendar.current_quarter}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notifications */}
                        {notifications && notifications.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
                                <div className="space-y-3">
                                    {notifications.map((notification, index) => (
                                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                                            notification.type === 'error' ? 'bg-red-50 border-red-400' :
                                            'bg-blue-50 border-blue-400'
                                        }`}>
                                            <div className="flex items-center">
                                                {notification.type === 'warning' ? (
                                                    <FaExclamationTriangle className="w-5 h-5 text-yellow-500 mr-3" />
                                                ) : notification.type === 'error' ? (
                                                    <FaExclamationTriangle className="w-5 h-5 text-red-500 mr-3" />
                                                ) : (
                                                    <FaCheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{notification.title}</p>
                                                    <p className="text-sm text-gray-600">{notification.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Weekly Schedule */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Schedule</h2>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="grid grid-cols-7 gap-0">
                                    {Object.entries(groupedClasses).map(([day, dayClasses]) => (
                                        <div key={day} className="border-r border-gray-200 last:border-r-0">
                                            <div className="bg-gray-50 p-4 border-b border-gray-200">
                                                <h3 className="font-semibold text-gray-900 text-center">{day}</h3>
                                            </div>
                                            <div className="p-2 min-h-[300px]">
                                                {dayClasses.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {dayClasses.map((cls) => (
                                                            <div key={cls.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <div className="text-sm font-medium text-blue-900 mb-1">
                                                                    {cls.subject_name}
                                                                </div>
                                                                <div className="text-xs text-blue-700 mb-1">
                                                                    {cls.section_name}
                                                                </div>
                                                                <div className="text-xs text-blue-600 flex items-center">
                                                                    <FaClock className="w-3 h-3 mr-1" />
                                                                    {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                                                                </div>
                                                                {cls.room && (
                                                                    <div className="text-xs text-blue-600 mt-1">
                                                                        Room: {cls.room}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-gray-400 text-sm mt-8">
                                                        No classes
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Class Details */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Details</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {classes.map((cls) => (
                                    <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">{cls.subject_name}</h3>
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                                {cls.semester}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center text-gray-600">
                                                <FaUsers className="w-4 h-4 mr-3" />
                                                <span>Section: {cls.section_name}</span>
                                            </div>
                                            
                                            <div className="flex items-center text-gray-600">
                                                <FaClock className="w-4 h-4 mr-3" />
                                                <span>{cls.day_of_week} {formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                                            </div>
                                            
                                            {cls.room && (
                                                <div className="flex items-center text-gray-600">
                                                    <FaCalendarAlt className="w-4 h-4 mr-3" />
                                                    <span>Room: {cls.room}</span>
                                                </div>
                                            )}
                                            
                                            {cls.strand_name && (
                                                <div className="mt-3">
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                                        {cls.strand_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex gap-2">
                                                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm">
                                                    View Students
                                                </button>
                                                <Link
                                                    href={`/faculty/grade-encoding/${cls.id}`}
                                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm text-center"
                                                >
                                                    Manage Grades
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {classes.length === 0 && (
                                <div className="text-center py-12">
                                    <FaUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
                                    <p className="text-gray-600">You don't have any classes assigned yet. Contact the registrar for class assignments.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
