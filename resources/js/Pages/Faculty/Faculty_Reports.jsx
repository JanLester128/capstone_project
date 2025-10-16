import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaChartBar, 
    FaDownload, 
    FaFileExcel,
    FaFilePdf,
    FaUsers,
    FaGraduationCap,
    FaBook,
    FaCalendarAlt,
    FaFilter,
    FaSearch,
    FaSpinner
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Faculty_Reports({ 
    filterOptions = {}, 
    activeSchoolYear = {},
    totalClasses = 0,
    totalSubjects = 0,
    totalSections = 0,
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedReport, setSelectedReport] = useState('students');
    const [filters, setFilters] = useState({
        subject_id: '',
        section_id: '',
        semester: '',
        quarter: ''
    });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const reportTypes = [
        {
            id: 'students',
            title: 'Student List Report',
            description: 'List of students in your classes by subject and section',
            icon: FaUsers,
            color: 'bg-blue-500'
        },
        {
            id: 'grades',
            title: 'Grades Report',
            description: 'Student grades by subject, section, and semester',
            icon: FaGraduationCap,
            color: 'bg-green-500'
        }
    ];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const generateReport = async (format = 'json') => {
        setLoading(true);
        
        try {
            const endpoint = selectedReport === 'students' 
                ? '/faculty/reports/students' 
                : '/faculty/reports/grades';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    ...filters,
                    format: format
                })
            });

            if (format === 'excel') {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                Swal.fire({
                    title: 'Success!',
                    text: 'Report downloaded successfully.',
                    icon: 'success'
                });
            } else {
                const data = await response.json();
                
                if (data.success) {
                    setReportData(data);
                    
                    if (format === 'json') {
                        Swal.fire({
                            title: 'Report Generated!',
                            text: `Found ${data.total} records.`,
                            icon: 'success'
                        });
                    }
                } else {
                    throw new Error(data.message || 'Failed to generate report');
                }
            }
        } catch (error) {
            console.error('Error generating report:', error);
            Swal.fire({
                title: 'Error',
                text: error.message || 'Failed to generate report. Please try again.',
                icon: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderReportData = () => {
        if (!reportData || !reportData.data) return null;

        if (selectedReport === 'students') {
            return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Student List</h3>
                        <p className="text-sm text-gray-600">Total: {reportData.total} students</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reportData.data.map((student, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {student.firstname} {student.lastname}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.lrn || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.subject_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.section_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.contact_number || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (selectedReport === 'grades') {
            return (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-blue-600">{reportData.summary.total_grades}</div>
                                <div className="text-sm text-gray-600">Total Grades</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-green-600">{reportData.summary.approved}</div>
                                <div className="text-sm text-gray-600">Approved</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-yellow-600">{reportData.summary.pending}</div>
                                <div className="text-sm text-gray-600">Pending</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-purple-600">
                                    {reportData.summary.average_grade ? reportData.summary.average_grade.toFixed(1) : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Average Grade</div>
                            </div>
                        </div>
                    )}

                    {/* Grades Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Grades Report</h3>
                            <p className="text-sm text-gray-600">Total: {reportData.total} grade records</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q1</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q2</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sem Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportData.data.map((grade, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {grade.student_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grade.student_lrn}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grade.subject_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    grade.semester === '1st' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {grade.semester}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grade.first_quarter || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grade.second_quarter || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className={`${
                                                    grade.semester_grade >= 90 ? 'text-green-600' :
                                                    grade.semester_grade >= 80 ? 'text-blue-600' :
                                                    grade.semester_grade >= 75 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                    {grade.semester_grade || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    grade.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    grade.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {grade.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Faculty Reports - Error" />
                <Faculty_Sidebar onToggle={handleSidebarToggle} />
                
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
            <Head title="Faculty Reports" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaChartBar className="mr-3 text-blue-600" />
                                Faculty Reports
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Generate reports for your classes and students - {activeSchoolYear?.year_name}
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Your Classes</p>
                                <p className="font-semibold text-blue-600">{totalClasses}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Subjects</p>
                                <p className="font-semibold text-green-600">{totalSubjects}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Sections</p>
                                <p className="font-semibold text-purple-600">{totalSections}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Report Type Selection */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reportTypes.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedReport(report.id)}
                                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                                        selectedReport === report.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center mb-3">
                                        <div className={`${report.color} rounded-lg p-2 mr-3`}>
                                            <report.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 text-left">
                                            {report.title}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 text-left">
                                        {report.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaFilter className="w-5 h-5 mr-2" />
                                Report Filters
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject
                                </label>
                                <select
                                    value={filters.subject_id}
                                    onChange={(e) => handleFilterChange('subject_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Subjects</option>
                                    {filterOptions.subjects?.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name} ({subject.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Section
                                </label>
                                <select
                                    value={filters.section_id}
                                    onChange={(e) => handleFilterChange('section_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Sections</option>
                                    {filterOptions.sections?.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.name} {section.strand && `(${section.strand})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedReport === 'grades' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Semester
                                        </label>
                                        <select
                                            value={filters.semester}
                                            onChange={(e) => handleFilterChange('semester', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">All Semesters</option>
                                            <option value="1st">1st Semester</option>
                                            <option value="2nd">2nd Semester</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quarter
                                        </label>
                                        <select
                                            value={filters.quarter}
                                            onChange={(e) => handleFilterChange('quarter', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">All Quarters</option>
                                            <option value="1st">1st Quarter</option>
                                            <option value="2nd">2nd Quarter</option>
                                            <option value="3rd">3rd Quarter</option>
                                            <option value="4th">4th Quarter</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex space-x-3">
                            <button
                                onClick={() => generateReport('json')}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                            >
                                {loading ? <FaSpinner className="animate-spin mr-2" /> : <FaSearch className="mr-2" />}
                                Generate Report
                            </button>
                            <button
                                onClick={() => generateReport('excel')}
                                disabled={loading}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                            >
                                <FaFileExcel className="mr-2" />
                                Export Excel
                            </button>
                        </div>
                    </div>

                    {/* Report Results */}
                    {renderReportData()}
                </div>
            </div>
        </div>
    );
}
