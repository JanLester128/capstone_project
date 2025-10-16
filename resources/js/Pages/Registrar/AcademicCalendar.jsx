import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaCalendarAlt, FaPlus, FaEdit, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function AcademicCalendar({ schoolYears }) {
    const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
    const [viewMode, setViewMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [editingSchoolYear, setEditingSchoolYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calendarData, setCalendarData] = useState({
        enrollment_start: '',
        enrollment_end: '',
        quarter_1_start: '',
        quarter_1_end: '',
        quarter_2_start: '',
        quarter_2_end: '',
        quarter_3_start: '',
        quarter_3_end: '',
        quarter_4_start: '',
        quarter_4_end: '',
        grading_deadline: '',
        is_enrollment_open: false
    });

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const handleEditCalendar = (schoolYear) => {
        setEditingSchoolYear(schoolYear);
        setCalendarData({
            enrollment_start: formatDateForInput(schoolYear.enrollment_start),
            enrollment_end: formatDateForInput(schoolYear.enrollment_end),
            quarter_1_start: formatDateForInput(schoolYear.quarter_1_start),
            quarter_1_end: formatDateForInput(schoolYear.quarter_1_end),
            quarter_2_start: formatDateForInput(schoolYear.quarter_2_start),
            quarter_2_end: formatDateForInput(schoolYear.quarter_2_end),
            quarter_3_start: formatDateForInput(schoolYear.quarter_3_start),
            quarter_3_end: formatDateForInput(schoolYear.quarter_3_end),
            quarter_4_start: formatDateForInput(schoolYear.quarter_4_start),
            quarter_4_end: formatDateForInput(schoolYear.quarter_4_end),
            grading_deadline: formatDateForInput(schoolYear.grading_deadline),
            is_enrollment_open: schoolYear.is_enrollment_open || false
        });
        setShowCalendarModal(true);
    };

    const validateCalendarData = () => {
        const errors = [];
        
        // Validate enrollment period
        if (calendarData.enrollment_start && calendarData.enrollment_end) {
            if (new Date(calendarData.enrollment_start) >= new Date(calendarData.enrollment_end)) {
                errors.push('Enrollment end date must be after start date');
            }
        }
        
        // Validate quarters sequence
        const quarters = [
            { start: calendarData.quarter_1_start, end: calendarData.quarter_1_end, name: 'Quarter 1' },
            { start: calendarData.quarter_2_start, end: calendarData.quarter_2_end, name: 'Quarter 2' },
            { start: calendarData.quarter_3_start, end: calendarData.quarter_3_end, name: 'Quarter 3' },
            { start: calendarData.quarter_4_start, end: calendarData.quarter_4_end, name: 'Quarter 4' }
        ];
        
        quarters.forEach((quarter, index) => {
            if (quarter.start && quarter.end) {
                if (new Date(quarter.start) >= new Date(quarter.end)) {
                    errors.push(`${quarter.name} end date must be after start date`);
                }
            }
            
            // Check if quarters are in sequence
            if (index > 0 && quarter.start && quarters[index - 1].end) {
                if (new Date(quarter.start) <= new Date(quarters[index - 1].end)) {
                    errors.push(`${quarter.name} must start after ${quarters[index - 1].name} ends`);
                }
            }
        });
        
        return errors;
    };

    const handleSaveCalendar = async (e) => {
        e.preventDefault();
        
        // Validate data before submitting
        const validationErrors = validateCalendarData();
        if (validationErrors.length > 0) {
            Swal.fire({
                title: 'Validation Error',
                html: validationErrors.map(error => `• ${error}`).join('<br>'),
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
            return;
        }
        
        setLoading(true);

        try {
            // Clean data - remove empty strings
            const cleanedData = Object.fromEntries(
                Object.entries(calendarData).map(([key, value]) => [
                    key,
                    value === '' ? null : value
                ])
            );
            
            const response = await fetch(`/registrar/school-years/${editingSchoolYear.id}/calendar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(cleanedData)
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Academic calendar updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                setShowCalendarModal(false);
                router.reload();
            } else {
                const errorMessage = result.errors 
                    ? Object.values(result.errors).flat().join(', ')
                    : result.error || result.message || 'Failed to update academic calendar.';
                    
                Swal.fire({
                    title: 'Update Failed',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            console.error('Calendar update error:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to update academic calendar. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleEnrollment = async (schoolYearId, currentStatus) => {
        try {
            const response = await fetch(`/registrar/school-years/${schoolYearId}/toggle-enrollment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ is_enrollment_open: !currentStatus })
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: `Enrollment ${!currentStatus ? 'opened' : 'closed'} successfully.`,
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                router.reload();
            } else {
                Swal.fire({
                    title: 'Update Failed',
                    text: result.error || 'Failed to toggle enrollment status.',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to toggle enrollment status. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getQuarterStatus = (startDate, endDate) => {
        if (!startDate || !endDate) return 'not-set';
        
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (now < start) return 'upcoming';
        if (now > end) return 'completed';
        return 'active';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-100';
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            case 'completed': return 'text-gray-600 bg-gray-100';
            default: return 'text-orange-600 bg-orange-100';
        }
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="Academic Calendar - ONSTS" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Calendar</h1>
                            <p className="text-gray-600">Manage semester structure, enrollment periods, and grading deadlines</p>
                        </div>

                        {/* Academic Calendar Overview */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {schoolYears.map((schoolYear) => (
                                <div key={schoolYear.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                                    {/* School Year Header */}
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold text-gray-900">
                                                    {schoolYear.year_start}-{schoolYear.year_end}
                                                </h2>
                                                <p className="text-sm text-gray-600">{schoolYear.semester}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {schoolYear.is_active && (
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleEditCalendar(schoolYear)}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                                >
                                                    <FaEdit className="w-4 h-4" />
                                                    Edit Calendar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enrollment Period */}
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-gray-900">Enrollment Period</h3>
                                            <button
                                                onClick={() => toggleEnrollment(schoolYear.id, schoolYear.is_enrollment_open)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                    schoolYear.is_enrollment_open 
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                            >
                                                {schoolYear.is_enrollment_open ? 'Open' : 'Closed'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600">Start Date</p>
                                                <p className="font-medium">{formatDate(schoolYear.enrollment_start)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">End Date</p>
                                                <p className="font-medium">{formatDate(schoolYear.enrollment_end)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quarters */}
                                    <div className="p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Grading Quarters</h3>
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4].map((quarter) => {
                                                const startField = `quarter_${quarter}_start`;
                                                const endField = `quarter_${quarter}_end`;
                                                const status = getQuarterStatus(schoolYear[startField], schoolYear[endField]);
                                                
                                                return (
                                                    <div key={quarter} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-gray-900">Quarter {quarter}</p>
                                                            <p className="text-sm text-gray-600">
                                                                {formatDate(schoolYear[startField])} - {formatDate(schoolYear[endField])}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                                            {status === 'not-set' ? 'Not Set' : 
                                                             status === 'active' ? 'Active' :
                                                             status === 'upcoming' ? 'Upcoming' : 'Completed'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Grading Deadline */}
                                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-yellow-900">Grading Deadline</p>
                                                    <p className="text-sm text-yellow-700">{formatDate(schoolYear.grading_deadline)}</p>
                                                </div>
                                                <FaClock className="w-5 h-5 text-yellow-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Setup Modal */}
                        {showCalendarModal && (
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                                            Academic Calendar Setup - {editingSchoolYear?.year_start}-{editingSchoolYear?.year_end}
                                        </h2>
                                        
                                        <form onSubmit={handleSaveCalendar} className="space-y-6">
                                            {/* Enrollment Period */}
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h3 className="text-lg font-semibold text-blue-900 mb-4">Enrollment Period</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                                        <input
                                                            type="date"
                                                            value={calendarData.enrollment_start}
                                                            onChange={(e) => setCalendarData({...calendarData, enrollment_start: e.target.value})}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                                        <input
                                                            type="date"
                                                            value={calendarData.enrollment_end}
                                                            onChange={(e) => setCalendarData({...calendarData, enrollment_end: e.target.value})}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={calendarData.is_enrollment_open}
                                                            onChange={(e) => setCalendarData({...calendarData, is_enrollment_open: e.target.checked})}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm text-gray-700">Open enrollment immediately</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Quarters */}
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h3 className="text-lg font-semibold text-green-900 mb-4">Grading Quarters</h3>
                                                <p className="text-sm text-green-700 mb-4">Note: Quarters must be in chronological order. Each quarter's end date must be before the next quarter's start date.</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {[1, 2, 3, 4].map((quarter) => {
                                                        const isRelevantQuarter = editingSchoolYear?.semester === '1st Semester' 
                                                            ? quarter <= 2 
                                                            : quarter >= 3;
                                                        
                                                        return (
                                                            <div key={quarter} className={`bg-white p-4 rounded-lg border ${
                                                                isRelevantQuarter ? 'border-green-200' : 'border-gray-200 opacity-60'
                                                            }`}>
                                                                <h4 className="font-medium text-gray-900 mb-3">
                                                                    Quarter {quarter}
                                                                    {!isRelevantQuarter && (
                                                                        <span className="text-xs text-gray-500 ml-2">
                                                                            (Other Semester)
                                                                        </span>
                                                                    )}
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                                                        <input
                                                                            type="date"
                                                                            value={calendarData[`quarter_${quarter}_start`]}
                                                                            onChange={(e) => setCalendarData({
                                                                                ...calendarData, 
                                                                                [`quarter_${quarter}_start`]: e.target.value
                                                                            })}
                                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                                                            disabled={!isRelevantQuarter}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                                                        <input
                                                                            type="date"
                                                                            value={calendarData[`quarter_${quarter}_end`]}
                                                                            onChange={(e) => setCalendarData({
                                                                                ...calendarData, 
                                                                                [`quarter_${quarter}_end`]: e.target.value
                                                                            })}
                                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                                                            disabled={!isRelevantQuarter}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Grading Deadline */}
                                            <div className="bg-yellow-50 p-4 rounded-lg">
                                                <h3 className="text-lg font-semibold text-yellow-900 mb-4">Grading Deadline</h3>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Final Deadline for Grade Submission</label>
                                                    <input
                                                        type="date"
                                                        value={calendarData.grading_deadline}
                                                        onChange={(e) => setCalendarData({...calendarData, grading_deadline: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {loading ? 'Saving...' : 'Save Calendar'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCalendarModal(false)}
                                                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
