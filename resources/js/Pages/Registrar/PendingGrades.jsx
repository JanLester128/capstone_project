import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaCheck, 
    FaTimes, 
    FaEye, 
    FaClock, 
    FaUser, 
    FaBook, 
    FaCalendarAlt,
    FaCheckSquare,
    FaSquare,
    FaFilter,
    FaSort,
    FaGraduationCap,
    FaChalkboardTeacher
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import Sidebar from '../layouts/Sidebar';

export default function PendingGrades({ pendingGrades, auth }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [filterSubject, setFilterSubject] = useState('');
    const [filterFaculty, setFilterFaculty] = useState('');
    const [sortBy, setSortBy] = useState('student_name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Group grades by student
    const gradesData = pendingGrades?.data || [];
    const studentGroups = gradesData.reduce((groups, grade) => {
        const studentId = grade.student_id;
        const studentKey = `${grade.student?.user?.firstname} ${grade.student?.user?.lastname}`;
        
        if (!groups[studentId]) {
            groups[studentId] = {
                studentId,
                studentName: studentKey,
                studentEmail: grade.student?.user?.email,
                studentInfo: grade.student,
                grades: [],
                latestSubmission: grade.submitted_for_approval_at
            };
        }
        
        groups[studentId].grades.push(grade);
        
        // Keep track of latest submission
        if (new Date(grade.submitted_for_approval_at) > new Date(groups[studentId].latestSubmission)) {
            groups[studentId].latestSubmission = grade.submitted_for_approval_at;
        }
        
        return groups;
    }, {});

    // Convert to array and apply filters
    const studentGroupsArray = Object.values(studentGroups)
        .filter(studentGroup => {
            const matchesSubject = !filterSubject || 
                studentGroup.grades.some(grade => grade.subject?.name === filterSubject);
            const matchesFaculty = !filterFaculty || 
                studentGroup.grades.some(grade => 
                    (grade.faculty?.firstname + ' ' + grade.faculty?.lastname) === filterFaculty);
            return matchesSubject && matchesFaculty;
        })
        .sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'student_name':
                    aValue = a.studentName;
                    bValue = b.studentName;
                    break;
                case 'submission_date':
                    aValue = new Date(a.latestSubmission);
                    bValue = new Date(b.latestSubmission);
                    break;
                case 'subject_count':
                    aValue = a.grades.length;
                    bValue = b.grades.length;
                    break;
                default:
                    aValue = a.studentName;
                    bValue = b.studentName;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    // Extract unique subjects and faculty for filters
    const subjects = [...new Set(gradesData.map(grade => grade.subject?.name).filter(Boolean))];
    const faculty = [...new Set(gradesData.map(grade => grade.faculty?.firstname + ' ' + grade.faculty?.lastname).filter(Boolean))];

    // Helper function to get relevant quarters based on semester
    const getRelevantQuarters = (semester) => {
        if (semester === 1) {
            return [
                { key: 'first_quarter', label: '1st' },
                { key: 'second_quarter', label: '2nd' }
            ];
        } else if (semester === 2) {
            return [
                { key: 'third_quarter', label: '3rd' },
                { key: 'fourth_quarter', label: '4th' }
            ];
        }
        // Default: show all quarters
        return [
            { key: 'first_quarter', label: '1st' },
            { key: 'second_quarter', label: '2nd' },
            { key: 'third_quarter', label: '3rd' },
            { key: 'fourth_quarter', label: '4th' }
        ];
    };

    const handleSelectStudent = (studentId) => {
        setSelectedStudents(prev => 
            prev.includes(studentId) 
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === studentGroupsArray.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(studentGroupsArray.map(student => student.studentId));
        }
    };

    const handleApproveStudent = async (studentGroup) => {
        try {
            const gradeIds = studentGroup.grades.map(grade => grade.id);
            const subjectCount = studentGroup.grades.length;
            
            const result = await Swal.fire({
                title: `Approve All Grades for ${studentGroup.studentName}`,
                html: `
                    <div class="text-left">
                        <p class="mb-3">You are about to approve <strong>${subjectCount} subjects</strong> for this student:</p>
                        <ul class="text-sm text-gray-600 mb-4">
                            ${studentGroup.grades.map(grade => 
                                `<li>• ${grade.subject?.name} - ${grade.semester_grade} (${grade.semester_grade >= 75 ? 'Passed' : 'Failed'})</li>`
                            ).join('')}
                        </ul>
                    </div>
                `,
                input: 'textarea',
                inputLabel: 'Approval Notes (Optional)',
                inputPlaceholder: 'Enter any notes about this approval...',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                confirmButtonText: `Approve All ${subjectCount} Subjects`,
                cancelButtonText: 'Cancel',
                width: '600px'
            });

            if (result.isConfirmed) {
                router.post('/registrar/grades/bulk-approve', {
                    grade_ids: gradeIds,
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'All Grades Approved!',
                            text: `Successfully approved ${subjectCount} subjects for ${studentGroup.studentName}.`,
                            icon: 'success',
                            timer: 3000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to approve grades. Please try again.',
                            icon: 'error'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error approving student grades:', error);
        }
    };

    const handleRejectStudent = async (studentGroup) => {
        try {
            const gradeIds = studentGroup.grades.map(grade => grade.id);
            const subjectCount = studentGroup.grades.length;
            
            const result = await Swal.fire({
                title: `Reject All Grades for ${studentGroup.studentName}`,
                html: `
                    <div class="text-left">
                        <p class="mb-3">You are about to reject <strong>${subjectCount} subjects</strong> for this student:</p>
                        <ul class="text-sm text-gray-600 mb-4">
                            ${studentGroup.grades.map(grade => 
                                `<li>• ${grade.subject?.name} - ${grade.semester_grade}</li>`
                            ).join('')}
                        </ul>
                        <p class="text-red-600 font-medium">Please provide a reason for rejection:</p>
                    </div>
                `,
                input: 'textarea',
                inputLabel: 'Rejection Reason (Required)',
                inputPlaceholder: 'Enter the reason for rejecting all grades...',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: `Reject All ${subjectCount} Subjects`,
                cancelButtonText: 'Cancel',
                width: '600px',
                inputValidator: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Please provide a reason for rejection';
                    }
                    if (value.length > 500) {
                        return 'Reason must be less than 500 characters';
                    }
                    return null;
                }
            });

            if (result.isConfirmed) {
                router.post('/registrar/grades/bulk-reject', {
                    grade_ids: gradeIds,
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'All Grades Rejected!',
                            text: `Successfully rejected ${subjectCount} subjects for ${studentGroup.studentName}.`,
                            icon: 'success',
                            timer: 3000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to reject grades. Please try again.',
                            icon: 'error'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error rejecting student grades:', error);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedStudents.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select students to approve.',
                icon: 'warning'
            });
            return;
        }

        const selectedStudentGroups = studentGroupsArray.filter(student => 
            selectedStudents.includes(student.studentId)
        );
        const totalGrades = selectedStudentGroups.reduce((sum, student) => sum + student.grades.length, 0);

        try {
            const result = await Swal.fire({
                title: `Bulk Approve ${selectedStudents.length} Students`,
                html: `
                    <div class="text-left">
                        <p class="mb-3">You are about to approve grades for <strong>${selectedStudents.length} students</strong> (${totalGrades} total subjects):</p>
                        <ul class="text-sm text-gray-600 mb-4 max-h-40 overflow-y-auto">
                            ${selectedStudentGroups.map(student => 
                                `<li>• ${student.studentName} - ${student.grades.length} subjects</li>`
                            ).join('')}
                        </ul>
                    </div>
                `,
                input: 'textarea',
                inputLabel: 'Bulk Approval Notes (Optional)',
                inputPlaceholder: 'Enter notes for all selected students...',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                confirmButtonText: `Approve ${selectedStudents.length} Students`,
                cancelButtonText: 'Cancel',
                width: '600px'
            });

            if (result.isConfirmed) {
                const allGradeIds = selectedStudentGroups.flatMap(student => 
                    student.grades.map(grade => grade.id)
                );

                router.post('/registrar/grades/bulk-approve', {
                    grade_ids: allGradeIds,
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        setSelectedStudents([]);
                        Swal.fire({
                            title: 'Success!',
                            text: `Successfully approved grades for ${selectedStudents.length} students.`,
                            icon: 'success',
                            timer: 3000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to approve grades. Please try again.',
                            icon: 'error'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error bulk approving grades:', error);
        }
    };

    const getGradeColor = (grade) => {
        if (!grade || grade === 0) return 'text-gray-400';
        if (grade >= 90) return 'text-green-600 font-bold';
        if (grade >= 85) return 'text-blue-600 font-bold';
        if (grade >= 80) return 'text-indigo-600 font-bold';
        if (grade >= 75) return 'text-yellow-600 font-bold';
        return 'text-red-600 font-bold';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <Head title="Pending Grade Approvals" />
            
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
                <Sidebar onToggle={setIsCollapsed} />
                <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} px-8 py-6 transition-all duration-300 overflow-x-hidden min-h-screen`}>
                    <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <FaClock className="text-orange-500" />
                                    Pending Grade Approvals
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    Review and approve grades submitted by faculty members
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold">
                                    {studentGroupsArray.length} Students
                                </div>
                                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
                                    {gradesData.length} Total Subjects
                                </div>
                                {selectedStudents.length > 0 && (
                                    <button
                                        onClick={handleBulkApprove}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <FaCheck />
                                        Approve Selected ({selectedStudents.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filters and Controls */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaFilter className="inline mr-1" />
                                    Filter by Subject
                                </label>
                                <select
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaUser className="inline mr-1" />
                                    Filter by Faculty
                                </label>
                                <select
                                    value={filterFaculty}
                                    onChange={(e) => setFilterFaculty(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="">All Faculty</option>
                                    {faculty.map(facultyName => (
                                        <option key={facultyName} value={facultyName}>{facultyName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaSort className="inline mr-1" />
                                    Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="student_name">Student Name</option>
                                    <option value="submission_date">Latest Submission</option>
                                    <option value="subject_count">Number of Subjects</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="desc">Newest First</option>
                                    <option value="asc">Oldest First</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Student Cards */}
                    <div className="space-y-6">
                        {studentGroupsArray.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                <FaClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Grades</h3>
                                <p className="text-gray-500">All submitted grades have been processed.</p>
                            </div>
                        ) : (
                            <>
                                {/* Select All Header */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-purple-600 hover:text-purple-800"
                                        >
                                            {selectedStudents.length === studentGroupsArray.length ? (
                                                <FaCheckSquare className="w-5 h-5" />
                                            ) : (
                                                <FaSquare className="w-5 h-5" />
                                            )}
                                        </button>
                                        <span className="text-sm font-medium text-gray-700">
                                            Select All Students ({studentGroupsArray.length})
                                        </span>
                                    </div>
                                </div>

                                {/* Student Cards */}
                                {studentGroupsArray.map((studentGroup) => (
                                    <div key={studentGroup.studentId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        {/* Student Header */}
                                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleSelectStudent(studentGroup.studentId)}
                                                        className="text-purple-600 hover:text-purple-800"
                                                    >
                                                        {selectedStudents.includes(studentGroup.studentId) ? (
                                                            <FaCheckSquare className="w-6 h-6" />
                                                        ) : (
                                                            <FaSquare className="w-6 h-6" />
                                                        )}
                                                    </button>
                                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <FaGraduationCap className="text-purple-600 w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">
                                                            {studentGroup.studentName}
                                                        </h3>
                                                        <p className="text-gray-600">
                                                            {studentGroup.studentEmail}
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                                {studentGroup.grades.length} Subjects
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                Latest: {formatDate(studentGroup.latestSubmission)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleApproveStudent(studentGroup)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                                    >
                                                        <FaCheck />
                                                        Approve All
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectStudent(studentGroup)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                                    >
                                                        <FaTimes />
                                                        Reject All
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Subjects Grid */}
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {studentGroup.grades.map((grade) => {
                                                    const relevantQuarters = getRelevantQuarters(grade.subject?.semester || 1);
                                                    
                                                    return (
                                                        <div key={grade.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                            {/* Subject Header */}
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <FaBook className="text-blue-600 w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-gray-900 text-sm">
                                                                        {grade.subject?.name}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-600">
                                                                        Semester {grade.subject?.semester || 1}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Quarter Grades - Only show relevant quarters */}
                                                            <div className="mb-4">
                                                                <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                                                                    Quarter Grades
                                                                </h5>
                                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                                    {relevantQuarters.map((quarter) => (
                                                                        <div key={quarter.key} className="flex justify-between">
                                                                            <span className="text-gray-600">{quarter.label}:</span>
                                                                            <span className={getGradeColor(grade[quarter.key])}>
                                                                                {grade[quarter.key] || '-'}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Semester Grade */}
                                                            <div className="pt-3 border-t border-gray-300">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-semibold text-gray-700">Semester:</span>
                                                                    <span className={`text-lg font-bold ${getGradeColor(grade.semester_grade)}`}>
                                                                        {grade.semester_grade}
                                                                    </span>
                                                                </div>
                                                                <div className="text-center mt-2">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                                        grade.semester_grade >= 75 
                                                                            ? 'bg-green-100 text-green-800' 
                                                                            : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {grade.semester_grade >= 75 ? 'Passed' : 'Failed'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Faculty Info */}
                                                            <div className="mt-3 pt-3 border-t border-gray-300">
                                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                    <FaChalkboardTeacher className="text-green-500" />
                                                                    <span>{grade.faculty?.firstname} {grade.faculty?.lastname}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Pagination */}
                    {pendingGrades?.links && pendingGrades.links.length > 3 && (
                        <div className="mt-6 flex justify-center">
                            <nav className="flex items-center gap-2">
                                {pendingGrades.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => link.url && router.get(link.url)}
                                        disabled={!link.url}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-purple-600 text-white'
                                                : link.url
                                                ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                    </div>
                </main>
            </div>
        </>
    );
}
