// ============================================================================
// Faculty Enrollment Management Component
// ============================================================================
// Purpose: Manage student enrollments, approvals, and COR generation
// Features: Enrollment approval, student details, COR preview/print
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

// Components
import FacultySidebar from '../layouts/Faculty_Sidebar';

// Utils
import { AuthManager } from '../../auth';

// Icons - Organized by category
import { 
    // User Management
    FaUsers, FaUserCheck, FaUserTimes, FaUser, FaIdCard,
    // Actions
    FaEye, FaCheck, FaTimes, FaPrint, FaDownload,
    // UI Elements
    FaSpinner, FaSearch, FaFilter, FaClock,
    // Academic
    FaGraduationCap, FaFileAlt, FaSchool, FaClipboardCheck,
    // Contact & Info
    FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaInfoCircle, FaImage
} from 'react-icons/fa';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FacultyEnrollment({ enrollments = [], strands = [], sections = [] }) {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    
    // UI State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterStrand, setFilterStrand] = useState('all');
    const [filterStudentType, setFilterStudentType] = useState('all');
    
    // Feature State
    const [corPrintingEnabled, setCORPrintingEnabled] = useState(true);

    // ========================================================================
    // INITIALIZATION & EFFECTS
    // ========================================================================
    
    // Check COR printing permission on component mount
    useEffect(() => {
        const checkCORPrintingPermission = async () => {
            try {
                const token = AuthManager.getToken();
                const response = await fetch('/api/cor-printing-status', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setCORPrintingEnabled(data.enabled !== false); // Default to true if not set
                }
            } catch (error) {
                console.log('Could not check COR printing permission, defaulting to enabled');
                setCORPrintingEnabled(true);
            }
        };

        checkCORPrintingPermission();
    }, []);

    // ========================================================================
    // DATA PROCESSING & COMPUTED VALUES
    // ========================================================================
    
    // Filter enrollments based on search and filters
    const filteredEnrollments = enrollments.filter(enrollment => {
        const matchesSearch = searchTerm === '' || 
            enrollment.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enrollment.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enrollment.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || enrollment.status === filterStatus;
        const matchesStrand = filterStrand === 'all' || enrollment.strand_id?.toString() === filterStrand;
        const matchesStudentType = filterStudentType === 'all' || enrollment.enrollment_type === filterStudentType;
        
        return matchesSearch && matchesStatus && matchesStrand && matchesStudentType;
    });

    // ========================================================================
    // EVENT HANDLERS & API CALLS
    // ========================================================================
    
    // Handle enrollment approval and enrollment
    const handleApproveAndEnroll = async (enrollmentId) => {
        // Get the enrollment to show student info
        const enrollment = enrollments.find(e => e.id === enrollmentId);
        
        // First, get section assignment with strand validation
        const { value: sectionData } = await Swal.fire({
            title: 'Approve and Enroll Student',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-blue-50 p-3 rounded-lg mb-4">
                        <h4 class="font-medium text-blue-900">Student Information</h4>
                        <p class="text-sm text-blue-700">Name: ${enrollment?.student_name || 'Unknown'}</p>
                        <p class="text-sm text-blue-700">Preferred Strand: ${enrollment?.strand_name || 'Unknown'}</p>
                        <p class="text-sm text-blue-700">Grade Level: ${enrollment?.intended_grade_level || 'Unknown'}</p>
                        ${enrollment?.enrollment_type === 'transferee' ? '<p class="text-sm text-blue-700 font-medium">⚠️ Transferee Student</p>' : ''}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Assign Section and Strand: <span class="text-red-500">*</span>
                        </label>
                        <select id="section-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Section (Must Match Student's Strand)</option>
                            ${sections.filter(section => section.strand?.name === enrollment?.strand_name).map(section => 
                                `<option value="${section.id}" data-strand="${section.strand?.name || 'No Strand'}" data-grade="${section.year_level}">
                                    ${section.section_name} - ${section.strand?.name || 'No Strand'} (Grade ${section.year_level})
                                </option>`
                            ).join('')}
                            ${sections.filter(section => section.strand?.name !== enrollment?.strand_name).length > 0 ? 
                                '<optgroup label="⚠️ Different Strand Sections (Not Recommended)">' +
                                sections.filter(section => section.strand?.name !== enrollment?.strand_name).map(section => 
                                    `<option value="${section.id}" data-strand="${section.strand?.name || 'No Strand'}" data-grade="${section.year_level}" style="color: #dc2626;">
                                        ${section.section_name} - ${section.strand?.name || 'No Strand'} (Grade ${section.year_level}) ⚠️
                                    </option>`
                                ).join('') + '</optgroup>' : ''
                            }
                        </select>
                        <p class="text-xs text-blue-600 mt-1">
                            <strong>⚠️ Important:</strong> Section must match student's strand (${enrollment?.strand_name || 'Unknown'}). 
                            Selecting a different strand section will be rejected.
                        </p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Approve & Enroll',
            cancelButtonText: 'Cancel',
            width: '500px',
            preConfirm: () => {
                const sectionSelect = document.getElementById('section-select');
                const sectionId = sectionSelect.value;
                
                if (!sectionId) {
                    Swal.showValidationMessage('Please select a section and strand for the student');
                    return false;
                }
                
                const selectedOption = sectionSelect.options[sectionSelect.selectedIndex];
                const strandName = selectedOption.getAttribute('data-strand');
                const gradeLevel = selectedOption.getAttribute('data-grade');
                
                return { 
                    sectionId, 
                    strandName,
                    gradeLevel,
                    sectionName: selectedOption.text
                };
            }
        });

        if (sectionData) {
            setLoading(true);
            try {
                const token = AuthManager.getToken();
                const response = await fetch(`/coordinator/enrollments/${enrollmentId}/approve-and-enroll`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                    body: JSON.stringify({
                        assigned_section_id: sectionData.sectionId,
                        strand_name: sectionData.strandName,
                        grade_level: sectionData.gradeLevel
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Student Enrolled Successfully!',
                        html: `
                            <div class="text-left">
                                <p class="mb-2"><strong>${enrollment?.student_name}</strong> has been successfully enrolled!</p>
                                <div class="bg-green-50 p-3 rounded-lg">
                                    <p class="text-sm text-green-700"><strong>Assigned Section:</strong> ${sectionData.sectionName}</p>
                                    <p class="text-sm text-green-700"><strong>Strand:</strong> ${sectionData.strandName}</p>
                                    <p class="text-sm text-green-700"><strong>Grade Level:</strong> Grade ${sectionData.gradeLevel}</p>
                                </div>
                                <p class="text-sm text-gray-600 mt-2">The student and registrar have been notified.</p>
                            </div>
                        `,
                        confirmButtonColor: '#10b981',
                        timer: 5000
                    });
                    
                    // Refresh the page
                    window.location.reload();
                } else {
                    throw new Error(data.message || 'Failed to approve and enroll student');
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to approve and enroll student. Please try again.'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle viewing student details including report card
    const handleViewStudentDetails = async (enrollmentId) => {
        setLoading(true);
        try {
            const token = AuthManager.getToken();
            const response = await fetch(`/coordinator/enrollments/${enrollmentId}/student-details`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            const data = await response.json();

            if (response.ok) {
                const student = data.student;
                const personalInfo = data.personalInfo;
                
                await Swal.fire({
                    title: `Student Details - ${student.firstname} ${student.lastname}`,
                    html: `
                        <div class="text-left space-y-6 max-h-96 overflow-y-auto">
                            <!-- Personal Information -->
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h4 class="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-user"></i> Personal Information
                                </h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div><strong>Full Name:</strong> ${student.firstname} ${student.lastname}</div>
                                    <div><strong>Email:</strong> ${student.email}</div>
                                    <div><strong>LRN:</strong> ${personalInfo?.lrn || 'Not provided'}</div>
                                    <div><strong>Birthdate:</strong> ${personalInfo?.birthdate ? new Date(personalInfo.birthdate).toLocaleDateString() : 'Not provided'}</div>
                                    <div><strong>Sex:</strong> ${personalInfo?.sex || 'Not provided'}</div>
                                    <div><strong>Address:</strong> ${personalInfo?.address || 'Not provided'}</div>
                                    <div><strong>Birth Place:</strong> ${personalInfo?.birth_place || 'Not provided'}</div>
                                    <div><strong>Religion:</strong> ${personalInfo?.religion || 'Not provided'}</div>
                                </div>
                            </div>

                            <!-- Guardian Information -->
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h4 class="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-users"></i> Guardian Information
                                </h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div><strong>Guardian Name:</strong> ${personalInfo?.guardian_name || 'Not provided'}</div>
                                    <div><strong>Contact:</strong> ${personalInfo?.guardian_contact || 'Not provided'}</div>
                                    <div><strong>Relationship:</strong> ${personalInfo?.guardian_relationship || 'Not provided'}</div>
                                    <div><strong>Emergency Contact:</strong> ${personalInfo?.emergency_contact_name || 'Not provided'}</div>
                                    <div><strong>Emergency Phone:</strong> ${personalInfo?.emergency_contact_number || 'Not provided'}</div>
                                    <div><strong>Emergency Relationship:</strong> ${personalInfo?.emergency_contact_relationship || 'Not provided'}</div>
                                </div>
                            </div>

                            ${personalInfo?.student_status === 'transferee' ? `
                            <!-- Previous School Information -->
                            <div class="bg-orange-50 p-4 rounded-lg">
                                <h4 class="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-school"></i> Previous School Information
                                </h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div><strong>Previous School:</strong> ${personalInfo?.previous_school || 'Not provided'}</div>
                                    <div><strong>Last Grade:</strong> ${personalInfo?.last_grade || 'Not provided'}</div>
                                    <div><strong>Last School Year:</strong> ${personalInfo?.last_sy || 'Not provided'}</div>
                                    <div><strong>Last School:</strong> ${personalInfo?.last_school || 'Not provided'}</div>
                                </div>
                            </div>
                            ` : ''}

                            <!-- Documents -->
                            <div class="bg-purple-50 p-4 rounded-lg">
                                <h4 class="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-file-alt"></i> Submitted Documents
                                </h4>
                                <div class="space-y-2">
                                    ${personalInfo?.psa_birth_certificate ? `
                                        <div class="flex items-center justify-between p-2 bg-white rounded border">
                                            <span class="text-sm flex items-center gap-2">
                                                <i class="fas fa-id-card text-blue-500"></i>
                                                PSA Birth Certificate
                                            </span>
                                            <button onclick="window.open('/storage/${personalInfo.psa_birth_certificate}', '_blank')" 
                                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </div>
                                    ` : '<div class="text-sm text-gray-500">PSA Birth Certificate: Not uploaded</div>'}
                                    
                                    ${personalInfo?.report_card ? `
                                        <div class="flex items-center justify-between p-2 bg-white rounded border">
                                            <span class="text-sm flex items-center gap-2">
                                                <i class="fas fa-graduation-cap text-green-500"></i>
                                                Report Card
                                            </span>
                                            <button onclick="window.open('/storage/${personalInfo.report_card}', '_blank')" 
                                                    class="text-green-600 hover:text-green-800 text-sm font-medium">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </div>
                                    ` : '<div class="text-sm text-gray-500">Report Card: Not uploaded</div>'}
                                </div>
                            </div>

                            <!-- Additional Information -->
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <i class="fas fa-info-circle"></i> Additional Information
                                </h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div><strong>4Ps Beneficiary:</strong> ${personalInfo?.four_ps ? 'Yes' : 'No'}</div>
                                    <div><strong>PWD ID:</strong> ${personalInfo?.pwd_id || 'None'}</div>
                                    <div><strong>IP Community:</strong> ${personalInfo?.ip_community || 'No'}</div>
                                    <div><strong>Student Type:</strong> ${personalInfo?.student_status || 'Regular'}</div>
                                </div>
                            </div>
                        </div>
                    `,
                    showCancelButton: false,
                    confirmButtonText: 'Close',
                    confirmButtonColor: '#3b82f6',
                    width: '800px',
                    customClass: {
                        popup: 'student-details-modal'
                    }
                });
            } else {
                throw new Error(data.message || 'Failed to load student details');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error Loading Student Details',
                text: error.message || 'Unable to load student information. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle enrollment rejection
    const handleReject = async (enrollmentId) => {
        const { value: rejectionReason } = await Swal.fire({
            title: 'Reject Enrollment Application',
            html: `
                <div class="text-left">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection:</label>
                    <textarea id="rejection-reason" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" rows="4" placeholder="Please provide a clear reason for rejecting this enrollment application..."></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Reject Application',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const reason = document.getElementById('rejection-reason').value;
                if (!reason.trim()) {
                    Swal.showValidationMessage('Please provide a reason for rejection');
                    return false;
                }
                return reason;
            }
        });

        if (rejectionReason) {
            setLoading(true);
            try {
                const token = AuthManager.getToken();
                const response = await fetch(`/coordinator/enrollments/${enrollmentId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                    body: JSON.stringify({
                        // rejection_reason removed - no longer needed
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Enrollment Rejected',
                        text: 'The enrollment application has been rejected.',
                        timer: 2000
                    });
                    
                    // Refresh the page
                    window.location.reload();
                } else {
                    throw new Error(data.message || 'Failed to reject enrollment');
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to reject enrollment. Please try again.'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle viewing and printing COR
    const handleViewCOR = async (enrollmentId, studentName) => {
        setLoading(true);
        
        try {
            // Get authentication token
            const token = AuthManager.getToken();
            
            // Use faculty COR preview endpoint
            const response = await fetch(`/faculty/enrollments/${enrollmentId}/cor-preview`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
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

    // ========================================================================
    // COR GENERATION & PRINTING UTILITIES
    // ========================================================================
    
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
                    margin: 10mm;
                }
                
                .cor-container {
                    font-family: 'Times New Roman', serif;
                    line-height: 1.3;
                    color: #000;
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 8mm;
                    background: white;
                    box-sizing: border-box;
                    position: relative;
                    border: 2px solid #1e40af;
                    border-radius: 8px;
                }
                
                .cor-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    color: white;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .school-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                    gap: 15px;
                }
                
                .school-info img {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                    background: white;
                    border-radius: 50%;
                    padding: 5px;
                }
                
                .school-text {
                    text-align: left;
                }
                
                .school-text h1 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                    text-transform: uppercase;
                    line-height: 1.2;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .school-text h2 {
                    margin: 3px 0 0 0;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.2;
                    opacity: 0.95;
                }
                
                .school-text p {
                    margin: 3px 0 0 0;
                    font-size: 11px;
                    opacity: 0.9;
                }
                
                .document-title {
                    font-size: 18px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin: 15px 0 10px 0;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .academic-info {
                    font-size: 12px;
                    margin-bottom: 10px;
                    line-height: 1.4;
                    text-align: center;
                    font-weight: 500;
                }
                
                .academic-info div {
                    margin-bottom: 3px;
                }
                
                .student-info {
                    margin: 15px 0;
                    border: 2px solid #1e40af;
                    padding: 12px;
                    border-radius: 6px;
                    background: #f8fafc;
                }
                
                .student-info h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: center;
                    color: #1e40af;
                    border-bottom: 2px solid #1e40af;
                    padding-bottom: 5px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4px 10px;
                }
                
                .info-row {
                    display: flex;
                    align-items: baseline;
                }
                
                .info-label {
                    font-weight: bold;
                    font-size: 11px;
                    width: 80px;
                    flex-shrink: 0;
                    color: #374151;
                }
                
                .info-value {
                    flex: 1;
                    font-size: 11px;
                    border-bottom: 1px dotted #9ca3af;
                    padding-bottom: 2px;
                    color: #111827;
                }
                
                .enrollment-info {
                    margin: 15px 0;
                    border: 2px solid #059669;
                    padding: 12px;
                    background: #ecfdf5;
                    border-radius: 6px;
                }
                
                .enrollment-info h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: center;
                    color: #059669;
                    border-bottom: 2px solid #059669;
                    padding-bottom: 5px;
                }
                
                .schedule-section {
                    margin: 20px 0;
                }
                
                .schedule-section h3 {
                    margin: 0 0 10px 0;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: center;
                    color: #7c2d12;
                    border-bottom: 2px solid #7c2d12;
                    padding-bottom: 5px;
                    background: #fef7ed;
                    padding: 8px;
                    border-radius: 4px;
                }
                
                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 2px solid #1e40af;
                    font-size: 8px;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .schedule-table th {
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    color: white;
                    border: 1px solid #1e40af;
                    padding: 6px 3px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 9px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .schedule-table td {
                    border: 1px solid #d1d5db;
                    padding: 4px 3px;
                    text-align: center;
                    font-size: 7px;
                    vertical-align: middle;
                    height: 32px;
                    background: white;
                }
                
                .time-slot {
                    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
                    font-weight: bold;
                    font-size: 8px;
                    width: 60px;
                    color: #374151;
                }
                
                .subject-cell {
                    background: #fff;
                    transition: background-color 0.2s;
                }
                
                .subject-cell:hover {
                    background: #f8fafc;
                }
                
                .subject-cell div {
                    line-height: 1.1;
                    margin: 1px 0;
                }
                
                .signature-section {
                    margin-top: 25px;
                    display: flex;
                    justify-content: space-between;
                    gap: 30px;
                }
                
                .signature-box {
                    text-align: center;
                    flex: 1;
                }
                
                .signature-line {
                    border-bottom: 1px solid #000;
                    margin-bottom: 3px;
                    height: 30px;
                }
                
                .signature-title {
                    font-size: 10px;
                    font-weight: bold;
                    margin-bottom: 1px;
                }
                
                .signature-subtitle {
                    font-size: 8px;
                    color: #666;
                }
                
                .cor-footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 8px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 8px;
                }
                
                .cor-number {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    font-size: 10px;
                    font-weight: bold;
                }
                
                @media print {
                    .cor-container { 
                        margin: 0; 
                        padding: 10mm; 
                        font-size: 12px;
                        border: 2px solid #1e40af !important;
                        border-radius: 8px !important;
                    }
                    .cor-container img { 
                        print-color-adjust: exact; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .cor-header {
                        background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color: white !important;
                    }
                    .schedule-table th {
                        background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color: white !important;
                    }
                    .student-info {
                        border: 2px solid #1e40af !important;
                        background: #f8fafc !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .enrollment-info {
                        border: 2px solid #059669 !important;
                        background: #ecfdf5 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .schedule-section h3 {
                        background: #fef7ed !important;
                        color: #7c2d12 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
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
                                    <td class="time-slot">${timeSlot}</td>
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
                                                <div style="font-weight: bold; font-size: 7px; color: #333;">${specialActivity.name}</div>
                                                <div style="font-size: 5px; color: #666;">${specialActivity.time}</div>
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
                                                <div style="font-weight: bold; font-size: 7px;">${classAtTime.subject_code}</div>
                                                <div style="font-size: 6px;">${classAtTime.subject_name}</div>
                                                <div style="font-style: italic; font-size: 5px;">${classAtTime.faculty_firstname} ${classAtTime.faculty_lastname}</div>
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

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'enrolled': return 'bg-green-100 text-green-800';
            case 'approved_by_coordinator': return 'bg-blue-100 text-blue-800';
            case 'approved_by_registrar': return 'bg-emerald-100 text-emerald-800';
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
            case 'pending_evaluation': return 'bg-purple-100 text-purple-800';
            case 'evaluated': return 'bg-indigo-100 text-indigo-800';
            case 'returned': return 'bg-orange-100 text-orange-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            // Legacy statuses
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'enrolled': return <FaUserCheck className="text-green-600" />;
            case 'approved_by_coordinator': return <FaCheck className="text-blue-600" />;
            case 'approved_by_registrar': return <FaUserCheck className="text-emerald-600" />;
            case 'pending_approval': return <FaClock className="text-yellow-600" />;
            case 'pending_evaluation': return <FaClipboardCheck className="text-purple-600" />;
            case 'evaluated': return <FaEye className="text-indigo-600" />;
            case 'returned': return <FaSpinner className="text-orange-600" />;
            case 'rejected': return <FaUserTimes className="text-red-600" />;
            // Legacy statuses
            case 'approved': return <FaUserCheck className="text-green-600" />;
            case 'pending': return <FaClock className="text-yellow-600" />;
            default: return <FaClock className="text-gray-600" />;
        }
    };

    // ========================================================================
    // COMPONENT RENDER
    // ========================================================================
    
    return (
        <>
            <Head title="Enrollment Management - Faculty" />
            
            
            <div className="min-h-screen bg-gray-50 flex">
                <FacultySidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Enrollment Management</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Review and manage student enrollment applications
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right space-y-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        {filteredEnrollments.length} Enrollments
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {enrollments.filter(e => e.status === 'pending' || e.status === 'pending_approval').length} Pending Review
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        {enrollments.filter(e => e.enrollment_type === 'transferee').length} Transferee Students
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, student ID, or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="sm:w-48">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending_approval">Pending Approval</option>
                                    <option value="pending_evaluation">Pending Evaluation</option>
                                    <option value="evaluated">Evaluated (Awaiting Registrar)</option>
                                    <option value="approved_by_registrar">Approved by Registrar</option>
                                    <option value="enrolled">Enrolled</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="pending">Pending (Legacy)</option>
                                    <option value="approved">Approved (Legacy)</option>
                                </select>
                            </div>

                            {/* Strand Filter */}
                            <div className="sm:w-48">
                                <select
                                    value={filterStrand}
                                    onChange={(e) => setFilterStrand(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Strands</option>
                                    {strands.map(strand => (
                                        <option key={strand.id} value={strand.id}>
                                            {strand.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Student Type Filter */}
                            <div className="sm:w-48">
                                <select
                                    value={filterStudentType}
                                    onChange={(e) => setFilterStudentType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Student Types</option>
                                    <option value="transferee">Transferee Students</option>
                                    <option value="regular">Regular Students</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {filteredEnrollments.length === 0 ? (
                            <div className="text-center py-12">
                                <FaUsers className="mx-auto text-gray-300 text-5xl mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Enrollments Found</h3>
                                <p className="text-gray-600">
                                    {searchTerm || filterStatus !== 'all' || filterStrand !== 'all' || filterStudentType !== 'all'
                                        ? 'No enrollments match your current filters.' 
                                        : 'No enrollment applications have been submitted yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Table Header */}
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-semibold text-gray-900">Enrollment Applications</h3>
                                    <p className="text-sm text-gray-600 mt-1">Review and manage student enrollment requests</p>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Info</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredEnrollments.map((enrollment) => (
                                                <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                                                    {/* Student Info */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                {enrollment.student_name?.charAt(0).toUpperCase() || 'S'}
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {enrollment.student_name || 'Unknown Student'}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    ID: {enrollment.student_id || 'No ID'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Student Type */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {enrollment.enrollment_type === 'transferee' ? (
                                                                <>
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                                                    <span className="text-sm text-blue-700 font-medium">Transferee</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                                    <span className="text-sm text-green-700 font-medium">Regular</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {enrollment.enrollment_type === 'transferee' && enrollment.previous_school && (
                                                            <div className="text-xs text-blue-600 mt-1 flex items-center">
                                                                <FaSchool className="mr-1" />
                                                                From: {enrollment.previous_school}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Academic Info */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            <div className="flex items-center mb-1">
                                                                <FaGraduationCap className="text-gray-400 mr-2" />
                                                                {enrollment.strand_name || 'No Strand'}
                                                            </div>
                                                            <div className="flex items-center text-gray-600">
                                                                <FaClock className="text-gray-400 mr-2" />
                                                                Grade {enrollment.intended_grade_level || 'Unknown'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(enrollment.status)}`}>
                                                            {enrollment.status?.toUpperCase() || 'UNKNOWN'}
                                                        </span>
                                                        {enrollment.status === 'enrolled' && enrollment.assigned_section && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Section: {enrollment.assigned_section}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        <div className="flex items-center">
                                                            {getStatusIcon(enrollment.status)}
                                                            <span className="ml-2">
                                                                {enrollment.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : 'No Date'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            {/* View Details Button */}
                                                            <button
                                                                onClick={() => handleViewStudentDetails(enrollment.id)}
                                                                disabled={loading}
                                                                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                                title="View Student Details & Report Card"
                                                            >
                                                                {loading ? <FaSpinner className="animate-spin" /> : <FaEye />}
                                                            </button>

                                                            {/* Conditional Action Buttons */}
                                                            {(enrollment.status === 'pending_approval' || enrollment.status === 'pending' || enrollment.status === 'pending_evaluation' || enrollment.status === 'approved_by_registrar') && (
                                                                <>
                                                                    {enrollment.enrollment_type === 'transferee' ? (
                                                                        enrollment.status === 'approved_by_registrar' ? (
                                                                            <button
                                                                                onClick={() => handleApproveAndEnroll(enrollment.id)}
                                                                                disabled={loading}
                                                                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                                                                title="Enroll Student"
                                                                            >
                                                                                {loading ? <FaSpinner className="animate-spin" /> : <FaUserCheck />}
                                                                            </button>
                                                                        ) : (
                                                                            <a
                                                                                href={`/enrollment/${enrollment.id}/evaluate`}
                                                                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                                                                title="Evaluate Transferee Credits"
                                                                            >
                                                                                <FaClipboardCheck />
                                                                            </a>
                                                                        )
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleApproveAndEnroll(enrollment.id)}
                                                                            disabled={loading}
                                                                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                                                            title="Approve & Enroll"
                                                                        >
                                                                            {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                                                        </button>
                                                                    )}
                                                                    
                                                                    <button
                                                                        onClick={() => handleReject(enrollment.id)}
                                                                        disabled={loading}
                                                                        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                        title="Reject Application"
                                                                    >
                                                                        {loading ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* COR Button for Enrolled Students */}
                                                            {enrollment.status === 'enrolled' && corPrintingEnabled && (
                                                                <button
                                                                    onClick={() => handleViewCOR(enrollment.id, enrollment.student_name)}
                                                                    disabled={loading}
                                                                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                                    title="View & Print COR"
                                                                >
                                                                    {loading ? <FaSpinner className="animate-spin" /> : <FaPrint />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Status Messages */}
                                                        {enrollment.status === 'enrolled' && (
                                                            <div className="text-xs text-green-600 font-medium mt-1">
                                                                ✓ Successfully Enrolled
                                                            </div>
                                                        )}
                                                        {enrollment.status === 'enrolled' && !corPrintingEnabled && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                COR printing disabled
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
