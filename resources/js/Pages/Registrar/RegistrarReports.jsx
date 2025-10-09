import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
    FaUsers, 
    FaGraduationCap, 
    FaFileExport, 
    FaFilePdf, 
    FaFileExcel, 
    FaFilter,
    FaSearch,
    FaDownload,
    FaEye,
    FaSpinner,
    FaChartBar,
    FaCalendarAlt,
    FaSchool,
    FaUserGraduate,
    FaClipboardList
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const RegistrarReports = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('students');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        schoolYear: '',
        semester: '',
        section: '',
        strand: '',
        faculty: '',
        gradeLevel: ''
    });

    // Data states
    const [schoolYears, setSchoolYears] = useState([]);
    const [sections, setSections] = useState([]);
    const [strands, setStrands] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [statistics, setStatistics] = useState({});

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch filter options on component mount
    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // Auto-generate initial report to show all students
    useEffect(() => {
        // Generate report after component is fully loaded
        const timer = setTimeout(() => {
            generateReport();
        }, 500);
        
        return () => clearTimeout(timer);
    }, []);

    const fetchFilterOptions = async () => {
        try {
            setLoading(true);
            const response = await fetch('/registrar/reports/filter-options');
            const data = await response.json();
            
            setSchoolYears(data.schoolYears || []);
            setSections(data.sections || []);
            setStrands(data.strands || []);
            setFaculty(data.faculty || []);
        } catch (error) {
            console.error('Error fetching filter options:', error);
            Swal.fire('Error', 'Failed to load filter options', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const generateReport = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                ...filters,
                search: searchTerm,
                type: activeTab
            });

            const response = await fetch(`/registrar/reports/generate?${queryParams}`);
            const data = await response.json();
            
            console.log('Report generation response:', data);
            
            if (data.success) {
                setReportData(data.data || []);
                setStatistics(data.statistics || {});
                console.log('Report data set:', data.data?.length || 0, 'students');
            } else {
                console.error('Report generation failed:', data.message);
                Swal.fire('Error', data.message || 'Failed to generate report', 'error');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            Swal.fire('Error', 'Failed to generate report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportReport = async (format) => {
        try {
            setExporting(true);
            const queryParams = new URLSearchParams({
                ...filters,
                search: searchTerm,
                type: activeTab,
                format: format
            });

            const response = await fetch(`/registrar/reports/export?${queryParams}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                Swal.fire('Success', `Report exported as ${format.toUpperCase()}`, 'success');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            Swal.fire('Error', 'Failed to export report', 'error');
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            schoolYear: '',
            semester: '',
            section: '',
            strand: '',
            faculty: '',
            gradeLevel: ''
        });
        setSearchTerm('');
        setReportData([]);
        setStatistics({});
    };

    const tabs = [
        {
            id: 'students',
            label: 'Student List',
            icon: FaUsers,
            description: 'Generate student enrollment reports'
        },
        {
            id: 'grades',
            label: 'Grades Report',
            icon: FaGraduationCap,
            description: 'Generate student grades reports'
        }
    ];

    const renderFilters = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                <button
                    onClick={clearFilters}
                    className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Clear All
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                {/* School Year Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        School Year
                    </label>
                    <select
                        value={filters.schoolYear}
                        onChange={(e) => handleFilterChange('schoolYear', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All School Years</option>
                        {schoolYears.map(sy => (
                            <option key={sy.id} value={sy.id}>
                                {sy.year_start}-{sy.year_end} ({sy.semester})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Semester Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                {/* Section Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section
                    </label>
                    <select
                        value={filters.section}
                        onChange={(e) => handleFilterChange('section', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Sections</option>
                        {sections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.section_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Strand Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Strand
                    </label>
                    <select
                        value={filters.strand}
                        onChange={(e) => handleFilterChange('strand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Strands</option>
                        {strands.map(strand => (
                            <option key={strand.id} value={strand.id}>
                                {strand.code} - {strand.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Faculty Filter (for grades report) */}
                {activeTab === 'grades' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Faculty
                        </label>
                        <select
                            value={filters.faculty}
                            onChange={(e) => handleFilterChange('faculty', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Faculty</option>
                            {faculty.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.firstname} {f.lastname}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Grade Level Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade Level
                    </label>
                    <select
                        value={filters.gradeLevel}
                        onChange={(e) => handleFilterChange('gradeLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Grades</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                    </select>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students, subjects, or faculty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                    Generate Report
                </button>
                <button
                    onClick={() => window.open('/test-registrar-reports', '_blank')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                    Test Backend
                </button>
            </div>
        </div>
    );

    const renderStatistics = () => {
        if (!statistics || Object.keys(statistics).length === 0) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {Object.entries(statistics).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FaChartBar className="text-blue-600 text-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderStudentReport = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Student List Report</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportReport('pdf')}
                            disabled={exporting || reportData.length === 0}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaFilePdf />
                            PDF
                        </button>
                        <button
                            onClick={() => exportReport('xlsx')}
                            disabled={exporting || reportData.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaFileExcel />
                            Excel
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                {reportData.length > 0 ? (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Grade Level
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Section
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Strand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    School Year
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((student, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {student.firstname} {student.lastname}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {student.email}
                                        </div>
                                        {student.previous_school && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                From: {student.previous_school}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            student.student_type === 'transferee' 
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {student.student_type === 'transferee' ? 'Transferee' : 'Regular'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        Grade {student.grade_level}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.section_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.strand_code} - {student.strand_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.school_year}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            student.status === 'enrolled' 
                                                ? 'bg-green-100 text-green-800'
                                                : student.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-500">No student data found. Apply filters and generate report.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderGradesReport = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Grades Report</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportReport('pdf')}
                            disabled={exporting || reportData.length === 0}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaFilePdf />
                            PDF
                        </button>
                        <button
                            onClick={() => exportReport('xlsx')}
                            disabled={exporting || reportData.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaFileExcel />
                            Excel
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                {reportData.length > 0 ? (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subject
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    1st Sem AVG
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    2nd Sem AVG
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Final Grade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Remarks
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((grade, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {grade.student_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {grade.section_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {grade.subject_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {grade.first_sem_avg || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {grade.second_sem_avg || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-semibold ${
                                            grade.final_grade >= 75 
                                                ? 'text-green-600' 
                                                : 'text-red-600'
                                        }`}>
                                            {grade.final_grade || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                grade.grade_source === 'Regular' 
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : grade.grade_source === 'Transferee Credit'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-orange-100 text-orange-800'
                                            }`}>
                                                {grade.grade_source}
                                            </span>
                                        </div>
                                        {grade.previous_school && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                From: {grade.previous_school}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {grade.remarks || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <FaGraduationCap className="mx-auto text-4xl text-gray-400 mb-4" />
                        <p className="text-gray-500">No grades data found. Apply filters and generate report.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Reports - ONSTS" />
            
            <Sidebar onToggle={setSidebarCollapsed} />
            
            <div className={`transition-all duration-300 ${
                sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <FaChartBar className="text-white text-xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                                <p className="text-gray-600">Generate and export student and academic reports</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 mb-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <Icon className="text-lg" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters */}
                    {renderFilters()}

                    {/* Statistics */}
                    {renderStatistics()}

                    {/* Report Content */}
                    {activeTab === 'students' && renderStudentReport()}
                    {activeTab === 'grades' && renderGradesReport()}
                </div>
            </div>
        </div>
    );
};

export default RegistrarReports;
