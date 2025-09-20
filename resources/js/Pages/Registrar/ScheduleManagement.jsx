import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaBook, FaCalendarAlt, FaTimes, FaUsers, FaChalkboardTeacher, FaInfoCircle, FaEye, FaMapMarkerAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function ScheduleManagement() {
    const { schedules: initialSchedules, subjects: initialSubjects, sections, faculties, schoolYears, activeSchoolYear, currentSchoolYear, swal } = usePage().props;

    const [schedules, setSchedules] = useState(initialSchedules || []);
    const [subjects, setSubjects] = useState(initialSubjects || []);
    const [semesterInfo, setSemesterInfo] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('registrar-sidebar-collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [selectedStrand, setSelectedStrand] = useState(null);
    const [showStrandModal, setShowStrandModal] = useState(false);

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

    // Handle SweetAlert from backend session data
    useEffect(() => {
        console.log('SweetAlert useEffect triggered, swal data:', swal);
        if (swal) {
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
        } else {
            console.log('No swal data found in props');
        }
    }, [swal]);

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
        grade_level: '', // Add grade level filter
        day_of_week: '',
        start_time: '',
        end_time: '',
        duration: 60,
        semester: '1st Semester',
        school_year: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '2024-2025'
    });

    // Get filtered subjects based on selected grade level and section
    const getFilteredSubjects = () => {
        if (!formData.grade_level) return [];

        const selectedSection = sections?.find(s => s.id == formData.section_id);

        // Filter subjects by grade level
        let filteredSubjects = subjects?.filter(subject => {
            // Check if subject matches the selected grade level
            const matchesGradeLevel = subject.year_level === formData.grade_level ||
                subject.grade_level === formData.grade_level;

            // Check if subject matches section's strand
            const matchesStrand = selectedSection ? subject.strand_id == selectedSection.strand_id : true;

            return matchesGradeLevel && matchesStrand;
        }) || [];

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
                                                    onClick={() => openStrandModal({ data: strandData, name: strandName })}
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

                                        {/* Subject Selection - Step 2 */}
                                        <div className={`${formData.section_id && formData.grade_level ? 'bg-green-50/80 backdrop-blur-sm border-2 border-green-200/50' : 'bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200/50'} rounded-lg p-4`}>
                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${formData.section_id && formData.grade_level ? 'text-green-800' : 'text-gray-500'}`}>
                                                <span className={`${formData.section_id && formData.grade_level ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold`}>2</span>
                                                Subject {formData.section_id && formData.grade_level ? '(Filtered by Section and Grade Level)' : '(Select Section and Grade Level First)'}
                                            </label>
                                            <select
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 backdrop-blur-sm ${formData.section_id && formData.grade_level ? 'border-green-300/50 focus:ring-green-500 focus:border-green-500 bg-white/90' : 'border-gray-300/50 bg-gray-100/60 cursor-not-allowed'}`}
                                                disabled={!(formData.section_id && formData.grade_level)}
                                                required
                                            >
                                                <option value="">Select Subject</option>
                                                {availableSubjects.map((subject) => (
                                                    <option key={subject.id} value={subject.id} disabled={subject.isDisabled}>
                                                        {subject.code} - {subject.name} {subject.disabledReason ? `(${subject.disabledReason})` : ''}
                                                    </option>
                                                ))}
                                            </select>
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
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
