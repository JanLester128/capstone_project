import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import StudentSidebar from '../layouts/Student_Sidebar';
import { 
    FaCalendarAlt, 
    FaClock, 
    FaMapMarkerAlt,
    FaUser,
    FaBookOpen,
    FaDownload,
    FaPrint,
    FaInfoCircle,
    FaGraduationCap,
    FaSchool,
    FaSpinner
} from 'react-icons/fa';

export default function StudentSchedule({ user, currentSchoolYear, schedule }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedView, setSelectedView] = useState('weekly'); // weekly, daily, list
    const [loading, setLoading] = useState(false);
    const [scheduleData, setScheduleData] = useState(schedule || {});
    const [error, setError] = useState(null);

    // HCI Principle 2: Match between system and real world - Days of the week
    const daysOfWeek = [
        { key: 'Monday', label: 'Monday', short: 'Mon' },
        { key: 'Tuesday', label: 'Tuesday', short: 'Tue' },
        { key: 'Wednesday', label: 'Wednesday', short: 'Wed' },
        { key: 'Thursday', label: 'Thursday', short: 'Thu' },
        { key: 'Friday', label: 'Friday', short: 'Fri' },
        { key: 'Saturday', label: 'Saturday', short: 'Sat' }
    ];

    const timeSlots = [
        '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
        '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
        '4:00 PM', '4:30 PM', '5:00 PM'
    ];

    // HCI Principle 1: Visibility of system status - Format time display
    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Function to refresh COR schedule data
    const refreshSchedule = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Get authentication token
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch('/student/cor-schedule-data', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in again.');
                }
                throw new Error(`Failed to fetch schedule data (${response.status})`);
            }

            const data = await response.json();
            console.log('Schedule data received:', data);
            
            if (data.success) {
                setScheduleData(data.schedule || {});
                console.log('Schedule data set:', data.schedule);
            } else {
                setError(data.message || 'Failed to load COR schedule data');
            }
        } catch (error) {
            console.error('Error fetching COR schedule:', error);
            setError(error.message || 'Unable to load COR schedule. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Load schedule data on component mount if not provided
    useEffect(() => {
        if (!schedule || Object.keys(schedule).length === 0) {
            refreshSchedule();
        } else {
            // Use provided schedule data
            setScheduleData(schedule);
        }
    }, [schedule]);

    // HCI Principle 8: Aesthetic and minimalist design - Clean class card
    const ClassCard = ({ classData, isCompact = false }) => {
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
            'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
        ];
        
        const colorIndex = classData.subject_code ? 
            classData.subject_code.charCodeAt(0) % colors.length : 0;
        const bgColor = colors[colorIndex];

        if (isCompact) {
            return (
                <div className={`${bgColor} text-white p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}>
                    <div className="text-sm font-semibold truncate">{classData.subject_name}</div>
                    <div className="text-xs opacity-90 mt-1">
                        {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{classData.subject_name}</h3>
                        <p className="text-sm text-gray-500">{classData.subject_code}</p>
                    </div>
                    <div className={`w-4 h-4 ${bgColor} rounded-full`}></div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <FaUser className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-700">
                            {classData.faculty_firstname} {classData.faculty_lastname}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <FaClock className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-700">
                            {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <FaGraduationCap className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-700">{classData.section_name}</span>
                    </div>
                </div>
            </div>
        );
    };

    // HCI Principle 6: Recognition rather than recall - Weekly timetable view
    const WeeklyView = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
                <p className="text-sm text-gray-600 mt-1">Your class timetable for the week</p>
            </div>
            
            <div className="overflow-x-auto">
                <div className="grid grid-cols-7 min-w-full">
                    {/* Header */}
                    <div className="bg-gray-50 p-4 border-r border-gray-200 font-semibold text-gray-700">
                        Time
                    </div>
                    {daysOfWeek.map(day => (
                        <div key={day.key} className="bg-gray-50 p-4 border-r border-gray-200 font-semibold text-gray-700 text-center">
                            <div className="hidden md:block">{day.label}</div>
                            <div className="md:hidden">{day.short}</div>
                        </div>
                    ))}
                    
                    {/* Time slots */}
                    {timeSlots.map(timeSlot => (
                        <React.Fragment key={timeSlot}>
                            <div className="p-2 border-r border-b border-gray-200 text-sm text-gray-600 bg-gray-50">
                                {timeSlot}
                            </div>
                            {daysOfWeek.map(day => {
                                const dayClasses = scheduleData[day.key] || [];
                                const classAtTime = dayClasses.find(cls => 
                                    formatTime(cls.start_time) <= timeSlot && formatTime(cls.end_time) > timeSlot
                                );
                                
                                return (
                                    <div key={`${day.key}-${timeSlot}`} className="p-2 border-r border-b border-gray-200 min-h-[60px]">
                                        {classAtTime && (
                                            <ClassCard classData={classAtTime} isCompact={true} />
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );

    // HCI Principle 4: Consistency and standards - Daily view
    const DailyView = () => (
        <div className="space-y-6">
            {daysOfWeek.map(day => {
                const dayClasses = scheduleData[day.key] || [];
                
                return (
                    <div key={day.key} className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                            <p className="text-sm text-gray-600">
                                {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                            </p>
                        </div>
                        
                        <div className="p-6">
                            {dayClasses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {dayClasses.map((classData, index) => (
                                        <ClassCard key={index} classData={classData} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FaCalendarAlt className="mx-auto text-gray-300 text-3xl mb-3" />
                                    <p className="text-gray-500">No classes scheduled</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // HCI Principle 7: Flexibility and efficiency of use - List view
    const ListView = () => {
        // Collect all classes from all days
        const allClasses = [];
        Object.keys(scheduleData).forEach(day => {
            scheduleData[day].forEach(classData => {
                allClasses.push({ ...classData, day });
            });
        });

        // Sort by day and time
        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        allClasses.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) {
                return dayOrder[a.day] - dayOrder[b.day];
            }
            return a.start_time.localeCompare(b.start_time);
        });

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">All Classes</h2>
                    <p className="text-sm text-gray-600 mt-1">Complete list of your scheduled classes</p>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {allClasses.length > 0 ? (
                        allClasses.map((classData, index) => (
                            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                                <FaBookOpen className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {classData.subject_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">{classData.subject_code}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-gray-900">{classData.day}</div>
                                        <div className="text-sm text-gray-600">
                                            {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <FaUser className="text-gray-400" />
                                        {classData.faculty_firstname} {classData.faculty_lastname}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaGraduationCap className="text-gray-400" />
                                        {classData.section_name}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <FaCalendarAlt className="mx-auto text-gray-300 text-5xl mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No COR Schedule Available</h3>
                            <p className="text-gray-600">Your Certificate of Registration schedule will appear here once your enrollment is approved and COR is generated.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Head title="My COR Schedule" />
            
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
                                <h1 className="text-2xl font-bold text-gray-900">My COR Schedule</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Certificate of Registration schedule for {currentSchoolYear?.year_start}-{currentSchoolYear?.year_end}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Refresh Button */}
                                <button
                                    onClick={refreshSchedule}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <FaSpinner className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FaDownload className="w-4 h-4" />
                                    )}
                                    {loading ? 'Loading...' : 'Refresh'}
                                </button>

                                {/* View Selector */}
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setSelectedView('weekly')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            selectedView === 'weekly' 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Weekly
                                    </button>
                                    <button
                                        onClick={() => setSelectedView('daily')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            selectedView === 'daily' 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => setSelectedView('list')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            selectedView === 'list' 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        List
                                    </button>
                                </div>
                                
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                    <FaDownload className="text-sm" />
                                    Export Schedule
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {error ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                <FaInfoCircle className="mx-auto text-red-400 text-3xl mb-4" />
                                <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Schedule</h3>
                                <p className="text-red-700 mb-4">{error}</p>
                                <button
                                    onClick={refreshSchedule}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center py-12">
                                <FaSpinner className="text-blue-500 text-3xl animate-spin mr-4" />
                                <span className="text-lg text-gray-600">Loading your schedule...</span>
                            </div>
                        ) : (
                            <>
                                {selectedView === 'weekly' && <WeeklyView />}
                                {selectedView === 'daily' && <DailyView />}
                                {selectedView === 'list' && <ListView />}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
