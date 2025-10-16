import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
    FaClipboardCheck, 
    FaUser, 
    FaBook, 
    FaChalkboardTeacher,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaCheck,
    FaTimes,
    FaEye,
    FaFilter,
    FaSearch
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function PendingGrades({ 
    pendingGrades = [], 
    totalPending = 0, 
    summary = {},
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const filteredGrades = pendingGrades.filter(grade => {
        const matchesSearch = 
            grade.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grade.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grade.faculty_name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSemester = selectedSemester === 'all' || grade.semester === selectedSemester;
        
        return matchesSearch && matchesSemester;
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

    const handleBulkAction = async (action) => {
        if (selectedGrades.length === 0) {
            Swal.fire({
                title: 'No Grades Selected',
                text: 'Please select at least one grade to perform this action.',
                icon: 'warning'
            });
            return;
        }

        const actionText = action === 'approve' ? 'approve' : 'reject';
        const result = await Swal.fire({
            title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Grades`,
            text: `Are you sure you want to ${actionText} ${selectedGrades.length} selected grade(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionText}`,
            confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                const response = await fetch('/registrar/grades/bulk-approve', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                    body: JSON.stringify({
                        grade_ids: selectedGrades,
                        action: action
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: `${selectedGrades.length} grade(s) ${action}d successfully.`,
                        icon: 'success'
                    });
                    router.reload();
                } else {
                    throw new Error(data.error || 'Failed to process grades');
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: error.message || 'Failed to process grades. Please try again.',
                    icon: 'error'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const getGradeColor = (grade) => {
        if (!grade) return 'text-gray-400';
        if (grade >= 90) return 'text-green-600 font-semibold';
        if (grade >= 80) return 'text-blue-600 font-semibold';
        if (grade >= 75) return 'text-yellow-600 font-semibold';
        return 'text-red-600 font-semibold';
    };

    const getSemesterBadge = (semester) => {
        return semester === '1st' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800';
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Pending Grades - Error" />
                <Sidebar onToggle={handleSidebarToggle} />
                
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    <div className="p-8">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Pending Grades - Registrar" />
            <Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaClipboardCheck className="mr-3 text-blue-600" />
                                Pending Grades
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Review and approve grades submitted by faculty
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Total Pending</p>
                                <p className="font-semibold text-orange-600">{totalPending}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaClipboardCheck className="text-orange-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Pending</p>
                                    <p className="text-lg font-bold text-orange-600">{summary.total_pending || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaCalendarAlt className="text-blue-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">1st Semester</p>
                                    <p className="text-lg font-bold text-blue-600">{summary.first_semester || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center">
                                <FaCalendarAlt className="text-green-500 text-xl mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">2nd Semester</p>
                                    <p className="text-lg font-bold text-green-600">{summary.second_semester || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students, subjects, or faculty..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                                    />
                                </div>
                                
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Semesters</option>
                                    <option value="1st">1st Semester</option>
                                    <option value="2nd">2nd Semester</option>
                                </select>
                            </div>

                            {selectedGrades.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">
                                        {selectedGrades.length} selected
                                    </span>
                                    <button
                                        onClick={() => handleBulkAction('approve')}
                                        disabled={loading}
                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                                    >
                                        <FaCheck className="mr-1" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('reject')}
                                        disabled={loading}
                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                                    >
                                        <FaTimes className="mr-1" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grades Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {filteredGrades.length === 0 ? (
                            <div className="p-8 text-center">
                                <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Grades</h3>
                                <p className="text-gray-600">
                                    {searchTerm || selectedSemester !== 'all' 
                                        ? 'No grades match your current filters.'
                                        : 'All grades have been processed.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGrades.length === filteredGrades.length}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Student
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Faculty
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Semester
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grades
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
                                        {filteredGrades.map((grade) => (
                                            <tr key={grade.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGrades.includes(grade.id)}
                                                        onChange={() => handleSelectGrade(grade.id)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                                            {grade.student_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{grade.student_name}</div>
                                                            <div className="text-sm text-gray-500">{grade.student_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{grade.subject_name}</div>
                                                    <div className="text-sm text-gray-500">{grade.subject_code}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{grade.faculty_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSemesterBadge(grade.semester)}`}>
                                                        {grade.semester} Semester
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm">
                                                        <div className="flex space-x-2">
                                                            <span className={`font-medium ${getGradeColor(grade.first_quarter)}`}>
                                                                Q1: {grade.first_quarter || 'N/A'}
                                                            </span>
                                                            <span className={`font-medium ${getGradeColor(grade.second_quarter)}`}>
                                                                Q2: {grade.second_quarter || 'N/A'}
                                                            </span>
                                                        </div>
                                                        {grade.semester_grade && (
                                                            <div className={`text-xs mt-1 ${getGradeColor(grade.semester_grade)}`}>
                                                                Semester: {grade.semester_grade}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(grade.submitted_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleBulkAction('approve')}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Approve"
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                        <button
                                                            onClick={() => handleBulkAction('reject')}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Reject"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
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
        </div>
    );
}
