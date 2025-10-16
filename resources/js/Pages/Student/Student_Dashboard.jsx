import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import StudentSidebar from '../layouts/Student_Sidebar';
import { 
    FaGraduationCap, 
    FaCalendarAlt, 
    FaChartBar, 
    FaBookOpen,
    FaUserGraduate,
    FaCheckCircle,
    FaExclamationTriangle,
    FaClock,
    FaSchool,
    FaUsers,
    FaTrophy,
    FaSpinner,
    FaBell,
    FaInfoCircle
} from 'react-icons/fa';

export default function StudentDashboard({ 
    user, 
    currentSchoolYear, 
    enrollment, 
    enrollmentStatus, 
    assignedSection, 
    strand, 
    subjectsCount 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch notifications on component mount
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/student/notifications', {
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data.notifications || []);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
    }, []);

    // HCI Principle 1: Visibility of system status
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'enrolled':
            case 'approved':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'pending':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'rejected':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'enrolled':
            case 'approved':
                return <FaCheckCircle className="text-green-500" />;
            case 'pending':
                return <FaClock className="text-yellow-500" />;
            case 'rejected':
                return <FaExclamationTriangle className="text-red-500" />;
            default:
                return <FaInfoCircle className="text-gray-500" />;
        }
    };

    // HCI Principle 2: Match between system and real world - Academic calendar display
    const formatSchoolYear = (schoolYear) => {
        if (!schoolYear) return 'No Active School Year';
        return `${schoolYear.year_start}-${schoolYear.year_end} ${schoolYear.semester === 1 ? '1st' : '2nd'} Semester`;
    };

    // HCI Principle 5: Error prevention - Show helpful messages
    const getEnrollmentMessage = () => {
        if (!currentSchoolYear) {
            return {
                type: 'warning',
                message: 'No active school year. Please contact the registrar.',
                action: null
            };
        }

        switch (enrollmentStatus?.toLowerCase()) {
            case 'enrolled':
            case 'approved':
                const sectionInfo = assignedSection?.name || assignedSection?.section_name || 'Unknown Section';
                const strandInfo = strand?.name || 'Unknown Strand';
                return {
                    type: 'success',
                    message: `You are successfully enrolled! Assigned to ${sectionInfo} (${strandInfo}).`,
                    action: null
                };
            case 'pending':
                return {
                    type: 'info',
                    message: 'Your enrollment is pending approval. Please wait for coordinator review.',
                    action: null
                };
            case 'rejected':
                return {
                    type: 'error',
                    message: 'Your enrollment was rejected. Please contact the coordinator for details.',
                    action: 'Contact Coordinator'
                };
            default:
                return {
                    type: 'warning',
                    message: 'You are not enrolled for this semester.',
                    action: 'Enroll Now'
                };
        }
    };

    const enrollmentMessage = getEnrollmentMessage();

    // HCI Principle 8: Aesthetic and minimalist design - Clean dashboard cards
    const DashboardCard = ({ icon: Icon, title, value, subtitle, color = 'blue', onClick = null }) => (
        <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 bg-${color}-500 rounded-lg flex items-center justify-center`}>
                            <Icon className="text-white text-lg" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                    </div>
                    <div className="ml-13">
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // HCI Principle 6: Recognition rather than recall - Visual academic information
    const AcademicInfoCard = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <FaSchool className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500">School Year</label>
                        <p className="text-sm font-semibold text-gray-900">
                            {formatSchoolYear(currentSchoolYear)}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Grade Level</label>
                        <p className="text-sm font-semibold text-gray-900">
                            {enrollment?.intended_grade_level ? `Grade ${enrollment.intended_grade_level}` : 'Not Set'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Strand</label>
                        <p className="text-sm font-semibold text-gray-900">
                            {strand?.name || 'Not Assigned'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Section</label>
                        <p className="text-sm font-semibold text-gray-900">
                            {assignedSection?.name || 'Not Assigned'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // HCI Principle 9: Help users recognize, diagnose, and recover from errors
    const EnrollmentStatusCard = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <FaUserGraduate className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enrollment Status</h3>
            </div>
            
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${getStatusColor(enrollmentStatus)}`}>
                {getStatusIcon(enrollmentStatus)}
                <div className="flex-1">
                    <p className="font-semibold">{enrollmentStatus}</p>
                    <p className="text-sm mt-1">{enrollmentMessage.message}</p>
                    {enrollmentMessage.action && (
                        <button className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                            {enrollmentMessage.action}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Head title="Student Dashboard" />
            
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
                                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Welcome back, {user?.firstname} {user?.lastname}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatSchoolYear(currentSchoolYear)}
                                    </p>
                                    <p className="text-xs text-gray-500">Current Academic Year</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <DashboardCard
                                icon={FaBookOpen}
                                title="Enrolled Subjects"
                                value={subjectsCount}
                                subtitle="This semester"
                                color="blue"
                            />
                            <DashboardCard
                                icon={FaChartBar}
                                title="Current GPA"
                                value="--"
                                subtitle="Not available yet"
                                color="green"
                            />
                            <DashboardCard
                                icon={FaCalendarAlt}
                                title="Attendance"
                                value="--"
                                subtitle="Not available yet"
                                color="purple"
                            />
                            <DashboardCard
                                icon={FaTrophy}
                                title="Academic Standing"
                                value="Good"
                                subtitle="Current status"
                                color="yellow"
                            />
                        </div>

                        {/* Main Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <EnrollmentStatusCard />
                                <AcademicInfoCard />
                            </div>
                            
                            <div className="space-y-6">
                                {/* Quick Actions */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                    <div className="space-y-3">
                                        <Link href="/student/schedule" className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                            <FaCalendarAlt className="text-blue-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">View Schedule</p>
                                                <p className="text-sm text-gray-500">Check your class timetable</p>
                                            </div>
                                        </Link>
                                        <Link href="/student/grades" className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                                            <FaChartBar className="text-green-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">View Grades</p>
                                                <p className="text-sm text-gray-500">Check your academic performance</p>
                                            </div>
                                        </Link>
                                        {enrollmentStatus === 'Not Enrolled' && (
                                            <Link href="/student/enrollment" className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                                                <FaUserGraduate className="text-purple-500" />
                                                <div>
                                                    <p className="font-medium text-gray-900">Enroll Now</p>
                                                    <p className="text-sm text-gray-500">Complete your semester enrollment</p>
                                                </div>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FaBell className="text-blue-500" />
                                        <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {notifications.length > 0 ? (
                                            notifications.map((notification, index) => (
                                                <div key={index} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <FaBell className="mx-auto text-gray-300 text-3xl mb-3" />
                                                <p className="text-gray-500">No notifications yet</p>
                                                <p className="text-sm text-gray-400">You'll see important updates here</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
