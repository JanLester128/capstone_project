import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaBook, FaCalendarAlt, FaTimes, FaUsers, FaChalkboardTeacher, FaInfoCircle, FaEye } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function ScheduleManagement() {
    const { schedules: initialSchedules, subjects, sections, faculties, schoolYears, activeSchoolYear, currentSchoolYear } = usePage().props;
    
    const [schedules, setSchedules] = useState(initialSchedules || []);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('registrar-sidebar-collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [selectedStrand, setSelectedStrand] = useState(null);
    const [showStrandModal, setShowStrandModal] = useState(false);
    
    // Update schedules when props change (after reload)
    useEffect(() => {
        if (initialSchedules && initialSchedules.length > 0) {
            setSchedules(initialSchedules || []);
        }
    }, [initialSchedules]);
    
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    
    // Form data for schedule creation
    const [formData, setFormData] = useState({
        section_id: '',
        subject_id: '',
        faculty_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        duration: 60,
        semester: '1st Semester',
        school_year: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025'
    });
    
    // Calculate duration from start and end time - must be 60, 90, or 120 minutes
    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 60; // Default to 60 minutes
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(endHours, endMinutes, 0, 0);
        
        const diffMs = endDate - startDate;
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        
        // Round to nearest valid duration (60, 90, 120)
        if (diffMinutes <= 75) return 60;
        if (diffMinutes <= 105) return 90;
        return 120;
    };
    
    // Auto-update duration when start or end time changes
    // Removed useEffect hook here

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            section_id: schedule.section_id,
            subject_id: schedule.subject_id,
            faculty_id: schedule.faculty_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            duration: schedule.duration || 60,
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
        
        try {
            const duration = formData.duration || calculateDuration(formData.start_time, formData.end_time);
            
            // Ensure all required fields are present
            const submitData = {
                section_id: formData.section_id,
                subject_id: formData.subject_id,
                faculty_id: formData.faculty_id,
                day_of_week: formData.day_of_week,
                start_time: formData.start_time,
                end_time: formData.end_time,
                duration: duration,
                semester: formData.semester || '1st Semester',
                school_year: formData.school_year
            };
            
            // Function to proceed with submission
            const proceedWithSubmission = () => {
                if (editingSchedule) {
                    router.put(`/registrar/schedules/${editingSchedule.id}`, submitData, {
                        onSuccess: (response) => {
                            setShowModal(false);
                            resetForm();
                            router.reload();
                        },
                        onError: (errors) => {
                            setErrors(errors);
                        },
                        onFinish: () => {
                            setLoading(false);
                        }
                    });
                } else {
                    router.post('/registrar/schedules', submitData, {
                        onSuccess: (response) => {
                            setShowModal(false);
                            resetForm();
                            window.location.reload();
                        },
                        onError: (errors) => {
                            setErrors(errors);
                        },
                        onFinish: () => {
                            setLoading(false);
                        }
                    });
                }
            };
            
            // Check for faculty schedule conflicts
            const conflictingSchedules = schedules.filter(schedule => {
                // Skip the current schedule if we're editing
                if (editingSchedule && schedule.id === editingSchedule.id) {
                    return false;
                }
                
                // Only check schedules for the same faculty, day, and semester
                // Faculty conflicts apply across ALL sections and strands
                const facultyMatch = parseInt(schedule.faculty_id) === parseInt(submitData.faculty_id);
                const dayMatch = schedule.day_of_week === submitData.day_of_week;
                const semesterMatch = schedule.semester === submitData.semester;
                
                if (!facultyMatch || !dayMatch || !semesterMatch) {
                    return false;
                }
                
                // Parse times for proper comparison
                const parseTime = (timeStr) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return hours * 60 + minutes; // Convert to minutes since midnight
                };
                
                const newStart = parseTime(submitData.start_time);
                const newEnd = parseTime(submitData.end_time);
                const existingStart = parseTime(schedule.start_time);
                const existingEnd = parseTime(schedule.end_time);
                
                // Check for time overlap: schedules conflict if they overlap at any point
                const hasConflict = newStart < existingEnd && newEnd > existingStart;
                
                return hasConflict;
            });
            
            // Show debugging info if no conflicts found but we expect there should be
            if (conflictingSchedules.length === 0) {
                const debugInfo = schedules.filter(schedule => 
                    parseInt(schedule.faculty_id) === parseInt(submitData.faculty_id)
                ).map(schedule => ({
                    subject: subjects.find(s => s.id === schedule.subject_id)?.subject_name || 'Unknown',
                    section: sections.find(s => s.id === schedule.section_id)?.section_name || 'Unknown',
                    day: schedule.day_of_week,
                    time: `${schedule.start_time} - ${schedule.end_time}`,
                    semester: schedule.semester
                }));
                
                if (debugInfo.length > 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Debug: Faculty Schedule Check',
                        html: `
                            <div style="text-align: left;">
                                <p><strong>Checking for conflicts with:</strong></p>
                                <p>Faculty ID: ${submitData.faculty_id}</p>
                                <p>Day: ${submitData.day_of_week}</p>
                                <p>Time: ${submitData.start_time} - ${submitData.end_time}</p>
                                <p>Semester: ${submitData.semester}</p>
                                <br>
                                <p><strong>Existing schedules for this faculty:</strong></p>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    ${debugInfo.map(info => 
                                        `<li>${info.subject} (${info.section}) - ${info.day} ${info.time} - ${info.semester}</li>`
                                    ).join('')}
                                </ul>
                            </div>
                        `,
                        confirmButtonText: 'Continue Anyway',
                        showCancelButton: true,
                        cancelButtonText: 'Cancel'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            proceedWithSubmission();
                        } else {
                            setLoading(false);
                        }
                    });
                    return;
                }
            }
            
            if (conflictingSchedules.length > 0) {
                const faculty = faculties.find(f => f.id === submitData.faculty_id);
                const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown Faculty';
                
                let conflictDetails = conflictingSchedules.map(conflict => {
                    const subject = subjects.find(s => s.id === conflict.subject_id);
                    const section = sections.find(s => s.id === conflict.section_id);
                    return `${subject?.subject_name || 'Unknown Subject'} (${section?.section_name || 'Unknown Section'}) from ${conflict.start_time} to ${conflict.end_time}`;
                }).join('\n');
                
                Swal.fire({
                    icon: 'error',
                    title: 'Faculty Schedule Conflict',
                    html: `<div style="text-align: left;">
                        <p><strong>${facultyName}</strong> is already scheduled for:</p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            ${conflictingSchedules.map(conflict => {
                                const subject = subjects.find(s => s.id === conflict.subject_id);
                                const section = sections.find(s => s.id === conflict.section_id);
                                return `<li>${subject?.subject_name || 'Unknown Subject'} (${section?.section_name || 'Unknown Section'}) from ${conflict.start_time} to ${conflict.end_time}</li>`;
                            }).join('')}
                        </ul>
                        <p>Please choose a different time slot or faculty member.</p>
                    </div>`,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#d33'
                });
                setLoading(false);
                return;
            }
            
            // No conflicts found, proceed with submission
            proceedWithSubmission();
            
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
            duration: 60,
            semester: '1st Semester',
            school_year: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025'
        });
        setEditingSchedule(null);
        setErrors({}); // Clear errors when resetting form
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Group schedules by strand, then by section for better organization
    const schedulesByStrand = schedules.reduce((acc, schedule) => {
        const strandKey = schedule.section?.strand?.name || 'Unknown Strand';
        const strandCode = schedule.section?.strand?.code || 'UNK';
        const sectionKey = schedule.section ? 
            `${schedule.section.section_name}` : 
            'Unassigned Section';
        
        if (!acc[strandKey]) {
            acc[strandKey] = {
                code: strandCode,
                name: strandKey,
                sections: {}
            };
        }
        
        if (!acc[strandKey].sections[sectionKey]) {
            acc[strandKey].sections[sectionKey] = [];
        }
        
        acc[strandKey].sections[sectionKey].push(schedule);
        return acc;
    }, {});

    // Legacy grouping for backward compatibility
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
    
    // Create timetable data structure
    const timeSlots = [
        '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', 
        '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
    ];
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const createTimetableGrid = (sectionSchedules) => {
        const grid = {};
        const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        fullDays.forEach(day => {
            grid[day] = {};
            timeSlots.forEach(time => {
                grid[day][time] = null;
            });
        });
        
        sectionSchedules.forEach(schedule => {
            const startTime = schedule.start_time.substring(0, 5); // Get HH:MM format
            const endTime = schedule.end_time.substring(0, 5); // Get HH:MM format
            const day = schedule.day_of_week;
            
            if (grid[day]) {
                // Find all time slots that fall within the schedule duration
                const startIndex = timeSlots.indexOf(startTime);
                const endTimeMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
                
                timeSlots.forEach((timeSlot, index) => {
                    const slotMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]);
                    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
                    
                    // If this time slot falls within the schedule duration
                    if (slotMinutes >= startMinutes && slotMinutes < endTimeMinutes) {
                        if (grid[day][timeSlot] !== undefined) {
                            // Mark different parts of the same schedule
                            grid[day][timeSlot] = {
                                ...schedule,
                                isStart: slotMinutes === startMinutes,
                                isMiddle: slotMinutes > startMinutes && slotMinutes < endTimeMinutes - 30,
                                isEnd: slotMinutes >= endTimeMinutes - 30 && slotMinutes < endTimeMinutes
                            };
                        }
                    }
                });
            }
        });
        
        return grid;
    };

    const formatTime12Hour = (time24) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getScheduleColor = (subject) => {
        if (!subject) return 'border-gray-300 bg-gray-50';
        
        const colors = [
            'border-blue-300 bg-blue-50',
            'border-green-300 bg-green-50',
            'border-yellow-300 bg-yellow-50',
            'border-red-300 bg-red-50',
            'border-purple-300 bg-purple-50',
            'border-pink-300 bg-pink-50',
            'border-indigo-300 bg-indigo-50',
            'border-orange-300 bg-orange-50'
        ];
        
        let hash = subject.name?.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0) || 0;
        return colors[Math.abs(hash) % colors.length];
    };

    const openStrandModal = (strand) => {
        setSelectedStrand(strand);
        setShowStrandModal(true);
    };

    const closeStrandModal = () => {
        setShowStrandModal(false);
        setSelectedStrand(null);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar onToggle={setIsCollapsed} />
            
            <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-72'} p-8 transition-all duration-300 overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-6">
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
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <FaInfoCircle className="w-5 h-5 text-blue-600" />
                                <span className="text-blue-800 font-medium">Quick Tip:</span>
                            </div>
                            <p className="text-blue-700 mt-1">When creating a schedule, select the section first to filter available subjects and faculty members for that strand.</p>
                        </div>
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

                    {/* Strand Cards Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(schedulesByStrand).length > 0 ? (
                            Object.entries(schedulesByStrand).map(([strandName, strandData]) => (
                                <div key={strandName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                    {/* Strand Header */}
                                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-3xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FaUsers className="w-6 h-6" />
                                            <h3 className="text-xl font-bold">{strandData.code}</h3>
                                        </div>
                                        <p className="text-purple-100 font-medium">{strandData.name}</p>
                                    </div>
                                    
                                    {/* Strand Statistics */}
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 flex items-center gap-2">
                                                    <FaUsers className="w-4 h-4" />
                                                    Sections
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {Object.keys(strandData.sections).length}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 flex items-center gap-2">
                                                    <FaCalendarAlt className="w-4 h-4" />
                                                    Total Classes
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {Object.values(strandData.sections).flat().length}
                                                </span>
                                            </div>
                                            
                                            <div className="pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => openStrandModal({data: strandData, name: strandName})}
                                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <FaEye className="w-4 h-4" />
                                                    View Schedules
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Schedules Found</h3>
                                <p className="text-gray-500 mb-6">Start by creating your first class schedule using the "Create Schedule" button above.</p>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2 mx-auto"
                                >
                                    <FaPlus className="w-4 h-4" />
                                    Create First Schedule
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Create/Edit Schedule Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
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
                                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                                            aria-label="Close modal"
                                        >
                                            <FaTimes className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white/90 backdrop-blur-sm">
                                    {/* Display errors if any */}
                                    {Object.keys(errors).length > 0 && (
                                        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">!</span>
                                                </div>
                                                <span className="text-red-800 font-medium text-sm">Please fix the following errors:</span>
                                            </div>
                                            <ul className="text-red-700 text-sm space-y-1">
                                                {Object.entries(errors).map(([field, message]) => (
                                                    <li key={field}>• {Array.isArray(message) ? message[0] : message}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Step indicator */}
                                    <div className="bg-purple-50/80 backdrop-blur-sm border border-purple-200/50 rounded-lg p-4 mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FaInfoCircle className="w-4 h-4 text-purple-600" />
                                            <span className="text-purple-800 font-medium text-sm">Step-by-Step Guide:</span>
                                        </div>
                                        <div className="text-purple-700 text-sm space-y-1">
                                            <p><span className="font-medium">1.</span> Select a section first (this determines available subjects and faculty)</p>
                                            <p><span className="font-medium">2.</span> Choose subject and faculty from the filtered options</p>
                                            <p><span className="font-medium">3.</span> Set the day and time for the class</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Section Selection - Step 1 */}
                                        <div className="bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-4">
                                            <label className="block text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                                                Section (Select First)
                                            </label>
                                            <select
                                                value={formData.section_id}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData, 
                                                        section_id: e.target.value,
                                                        subject_id: '', // Reset dependent fields
                                                        faculty_id: ''
                                                    })
                                                }}
                                                className="w-full px-4 py-3 border-2 border-blue-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm"
                                                required
                                            >
                                                <option value="">Choose a section to start...</option>
                                                {sections?.map((section) => (
                                                    <option key={section.id} value={section.id}>
                                                        {section.section_name} ({section.strand?.name || 'No Strand'})
                                                    </option>
                                                ))}
                                            </select>
                                            {!formData.section_id && (
                                                <p className="text-blue-600 text-xs mt-1">⚠️ Select a section to enable other fields</p>
                                            )}
                                        </div>

                                        {/* Subject Selection - Step 2 */}
                                        <div className={`${formData.section_id ? 'bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id ? 'text-green-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2</span>
                                                Subject {formData.section_id ? '(Filtered by Section)' : '(Select Section First)'}
                                            </label>
                                            <select
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id ? 'border-green-300/50 focus:ring-green-500 focus:border-green-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!formData.section_id}
                                                required
                                            >
                                                <option value="">{formData.section_id ? 'Select Subject' : 'Select section first'}</option>
                                                {formData.section_id && subjects?.filter(subject => {
                                                    const selectedSection = sections?.find(s => s.id == formData.section_id);
                                                    return selectedSection ? subject.strand_id == selectedSection.strand_id : true;
                                                }).map((subject) => (
                                                    <option key={subject.id} value={subject.id}>
                                                        {subject.code} - {subject.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Faculty Selection - Step 2 */}
                                        <div className={`${formData.section_id ? 'bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id ? 'text-green-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2</span>
                                                Faculty {formData.section_id ? '(Available Teachers)' : '(Select Section First)'}
                                            </label>
                                            <select
                                                value={formData.faculty_id}
                                                onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id ? 'border-green-300/50 focus:ring-green-500 focus:border-green-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!formData.section_id}
                                                required
                                            >
                                                <option value="">{formData.section_id ? 'Select Faculty' : 'Select section first'}</option>
                                                {formData.section_id && faculties?.map((faculty) => (
                                                    <option key={faculty.id} value={faculty.id}>
                                                        {faculty.firstname} {faculty.lastname}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Day and Time Selection - Step 3 */}
                                        <div className={`${formData.section_id && formData.subject_id && formData.faculty_id ? 'bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.subject_id && formData.faculty_id ? 'text-yellow-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.subject_id && formData.faculty_id ? 'bg-yellow-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>3</span>
                                                Schedule Details
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Day of Week</label>
                                                    <select
                                                        value={formData.day_of_week}
                                                        onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.subject_id && formData.faculty_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.subject_id && formData.faculty_id)}
                                                        required
                                                    >
                                                        <option value="">Day</option>
                                                        <option value="Monday">Monday</option>
                                                        <option value="Tuesday">Tuesday</option>
                                                        <option value="Wednesday">Wednesday</option>
                                                        <option value="Thursday">Thursday</option>
                                                        <option value="Friday">Friday</option>
                                                        <option value="Saturday">Saturday</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.start_time}
                                                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.subject_id && formData.faculty_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.subject_id && formData.faculty_id)}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.end_time}
                                                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.subject_id && formData.faculty_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.subject_id && formData.faculty_id)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Duration, Semester, and School Year Selection */}
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Duration (Auto-calculated)</label>
                                                    <div className="w-full px-3 py-2 border border-gray-300/50 rounded-lg bg-gray-50/80 backdrop-blur-sm text-gray-700">
                                                        {formData.duration === 60 && '1 Hour (60 min)'}
                                                        {formData.duration === 90 && '1.5 Hours (90 min)'}
                                                        {formData.duration === 120 && '2 Hours (120 min)'}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">Duration is automatically calculated based on start and end time</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                                                    <select
                                                        value={formData.semester}
                                                        onChange={(e) => setFormData({...formData, semester: e.target.value})}
                                                        className="w-full px-3 py-2 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white/90 backdrop-blur-sm"
                                                        disabled={!(formData.section_id && formData.subject_id && formData.faculty_id)}
                                                        required
                                                    >
                                                        <option value="1st Semester">1st Semester</option>
                                                        <option value="2nd Semester">2nd Semester</option>
                                                        <option value="Summer">Summer</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">School Year</label>
                                                    <select
                                                        value={formData.school_year}
                                                        onChange={(e) => setFormData({...formData, school_year: e.target.value})}
                                                        className="w-full px-3 py-2 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white/90 backdrop-blur-sm"
                                                        disabled={!(formData.section_id && formData.subject_id && formData.faculty_id)}
                                                        required
                                                    >
                                                        {schoolYears?.map((year) => (
                                                            <option key={year.id} value={`${year.year_start}-${year.year_end}`}>
                                                                {year.year_start}-{year.year_end}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowModal(false);
                                                resetForm();
                                            }}
                                            className="px-6 py-2 border border-gray-300/50 rounded-lg text-gray-700 hover:bg-gray-50/80 backdrop-blur-sm transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
                                                loading 
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                                            }`}
                                        >
                                            {loading ? 'Creating...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Strand Schedule Modal */}
                    {showStrandModal && selectedStrand && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden border border-white/20">
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-3">
                                            <FaUsers className="w-6 h-6" />
                                            {selectedStrand.data.name} ({selectedStrand.data.code})
                                        </h2>
                                        <p className="text-purple-100 mt-1">
                                            {Object.keys(selectedStrand.data.sections).length} sections • {Object.values(selectedStrand.data.sections).flat().length} scheduled classes
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeStrandModal}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        aria-label="Close modal"
                                    >
                                        <FaTimes className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Body - Scrollable */}
                                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto bg-white/90 backdrop-blur-sm">
                                    <div className="space-y-8">
                                        {Object.entries(selectedStrand.data.sections).map(([sectionName, sectionSchedules]) => {
                                            const timetableGrid = createTimetableGrid(sectionSchedules);
                                            
                                            return (
                                                <div key={sectionName} className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
                                                    {/* Section Header */}
                                                    <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-4 mb-6">
                                                        <h3 className="text-xl font-bold flex items-center gap-2 text-blue-800">
                                                            <FaUsers className="w-5 h-5" />
                                                            {sectionName}
                                                        </h3>
                                                        <p className="text-blue-600 mt-1">{sectionSchedules.length} scheduled classes</p>
                                                    </div>
                                                    
                                                    {/* Timetable Grid */}
                                                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 overflow-x-auto border border-gray-200/30">
                                                        <div className="min-w-full">
                                                            {/* Header Row */}
                                                            <div className="grid grid-cols-7 gap-1 mb-2">
                                                                <div className="bg-gray-100/80 backdrop-blur-sm p-3 text-center font-semibold text-gray-700 rounded text-sm border border-gray-200/50">
                                                                    Time
                                                                </div>
                                                                {days.map(day => (
                                                                    <div key={day} className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-3 text-center font-semibold text-gray-700 rounded border border-blue-200/50 text-sm">
                                                                        {day}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            
                                                            {/* Time Slots */}
                                                            {timeSlots.map(timeSlot => (
                                                                <div key={timeSlot} className="grid grid-cols-7 gap-1 mb-1">
                                                                    {/* Time Column */}
                                                                    <div className="bg-gray-50/80 backdrop-blur-sm p-2 text-center text-sm font-medium text-gray-600 rounded border border-gray-200/50 flex items-center justify-center min-h-[48px]">
                                                                        <FaClock className="w-3 h-3 mr-2" />
                                                                        {formatTime12Hour(timeSlot)}
                                                                    </div>
                                                                    
                                                                    {/* Day Columns */}
                                                                    {days.map(day => {
                                                                        const fullDay = day === 'Mon' ? 'Monday' : 
                                                                                       day === 'Tue' ? 'Tuesday' : 
                                                                                       day === 'Wed' ? 'Wednesday' : 
                                                                                       day === 'Thu' ? 'Thursday' : 
                                                                                       day === 'Fri' ? 'Friday' : 'Saturday';
                                                                        const schedule = timetableGrid[fullDay] && timetableGrid[fullDay][timeSlot] ? timetableGrid[fullDay][timeSlot] : null;
                                                                        
                                                                        return (
                                                                            <div key={`${day}-${timeSlot}`} className="min-h-[48px] border border-gray-200/50 rounded relative">
                                                                                {schedule ? (
                                                                                    <div className={`h-full p-2 border-2 ${getScheduleColor(schedule.subject)} relative group cursor-pointer hover:shadow-md transition-all duration-200 backdrop-blur-sm ${
                                                                                        schedule.isStart ? 'rounded-t-lg border-b-0' : 
                                                                                        schedule.isEnd ? 'rounded-b-lg border-t-0' : 
                                                                                        schedule.isMiddle ? 'rounded-none border-t-0 border-b-0' : 'rounded-lg'
                                                                                    }`}>
                                                                                        {schedule.isStart && (
                                                                                            <div className="text-center">
                                                                                                {/* Faculty Name */}
                                                                                                <div className="text-xs mb-1 flex items-center gap-1">
                                                                                                    <FaUser className="w-2 h-2" />
                                                                                                    <span className="truncate font-medium">
                                                                                                        {schedule.faculty ? 
                                                                                                            `${schedule.faculty.firstname?.charAt(0)}. ${schedule.faculty.lastname}` : 
                                                                                                            faculties.find(f => f.id === schedule.faculty_id) ? 
                                                                                                                `${faculties.find(f => f.id === schedule.faculty_id).firstname?.charAt(0)}. ${faculties.find(f => f.id === schedule.faculty_id).lastname}` : 
                                                                                                                'No Faculty'
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                                
                                                                                                {/* Section */}
                                                                                                <div className="text-xs flex items-center gap-1">
                                                                                                    <FaUsers className="w-2 h-2" />
                                                                                                    <span className="truncate">{schedule.section?.section_name || sections.find(s => s.id === schedule.section_id)?.section_name || 'N/A'}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                        
                                                                                        {schedule.isMiddle && (
                                                                                            <div className="h-full flex items-center justify-center">
                                                                                                <div className="text-xs font-medium text-center">
                                                                                                    <div className="truncate mb-1 font-semibold">
                                                                                                        {schedule.subject?.name || subjects.find(s => s.id === schedule.subject_id)?.name || 'No Subject'}
                                                                                                    </div>
                                                                                                    <div className="opacity-75">
                                                                                                        {Math.round((schedule.duration || 60) / 60 * 10) / 10}h
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                        
                                                                                        {schedule.isEnd && (
                                                                                            <div className="text-center">
                                                                                                <div className="text-xs font-medium">
                                                                                                    {schedule.duration || 60} min
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                        
                                                                                        {/* Tooltip on Hover */}
                                                                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap border border-gray-700/50">
                                                                                            <div className="font-semibold">{schedule.subject?.name || subjects.find(s => s.id === schedule.subject_id)?.name || 'No Subject'}</div>
                                                                                            <div>Faculty: {schedule.faculty ? `${schedule.faculty.firstname} ${schedule.faculty.lastname}` : faculties.find(f => f.id === schedule.faculty_id) ? `${faculties.find(f => f.id === schedule.faculty_id).firstname} ${faculties.find(f => f.id === schedule.faculty_id).lastname}` : 'No Faculty'}</div>
                                                                                            <div>Time: {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</div>
                                                                                            <div>Room: {schedule.room || 'TBA'}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-full bg-gray-50/60 hover:bg-gray-100/60 backdrop-blur-sm transition-colors duration-200 rounded flex items-center justify-center border border-gray-200/30">
                                                                                        <span className="text-gray-400 text-xs">Free</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Legend */}
                                                    <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50">
                                                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                            <FaInfoCircle className="w-4 h-4" />
                                                            Legend
                                                        </h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 bg-blue-100/80 backdrop-blur-sm border border-blue-300/50 rounded"></div>
                                                                <span>Hover for details</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <FaEdit className="w-4 h-4 text-blue-600" />
                                                                <span>Edit</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <FaTrash className="w-4 h-4 text-red-600" />
                                                                <span>Delete</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-4 h-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded"></span>
                                                                <span>Free slot</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
