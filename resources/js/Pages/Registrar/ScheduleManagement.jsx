import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import SchoolYearWarning from '../../Components/SchoolYearWarning';
import { FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaBook, FaCalendarAlt, FaTimes, FaUsers, FaChalkboardTeacher, FaInfoCircle, FaEye, FaMapMarkerAlt, FaSearch, FaFilter, FaSync, FaCheckCircle, FaExclamationTriangle, FaBell, FaQuestionCircle, FaKeyboard, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function ScheduleManagement() {
    const { schedules: initialSchedules, subjects: initialSubjects, sections, faculties, schoolYears, activeSchoolYear, currentSchoolYear, swal, hasActiveSchoolYear = false } = usePage().props;

    const [schedules, setSchedules] = useState(initialSchedules || []);
    const [subjects, setSubjects] = useState(initialSubjects || []);
    const [semesterInfo, setSemesterInfo] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedStrand, setSelectedStrand] = useState(null);
    const [showStrandModal, setShowStrandModal] = useState(false);
    const [semesterFilter, setSemesterFilter] = useState('all'); // Add semester filter
    const [activeSemesterTab, setActiveSemesterTab] = useState('1'); // NEW: Active semester tab for timetable
    
    // Bulk assignment states
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkAssignments, setBulkAssignments] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [assignmentErrors, setAssignmentErrors] = useState({});
    
    // HCI Enhancement States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStrand, setFilterStrand] = useState('all');
    const [filterGradeLevel, setFilterGradeLevel] = useState('all'); // Add grade level filter
    const [systemStatus, setSystemStatus] = useState({
        isOnline: true,
        lastSync: new Date().toLocaleTimeString(),
        pendingActions: 0
    });
    const [showHelp, setShowHelp] = useState(false);
    const [recentActions, setRecentActions] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Modal and form states - moved here to avoid reference errors
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Form data for schedule creation
    const [formData, setFormData] = useState({
        section_id: '',
        subject_id: '',
        faculty_id: '',
        grade_level: '', // Add grade level filter
        semester_filter: '', // NEW: Required semester filter
        day_of_week: '',
        start_time: '',
        end_time: '',
        duration: 60,
        semester: '1st Semester',
        school_year: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025'
    });

    // Initialize subjects from props instead of making additional API call
    useEffect(() => {
        if (initialSubjects && initialSubjects.length > 0) {
            setSubjects(initialSubjects);
            console.log('Using initial subjects:', initialSubjects.length);
        }
        if (activeSchoolYear) {
            setSemesterInfo(activeSchoolYear);
            console.log('Using active school year:', activeSchoolYear.semester);
        }
    }, [initialSubjects, activeSchoolYear]);

    // Auto-save search preferences - HCI Principle 6: Recognition Rather Than Recall
    useEffect(() => {
        localStorage.setItem('schedule-search-term', searchTerm);
        localStorage.setItem('schedule-filter-strand', filterStrand);
        localStorage.setItem('schedule-filter-grade-level', filterGradeLevel);
        localStorage.setItem('schedule-semester-filter', semesterFilter);
        localStorage.setItem('schedule-active-semester-tab', activeSemesterTab);
    }, [searchTerm, filterStrand, filterGradeLevel, semesterFilter, activeSemesterTab]);

    // Load saved preferences on mount
    useEffect(() => {
        const savedSearchTerm = localStorage.getItem('schedule-search-term');
        const savedFilterStrand = localStorage.getItem('schedule-filter-strand');
        const savedFilterGradeLevel = localStorage.getItem('schedule-filter-grade-level');
        const savedSemesterFilter = localStorage.getItem('schedule-semester-filter');
        const savedActiveSemesterTab = localStorage.getItem('schedule-active-semester-tab');
        
        if (savedSearchTerm) setSearchTerm(savedSearchTerm);
        if (savedFilterStrand) setFilterStrand(savedFilterStrand);
        if (savedFilterGradeLevel) setFilterGradeLevel(savedFilterGradeLevel);
        if (savedSemesterFilter) setSemesterFilter(savedSemesterFilter);
        if (savedActiveSemesterTab) setActiveSemesterTab(savedActiveSemesterTab);
    }, []);

    // Handle SweetAlert from backend session data
    useEffect(() => {
        console.log('SweetAlert useEffect triggered, swal data:', swal);
        // Don't show individual success alerts during bulk operations
        if (swal && !bulkLoading) {
            console.log('Showing SweetAlert with data:', swal);
            Swal.fire({
                icon: swal.icon || swal.type,
                title: swal.title,
                text: swal.text,
                html: swal.html,
                confirmButtonText: swal.confirmButtonText || 'OK',
                timer: swal.timer,
                showConfirmButton: swal.showConfirmButton !== false,
                allowOutsideClick: swal.allowOutsideClick !== false,
                allowEscapeKey: swal.allowEscapeKey !== false
            });
        } else if (bulkLoading) {
            console.log('Bulk operation in progress, suppressing individual SweetAlert');
        } else {
            console.log('No swal data found in props');
        }
    }, [swal, bulkLoading]);

    // Update schedules when props change (after reload)
    useEffect(() => {
        if (initialSchedules && initialSchedules.length > 0) {
            setSchedules(initialSchedules || []);
        }
    }, [initialSchedules]);

    // Get filtered subjects based on selected grade level and section with semester identification
    const getFilteredSubjects = () => {
        if (!formData.grade_level) return [];

        const selectedSection = sections?.find(s => s.id == formData.section_id);

        // Filter subjects by grade level, strand, and semester
        let filteredSubjects = subjects?.filter(subject => {
            // Check if subject matches the selected grade level
            const matchesGradeLevel = subject.year_level === formData.grade_level ||
                subject.grade_level === formData.grade_level;

            // Fix strand matching logic: Allow subjects with null strand_id (core subjects) or matching strand_id
            const matchesStrand = selectedSection ? 
                (subject.strand_id === null || subject.strand_id === undefined || subject.strand_id == selectedSection.strand_id) : true;

            // Check if subject matches semester filter
            const matchesSemester = semesterFilter === 'all' || 
                subject.semester?.toString() === semesterFilter;

            return matchesGradeLevel && matchesStrand && matchesSemester;
        }) || [];

        // Sort subjects by semester for better organization
        filteredSubjects.sort((a, b) => {
            const semesterA = a.semester || 1;
            const semesterB = b.semester || 1;
            return semesterA - semesterB;
        });

        // Get subjects already assigned to this section to disable them
        const assignedSubjects = schedules
            .filter(schedule => schedule.section_id == formData.section_id)
            .map(schedule => schedule.subject_id);

        // Mark subjects as disabled if already assigned
        return filteredSubjects.map(subject => ({
            ...subject,
            isDisabled: assignedSubjects.includes(subject.id),
            disabledReason: assignedSubjects.includes(subject.id) ? 'Already assigned to this section' : null
        }));
    };

    // Get available subjects for display
    const availableSubjects = getFilteredSubjects();

    // Get filtered subjects for bulk assignment
    const getBulkFilteredSubjects = (sectionId, gradeLevel, currentAssignmentId = null) => {
        console.log('getBulkFilteredSubjects called with:', { sectionId, gradeLevel, currentAssignmentId });
        
        if (!sectionId || !gradeLevel) {
            console.log('Missing sectionId or gradeLevel, returning empty array');
            return [];
        }
        
        const selectedSection = sections?.find(s => s.id == sectionId);
        console.log('Selected section:', selectedSection);
        
        // Get subjects already selected in OTHER bulk assignments (exclude current one)
        const selectedSubjectsInBulk = bulkAssignments
            .filter(assignment => 
                assignment.subject_id && 
                assignment.id !== currentAssignmentId // Exclude current assignment
            )
            .map(assignment => assignment.subject_id);
        
        const filteredSubjects = subjects?.filter(subject => {
            const matchesGradeLevel = subject.year_level == gradeLevel || subject.grade_level == gradeLevel;
            
            // Fix strand matching logic: Allow subjects with null strand_id (core subjects) or matching strand_id
            const matchesStrand = selectedSection ? 
                (subject.strand_id === null || subject.strand_id === undefined || subject.strand_id == selectedSection.strand_id) : true;
            
            // Enhanced debugging for strand matching
            if (subject.name.includes('General Mathematics') || subject.name.includes('Physical Education')) {
                console.log(`DEBUG - Subject: ${subject.name}`, {
                    subject_strand_id: subject.strand_id,
                    selected_section_strand_id: selectedSection?.strand_id,
                    strand_match_result: matchesStrand,
                    is_null_strand: subject.strand_id == null,
                    exact_match: subject.strand_id == selectedSection?.strand_id
                });
            }
            
            // Check if subject matches semester filter
            const matchesSemester = semesterFilter === 'all' || 
                subject.semester?.toString() === semesterFilter;
            
            // Check if subject is already assigned to this section in existing schedules
            const isAlreadyAssigned = schedules.some(schedule => 
                schedule.section_id == sectionId && 
                schedule.subject_id == subject.id
            );
            
            // Check if subject is already selected in other bulk assignments
            const isSelectedInBulk = selectedSubjectsInBulk.includes(subject.id.toString());
            
            console.log(`Subject ${subject.name}: gradeMatch=${matchesGradeLevel}, strandMatch=${matchesStrand}, semesterMatch=${matchesSemester}, alreadyAssigned=${isAlreadyAssigned}, selectedInBulk=${isSelectedInBulk}`);
            
            return matchesGradeLevel && matchesStrand && matchesSemester && !isAlreadyAssigned && !isSelectedInBulk;
        }) || [];
        
        console.log('Filtered subjects:', filteredSubjects.length);
        return filteredSubjects;
    };

    // Get teacher's current subject count
    const getTeacherSubjectCount = (facultyId) => {
        if (!facultyId) return 0;
        return schedules?.filter(schedule => schedule.faculty_id == facultyId).length || 0;
    };

    // Check if teacher has reached the 4-subject limit
    const isTeacherAtLimit = (facultyId) => {
        const currentCount = getTeacherSubjectCount(facultyId);
        const pendingCount = bulkAssignments.length;
        return (currentCount + pendingCount) >= 4;
    };

    // Get remaining slots for teacher
    const getRemainingSlots = (facultyId) => {
        const currentCount = getTeacherSubjectCount(facultyId);
        return Math.max(0, 4 - currentCount);
    };

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
    useEffect(() => {
        if (formData.start_time && formData.end_time) {
            const newDuration = calculateDuration(formData.start_time, formData.end_time);
            if (newDuration !== formData.duration) {
                setFormData(prev => ({
                    ...prev,
                    duration: newDuration
                }));
            }
        }
    }, [formData.start_time, formData.end_time, formData.duration]);

    const openEditModal = (schedule) => {
        console.log('openEditModal called with schedule:', schedule);
        console.log('schedule.school_year type:', typeof schedule.school_year, 'value:', schedule.school_year);
        console.log('activeSchoolYear:', activeSchoolYear);

        setEditingSchedule(schedule);

        // Extract school year properly
        let schoolYearValue;
        if (schedule.school_year) {
            if (typeof schedule.school_year === 'object' && schedule.school_year.year_start && schedule.school_year.year_end) {
                schoolYearValue = `${schedule.school_year.year_start}-${schedule.school_year.year_end}`;
            } else if (typeof schedule.school_year === 'string') {
                schoolYearValue = schedule.school_year;
            } else {
                schoolYearValue = activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025';
            }
        } else {
            schoolYearValue = activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025';
        }

        console.log('Final school year value:', schoolYearValue);

        setFormData({
            section_id: schedule.section_id,
            subject_id: schedule.subject_id,
            faculty_id: schedule.faculty_id,
            grade_level: schedule.grade_level, // Add grade level filter
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            duration: schedule.duration || 60,
            semester: schedule.semester,
            school_year: schoolYearValue
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        console.log('Form submission started', formData);

        try {
            const duration = formData.duration || calculateDuration(formData.start_time, formData.end_time);

            // Ensure all required fields are present
            const submitData = {
                section_id: formData.section_id,
                subject_id: formData.subject_id,
                faculty_id: formData.faculty_id,
                grade_level: formData.grade_level, // Add grade level filter
                day_of_week: formData.day_of_week,
                start_time: formData.start_time, // Keep H:i format (HH:MM)
                end_time: formData.end_time,     // Keep H:i format (HH:MM)
                duration: duration,
                semester: formData.semester || '1st Semester',
                school_year: (() => {
                    let schoolYear = formData.school_year;

                    // If it's an object, try to extract the value
                    if (typeof schoolYear === 'object' && schoolYear !== null) {
                        if (schoolYear.value) {
                            schoolYear = schoolYear.value;
                        } else if (schoolYear.year_start && schoolYear.year_end) {
                            schoolYear = `${schoolYear.year_start}-${schoolYear.year_end}`;
                        } else {
                            schoolYear = activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025';
                        }
                    }

                    // Fallback if still not a valid string
                    if (!schoolYear || typeof schoolYear !== 'string') {
                        schoolYear = activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025';
                    }

                    return String(schoolYear);
                })()
            };

            console.log('Submit data prepared:', submitData);
            console.log('School year value:', submitData.school_year, 'Type:', typeof submitData.school_year);

            // Validate school year format (YYYY-YYYY)
            const schoolYearRegex = /^\d{4}-\d{4}$/;
            if (!schoolYearRegex.test(submitData.school_year)) {
                console.error('Invalid school year format:', submitData.school_year);
                setErrors({ school_year: 'School year must be in format YYYY-YYYY (e.g., 2024-2025)' });
                setLoading(false);
                return;
            }

            // Validate required fields
            const requiredFields = ['section_id', 'subject_id', 'grade_level', 'day_of_week', 'start_time', 'end_time'];
            const missingFields = requiredFields.filter(field => !submitData[field]);

            if (missingFields.length > 0) {
                console.error('Missing required fields:', missingFields);
                setErrors({ form: `Missing required fields: ${missingFields.join(', ')}` });
                setLoading(false);
                return;
            }

            // Check for duplicate subject/day/section combinations
            const existingSchedules = schedules.filter(schedule => {
                return schedule.section_id === submitData.section_id &&
                    schedule.subject_id === submitData.subject_id &&
                    schedule.day_of_week === submitData.day_of_week &&
                    schedule.start_time === submitData.start_time &&
                    schedule.end_time === submitData.end_time;
            });

            if (existingSchedules.length > 0) {
                console.error('Duplicate schedule found:', existingSchedules);
                setErrors({ form: 'Duplicate schedule found for this subject, day, and section' });
                setLoading(false);
                return;
            }

            // Check teacher schedule limit (4 schedules max per teacher)
            if (submitData.faculty_id) {
                const teacherSchedules = schedules.filter(schedule => {
                    // Skip the current schedule if we're editing
                    if (editingSchedule && schedule.id === editingSchedule.id) {
                        return false;
                    }
                    return parseInt(schedule.faculty_id) === parseInt(submitData.faculty_id);
                });

                if (teacherSchedules.length >= 4) {
                    const faculty = faculties.find(f => f.id === submitData.faculty_id);
                    const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Selected Faculty';

                    Swal.fire({
                        icon: 'warning',
                        title: 'Teacher Schedule Limit Reached',
                        html: `<div style="text-align: left;">
                            <p><strong>${facultyName}</strong> is already assigned to 4 schedules, which is the maximum limit.</p>
                            <p>Please choose a different teacher or remove one of their existing schedule assignments.</p>
                        </div>`,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#f59e0b'
                    });
                    setLoading(false);
                    return;
                }
            }

            // Function to proceed with submission
            const proceedWithSubmission = () => {
                console.log('Proceeding with submission...');
                if (editingSchedule) {
                    console.log('Updating existing schedule:', editingSchedule.id);
                    router.put(`/registrar/schedules/${editingSchedule.id}`, submitData, {
                        onSuccess: (response) => {
                            console.log('Update successful:', response);
                            setShowModal(false);
                            resetForm();
                            router.reload();
                        },
                        onError: (errors) => {
                            console.error('Update failed:', errors);
                            setErrors(errors);
                        },
                        onFinish: () => {
                            setLoading(false);
                        }
                    });
                } else {
                    console.log('Creating new schedule');
                    router.post('/registrar/schedules', submitData, {
                        onSuccess: (response) => {
                            console.log('Creation successful:', response);
                            setShowModal(false);
                            resetForm();
                            router.reload();
                        },
                        onError: (errors) => {
                            console.error('Creation failed:', errors);
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
                    subject: subjects.find(s => s.id === schedule.subject_id)?.name || subjects.find(s => s.id === schedule.subject_id)?.subject_name || 'No Subject Found',
                    section: sections.find(s => s.id === schedule.section_id)?.section_name || 'No Section Found',
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
            grade_level: '', // Add grade level filter
            semester_filter: '', // NEW: Required semester filter
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

    const formatTime12Hour = (time24) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Function to abbreviate long subject names for better display
    const abbreviateSubjectName = (subjectName) => {
        if (!subjectName) return 'No Subject';

        // If subject name is short enough, return as is
        if (subjectName.length <= 20) return subjectName;

        // Common abbreviations for Filipino subjects
        const abbreviations = {
            '21st Century Literature from the Philippines': '21st Cent. Lit (PH)',
            'Contemporary Philippine Arts from the Regions': 'Contemp. PH Arts',
            'Media and Information Literacy': 'Media & Info Lit',
            'Understanding Culture, Society and Politics': 'UCSP',
            'Personal Development': 'Personal Dev',
            'Physical Education and Health': 'PE & Health',
            'Practical Research': 'Practical Research',
            'Inquiries, Investigations and Immersion': 'III',
            'Work Immersion': 'Work Immersion',
            'Entrepreneurship': 'Entrepreneurship',
            'Organization and Management': 'Org & Management',
            'Business Ethics and Social Responsibility': 'Business Ethics',
            'Business Finance': 'Bus. Finance',
            'Business Marketing': 'Bus. Marketing',
            'Fundamentals of Accountancy, Business and Management': 'FABM',
            'Applied Economics': 'Applied Econ',
            'Business Math': 'Bus. Math',
            'Oral Communication': 'Oral Comm',
            'Reading and Writing': 'Reading & Writing',
            'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino': 'Komsik',
            'Pagbasa at Pagsusuri ng Iba\'t Ibang Teksto Tungo sa Pananaliksik': 'Pagbasa at Pagsusuri',
            'Filipino sa Piling Larangan': 'Filipino sa Piling',
            'General Mathematics': 'Gen. Math',
            'Statistics and Probability': 'Stat & Prob',
            'Earth and Life Science': 'Earth & Life Sci',
            'Physical Science': 'Physical Sci',
            'General Biology': 'Gen. Biology',
            'General Chemistry': 'Gen. Chemistry',
            'General Physics': 'Gen. Physics'
        };

        // Check if we have a specific abbreviation
        if (abbreviations[subjectName]) {
            return abbreviations[subjectName];
        }

        // Generic abbreviation logic
        // Split by common words and abbreviate
        let abbreviated = subjectName
            .replace(/\bPhilippines?\b/gi, 'PH')
            .replace(/\bPhilippine\b/gi, 'PH')
            .replace(/\bContemporary\b/gi, 'Contemp.')
            .replace(/\bLiterature\b/gi, 'Lit.')
            .replace(/\bCentury\b/gi, 'Cent.')
            .replace(/\bManagement\b/gi, 'Mgmt.')
            .replace(/\bDevelopment\b/gi, 'Dev.')
            .replace(/\bEducation\b/gi, 'Edu.')
            .replace(/\bInformation\b/gi, 'Info')
            .replace(/\bCommunication\b/gi, 'Comm.')
            .replace(/\bMathematics\b/gi, 'Math')
            .replace(/\bScience\b/gi, 'Sci.')
            .replace(/\bTechnology\b/gi, 'Tech.')
            .replace(/\bResearch\b/gi, 'Research')
            .replace(/\bFundamentals?\b/gi, 'Fund.')
            .replace(/\bAccountancy\b/gi, 'Acctg.')
            .replace(/\bBusiness\b/gi, 'Bus.')
            .replace(/\bEconomics\b/gi, 'Econ.')
            .replace(/\bProbability\b/gi, 'Prob.')
            .replace(/\bStatistics\b/gi, 'Stat.')
            .replace(/\bPhysical\b/gi, 'Phys.')
            .replace(/\bChemistry\b/gi, 'Chem.')
            .replace(/\bBiology\b/gi, 'Bio.')
            .replace(/\bGeography\b/gi, 'Geo.')
            .replace(/\bHistory\b/gi, 'Hist.')
            .replace(/\bSociety\b/gi, 'Soc.')
            .replace(/\bPolitics\b/gi, 'Pol.')
            .replace(/\bCulture\b/gi, 'Cult.')
            .replace(/\bUnderstanding\b/gi, 'Und.')
            .replace(/\bOrganization\b/gi, 'Org.')
            .replace(/\bEntrepreneurship\b/gi, 'Entrep.')
            .replace(/\bResponsibility\b/gi, 'Resp.')
            .replace(/\bInvestigations?\b/gi, 'Invest.')
            .replace(/\bInquiries\b/gi, 'Inq.')
            .replace(/\bImmersion\b/gi, 'Immer.')
            .replace(/\band\b/gi, '&')
            .replace(/\bthe\b/gi, '')
            .replace(/\bfrom\b/gi, '')
            .replace(/\bof\b/gi, '')
            .replace(/\bin\b/gi, '')
            .replace(/\bto\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        // If still too long, truncate and add ellipsis
        if (abbreviated.length > 25) {
            abbreviated = abbreviated.substring(0, 22) + '...';
        }

        return abbreviated;
    };

    // Helper function to determine grade level from schedule data
    const getScheduleGradeLevel = (schedule) => {
        // Try multiple sources for grade level
        if (schedule.section?.grade_level) {
            return schedule.section.grade_level.toString();
        } else if (schedule.subject?.year_level) {
            return schedule.subject.year_level.toString();
        } else if (schedule.subject?.grade_level) {
            return schedule.subject.grade_level.toString();
        } else if (schedule.section?.section_name) {
            // Try to extract grade from section name (e.g., "ABM-11A" -> "11")
            const gradeMatch = schedule.section.section_name.match(/(\d{2})/);
            if (gradeMatch && ['11', '12'].includes(gradeMatch[1])) {
                return gradeMatch[1];
            }
        }
        
        // Check if subject name contains grade info (common patterns)
        if (schedule.subject?.name) {
            const subjectName = schedule.subject.name.toLowerCase();
            
            // Check for explicit grade patterns
            if (subjectName.includes('grade 11') || subjectName.includes('g11') || subjectName.includes('11th')) {
                return '11';
            }
            if (subjectName.includes('grade 12') || subjectName.includes('g12') || subjectName.includes('12th')) {
                return '12';
            }
            
            // Check for subject patterns that typically indicate grade levels
            // Grade 11 subjects
            if (subjectName.includes('general physics 1') || 
                subjectName.includes('general chemistry 1') ||
                subjectName.includes('general biology 1') ||
                subjectName.includes('basic calculus') ||
                subjectName.includes('pre-calculus')) {
                return '11';
            }
            
            // Grade 12 subjects  
            if (subjectName.includes('general physics 2') || 
                subjectName.includes('general chemistry 2') ||
                subjectName.includes('general biology 2') ||
                subjectName.includes('calculus') ||
                subjectName.includes('statistics and probability')) {
                return '12';
            }
            
            // Generic number pattern
            const subjectGradeMatch = schedule.subject.name.match(/(\d{1,2})/);
            if (subjectGradeMatch && ['11', '12'].includes(subjectGradeMatch[1])) {
                return subjectGradeMatch[1];
            }
        }
        
        // Default to 11 for senior high school if we can't determine
        return '11';
    };

    // Filter schedules based on search term, strand, grade level, and semester
    const filteredSchedules = schedules.filter(schedule => {
        // Search filter
        const searchMatch = !searchTerm || 
            schedule.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.faculty?.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.faculty?.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.section?.section_name?.toLowerCase().includes(searchTerm.toLowerCase());

        // Strand filter
        const strandMatch = filterStrand === 'all' || 
            schedule.section?.strand?.code === filterStrand;

        // Grade level filter using helper function
        const scheduleGradeLevel = getScheduleGradeLevel(schedule);
        const gradeLevelMatch = filterGradeLevel === 'all' || scheduleGradeLevel === filterGradeLevel;

        // Semester filter
        const semesterMatch = semesterFilter === 'all' || 
            schedule.semester === semesterFilter ||
            schedule.subject?.semester === semesterFilter;

        return searchMatch && strandMatch && gradeLevelMatch && semesterMatch;
    });

    // Group schedules by strand, then by grade level, then by section for better organization
    // Filter by active semester tab for timetable display
    const semesterFilteredSchedules = filteredSchedules.filter(schedule => {
        const scheduleSemester = schedule.semester?.toString() || schedule.subject?.semester?.toString() || '1';
        return activeSemesterTab === 'all' || scheduleSemester === activeSemesterTab;
    });

    const schedulesByStrand = semesterFilteredSchedules.reduce((acc, schedule) => {
        const strandKey = schedule.section?.strand?.name || 'Unknown Strand';
        const strandCode = schedule.section?.strand?.code || 'UNK';
        const gradeLevel = getScheduleGradeLevel(schedule);
        const sectionKey = schedule.section ?
            `${schedule.section.section_name}` :
            'Unassigned Section';


        if (!acc[strandKey]) {
            acc[strandKey] = {
                code: strandCode,
                name: strandKey,
                grades: {}
            };
        }

        if (!acc[strandKey].grades[gradeLevel]) {
            acc[strandKey].grades[gradeLevel] = {
                sections: {}
            };
        }

        if (!acc[strandKey].grades[gradeLevel].sections[sectionKey]) {
            acc[strandKey].grades[gradeLevel].sections[sectionKey] = [];
        }

        acc[strandKey].grades[gradeLevel].sections[sectionKey].push(schedule);
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
        '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
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

            // Convert time to minutes for comparison
            const parseTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes; // Convert to minutes since midnight
            };

            const scheduleStart = parseTime(startTime);
            const scheduleEnd = parseTime(endTime);

            // Fill all time slots that fall within the schedule duration
            timeSlots.forEach(timeSlot => {
                const slotTime = parseTime(timeSlot);
                const nextSlotIndex = timeSlots.indexOf(timeSlot) + 1;
                const nextSlotTime = nextSlotIndex < timeSlots.length ? parseTime(timeSlots[nextSlotIndex]) : slotTime + 30;

                // Check if this time slot overlaps with the schedule
                // Include slots that start at or before the schedule end time
                if (slotTime >= scheduleStart && slotTime <= scheduleEnd) {
                    if (grid[day] && grid[day][timeSlot] !== undefined) {
                        // Mark different types of slots for better display
                        const isStart = slotTime === scheduleStart;
                        const isEnd = slotTime === scheduleEnd || nextSlotTime > scheduleEnd;

                        grid[day][timeSlot] = {
                            ...schedule,
                            isStart: isStart,
                            isEnd: isEnd,
                            isMiddle: !isStart && !isEnd
                        };
                    }
                }
            });
        });

        return grid;
    };

    const getScheduleColor = (subject) => {
        if (!subject) return 'border-gray-300 bg-gray-100';

        const colors = [
            'border-blue-500 bg-blue-200',
            'border-green-500 bg-green-200',
            'border-yellow-500 bg-yellow-200',
            'border-red-500 bg-red-200',
            'border-purple-500 bg-purple-200',
            'border-pink-500 bg-pink-200',
            'border-indigo-500 bg-indigo-200',
            'border-orange-500 bg-orange-200',
            'border-teal-500 bg-teal-200',
            'border-cyan-500 bg-cyan-200',
            'border-lime-500 bg-lime-200',
            'border-emerald-500 bg-emerald-200',
            'border-violet-500 bg-violet-200',
            'border-fuchsia-500 bg-fuchsia-200',
            'border-rose-500 bg-rose-200',
            'border-amber-500 bg-amber-200'
        ];

        // Create a more reliable hash based on subject name and ID
        const subjectIdentifier = subject.name || subject.subject_name || `subject_${subject.id || 'unknown'}`;
        let hash = 0;
        for (let i = 0; i < subjectIdentifier.length; i++) {
            const char = subjectIdentifier.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Add subject ID to hash for more uniqueness
        if (subject.id) {
            hash += parseInt(subject.id) * 17;
        }

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

    // Bulk assignment functions
    const openBulkModal = () => {
        console.log('Opening bulk modal with data:', {
            sections: sections?.length || 0,
            subjects: subjects?.length || 0,
            faculties: faculties?.length || 0,
            schedules: schedules?.length || 0
        });
        setBulkAssignments([]);
        setSelectedFaculty('');
        setShowBulkModal(true);
        // Add first assignment automatically
        setTimeout(() => {
            addBulkAssignment();
        }, 100);
    };

    const closeBulkModal = () => {
        setShowBulkModal(false);
        setBulkAssignments([]);
        setSelectedFaculty('');
        setAssignmentErrors({});
    };

    const addBulkAssignment = () => {
        // Check if teacher is selected
        if (!selectedFaculty) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Teacher First',
                text: 'Please select a faculty member before adding subjects.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // Check if teacher has reached the limit
        const remainingSlots = getRemainingSlots(selectedFaculty);
        if (remainingSlots <= bulkAssignments.length) {
            const currentCount = getTeacherSubjectCount(selectedFaculty);
            Swal.fire({
                icon: 'warning',
                title: 'Teacher Schedule Limit Reached',
                text: `This teacher is already assigned to ${currentCount} subjects and has ${bulkAssignments.length} pending assignments, which is the maximum limit. Please choose a different teacher or remove existing assignments.`,
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        setBulkAssignments(prev => [...prev, {
            id: Date.now(),
            section_id: '',
            subject_id: '',
            grade_level: '',
            semester_filter: '', // NEW: Required semester filter
            day_of_week: '',
            start_time: '',
            end_time: '',
            duration: 60,
            semester: '1st Semester',
            school_year: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025'
        }]);
    };

    const removeBulkAssignment = (id) => {
        setBulkAssignments(prev => prev.filter(assignment => assignment.id !== id));
    };

    const updateBulkAssignment = (id, field, value) => {
        setBulkAssignments(prev => prev.map(assignment => 
            assignment.id === id ? { ...assignment, [field]: value } : assignment
        ));
    };

    const handleBulkSubmit = async () => {
        if (!selectedFaculty) {
            Swal.fire({
                icon: 'warning',
                title: 'Faculty Required',
                text: 'Please select a faculty member for bulk assignment.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        if (bulkAssignments.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Assignments',
                text: 'Please add at least one subject assignment.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // Validate all assignments
        const incompleteAssignments = bulkAssignments.filter(assignment => 
            !assignment.section_id || !assignment.grade_level || !assignment.semester_filter || 
            !assignment.subject_id || !assignment.day_of_week || !assignment.start_time || !assignment.end_time
        );

        if (incompleteAssignments.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Assignments',
                text: `Please complete all fields for ${incompleteAssignments.length} assignment(s). Check that each assignment has: Section, Grade Level, Semester, Subject, Day, Start Time, and End Time selected.`,
                confirmButtonColor: '#f59e0b'
            });
            setBulkLoading(false);
            return;
        }

        setBulkLoading(true);

        try {
            const assignmentsToSubmit = bulkAssignments.map(assignment => ({
                ...assignment,
                faculty_id: selectedFaculty,
                duration: calculateDuration(assignment.start_time, assignment.end_time)
            }));

            // Submit all assignments in a single bulk request
            await new Promise((resolve, reject) => {
                router.post('/registrar/schedules/bulk', {
                    schedules: assignmentsToSubmit,
                    suppress_individual_notifications: true // Flag to prevent individual notifications
                }, {
                    onSuccess: (response) => {
                        console.log('Bulk creation successful:', response);
                        resolve(response);
                    },
                    onError: (errors) => {
                        console.error('Bulk assignment error:', errors);
                        reject(errors);
                    },
                    preserveState: true,
                    preserveScroll: true
                });
            });

            // If we reach here, all assignments were successful
            const successCount = assignmentsToSubmit.length;
            const errorCount = 0;
            
            // Clear any previous assignment errors
            setAssignmentErrors({});

            // Show consolidated success message
            Swal.fire({
                icon: 'success',
                title: 'Schedules Created Successfully!',
                text: `Successfully created ${successCount} schedule${successCount !== 1 ? 's' : ''} for the selected teacher.`,
                confirmButtonColor: '#10b981',
                timer: 3000,
                timerProgressBar: true
            });
            
            // Close modal and reload data
            closeBulkModal();
            router.reload();

        } catch (error) {
            console.error('Bulk assignment error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Assignment Failed',
                text: 'Some assignments could not be created. Please check for conflicts and try again. The modal will stay open so you can adjust your selections.',
                confirmButtonColor: '#dc2626'
            });
            // Keep modal open with all data intact
        } finally {
            setBulkLoading(false);
        }
    };

    // HCI Enhancement: Keyboard Shortcuts - Principle 7: Flexibility and Efficiency
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl+N - New schedule
            if (event.ctrlKey && event.key === 'n') {
                event.preventDefault();
                openBulkModal();
            }
            // Ctrl+F - Focus search
            else if (event.ctrlKey && event.key === 'f') {
                event.preventDefault();
                document.querySelector('input[placeholder*="Search"]')?.focus();
            }
            // ? - Toggle help
            else if (event.key === '?') {
                event.preventDefault();
                setShowHelp(!showHelp);
            }
            // Escape - Close modals
            else if (event.key === 'Escape') {
                if (showModal) {
                    setShowModal(false);
                    resetForm();
                }
                if (showBulkModal) {
                    closeBulkModal();
                }
                if (showStrandModal) {
                    setShowStrandModal(false);
                }
                if (showHelp) {
                    setShowHelp(false);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showModal, showBulkModal, showStrandModal, showHelp]);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar onToggle={setIsCollapsed} />

            <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto">
                    {/* School Year Warning */}
                    <SchoolYearWarning 
                        show={!hasActiveSchoolYear}
                        title="No Active School Year Found"
                        message="You need to create and activate a school year before creating or managing class schedules. All schedules must be associated with an active academic year."
                        actionText="Create School Year"
                        actionLink="/registrar/school-years"
                    />

                    {/* Enhanced Header with System Status - HCI Principle 1: Visibility of System Status */}
                    <div className="mb-8">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                                        <FaCalendarAlt className="text-purple-600" />
                                        Schedule Management
                                    </h1>
                                    {/* System Status Indicator - HCI Principle 1 */}
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                        <div className={`w-2 h-2 rounded-full ${systemStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className="text-sm font-medium text-green-800">
                                            {systemStatus.isOnline ? 'System Online' : 'System Offline'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-gray-600">Manage class schedules for {currentSchoolYear}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span>Last sync: {systemStatus.lastSync}</span>
                                    {systemStatus.pendingActions > 0 && (
                                        <span className="flex items-center gap-1 text-orange-600">
                                            <FaBell className="w-3 h-3" />
                                            {systemStatus.pendingActions} pending actions
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Action Buttons with Better Accessibility - HCI Principle 3: User Control */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowHelp(!showHelp)}
                                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                                    title="Show help and keyboard shortcuts (Press ? key)"
                                    aria-label="Toggle help panel"
                                >
                                    <FaQuestionCircle className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSystemStatus(prev => ({...prev, lastSync: new Date().toLocaleTimeString()}));
                                        router.reload();
                                    }}
                                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                                    title="Refresh data (Ctrl+R)"
                                    aria-label="Refresh schedule data"
                                >
                                    <FaSync className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={openBulkModal}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all duration-200 focus:ring-4 focus:ring-purple-300 focus:outline-none"
                                    aria-label="Create new class schedule"
                                >
                                    <FaCalendarAlt className="w-4 h-4" />
                                    Create Schedule
                                </button>
                            </div>
                        </div>
                        
                        {/* Enhanced Search and Filter Controls - HCI Principle 6: Recognition Rather Than Recall */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search schedules, subjects, or faculty..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                            aria-label="Search schedules by subject, faculty, or section"
                                        />
                                    </div>
                                    <div className="flex gap-3 flex-wrap">
                                        <select
                                            value={filterStrand}
                                            onChange={(e) => setFilterStrand(e.target.value)}
                                            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                            aria-label="Filter by strand"
                                        >
                                            <option value="all">All Strands</option>
                                            <option value="STEM">STEM</option>
                                            <option value="ABM">ABM</option>
                                            <option value="HUMSS">HUMSS</option>
                                            <option value="TVL">TVL</option>
                                        </select>
                                        <select
                                            value={filterGradeLevel}
                                            onChange={(e) => setFilterGradeLevel(e.target.value)}
                                            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                            aria-label="Filter by grade level"
                                        >
                                            <option value="all">All Grades</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </select>
                                        <select
                                            value={semesterFilter}
                                            onChange={(e) => setSemesterFilter(e.target.value)}
                                            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                            aria-label="Filter by semester"
                                        >
                                            <option value="all">All Semesters</option>
                                            <option value="1">1st Semester</option>
                                            <option value="2">2nd Semester</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Quick Stats - HCI Principle 1: Visibility of System Status */}
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-gray-600">Filtered: <span className="font-semibold">{filteredSchedules?.length || 0}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                        <span className="text-gray-600">Total: <span className="font-semibold">{schedules?.length || 0}</span></span>
                                    </div>
                                    {(filterGradeLevel !== 'all' || filterStrand !== 'all' || semesterFilter !== 'all' || searchTerm) && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                            <span className="text-gray-600">
                                                {filterGradeLevel !== 'all' && `Grade ${filterGradeLevel}`}
                                                {filterStrand !== 'all' && ` ${filterStrand}`}
                                                {semesterFilter !== 'all' && ` ${semesterFilter}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Contextual Help Panel - HCI Principle 10: Help and Documentation */}
                        {showHelp && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
                                <div className="flex items-start gap-3">
                                    <FaInfoCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-blue-900 font-semibold mb-3 flex items-center gap-2">
                                            Quick Help Guide
                                            <button
                                                onClick={() => setShowHelp(false)}
                                                className="ml-auto text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                aria-label="Close help panel"
                                            >
                                                <FaTimes className="w-4 h-4" />
                                            </button>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <h4 className="font-medium text-blue-800 mb-2">Creating Schedules:</h4>
                                                <ul className="text-blue-700 space-y-1">
                                                    <li>• Select section first to filter options</li>
                                                    <li>• Choose subject and faculty from filtered lists</li>
                                                    <li>• Set day and time (system checks conflicts)</li>
                                                    <li>• Review before saving</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                                                    <FaKeyboard className="w-4 h-4" />
                                                    Keyboard Shortcuts:
                                                </h4>
                                                <ul className="text-blue-700 space-y-1">
                                                    <li>• <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl+N</kbd> New schedule</li>
                                                    <li>• <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl+F</kbd> Search</li>
                                                    <li>• <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">?</kbd> Toggle help</li>
                                                    <li>• <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Esc</kbd> Close modals</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Status Messages - HCI Principle 9: Help Users Recognize, Diagnose, and Recover from Errors */}
                        {notifications.length > 0 && (
                            <div className="space-y-2 mb-6">
                                {notifications.map((notification, index) => (
                                    <div key={index} className={`flex items-center gap-3 p-4 rounded-lg border ${
                                        notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                                        notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                        notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                                        'bg-blue-50 border-blue-200 text-blue-800'
                                    }`}>
                                        {notification.type === 'success' && <FaCheckCircle className="w-5 h-5 text-green-600" />}
                                        {notification.type === 'warning' && <FaExclamationTriangle className="w-5 h-5 text-yellow-600" />}
                                        {notification.type === 'error' && <FaTimes className="w-5 h-5 text-red-600" />}
                                        {notification.type === 'info' && <FaInfoCircle className="w-5 h-5 text-blue-600" />}
                                        <span className="flex-1">{notification.message}</span>
                                        <button
                                            onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                                            className="text-current hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 rounded p-1"
                                            aria-label="Dismiss notification"
                                        >
                                            <FaTimes className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Enhanced Statistics Cards - HCI Principle 1: Visibility of System Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <FaUsers className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Sections</p>
                                        <p className="text-2xl font-bold text-gray-800">{sections?.length || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">Across all strands</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <FaChalkboardTeacher className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Faculty</p>
                                        <p className="text-2xl font-bold text-gray-800">{faculties?.length || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {faculties?.filter(f => f.role === 'coordinator').length || 0} coordinators
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 rounded-lg">
                                        <FaCalendarAlt className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Active Schedules</p>
                                        <p className="text-2xl font-bold text-gray-800">{filteredSchedules?.length || 0}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            <span>Grade 11: {filteredSchedules?.filter(s => s.section?.grade_level === '11' || s.subject?.year_level === '11').length || 0}</span>
                                            <span>•</span>
                                            <span>Grade 12: {filteredSchedules?.filter(s => s.section?.grade_level === '12' || s.subject?.year_level === '12').length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <FaClock className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Weekly Hours</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {Math.round(filteredSchedules?.reduce((total, schedule) => total + (schedule.duration || 60), 0) / 60) || 0}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {filterGradeLevel !== 'all' ? `Grade ${filterGradeLevel} hours` : 'Total teaching hours'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Semester Tabs for Timetable Separation */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <FaCalendarAlt className="w-5 h-5" />
                                Schedule Timetables by Semester
                            </h2>
                            <p className="text-indigo-100 text-sm mt-1">View schedules separated by semester to avoid confusion</p>
                        </div>
                        
                        <div className="p-6">
                            {/* Semester Tab Navigation */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                <button
                                    onClick={() => setActiveSemesterTab('1')}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                                        activeSemesterTab === '1'
                                            ? 'bg-green-600 text-white shadow-lg scale-105'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                >
                                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                                    1st Semester
                                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                                        {filteredSchedules.filter(s => (s.semester?.toString() || s.subject?.semester?.toString() || '1') === '1').length}
                                    </span>
                                </button>
                                
                                <button
                                    onClick={() => setActiveSemesterTab('2')}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                                        activeSemesterTab === '2'
                                            ? 'bg-orange-600 text-white shadow-lg scale-105'
                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                    }`}
                                >
                                    <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                                    2nd Semester
                                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                                        {filteredSchedules.filter(s => (s.semester?.toString() || s.subject?.semester?.toString() || '1') === '2').length}
                                    </span>
                                </button>
                                
                                <button
                                    onClick={() => setActiveSemesterTab('all')}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                                        activeSemesterTab === 'all'
                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                    <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                                    All Semesters
                                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                                        {filteredSchedules.length}
                                    </span>
                                </button>
                            </div>
                            
                            {/* Active Semester Info */}
                            <div className={`p-4 rounded-lg border-l-4 ${
                                activeSemesterTab === '1' 
                                    ? 'bg-green-50 border-green-400' 
                                    : activeSemesterTab === '2' 
                                        ? 'bg-orange-50 border-orange-400'
                                        : 'bg-blue-50 border-blue-400'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <FaInfoCircle className={`w-4 h-4 ${
                                        activeSemesterTab === '1' 
                                            ? 'text-green-600' 
                                            : activeSemesterTab === '2' 
                                                ? 'text-orange-600'
                                                : 'text-blue-600'
                                    }`} />
                                    <h3 className={`font-semibold ${
                                        activeSemesterTab === '1' 
                                            ? 'text-green-800' 
                                            : activeSemesterTab === '2' 
                                                ? 'text-orange-800'
                                                : 'text-blue-800'
                                    }`}>
                                        {activeSemesterTab === '1' 
                                            ? 'Viewing 1st Semester Schedules' 
                                            : activeSemesterTab === '2' 
                                                ? 'Viewing 2nd Semester Schedules'
                                                : 'Viewing All Semester Schedules'
                                        }
                                    </h3>
                                </div>
                                <p className={`text-sm ${
                                    activeSemesterTab === '1' 
                                        ? 'text-green-700' 
                                        : activeSemesterTab === '2' 
                                            ? 'text-orange-700'
                                            : 'text-blue-700'
                                }`}>
                                    {activeSemesterTab === '1' 
                                        ? 'Showing only 1st semester subjects and schedules. These are typically taught in the first half of the academic year.'
                                        : activeSemesterTab === '2' 
                                            ? 'Showing only 2nd semester subjects and schedules. These are typically taught in the second half of the academic year.'
                                            : 'Showing schedules from both semesters. Use the semester tabs above to filter by specific semester.'
                                    }
                                </p>
                            </div>
                            
                            {/* Semester Statistics Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500 rounded-lg">
                                            <FaCalendarAlt className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-green-800 font-semibold">1st Semester</p>
                                            <p className="text-2xl font-bold text-green-900">
                                                {filteredSchedules.filter(s => (s.semester?.toString() || s.subject?.semester?.toString() || '1') === '1').length}
                                            </p>
                                            <p className="text-xs text-green-600">Active schedules</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500 rounded-lg">
                                            <FaCalendarAlt className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-orange-800 font-semibold">2nd Semester</p>
                                            <p className="text-2xl font-bold text-orange-900">
                                                {filteredSchedules.filter(s => (s.semester?.toString() || s.subject?.semester?.toString() || '1') === '2').length}
                                            </p>
                                            <p className="text-xs text-orange-600">Active schedules</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500 rounded-lg">
                                            <FaUsers className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-blue-800 font-semibold">Currently Viewing</p>
                                            <p className="text-2xl font-bold text-blue-900">
                                                {semesterFilteredSchedules.length}
                                            </p>
                                            <p className="text-xs text-blue-600">
                                                {activeSemesterTab === 'all' ? 'All semesters' : `${activeSemesterTab === '1' ? '1st' : '2nd'} semester only`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Strand Cards Display - HCI Principle 8: Aesthetic and Minimalist Design */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(schedulesByStrand).length > 0 ? (
                            Object.entries(schedulesByStrand).map(([strandName, strandData]) => {
                                // Calculate totals across all grades
                                const totalClasses = Object.values(strandData.grades)
                                    .flatMap(grade => Object.values(grade.sections))
                                    .flat().length;
                                const sectionsCount = Object.values(strandData.grades)
                                    .reduce((count, grade) => count + Object.keys(grade.sections).length, 0);
                                
                                // Get grade-level breakdown
                                const gradeBreakdown = Object.entries(strandData.grades).map(([gradeLevel, gradeData]) => ({
                                    grade: gradeLevel,
                                    sections: Object.keys(gradeData.sections).length,
                                    classes: Object.values(gradeData.sections).flat().length
                                }));
                                
                                return (
                                    <div key={strandName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
                                        {/* Enhanced Strand Header with Progress Indicator */}
                                        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white p-6 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/10 transform -skew-y-1 translate-y-8"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                                            <FaUsers className="w-5 h-5" />
                                                        </div>
                                                        <h3 className="text-xl font-bold">{strandData.code}</h3>
                                                    </div>
                                                    {/* Status Indicator - HCI Principle 1 */}
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            totalClasses > 0 ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                                                        }`}></div>
                                                        <span className="text-xs text-white/80">
                                                            {totalClasses > 0 ? 'Active' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-purple-100 font-medium text-sm leading-relaxed">{strandData.name}</p>
                                            </div>
                                        </div>

                                        {/* Enhanced Statistics with Grade-Level Breakdown */}
                                        <div className="p-6">
                                            <div className="space-y-4">
                                                {/* Grade Level Breakdown */}
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                        <FaUsers className="w-4 h-4 text-indigo-500" />
                                                        Grade Level Breakdown
                                                    </h4>
                                                    {gradeBreakdown.map(({ grade, sections, classes }) => (
                                                        <div key={grade} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    Grade {grade}
                                                                </span>
                                                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                                                    <span>{sections} sections</span>
                                                                    <span>•</span>
                                                                    <span>{classes} classes</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                <div 
                                                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                                                        grade === '11' ? 'bg-blue-500' : 'bg-green-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min((classes / Math.max(totalClasses, 1)) * 100, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Total Summary */}
                                                <div className="border-t border-gray-200 pt-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-600 flex items-center gap-2 text-sm font-medium">
                                                            <FaCalendarAlt className="w-4 h-4 text-purple-500" />
                                                            Total Classes
                                                        </span>
                                                        <span className="font-bold text-gray-800 text-lg">{totalClasses}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-600 flex items-center gap-2 text-sm font-medium">
                                                            <FaClock className="w-4 h-4 text-green-500" />
                                                            Weekly Hours
                                                        </span>
                                                        <span className="font-bold text-gray-800">
                                                            {Object.values(strandData.grades)
                                                                .flatMap(grade => Object.values(grade.sections))
                                                                .flat()
                                                                .reduce((total, schedule) => total + (schedule.duration || 60), 0) / 60}h
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Enhanced Action Button - HCI Principle 7: Flexibility and Efficiency */}
                                                <div className="pt-4">
                                                    <button
                                                        onClick={() => openStrandModal({ data: strandData, name: strandName })}
                                                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:ring-4 focus:ring-blue-300 focus:outline-none group-hover:animate-pulse"
                                                        aria-label={`View detailed schedules for ${strandName} strand`}
                                                    >
                                                        <FaEye className="w-4 h-4" />
                                                        View Detailed Schedule
                                                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            →
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* Enhanced Empty State - HCI Principle 10: Help and Documentation */
                            <div className="col-span-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                <div className="p-12 text-center">
                                    <div className="relative mb-6">
                                        <div className="p-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                            <FaCalendarAlt className="w-12 h-12 text-purple-600" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                                            <FaPlus className="w-4 h-4 text-yellow-800" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-3">No Schedules Created Yet</h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                                        Get started by creating your first class schedule. The system will guide you through the process step by step.
                                    </p>
                                    
                                    {/* Getting Started Guide - HCI Principle 10 */}
                                    <div className="bg-blue-50 rounded-lg p-6 text-left max-w-lg mx-auto mb-6">
                                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                            <FaInfoCircle className="w-4 h-4" />
                                            Quick Start Guide
                                        </h4>
                                        <ol className="text-sm text-blue-800 space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                                                <span>Click "Create Schedule" to open the schedule builder</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                                                <span>Select a section first (this filters available subjects)</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                                                <span>Choose subject, faculty, day, and time</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                                                <span>System automatically checks for conflicts</span>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Create/Edit Schedule Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-300">
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
                                    {/* Enhanced Error Display - HCI Principle 9: Help Users Recognize, Diagnose, and Recover from Errors */}
                                    {Object.keys(errors).length > 0 && (
                                        <div className="bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0">
                                                    <FaExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                                                        Validation Errors Found
                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                            {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''}
                                                        </span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {Object.entries(errors).map(([field, message]) => (
                                                            <div key={field} className="flex items-start gap-2 text-sm">
                                                                <span className="text-red-500 mt-1">•</span>
                                                                <div>
                                                                    <span className="font-medium text-red-800 capitalize">{field.replace('_', ' ')}:</span>
                                                                    <span className="text-red-700 ml-1">{Array.isArray(message) ? message[0] : message}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Progress Indicator - HCI Principle 1: Visibility of System Status */}
                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 rounded-xl p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <FaInfoCircle className="w-5 h-5 text-purple-600" />
                                            <h3 className="text-purple-900 font-semibold">Schedule Creation Wizard</h3>
                                        </div>
                                        
                                        {/* Progress Steps */}
                                        <div className="flex items-center justify-between mb-4">
                                            {[
                                                { step: 1, label: 'Section', completed: !!formData.section_id },
                                                { step: 2, label: 'Subject', completed: !!formData.subject_id },
                                                { step: 3, label: 'Faculty', completed: !!formData.faculty_id },
                                                { step: 4, label: 'Schedule', completed: !!formData.day_of_week && !!formData.start_time }
                                            ].map((item, index) => (
                                                <div key={item.step} className="flex items-center">
                                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-200 ${
                                                        item.completed 
                                                            ? 'bg-green-500 text-white' 
                                                            : formData.section_id || item.step === 1
                                                                ? 'bg-purple-600 text-white'
                                                                : 'bg-gray-300 text-gray-600'
                                                    }`}>
                                                        {item.completed ? (
                                                            <FaCheckCircle className="w-4 h-4" />
                                                        ) : (
                                                            item.step
                                                        )}
                                                    </div>
                                                    <span className={`ml-2 text-sm font-medium ${
                                                        item.completed ? 'text-green-700' : 'text-gray-700'
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                    {index < 3 && (
                                                        <div className={`w-8 h-0.5 mx-3 transition-colors duration-200 ${
                                                            item.completed ? 'bg-green-300' : 'bg-gray-300'
                                                        }`}></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="text-sm text-purple-700 bg-purple-100/50 rounded-lg p-3">
                                            <p className="font-medium mb-1">💡 Pro Tip:</p>
                                            <p>Select each step in order for the best experience. The system will automatically filter options based on your previous selections.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Enhanced Section Selection - Step 1 */}
                                        <div className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                                            formData.section_id 
                                                ? 'bg-green-50/80 border-green-300/50' 
                                                : 'bg-blue-50/80 border-blue-300/50'
                                        }`}>
                                            <label className="block text-sm font-bold mb-3 flex items-center gap-3">
                                                <span className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
                                                    formData.section_id ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                                                }`}>
                                                    {formData.section_id ? <FaCheckCircle className="w-4 h-4" /> : '1'}
                                                </span>
                                                <span className={formData.section_id ? 'text-green-800' : 'text-blue-800'}>
                                                    Section Selection {formData.section_id && '✓'}
                                                </span>
                                            </label>
                                            
                                            <div className="relative">
                                                <select
                                                    value={formData.section_id}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            section_id: e.target.value,
                                                            subject_id: '', // Reset dependent fields
                                                            faculty_id: ''
                                                        });
                                                        // Clear errors for this field
                                                        if (errors.section_id) {
                                                            setErrors(prev => ({ ...prev, section_id: null }));
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm text-gray-800 font-medium transition-all duration-200 ${
                                                        errors.section_id 
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                            : formData.section_id 
                                                                ? 'border-green-300' 
                                                                : 'border-blue-300/50'
                                                    }`}
                                                    required
                                                    aria-describedby="section-help"
                                                >
                                                    <option value="">🎯 Choose a section to begin...</option>
                                                    {sections?.map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            📚 {section.section_name} ({section.strand?.name || 'No Strand'}) - Grade {section.grade_level || 'N/A'}
                                                        </option>
                                                    ))}
                                                </select>
                                                {formData.section_id && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <FaCheckCircle className="w-5 h-5 text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <p id="section-help" className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                                                <FaInfoCircle className="w-4 h-4 text-blue-500" />
                                                Selecting a section will filter available subjects and faculty for that strand.
                                            </p>
                                            {!formData.section_id && (
                                                <p className="text-blue-600 text-xs mt-1">⚠️ Select a section to enable other fields</p>
                                            )}
                                        </div>

                                        {/* Loading State for Dependent Fields */}
                                        {formData.section_id && (
                                            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-green-800">
                                                    <FaCheckCircle className="w-4 h-4" />
                                                    <span className="font-medium">Section selected successfully!</span>
                                                </div>
                                                <p className="text-sm text-green-700 mt-1">
                                                    Now you can select from filtered subjects and faculty members.
                                                </p>
                                            </div>
                                        )}

                                        {/* Grade Level Selection - Step 1 */}
                                        <div className="bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-4">
                                            <label className="block text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                                                Grade Level
                                            </label>
                                            <select
                                                value={formData.grade_level}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        grade_level: e.target.value,
                                                        subject_id: '', // Reset dependent fields
                                                        faculty_id: ''
                                                    })
                                                }}
                                                className="w-full px-4 py-3 border-2 border-blue-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm"
                                                required
                                            >
                                                <option value="">Choose a grade level...</option>
                                                <option value="11">Grade 11</option>
                                                <option value="12">Grade 12</option>
                                            </select>
                                            {!formData.grade_level && (
                                                <p className="text-blue-600 text-xs mt-1">⚠️ Select a grade level to enable other fields</p>
                                            )}
                                        </div>

                                        {/* Semester Filter */}
                                        <div className="bg-purple-50/80 backdrop-blur-sm border-2 border-purple-200/50 rounded-lg p-4">
                                            <label className="block text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                                <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">📅</span>
                                                Semester Filter (Optional)
                                            </label>
                                            <select
                                                value={semesterFilter}
                                                onChange={(e) => setSemesterFilter(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-purple-300/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm"
                                            >
                                                <option value="all">All Semesters</option>
                                                <option value="1">1st Semester Only</option>
                                                <option value="2">2nd Semester Only</option>
                                            </select>
                                            <p className="text-purple-600 text-xs mt-1">
                                                💡 <strong>Important:</strong> Filter by semester to avoid scheduling conflicts between different semester subjects.
                                            </p>
                                        </div>

                                        {/* Semester Selection - Step 2A */}
                                        <div className={`${formData.section_id && formData.grade_level ? 'bg-orange-50/80 backdrop-blur-sm border-2 border-orange-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.grade_level ? 'text-orange-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.grade_level ? 'bg-orange-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2A</span>
                                                📅 Semester Selection {formData.section_id && formData.grade_level ? '(Required for Subject Filtering)' : '(Select Section and Grade Level First)'}
                                            </label>
                                            <select
                                                value={formData.semester_filter || ''}
                                                onChange={(e) => {
                                                    setFormData({ 
                                                        ...formData, 
                                                        semester_filter: e.target.value,
                                                        subject_id: '', // Reset subject when semester changes
                                                        semester: e.target.value === '1' ? '1st Semester' : '2nd Semester'
                                                    });
                                                    // Also update the global semester filter
                                                    setSemesterFilter(e.target.value);
                                                }}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level ? 'border-orange-300/50 focus:ring-orange-500 focus:border-orange-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!(formData.section_id && formData.grade_level)}
                                                required
                                            >
                                                <option value="">Choose Semester</option>
                                                <option value="1">🟢 1st Semester</option>
                                                <option value="2">🟠 2nd Semester</option>
                                            </select>
                                            <div className="mt-2 bg-orange-100/50 rounded-lg p-3">
                                                <p className="text-xs text-orange-700 font-medium">
                                                    ⚠️ <strong>Important:</strong> Select the semester first to filter subjects correctly. 
                                                    This prevents scheduling conflicts between different semester subjects.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Subject Selection - Step 2B */}
                                        <div className={`${formData.section_id && formData.grade_level && formData.semester_filter ? 'bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.grade_level && formData.semester_filter ? 'text-green-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.grade_level && formData.semester_filter ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2B</span>
                                                Subject 
                                                {formData.semester_filter && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                        {formData.semester_filter === '1' ? '1st Sem Only' : '2nd Sem Only'}
                                                    </span>
                                                )}
                                            </label>
                                            <select
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level && formData.semester_filter ? 'border-green-300/50 focus:ring-green-500 focus:border-green-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!(formData.section_id && formData.grade_level && formData.semester_filter)}
                                                required
                                            >
                                                <option value="">
                                                    {!formData.semester_filter ? 'Select Semester First' : 'Select Subject'}
                                                </option>
                                                {formData.semester_filter && availableSubjects
                                                    .filter(subject => subject.semester?.toString() === formData.semester_filter)
                                                    .map((subject) => (
                                                    <option key={subject.id} value={subject.id} disabled={subject.isDisabled}>
                                                        {subject.code} - {subject.name} {subject.disabledReason ? `(${subject.disabledReason})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {!formData.semester_filter && (
                                                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                                    <span>⚠️</span> Please select a semester first to see available subjects
                                                </p>
                                            )}
                                            {formData.semester_filter && (
                                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                    <span>✅</span> Showing only {formData.semester_filter === '1' ? '1st semester' : '2nd semester'} subjects
                                                </p>
                                            )}
                                        </div>

                                        {/* Faculty Selection - Step 2 */}
                                        <div className={`${formData.section_id && formData.grade_level ? 'bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.grade_level ? 'text-green-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.grade_level ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2</span>
                                                Faculty {formData.section_id && formData.grade_level ? '(Available Teachers - Optional)' : '(Select Section and Grade Level First - Optional)'}
                                            </label>
                                            <select
                                                value={formData.faculty_id}
                                                onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level ? 'border-green-300/50 focus:ring-green-500 focus:border-green-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!(formData.section_id && formData.grade_level)}
                                            >
                                                <option value="">No Faculty Assigned</option>
                                                {formData.section_id && faculties?.map((faculty) => (
                                                    <option key={faculty.id} value={faculty.id}>
                                                        {faculty.firstname} {faculty.lastname}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Day and Time Selection - Step 3 */}
                                        <div className={`${formData.section_id && formData.grade_level && formData.subject_id ? 'bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.grade_level && formData.subject_id ? 'text-yellow-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.grade_level && formData.subject_id ? 'bg-yellow-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>3</span>
                                                Schedule Details
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Day of Week</label>
                                                    <select
                                                        value={formData.day_of_week}
                                                        onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level && formData.subject_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.grade_level && formData.subject_id)}
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
                                                    <select
                                                        value={formData.start_time}
                                                        onChange={(e) => {
                                                            const selectedTime = e.target.value;

                                                            // Auto-set end time based on valid time slots
                                                            const validTimeSlots = {
                                                                '08:00': '10:00', // 1st Period
                                                                '10:30': '12:30', // 2nd Period
                                                                '13:30': '15:30', // 3rd Period
                                                                '15:30': '16:30'  // 4th Period
                                                            };

                                                            if (validTimeSlots[selectedTime]) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    start_time: selectedTime,
                                                                    end_time: validTimeSlots[selectedTime]
                                                                }));
                                                            }
                                                        }}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level && formData.subject_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.grade_level && formData.subject_id)}
                                                        required
                                                    >
                                                        <option value="">Select Start Time</option>
                                                        <option value="08:00">8:00 AM (1st Period)</option>
                                                        <option value="10:30">10:30 AM (2nd Period)</option>
                                                        <option value="13:30">1:30 PM (3rd Period)</option>
                                                        <option value="15:30">3:30 PM (4th Period)</option>
                                                    </select>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        <strong>Valid time slots only:</strong> 4 periods per day system
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                                                    <select
                                                        value={formData.end_time}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, end_time: e.target.value });
                                                        }}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level && formData.subject_id ? 'border-yellow-300/50 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                        disabled={!(formData.section_id && formData.grade_level && formData.subject_id)}
                                                        required
                                                    >
                                                        <option value="">Select End Time</option>
                                                        <option value="10:00">10:00 AM (1st Period End)</option>
                                                        <option value="12:30">12:30 PM (2nd Period End)</option>
                                                        <option value="15:30">3:30 PM (3rd Period End)</option>
                                                        <option value="16:30">4:30 PM (4th Period End)</option>
                                                    </select>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        <strong>Auto-filled based on start time selection</strong>
                                                    </div>
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
                                                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white/90 backdrop-blur-sm"
                                                        disabled={!(formData.section_id && formData.grade_level && formData.subject_id)}
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
                                                        onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white/90 backdrop-blur-sm"
                                                        disabled={!(formData.section_id && formData.grade_level && formData.subject_id)}
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
                                            className={`px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${loading
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

                    {/* Bulk Assignment Modal */}
                    {showBulkModal && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-300">
                            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-3xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                                <FaCalendarAlt className="w-6 h-6" />
                                                Create Class Schedule
                                            </h2>
                                            <p className="text-purple-100 mt-2">Assign one or multiple subjects to a teacher</p>
                                        </div>
                                        <button
                                            onClick={closeBulkModal}
                                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                                            aria-label="Close modal"
                                        >
                                            <FaTimes className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6 bg-white/90 backdrop-blur-sm">
                                    {/* Faculty Selection */}
                                    <div className="bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50 rounded-lg p-4">
                                        <label className="block text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                                            <FaChalkboardTeacher className="w-4 h-4" />
                                            Select Faculty Member
                                        </label>
                                        <select
                                            value={selectedFaculty}
                                            onChange={(e) => setSelectedFaculty(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-green-300/50 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm"
                                            required
                                        >
                                            <option value="">Choose a faculty member...</option>
                                            {faculties?.map((faculty) => (
                                                <option key={faculty.id} value={faculty.id}>
                                                    {faculty.firstname} {faculty.lastname}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-green-600 text-xs">💡 This teacher will be assigned to all subjects below</p>
                                            <p className="text-amber-600 text-xs font-medium">⚠️ Each teacher can only be assigned to a maximum of 4 subjects</p>
                                            {selectedFaculty && (
                                                <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-blue-800 font-medium">Current Status:</span>
                                                        <span className="text-blue-600">
                                                            {getTeacherSubjectCount(selectedFaculty)} assigned + {bulkAssignments.length} pending = {getTeacherSubjectCount(selectedFaculty) + bulkAssignments.length}/4 subjects
                                                        </span>
                                                    </div>
                                                    {getRemainingSlots(selectedFaculty) - bulkAssignments.length > 0 ? (
                                                        <p className="text-green-600 text-xs mt-1">
                                                            ✓ {getRemainingSlots(selectedFaculty) - bulkAssignments.length} more subject{getRemainingSlots(selectedFaculty) - bulkAssignments.length !== 1 ? 's' : ''} can be added
                                                        </p>
                                                    ) : (
                                                        <p className="text-red-600 text-xs mt-1 font-medium">
                                                            ⚠️ Teacher has reached the maximum limit
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subject Assignments */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-800">Subject Assignments</h3>
                                            <button
                                                onClick={addBulkAssignment}
                                                disabled={!selectedFaculty || isTeacherAtLimit(selectedFaculty)}
                                                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                                    !selectedFaculty || isTeacherAtLimit(selectedFaculty)
                                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                                title={
                                                    !selectedFaculty 
                                                        ? 'Select a teacher first' 
                                                        : isTeacherAtLimit(selectedFaculty) 
                                                            ? 'Teacher has reached the 4-subject limit' 
                                                            : 'Add another subject'
                                                }
                                            >
                                                <FaPlus className="w-4 h-4" />
                                                {!selectedFaculty 
                                                    ? 'Select Teacher First' 
                                                    : isTeacherAtLimit(selectedFaculty) 
                                                        ? 'Limit Reached (4/4)' 
                                                        : `Add Subject (${getTeacherSubjectCount(selectedFaculty) + bulkAssignments.length}/4)`
                                                }
                                            </button>
                                        </div>

                                        {bulkAssignments.length === 0 ? (
                                            <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300">
                                                <FaCalendarAlt className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                                                <h4 className="text-lg font-semibold text-gray-800 mb-2">Ready to Create Schedules</h4>
                                                <p className="text-gray-600 mb-4">Add one or more subjects to assign to the selected teacher</p>
                                                <div className="bg-white/70 rounded-lg p-3 mb-4 text-sm text-gray-700">
                                                    <p className="font-medium mb-1">📋 Quick Guide:</p>
                                                    <ul className="text-left space-y-1 text-xs">
                                                        <li>• Select a teacher first (required)</li>
                                                        <li>• Add subjects one by one</li>
                                                        <li>• Each teacher: maximum 4 subjects</li>
                                                        <li>• Choose different days/times to avoid conflicts</li>
                                                    </ul>
                                                </div>
                                                <button
                                                    onClick={addBulkAssignment}
                                                    disabled={!selectedFaculty}
                                                    className={`px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg ${
                                                        !selectedFaculty
                                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl'
                                                    }`}
                                                >
                                                    <FaPlus className="w-4 h-4" />
                                                    {!selectedFaculty ? 'Select Teacher First' : 'Add First Subject'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                                {bulkAssignments.map((assignment, index) => {
                                                    const hasError = assignmentErrors[assignment.id];
                                                    return (
                                                        <div key={assignment.id} className={`bg-white border rounded-lg p-4 shadow-sm ${
                                                            hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium text-gray-800">Subject Assignment #{index + 1}</h4>
                                                                    {hasError && (
                                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                                            Error
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => removeBulkAssignment(assignment.id)}
                                                                    className="text-red-600 hover:text-red-800 p-1"
                                                                    title="Remove Assignment"
                                                                >
                                                                    <FaTrash className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            {/* Error Messages */}
                                                            {hasError && (
                                                                <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                                                            <span className="text-white text-xs">!</span>
                                                                        </div>
                                                                        <span className="text-red-800 font-medium text-sm">Assignment Error:</span>
                                                                    </div>
                                                                    <ul className="text-red-700 text-sm space-y-1 ml-6">
                                                                        {Object.entries(hasError).map(([field, message]) => (
                                                                            <li key={field}>• {Array.isArray(message) ? message[0] : message}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                            {/* Section */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                                                                <select
                                                                    value={assignment.section_id}
                                                                    onChange={(e) => {
                                                                        updateBulkAssignment(assignment.id, 'section_id', e.target.value);
                                                                        updateBulkAssignment(assignment.id, 'subject_id', ''); // Reset subject
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                                                            {/* Grade Level */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Grade Level</label>
                                                                <select
                                                                    value={assignment.grade_level}
                                                                    onChange={(e) => {
                                                                        updateBulkAssignment(assignment.id, 'grade_level', e.target.value);
                                                                        updateBulkAssignment(assignment.id, 'subject_id', ''); // Reset subject
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    required
                                                                >
                                                                    <option value="">Select Grade</option>
                                                                    <option value="11">Grade 11</option>
                                                                    <option value="12">Grade 12</option>
                                                                </select>
                                                            </div>

                                                            {/* Semester Filter - NEW */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                    <span className="flex items-center gap-1">
                                                                        📅 Semester
                                                                        <span className="text-red-500">*</span>
                                                                    </span>
                                                                </label>
                                                                <select
                                                                    value={assignment.semester_filter || ''}
                                                                    onChange={(e) => {
                                                                        updateBulkAssignment(assignment.id, 'semester_filter', e.target.value);
                                                                        updateBulkAssignment(assignment.id, 'subject_id', ''); // Reset subject when semester changes
                                                                        // Also update the semester field for the assignment
                                                                        updateBulkAssignment(assignment.id, 'semester', e.target.value === '1' ? '1st Semester' : '2nd Semester');
                                                                    }}
                                                                    className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-orange-50"
                                                                    required
                                                                >
                                                                    <option value="">Choose Semester</option>
                                                                    <option value="1">🟢 1st Semester</option>
                                                                    <option value="2">🟠 2nd Semester</option>
                                                                </select>
                                                                <p className="text-xs text-orange-600 mt-1 font-medium">
                                                                    ⚠️ Required: Filters subjects by semester
                                                                </p>
                                                            </div>

                                                            {/* Subject */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                    Subject
                                                                    {assignment.semester_filter && (
                                                                        <span className="text-xs text-blue-600 ml-1">
                                                                            ({assignment.semester_filter === '1' ? '1st Sem' : '2nd Sem'} only)
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <select
                                                                    value={assignment.subject_id}
                                                                    onChange={(e) => updateBulkAssignment(assignment.id, 'subject_id', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    disabled={!assignment.section_id || !assignment.grade_level || !assignment.semester_filter}
                                                                    required
                                                                >
                                                                    <option value="">
                                                                        {!assignment.semester_filter ? 'Select Semester First' : 'Select Subject'}
                                                                    </option>
                                                                    {assignment.semester_filter && getBulkFilteredSubjects(assignment.section_id, assignment.grade_level, assignment.id)
                                                                        .filter(subject => subject.semester?.toString() === assignment.semester_filter)
                                                                        .map((subject) => (
                                                                        <option key={subject.id} value={subject.id}>
                                                                            {subject.code} - {subject.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {!assignment.semester_filter && (
                                                                    <p className="text-xs text-red-500 mt-1">Please select semester first</p>
                                                                )}
                                                            </div>

                                                            {/* Day */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
                                                                <select
                                                                    value={assignment.day_of_week}
                                                                    onChange={(e) => updateBulkAssignment(assignment.id, 'day_of_week', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    required
                                                                >
                                                                    <option value="">Select Day</option>
                                                                    <option value="Monday">Monday</option>
                                                                    <option value="Tuesday">Tuesday</option>
                                                                    <option value="Wednesday">Wednesday</option>
                                                                    <option value="Thursday">Thursday</option>
                                                                    <option value="Friday">Friday</option>
                                                                </select>
                                                            </div>

                                                            {/* Start Time */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                                                                <select
                                                                    value={assignment.start_time}
                                                                    onChange={(e) => {
                                                                        const selectedTime = e.target.value;
                                                                        const validTimeSlots = {
                                                                            '08:00': '10:00',
                                                                            '10:30': '12:30',
                                                                            '13:30': '15:30',
                                                                            '15:30': '16:30'
                                                                        };
                                                                        updateBulkAssignment(assignment.id, 'start_time', selectedTime);
                                                                        if (validTimeSlots[selectedTime]) {
                                                                            updateBulkAssignment(assignment.id, 'end_time', validTimeSlots[selectedTime]);
                                                                        }
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    required
                                                                >
                                                                    <option value="">Select Time</option>
                                                                    <option value="08:00">8:00 AM</option>
                                                                    <option value="10:30">10:30 AM</option>
                                                                    <option value="13:30">1:30 PM</option>
                                                                    <option value="15:30">3:30 PM</option>
                                                                </select>
                                                            </div>

                                                            {/* End Time */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                                                                <select
                                                                    value={assignment.end_time}
                                                                    onChange={(e) => updateBulkAssignment(assignment.id, 'end_time', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    required
                                                                >
                                                                    <option value="">Select End Time</option>
                                                                    <option value="10:00">10:00 AM</option>
                                                                    <option value="12:30">12:30 PM</option>
                                                                    <option value="15:30">3:30 PM</option>
                                                                    <option value="16:30">4:30 PM</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={closeBulkModal}
                                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleBulkSubmit}
                                            disabled={bulkLoading || !selectedFaculty || bulkAssignments.length === 0}
                                            className={`px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
                                                bulkLoading || !selectedFaculty || bulkAssignments.length === 0
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                                            }`}
                                        >
                                            {bulkLoading ? 'Creating Schedules...' : `Create ${bulkAssignments.length} Schedule${bulkAssignments.length !== 1 ? 's' : ''}`}
                                        </button>
                                    </div>
                                </div>
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
                                            {selectedStrand.data.grades ? 
                                                Object.values(selectedStrand.data.grades).reduce((count, grade) => count + Object.keys(grade.sections).length, 0) : 0
                                            } sections • {selectedStrand.data.grades ? 
                                                Object.values(selectedStrand.data.grades).flatMap(grade => Object.values(grade.sections)).flat().length : 0
                                            } scheduled classes
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
                                        {selectedStrand.data.grades && Object.entries(selectedStrand.data.grades).map(([gradeLevel, gradeData]) => (
                                            <div key={gradeLevel} className="space-y-6">
                                                {/* Grade Level Header */}
                                                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-lg p-4">
                                                    <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                                                        <FaUsers className="w-5 h-5" />
                                                        Grade {gradeLevel}
                                                    </h3>
                                                    <p className="text-purple-600 text-sm mt-1">
                                                        {Object.keys(gradeData.sections).length} sections • {Object.values(gradeData.sections).flat().length} classes
                                                    </p>
                                                </div>
                                                
                                                {/* Sections within this grade */}
                                                {Object.entries(gradeData.sections).map(([sectionName, sectionSchedules]) => {
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
                                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                                        <div className="overflow-x-auto">
                                                            <div className="min-w-[800px]">
                                                                {/* Header Row */}
                                                                <div className="grid grid-cols-7 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
                                                                    <div className="p-4 text-center font-bold text-gray-800 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
                                                                        <FaClock className="w-4 h-4 mr-2 text-gray-600" />
                                                                        <span>Time</span>
                                                                    </div>
                                                                    {days.map(day => (
                                                                        <div key={day} className="p-4 text-center font-bold text-indigo-800 border-r border-indigo-100 last:border-r-0">
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-lg">{day}</span>
                                                                                <span className="text-xs text-indigo-600 mt-1 font-normal">
                                                                                    {day === 'Mon' ? 'Monday' :
                                                                                        day === 'Tue' ? 'Tuesday' :
                                                                                            day === 'Wed' ? 'Wednesday' :
                                                                                                day === 'Thu' ? 'Thursday' :
                                                                                                    day === 'Fri' ? 'Friday' : 'Saturday'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Time Slots */}
                                                                {timeSlots.map((timeSlot, index) => (
                                                                    <div key={timeSlot} className={`grid grid-cols-7 border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                                        {/* Time Column */}
                                                                        <div className="p-3 text-center bg-gray-50 border-r border-gray-200 flex flex-col items-center justify-center min-h-[60px]">
                                                                            <div className="text-sm font-semibold text-gray-800">
                                                                                {formatTime12Hour(timeSlot)}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                {timeSlot}
                                                                            </div>
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
                                                                                <div key={`${day}-${timeSlot}`} className="min-h-[60px] border-r border-gray-100 last:border-r-0 relative p-1">
                                                                                    {schedule ? (
                                                                                        <div className={`h-full ${getScheduleColor(schedule.subject)} relative group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${schedule.isStart && schedule.isEnd ? 'rounded-lg' :
                                                                                            schedule.isStart ? 'rounded-t-lg rounded-b-none border-b-0' :
                                                                                                schedule.isMiddle ? 'rounded-none border-t-0 border-b-0' :
                                                                                                    schedule.isEnd ? 'rounded-b-lg rounded-t-none border-t-0' : 'rounded-lg'
                                                                                            }`}>
                                                                                            <div className="p-2 h-full flex flex-col justify-center">
                                                                                                {/* Only show full details on start block */}
                                                                                                {schedule.isStart ? (
                                                                                                    <>
                                                                                                        {/* Subject Name - Primary Info */}
                                                                                                        <div className="text-center mb-2">
                                                                                                            <div className="text-sm font-bold text-gray-800 leading-tight mb-1">
                                                                                                                {abbreviateSubjectName(schedule.subject?.name || subjects.find(s => s.id === schedule.subject_id)?.name || 'No Subject')}
                                                                                                            </div>
                                                                                                            {/* Semester Indicator */}
                                                                                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                                                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                                                                                                    (schedule.semester?.toString() || schedule.subject?.semester?.toString() || '1') === '1'
                                                                                                                        ? 'bg-green-100 text-green-800'
                                                                                                                        : 'bg-orange-100 text-orange-800'
                                                                                                                }`}>
                                                                                                                    {(schedule.semester?.toString() || schedule.subject?.semester?.toString() || '1') === '1' ? '1st' : '2nd'} Sem
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <div className="text-xs text-gray-600 bg-white/70 rounded px-2 py-1">
                                                                                                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {/* Secondary Info */}
                                                                                                        <div className="space-y-1">
                                                                                                            <div className="text-xs flex items-center justify-center gap-1 text-gray-700">
                                                                                                                <FaUser className="w-3 h-3" />
                                                                                                                <span className="truncate font-medium">
                                                                                                                    {schedule.faculty ?
                                                                                                                        `${schedule.faculty.firstname?.charAt(0)}. ${schedule.faculty.lastname}` :
                                                                                                                        faculties.find(f => f.id === schedule.faculty_id) ?
                                                                                                                            `${faculties.find(f => f.id === schedule.faculty_id).firstname?.charAt(0)}. ${faculties.find(f => f.id === schedule.faculty_id).lastname}` :
                                                                                                                            'TBA'
                                                                                                                    }
                                                                                                                </span>
                                                                                                            </div>

                                                                                                            <div className="text-xs flex items-center justify-center gap-1 text-gray-600">
                                                                                                                <FaMapMarkerAlt className="w-3 h-3" />
                                                                                                                <span className="truncate">{schedule.room || 'TBA'}</span>
                                                                                                            </div>
                                                                                                            <div className="text-xs flex items-center justify-center gap-1 text-gray-600">
                                                                                                                <FaClock className="w-3 h-3" />
                                                                                                                <span>{schedule.duration || 60} minutes</span>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {/* Action Button - Only visible on hover */}
                                                                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                                                            <button
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    openEditModal(schedule);
                                                                                                                }}
                                                                                                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                                                                                title="Edit Schedule"
                                                                                                                aria-label="Edit schedule"
                                                                                                            >
                                                                                                                <FaEdit className="w-3 h-3" />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    /* Empty continuation blocks - no content to maintain seamless appearance */
                                                                                                    <div className="h-full"></div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="h-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors duration-150 rounded">
                                                                                            <span className="text-xs font-medium opacity-0 hover:opacity-100 transition-opacity duration-200">Free</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Timetable Legend */}
                                                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm font-medium text-gray-700">Legend:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                                                                        <span className="text-xs text-gray-600">Scheduled Class</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                                                                        <span className="text-xs text-gray-600">Free Period</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <FaInfoCircle className="w-3 h-3" />
                                                                    <span>Hover over classes for details • Click to edit</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                            </div>
                                        ))}
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
