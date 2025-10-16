import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
    FaUserGraduate, 
    FaClipboardCheck,
    FaEye,
    FaCheck,
    FaTimes,
    FaClock,
    FaSpinner,
    FaSearch,
    FaFilter,
    FaGraduationCap,
    FaSchool,
    FaCalendarAlt,
    FaUser,
    FaChartBar
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function RegistrarTransfereeApprovals({ evaluations = [], stats = [], currentSchoolYear }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEvaluations = evaluations.filter(evaluation => 
        searchTerm === '' || 
        evaluation.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.student_lrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.previous_school?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApproveEvaluation = async (evaluationId, studentName) => {
        const result = await Swal.fire({
            title: 'Approve Transferee Evaluation',
            html: `
                <div class="text-left">
                    <p class="mb-4">Are you sure you want to approve the transferee evaluation for <strong>${studentName}</strong>?</p>
                    <p class="text-sm text-gray-600 mb-4">Once approved, the coordinator will be able to enroll this student.</p>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Optional Notes:</label>
                    <textarea id="approval-notes" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" rows="3" placeholder="Add any notes about this approval..."></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Approve Evaluation',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const notes = document.getElementById('approval-notes').value;
                return { notes };
            }
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const response = await fetch(`/registrar/transferee-evaluations/${evaluationId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    notes: result.value.notes
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Evaluation Approved',
                    text: data.message,
                    timer: 3000
                });
                
                // Refresh the page
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to approve evaluation');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to approve evaluation. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRejectEvaluation = async (evaluationId, studentName) => {
        const { value: rejectionReason } = await Swal.fire({
            title: 'Reject Transferee Evaluation',
            html: `
                <div class="text-left">
                    <p class="mb-4">Please provide a reason for rejecting the transferee evaluation for <strong>${studentName}</strong>:</p>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Rejection Reason: <span class="text-red-500">*</span></label>
                    <textarea id="rejection-reason" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" rows="4" placeholder="Please provide a clear reason for rejection..."></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Reject Evaluation',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const reason = document.getElementById('rejection-reason').value;
                if (!reason.trim()) {
                    Swal.showValidationMessage('Please provide a rejection reason');
                    return false;
                }
                return reason;
            }
        });

        if (!rejectionReason) return;

        setLoading(true);
        try {
            const response = await fetch(`/registrar/transferee-evaluations/${evaluationId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    // rejection_reason removed - no longer needed
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Evaluation Rejected',
                    text: data.message,
                    timer: 3000
                });
                
                // Refresh the page
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to reject evaluation');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to reject evaluation. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Transferee Approvals - Registrar" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <Sidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Transferee Approvals</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Review and approve transferee evaluations from coordinators
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                        {currentSchoolYear?.school_year || 'No Active School Year'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {currentSchoolYear?.semester || 'N/A'} Semester
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <FaClipboardCheck className="h-8 w-8 text-indigo-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.pending_approval || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <FaUserGraduate className="h-8 w-8 text-purple-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Total Evaluations</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.total_evaluations || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <FaGraduationCap className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Credited Subjects</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.total_credited_subjects || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <FaChartBar className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Total Units</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.total_units || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by student name, email, LRN, or previous school..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evaluations List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Transferee Evaluations ({filteredEvaluations.length})
                                </h3>
                            </div>

                            {filteredEvaluations.length === 0 ? (
                                <div className="text-center py-12">
                                    <FaClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Evaluations Found</h3>
                                    <p className="text-gray-500">
                                        {searchTerm ? 'No evaluations match your search criteria.' : 'There are no transferee evaluations pending approval.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredEvaluations.map((evaluation) => (
                                        <div key={evaluation.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                {evaluation.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-semibold text-gray-900">
                                                                {evaluation.student_name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                LRN: {evaluation.student_lrn} • {evaluation.student_email}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <FaGraduationCap className="text-blue-500" />
                                                            <span className="text-gray-600">Grade:</span>
                                                            <span className="font-medium">{evaluation.intended_grade_level}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <FaSchool className="text-green-500" />
                                                            <span className="text-gray-600">Strand:</span>
                                                            <span className="font-medium">{evaluation.recommended_strand}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <FaUser className="text-purple-500" />
                                                            <span className="text-gray-600">Coordinator:</span>
                                                            <span className="font-medium">{evaluation.coordinator_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <FaCalendarAlt className="text-orange-500" />
                                                            <span className="text-gray-600">Evaluated:</span>
                                                            <span className="font-medium">
                                                                {new Date(evaluation.evaluation_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span>Previous School: <strong>{evaluation.previous_school}</strong></span>
                                                        <span>•</span>
                                                        <span>Credited Subjects: <strong>{evaluation.credited_subjects_count}</strong></span>
                                                        <span>•</span>
                                                        <span>Total Units: <strong>{evaluation.total_units}</strong></span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 ml-6">
                                                    <button
                                                        onClick={() => handleApproveEvaluation(evaluation.id, evaluation.student_name)}
                                                        disabled={loading}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                                                    >
                                                        {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectEvaluation(evaluation.id, evaluation.student_name)}
                                                        disabled={loading}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                                                    >
                                                        {loading ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
