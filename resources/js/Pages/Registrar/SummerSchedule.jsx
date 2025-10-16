import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { 
    FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaClock, 
    FaUser, FaBook, FaMapMarkerAlt, FaUsers, FaFilter,
    FaSpinner, FaCheck, FaTimes, FaSun, FaSearch, FaChevronDown
} from 'react-icons/fa';

export default function SummerSchedule({ summerEnrollments, subjects, faculty, schoolYears }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [filters, setFilters] = useState({
        school_year_id: '',
        faculty_id: '',
        day_of_week: ''
    });

    // Searchable subject dropdown state
    const [subjectSearch, setSubjectSearch] = useState('');
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [filteredSubjects, setFilteredSubjects] = useState(subjects || []);

    const [formData, setFormData] = useState({
        enrollment_id: '',
        subject_id: '',
        faculty_id: '',
        school_year_id: '',
        schedule_type: 'intensive',
        class_days: ['Monday'],
        start_time: '',
        end_time: '',
        room: '',
        start_date: '',
        end_date: '',
        total_hours: 40,
        is_active: true
    });

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        loadSchedules();
    }, [filters]);

    useEffect(() => {
        if (subjects) {
            const filtered = subjects.filter(subject =>
                subject.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                subject.code?.toLowerCase().includes(subjectSearch.toLowerCase())
            );
            setFilteredSubjects(filtered);
        }
    }, [subjectSearch, subjects]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.subject-dropdown-container')) {
                setShowSubjectDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`/registrar/summer-schedules?${params}`);
            const data = await response.json();
            
            if (data.success) {
                setSchedules(data.schedules);
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingSchedule 
                ? `/registrar/summer-schedules/${editingSchedule.id}`
                : '/registrar/summer-schedules';
            
            const method = editingSchedule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: result.message,
                    timer: 2000
                });
                setShowModal(false);
                resetForm();
                loadSchedules();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.error || 'Failed to save schedule'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save schedule. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            enrollment_id: schedule.enrollment_id,
            subject_id: schedule.subject_id,
            faculty_id: schedule.faculty_id,
            school_year_id: schedule.school_year_id,
            schedule_type: schedule.schedule_type,
            class_days: schedule.class_days || ['Monday'],
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            room: schedule.room || '',
            start_date: schedule.start_date,
            end_date: schedule.end_date,
            total_hours: schedule.total_hours,
            is_active: schedule.is_active
        });
        
        // Set subject search for editing
        const subject = subjects?.find(s => s.id == schedule.subject_id);
        setSubjectSearch(subject ? subject.name : '');
        setShowSubjectDropdown(false);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Schedule?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Delete'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/summer-schedules/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    }
                });

                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', data.message, 'success');
                    loadSchedules();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete schedule', 'error');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            enrollment_id: '',
            subject_id: '',
            faculty_id: '',
            school_year_id: '',
            schedule_type: 'intensive',
            class_days: ['Monday'],
            start_time: '',
            end_time: '',
            room: '',
            start_date: '',
            end_date: '',
            total_hours: 40,
            is_active: true
        });
        setEditingSchedule(null);
        setSubjectSearch('');
        setShowSubjectDropdown(false);
    };

    const handleSubjectSelect = (subject) => {
        setFormData({...formData, subject_id: subject.id});
        setSubjectSearch(subject.name);
        setShowSubjectDropdown(false);
    };

    const getSelectedSubjectName = () => {
        if (!formData.subject_id) return '';
        const subject = subjects?.find(s => s.id == formData.subject_id);
        return subject ? subject.name : '';
    };

    // Calculate end date (2 months from start date)
    const calculateEndDate = (startDate) => {
        if (!startDate) return '';
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(start.getMonth() + 2);
        return end.toISOString().split('T')[0];
    };

    // Calculate total hours based on start date, end date, class days, and time duration
    const calculateTotalHours = (startDate, endDate, classDays, startTime, endTime) => {
        if (!startDate || !endDate || !classDays.length || !startTime || !endTime) {
            return 40; // Default hours
        }

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Calculate daily hours
            const startHour = new Date(`2000-01-01T${startTime}`);
            const endHour = new Date(`2000-01-01T${endTime}`);
            const dailyHours = (endHour - startHour) / (1000 * 60 * 60); // Convert to hours
            
            // Count class days between start and end date
            let totalClassDays = 0;
            const currentDate = new Date(start);
            
            while (currentDate <= end) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
                if (classDays.includes(dayName)) {
                    totalClassDays++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return Math.round(totalClassDays * dailyHours);
        } catch (error) {
            return 40; // Default on error
        }
    };

    // Handle start date change
    const handleStartDateChange = (startDate) => {
        const endDate = calculateEndDate(startDate);
        const totalHours = calculateTotalHours(
            startDate, 
            endDate, 
            formData.class_days, 
            formData.start_time, 
            formData.end_time
        );
        
        setFormData({
            ...formData, 
            start_date: startDate,
            end_date: endDate,
            total_hours: totalHours
        });
    };

    // Handle other field changes that affect total hours
    const handleFieldChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };
        
        // Recalculate total hours if relevant fields changed
        if (['class_days', 'start_time', 'end_time'].includes(field) && newFormData.start_date && newFormData.end_date) {
            newFormData.total_hours = calculateTotalHours(
                newFormData.start_date,
                newFormData.end_date,
                newFormData.class_days,
                newFormData.start_time,
                newFormData.end_time
            );
        }
        
        setFormData(newFormData);
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <>
            <Head title="Summer Schedule - ONSTS" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={setSidebarCollapsed} />
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                                        <FaSun className="mr-3 text-orange-500" />
                                        Summer Schedule Management
                                    </h1>
                                    <p className="text-gray-600">Manage summer class schedules and assignments</p>
                                </div>
                                <button
                                    onClick={() => {
                                        resetForm();
                                        setShowModal(true);
                                    }}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <FaPlus className="w-4 h-4" />
                                    Add Schedule
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-gray-500" />
                                    <span className="font-medium text-gray-700">Filters:</span>
                                </div>
                                
                                <select
                                    value={filters.school_year_id}
                                    onChange={(e) => setFilters({...filters, school_year_id: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All School Years</option>
                                    {schoolYears.map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.year_start}-{year.year_end} ({year.semester})
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filters.faculty_id}
                                    onChange={(e) => setFilters({...filters, faculty_id: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Faculty</option>
                                    {faculty.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.firstname} {member.lastname}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filters.day_of_week}
                                    onChange={(e) => setFilters({...filters, day_of_week: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Days</option>
                                    {daysOfWeek.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Schedule Grid */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <FaSpinner className="animate-spin text-3xl text-blue-600" />
                                </div>
                            ) : schedules.length === 0 ? (
                                <div className="text-center py-12">
                                    <FaSun className="mx-auto text-4xl text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Summer Schedules</h3>
                                    <p className="text-gray-600 mb-6">Create your first summer schedule to get started.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {schedules.map((schedule) => (
                                                <tr key={schedule.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaBook className="w-4 h-4 text-blue-500 mr-2" />
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {schedule.subject?.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaUser className="w-4 h-4 text-green-500 mr-2" />
                                                            <span className="text-sm text-gray-900">
                                                                {schedule.faculty?.firstname} {schedule.faculty?.lastname}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            <div className="flex items-center">
                                                                <FaCalendarAlt className="w-4 h-4 text-purple-500 mr-2" />
                                                                {schedule.day_of_week}
                                                            </div>
                                                            <div className="flex items-center mt-1">
                                                                <FaClock className="w-4 h-4 text-orange-500 mr-2" />
                                                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaMapMarkerAlt className="w-4 h-4 text-red-500 mr-2" />
                                                            <span className="text-sm text-gray-900">
                                                                {schedule.room?.full_name || 'TBA'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaUsers className="w-4 h-4 text-indigo-500 mr-2" />
                                                            <span className="text-sm text-gray-900">
                                                                {schedule.current_enrollment_count || 0}/{schedule.max_students}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            schedule.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            schedule.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {schedule.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEdit(schedule)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(schedule.id)}
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
                            )}
                        </div>

                        {/* Modal */}
                        {showModal && (
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                                            {editingSchedule ? 'Edit Summer Schedule' : 'Add Summer Schedule'}
                                        </h2>
                                        
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Summer Class</label>
                                                    <select
                                                        value={formData.enrollment_id}
                                                        onChange={(e) => setFormData({...formData, enrollment_id: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Select Summer Enrollment</option>
                                                        {summerEnrollments && summerEnrollments.length > 0 ? (
                                                            summerEnrollments.map(enrollment => (
                                                                <option key={enrollment.id} value={enrollment.id}>
                                                                    {enrollment.studentPersonalInfo?.user?.firstname} {enrollment.studentPersonalInfo?.user?.lastname} - {enrollment.assignedSection?.section_name}
                                                                </option>
                                                            ))
                                                        ) : (
                                                            <option value="" disabled>No summer enrollments available</option>
                                                        )}
                                                    </select>
                                                    {(!summerEnrollments || summerEnrollments.length === 0) && (
                                                        <div className="text-xs text-orange-600 mt-1 p-2 bg-orange-50 rounded border border-orange-200">
                                                            <strong>No Students Available for Summer Classes</strong>
                                                            <p className="mt-1">Students appear here when they:</p>
                                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                                <li>Have <strong>failed grades</strong> (below 75) in approved subjects</li>
                                                                <li>Are marked as <strong>"summer_required"</strong> in their enrollment status</li>
                                                                <li>Are enrolled with <strong>enrollment_type = "summer"</strong></li>
                                                            </ul>
                                                            <p className="mt-2 text-orange-700">
                                                                💡 <strong>Tip:</strong> Check Semester Progression to see students with failed grades, or use Coordinator's Summer Enrollment feature.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                                    <div className="relative subject-dropdown-container">
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={subjectSearch || getSelectedSubjectName()}
                                                                onChange={(e) => {
                                                                    setSubjectSearch(e.target.value);
                                                                    setShowSubjectDropdown(true);
                                                                    if (!e.target.value) {
                                                                        setFormData({...formData, subject_id: ''});
                                                                    }
                                                                }}
                                                                onFocus={() => setShowSubjectDropdown(true)}
                                                                placeholder="Search subjects..."
                                                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                required
                                                            />
                                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                                <FaSearch className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                        </div>
                                                        
                                                        {showSubjectDropdown && (
                                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                {filteredSubjects.length === 0 ? (
                                                                    <div className="p-3 text-gray-500 text-center">
                                                                        No subjects found
                                                                    </div>
                                                                ) : (
                                                                    filteredSubjects.map(subject => (
                                                                        <div
                                                                            key={subject.id}
                                                                            onClick={() => handleSubjectSelect(subject)}
                                                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                                        >
                                                                            <div className="font-medium text-gray-900">
                                                                                {subject.name}
                                                                            </div>
                                                                            {subject.code && (
                                                                                <div className="text-sm text-gray-500">
                                                                                    Code: {subject.code}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                                                    <select
                                                        value={formData.faculty_id}
                                                        onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Select Faculty</option>
                                                        {faculty.map(member => (
                                                            <option key={member.id} value={member.id}>
                                                                {member.firstname} {member.lastname}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Room (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.room}
                                                        onChange={(e) => setFormData({...formData, room: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        placeholder="e.g., Room 101, Lab A"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                                                    <select
                                                        value={formData.schedule_type}
                                                        onChange={(e) => setFormData({...formData, schedule_type: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="intensive">Intensive</option>
                                                        <option value="regular">Regular</option>
                                                        <option value="weekend">Weekend</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Class Days</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {daysOfWeek.map(day => (
                                                            <label key={day} className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.class_days.includes(day)}
                                                                    onChange={(e) => {
                                                                        const newDays = e.target.checked
                                                                            ? [...formData.class_days, day]
                                                                            : formData.class_days.filter(d => d !== day);
                                                                        handleFieldChange('class_days', newDays);
                                                                    }}
                                                                    className="mr-2"
                                                                />
                                                                <span className="text-sm">{day.slice(0, 3)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.start_time}
                                                        onChange={(e) => handleFieldChange('start_time', e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.end_time}
                                                        onChange={(e) => handleFieldChange('end_time', e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={formData.start_date}
                                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        End Date 
                                                        <span className="text-xs text-gray-500 ml-1">(Auto: +2 months)</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={formData.end_date}
                                                        readOnly
                                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Total Hours 
                                                        <span className="text-xs text-gray-500 ml-1">(Auto-calculated)</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.total_hours}
                                                        readOnly
                                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Based on: Class days × Daily hours × Duration
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">School Year</label>
                                                    <select
                                                        value={formData.school_year_id}
                                                        onChange={(e) => setFormData({...formData, school_year_id: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Select School Year</option>
                                                        {schoolYears.map(year => (
                                                            <option key={year.id} value={year.id}>
                                                                {year.year_start}-{year.year_end} ({year.semester})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {editingSchedule && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                                    <select
                                                        value={formData.is_active ? 'active' : 'inactive'}
                                                        onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex gap-3 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <FaSpinner className="animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaCheck />
                                                            {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowModal(false);
                                                        resetForm();
                                                    }}
                                                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
                                                >
                                                    <FaTimes />
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
