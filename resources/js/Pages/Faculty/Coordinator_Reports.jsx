import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaChartBar, 
    FaDownload, 
    FaFileExcel,
    FaUsers,
    FaGraduationCap,
    FaSchool,
    FaCalendarAlt,
    FaFilter,
    FaSearch,
    FaSpinner
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Coordinator_Reports({ 
    filterOptions = {}, 
    activeSchoolYear = {},
    stats = {},
    error = null 
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedReport, setSelectedReport] = useState('enrolled_students');
    const [filters, setFilters] = useState({
        strand_id: '',
        section_id: '',
        school_year_id: activeSchoolYear?.id || '',
        grade_level: ''
    });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    const reportTypes = [
        {
            id: 'enrolled_students',
            title: 'Enrolled Students Report',
            description: 'Complete list of enrolled students with details',
            icon: FaUsers,
            color: 'bg-blue-500'
        },
        {
            id: 'students_by_strand',
            title: 'Students by Strand',
            description: 'Students grouped by academic strand',
            icon: FaGraduationCap,
            color: 'bg-green-500'
        },
        {
            id: 'students_by_section',
            title: 'Students by Section',
            description: 'Students grouped by section with capacity info',
            icon: FaSchool,
            color: 'bg-purple-500'
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
            let endpoint = '';
            switch (selectedReport) {
                case 'enrolled_students':
                    endpoint = '/faculty/coordinator-reports/enrolled-students';
                    break;
                case 'students_by_strand':
                    endpoint = '/faculty/coordinator-reports/students-by-strand';
                    break;
                case 'students_by_section':
                    endpoint = '/faculty/coordinator-reports/students-by-section';
                    break;
            }

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
                    
                    Swal.fire({
                        title: 'Report Generated!',
                        text: `Found ${data.total} records.`,
                        icon: 'success'
                    });
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

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {reportTypes.find(r => r.id === selectedReport)?.title}
                    </h3>
                    <p className="text-sm text-gray-600">Total: {reportData.total} records</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strand</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade Level</th>
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
                                        {student.section_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {student.strand_name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.grade_level || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Head title="Coordinator Reports - Error" />
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
            <Head title="Coordinator Reports" />
            <Faculty_Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FaChartBar className="mr-3 text-blue-600" />
                                Coordinator Reports
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Generate enrollment reports by strand and section - {activeSchoolYear?.year_start}-{activeSchoolYear?.year_end}
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Total Enrolled</p>
                                <p className="font-semibold text-blue-600">{stats.total_enrolled || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Report Type Selection */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    School Year
                                </label>
                                <select
                                    value={filters.school_year_id}
                                    onChange={(e) => handleFilterChange('school_year_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All School Years</option>
                                    {filterOptions.schoolYears?.map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.year_start}-{year.year_end}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Strand
                                </label>
                                <select
                                    value={filters.strand_id}
                                    onChange={(e) => handleFilterChange('strand_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Strands</option>
                                    {filterOptions.strands?.map(strand => (
                                        <option key={strand.id} value={strand.id}>
                                            {strand.name} ({strand.code})
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
                                            {section.section_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Grade Level
                                </label>
                                <select
                                    value={filters.grade_level}
                                    onChange={(e) => handleFilterChange('grade_level', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Grade Levels</option>
                                    <option value="Grade 11">Grade 11</option>
                                    <option value="Grade 12">Grade 12</option>
                                </select>
                            </div>
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
