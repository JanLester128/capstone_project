import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaPlus, FaEdit, FaTrash, FaUser, FaSchool, FaGraduationCap } from 'react-icons/fa';

export default function RegistrarSections({ sections, strands, faculty, schoolYears }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStrand, setFilterStrand] = useState('');
    const [filterGradeLevel, setFilterGradeLevel] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [formData, setFormData] = useState({
        section_name: '',
        year_level: 11,
        strand_id: '',
        adviser_id: '',
        school_year_id: '',
        max_capacity: 40
    });

    // Debug logging for faculty data
    console.log('Faculty data received:', faculty);
    console.log('Faculty count:', faculty ? faculty.length : 0);

    const resetForm = () => {
        setFormData({
            section_name: '',
            year_level: 11,
            strand_id: '',
            adviser_id: '',
            school_year_id: '',
            max_capacity: 40
        });
        setEditingSection(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingSection 
                ? `/registrar/sections/${editingSection.id}`
                : '/registrar/sections';
            
            const method = editingSection ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                setShowModal(false);
                resetForm();
                window.location.reload();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: result.message || 'Failed to save section',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to save section. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (section) => {
        setEditingSection(section);
        setFormData({
            section_name: section.section_name,
            year_level: section.year_level,
            strand_id: section.strand_id,
            adviser_id: section.adviser_id || '',
            school_year_id: section.school_year_id,
            max_capacity: section.max_capacity || 40
        });
        setShowModal(true);
    };

    const handleDelete = async (sectionId, sectionName) => {
        const result = await Swal.fire({
            title: 'Delete Section?',
            text: `Are you sure you want to delete ${sectionName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/sections/${sectionId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Deleted!', data.message, 'success');
                    window.location.reload();
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete section.', 'error');
            }
        }
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="Section Management - ONSTS" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sections Management</h1>
                            <p className="text-gray-600">Manage class sections and assignments</p>
                        </div>

                        {/* Actions */}
                        <div className="mb-6">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowModal(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <FaPlus className="w-4 h-4" />
                                Add New Section
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sections List</h2>
                            
                            {sections && sections.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Section Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Strand
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Year Level
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Adviser
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Capacity
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sections.map((section) => (
                                                <tr key={section.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaSchool className="w-4 h-4 text-blue-500 mr-2" />
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {section.section_name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                                            {section.strand?.name || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaGraduationCap className="w-4 h-4 text-green-500 mr-2" />
                                                            <span className="text-sm text-gray-900">Grade {section.year_level}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <FaUser className="w-4 h-4 text-orange-500 mr-2" />
                                                            <span className="text-sm text-gray-900">
                                                                {section.adviser ? `${section.adviser.firstname} ${section.adviser.lastname}` : 'No Adviser'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="text-sm text-gray-900">
                                                                {section.current_enrollment || 0}/{section.max_capacity || 40}
                                                            </div>
                                                            {section.capacity_status && (
                                                                <div className="flex items-center">
                                                                    {section.capacity_status.is_full ? (
                                                                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                                                            Full
                                                                        </span>
                                                                    ) : section.capacity_status.is_near_full ? (
                                                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                                                            Near Full
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                                            Open
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEdit(section)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(section.id, section.section_name)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            <FaTrash className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FaSchool className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sections Found</h3>
                                    <p className="text-gray-500 mb-6">Get started by creating your first section.</p>
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setShowModal(true);
                                        }}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                                    >
                                        <FaPlus className="w-4 h-4" />
                                        Create Section
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section Modal */}
                        {showModal && (
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                                    <div className="p-4">
                                        <h2 className="text-lg font-bold text-gray-900 mb-3">
                                            {editingSection ? 'Edit Section' : 'Add New Section'}
                                        </h2>
                                        
                                        <form onSubmit={handleSubmit} className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.section_name}
                                                    onChange={(e) => setFormData({...formData, section_name: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g., STEM-A, HUMSS-1"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                                                <select
                                                    value={formData.year_level}
                                                    onChange={(e) => setFormData({...formData, year_level: parseInt(e.target.value)})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value={11}>Grade 11</option>
                                                    <option value={12}>Grade 12</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Strand</label>
                                                <select
                                                    value={formData.strand_id}
                                                    onChange={(e) => setFormData({...formData, strand_id: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Strand</option>
                                                    {strands && strands.map((strand) => (
                                                        <option key={strand.id} value={strand.id}>
                                                            {strand.name} ({strand.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">School Year</label>
                                                <select
                                                    value={formData.school_year_id}
                                                    onChange={(e) => setFormData({...formData, school_year_id: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select School Year</option>
                                                    {schoolYears && schoolYears.map((schoolYear) => (
                                                        <option key={schoolYear.id} value={schoolYear.id}>
                                                            {schoolYear.year_start}-{schoolYear.year_end} ({schoolYear.semester})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Note: 2nd semester is only available after the 1st semester of the same academic year has ended.
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Adviser (Optional)</label>
                                                <select
                                                    value={formData.adviser_id}
                                                    onChange={(e) => setFormData({...formData, adviser_id: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">No Adviser</option>
                                                    {faculty && faculty.map((member) => {
                                                        // Create display name with fallback to email if names are missing
                                                        const displayName = member.firstname && member.lastname 
                                                            ? `${member.firstname} ${member.lastname}`
                                                            : member.email || `Faculty ID: ${member.id}`;
                                                        
                                                        return (
                                                            <option key={member.id} value={member.id}>
                                                                {displayName} {member.is_coordinator ? '(Coordinator)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Faculty count: {faculty ? faculty.length : 0}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Capacity</label>
                                                <input
                                                    type="number"
                                                    value={formData.max_capacity}
                                                    onChange={(e) => setFormData({...formData, max_capacity: parseInt(e.target.value)})}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g., 40"
                                                    min="1"
                                                    max="100"
                                                    required
                                                />
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Set the maximum number of students that can be enrolled in this section (1-100).
                                                </p>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {loading ? 'Saving...' : (editingSection ? 'Update Section' : 'Create Section')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowModal(false);
                                                        resetForm();
                                                    }}
                                                    className="flex-1 bg-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-400"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
