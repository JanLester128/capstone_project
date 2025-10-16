import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    FaCheck, 
    FaTimes, 
    FaEye, 
    FaSearch,
    FaUserGraduate,
    FaClipboardCheck,
    FaFilter,
    FaDownload,
    FaFileAlt,
    FaCalendarAlt,
    FaSchool,
    FaPrint,
    FaSpinner,
    FaCog
} from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';

export default function RegistrarEnrollment({ students, sections, strands, enrollments = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterStrand, setFilterStrand] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('registrar-sidebar-collapsed');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            return false;
        }
    });
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalData, setApprovalData] = useState({
        assigned_strand_id: '',
        assigned_section_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [showCORSettings, setShowCORSettings] = useState(false);
    const [corPrintingEnabled, setCORPrintingEnabled] = useState(true);

    const filteredEnrollments = enrollments.filter(enrollment => {
        const student = enrollment.student;
        const matchesSearch = student?.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student?.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || enrollment.status === filterStatus;
        const matchesStrand = !filterStrand || enrollment.assigned_strand_id == filterStrand;
        
        return matchesSearch && matchesStatus && matchesStrand;
    });

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'enrolled': 'bg-blue-100 text-blue-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleViewDetails = (enrollment) => {
        setSelectedEnrollment(enrollment);
        setShowDetailsModal(true);
    };

    const handleApproveEnrollment = (enrollment) => {
        setSelectedEnrollment(enrollment);
        setApprovalData({
            assigned_strand_id: enrollment.assigned_strand_id || '',
            assigned_section_id: enrollment.assigned_section_id || ''
        });
        setShowApprovalModal(true);
    };

    const submitApproval = async () => {
        if (!approvalData.assigned_strand_id || !approvalData.assigned_section_id) {
            Swal.fire({
                title: 'Missing Information',
                text: 'Please select both strand and section for the student',
                icon: 'warning',
                confirmButtonColor: '#F59E0B'
            });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/registrar/enrollment/${selectedEnrollment.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(approvalData)
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Enrollment approved successfully',
                    icon: 'success',
                    confirmButtonColor: '#3B82F6'
                });

                setShowApprovalModal(false);
                router.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to approve enrollment',
                icon: 'error',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRejectEnrollment = async (enrollment) => {
        const result = await Swal.fire({
            title: 'Reject Enrollment?',
            text: `Are you sure you want to reject ${enrollment.student?.firstname} ${enrollment.student?.lastname}'s enrollment?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, reject it!',
            input: 'textarea',
            inputPlaceholder: 'Reason for rejection (optional)...',
            inputAttributes: {
                'aria-label': 'Reason for rejection'
            }
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/registrar/enrollment/${enrollment.id}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({ reason: result.value })
                });

                const responseData = await response.json();

                if (responseData.success) {
                    Swal.fire({
                        title: 'Rejected!',
                        text: 'Enrollment has been rejected',
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
                    text: 'Failed to reject enrollment',
                    icon: 'error',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus('');
        setFilterStrand('');
    };

    const getEnrollmentStats = () => {
        const stats = {
            total: enrollments.length,
            pending: enrollments.filter(e => e.status === 'pending').length,
            approved: enrollments.filter(e => e.status === 'approved').length,
            rejected: enrollments.filter(e => e.status === 'rejected').length
        };
        return stats;
    };

    const stats = getEnrollmentStats();

    // Handle viewing and printing COR
    const handleViewCOR = async (enrollmentId, studentName) => {
        setLoading(true);
        
        try {
            // Fetch COR data for the student
            const response = await fetch(`/registrar/enrollments/${enrollmentId}/cor-preview`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Display COR in a modal with print option
                const corHtml = generateCORHTML(data.cor, data.schedule, data.student, data.schoolYear);
                
                await Swal.fire({
                    title: `Certificate of Registration - ${studentName}`,
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
                        // Print the COR
                        printCOR(corHtml, studentName);
                        return false; // Prevent modal from closing
                    }
                });
            } else {
                throw new Error(data.message || 'Failed to load COR data');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error Loading COR',
                text: error.message || 'Unable to load Certificate of Registration. The student may not have an approved enrollment yet.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Generate COR HTML for display and printing
    const generateCORHTML = (cor, schedule, student, schoolYear) => {
        const timeSlots = [
            '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
            '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '4:45 PM'
        ];

        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        const formatTime = (time) => {
            if (!time) return '';
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${displayHour}:${minutes} ${ampm}`;
        };

        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;500;600;700&display=swap');
                
                /* A4 Page Setup */
                @page {
                    size: A4;
                    margin: 15mm;
                }
                
                .cor-container {
                    font-family: Arial, sans-serif;
                    line-height: 1.2;
                    color: #000;
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 10mm;
                    background: white;
                    box-sizing: border-box;
                    position: relative;
                }
                
                .cor-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #000;
                }
                
                .school-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .school-info img {
                    width: 80px;
                    height: 80px;
                    margin-right: 20px;
                }
                
                .school-text h1 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .school-text h2 {
                    margin: 5px 0 0 0;
                    font-size: 16px;
                    font-weight: normal;
                }
                
                .school-text p {
                    margin: 5px 0 0 0;
                    font-size: 12px;
                    color: #666;
                }
                
                .document-title {
                    font-size: 20px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin: 20px 0 10px 0;
                }
                
                .academic-info {
                    font-size: 14px;
                    margin-bottom: 10px;
                }
                
                .student-info {
                    margin: 30px 0;
                    border: 1px solid #ccc;
                    padding: 15px;
                }
                
                .student-info h3 {
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                
                .info-row {
                    display: flex;
                    margin-bottom: 8px;
                }
                
                .info-label {
                    font-weight: bold;
                    width: 120px;
                    flex-shrink: 0;
                }
                
                .info-value {
                    flex: 1;
                }
                
                .schedule-section {
                    margin: 30px 0;
                }
                
                .schedule-section h3 {
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                
                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #000;
                }
                
                .schedule-table th {
                    background: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px 4px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                .schedule-table td {
                    border: 1px solid #000;
                    padding: 3px 2px;
                    text-align: center;
                    font-size: 6px;
                    vertical-align: middle;
                    height: 28px;
                }
                
                .time-slot {
                    background: #f9f9f9;
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .subject-cell {
                    background: #fff;
                }
                
                .signature-section {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    gap: 40px;
                }
                
                .signature-box {
                    text-align: center;
                    flex: 1;
                }
                
                .signature-line {
                    border-bottom: 1px solid #000;
                    margin-bottom: 5px;
                    height: 40px;
                }
                
                .signature-title {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .signature-subtitle {
                    font-size: 10px;
                    color: #666;
                }
                
                .cor-footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                
                .cor-number {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    font-size: 11px;
                    font-weight: bold;
                }
                
                @media print {
                    .cor-container { 
                        margin: 0; 
                        padding: 15px; 
                        font-size: 12px;
                    }
                    .cor-container img { 
                        print-color-adjust: exact; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .cor-header {
                        background: #1e40af !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .schedule-table th {
                        background: #1e40af !important;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
            <div class="cor-container">
                <div class="cor-number">COR-${String(student?.student_id || '000000').padStart(6, '0')}</div>
                
                <!-- Simple Header -->
                <div class="cor-header">
                    <div class="school-info">
                        <img src="/onsts.png" alt="ONSTS Logo" />
                        <div class="school-text">
                            <h1>OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</h1>
                            <h2>Senior High School Department</h2>
                            <p>Opol, Misamis Oriental</p>
                        </div>
                    </div>
                    
                    <div class="document-title">Certificate of Registration</div>
                    
                    <div class="academic-info">
                        <div>School Year: ${schoolYear?.year_start || 'N/A'} - ${schoolYear?.year_end || 'N/A'}</div>
                        <div>Grade ${student?.grade_level || '11'} - ${student?.section_name || 'N/A'} (${student?.strand_name || 'N/A'} Strand)</div>
                    </div>
                </div>

                <!-- Student Information -->
                <div class="student-info">
                    <h3>STUDENT INFORMATION</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-label">Full Name:</div>
                            <div class="info-value">${student?.firstname || ''} ${student?.lastname || ''}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Student ID:</div>
                            <div class="info-value">${student?.student_id || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Email:</div>
                            <div class="info-value">${student?.email || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Student Type:</div>
                            <div class="info-value">${student?.student_type || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <!-- Enrollment Information -->
                <div class="enrollment-info">
                    <h3>ENROLLMENT DETAILS</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-label">Enrolled By:</div>
                            <div class="info-value">${cor?.enrolled_by_name || student?.enrolled_by_name || 'System Administrator'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Date Enrolled:</div>
                            <div class="info-value">${cor?.registration_date ? new Date(cor.registration_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            }) : new Date().toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Status:</div>
                            <div class="info-value">OFFICIALLY ENROLLED</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">COR Number:</div>
                            <div class="info-value">COR-${String(student?.student_id || '000000').padStart(6, '0')}</div>
                        </div>
                    </div>
                </div>

                <!-- Class Schedule -->
                <div class="schedule-section">
                    <h3>Class Schedule</h3>
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th>TIME</th>
                                ${daysOfWeek.map(day => `<th>${day.toUpperCase()}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${timeSlots.map(timeSlot => {
                                return `<tr>
                                    <td class="time-slot" style="font-weight: 600;">${timeSlot}</td>
                                    ${daysOfWeek.map(day => {
                                        // Check for special institutional time slots FIRST (highest priority)
                                        let specialActivity = null;
                                        
                                        // Flag Ceremony (Monday Only, 7:30-7:45 AM)
                                        if (day === 'Monday' && timeSlot === '7:30 AM') {
                                            specialActivity = {
                                                name: 'FLAG CEREMONY',
                                                time: '7:30-7:45 AM',
                                                type: 'institutional'
                                            };
                                        }
                                        // Advisory Time (7:30-8:00 AM, Tuesday-Friday)
                                        else if (['Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day) && timeSlot === '7:30 AM') {
                                            specialActivity = {
                                                name: 'ADVISORY TIME',
                                                time: '7:30-8:00 AM',
                                                type: 'institutional'
                                            };
                                        }
                                        // Break Time (10:00-10:30 AM) - spans 2 slots
                                        else if (timeSlot === '10:00 AM' || timeSlot === '10:30 AM') {
                                            specialActivity = {
                                                name: 'BREAK TIME',
                                                time: '10:00-10:30 AM',
                                                type: 'break'
                                            };
                                        }
                                        // Lunch Break (12:30-1:30 PM) - spans 3 slots
                                        else if (timeSlot === '12:30 PM' || timeSlot === '1:00 PM' || timeSlot === '1:30 PM') {
                                            specialActivity = {
                                                name: 'LUNCH BREAK',
                                                time: '12:30-1:30 PM',
                                                type: 'break'
                                            };
                                        }
                                        // Flag Lowering (4:30-4:45 PM) - spans 2 slots
                                        else if (timeSlot === '4:30 PM' || timeSlot === '4:45 PM') {
                                            specialActivity = {
                                                name: 'FLAG LOWERING',
                                                time: '4:30-4:45 PM',
                                                type: 'institutional'
                                            };
                                        }

                                        // If special activity exists, return it immediately
                                        if (specialActivity) {
                                            const bgColor = specialActivity.type === 'break' ? '#f0f8ff' : '#fff8dc';
                                            return `<td class="subject-cell" style="background: ${bgColor};">
                                                <div style="font-weight: bold; font-size: 8px; color: #333;">${specialActivity.name}</div>
                                                <div style="font-size: 6px; color: #666;">${specialActivity.time}</div>
                                            </td>`;
                                        }

                                        // Otherwise, check for regular classes
                                        const dayClasses = schedule[day] || [];
                                        const classAtTime = dayClasses.find(cls => {
                                            const startTime = formatTime(cls.start_time);
                                            const endTime = formatTime(cls.end_time);
                                            return startTime <= timeSlot && endTime > timeSlot;
                                        });

                                        if (classAtTime) {
                                            return `<td class="subject-cell">
                                                <div style="font-weight: bold; font-size: 8px;">${classAtTime.subject_code}</div>
                                                <div style="font-size: 7px;">${classAtTime.subject_name}</div>
                                                <div style="font-style: italic; font-size: 6px;">${classAtTime.faculty_firstname} ${classAtTime.faculty_lastname}</div>
                                            </td>`;
                                        } else {
                                            return `<td class="subject-cell"></td>`;
                                        }
                                    }).join('')}
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Signature Section (No Student Signature) -->
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-title">PRINCIPAL</div>
                        <div class="signature-subtitle">School Administrator</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-title">REGISTRAR</div>
                        <div class="signature-subtitle">Academic Records</div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="cor-footer">
                    <div>Generated on: ${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                    <div style="margin-top: 10px;">
                        This is an official Certificate of Registration
                    </div>
                    <div style="margin-top: 5px;">
                        For verification, contact the Registrar's Office
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
                <title>COR - ${studentName}</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        .cor-container { max-width: none !important; }
                    }
                    body { font-family: Arial, sans-serif; }
                </style>
            </head>
            <body>
                ${corHtml}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Handle COR printing permission toggle
    const handleToggleCORPrinting = async () => {
        try {
            const response = await fetch('/registrar/cor-printing-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    enabled: !corPrintingEnabled
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCORPrintingEnabled(!corPrintingEnabled);
                Swal.fire({
                    icon: 'success',
                    title: 'Settings Updated',
                    text: `COR printing for faculty/coordinators has been ${!corPrintingEnabled ? 'enabled' : 'disabled'}`,
                    timer: 2000
                });
            } else {
                throw new Error(data.message || 'Failed to update settings');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update COR printing settings'
            });
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Head title="Enrollment Management - ONSTS" />
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
                                    Enrollment Management
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Review and approve student enrollment applications for {activeSchoolYear?.year_name}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button 
                                    onClick={() => setShowCORSettings(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                                >
                                    <FaCog className="w-4 h-4 mr-2" />
                                    COR Settings
                                </button>
                                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200">
                                    <FaDownload className="w-4 h-4 mr-2" />
                                    Export Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-blue-500 rounded-lg p-3 mr-4">
                                    <FaUserGraduate className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-yellow-500 rounded-lg p-3 mr-4">
                                    <FaClipboardCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-green-500 rounded-lg p-3 mr-4">
                                    <FaCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Approved</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="bg-red-500 rounded-lg p-3 mr-4">
                                    <FaTimes className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
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
                                onClick={clearFilters}
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
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="enrolled">Enrolled</option>
                            </select>

                            <select
                                value={filterStrand}
                                onChange={(e) => setFilterStrand(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Strands</option>
                                {strands.map(strand => (
                                    <option key={strand.id} value={strand.id}>
                                        {strand.code} - {strand.name}
                                    </option>
                                ))}
                            </select>

                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{filteredEnrollments.length}</div>
                                <div className="text-xs text-gray-600">Applications Found</div>
                            </div>
                        </div>
                    </div>

                    {/* Enrollments Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Student
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Grade Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Preferred Strand
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Applied Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredEnrollments.map((enrollment) => (
                                        <tr key={enrollment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-white">
                                                                {enrollment.student?.firstname?.charAt(0)}{enrollment.student?.lastname?.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {enrollment.student?.firstname} {enrollment.student?.lastname}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {enrollment.student?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {enrollment.grade_level}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {enrollment.strand ? (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {enrollment.strand.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">Not assigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(enrollment.status)}`}>
                                                    {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(enrollment.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleViewDetails(enrollment)}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                                        title="View Details"
                                                    >
                                                        <FaEye className="w-4 h-4" />
                                                    </button>
                                                    {(enrollment.status === 'approved' || enrollment.status === 'enrolled') && (
                                                        <button
                                                            onClick={() => handleViewCOR(enrollment.id, `${enrollment.student?.firstname} ${enrollment.student?.lastname}`)}
                                                            disabled={loading}
                                                            className="text-purple-600 hover:text-purple-900 p-1 rounded disabled:opacity-50"
                                                            title="View & Print COR"
                                                        >
                                                            {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaPrint className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {enrollment.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveEnrollment(enrollment)}
                                                                className="text-green-600 hover:text-green-900 p-1 rounded"
                                                                title="Approve"
                                                            >
                                                                <FaCheck className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectEnrollment(enrollment)}
                                                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                                                title="Reject"
                                                            >
                                                                <FaTimes className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredEnrollments.length === 0 && (
                            <div className="text-center py-12">
                                <FaUserGraduate className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
                                <p className="text-gray-600">
                                    {searchTerm || filterStatus || filterStrand 
                                        ? 'Try adjusting your search terms or filters' 
                                        : 'No enrollment applications have been submitted yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedEnrollment && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Enrollment Details
                                </h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Student Information */}
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 mb-3">Student Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name</label>
                                            <p className="text-sm text-gray-900">
                                                {selectedEnrollment.student?.firstname} {selectedEnrollment.student?.lastname}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email</label>
                                            <p className="text-sm text-gray-900">{selectedEnrollment.student?.email}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                                            <p className="text-sm text-gray-900">{selectedEnrollment.grade_level}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Application Date</label>
                                            <p className="text-sm text-gray-900">
                                                {new Date(selectedEnrollment.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Enrollment Status */}
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 mb-3">Enrollment Status</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Status</label>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEnrollment.status)}`}>
                                                {selectedEnrollment.status.charAt(0).toUpperCase() + selectedEnrollment.status.slice(1)}
                                            </span>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Assigned Strand</label>
                                            <p className="text-sm text-gray-900">
                                                {selectedEnrollment.strand?.name || 'Not assigned'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 mb-3">Submitted Documents</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <FaFileAlt className="w-4 h-4 text-gray-500 mr-2" />
                                                <span className="text-sm text-gray-900">Form 138 (Report Card)</span>
                                            </div>
                                            <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <FaFileAlt className="w-4 h-4 text-gray-500 mr-2" />
                                                <span className="text-sm text-gray-900">PSA Birth Certificate</span>
                                            </div>
                                            <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                {selectedEnrollment.status === 'pending' && (
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleApproveEnrollment(selectedEnrollment);
                                        }}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Approve Enrollment
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Modal */}
            {showApprovalModal && selectedEnrollment && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Approve Enrollment
                                </h3>
                                <button
                                    onClick={() => setShowApprovalModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Student
                                    </label>
                                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                        {selectedEnrollment.student?.firstname} {selectedEnrollment.student?.lastname}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assign Strand
                                    </label>
                                    <select
                                        value={approvalData.assigned_strand_id}
                                        onChange={(e) => setApprovalData({...approvalData, assigned_strand_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Strand</option>
                                        {strands.map(strand => (
                                            <option key={strand.id} value={strand.id}>
                                                {strand.code} - {strand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assign Section
                                    </label>
                                    <select
                                        value={approvalData.assigned_section_id}
                                        onChange={(e) => setApprovalData({...approvalData, assigned_section_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Section</option>
                                        {sections
                                            .filter(section => !approvalData.assigned_strand_id || section.strand_id == approvalData.assigned_strand_id)
                                            .map(section => (
                                                <option key={section.id} value={section.id}>
                                                    {section.section_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowApprovalModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitApproval}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COR Settings Modal */}
            {showCORSettings && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    COR Printing Settings
                                </h3>
                                <button
                                    onClick={() => setShowCORSettings(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Faculty/Coordinator COR Printing</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Allow faculty and coordinators to print student CORs
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleCORPrinting}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            corPrintingEnabled ? 'bg-green-600' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                corPrintingEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <FaFileAlt className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-blue-900">
                                                COR Printing Control
                                            </h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                When disabled, only registrars can view and print student CORs. 
                                                Faculty and coordinators will not see the print option in their enrollment management interface.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-500">
                                    <p><strong>Current Status:</strong> {corPrintingEnabled ? 'Enabled' : 'Disabled'}</p>
                                    <p><strong>Affects:</strong> Faculty and Coordinator COR printing permissions</p>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowCORSettings(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
