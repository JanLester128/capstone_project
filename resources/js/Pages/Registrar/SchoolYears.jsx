import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaCalendarAlt, FaClock } from 'react-icons/fa';

export default function SchoolYears({ schoolYears }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSchoolYear, setEditingSchoolYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [formData, setFormData] = useState({
        year_start: new Date().getFullYear(),
        year_end: new Date().getFullYear() + 1,
        semester: '1st Semester',
        start_date: '',
        end_date: '',
        enrollment_start_date: '',
        enrollment_end_date: '',
        quarter_1_start: '',
        quarter_1_end: '',
        quarter_2_start: '',
        quarter_2_end: '',
        quarter_3_start: '',
        quarter_3_end: '',
        quarter_4_start: '',
        quarter_4_end: '',
        grading_deadline: '',
        is_active: false,
        is_enrollment_open: false,
    });

    // Debug: Monitor formData changes
    useEffect(() => {
        if (editingSchoolYear) {
            console.log('🔍 FormData state changed (during render):', {
                quarter_1_start: formData.quarter_1_start,
                quarter_1_end: formData.quarter_1_end,
                start_date: formData.start_date,
                end_date: formData.end_date
            });
        }
    }, [formData, editingSchoolYear]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const resetForm = () => {
        setFormData({
            year_start: new Date().getFullYear(),
            year_end: new Date().getFullYear() + 1,
            semester: '1st Semester',
            start_date: '',
            end_date: '',
            enrollment_start_date: '',
            enrollment_end_date: '',
            quarter_1_start: '',
            quarter_1_end: '',
            quarter_2_start: '',
            quarter_2_end: '',
            quarter_3_start: '',
            quarter_3_end: '',
            quarter_4_start: '',
            quarter_4_end: '',
            grading_deadline: '',
            is_active: false,
            is_enrollment_open: false,
        });
        setEditingSchoolYear(null);
    };

    // Auto-calculate dates based on start date
    const calculateDatesFromStart = (startDate, semester) => {
        if (!startDate) {
            console.log('❌ calculateDatesFromStart: No start date provided');
            return {};
        }

        console.log('🔄 Calculating dates for:', { startDate, semester });
        const start = new Date(startDate);
        const dates = {};

        if (semester === '1st Semester') {
            // 1st Semester: 5 months (August - December)
            const semesterEnd = new Date(start);
            semesterEnd.setMonth(start.getMonth() + 5);
            semesterEnd.setDate(semesterEnd.getDate() - 1);

            dates.end_date = semesterEnd.toISOString().split('T')[0];
            console.log('📅 1st Semester end_date:', dates.end_date);


            // Quarter 1: First 2.5 months of 1st semester (Aug - mid Oct)
            dates.quarter_1_start = start.toISOString().split('T')[0];
            const q1End = new Date(start);
            q1End.setMonth(start.getMonth() + 2);
            q1End.setDate(q1End.getDate() + 15); // 2.5 months
            dates.quarter_1_end = q1End.toISOString().split('T')[0];

            // Quarter 2: Last 2.5 months of 1st semester (mid Oct - Dec)
            const q2Start = new Date(q1End);
            q2Start.setDate(q2Start.getDate() + 1);
            dates.quarter_2_start = q2Start.toISOString().split('T')[0];
            dates.quarter_2_end = semesterEnd.toISOString().split('T')[0];

            console.log('📅 1st Semester quarters:', {
                q1: { start: dates.quarter_1_start, end: dates.quarter_1_end },
                q2: { start: dates.quarter_2_start, end: dates.quarter_2_end }
            });

            // 1st Semester: Clear Quarter 3 & 4 (they belong to 2nd semester)
            dates.quarter_3_start = '';
            dates.quarter_3_end = '';
            dates.quarter_4_start = '';
            dates.quarter_4_end = '';

            // Grading deadline: 1 month after 1st semester ends
            const gradingDeadline = new Date(semesterEnd);
            gradingDeadline.setMonth(semesterEnd.getMonth() + 1);
            dates.grading_deadline = gradingDeadline.toISOString().split('T')[0];

            console.log('📅 1st Semester grading deadline:', dates.grading_deadline);

        } else if (semester === '2nd Semester') {
            // 2nd Semester: 5 months (January - May)
            const semesterEnd = new Date(start);
            semesterEnd.setMonth(start.getMonth() + 5);
            semesterEnd.setDate(semesterEnd.getDate() - 1);

            dates.end_date = semesterEnd.toISOString().split('T')[0];
            console.log('📅 2nd Semester end_date:', dates.end_date);


            // 2nd Semester: Clear Quarter 1 & 2 (they belong to 1st semester)
            dates.quarter_1_start = '';
            dates.quarter_1_end = '';
            dates.quarter_2_start = '';
            dates.quarter_2_end = '';

            // Quarter 3: First 2.5 months of 2nd semester (Jan - mid Mar)
            dates.quarter_3_start = start.toISOString().split('T')[0];
            const q3End = new Date(start);
            q3End.setMonth(start.getMonth() + 2);
            q3End.setDate(q3End.getDate() + 15);
            dates.quarter_3_end = q3End.toISOString().split('T')[0];

            // Quarter 4: Last 2.5 months of 2nd semester (mid Mar - May)
            const q4Start = new Date(q3End);
            q4Start.setDate(q4Start.getDate() + 1);
            dates.quarter_4_start = q4Start.toISOString().split('T')[0];
            dates.quarter_4_end = semesterEnd.toISOString().split('T')[0];

            console.log('📅 2nd Semester quarters:', {
                q3: { start: dates.quarter_3_start, end: dates.quarter_3_end },
                q4: { start: dates.quarter_4_start, end: dates.quarter_4_end }
            });

            // Grading deadline: 1 month after academic year ends
            const gradingDeadline = new Date(semesterEnd);
            gradingDeadline.setMonth(semesterEnd.getMonth() + 1);
            dates.grading_deadline = gradingDeadline.toISOString().split('T')[0];

            console.log('📅 2nd Semester grading deadline:', dates.grading_deadline);
        }

        console.log('✅ Final calculated dates:', dates);
        return dates;
    };

    // Handle start date change and auto-calculate other dates
    const handleStartDateChange = (startDate) => {
        const calculatedDates = calculateDatesFromStart(startDate, formData.semester);
        setFormData({
            ...formData,
            start_date: startDate,
            ...calculatedDates
        });
    };

    // Handle semester change and recalculate dates if start date exists
    const handleSemesterChange = (semester) => {
        const calculatedDates = formData.start_date 
            ? calculateDatesFromStart(formData.start_date, semester)
            : {};
        
        setFormData({
            ...formData,
            semester: semester,
            ...calculatedDates
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);


        try {
            const url = editingSchoolYear 
                ? `/registrar/school-years/${editingSchoolYear.id}`
                : '/registrar/school-years';
            
            const method = editingSchoolYear ? 'PUT' : 'POST';

            // Clean form data - convert empty strings to null for optional fields
            const cleanedFormData = {};
            Object.keys(formData).forEach(key => {
                if (formData[key] === '' && (
                    key.includes('quarter_') || 
                    key.includes('grading_deadline')
                )) {
                    cleanedFormData[key] = null;
                } else {
                    cleanedFormData[key] = formData[key];
                }
            });

            console.log('🔄 Submitting school year:', {
                url,
                method,
                formData: cleanedFormData
            });

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(cleanedFormData)
            });

            console.log('📡 Response status:', response.status);
            const result = await response.json();
            console.log('📋 Response data:', result);
            console.log('✅ Response OK?', response.ok);
            console.log('🔍 Result success?', result.success);

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                setShowModal(false);
                resetForm();
                window.location.reload();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: result.message || 'Failed to save school year',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to save school year. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (schoolYear) => {
        console.log('🔧 Editing school year:', schoolYear);

        // Set basic form data
        const basicFormData = {
            year_start: schoolYear.year_start ?? new Date().getFullYear(),
            year_end: schoolYear.year_end ?? new Date().getFullYear() + 1,
            semester: schoolYear.semester ?? '1st Semester',
            start_date: schoolYear.start_date ?? '',
            end_date: schoolYear.end_date ?? '',
            enrollment_start_date: schoolYear.enrollment_start_date ?? schoolYear.enrollment_start ?? '',
            enrollment_end_date: schoolYear.enrollment_end_date ?? schoolYear.enrollment_end ?? '',
            quarter_1_start: schoolYear.quarter_1_start ?? '',
            quarter_1_end: schoolYear.quarter_1_end ?? '',
            quarter_2_start: schoolYear.quarter_2_start ?? '',
            quarter_2_end: schoolYear.quarter_2_end ?? '',
            quarter_3_start: schoolYear.quarter_3_start ?? '',
            quarter_3_end: schoolYear.quarter_3_end ?? '',
            quarter_4_start: schoolYear.quarter_4_start ?? '',
            quarter_4_end: schoolYear.quarter_4_end ?? '',
            grading_deadline: schoolYear.grading_deadline ?? '',
            is_active: Boolean(schoolYear.is_active),
            is_enrollment_open: Boolean(schoolYear.is_enrollment_open),
        };

        // If we have a start_date and semester, recalculate the dates to ensure they're populated
        if (basicFormData.start_date && basicFormData.semester) {
            const calculatedDates = calculateDatesFromStart(basicFormData.start_date, basicFormData.semester);

            console.log('📊 Calculated dates:', calculatedDates);

            // Merge calculated dates with existing values, but ensure calculated dates are never empty
            const finalFormData = {
                ...basicFormData,
                quarter_1_start: calculatedDates.quarter_1_start || schoolYear.quarter_1_start || '',
                quarter_1_end: calculatedDates.quarter_1_end || schoolYear.quarter_1_end || '',
                quarter_2_start: calculatedDates.quarter_2_start || schoolYear.quarter_2_start || '',
                quarter_2_end: calculatedDates.quarter_2_end || schoolYear.quarter_2_end || '',
                quarter_3_start: calculatedDates.quarter_3_start || schoolYear.quarter_3_start || '',
                quarter_3_end: calculatedDates.quarter_3_end || schoolYear.quarter_3_end || '',
                quarter_4_start: calculatedDates.quarter_4_start || schoolYear.quarter_4_start || '',
                quarter_4_end: calculatedDates.quarter_4_end || schoolYear.quarter_4_end || '',
                grading_deadline: calculatedDates.grading_deadline || schoolYear.grading_deadline || '',
                end_date: calculatedDates.end_date || schoolYear.end_date || '',
            };

            console.log('📋 Final form data:', finalFormData);

            setFormData(finalFormData);

            // Debug: Check formData state right after setting it
            console.log('🔍 FormData state after setFormData:', {
                quarter_1_start: finalFormData.quarter_1_start,
                quarter_1_end: finalFormData.quarter_1_end,
                start_date: finalFormData.start_date,
                end_date: finalFormData.end_date
            });
        } else {
            console.log('📋 Using basic form data (no recalculation needed)');
            setFormData(basicFormData);
        }

        setEditingSchoolYear(schoolYear);
        setShowModal(true);
    };

    const handleDelete = async (schoolYearId, yearInfo) => {
        const result = await Swal.fire({
            title: 'Delete School Year?',
            text: `Are you sure you want to delete ${yearInfo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/school-years/${schoolYearId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Deleted!', data.message, 'success');
                    window.location.reload();
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete school year.', 'error');
            }
        }
    };

    const toggleStatus = async (schoolYearId, currentStatus) => {
        try {
            const response = await fetch(`/registrar/school-years/${schoolYearId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                window.location.reload();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: result.message,
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to update status.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        }
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="School Years Management" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">School Years Management</h1>
                            <p className="text-gray-600">Manage academic years and semesters</p>
                        </div>

                        {/* Actions */}
                        <div className="mb-6">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowModal(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <FaPlus className="w-4 h-4" />
                                Add New School Year
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">School Years List</h2>
                            
                            {schoolYears && schoolYears.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Academic Year
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Semester
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Start Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    End Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {schoolYears.map((schoolYear) => (
                                                <tr key={schoolYear.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaCalendarAlt className="w-4 h-4 text-blue-500 mr-2" />
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {schoolYear.year_start}-{schoolYear.year_end}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                                            {schoolYear.semester}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(schoolYear.start_date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(schoolYear.end_date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {schoolYear.is_active ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                                <FaToggleOn className="w-3 h-3 mr-1" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                                <FaToggleOff className="w-3 h-3 mr-1" />
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEdit(schoolYear)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleStatus(schoolYear.id, schoolYear.is_active)}
                                                            className={`mr-3 ${schoolYear.is_active ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}`}
                                                        >
                                                            {schoolYear.is_active ? <FaToggleOn className="w-4 h-4" /> : <FaToggleOff className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(schoolYear.id, `${schoolYear.year_start}-${schoolYear.year_end} (${schoolYear.semester})`)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            <FaTrash className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FaCalendarAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No School Years Found</h3>
                                    <p className="text-gray-500 mb-6">Get started by creating your first academic year.</p>
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setShowModal(true);
                                        }}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                                    >
                                        <FaPlus className="w-4 h-4" />
                                        Create School Year
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* School Year Modal */}
                        {showModal && (
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                                            {editingSchoolYear ? 'Edit School Year' : 'Add New School Year'}
                                        </h2>

                                        {/* Information Box */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                            <div className="flex items-start">
                                                <FaClock className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                                                <div>
                                                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Automatic Date Calculation</h3>
                                                    <div className="text-sm text-blue-800 space-y-1">
                                                        <p>• <strong>Academic Year:</strong> 10 months total (August-May)</p>
                                                        <p>• <strong>Semester Duration:</strong> 5 months each (1st: Aug-Dec, 2nd: Jan-May)</p>
                                                        <p>• <strong>Quarter System:</strong> 2 quarters per semester</p>
                                                        <p className="ml-4">- <strong>1st Semester:</strong> Q1 (Aug-Oct) + Q2 (Oct-Dec)</p>
                                                        <p className="ml-4">- <strong>2nd Semester:</strong> Q3 (Jan-Mar) + Q4 (Mar-May)</p>
                                                        <p>• <strong>Grading Deadline:</strong> 1 month after semester ends</p>
                                                        <p className="mt-2 font-medium">Select semester and start date - relevant quarters will be calculated automatically!</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {/* Basic Information */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Year</label>
                                                    <input
                                                        type="number"
                                                        value={formData.year_start}
                                                        onChange={(e) => setFormData({...formData, year_start: parseInt(e.target.value)})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        min="2020"
                                                        max="2050"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Year</label>
                                                    <input
                                                        type="number"
                                                        value={formData.year_end}
                                                        onChange={(e) => setFormData({...formData, year_end: parseInt(e.target.value)})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        min="2020"
                                                        max="2050"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                                                    <select
                                                        value={formData.semester}
                                                        onChange={(e) => handleSemesterChange(e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="1st Semester">1st Semester</option>
                                                        <option value="2nd Semester">2nd Semester</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Grading Deadline 
                                                        <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={formData.grading_deadline || ''}
                                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                        readOnly
                                                    />
                                                </div>
                                            </div>

                                            {/* Semester Dates */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Semester Dates</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Start Date 
                                                            <span className="text-xs text-blue-600 ml-2">(Auto-calculates all other dates)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.start_date || ''}
                                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            End Date 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.end_date || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enrollment Dates */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Period</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Enrollment Start Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.enrollment_start_date || ''}
                                                            onChange={(e) => setFormData({...formData, enrollment_start_date: e.target.value})}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Enrollment End Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.enrollment_end_date || ''}
                                                            onChange={(e) => setFormData({...formData, enrollment_end_date: e.target.value})}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quarter Dates */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarter Dates</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 1 Start 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_1_start || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 1 End 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_1_end || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 2 Start 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_2_start || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 2 End 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_2_end || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 3 Start 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_3_start || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 3 End 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_3_end || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 4 Start 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_4_start || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Quarter 4 End 
                                                            <span className="text-xs text-gray-500 ml-2">(Auto-calculated)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={formData.quarter_4_end || ''}
                                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                            readOnly
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Options */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
                                                <div className="space-y-3">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.is_active}
                                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Set as active school year</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.is_enrollment_open}
                                                            onChange={(e) => setFormData({...formData, is_enrollment_open: e.target.checked})}
                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Open enrollment</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-6">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {loading ? 'Saving...' : (editingSchoolYear ? 'Update School Year' : 'Create School Year')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowModal(false);
                                                        resetForm();
                                                    }}
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
