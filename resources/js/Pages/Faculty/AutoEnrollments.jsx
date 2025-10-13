import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { 
    FaUsers, 
    FaGraduationCap, 
    FaCheckCircle, 
    FaInfoCircle,
    FaUserGraduate,
    FaCalendarAlt,
    FaSchool,
    FaArrowRight
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function AutoEnrollments({ eligibleStudents, activeSchoolYear, user }) {
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [processing, setProcessing] = useState(false);

    const { post } = useForm();

    const handleSelectStudent = (studentId) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedStudents.size === eligibleStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(eligibleStudents.map(s => s.student.id)));
        }
    };

    const handleApproveEnrollment = async (studentId) => {
        const result = await Swal.fire({
            title: 'Approve Grade 12 Auto-Enrollment?',
            text: 'This will automatically enroll the student in Grade 12 based on their Grade 11 completion.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Approve Enrollment',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            setProcessing(true);
            post(route('faculty.approve.enrollment'), {
                data: { student_id: studentId },
                onSuccess: () => {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Student has been successfully enrolled in Grade 12.',
                        icon: 'success',
                        confirmButtonColor: '#10b981'
                    });
                },
                onError: (errors) => {
                    Swal.fire({
                        title: 'Error!',
                        text: errors.student || errors.enrollment || 'Failed to approve enrollment.',
                        icon: 'error',
                        confirmButtonColor: '#ef4444'
                    });
                },
                onFinish: () => setProcessing(false)
            });
        }
    };

    const handleBulkApprove = async () => {
        if (selectedStudents.size === 0) {
            Swal.fire({
                title: 'No Students Selected',
                text: 'Please select at least one student to approve.',
                icon: 'warning',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        const result = await Swal.fire({
            title: `Approve ${selectedStudents.size} Students?`,
            text: 'This will automatically enroll all selected students in Grade 12.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, Approve ${selectedStudents.size} Students`,
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            setProcessing(true);
            // Process each student individually
            let successCount = 0;
            let errorCount = 0;

            for (const studentId of selectedStudents) {
                try {
                    await new Promise((resolve, reject) => {
                        post(route('faculty.approve.enrollment'), {
                            data: { student_id: studentId },
                            onSuccess: () => {
                                successCount++;
                                resolve();
                            },
                            onError: () => {
                                errorCount++;
                                resolve(); // Continue with other students
                            }
                        });
                    });
                } catch (error) {
                    errorCount++;
                }
            }

            setProcessing(false);
            setSelectedStudents(new Set());

            if (successCount > 0 && errorCount === 0) {
                Swal.fire({
                    title: 'All Students Approved!',
                    text: `Successfully enrolled ${successCount} students in Grade 12.`,
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
            } else if (successCount > 0 && errorCount > 0) {
                Swal.fire({
                    title: 'Partial Success',
                    text: `${successCount} students approved, ${errorCount} failed. Please check individual students.`,
                    icon: 'warning',
                    confirmButtonColor: '#f59e0b'
                });
            } else {
                Swal.fire({
                    title: 'Approval Failed',
                    text: 'Failed to approve any students. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    return (
        <>
            <Head title="Grade 12 Auto-Enrollments" />
            
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                    <FaUserGraduate className="mr-3 text-blue-600" />
                                    Grade 12 Auto-Enrollments
                                </h1>
                                <p className="mt-2 text-lg text-gray-600">
                                    Review and approve students eligible for Grade 12 auto-enrollment
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">School Year</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {activeSchoolYear?.year_start}-{activeSchoolYear?.year_end}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                        <div className="flex items-start">
                            <FaInfoCircle className="text-blue-500 text-xl mr-4 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                    Auto-Enrollment Process
                                </h3>
                                <div className="text-blue-700 space-y-2">
                                    <p>Students listed below have completed Grade 11 and are eligible for automatic Grade 12 enrollment.</p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li>Review each student's Grade 11 completion status</li>
                                        <li>Approve individual students or use bulk approval</li>
                                        <li>Students will maintain their strand and section assignments</li>
                                        <li>Approved students will receive their Certificate of Registration (COR)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <FaUsers className="text-blue-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Eligible Students</p>
                                    <p className="text-2xl font-bold text-gray-900">{eligibleStudents.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <FaCheckCircle className="text-green-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Selected</p>
                                    <p className="text-2xl font-bold text-gray-900">{selectedStudents.size}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <FaGraduationCap className="text-purple-600 text-xl" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Ready to Approve</p>
                                    <p className="text-2xl font-bold text-gray-900">{selectedStudents.size}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {eligibleStudents.length > 0 && (
                        <div className="bg-white rounded-lg shadow mb-6 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {selectedStudents.size === eligibleStudents.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-gray-500">
                                        {selectedStudents.size} of {eligibleStudents.length} selected
                                    </span>
                                </div>
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={selectedStudents.size === 0 || processing}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                        selectedStudents.size === 0 || processing
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {processing ? 'Processing...' : `Approve ${selectedStudents.size} Students`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Students List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {eligibleStudents.length === 0 ? (
                            <div className="text-center py-12">
                                <FaUserGraduate className="mx-auto text-gray-400 text-6xl mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    No Students Eligible
                                </h3>
                                <p className="text-gray-600">
                                    There are currently no students eligible for Grade 12 auto-enrollment.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.size === eligibleStudents.length && eligibleStudents.length > 0}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Student
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grade 11 Info
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
                                        {eligibleStudents.map((enrollment) => (
                                            <tr key={enrollment.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.has(enrollment.student.id)}
                                                        onChange={() => handleSelectStudent(enrollment.student.id)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <FaUserGraduate className="text-blue-600" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {enrollment.student.firstname} {enrollment.student.lastname}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {enrollment.student.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        <div className="flex items-center mb-1">
                                                            <FaSchool className="text-gray-400 mr-2" />
                                                            {enrollment.assignedStrand?.name || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center text-gray-500">
                                                            <FaCalendarAlt className="text-gray-400 mr-2" />
                                                            Section: {enrollment.assignedSection?.section_name || 'TBA'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <FaCheckCircle className="mr-1" />
                                                        Grade 11 Complete
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleApproveEnrollment(enrollment.student.id)}
                                                        disabled={processing}
                                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <FaArrowRight className="mr-2" />
                                                        Approve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
