import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaBook, FaCalendarAlt, FaTimes, FaUsers, FaChalkboardTeacher } from 'react-icons/fa';

export default function ScheduleManagement() {
    const { schedules: initialSchedules, subjects, sections, faculties, currentSchoolYear } = usePage().props;
    const [schedules, setSchedules] = useState(initialSchedules || []);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('registrar-sidebar-collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    // Form data for schedule creation
    const [formData, setFormData] = useState({
        section_id: '',
        subject_id: '',
        faculty_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        semester: '1st Semester'
    });
    
    // Calculate duration from start and end time
    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 0;
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(endHours, endMinutes, 0, 0);
        
        return (endDate.getTime() - startDate.getTime()) / 60000; // Convert to minutes
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            section_id: schedule.section_id,
            subject_id: schedule.subject_id,
            faculty_id: schedule.faculty_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            semester: schedule.semester
        });
        setShowModal(true);
    };

    const handleDelete = (scheduleId) => {
        if (confirm('Are you sure you want to delete this schedule?')) {
            router.delete(`/registrar/schedules/${scheduleId}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        
        try {
            const duration = calculateDuration(formData.start_time, formData.end_time);
            const submitData = {
                ...formData,
                duration: duration
            };
            
            if (editingSchedule) {
                router.put(`/registrar/schedules/${editingSchedule.id}`, submitData, {
                    onSuccess: () => {
                        setShowModal(false);
                        resetForm();
                        router.reload();
                    },
                    onError: (errors) => {
                        setErrors(errors);
                    },
                    onFinish: () => setLoading(false)
                });
            } else {
                router.post('/registrar/schedules', submitData, {
                    onSuccess: () => {
                        setShowModal(false);
                        resetForm();
                        router.reload();
                    },
                    onError: (errors) => {
                        setErrors(errors);
                    },
                    onFinish: () => setLoading(false)
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            section_id: '',
            subject_id: '',
            faculty_id: '',
            day_of_week: '',
            start_time: '',
            end_time: '',
            semester: '1st Semester'
        });
        setEditingSchedule(null);
        setErrors({});
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Group schedules by section for better display
    const schedulesBySection = schedules.reduce((acc, schedule) => {
        const sectionKey = schedule.section ? 
            `${schedule.section.section_name} (${schedule.section.strand?.name || 'No Strand'})` : 
            'Unassigned Section';
        if (!acc[sectionKey]) {
            acc[sectionKey] = [];
        }
        acc[sectionKey].push(schedule);
        return acc;
    }, {});

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar onToggle={setIsCollapsed} />
            
            <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-72'} p-8 transition-all duration-300 overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                Schedule Management
                            </h1>
                            <p className="text-gray-600 mt-2">Manage class schedules for {currentSchoolYear}</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
                        >
                            <FaPlus />
                            Create Schedule
                        </button>
                    </div>

                    {/* Sections Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <FaUsers className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Total Sections</p>
                                    <p className="text-2xl font-bold text-gray-800">{sections?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <FaChalkboardTeacher className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Total Faculty</p>
                                    <p className="text-2xl font-bold text-gray-800">{faculties?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <FaCalendarAlt className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Active Schedules</p>
                                    <p className="text-2xl font-bold text-gray-800">{schedules?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedules by Section */}
                    <div className="space-y-6">
                        {Object.keys(schedulesBySection).length > 0 ? (
                            Object.entries(schedulesBySection).map(([sectionName, sectionSchedules]) => (
                                <div key={sectionName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6">
                                        <h2 className="text-2xl font-bold flex items-center gap-3">
                                            <FaUsers className="w-6 h-6" />
                                            {sectionName}
                                        </h2>
                                        <p className="text-purple-100 mt-2">{sectionSchedules.length} scheduled classes</p>
                                    </div>
                                    
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {sectionSchedules.map((schedule) => (
                                                <div key={schedule.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                                <FaBook className="w-4 h-4 text-blue-600" />
                                                                {schedule.subject?.code || 'N/A'}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">{schedule.subject?.name || 'No Subject'}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => openEditModal(schedule)}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                            >
                                                                <FaEdit className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(schedule.id)}
                                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <FaCalendarAlt className="w-3 h-3" />
                                                            <span>{schedule.day_of_week}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <FaClock className="w-3 h-3" />
                                                            <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <FaUser className="w-3 h-3" />
                                                            <span>{schedule.faculty ? `${schedule.faculty.firstname} ${schedule.faculty.lastname}` : 'No Faculty'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                <FaCalendarAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Schedules Created</h3>
                                <p className="text-gray-500 mb-6">Start by creating your first class schedule</p>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 mx-auto"
                                >
                                    <FaPlus />
                                    Create Schedule
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create/Edit Schedule Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-3xl">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <FaCalendarAlt className="w-6 h-6" />
                                        {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            resetForm();
                                        }}
                                        className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
                                    >
                                        <FaTimes className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {errors.schedule && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-red-600 text-sm">{errors.schedule}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Section Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Section
                                        </label>
                                        <select
                                            value={formData.section_id}
                                            onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Section</option>
                                            {sections?.map((section) => (
                                                <option key={section.id} value={section.id}>
                                                    {section.section_name} ({section.strand?.name || 'No Strand'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subject Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subject
                                        </label>
                                        <select
                                            value={formData.subject_id}
                                            onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects?.map((subject) => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.code} - {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Faculty Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Faculty
                                        </label>
                                        <select
                                            value={formData.faculty_id}
                                            onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Faculty</option>
                                            {faculties?.map((faculty) => (
                                                <option key={faculty.id} value={faculty.id}>
                                                    {faculty.firstname} {faculty.lastname}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Day Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Day of Week
                                        </label>
                                        <select
                                            value={formData.day_of_week}
                                            onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Select Day</option>
                                            <option value="Monday">Monday</option>
                                            <option value="Tuesday">Tuesday</option>
                                            <option value="Wednesday">Wednesday</option>
                                            <option value="Thursday">Thursday</option>
                                            <option value="Friday">Friday</option>
                                            <option value="Saturday">Saturday</option>
                                        </select>
                                    </div>

                                    {/* Start Time */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    {/* End Time */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            resetForm();
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
