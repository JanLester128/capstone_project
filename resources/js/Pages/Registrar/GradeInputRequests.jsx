import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaCheck, 
    FaTimes, 
    FaEye, 
    FaSearch,
    FaClock,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTimesCircle,
    FaUser,
    FaBook,
    FaCalendarAlt,
    FaFilter
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function GradeInputRequests({ requests = [], stats = {}, error = null }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending');
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });

    const filteredRequests = requests.filter(request => {
        const matchesSearch = request.faculty_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.reason?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleSelectRequest = (requestId) => {
        setSelectedRequests(prev => 
            prev.includes(requestId) 
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRequests.length === filteredRequests.length) {
            setSelectedRequests([]);
        } else {
            setSelectedRequests(filteredRequests.map(r => r.id));
        }
    };

    const handleApprove = async (requestId, notes = '', expiresInDays = 7) => {
        setLoading(true);

        try {
            const response = await fetch(`/registrar/grade-input-requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    notes,
                    expires_in_days: expiresInDays
                })
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Grade input request approved successfully',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to approve request',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (requestId, notes) => {
        setLoading(true);

        try {
            const response = await fetch(`/registrar/grade-input-requests/${requestId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({ notes })
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Grade input request rejected successfully',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to reject request',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const showApprovalModal = (request) => {
        Swal.fire({
            title: 'Approve Grade Input Request',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-blue-50 p-3 rounded-lg mb-4">
                        <p class="text-sm text-blue-800"><strong>Important:</strong> Once approved, faculty can input grades. Grades will only appear to students after you approve them through the Grade Approval system.</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Faculty:</label>
                        <p class="text-sm text-gray-900">${request.faculty_name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Class:</label>
                        <p class="text-sm text-gray-900">${request.class_name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Quarter:</label>
                        <p class="text-sm text-gray-900">${request.quarter} Quarter</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Students needing grades:</label>
                        <p class="text-sm text-gray-900">${request.students_count} students</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Approval expires in (days):</label>
                        <input type="number" id="expires-days" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="7" min="1" max="30">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional):</label>
                        <textarea id="approval-notes" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3" placeholder="Add any notes for the faculty..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#10B981',
            preConfirm: () => {
                const expiresInDays = document.getElementById('expires-days').value;
                const notes = document.getElementById('approval-notes').value;
                return { expiresInDays: parseInt(expiresInDays), notes };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                handleApprove(request.id, result.value.notes, result.value.expiresInDays);
            }
        });
    };

    const showRejectionModal = (request) => {
        Swal.fire({
            title: 'Reject Grade Input Request',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Faculty:</label>
                        <p class="text-sm text-gray-900">${request.faculty_name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Class:</label>
                        <p class="text-sm text-gray-900">${request.class_name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Reason for rejection (required):</label>
                        <textarea id="rejection-notes" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3" placeholder="Explain why this request is being rejected..." required></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#EF4444',
            preConfirm: () => {
                const notes = document.getElementById('rejection-notes').value;
                if (!notes.trim()) {
                    Swal.showValidationMessage('Please provide a reason for rejection');
                    return false;
                }
                return notes;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                handleReject(request.id, result.value);
            }
        });
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const getStatusBadge = (request) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[request.status] || 'bg-gray-100 text-gray-800'}`}>
                {request.status_text || request.status}
            </span>
        );
    };

    const getPriorityBadge = (isUrgent) => {
        if (!isUrgent) return null;
        
        return (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Urgent
            </span>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Grade Input Requests - ONSTS" />
            <Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`flex-1 transition-all duration-300 ${
                sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Grade Input Requests
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Review and approve faculty requests to input grades. Grades will only appear to students after your approval.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                            <FaExclamationTriangle className="text-red-400 mr-2" />
                            <span className="text-red-800">{error}</span>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="p-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-yellow-500 rounded-lg p-3 mr-4">
                                    <FaClock className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total_pending || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-red-500 rounded-lg p-3 mr-4">
                                    <FaExclamationTriangle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Urgent Requests</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.urgent_requests || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-orange-500 rounded-lg p-3 mr-4">
                                    <FaCalendarAlt className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Overdue (&gt;3 days)</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.overdue_requests || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaFilter className="w-5 h-5 mr-2" />
                                Filters & Search
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search faculty, class, or reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{filteredRequests.length}</div>
                                <div className="text-xs text-gray-600">Requests Found</div>
                            </div>
                        </div>
                    </div>

                    {/* Requests Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm font-medium text-gray-700">
                                    Select All ({filteredRequests.length})
                                </label>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Select
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Faculty
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Class & Quarter
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Students
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Submitted
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRequests.includes(request.id)}
                                                    onChange={() => handleSelectRequest(request.id)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <FaUser className="text-white text-sm" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {request.faculty_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {request.faculty_email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {request.class_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {request.quarter} Quarter
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                                    {request.reason}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {request.students_count} students
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    {getStatusBadge(request)}
                                                    {getPriorityBadge(request.is_urgent)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>{new Date(request.created_at).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500">
                                                    {request.days_pending} days ago
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => showApprovalModal(request)}
                                                        disabled={loading}
                                                        className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        <FaCheck className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => showRejectionModal(request)}
                                                        disabled={loading}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <FaTimes className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredRequests.length === 0 && (
                            <div className="text-center py-12">
                                <FaBook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No grade input requests</h3>
                                <p className="text-gray-600">
                                    {searchTerm 
                                        ? 'Try adjusting your search terms' 
                                        : 'No pending requests at this time'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
