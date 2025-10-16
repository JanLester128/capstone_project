import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
    FaCog, 
    FaCalendarAlt, 
    FaToggleOn, 
    FaToggleOff, 
    FaSave, 
    FaInfoCircle,
    FaClock,
    FaUsers,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSync
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Settings({ 
    auth, 
    enrollmentSettings, 
    currentSchoolYear, 
    enrollmentStats = {} 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Helper function to format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };
    
    const [settings, setSettings] = useState({
        is_enrollment_open: currentSchoolYear?.is_enrollment_open || enrollmentSettings?.is_enrollment_open || false,
        enrollment_start_date: formatDateForInput(currentSchoolYear?.enrollment_start_date || currentSchoolYear?.enrollment_start || enrollmentSettings?.enrollment_start_date || ''),
        enrollment_end_date: formatDateForInput(currentSchoolYear?.enrollment_end_date || currentSchoolYear?.enrollment_end || enrollmentSettings?.enrollment_end_date || ''),
        allow_new_students: true,
        allow_continuing_students: true,
        allow_transferees: true
    });

    // Update settings when currentSchoolYear changes
    useEffect(() => {
        if (currentSchoolYear) {
            setSettings({
                is_enrollment_open: currentSchoolYear.is_enrollment_open || false,
                enrollment_start_date: formatDateForInput(currentSchoolYear.enrollment_start_date || currentSchoolYear.enrollment_start || ''),
                enrollment_end_date: formatDateForInput(currentSchoolYear.enrollment_end_date || currentSchoolYear.enrollment_end || ''),
                allow_new_students: true,
                allow_continuing_students: true,
                allow_transferees: true
            });
        }
    }, [currentSchoolYear]);

    const handleToggleEnrollment = async () => {
        const newStatus = !settings.is_enrollment_open;
        
        const result = await Swal.fire({
            title: `${newStatus ? 'Open' : 'Close'} Enrollment?`,
            text: `Are you sure you want to ${newStatus ? 'open' : 'close'} enrollment for ${currentSchoolYear?.year_start}-${currentSchoolYear?.year_end}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus ? '#059669' : '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${newStatus ? 'Open' : 'Close'} It`,
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            setLoading(true);
            
            try {
                const response = await fetch(`/registrar/school-years/${currentSchoolYear.id}/toggle-enrollment`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        is_enrollment_open: newStatus
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    setSettings(prev => ({
                        ...prev,
                        is_enrollment_open: newStatus
                    }));

                    Swal.fire({
                        title: 'Success!',
                        text: `Enrollment has been ${newStatus ? 'opened' : 'closed'} successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#3B82F6'
                    });

                    // Refresh page to get updated data
                    router.reload();
                } else {
                    throw new Error(data.message || 'Failed to update enrollment status');
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: error.message || 'Failed to update enrollment status',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSaveSettings = async () => {
        // Validate dates
        if (settings.enrollment_start_date && settings.enrollment_end_date) {
            if (new Date(settings.enrollment_start_date) >= new Date(settings.enrollment_end_date)) {
                Swal.fire({
                    title: 'Invalid Dates',
                    text: 'Enrollment end date must be after start date',
                    icon: 'warning',
                    confirmButtonColor: '#F59E0B'
                });
                return;
            }
        }

        setLoading(true);

        try {
            const response = await fetch(`/registrar/school-years/${currentSchoolYear.id}/enrollment-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (response.ok) {
                // Update local settings with the saved values to prevent clearing
                setSettings(prev => ({
                    ...prev,
                    ...data.settings
                }));

                Swal.fire({
                    title: 'Success!',
                    text: 'Enrollment settings saved successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                // Reload to get fresh data from server
                router.reload();
            } else {
                throw new Error(data.message || 'Failed to save settings');
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to save enrollment settings',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const getEnrollmentStatus = () => {
        if (!currentSchoolYear) {
            return {
                status: 'No Active School Year',
                color: 'gray',
                icon: FaExclamationTriangle,
                message: 'Please create an active school year first'
            };
        }

        if (settings.is_enrollment_open) {
            const now = new Date();
            const startDate = settings.enrollment_start_date ? new Date(settings.enrollment_start_date) : null;
            const endDate = settings.enrollment_end_date ? new Date(settings.enrollment_end_date) : null;

            if (startDate && endDate) {
                if (now < startDate) {
                    return {
                        status: 'Scheduled to Open',
                        color: 'yellow',
                        icon: FaClock,
                        message: `Will open on ${startDate.toLocaleDateString()}`
                    };
                } else if (now > endDate) {
                    return {
                        status: 'Enrollment Expired',
                        color: 'red',
                        icon: FaExclamationTriangle,
                        message: `Ended on ${endDate.toLocaleDateString()}`
                    };
                }
            }

            return {
                status: 'Enrollment Open',
                color: 'green',
                icon: FaCheckCircle,
                message: 'Students can now enroll'
            };
        }

        return {
            status: 'Enrollment Closed',
            color: 'red',
            icon: FaToggleOff,
            message: 'Students cannot enroll'
        };
    };

    const statusInfo = getEnrollmentStatus();
    const StatusIcon = statusInfo.icon;

    return (
        <>
            <Head title="Settings" />

            <div className="min-h-screen bg-gray-50 flex">
                <Sidebar 
                    auth={auth}
                    onToggle={setSidebarCollapsed}
                />

                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Manage system settings and enrollment controls
                                </p>
                            </div>
                            <button
                                onClick={() => router.reload()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <FaSync className="text-sm" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Current Status */}
                            <div className="space-y-6">
                                {/* Current Status Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 bg-${statusInfo.color}-500 rounded-lg flex items-center justify-center`}>
                                            <StatusIcon className="text-white text-lg" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
                                    </div>

                                    <div className={`p-4 rounded-lg border bg-${statusInfo.color}-50 border-${statusInfo.color}-200`}>
                                        <div className="flex items-center gap-3">
                                            <StatusIcon className={`text-${statusInfo.color}-600`} />
                                            <div>
                                                <p className={`font-semibold text-${statusInfo.color}-800`}>
                                                    {statusInfo.status}
                                                </p>
                                                <p className={`text-sm text-${statusInfo.color}-700`}>
                                                    {statusInfo.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {currentSchoolYear && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">School Year:</span>
                                                    <span className="font-medium">
                                                        {currentSchoolYear.year_start}-{currentSchoolYear.year_end}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Semester:</span>
                                                    <span className="font-medium">
                                                        {currentSchoolYear.semester === 1 ? '1st' : '2nd'} Semester
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Enrollment Statistics */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                            <FaUsers className="text-white text-lg" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Enrollment Stats</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Total Applications</span>
                                            <span className="font-semibold text-gray-900">
                                                {enrollmentStats.total || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Pending</span>
                                            <span className="font-semibold text-yellow-600">
                                                {enrollmentStats.pending || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Approved</span>
                                            <span className="font-semibold text-green-600">
                                                {enrollmentStats.approved || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Rejected</span>
                                            <span className="font-semibold text-red-600">
                                                {enrollmentStats.rejected || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Settings */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                            <FaCalendarAlt className="text-white text-lg" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Enrollment Controls</h3>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Quick Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-gray-900">Enrollment Status</h4>
                                                <p className="text-sm text-gray-600">
                                                    {settings.is_enrollment_open ? 'Students can enroll' : 'Students cannot enroll'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleToggleEnrollment}
                                                disabled={loading}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    settings.is_enrollment_open
                                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                                } disabled:opacity-50`}
                                            >
                                                {settings.is_enrollment_open ? (
                                                    <>
                                                        <FaToggleOff />
                                                        Close Enrollment
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaToggleOn />
                                                        Open Enrollment
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Enrollment Period with Auto-calculation */}
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-3">Enrollment Period</h4>
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-blue-700">
                                                    <strong>Auto-calculation rules:</strong><br/>
                                                    • 1st Semester: Enrollment starts 2 weeks before semester, lasts 1 week<br/>
                                                    • 2nd Semester: Enrollment starts 2 weeks before semester, lasts 1 week<br/>
                                                    <em>You can edit these dates if needed.</em>
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Enrollment Start 
                                                        <span className="text-xs text-blue-500 ml-2">(Auto-calculated, editable)</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={settings.enrollment_start_date}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            enrollment_start_date: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Enrollment End 
                                                        <span className="text-xs text-blue-500 ml-2">(Auto-calculated, editable)</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={settings.enrollment_end_date}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            enrollment_end_date: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Student Type Access */}
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-3">Student Type Access</h4>
                                            <div className="space-y-3">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.allow_new_students}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            allow_new_students: e.target.checked
                                                        }))}
                                                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700">Allow New Students (Grade 11)</span>
                                                </label>

                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.allow_continuing_students}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            allow_continuing_students: e.target.checked
                                                        }))}
                                                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700">Allow Continuing Students (Grade 12)</span>
                                                </label>

                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.allow_transferees}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            allow_transferees: e.target.checked
                                                        }))}
                                                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700">Allow Transferee Students</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Save Button */}
                                        <div className="pt-4 border-t border-gray-200">
                                            <button
                                                onClick={handleSaveSettings}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <FaSave />
                                                {loading ? 'Saving...' : 'Save Settings'}
                                            </button>
                                        </div>
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
