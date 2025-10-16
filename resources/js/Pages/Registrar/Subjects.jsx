import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaSearch,
    FaBookOpen,
    FaGraduationCap,
    FaFilter,
    FaSave,
    FaTimes,
    FaCalendarAlt,
    FaLayerGroup
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function RegistrarSubjects({ subjects, strands }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStrand, setFilterStrand] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterGradeLevel, setFilterGradeLevel] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [formData, setFormData] = useState({
        subject_name: '',
        subject_code: '',
        strand_id: '',
        semester: '',
        grade_level: ''
    });
    const [loading, setLoading] = useState(false);

    const filteredSubjects = subjects.filter(subject => {
        const matchesSearch = (subject.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (subject.code || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStrand = !filterStrand || subject.strand_id == filterStrand || (!subject.strand_id && filterStrand === 'core');
        const matchesSemester = !filterSemester || subject.semester == filterSemester;
        const matchesGradeLevel = !filterGradeLevel || subject.year_level === filterGradeLevel;
        
        return matchesSearch && matchesStrand && matchesSemester && matchesGradeLevel;
    });

    const resetForm = () => {
        setFormData({
            subject_name: '',
            subject_code: '',
            strand_id: '',
            semester: '',
            grade_level: ''
        });
        setEditingSubject(null);
        setShowCreateModal(false);
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/registrar/subjects', {
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
                    text: 'Subject created successfully',
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
                text: error.message || 'Failed to create subject',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubject = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/registrar/subjects/${editingSubject.id}`, {
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
                    text: 'Subject updated successfully',
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
                text: error.message || 'Failed to update subject',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubject = (subject) => {
        setEditingSubject(subject);
        setFormData({
            subject_name: subject.name,
            subject_code: subject.code,
            strand_id: subject.strand_id || '',
            semester: subject.semester,
            grade_level: subject.year_level
        });
        setShowCreateModal(true);
    };

    const handleDeleteSubject = async (subject) => {
        const result = await Swal.fire({
            title: 'Delete Subject?',
            text: `Are you sure you want to delete "${subject.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/subjects/${subject.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    }
                });

                const responseData = await response.json();

                if (responseData.success) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Subject has been deleted successfully',
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
                    text: 'Failed to delete subject',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const getSubjectTypeColor = (strand) => {
        if (!strand) return 'bg-gray-500';
        const colors = {
            'STEM': 'bg-blue-500',
            'HUMSS': 'bg-green-500',
            'ABM': 'bg-purple-500',
            'GAS': 'bg-yellow-500',
            'TVL': 'bg-red-500'
        };
        return colors[strand.code] || 'bg-gray-500';
    };

    const getSemesterColor = (semester) => {
        return semester === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    };

    const getSemesterText = (semester) => {
        return semester === 1 ? '1st Semester' : '2nd Semester';
    };

    const getGradeLevelText = (yearLevel) => {
        return `Grade ${yearLevel}`;
    };

    const clearFilters = () => {
        setFilterStrand('');
        setFilterSemester('');
        setFilterGradeLevel('');
        setSearchTerm('');
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Subject Management - ONSTS" />
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
                                    Subject Management
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Create and manage subjects for each strand and grade level
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                            >
                                <FaPlus className="w-4 h-4 mr-2" />
                                Add Subject
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Filters and Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaFilter className="w-5 h-5 mr-2" />
                                Filters & Search
                            </h2>
                            <button
                                onClick={clearFilters}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Clear All Filters
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search subjects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <select
                                value={filterStrand}
                                onChange={(e) => setFilterStrand(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Strands</option>
                                <option value="core">Core Subjects</option>
                                {strands.map(strand => (
                                    <option key={strand.id} value={strand.id}>
                                        {strand.code} - {strand.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterSemester}
                                onChange={(e) => setFilterSemester(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Semesters</option>
                                <option value="1">1st Semester</option>
                                <option value="2">2nd Semester</option>
                            </select>

                            <select
                                value={filterGradeLevel}
                                onChange={(e) => setFilterGradeLevel(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Grade Levels</option>
                                <option value="11">Grade 11</option>
                                <option value="12">Grade 12</option>
                            </select>

                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{filteredSubjects.length}</div>
                                <div className="text-xs text-gray-600">Subjects Found</div>
                            </div>
                        </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Strand
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Grade Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Semester
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredSubjects.map((subject) => (
                                        <tr key={subject.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`flex-shrink-0 h-10 w-10 ${getSubjectTypeColor(subject.strand)} rounded-lg flex items-center justify-center`}>
                                                        <FaBookOpen className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {subject.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {subject.is_active ? 'Active' : 'Inactive'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    {subject.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {subject.strand ? (
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSubjectTypeColor(subject.strand)} text-white`}>
                                                        {subject.strand.code}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-500 text-white">
                                                        CORE
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {getGradeLevelText(subject.year_level)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSemesterColor(subject.semester)}`}>
                                                    {getSemesterText(subject.semester)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditSubject(subject)}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                                        title="Edit Subject"
                                                    >
                                                        <FaEdit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubject(subject)}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded"
                                                        title="Delete Subject"
                                                    >
                                                        <FaTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredSubjects.length === 0 && (
                            <div className="text-center py-12">
                                <FaBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
                                <p className="text-gray-600">
                                    {searchTerm || filterStrand || filterSemester || filterGradeLevel 
                                        ? 'Try adjusting your search terms or filters' 
                                        : 'Get started by creating your first subject'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Subject Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingSubject ? 'Edit Subject' : 'Create New Subject'}
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject_name}
                                        onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                                        placeholder="e.g., General Mathematics"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject_code}
                                        onChange={(e) => setFormData({...formData, subject_code: e.target.value.toUpperCase()})}
                                        placeholder="e.g., MATH11"
                                        maxLength="20"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Strand
                                    </label>
                                    <select
                                        value={formData.strand_id}
                                        onChange={(e) => setFormData({...formData, strand_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Core Subject (All Strands)</option>
                                        {strands.map(strand => (
                                            <option key={strand.id} value={strand.id}>
                                                {strand.code} - {strand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Grade Level
                                        </label>
                                        <select
                                            required
                                            value={formData.grade_level}
                                            onChange={(e) => setFormData({...formData, grade_level: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Grade</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Semester
                                        </label>
                                        <select
                                            required
                                            value={formData.semester}
                                            onChange={(e) => setFormData({...formData, semester: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Semester</option>
                                            <option value="1">1st Semester</option>
                                            <option value="2">2nd Semester</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <FaBookOpen className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-900">
                                                Subject Information
                                            </h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Core subjects (no strand selected) will be available to all students. 
                                                Strand-specific subjects will only be available to students in that strand.
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
                                        {loading ? 'Saving...' : (editingSubject ? 'Update' : 'Create')}
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
