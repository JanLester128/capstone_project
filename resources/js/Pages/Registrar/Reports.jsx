import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { 
    FaChartBar, 
    FaDownload, 
    FaFileExcel,
    FaFilePdf,
    FaUsers,
    FaGraduationCap,
    FaChalkboardTeacher,
    FaSchool,
    FaCalendarAlt,
    FaFilter,
    FaSearch,
    FaSpinner,
    FaTrophy,
    FaExclamationTriangle,
    FaClock,
    FaArrowUp,
    FaInfoCircle,
    FaChartArea
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import Sidebar from '../layouts/Sidebar';

export default function RegistrarReports({ reports, activeSchoolYear, filterOptions = {} }) {
    const [selectedReport, setSelectedReport] = useState('enrolled_students');
    const [filters, setFilters] = useState({
        strand_id: '',
        section_id: '',
        school_year_id: activeSchoolYear?.id || '',
        semester: activeSchoolYear?.semester || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [fetchingAnalytics, setFetchingAnalytics] = useState(false);

    // Fetch comprehensive enrollment analytics
    const fetchEnrollmentAnalytics = async () => {
        if (selectedReport !== 'enrolled_students') return;
        
        setFetchingAnalytics(true);
        try {
            const response = await fetch('/registrar/reports/enrollment-analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    school_year_id: filters.school_year_id || '',
                    strand_id: filters.strand_id || '',
                    section_id: filters.section_id || '',
                    include_trends: true,
                    include_demographics: true
                })
            });

            if (response.ok) {
                const analytics = await response.json();
                setAnalyticsData(analytics);
                console.log('Analytics data fetched:', analytics);
            } else {
                console.warn('Failed to fetch analytics data');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setFetchingAnalytics(false);
        }
    };

    // Auto-fetch analytics when enrolled students report is selected
    useEffect(() => {
        if (selectedReport === 'enrolled_students' && reportData) {
            fetchEnrollmentAnalytics();
        }
    }, [selectedReport, reportData, filters.school_year_id]);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });

    // Simplified report types - only essential reports
    const reportTypes = [
        {
            id: 'enrolled_students',
            title: 'Enrolled Students Report',
            description: 'List of enrolled students filtered by strand, section, year, and semester',
            icon: FaUsers,
            color: 'bg-blue-500',
            filters: ['strand', 'section', 'year', 'semester']
        },
        {
            id: 'grades',
            title: 'Grades Report',
            description: 'Student grades filtered by strand, section, year, and semester',
            icon: FaGraduationCap,
            color: 'bg-green-500',
            filters: ['strand', 'section', 'year', 'semester']
        }
    ];

    const handleFilterChange = (key, value) => {
        console.log(`Filter changed: ${key} = ${value}`);
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [key]: value
            };
            console.log('Updated filters:', newFilters);
            return newFilters;
        });
    };

    const generateReport = async (format = 'json') => {
        setLoading(true);
        
        try {
            let endpoint = '';
            switch (selectedReport) {
                case 'enrolled_students':
                case 'students':
                    endpoint = '/registrar/reports/students';
                    break;
                case 'grades':
                    endpoint = '/registrar/reports/grades';
                    break;
                default:
                    endpoint = `/registrar/reports/export/${selectedReport}`;
            }

            // Simplified request data with only essential filters
            const requestData = {
                format: format,
                report_type: selectedReport,
                strand_id: filters.strand_id || '',
                section_id: filters.section_id || '',
                school_year_id: filters.school_year_id || '',
                semester: filters.semester || '',
                // Include all enrollment statuses for comprehensive analytics
                ...(selectedReport === 'enrolled_students' && { 
                    enrollment_status: '', // Fetch all statuses for analytics
                    include_analytics: true,
                    fetch_all_statuses: true
                }),
                // Include grade filters for grades reports
                ...(selectedReport === 'grades' && {
                    grade_status: filters.grade_status || '',
                    grade_threshold: filters.grade_threshold || 75
                })
            };

            console.log('Generating report with data:', {
                endpoint,
                selectedReport,
                requestData,
                filters: filters
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify(requestData)
            });

            if (format === 'excel') {
                // Handle Excel file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                Swal.fire({
                    title: 'Success!',
                    text: 'Excel report downloaded successfully.',
                    icon: 'success',
                    confirmButtonColor: '#10B981'
                });
            } else if (format === 'pdf') {
                // Handle PDF by opening HTML in new window for printing
                const htmlContent = await response.text();
                const printWindow = window.open('', '_blank');
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                Swal.fire({
                    title: 'PDF Report Ready!',
                    text: 'The report has opened in a new window. Use your browser\'s print function to save as PDF.',
                    icon: 'info',
                    confirmButtonColor: '#10B981'
                });
            } else {
                if (response.ok) {
                    const data = await response.json();
                    console.log('Report response received:', {
                        success: data.success,
                        total: data.total,
                        dataLength: data.data?.length,
                        summary: data.summary,
                        sampleData: data.data?.slice(0, 2) // First 2 records for debugging
                    });
                    
                    if (data.success) {
                        setReportData(data);
                        
                        if (format === 'json') {
                            Swal.fire({
                                title: 'Report Generated!',
                                text: `Found ${data.total || 0} records.`,
                                icon: data.total > 0 ? 'success' : 'info',
                                confirmButtonColor: '#10B981'
                            });
                        }
                    } else {
                        throw new Error(data.message || 'Failed to generate report');
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Report generation failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorText: errorText
                    });
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
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

    const handleExport = (format) => {
        generateReport(format);
    };

    const renderEnrollmentReport = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-blue-500 rounded-lg p-3 mr-4">
                            <FaUsers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.enrollment_by_strand?.reduce((sum, strand) => sum + strand.total, 0) || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-green-500 rounded-lg p-3 mr-4">
                            <FaGraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Approved</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.enrollment_by_strand?.reduce((sum, strand) => sum + strand.approved, 0) || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-yellow-500 rounded-lg p-3 mr-4">
                            <FaCalendarAlt className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.enrollment_by_strand?.reduce((sum, strand) => sum + strand.pending, 0) || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Enrollment by Strand</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Strand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Applications
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Approved
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pending
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Approval Rate
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports?.enrollment_by_strand?.map((strand, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {strand.code}
                                            </span>
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {strand.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {strand.total}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                        {strand.approved}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                                        {strand.pending}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {strand.total > 0 ? ((strand.approved / strand.total) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderGradeReport = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reports?.grade_approval_summary?.map((status, index) => (
                    <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className={`${
                                status.status === 'approved' ? 'bg-green-500' :
                                status.status === 'pending_registrar_approval' ? 'bg-yellow-500' : 'bg-red-500'
                            } rounded-lg p-3 mr-4`}>
                                <FaGraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    {status.status?.charAt(0).toUpperCase() + status.status?.slice(1)} Grades
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFacultyReport = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-purple-500 rounded-lg p-3 mr-4">
                            <FaChalkboardTeacher className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Faculty</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.faculty_summary?.total_faculty || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-blue-500 rounded-lg p-3 mr-4">
                            <FaUsers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Coordinators</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.faculty_summary?.coordinators || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-yellow-500 rounded-lg p-3 mr-4">
                            <FaCalendarAlt className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Password Change Required</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {reports?.faculty_summary?.password_change_required || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStrandReport = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Strand Overview</h3>
                <p className="text-gray-600">
                    Comprehensive overview of academic strands, their subjects, and enrollment statistics.
                </p>
            </div>
        </div>
    );

    const renderFacultyLoadsReport = () => {
        if (!reportData || !reportData.data) {
            return (
                <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                    <FaChalkboardTeacher className="mx-auto text-gray-300 text-5xl mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Faculty Load Data</h3>
                    <p className="text-gray-600">Generate a report to view faculty teaching assignments and workload.</p>
                </div>
            );
        }

        const facultyData = reportData.data.faculty_summary || reportData.data || [];
        
        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="bg-purple-500 rounded-lg p-3 mr-4">
                                <FaChalkboardTeacher className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Faculty</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {reportData.data.total_faculty || facultyData.length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="bg-blue-500 rounded-lg p-3 mr-4">
                                <FaUsers className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {facultyData.reduce((sum, faculty) => sum + (faculty.total_subjects || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="bg-green-500 rounded-lg p-3 mr-4">
                                <FaCalendarAlt className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Average Load</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {facultyData.length > 0 ? 
                                        (facultyData.reduce((sum, faculty) => sum + (faculty.total_subjects || 0), 0) / facultyData.length).toFixed(1) 
                                        : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Faculty Loads Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Faculty Teaching Assignments</h3>
                        <p className="text-sm text-gray-600">Complete list of faculty members and their teaching loads</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Subjects</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">1st Semester</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">2nd Semester</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {facultyData.map((faculty, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {faculty.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {faculty.email || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {faculty.total_subjects || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {faculty.subjects_by_semester?.['1st'] || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {faculty.subjects_by_semester?.['2nd'] || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {faculty.subjects && faculty.subjects.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {faculty.subjects.slice(0, 3).map((subject, idx) => (
                                                            <div key={idx} className="text-xs">
                                                                <span className="font-medium">{subject.subject_code}</span> - {subject.subject_name}
                                                                <span className="text-gray-500 ml-1">({subject.semester} Sem)</span>
                                                            </div>
                                                        ))}
                                                        {faculty.subjects.length > 3 && (
                                                            <div className="text-xs text-gray-500">
                                                                +{faculty.subjects.length - 3} more subjects
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">No subjects assigned</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderReportData = () => {
        if (!reportData || !reportData.data) return null;

        if (selectedReport === 'enrolled_students' || selectedReport === 'students') {
            // Ensure data is an array before processing
            const studentsArray = Array.isArray(reportData.data) ? reportData.data : [];
            const totalStudents = studentsArray.length;
            
            // Debug logging to see actual data structure
            console.log('Report data structure:', {
                hasData: !!reportData.data,
                isArray: Array.isArray(reportData.data),
                dataType: typeof reportData.data,
                dataLength: studentsArray.length,
                sampleStudent: studentsArray[0] || null,
                fullReportData: reportData
            });
            
            // Handle different possible status field names with safe array operations
            const enrolledCount = studentsArray.filter(student => {
                const status = student.enrollment_status || student.status || student.student_status;
                return status === 'enrolled' || status === 'approved';
            }).length;
            
            const pendingCount = studentsArray.filter(student => {
                const status = student.enrollment_status || student.status || student.student_status;
                return status === 'pending';
            }).length;
            
            const droppedCount = studentsArray.filter(student => {
                const status = student.enrollment_status || student.status || student.student_status;
                return status === 'dropped' || status === 'rejected';
            }).length;
            
            // Use backend summary as fallback if frontend counting fails
            const finalEnrolledCount = enrolledCount || reportData.summary?.enrolled_students || 0;
            const finalPendingCount = pendingCount || reportData.summary?.pending_students || 0;
            
            const approvalRate = totalStudents > 0 ? ((finalEnrolledCount / totalStudents) * 100).toFixed(1) : 0;
            
            console.log('Enrollment counts:', {
                total: totalStudents,
                enrolled: finalEnrolledCount,
                pending: finalPendingCount,
                dropped: droppedCount,
                approvalRate: approvalRate
            });

            return (
                <div className="space-y-6">
                    {/* Enhanced Summary Cards with Enrollment Counts */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center">
                                <FaUsers className="text-blue-500 text-xl mr-2" />
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
                                    <div className="text-sm text-gray-600">Total Enrollees</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center">
                                <FaGraduationCap className="text-green-500 text-xl mr-2" />
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{finalEnrolledCount}</div>
                                    <div className="text-sm text-gray-600">Approved/Enrolled</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center">
                                <FaCalendarAlt className="text-yellow-500 text-xl mr-2" />
                                <div>
                                    <div className="text-2xl font-bold text-yellow-600">{finalPendingCount}</div>
                                    <div className="text-sm text-gray-600">Pending Approval</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center">
                                <FaExclamationTriangle className="text-red-500 text-xl mr-2" />
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{droppedCount}</div>
                                    <div className="text-sm text-gray-600">Dropped</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center">
                                <FaTrophy className="text-purple-500 text-xl mr-2" />
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">{approvalRate}%</div>
                                    <div className="text-sm text-gray-600">Approval Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enrollment Analytics Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Analytics</h3>
                        
                        {/* Analytics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {/* Approval Rate Progress */}
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-700">Approval Rate</span>
                                    <span className="text-lg font-bold text-purple-900">{approvalRate}%</span>
                                </div>
                                <div className="w-full bg-purple-200 rounded-full h-2">
                                    <div 
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${approvalRate}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-purple-600 mt-1">
                                    {finalEnrolledCount} approved out of {totalStudents} total
                                </p>
                            </div>

                            {/* Pending Processing Time */}
                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-yellow-700">Pending Queue</span>
                                    <span className="text-lg font-bold text-yellow-900">{finalPendingCount}</span>
                                </div>
                                <div className="flex items-center">
                                    <FaClock className="text-yellow-600 mr-1" />
                                    <span className="text-xs text-yellow-600">
                                        {finalPendingCount > 0 ? 'Awaiting approval' : 'No pending applications'}
                                    </span>
                                </div>
                                {finalPendingCount > 0 && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                        Priority: Process {finalPendingCount} applications
                                    </p>
                                )}
                            </div>

                            {/* Enrollment Efficiency */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-green-700">Efficiency Score</span>
                                    <span className="text-lg font-bold text-green-900">
                                        {totalStudents > 0 ? Math.round((finalEnrolledCount / totalStudents) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <FaArrowUp className="text-green-600 mr-1" />
                                    <span className="text-xs text-green-600">
                                        {finalEnrolledCount > finalPendingCount ? 'High efficiency' : 'Needs attention'}
                                    </span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                    {finalEnrolledCount} successful enrollments
                                </p>
                            </div>
                        </div>

                        {/* Status Distribution Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Enrollment Status Breakdown */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3">Status Distribution</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                            <span className="text-sm text-gray-700">Approved/Enrolled</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900 mr-2">{finalEnrolledCount}</span>
                                            <span className="text-xs text-gray-500">
                                                ({totalStudents > 0 ? ((finalEnrolledCount / totalStudents) * 100).toFixed(1) : 0}%)
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                                            <span className="text-sm text-gray-700">Pending Approval</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900 mr-2">{finalPendingCount}</span>
                                            <span className="text-xs text-gray-500">
                                                ({totalStudents > 0 ? ((finalPendingCount / totalStudents) * 100).toFixed(1) : 0}%)
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {droppedCount > 0 && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                                <span className="text-sm text-gray-700">Dropped</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-sm font-medium text-gray-900 mr-2">{droppedCount}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({totalStudents > 0 ? ((droppedCount / totalStudents) * 100).toFixed(1) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Enrollment Insights */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3">Enrollment Insights</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start">
                                        <FaInfoCircle className="text-blue-500 mt-1 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {finalPendingCount > 0 ? 'Action Required' : 'All Clear'}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {finalPendingCount > 0 
                                                    ? `${finalPendingCount} applications need review and approval`
                                                    : 'No pending applications to process'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start">
                                        <FaChartArea className="text-green-500 mt-1 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">Approval Trend</p>
                                            <p className="text-xs text-gray-600">
                                                {approvalRate >= 80 
                                                    ? 'Excellent approval rate - system running smoothly'
                                                    : approvalRate >= 60 
                                                        ? 'Good approval rate - monitor pending applications'
                                                        : 'Low approval rate - review enrollment criteria'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start">
                                        <FaUsers className="text-purple-500 mt-1 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">Capacity Status</p>
                                            <p className="text-xs text-gray-600">
                                                {totalStudents < 100 
                                                    ? 'Low enrollment - consider recruitment campaigns'
                                                    : totalStudents < 500 
                                                        ? 'Moderate enrollment - good capacity utilization'
                                                        : 'High enrollment - monitor resource allocation'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Analytics - Enrollment Trends */}
                        {analyticsData && (
                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Weekly Enrollment Trend */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                        <FaArrowUp className="text-blue-500 mr-2" />
                                        Enrollment Trends
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">This Week</span>
                                            <span className="font-medium text-green-600">
                                                +{analyticsData.trends?.this_week || 0} new enrollments
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">This Month</span>
                                            <span className="font-medium text-blue-600">
                                                +{analyticsData.trends?.this_month || 0} total enrollments
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Average Processing Time</span>
                                            <span className="font-medium text-purple-600">
                                                {analyticsData.trends?.avg_processing_days || 0} days
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Strand Performance */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                        <FaGraduationCap className="text-green-500 mr-2" />
                                        Top Performing Strands
                                    </h4>
                                    <div className="space-y-2">
                                        {reportData.summary?.strand_distribution && 
                                         Object.entries(reportData.summary.strand_distribution)
                                            .sort(([,a], [,b]) => b - a)
                                            .slice(0, 3)
                                            .map(([strand, count], index) => (
                                                <div key={strand} className="flex justify-between text-sm">
                                                    <span className="text-gray-600 flex items-center">
                                                        <span className={`w-2 h-2 rounded-full mr-2 ${
                                                            index === 0 ? 'bg-gold-500' : 
                                                            index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                        }`}></span>
                                                        {strand || 'Unknown'}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{count} students</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Student List Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Student Enrollment List</h3>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-gray-600">
                                    Total: <span className="font-medium">{totalStudents}</span> enrollees | 
                                    Approved: <span className="font-medium text-green-600">{finalEnrolledCount}</span> | 
                                    Pending: <span className="font-medium text-yellow-600">{finalPendingCount}</span>
                                    {droppedCount > 0 && (
                                        <> | Dropped: <span className="font-medium text-red-600">{droppedCount}</span></>
                                    )}
                                </p>
                                <div className="text-sm text-gray-500">
                                    Approval Rate: <span className="font-medium text-purple-600">{approvalRate}%</span>
                                </div>
                            </div>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {studentsArray.length > 0 ? (
                                    studentsArray.map((student, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {(student.firstname && student.lastname) 
                                                        ? `${student.firstname} ${student.lastname}`.trim()
                                                        : student.username || 'N/A'}
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
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {student.total_classes || 0} classes
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div className="max-w-xs truncate" title={student.subjects_enrolled || 'No subjects'}>
                                                    {student.subjects_enrolled || 'No subjects enrolled'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    student.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' :
                                                    student.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {student.enrollment_status || student.student_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <FaUsers className="text-gray-300 text-4xl mb-2" />
                                                <p className="text-lg font-medium">No students found</p>
                                                <p className="text-sm">Try adjusting your filters or generate a new report</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
            );
        }

        if (selectedReport === 'grades') {
            return (
                <div className="space-y-6">
                    {/* Enhanced Summary Cards */}
                    {reportData.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaUsers className="text-blue-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-blue-600">{reportData.summary.total_students || reportData.summary.total_grades || reportData.total}</div>
                                        <div className="text-sm text-gray-600">Total Students</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaTrophy className="text-green-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">{reportData.summary.passed_students || reportData.summary.approved || 0}</div>
                                        <div className="text-sm text-gray-600">Passed</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="text-red-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-red-600">{reportData.summary.failed_students || 0}</div>
                                        <div className="text-sm text-gray-600">Failed</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaGraduationCap className="text-purple-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-purple-600">{reportData.summary.honor_students || 0}</div>
                                        <div className="text-sm text-gray-600">Honor Students</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaChartBar className="text-yellow-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {reportData.summary.passing_rate ? `${reportData.summary.passing_rate.toFixed(1)}%` : 
                                             reportData.summary.average_grade ? reportData.summary.average_grade.toFixed(1) : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {reportData.summary.passing_rate ? 'Passing Rate' : 'Average Grade'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center">
                                    <FaSchool className="text-indigo-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-2xl font-bold text-indigo-600">{reportData.summary.total_enrolled || reportData.summary.pending || 0}</div>
                                        <div className="text-sm text-gray-600">
                                            {reportData.summary.total_enrolled ? 'Enrolled' : 'Pending'}
                                        </div>
                                    </div>
                                </div>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
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
                                                {grade.subject_name} ({grade.subject_code})
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grade.faculty_name}
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

        if (selectedReport === 'faculty_loads') {
            return renderFacultyLoadsReport();
        }

        return null;
    };

    const getCurrentReport = () => {
        if (reportData) {
            return renderReportData();
        }

        switch (selectedReport) {
            case 'enrollment':
                return renderEnrollmentReport();
            case 'grades':
                return renderGradeReport();
            case 'faculty':
                return renderFacultyReport();
            case 'faculty_loads':
                return renderFacultyLoadsReport();
            case 'strands':
                return renderStrandReport();
            default:
                return renderEnrollmentReport();
        }
    };

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Reports - ONSTS" />
            <Sidebar onToggle={handleSidebarToggle} />
            
            <div className={`flex-1 transition-all duration-300 ${
                sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Reports & Analytics
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Generate and export comprehensive reports for {activeSchoolYear?.year || `${activeSchoolYear?.year_start}-${activeSchoolYear?.year_end}` || 'Current School Year'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Report Type Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaFilter className="w-5 h-5 mr-2" />
                                Report Filters
                            </h2>
                            <div className="text-sm text-gray-600">
                                {Object.values(filters).filter(value => value !== '').length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                        {Object.values(filters).filter(value => value !== '').length} filters active
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Simplified Filters - Only Essential Ones */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* School Year Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaCalendarAlt className="inline mr-1" />
                                    School Year
                                </label>
                                <select 
                                    value={filters.school_year_id}
                                    onChange={(e) => handleFilterChange('school_year_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All School Years</option>
                                    <option value={activeSchoolYear?.id}>
                                        {activeSchoolYear?.year || `${activeSchoolYear?.year_start}-${activeSchoolYear?.year_end}` || 'Current School Year'}
                                    </option>
                                    {filterOptions.schoolYears?.map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.year || `${year.year_start}-${year.year_end}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Semester Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaCalendarAlt className="inline mr-1" />
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

                            {/* Strand Filter - Show only for enrolled students and grades reports */}
                            {(selectedReport === 'enrolled_students' || selectedReport === 'grades') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaSchool className="inline mr-1" />
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
                            )}

                            {/* Section Filter - Show only for enrolled students and grades reports */}
                            {(selectedReport === 'enrolled_students' || selectedReport === 'grades') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaUsers className="inline mr-1" />
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
                            )}

                            {/* Grade Status Filter - Show only for grades reports */}
                            {selectedReport === 'grades' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaGraduationCap className="inline mr-1" />
                                        Grade Status
                                    </label>
                                    <select
                                        value={filters.grade_status || ''}
                                        onChange={(e) => handleFilterChange('grade_status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Grades</option>
                                        <option value="passed">Passed</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                            )}

                            {/* Grade Threshold - Show when grade status is selected */}
                            {selectedReport === 'grades' && filters.grade_status && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Grade Threshold
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={filters.grade_threshold || 75}
                                        onChange={(e) => handleFilterChange('grade_threshold', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="75"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default: 75 (grades ≥75 are considered passed)
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Active Filters Display */}
                        {Object.entries(filters).some(([key, value]) => value !== '') && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">Active Filters:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(filters).map(([key, value]) => {
                                        if (value === '') return null;
                                        
                                        let displayValue = value;
                                        let displayKey = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        
                                        // Format specific filter values for better display
                                        if (key === 'school_year_id' && filterOptions.schoolYears) {
                                            const year = filterOptions.schoolYears.find(y => y.id == value);
                                            displayValue = year ? (year.year || `${year.year_start}-${year.year_end}`) : value;
                                        } else if (key === 'strand_id' && filterOptions.strands) {
                                            const strand = filterOptions.strands.find(s => s.id == value);
                                            displayValue = strand ? `${strand.name} (${strand.code})` : value;
                                        } else if (key === 'section_id' && filterOptions.sections) {
                                            const section = filterOptions.sections.find(s => s.id == value);
                                            displayValue = section ? section.section_name : value;
                                        } else if (key === 'subject_id' && filterOptions.subjects) {
                                            const subject = filterOptions.subjects.find(s => s.id == value);
                                            displayValue = subject ? `${subject.name} (${subject.code})` : value;
                                        }
                                        
                                        return (
                                            <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {displayKey}: {displayValue}
                                                <button
                                                    onClick={() => handleFilterChange(key, '')}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                    title={`Remove ${displayKey} filter`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={() => generateReport('json')}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                            >
                                {loading ? (
                                    <FaSpinner className="animate-spin mr-2" />
                                ) : (
                                    <FaSearch className="mr-2" />
                                )}
                                Generate Report
                            </button>
                            
                            <button
                                onClick={() => handleExport('excel')}
                                disabled={loading}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                            >
                                <FaFileExcel className="mr-2" />
                                Export Excel
                            </button>
                            
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={loading}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                            >
                                <FaFilePdf className="mr-2" />
                                Export PDF
                            </button>

                            <button
                                onClick={() => {
                                    setFilters({
                                        section_id: '',
                                        strand_id: '',
                                        subject_id: '',
                                        faculty_id: '',
                                        semester: '',
                                        school_year_id: '',
                                        grade_status: '',
                                        enrollment_status: '',
                                        date_range: 'current_semester',
                                        grade_threshold: 75
                                    });
                                    setReportData(null);
                                    setDateRange('current');
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                            >
                                <FaFilter className="mr-2" />
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FaChartBar className="w-5 h-5 mr-2" />
                                {reportTypes.find(r => r.id === selectedReport)?.title}
                            </h2>
                            <div className="text-sm text-gray-500">
                                Generated on {new Date().toLocaleDateString()}
                            </div>
                        </div>

                        {getCurrentReport()}
                    </div>
                </div>
            </div>
        </div>
    );
}
