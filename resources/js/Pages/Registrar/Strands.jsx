import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaSearch,
    FaSchool,
    FaBookOpen,
    FaUsers,
    FaSave,
    FaTimes
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function RegistrarStrands({ strands }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingStrand, setEditingStrand] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    const filteredStrands = strands.filter(strand =>
        strand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        strand.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setFormData({ name: '', code: '', description: '' });
        setEditingStrand(null);
        setShowCreateModal(false);
    };

    const handleCreateStrand = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/registrar/strands', {
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
                    text: 'Strand created successfully',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                resetForm();
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to create strand',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStrand = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/registrar/strands/${editingStrand.id}`, {
                method: 'PUT',
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
                    text: 'Strand updated successfully',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                resetForm();
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to update strand',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditStrand = (strand) => {
        setEditingStrand(strand);
        setFormData({
            name: strand.name,
            code: strand.code,
            description: strand.description || ''
        });
        setShowCreateModal(true);
    };

    const handleDeleteStrand = async (strand) => {
        const result = await Swal.fire({
            title: 'Delete Strand?',
            text: `Are you sure you want to delete "${strand.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/strands/${strand.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    }
                });

                const responseData = await response.json();

                if (responseData.success) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Strand has been deleted successfully',
                        icon: 'success',
                        confirmButtonColor: '#3B82F6'
                    });
                    router.reload();
                } else {
                    throw new Error(responseData.message);
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete strand',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const getStrandColor = (code) => {
        const colors = {
            'STEM': 'bg-blue-500',
            'HUMSS': 'bg-green-500',
            'ABM': 'bg-purple-500',
            'GAS': 'bg-yellow-500',
            'TVL': 'bg-red-500'
        };
        return colors[code] || 'bg-gray-500';
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Strand Management - ONSTS" />
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
                                    Strand Management
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Create and manage academic strands for Senior High School
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                            >
                                <FaPlus className="w-4 h-4 mr-2" />
                                Add Strand
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Search and Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{strands.length}</div>
                                    <div className="text-sm text-gray-600">Total Strands</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {strands.filter(s => s.is_active).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Active Strands</div>
                                </div>
                            </div>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search strands..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Strands Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStrands.map((strand) => (
                                <div key={strand.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`${getStrandColor(strand.code)} rounded-lg p-3`}>
                                            <FaSchool className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleEditStrand(strand)}
                                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                                title="Edit Strand"
                                            >
                                                <FaEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStrand(strand)}
                                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                                title="Delete Strand"
                                            >
                                                <FaTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {strand.name}
                                        </h3>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStrandColor(strand.code)} text-white`}>
                                                {strand.code}
                                            </span>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                strand.is_active 
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {strand.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {strand.description || 'No description available'}
                                        </p>
                                    </div>

                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <FaBookOpen className="w-4 h-4 mr-1" />
                                                <span>{strand.subjects_count || 0} Subjects</span>
                                            </div>
                                            <div className="flex items-center">
                                                <FaUsers className="w-4 h-4 mr-1" />
                                                <span>{strand.students_count || 0} Students</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredStrands.length === 0 && (
                            <div className="text-center py-12">
                                <FaSchool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No strands found</h3>
                                <p className="text-gray-600">
                                    {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first strand'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Strand Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingStrand ? 'Edit Strand' : 'Create New Strand'}
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={editingStrand ? handleUpdateStrand : handleCreateStrand} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Strand Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g., Science, Technology, Engineering and Mathematics"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Strand Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        placeholder="e.g., STEM"
                                        maxLength="10"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="Brief description of the strand..."
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <FaSchool className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-900">
                                                Strand Information
                                            </h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Strands will be available for student enrollment and subject assignment immediately after creation.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                                    >
                                        <FaTimes className="w-4 h-4 mr-2" />
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        <FaSave className="w-4 h-4 mr-2" />
                                        {loading ? 'Saving...' : (editingStrand ? 'Update' : 'Create')}
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
