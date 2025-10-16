import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaBook, FaSchool } from 'react-icons/fa';

export default function ScheduleManagement({ schedules, subjects, sections, faculty, strands, activeSchoolYear }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
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
        strand_id: '',
        subject_id: '',
        section_id: '',
        faculty_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        semester: activeSchoolYear?.semester || '1st Semester'
    });

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Function to get strand color for visual distinction
    const getStrandColor = (strandCode) => {
        const colors = {
            'STEM': '#10B981',    // Green
            'HUMSS': '#3B82F6',   // Blue
            'ABM': '#F59E0B',     // Amber
            'GAS': '#8B5CF6',     // Purple
            'TVL': '#EF4444',     // Red
        };
        return colors[strandCode] || '#6B7280'; // Default gray
    };

    const resetForm = () => {
        setFormData({
            strand_id: '',
            subject_id: '',
            section_id: '',
            faculty_id: '',
            day_of_week: '',
            start_time: '',
            end_time: '',
            semester: activeSchoolYear?.semester || '1st Semester'
        });
        setEditingSchedule(null);
    };

    // Filter subjects by selected strand AND grade level
    const filteredSubjects = formData.strand_id 
        ? subjects.filter(subject => {
            const matchesStrand = subject.strand_id == formData.strand_id;
            
            // If section is selected, filter by grade level
            if (formData.section_id) {
                const selectedSection = sections.find(s => s.id == formData.section_id);
                if (selectedSection) {
                    const matchesGrade = subject.year_level == selectedSection.year_level;
                    return matchesStrand && matchesGrade;
                }
            }
            
            return matchesStrand;
        })
        : [];

    // Filter sections by selected strand
    const filteredSections = formData.strand_id 
        ? sections.filter(section => section.strand_id == formData.strand_id)
        : [];

    // Predefined time slots
    const timeSlots = [
        { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
        { start: '10:30', end: '12:30', label: '10:30 AM - 12:30 PM' },
        { start: '13:30', end: '15:30', label: '1:30 PM - 3:30 PM' },
        { start: '15:30', end: '16:30', label: '3:30 PM - 4:30 PM' }
    ];

    // Handle strand change - reset subject and section when strand changes
    const handleStrandChange = (strandId) => {
        setFormData({
            ...formData,
            strand_id: strandId,
            subject_id: '', // Reset subject when strand changes
            section_id: ''  // Reset section when strand changes
        });
    };

    // Handle section change - reset subject when section changes to filter by grade level
    const handleSectionChange = (sectionId) => {
        setFormData({
            ...formData,
            section_id: sectionId,
            subject_id: '' // Reset subject when section changes to apply grade filter
        });
    };

    // Handle start time change - auto-set end time for predefined slots
    const handleStartTimeChange = (startTime) => {
        const matchingSlot = timeSlots.find(slot => slot.start === startTime);
        
        setFormData({
            ...formData,
            start_time: startTime,
            end_time: matchingSlot ? matchingSlot.end : formData.end_time
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingSchedule 
                ? `/registrar/schedules/${editingSchedule.id}`
                : '/registrar/schedules';
            
            const method = editingSchedule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

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
                    text: result.error,
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to save schedule. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            strand_id: schedule.section?.strand_id || schedule.subject?.strand_id || '',
            subject_id: schedule.subject_id,
            section_id: schedule.section_id,
            faculty_id: schedule.faculty_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            semester: schedule.semester
        });
        setShowModal(true);
    };

    const handleDelete = async (scheduleId, subjectName) => {
        const result = await Swal.fire({
            title: 'Delete Schedule?',
            text: `Are you sure you want to delete the schedule for ${subjectName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/schedules/${scheduleId}`, {
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
                    Swal.fire('Error', data.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete schedule.', 'error');
            }
        }
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="Schedule Management" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-4 lg:p-6 xl:p-8 max-w-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
                            <p className="text-gray-600">Manage class schedules and timetables</p>
                            
                            {activeSchoolYear && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 className="font-semibold text-blue-900">Active School Year</h3>
                                    <p className="text-blue-800">{activeSchoolYear.year_start}-{activeSchoolYear.year_end} ({activeSchoolYear.semester})</p>
                                </div>
                            )}
                        </div>

                        {/* Actions and Strand Legend */}
                        <div className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowModal(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 w-fit"
                            >
                                <FaPlus className="w-4 h-4" />
                                Add New Schedule
                            </button>
                            
                            {/* Strand Color Legend */}
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-gray-600 font-medium">Strands:</span>
                                {strands && strands.map((strand) => (
                                    <div key={strand.id} className="flex items-center gap-1">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{backgroundColor: getStrandColor(strand.code)}}
                                        ></div>
                                        <span className="text-gray-700">{strand.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Schedules Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                Strand
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                                Section
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Faculty
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Schedule
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                Semester
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {schedules && schedules.length > 0 ? (
                                            schedules.map((schedule) => (
                                                <tr key={schedule.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center">
                                                            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: getStrandColor(schedule.section?.strand?.code)}}></div>
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {schedule.section?.strand?.code || schedule.subject?.strand?.code}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                                {schedule.subject?.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {schedule.subject?.code}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {schedule.section?.section_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-sm text-gray-900 truncate max-w-xs">
                                                            {schedule.faculty?.firstname} {schedule.faculty?.lastname}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {schedule.day_of_week}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {schedule.semester.replace(' Semester', '')}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEdit(schedule)}
                                                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                                                title="Edit Schedule"
                                                            >
                                                                <FaEdit className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(schedule.id, schedule.subject?.name)}
                                                                className="text-red-600 hover:text-red-900 p-1"
                                                                title="Delete Schedule"
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    No schedules found. Create a schedule to get started.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Schedule Modal */}
                        {showModal && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                                            {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                                        </h2>
                                        
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                                                <select
                                                    value={formData.strand_id}
                                                    onChange={(e) => handleStrandChange(e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Strand First</option>
                                                    {strands.map((strand) => (
                                                        <option key={strand.id} value={strand.id}>
                                                            {strand.name} ({strand.code})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Select a strand to filter subjects and sections
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                                                <select
                                                    value={formData.section_id}
                                                    onChange={(e) => handleSectionChange(e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                    disabled={!formData.strand_id}
                                                >
                                                    <option value="">
                                                        {formData.strand_id ? 'Select Section' : 'Select Strand First'}
                                                    </option>
                                                    {filteredSections.map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            {section.section_name} (Grade {section.year_level})
                                                        </option>
                                                    ))}
                                                </select>
                                                {formData.strand_id && filteredSections.length === 0 && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        No sections available for this strand
                                                    </p>
                                                )}
                                                {formData.section_id && (
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        📚 Subjects will be filtered by Grade {filteredSections.find(s => s.id == formData.section_id)?.year_level}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                                <select
                                                    value={formData.subject_id}
                                                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                    disabled={!formData.section_id}
                                                >
                                                    <option value="">
                                                        {formData.section_id ? 'Select Subject' : 'Select Section First'}
                                                    </option>
                                                    {filteredSubjects.map((subject) => (
                                                        <option key={subject.id} value={subject.id}>
                                                            {subject.name} ({subject.code})
                                                        </option>
                                                    ))}
                                                </select>
                                                {formData.section_id && filteredSubjects.length === 0 && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        No subjects available for Grade {filteredSections.find(s => s.id == formData.section_id)?.year_level}
                                                    </p>
                                                )}
                                                {formData.section_id && filteredSubjects.length > 0 && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        ✅ Showing Grade {filteredSections.find(s => s.id == formData.section_id)?.year_level} subjects for {filteredSections.find(s => s.id == formData.section_id)?.section_name}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                                                <select
                                                    value={formData.faculty_id}
                                                    onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Faculty</option>
                                                    {faculty.map((member) => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.firstname} {member.lastname}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                                                    <select
                                                        value={formData.day_of_week}
                                                        onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Select Day</option>
                                                        {daysOfWeek.map((day) => (
                                                            <option key={day} value={day}>{day}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                                                    <select
                                                        value={formData.semester}
                                                        onChange={(e) => setFormData({...formData, semester: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="1st Semester">1st Semester</option>
                                                        <option value="2nd Semester">2nd Semester</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Predefined Time Slots */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Time Slot</label>
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    {timeSlots.map((slot, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({
                                                                    ...formData,
                                                                    start_time: slot.start,
                                                                    end_time: slot.end
                                                                });
                                                            }}
                                                            className={`p-3 text-left border rounded-lg transition-colors ${
                                                                formData.start_time === slot.start && formData.end_time === slot.end
                                                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            <div className="font-medium text-sm">{slot.label}</div>
                                                            <div className="text-xs text-gray-500">Click to select this time slot</div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-blue-600 mb-4 flex items-center gap-1">
                                                    💡 Click a time slot above or manually set times below
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.start_time}
                                                        onChange={(e) => handleStartTimeChange(e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.end_time}
                                                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowModal(false);
                                                        resetForm();
                                                    }}
                                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Saving...
                                                        </div>
                                                    ) : (
                                                        editingSchedule ? 'Update Schedule' : 'Create Schedule'
                                                    )}
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
