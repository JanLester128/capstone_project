import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaPlus, 
    FaEdit, 
    FaSearch,
    FaUserTie,
    FaToggleOn,
    FaToggleOff,
    FaCrown,
    FaKey
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function RegistrarFaculty({ faculty = [], strands = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        assigned_strand_id: ''
    });
    const [loading, setLoading] = useState(false);

    const filteredFaculty = faculty.filter(member =>
        (member.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateFaculty = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/registrar/faculty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Faculty account created successfully. Login credentials have been sent to their email.',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                setShowCreateModal(false);
                setFormData({ firstname: '', lastname: '', email: '', strand_id: '' });
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to create faculty account',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };


    const handleToggleStatus = async (facultyId, currentStatus) => {
        const action = currentStatus ? 'disable' : 'enable';
        
        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Faculty?`,
            text: `Are you sure you want to ${action} this faculty member?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#EF4444' : '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: `Yes, ${action}!`
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/faculty/${facultyId}/toggle-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        is_disabled: currentStatus
                    })
                });

                if (response.ok) {
                    Swal.fire({
                        title: 'Success!',
                        text: `Faculty member ${action}d successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#3B82F6'
                    });
                    window.location.reload();
                } else {
                    throw new Error('Failed to update status');
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to update faculty status',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const handleToggleCoordinator = async (facultyId, currentIsCoordinator) => {
        const action = currentIsCoordinator ? 'Remove coordinator privileges' : 'Grant coordinator privileges';
        
        const result = await Swal.fire({
            title: `${action}?`,
            text: `Are you sure you want to ${action.toLowerCase()} for this faculty member?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentIsCoordinator ? '#EF4444' : '#8B5CF6',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, proceed!'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/faculty/${facultyId}/toggle-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        is_coordinator: !currentIsCoordinator
                    })
                });

                if (response.ok) {
                    Swal.fire({
                        title: 'Success!',
                        text: `Coordinator status updated successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#3B82F6'
                    });
                    window.location.reload();
                } else {
                    throw new Error('Failed to update coordinator status');
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to update coordinator status',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const handleEditFaculty = (faculty) => {
        setEditingFaculty(faculty);
        setFormData({
            firstname: faculty.firstname || '',
            lastname: faculty.lastname || '',
            email: faculty.email || '',
            assigned_strand_id: faculty.assigned_strand_id || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateFaculty = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/registrar/faculty/${editingFaculty.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Faculty member updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });
                setShowEditModal(false);
                setEditingFaculty(null);
                setFormData({
                    firstname: '',
                    lastname: '',
                    email: '',
                    assigned_strand_id: ''
                });
                window.location.reload();
            } else {
                throw new Error('Failed to update faculty');
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to update faculty member',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Faculty Management - ONSTS" />
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
                                    Faculty Management
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Create and manage faculty accounts with automatic email notifications
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                            >
                                <FaPlus className="w-4 h-4 mr-2" />
                                Add Faculty
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Search and Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Faculty Members ({filteredFaculty.length})
                            </h2>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search faculty..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Faculty Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Faculty Member
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Assigned Strand
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
                                    {filteredFaculty.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <FaUserTie className="h-5 w-5 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {(member.firstname || '')} {(member.lastname || '')}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            ID: {member.id || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {member.email || 'No email'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    member.role === 'coordinator' 
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {member.role === 'coordinator' ? 'Coordinator' : 'Faculty'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {member.assigned_strand ? (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                        {member.assigned_strand.code}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                                        General
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleToggleStatus(member.id, !member.is_disabled)}
                                                    className={`flex items-center ${
                                                        member.is_disabled 
                                                            ? 'text-red-600 hover:text-red-700' 
                                                            : 'text-green-600 hover:text-green-700'
                                                    }`}
                                                >
                                                    {member.is_disabled ? (
                                                        <>
                                                            <FaToggleOff className="w-5 h-5 mr-1" />
                                                            Disabled
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaToggleOn className="w-5 h-5 mr-1" />
                                                            Active
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleToggleCoordinator(member.id, member.role === 'coordinator')}
                                                        className={`p-1 rounded ${
                                                            member.role === 'coordinator' 
                                                                ? 'text-yellow-600 hover:text-yellow-700' 
                                                                : 'text-gray-400 hover:text-yellow-600'
                                                        }`}
                                                        title={member.role === 'coordinator' ? 'Remove Coordinator Privileges' : 'Grant Coordinator Privileges'}
                                                    >
                                                        <FaCrown className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditFaculty(member)}
                                                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                                                        title="Edit Faculty"
                                                    >
                                                        <FaEdit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Faculty Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Create Faculty Account
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleCreateFaculty} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstname}
                                        onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastname}
                                        onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assigned Strand (Optional)
                                    </label>
                                    <select
                                        value={formData.assigned_strand_id}
                                        onChange={(e) => setFormData({...formData, assigned_strand_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">No specific strand (General Faculty)</option>
                                        {strands.map(strand => (
                                            <option key={strand.id} value={strand.id}>
                                                {strand.code} - {strand.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Faculty can be assigned to a specific strand or left as general faculty
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <FaKey className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-900">
                                                Automatic Password Generation
                                            </h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                A secure password will be automatically generated and sent to the faculty member's email address.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Create Faculty'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Faculty Modal */}
            {showEditModal && editingFaculty && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Edit Faculty Member
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingFaculty(null);
                                        setFormData({
                                            firstname: '',
                                            lastname: '',
                                            email: '',
                                            assigned_strand_id: ''
                                        });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdateFaculty} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstname}
                                        onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastname}
                                        onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assigned Strand (Optional)
                                    </label>
                                    <select
                                        value={formData.assigned_strand_id}
                                        onChange={(e) => setFormData({...formData, assigned_strand_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">No specific strand (General Faculty)</option>
                                        {strands.map(strand => (
                                            <option key={strand.id} value={strand.id}>
                                                {strand.code} - {strand.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Faculty can be assigned to a specific strand or left as general faculty
                                    </p>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingFaculty(null);
                                            setFormData({
                                                firstname: '',
                                                lastname: '',
                                                email: '',
                                                assigned_strand_id: ''
                                            });
                                        }}
                                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Faculty'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
