import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaArrowLeft, 
    FaSave, 
    FaPaperPlane, 
    FaLock, 
    FaUser, 
    FaCalendarAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaEdit,
    FaEye,
    FaHourglassHalf,
    FaClipboardList
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Faculty_GradeEncoding({ 
    class: classInfo, 
    students = [], 
    quarter, 
    gradesLocked = false,
    academicCalendar = {},
    availableQuarters = []
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [grades, setGrades] = useState({});
    const [remarks, setRemarks] = useState({});
    const [selectedQuarter, setSelectedQuarter] = useState(quarter);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [gradeInputPermission, setGradeInputPermission] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        // Initialize grades and remarks from students data
        const initialGrades = {};
        const initialRemarks = {};
        
        students.forEach(student => {
            initialGrades[student.id] = student.current_grade || '';
            initialRemarks[student.id] = student.remarks || '';
        });
        
        setGrades(initialGrades);
        setRemarks(initialRemarks);
    }, [students]);

    useEffect(() => {
        // Check grade input permission when component loads or quarter changes
        checkGradeInputPermission();
    }, [selectedQuarter, classInfo.id]);

    const checkGradeInputPermission = async () => {
        try {
            const response = await fetch(`/faculty/grade-input-permission/${classInfo.id}/${selectedQuarter}`);
            const result = await response.json();
            
            if (result.success) {
                setGradeInputPermission(result);
            }
        } catch (error) {
            console.error('Error checking grade input permission:', error);
        }
    };

    const handleRequestGradeInput = async () => {
        if (!requestReason.trim()) {
            Swal.fire({
                title: 'Missing Information',
                text: 'Please provide a reason for requesting grade input permission.',
                icon: 'warning',
                confirmButtonColor: '#F59E0B'
            });
            return;
        }

        try {
            const studentsWithoutGrades = students.filter(student => 
                !student.current_grade || student.current_grade === ''
            );

            const response = await fetch('/faculty/grade-input-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    class_id: classInfo.id,
                    quarter: selectedQuarter,
                    reason: requestReason,
                    is_urgent: isUrgent,
                    student_ids: studentsWithoutGrades.map(s => s.id)
                })
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Request Submitted!',
                    text: 'Your grade input request has been submitted to the registrar for approval.',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                setShowRequestModal(false);
                setRequestReason('');
                setIsUrgent(false);
                checkGradeInputPermission(); // Refresh permission status
            } else {
                throw new Error(result.error || 'Failed to submit request');
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to submit grade input request',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        }
    };

    const openRequestModal = () => {
        // Check if request is allowed based on backend validation
        if (!gradeInputPermission?.can_make_request) {
            let message = 'Cannot make grade input request at this time.';
            
            if (!gradeInputPermission?.quarter_ended) {
                message = 'Grade input requests can only be made after the quarter has ended.';
            } else if (gradeInputPermission?.students_without_grades === 0) {
                message = 'All students already have grades for this quarter. No request needed.';
            } else if (gradeInputPermission?.request_status === 'pending') {
                message = 'You already have a pending request for this quarter.';
            } else if (gradeInputPermission?.request_status === 'approved') {
                message = 'You already have an approved request for this quarter.';
            }
            
            Swal.fire({
                title: 'Request Not Available',
                text: message,
                icon: 'info',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        setShowRequestModal(true);
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    // Function to generate automatic remarks based on grade
    const generateRemarksFromGrade = (grade) => {
        if (!grade || grade === '') {
            return 'No grade entered';
        }

        const numericGrade = parseFloat(grade);

        // Philippine SHS Grading Scale with Remarks
        if (numericGrade >= 90) {
            return 'Outstanding - Excellent performance demonstrated';
        } else if (numericGrade >= 85) {
            return 'Very Satisfactory - Very good performance';
        } else if (numericGrade >= 80) {
            return 'Satisfactory - Good performance';
        } else if (numericGrade >= 75) {
            return 'Fairly Satisfactory - Meets minimum requirements';
        } else if (numericGrade >= 60) {
            return 'Did Not Meet Expectations - Below standard performance';
        } else {
            return 'Failed - Needs significant improvement';
        }
    };

    const handleGradeChange = (studentId, value) => {
        if (gradesLocked) return;
        
        const numericValue = value === '' ? '' : parseFloat(value);
        if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 100)) {
            return;
        }
        
        setGrades(prev => ({
            ...prev,
            [studentId]: value
        }));

        // Auto-generate remarks based on grade
        const autoRemarks = generateRemarksFromGrade(value);
        setRemarks(prev => ({
            ...prev,
            [studentId]: autoRemarks
        }));

        setHasChanges(true);
    };

    const handleRemarksChange = (studentId, value) => {
        if (gradesLocked) return;
        
        setRemarks(prev => ({
            ...prev,
            [studentId]: value
        }));
        setHasChanges(true);
    };

    const handleQuarterChange = (newQuarter) => {
        if (hasChanges) {
            Swal.fire({
                title: 'Unsaved Changes',
                text: 'You have unsaved changes. Do you want to save them before switching quarters?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Save & Switch',
                cancelButtonText: 'Discard & Switch',
                showDenyButton: true,
                denyButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    handleSave(true).then(() => {
                        router.visit(`/faculty/grade-encoding/${classInfo.id}?quarter=${newQuarter}`);
                    });
                } else if (result.isDismissed && result.dismiss !== 'deny') {
                    router.visit(`/faculty/grade-encoding/${classInfo.id}?quarter=${newQuarter}`);
                }
            });
        } else {
            router.visit(`/faculty/grade-encoding/${classInfo.id}?quarter=${newQuarter}`);
        }
    };

    const validateGrades = () => {
        const errors = [];
        
        Object.entries(grades).forEach(([studentId, grade]) => {
            if (grade !== '' && grade !== null) {
                const numericGrade = parseFloat(grade);
                if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
                    const student = students.find(s => s.id == studentId);
                    errors.push(`Invalid grade for ${student?.name}: ${grade}`);
                }
            }
        });
        
        return errors;
    };

    const handleSave = async (isDraft = true) => {
        const errors = validateGrades();
        if (errors.length > 0) {
            Swal.fire({
                title: 'Validation Errors',
                html: errors.join('<br>'),
                icon: 'error'
            });
            return false;
        }

        setIsSubmitting(true);
        
        const gradeData = students
            .filter(student => grades[student.id] !== '' && grades[student.id] !== null && grades[student.id] !== undefined)
            .map(student => ({
                student_id: student.id,
                grade: parseFloat(grades[student.id]),
                remarks: remarks[student.id] || null
            }));

        // Don't send request if no grades to save
        if (gradeData.length === 0) {
            setIsSubmitting(false);
            Swal.fire({
                title: 'No Grades to Save',
                text: 'Please enter at least one grade before saving.',
                icon: 'warning'
            });
            return false;
        }

        try {
            const response = await fetch('/faculty/grades/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    class_id: classInfo.id,
                    quarter: selectedQuarter,
                    grades: gradeData,
                    is_draft: isDraft
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setHasChanges(false);
                
                Swal.fire({
                    title: 'Success!',
                    text: result.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                if (!isDraft) {
                    // Refresh page to show locked state
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
                
                return true;
            } else {
                throw new Error(result.error || 'Failed to save grades');
            }
        } catch (error) {
            console.error('Error saving grades:', error);
            
            // Try to get more detailed error information
            let errorMessage = 'Failed to save grades. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }
            
            // Log the full error for debugging
            console.error('Full error details:', {
                error: error,
                gradeData: gradeData
            });
            
            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error'
            });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        const result = await Swal.fire({
            title: 'Submit Grades for Registrar Approval?',
            html: `
                <div class="text-left space-y-2">
                    <p>Once submitted:</p>
                    <ul class="text-sm text-gray-600 ml-4">
                        <li>• You cannot edit these grades until approved/rejected</li>
                        <li>• Grades will NOT appear to students until registrar approves</li>
                        <li>• Registrar will review and approve/reject your submission</li>
                    </ul>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Submit for Approval',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3b82f6'
        });

        if (result.isConfirmed) {
            await handleSave(false);
        }
    };

    const handleGoBack = () => {
        if (hasChanges) {
            Swal.fire({
                title: 'Unsaved Changes',
                text: 'You have unsaved changes. Do you want to save them before leaving?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Save & Leave',
                cancelButtonText: 'Discard & Leave',
                showDenyButton: true,
                denyButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    handleSave(true).then(() => {
                        router.visit('/faculty/semester');
                    });
                } else if (result.isDismissed && result.dismiss !== 'deny') {
                    router.visit('/faculty/semester');
                }
            });
        } else {
            router.visit('/faculty/semester');
        }
    };

    const getGradeColor = (grade) => {
        if (!grade || grade === '') return 'text-gray-400';
        const numericGrade = parseFloat(grade);
        if (numericGrade >= 90) return 'text-green-600';
        if (numericGrade >= 80) return 'text-blue-600';
        if (numericGrade >= 75) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Filter available quarters based on subject semester
    const getAvailableQuarters = () => {
        if (!classInfo.semester) {
            return availableQuarters; // Fallback to all quarters if semester info is missing
        }
        
        // Philippine SHS System:
        // 1st Semester: Q1 and Q2
        // 2nd Semester: Q3 and Q4
        if (classInfo.semester === '1st') {
            return ['1st', '2nd'];
        } else if (classInfo.semester === '2nd') {
            return ['3rd', '4th'];
        }
        
        return availableQuarters; // Fallback
    };

    const filteredQuarters = getAvailableQuarters();
    const completedCount = Object.values(grades).filter(grade => grade !== '' && grade !== null).length;
    const progressPercentage = students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title={`Grade Encoding - ${classInfo.subject_name}`} />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleGoBack}
                                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <FaArrowLeft className="mr-2" />
                                Back to Dashboard
                            </button>
                            <div className="h-6 border-l border-gray-300"></div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {classInfo.subject_name} - {classInfo.section_name}
                                </h1>
                                <p className="text-gray-600">
                                    {classInfo.subject_code} • {classInfo.strand_name || 'Core Subject'} • {selectedQuarter} Quarter
                                </p>
                            </div>
                        </div>

                        {/* Quarter Selector */}
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-gray-700">Quarter:</label>
                            <select 
                                value={selectedQuarter}
                                onChange={(e) => handleQuarterChange(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={gradesLocked}
                            >
                                {filteredQuarters.map(q => (
                                    <option key={q} value={q}>{q} Quarter</option>
                                ))}
                            </select>
                            {classInfo.semester && (
                                <span className="text-xs text-gray-500 ml-2">
                                    ({classInfo.semester} Semester)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center text-sm text-gray-600">
                                <FaUser className="mr-1" />
                                {students.length} Students
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <FaCalendarAlt className="mr-1" />
                                Deadline: {academicCalendar.grade_submission_deadline 
                                    ? new Date(academicCalendar.grade_submission_deadline).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : 'Not set'
                                }
                            </div>
                            {gradesLocked && (
                                <div className="flex items-center text-sm text-red-600">
                                    <FaLock className="mr-1" />
                                    Grades Locked (Submitted)
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                                Progress: {completedCount}/{students.length} ({progressPercentage}%)
                            </div>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">

                    {/* Grade Input Permission Status */}
                    {gradeInputPermission && !gradeInputPermission.can_input_grades && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FaLock className="text-yellow-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800">
                                            Grade input requires registrar approval
                                        </p>
                                        <div className="text-xs text-yellow-600 mt-1">
                                            <p className="mb-1">• Grades will only appear to students after registrar approval</p>
                                            {!gradeInputPermission.quarter_ended && (
                                                <p>• Quarter must end before requesting permission</p>
                                            )}
                                            {gradeInputPermission.quarter_ended && gradeInputPermission.students_without_grades === 0 && (
                                                <p>• All students already have grades for this quarter</p>
                                            )}
                                            {gradeInputPermission.quarter_ended && gradeInputPermission.students_without_grades > 0 && (
                                                <p>• {gradeInputPermission.students_without_grades} students need grades</p>
                                            )}
                                            {gradeInputPermission.request_status === 'pending' && (
                                                <p>• Request pending registrar approval</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {gradeInputPermission.can_make_request && (
                                    <button
                                        onClick={openRequestModal}
                                        className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                    >
                                        <FaClipboardList className="mr-2" />
                                        Request Permission
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!gradesLocked && (
                        <div className="mb-6 flex justify-between items-center">
                            <div className="flex space-x-3">
                                {/* Save Draft Button - Always show when not locked */}
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={isSubmitting || !hasChanges}
                                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FaSave className="mr-2" />
                                    {isSubmitting ? 'Saving...' : 'Save Draft'}
                                </button>
                                
                                {/* Submit Button - Show when there are grades to submit */}
                                {completedCount > 0 && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <FaPaperPlane className="mr-2" />
                                        Submit for Approval
                                    </button>
                                )}
                            </div>

                            {hasChanges && (
                                <div className="flex items-center text-yellow-600 text-sm">
                                    <FaExclamationTriangle className="mr-1" />
                                    You have unsaved changes
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show help message when no grades and no permission */}
                    {!gradesLocked && !gradeInputPermission?.can_input_grades && completedCount === 0 && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center">
                                <FaHourglassHalf className="text-gray-600 mr-2" />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        How to Submit Grades
                                    </p>
                                    <div className="text-xs text-gray-600 mt-1">
                                        <p>1. Input grades for your students in the table below</p>
                                        <p>2. Save your work as draft (optional)</p>
                                        <p>3. Submit grades for registrar approval when ready</p>
                                        <p className="mt-1 font-medium">Note: Submit button will appear once you have grades to submit</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Students Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                {gradesLocked ? <FaEye className="mr-2" /> : <FaEdit className="mr-2" />}
                                {gradesLocked ? 'View Grades' : 'Input Grades'} - {selectedQuarter} Quarter
                            </h2>
                        </div>

                        {students.length === 0 ? (
                            <div className="p-8 text-center">
                                <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                                <p className="text-gray-600">This class doesn't have any enrolled students yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Student
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grade (0-100)
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Remarks
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students.map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                                            {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                            <div className="text-sm text-gray-500">{student.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={grades[student.id] || ''}
                                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                                        disabled={gradesLocked}
                                                        className={`w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                            gradesLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                                                        } ${getGradeColor(grades[student.id])} font-medium`}
                                                        placeholder="0-100"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <textarea
                                                            value={remarks[student.id] || ''}
                                                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                                            disabled={gradesLocked}
                                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                                                                gradesLocked ? 'bg-gray-100 cursor-not-allowed' : 'bg-blue-50'
                                                            }`}
                                                            rows="2"
                                                            placeholder="Auto-generated based on grade..."
                                                        />
                                                        {remarks[student.id] && !gradesLocked && (
                                                            <div className="absolute -bottom-5 left-0 text-xs text-blue-600">
                                                                ✨ Auto-generated (editable)
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {grades[student.id] && grades[student.id] !== '' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            <FaCheckCircle className="mr-1" />
                                                            Graded
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Grade Distribution Summary */}
                    {students.length > 0 && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {Object.values(grades).filter(g => g >= 90).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Excellent (90-100)</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {Object.values(grades).filter(g => g >= 80 && g < 90).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Good (80-89)</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {Object.values(grades).filter(g => g >= 75 && g < 80).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Satisfactory (75-79)</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {Object.values(grades).filter(g => g !== '' && g < 75).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Needs Improvement (&lt;75)</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grade Input Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Request Grade Input Permission
                                </h3>
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        You are requesting permission to input grades for students who don't have grades yet in this quarter. 
                                        <strong>Note:</strong> Grades will only appear to students after registrar approval.
                                    </p>
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>Class:</strong> {classInfo.subject_name} - {classInfo.section_name}
                                        </p>
                                        <p className="text-sm text-blue-800">
                                            <strong>Quarter:</strong> {selectedQuarter} Quarter
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason for Request <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={requestReason}
                                        onChange={(e) => setRequestReason(e.target.value)}
                                        placeholder="Explain why you need to input grades (e.g., quarter has ended, makeup exams completed, etc.)"
                                        rows="4"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="urgent-request"
                                        checked={isUrgent}
                                        onChange={(e) => setIsUrgent(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="urgent-request" className="ml-2 text-sm text-gray-700">
                                        Mark as urgent (requires immediate attention)
                                    </label>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestGradeInput}
                                    disabled={!requestReason.trim()}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
