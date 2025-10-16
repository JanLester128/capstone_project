import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaSearch,
    FaUserGraduate,
    FaPrint,
    FaEye,
    FaFilter,
    FaDownload,
    FaFileAlt,
    FaUsers,
    FaGraduationCap,
    FaSchool,
    FaCalendarAlt,
    FaSpinner
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function EnrolledStudents({ enrolledStudents = [], sections = [], strands = [], schoolYear = null, debug = null }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterStrand, setFilterStrand] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [loading, setLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Filter enrolled students based on search and filters
    const filteredStudents = enrolledStudents.filter(student => {
        const matchesSearch = student.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.student_id?.toString().includes(searchTerm);
        
        const matchesSection = !filterSection || student.section_id == filterSection;
        const matchesStrand = !filterStrand || student.strand_id == filterStrand;
        const matchesGrade = !filterGrade || student.grade_level === filterGrade;
        
        return matchesSearch && matchesSection && matchesStrand && matchesGrade;
    });

    // Handle sidebar collapse
    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
        localStorage.setItem('registrar-sidebar-collapsed', JSON.stringify(collapsed));
    };

    // Handle individual student selection
    const handleStudentSelect = (studentId) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map(student => student.id));
        }
        setSelectAll(!selectAll);
    };

    // Update select all state when filtered students change
    useEffect(() => {
        const allSelected = filteredStudents.length > 0 && 
                           filteredStudents.every(student => selectedStudents.includes(student.id));
        setSelectAll(allSelected);
    }, [selectedStudents, filteredStudents]);

    // Handle viewing individual COR
    const handleViewCOR = async (student) => {
        setLoading(true);
        
        try {
            const response = await fetch(`/registrar/enrollments/${student.enrollment_id}/cor-preview`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const corHtml = generateCORHTML(data.cor, data.schedule, student, data.schoolYear);
                
                await Swal.fire({
                    title: `Certificate of Registration - ${student.firstname} ${student.lastname}`,
                    html: corHtml,
                    width: '90%',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-print"></i> Print COR',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#3b82f6',
                    cancelButtonColor: '#6b7280',
                    customClass: {
                        container: 'cor-modal',
                        popup: 'cor-popup'
                    },
                    preConfirm: () => {
                        printCOR(corHtml, `${student.firstname} ${student.lastname}`);
                        return false;
                    }
                });
            } else {
                throw new Error(data.message || 'Failed to load COR data');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error Loading COR',
                text: error.message || 'Unable to load Certificate of Registration.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle bulk COR printing
    const handleBulkPrint = async () => {
        if (selectedStudents.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Students Selected',
                text: 'Please select at least one student to print CORs.'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Bulk Print CORs',
            text: `Are you sure you want to print CORs for ${selectedStudents.length} selected students?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Print All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3b82f6'
        });

        if (result.isConfirmed) {
            setLoading(true);
            
            try {
                for (const studentId of selectedStudents) {
                    const student = enrolledStudents.find(s => s.id === studentId);
                    if (student) {
                        await printStudentCOR(student);
                        // Add small delay between prints
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                Swal.fire({
                    icon: 'success',
                    title: 'Bulk Print Complete',
                    text: `Successfully printed CORs for ${selectedStudents.length} students.`
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Bulk Print Error',
                    text: 'Some CORs may not have been printed successfully.'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Print individual student COR
    const printStudentCOR = async (student) => {
        const response = await fetch(`/registrar/enrollments/${student.enrollment_id}/cor-preview`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        });

        const data = await response.json();
        if (response.ok && data.success) {
            const corHtml = generateCORHTML(data.cor, data.schedule, student, data.schoolYear);
            printCOR(corHtml, `${student.firstname} ${student.lastname}`);
        }
    };

    // Generate COR HTML (reusing from Enrollment.jsx)
    const generateCORHTML = (cor, schedule, student, schoolYear) => {
        return `
            <style>
                @media print {
                    body { margin: 0; }
                    .cor-container { 
                        margin: 0; 
                        padding: 15px; 
                        font-size: 12px;
                        page-break-after: always;
                    }
                }
                .cor-container {
                    font-family: Arial, sans-serif;
                    line-height: 1.2;
                    color: #000;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                }
                .cor-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: #1e40af;
                    color: white;
                    border-radius: 8px;
                }
                .school-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    margin-bottom: 15px;
                }
                .school-info img {
                    width: 60px;
                    height: 60px;
                }
                .school-text h1 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: bold;
                }
                .school-text p {
                    margin: 2px 0;
                    font-size: 12px;
                }
                .document-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 15px 0;
                }
                .academic-info {
                    font-size: 14px;
                    margin-top: 10px;
                }
                .student-info {
                    margin: 30px 0;
                    padding: 20px;
                    border: 2px solid #1e40af;
                    border-radius: 8px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .info-label {
                    font-weight: bold;
                    color: #374151;
                }
                .info-value {
                    color: #1f2937;
                }
                .subjects-section {
                    margin: 30px 0;
                }
                .subjects-section h3 {
                    color: #1e40af;
                    font-size: 16px;
                    margin-bottom: 15px;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #1e40af;
                }
                .subjects-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .subjects-table th,
                .subjects-table td {
                    border: 1px solid #d1d5db;
                    padding: 8px 12px;
                    text-align: left;
                }
                .subjects-table th {
                    background-color: #1e40af;
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                }
                .subjects-table td {
                    font-size: 11px;
                }
                .subjects-table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                .footer-section {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #1e40af;
                }
                .signature-area {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }
                .signature-box {
                    text-align: center;
                    width: 200px;
                }
                .signature-line {
                    border-bottom: 1px solid #000;
                    margin-bottom: 5px;
                    height: 40px;
                }
                .signature-label {
                    font-size: 12px;
                    font-weight: bold;
                    color: #374151;
                }
                .document-info {
                    text-align: center;
                    font-size: 10px;
                    color: #6b7280;
                }
                .document-info p {
                    margin: 3px 0;
                }
            </style>
            <div class="cor-container">
                <div class="cor-header">
                    <div class="school-info">
                        <img src="/onsts.png" alt="ONSTS Logo" />
                        <div class="school-text">
                            <h1>OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</h1>
                            <p>Senior High School Department</p>
                            <p>Opol, Misamis Oriental</p>
                        </div>
                    </div>
                    <div class="document-title">Certificate of Registration</div>
                    <div class="academic-info">
                        <div>School Year: ${schoolYear?.year_start || 'N/A'} - ${schoolYear?.year_end || 'N/A'}</div>
                        <div>Semester: ${schoolYear?.semester || 'N/A'}</div>
                    </div>
                </div>

                <div class="student-info">
                    <h3>STUDENT INFORMATION</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-label">Student ID:</div>
                            <div class="info-value">${student.student_id || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Name:</div>
                            <div class="info-value">${student.firstname} ${student.lastname}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Grade Level:</div>
                            <div class="info-value">${student.grade_level || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Strand:</div>
                            <div class="info-value">${student.strand_name || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Section:</div>
                            <div class="info-value">${student.section_name || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Status:</div>
                            <div class="info-value">OFFICIALLY ENROLLED</div>
                        </div>
                    </div>
                </div>

                <div class="subjects-section">
                    <h3>ENROLLED SUBJECTS</h3>
                    <table class="subjects-table">
                        <thead>
                            <tr>
                                <th>Subject Code</th>
                                <th>Subject Name</th>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Room</th>
                                <th>Faculty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${schedule && schedule.length > 0 ? 
                                schedule.map(subject => `
                                    <tr>
                                        <td>${subject.subject_code || 'N/A'}</td>
                                        <td>${subject.subject_name || 'N/A'}</td>
                                        <td>${subject.day_of_week || 'N/A'}</td>
                                        <td>${subject.start_time && subject.end_time ? 
                                            `${subject.start_time} - ${subject.end_time}` : 'N/A'}</td>
                                        <td>${subject.room || 'N/A'}</td>
                                        <td>${subject.faculty_name || 'N/A'}</td>
                                    </tr>
                                `).join('') : 
                                '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #6b7280;">No subjects enrolled</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>

                <div class="footer-section">
                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">Student Signature</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">Registrar</div>
                        </div>
                    </div>
                    <div class="document-info">
                        <p>Date Generated: ${new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</p>
                        <p>This is an official Certificate of Registration</p>
                        <p>For verification, contact the Registrar's Office</p>
                    </div>
                </div>
            </div>
        `;
    };

    // Print COR function
    const printCOR = (corHtml, studentName) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificate of Registration - ${studentName}</title>
            </head>
            <body>
                ${corHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    // Get statistics
    const getStats = () => {
        const totalEnrolled = enrolledStudents.length;
        
        // Debug: Log the actual grade_level values
        console.log('Enrolled Students Data:', enrolledStudents.map(s => ({
            name: s.firstname + ' ' + s.lastname,
            grade_level: s.grade_level,
            grade_level_type: typeof s.grade_level
        })));
        
        // Count based on intended_grade_level (which comes as grade_level)
        const grade11Count = enrolledStudents.filter(s => 
            s.grade_level === 11 || 
            s.grade_level === '11' ||
            String(s.grade_level) === '11'
        ).length;
        
        const grade12Count = enrolledStudents.filter(s => 
            s.grade_level === 12 || 
            s.grade_level === '12' ||
            String(s.grade_level) === '12'
        ).length;
        
        const strandsCount = [...new Set(enrolledStudents.map(s => s.strand_id))].length;
        
        console.log('Grade Counts:', { grade11Count, grade12Count, totalEnrolled });
        
        return { totalEnrolled, grade11Count, grade12Count, strandsCount };
    };

    const stats = getStats();

    return (
        <>
            <Head title="Enrolled Students - ONSTS" />
            
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar 
                    role="registrar" 
                    collapsed={sidebarCollapsed}
                    onToggle={handleSidebarToggle}
                />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200">
                        <div className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                        <FaUserGraduate className="text-blue-600" />
                                        Enrolled Students
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Manage enrolled students and print Certificates of Registration
                                    </p>
                                </div>
                                
                                {selectedStudents.length > 0 && (
                                    <button
                                        onClick={handleBulkPrint}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        {loading ? <FaSpinner className="animate-spin" /> : <FaPrint />}
                                        Print Selected CORs ({selectedStudents.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Enrolled</p>
                                        <p className="text-3xl font-bold text-blue-600">{stats.totalEnrolled}</p>
                                    </div>
                                    <FaUsers className="text-2xl text-blue-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Grade 11</p>
                                        <p className="text-3xl font-bold text-green-600">{stats.grade11Count}</p>
                                    </div>
                                    <FaGraduationCap className="text-2xl text-green-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Grade 12</p>
                                        <p className="text-3xl font-bold text-purple-600">{stats.grade12Count}</p>
                                    </div>
                                    <FaGraduationCap className="text-2xl text-purple-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Active Strands</p>
                                        <p className="text-3xl font-bold text-orange-600">{stats.strandsCount}</p>
                                    </div>
                                    <FaSchool className="text-2xl text-orange-600" />
                                </div>
                            </div>
                        </div>

                        {/* Filters and Search */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Grade Filter */}
                                <select
                                    value={filterGrade}
                                    onChange={(e) => setFilterGrade(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Grades</option>
                                    <option value="Grade 11">Grade 11</option>
                                    <option value="Grade 12">Grade 12</option>
                                </select>

                                {/* Strand Filter */}
                                <select
                                    value={filterStrand}
                                    onChange={(e) => setFilterStrand(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Strands</option>
                                    {strands.map(strand => (
                                        <option key={strand.id} value={strand.id}>
                                            {strand.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Section Filter */}
                                <select
                                    value={filterSection}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Sections</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.section_name}
                                        </option>
                                    ))}
                                </select>

                                {/* Clear Filters */}
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterGrade('');
                                        setFilterStrand('');
                                        setFilterSection('');
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FaFilter />
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Students Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Enrolled Students ({filteredStudents.length})
                                    </h3>
                                    
                                    {filteredStudents.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label className="text-sm text-gray-600">Select All</label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {filteredStudents.length === 0 ? (
                                <div className="p-12 text-center">
                                    <FaUserGraduate className="mx-auto text-4xl text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrolled Students Found</h3>
                                    <p className="text-gray-600 mb-4">
                                        {enrolledStudents.length === 0 
                                            ? "No students have been enrolled yet."
                                            : "No students match your current filters."
                                        }
                                    </p>
                                    
                                    {/* Debug Information */}
                                    {debug && (
                                        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left max-w-md mx-auto">
                                            <h4 className="font-semibold text-gray-700 mb-2">Debug Information:</h4>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div>School Year ID: {debug.school_year_id}</div>
                                                <div>Query Executed: {debug.query_executed ? 'Yes' : 'No'}</div>
                                                <div>Total Found: {debug.total_enrolled}</div>
                                                <div>
                                                    <a 
                                                        href="/debug/enrollment-status" 
                                                        target="_blank"
                                                        className="text-blue-600 hover:text-blue-800 underline"
                                                    >
                                                        View Detailed Debug Info
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Select
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Student
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Grade & Section
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Strand
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Enrollment Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredStudents.map((student) => (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStudents.includes(student.id)}
                                                            onChange={() => handleStudentSelect(student.id)}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-blue-600">
                                                                        {student.firstname?.[0]}{student.lastname?.[0]}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {student.firstname} {student.lastname}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {student.email}
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ID: {student.student_id}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{student.grade_level}</div>
                                                        <div className="text-sm text-gray-500">{student.section_name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {student.strand_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleViewCOR(student)}
                                                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                                                title="View & Print COR"
                                                            >
                                                                <FaPrint />
                                                                COR
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
        </>
    );
}
