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
    FaSort
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import Sidebar from '../layouts/Sidebar';

export default function PendingGrades({ pendingGrades, auth }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [filterSubject, setFilterSubject] = useState('');
    const [filterFaculty, setFilterFaculty] = useState('');
    const [sortBy, setSortBy] = useState('submitted_for_approval_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Extract unique subjects and faculty for filters
    const gradesData = pendingGrades?.data || [];
    const subjects = [...new Set(gradesData.map(grade => grade.subject?.name).filter(Boolean))];
    const faculty = [...new Set(gradesData.map(grade => grade.faculty?.firstname + ' ' + grade.faculty?.lastname).filter(Boolean))];

    // Filter and sort grades
    const filteredGrades = gradesData
        .filter(grade => {
            const matchesSubject = !filterSubject || grade.subject?.name === filterSubject;
            const matchesFaculty = !filterFaculty || 
                (grade.faculty?.firstname + ' ' + grade.faculty?.lastname) === filterFaculty;
            return matchesSubject && matchesFaculty;
        })
        .sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy === 'student_name') {
                aValue = (a.student?.user?.firstname || '') + ' ' + (a.student?.user?.lastname || '');
                bValue = (b.student?.user?.firstname || '') + ' ' + (b.student?.user?.lastname || '');
            } else if (sortBy === 'faculty_name') {
                aValue = (a.faculty?.firstname || '') + ' ' + (a.faculty?.lastname || '');
                bValue = (b.faculty?.firstname || '') + ' ' + (b.faculty?.lastname || '');
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    const handleSelectGrade = (gradeId) => {
        setSelectedGrades(prev => 
            prev.includes(gradeId) 
                ? prev.filter(id => id !== gradeId)
                : [...prev, gradeId]
        );
    };

    const handleSelectAll = () => {
        if (selectedGrades.length === filteredGrades.length) {
            setSelectedGrades([]);
        } else {
            setSelectedGrades(filteredGrades.map(grade => grade.id));
        }
    };

    const handleApproveGrade = async (gradeId, notes = '') => {
        try {
            const result = await Swal.fire({
                title: 'Approve Grade',
                text: 'Are you sure you want to approve this grade?',
                input: 'textarea',
                inputLabel: 'Approval Notes (Optional)',
                inputValue: notes,
                inputPlaceholder: 'Enter any notes about this approval...',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Approve',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    // Notes are optional for approval
                    return null;
                }
            });

            if (result.isConfirmed) {
                router.post(`/registrar/grades/${gradeId}/approve`, {
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Approved!',
                            text: 'Grade has been approved successfully.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to approve grade. Please try again.',
                            icon: 'error'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error approving grade:', error);
        }
    };

    const handleRejectGrade = async (gradeId) => {
        try {
            const result = await Swal.fire({
                title: 'Reject Grade',
                text: 'Please provide a reason for rejecting this grade:',
                input: 'textarea',
                inputLabel: 'Rejection Reason (Required)',
                inputPlaceholder: 'Enter the reason for rejection...',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Reject',
                cancelButtonText: 'Cancel',
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
                router.post(`/registrar/grades/${gradeId}/reject`, {
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Rejected!',
                            text: 'Grade has been rejected successfully.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to reject grade. Please try again.',
                            icon: 'error'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error rejecting grade:', error);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedGrades.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select grades to approve.',
                icon: 'warning'
            });
            return;
        }

        try {
            const result = await Swal.fire({
                title: `Bulk Approve ${selectedGrades.length} Grades`,
                text: 'Are you sure you want to approve all selected grades?',
                input: 'textarea',
                inputLabel: 'Bulk Approval Notes (Optional)',
                inputPlaceholder: 'Enter notes for all selected grades...',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                confirmButtonText: `Approve ${selectedGrades.length} Grades`,
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
                router.post('/registrar/grades/bulk-approve', {
                    grade_ids: selectedGrades,
                    approval_notes: result.value
                }, {
                    onSuccess: () => {
                        setSelectedGrades([]);
                        Swal.fire({
                            title: 'Success!',
                            text: `${selectedGrades.length} grades approved successfully.`,
                            icon: 'success',
                            timer: 2000,
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
                                    {filteredGrades.length} Pending
                                </div>
                                {selectedGrades.length > 0 && (
                                    <button
                                        onClick={handleBulkApprove}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <FaCheck />
                                        Approve Selected ({selectedGrades.length})
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
                                    <option value="submitted_for_approval_at">Date Submitted</option>
                                    <option value="student_name">Student Name</option>
                                    <option value="faculty_name">Faculty Name</option>
                                    <option value="semester_grade">Semester Grade</option>
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

                    {/* Grades Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {filteredGrades.length === 0 ? (
                            <div className="text-center py-12">
                                <FaClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Grades</h3>
                                <p className="text-gray-500">All submitted grades have been processed.</p>
                            </div>
                        ) : (
                            <>
                                {/* Table Header */}
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-purple-600 hover:text-purple-800"
                                        >
                                            {selectedGrades.length === filteredGrades.length ? (
                                                <FaCheckSquare className="w-5 h-5" />
                                            ) : (
                                                <FaSquare className="w-5 h-5" />
                                            )}
                                        </button>
                                        <span className="text-sm font-medium text-gray-700">
                                            Select All ({filteredGrades.length})
                                        </span>
                                    </div>
                                </div>

                                {/* Table Content */}
                                <div className="divide-y divide-gray-200">
                                    {filteredGrades.map((grade) => (
                                        <div key={grade.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => handleSelectGrade(grade.id)}
                                                    className="mt-1 text-purple-600 hover:text-purple-800"
                                                >
                                                    {selectedGrades.includes(grade.id) ? (
                                                        <FaCheckSquare className="w-5 h-5" />
                                                    ) : (
                                                        <FaSquare className="w-5 h-5" />
                                                    )}
                                                </button>

                                                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
                                                    {/* Student & Subject Info */}
                                                    <div className="lg:col-span-2">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                                <FaUser className="text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900">
                                                                    {grade.student?.user?.firstname} {grade.student?.user?.lastname}
                                                                </h3>
                                                                <p className="text-sm text-gray-600">
                                                                    {grade.student?.user?.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <FaBook className="text-blue-500" />
                                                            <span className="font-medium">{grade.subject?.name}</span>
                                                            <span>•</span>
                                                            <span>{grade.class?.section?.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                            <FaUser className="text-green-500" />
                                                            <span>Faculty: {grade.faculty?.firstname} {grade.faculty?.lastname}</span>
                                                        </div>
                                                    </div>

                                                    {/* Grades Display */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Quarter Grades</h4>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span>1st:</span>
                                                                <span className={getGradeColor(grade.first_quarter)}>
                                                                    {grade.first_quarter || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>2nd:</span>
                                                                <span className={getGradeColor(grade.second_quarter)}>
                                                                    {grade.second_quarter || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>3rd:</span>
                                                                <span className={getGradeColor(grade.third_quarter)}>
                                                                    {grade.third_quarter || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>4th:</span>
                                                                <span className={getGradeColor(grade.fourth_quarter)}>
                                                                    {grade.fourth_quarter || '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                                            <div className="flex justify-between font-semibold">
                                                                <span>Semester:</span>
                                                                <span className={`text-lg ${getGradeColor(grade.semester_grade)}`}>
                                                                    {grade.semester_grade}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-center mt-1">
                                                                <span className={`px-2 py-1 rounded-full ${
                                                                    grade.semester_grade >= 75 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {grade.semester_grade >= 75 ? 'Passed' : 'Failed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Submission Info & Actions */}
                                                    <div className="flex flex-col justify-between">
                                                        <div className="mb-4">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                                <FaCalendarAlt className="text-orange-500" />
                                                                <span>Submitted:</span>
                                                            </div>
                                                            <p className="text-sm font-medium">
                                                                {formatDate(grade.submitted_for_approval_at)}
                                                            </p>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleApproveGrade(grade.id)}
                                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <FaCheck />
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectGrade(grade.id)}
                                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <FaTimes />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
