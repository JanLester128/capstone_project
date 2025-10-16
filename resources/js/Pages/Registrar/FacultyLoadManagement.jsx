import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaPlus, FaTrash, FaEdit, FaClock, FaUser, FaChartBar, FaExclamationTriangle, FaSearch, FaEye } from 'react-icons/fa';

export default function FacultyLoadManagement({ faculty, subjects, sections, schedules, loadPolicy }) {
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStrand, setFilterStrand] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assignmentData, setAssignmentData] = useState({
        faculty_id: '',
        subject_id: '',
        section_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        semester: '1st Semester'
    });

    // Default load policy if not provided from backend
    const defaultLoadPolicy = {
        max_loads_per_faculty: 5,
        allowed_load_types: [
            'Core Subject Teaching',
            'Specialized Subject Teaching', 
            'Laboratory Supervision',
            'Homeroom Advisory',
            'Club/Organization Supervision'
        ]
    };

    // Use provided loadPolicy or fall back to default
    const currentLoadPolicy = loadPolicy || defaultLoadPolicy;

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Filter faculty based on search term
    const filteredFaculty = faculty.filter(member => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${member.firstname} ${member.lastname}`.toLowerCase();
        const email = member.email.toLowerCase();
        
        return fullName.includes(searchLower) || 
               email.includes(searchLower) ||
               member.role.toLowerCase().includes(searchLower);
    });

    const handleAssignLoad = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/registrar/faculty-loads/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(assignmentData)
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
                setShowAssignModal(false);
                router.reload();
            } else {
                Swal.fire({
                    title: 'Assignment Failed',
                    text: result.error,
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to assign load. Please try again.',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLoad = async (classId, facultyName) => {
        const result = await Swal.fire({
            title: 'Remove Load?',
            text: `Remove this class assignment from ${facultyName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, remove it'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/faculty-loads/${classId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Removed!', data.message, 'success');
                    router.reload();
                } else {
                    Swal.fire('Error', data.error, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to remove load.', 'error');
            }
        }
    };

    const getUtilizationColor = (percentage) => {
        if (percentage >= 100) return 'text-red-600 bg-red-100';
        if (percentage >= 80) return 'text-orange-600 bg-orange-100';
        if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <>
            <Head title="Faculty Load Management - ONSTS" />
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Faculty Load Management</h1>
                            <p className="text-gray-600">Manage faculty teaching loads and class assignments</p>
                            
                            {/* Load Policy Info */}
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Load Policy</h3>
                                <p className="text-blue-800 text-sm mb-2">Maximum {currentLoadPolicy.max_loads_per_faculty} teaching loads per faculty member</p>
                                <ul className="text-blue-700 text-sm space-y-1">
                                    {currentLoadPolicy.allowed_load_types.map((type, index) => (
                                        <li key={index}>• {type}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Actions and Search */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <FaPlus className="w-4 h-4" />
                                    Assign New Load
                                </button>
                                
                                <div className="text-sm text-gray-600">
                                    Total Faculty: <span className="font-medium">{faculty.length}</span>
                                </div>
                            </div>
                            
                            {/* Search Bar */}
                            <div className="relative w-full sm:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search faculty by name, email, or role..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Faculty Load Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Table Header */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-900">Faculty Load Overview</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Showing {filteredFaculty.length} of {faculty.length} faculty members
                                </p>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Classes</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredFaculty.length > 0 ? (
                                            filteredFaculty.map((member) => (
                                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                                    {/* Faculty Info */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                {member.firstname?.charAt(0)}{member.lastname?.charAt(0)}
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {member.firstname} {member.lastname}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {member.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                                {member.role}
                                                            </span>
                                                            {member.is_coordinator && (
                                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                    Coordinator
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Load Status */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {member.is_overloaded && (
                                                                <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2" />
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm text-gray-600">
                                                                        {member.current_loads || 0}/{member.max_loads || currentLoadPolicy.max_loads_per_faculty}
                                                                    </span>
                                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getUtilizationColor(member.utilization_percentage || 0)}`}>
                                                                        {(member.utilization_percentage || 0).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div 
                                                                        className={`h-2 rounded-full ${member.is_overloaded ? 'bg-red-500' : 'bg-blue-500'}`}
                                                                        style={{ width: `${Math.min(member.utilization_percentage || 0, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {member.remaining_loads || 0} loads remaining
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Current Classes */}
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-xs">
                                                            {member.classes && member.classes.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {member.classes.slice(0, 2).map((cls) => (
                                                                        <div key={cls.id} className="text-sm">
                                                                            <div className="font-medium text-gray-900">{cls.subject_name}</div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {cls.section_name} • {cls.day_of_week} {cls.start_time}-{cls.end_time}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {member.classes.length > 2 && (
                                                                        <div className="text-xs text-gray-500">
                                                                            +{member.classes.length - 2} more classes
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-gray-500 italic">No classes assigned</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setAssignmentData({...assignmentData, faculty_id: member.id});
                                                                    setShowAssignModal(true);
                                                                }}
                                                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                                                title="Assign New Load"
                                                            >
                                                                <FaPlus className="w-3 h-3" />
                                                            </button>
                                                            
                                                            {member.classes && member.classes.length > 0 && (
                                                                <button
                                                                    onClick={() => {
                                                                        // Show detailed view modal or expand row
                                                                        console.log('View details for', member);
                                                                    }}
                                                                    className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
                                                                    title="View All Classes"
                                                                >
                                                                    <FaEye className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center">
                                                        <FaUser className="text-gray-300 text-4xl mb-2" />
                                                        <p className="text-lg font-medium">No faculty members found</p>
                                                        <p className="text-sm">
                                                            {searchTerm ? 'Try adjusting your search terms' : 'No faculty members have been added yet'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Assignment Modal */}
                        {showAssignModal && (
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-4">Assign New Load</h2>
                                        
                                        <form onSubmit={handleAssignLoad} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Member</label>
                                                <select
                                                    value={assignmentData.faculty_id}
                                                    onChange={(e) => setAssignmentData({...assignmentData, faculty_id: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Faculty</option>
                                                    {faculty.map((member) => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.firstname} {member.lastname} ({member.current_loads}/{member.max_loads} loads)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                                <select
                                                    value={assignmentData.subject_id}
                                                    onChange={(e) => setAssignmentData({...assignmentData, subject_id: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Subject</option>
                                                    {subjects.map((subject) => (
                                                        <option key={subject.id} value={subject.id}>
                                                            {subject.name} {subject.strand && `(${subject.strand.name})`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                                                <select
                                                    value={assignmentData.section_id}
                                                    onChange={(e) => setAssignmentData({...assignmentData, section_id: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Section</option>
                                                    {sections.map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            {section.section_name} {section.strand && `(${section.strand.name})`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                                                    <select
                                                        value={assignmentData.day_of_week}
                                                        onChange={(e) => setAssignmentData({...assignmentData, day_of_week: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Select Day</option>
                                                        {daysOfWeek.map((day) => (
                                                            <option key={day} value={day}>{day}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                                                    <select
                                                        value={assignmentData.semester}
                                                        onChange={(e) => setAssignmentData({...assignmentData, semester: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="1st Semester">1st Semester</option>
                                                        <option value="2nd Semester">2nd Semester</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={assignmentData.start_time}
                                                        onChange={(e) => setAssignmentData({...assignmentData, start_time: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={assignmentData.end_time}
                                                        onChange={(e) => setAssignmentData({...assignmentData, end_time: e.target.value})}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {loading ? 'Assigning...' : 'Assign Load'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAssignModal(false)}
                                                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
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
