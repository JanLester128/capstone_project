import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    FaUsers, 
    FaChalkboardTeacher, 
    FaUserGraduate, 
    FaClipboardCheck, 
    FaBookOpen, 
    FaSchool,
    FaChartBar,
    FaPlus,
    FaEye,
    FaCog
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';

export default function RegistrarDashboard({ user, stats }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const statCards = [
        {
            title: 'Total Faculty',
            value: stats?.total_faculty || 0,
            icon: FaChalkboardTeacher,
            color: 'bg-blue-500',
            link: '/registrar/faculty'
        },
        {
            title: 'Total Students',
            value: stats?.total_students || 0,
            icon: FaUserGraduate,
            color: 'bg-green-500',
            link: '/registrar/enrollment'
        },
        {
            title: 'Pending Enrollments',
            value: stats?.pending_enrollments || 0,
            icon: FaClipboardCheck,
            color: 'bg-yellow-500',
            link: '/registrar/enrollment'
        },
        {
            title: 'Pending Grades',
            value: stats?.pending_grades || 0,
            icon: FaBookOpen,
            color: 'bg-red-500',
            link: '/registrar/grades'
        },
        {
            title: 'Active Strands',
            value: stats?.total_strands || 0,
            icon: FaSchool,
            color: 'bg-purple-500',
            link: '/registrar/strands'
        },
        {
            title: 'Total Subjects',
            value: stats?.total_subjects || 0,
            icon: FaBookOpen,
            color: 'bg-indigo-500',
            link: '/registrar/subjects'
        }
    ];

    const quickActions = [
        {
            title: 'Create Faculty Account',
            description: 'Add new faculty member with auto-generated credentials',
            icon: FaPlus,
            color: 'bg-blue-600',
            link: '/registrar/faculty'
        },
        {
            title: 'Manage Strands',
            description: 'Create and manage academic strands',
            icon: FaSchool,
            color: 'bg-green-600',
            link: '/registrar/strands'
        },
        {
            title: 'Approve Enrollments',
            description: 'Review and approve student enrollment applications',
            icon: FaClipboardCheck,
            color: 'bg-yellow-600',
            link: '/registrar/enrollment'
        },
        {
            title: 'Grade Approval',
            description: 'Review and approve faculty-submitted grades',
            icon: FaBookOpen,
            color: 'bg-red-600',
            link: '/registrar/grades'
        },
        {
            title: 'View Reports',
            description: 'Generate enrollment and academic reports',
            icon: FaChartBar,
            color: 'bg-purple-600',
            link: '/registrar/reports'
        },
        {
            title: 'System Settings',
            description: 'Configure system settings and preferences',
            icon: FaCog,
            color: 'bg-gray-600',
            link: '/registrar/settings'
        }
    ];

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Registrar Dashboard - ONSTS" />
            <Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`flex-1 transition-all duration-300 ${
                sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Registrar Dashboard
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Welcome back, {user?.firstname} {user?.lastname}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                    {formatTime(currentTime)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {formatDate(currentTime)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {statCards.map((stat, index) => (
                            <Link
                                key={index}
                                href={stat.link}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="flex items-center">
                                    <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quickActions.map((action, index) => (
                                <Link
                                    key={index}
                                    href={action.link}
                                    className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                                >
                                    <div className="flex items-start">
                                        <div className={`${action.color} rounded-lg p-2 mr-3 group-hover:scale-110 transition-transform duration-200`}>
                                            <action.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                                                {action.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {action.description}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                System Overview
                            </h2>
                            <Link
                                href="/registrar/reports"
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                            >
                                <FaEye className="w-4 h-4 mr-1" />
                                View All Reports
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Enrollment Status */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Enrollment Status
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Pending:</span>
                                        <span className="font-medium text-yellow-600">
                                            {stats?.pending_enrollments || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Students:</span>
                                        <span className="font-medium text-green-600">
                                            {stats?.total_students || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Approval Status */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Grade Approval
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Pending Approval:</span>
                                        <span className="font-medium text-red-600">
                                            {stats?.pending_grades || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Faculty Members:</span>
                                        <span className="font-medium text-blue-600">
                                            {stats?.total_faculty || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
