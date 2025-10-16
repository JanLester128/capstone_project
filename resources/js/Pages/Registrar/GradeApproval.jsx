import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaCheck, 
    FaTimes, 
    FaEye, 
    FaSearch,
    FaGraduationCap,
    FaChalkboardTeacher,
    FaBookOpen,
    FaFilter,
    FaCheckCircle,
    FaTimesCircle
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function RegistrarGradeApproval({ pendingGrades }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterFaculty, setFilterFaculty] = useState('');
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkAction, setBulkAction] = useState('');
    const [bulkRemarks, setBulkRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });

    const filteredGrades = pendingGrades.filter(grade => {
        const matchesSearch = grade.student?.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            grade.student?.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            grade.subject?.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = !filterSubject || grade.subject?.id == filterSubject;
        const matchesFaculty = !filterFaculty || grade.faculty?.id == filterFaculty;
        
        return matchesSearch && matchesSubject && matchesFaculty;
    });

    const uniqueSubjects = [...new Map(pendingGrades.map(g => [g.subject?.id, g.subject])).values()];
    const uniqueFaculty = [...new Map(pendingGrades.map(g => [g.faculty?.id, g.faculty])).values()];

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
            setSelectedGrades(filteredGrades.map(g => g.id));
        }
    };

    const handleBulkAction = (action) => {
        if (selectedGrades.length === 0) {
            Swal.fire({
                title: 'No Grades Selected',
                text: 'Please select grades to perform bulk action',
                icon: 'warning',
                confirmButtonColor: '#F59E0B'
            });
            return;
        }

        setBulkAction(action);
        setShowBulkModal(true);
    };

    const submitBulkAction = async () => {
        setLoading(true);

        try {
            const response = await fetch('/registrar/grades/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    grade_ids: selectedGrades,
                    action: bulkAction,
                    remarks: bulkRemarks
                })
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: `Grades ${bulkAction}d successfully`,
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                setShowBulkModal(false);
                setSelectedGrades([]);
                setBulkRemarks('');
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || `Failed to ${bulkAction} grades`,
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        if (!grade || grade === 'N/A' || grade === null || grade === undefined) return 'text-gray-400';
        
        const numGrade = parseFloat(grade);
        if (isNaN(numGrade)) return 'text-gray-400';
        
        if (numGrade >= 90) return 'text-green-600 font-semibold';
        if (numGrade >= 85) return 'text-blue-600 font-semibold';
        if (numGrade >= 80) return 'text-yellow-600 font-semibold';
        if (numGrade >= 75) return 'text-orange-600 font-semibold';
        return 'text-red-600 font-semibold';
    };

    const calculateAverage = (grade) => {
        const prelim = grade.prelim && grade.prelim > 0 ? parseFloat(grade.prelim) : null;
        const midterm = grade.midterm && grade.midterm > 0 ? parseFloat(grade.midterm) : null;
        
        // Check if both quarters are complete
        const bothQuartersComplete = prelim !== null && midterm !== null;
        
        if (!bothQuartersComplete) {
            // If either quarter is missing, show as ongoing
            if (prelim !== null || midterm !== null) {
                return 'Ongoing';
            }
            return 'N/A';
        }
        
        // If we have semester grade and both quarters are complete, use it
        if (grade.finals && grade.finals > 0) {
            return parseFloat(grade.finals).toFixed(1);
        }
        
        // Calculate average from both quarters
        const average = (prelim + midterm) / 2;
        return average.toFixed(1);
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Grade Approval - ONSTS" />
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
                                    Grade Approval Management
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Review and approve grades submitted by faculty members
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleBulkAction('approve')}
                                    disabled={selectedGrades.length === 0}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                                >
                                    <FaCheckCircle className="w-4 h-4 mr-2" />
                                    Bulk Approve ({selectedGrades.length})
                                </button>
                                <button
                                    onClick={() => handleBulkAction('reject')}
                                    disabled={selectedGrades.length === 0}
                                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                                >
                                    <FaTimesCircle className="w-4 h-4 mr-2" />
                                    Bulk Reject ({selectedGrades.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-yellow-500 rounded-lg p-3 mr-4">
                                    <FaBookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                                    <p className="text-2xl font-bold text-gray-900">{pendingGrades.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-blue-500 rounded-lg p-3 mr-4">
                                    <FaChalkboardTeacher className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Faculty Submissions</p>
                                    <p className="text-2xl font-bold text-gray-900">{uniqueFaculty.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-purple-500 rounded-lg p-3 mr-4">
                                    <FaGraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Subjects</p>
                                    <p className="text-2xl font-bold text-gray-900">{uniqueSubjects.length}</p>
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
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterSubject('');
                                    setFilterFaculty('');
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Clear All Filters
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search students/subjects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Subjects</option>
                                {uniqueSubjects.map(subject => (
                                    <option key={subject?.id} value={subject?.id}>
                                        {subject?.subject_name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterFaculty}
                                onChange={(e) => setFilterFaculty(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Faculty</option>
                                {uniqueFaculty.map(faculty => (
                                    <option key={faculty?.id} value={faculty?.id}>
                                        {faculty?.firstname} {faculty?.lastname}
                                    </option>
                                ))}
                            </select>

                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{filteredGrades.length}</div>
                                <div className="text-xs text-gray-600">Grades Found</div>
                            </div>
                        </div>
                    </div>

                    {/* Grades Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedGrades.length === filteredGrades.length && filteredGrades.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm font-medium text-gray-700">
                                    Select All ({filteredGrades.length})
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
                                            Student
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Faculty
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Grades
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Average
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
                                    {filteredGrades.map((grade) => {
                                        const average = calculateAverage(grade);
                                        return (
                                            <tr key={grade.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGrades.includes(grade.id)}
                                                        onChange={() => handleSelectGrade(grade.id)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                                <span className="text-sm font-medium text-white">
                                                                    {grade.student?.firstname?.charAt(0)}{grade.student?.lastname?.charAt(0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {grade.student?.firstname} {grade.student?.lastname}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {grade.subject?.subject_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {grade.subject?.subject_code}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {grade.faculty?.firstname} {grade.faculty?.lastname}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm space-y-1">
                                                        <div>Prelim: <span className={getGradeColor(grade.prelim)}>{grade.prelim || 'N/A'}</span></div>
                                                        <div>Midterm: <span className={getGradeColor(grade.midterm)}>{grade.midterm || 'N/A'}</span></div>
                                                        <div>Finals: <span className={getGradeColor(grade.finals)}>{grade.finals || 'N/A'}</span></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-lg font-bold ${getGradeColor(average)}`}>
                                                        {average}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(grade.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedGrades([grade.id]);
                                                                handleBulkAction('approve');
                                                            }}
                                                            className="text-green-600 hover:text-green-900 p-1 rounded"
                                                            title="Approve"
                                                        >
                                                            <FaCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedGrades([grade.id]);
                                                                handleBulkAction('reject');
                                                            }}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded"
                                                            title="Reject"
                                                        >
                                                            <FaTimes className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredGrades.length === 0 && (
                            <div className="text-center py-12">
                                <FaBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending grades</h3>
                                <p className="text-gray-600">
                                    {searchTerm || filterSubject || filterFaculty 
                                        ? 'Try adjusting your search terms or filters' 
                                        : 'All grades have been reviewed'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Action Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {bulkAction === 'approve' ? 'Approve Grades' : 'Reject Grades'}
                                </h3>
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        You are about to {bulkAction} {selectedGrades.length} grade record(s).
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remarks {bulkAction === 'reject' ? '(Required)' : '(Optional)'}
                                    </label>
                                    <textarea
                                        value={bulkRemarks}
                                        onChange={(e) => setBulkRemarks(e.target.value)}
                                        placeholder={`Enter remarks for ${bulkAction}...`}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required={bulkAction === 'reject'}
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitBulkAction}
                                    disabled={loading || (bulkAction === 'reject' && !bulkRemarks.trim())}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                                        bulkAction === 'approve' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {loading ? 'Processing...' : `${bulkAction === 'approve' ? 'Approve' : 'Reject'} Grades`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
