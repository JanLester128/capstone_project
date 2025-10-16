import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import StudentSidebar from '../layouts/Student_Sidebar';
import Swal from 'sweetalert2';
import {
    FaUserGraduate,
    FaCalendarAlt,
    FaCheckCircle,
    FaExclamationTriangle,
    FaClock,
    FaInfoCircle,
    FaBookOpen,
    FaSchool,
    FaUsers,
    FaSpinner,
    FaEdit,
    FaEye,
    FaDownload
} from 'react-icons/fa';

export default function StudentEnrollment({
    user,
    currentSchoolYear,
    enrollmentOpen,
    generalEnrollmentOpen,
    semesterRulesApplied,
    studentType,
    currentSemester,
    semesterRestriction,
    strands,
    existingEnrollment
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        // Basic enrollment data
        intended_grade_level: existingEnrollment?.intended_grade_level || 11,
        student_type: user?.student_type || 'new',

        // Personal Information
        lrn: user?.student_personal_info?.lrn || '',
        birthdate: user?.student_personal_info?.birthdate || '',
        sex: user?.student_personal_info?.sex || '',
        address: (user?.student_personal_info?.address && user.student_personal_info.address !== 'To be provided') ? user.student_personal_info.address : '',
        guardian_name: user?.student_personal_info?.guardian_name || '',
        guardian_contact: user?.student_personal_info?.guardian_contact || '',
        guardian_relationship: user?.student_personal_info?.guardian_relationship || '',
        
        // Additional Personal Information
        extension_name: user?.student_personal_info?.extension_name || '',
        birth_place: user?.student_personal_info?.birth_place || '',
        religion: user?.student_personal_info?.religion || '',
        ip_community: user?.student_personal_info?.ip_community || '',
        four_ps: user?.student_personal_info?.four_ps || false,
        pwd_id: user?.student_personal_info?.pwd_id || '',
        
        // Previous School Information (for transferees)
        previous_school: user?.student_personal_info?.previous_school || '',
        last_grade: user?.student_personal_info?.last_grade || '',
        last_sy: user?.student_personal_info?.last_sy || '',
        last_school: user?.student_personal_info?.last_school || '',
        
        // Emergency Contact Information
        emergency_contact_name: user?.student_personal_info?.emergency_contact_name || '',
        emergency_contact_number: user?.student_personal_info?.emergency_contact_number || '',
        emergency_contact_relationship: user?.student_personal_info?.emergency_contact_relationship || '',

        // Strand Preferences (3 choices)
        first_strand_choice: existingEnrollment?.strand_preferences?.[0]?.strand_id || '',
        second_strand_choice: existingEnrollment?.strand_preferences?.[1]?.strand_id || '',
        third_strand_choice: existingEnrollment?.strand_preferences?.[2]?.strand_id || '',

        // Documents
        psa_birth_certificate: null,
        report_card: null
    });

    const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1-3 = enrollment steps
    const [errors, setErrors] = useState({});
    
    // Use ref to store form data without triggering re-renders
    const formDataRef = useRef(formData);
    
    // Update ref whenever formData changes
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    // No more timeouts needed - using ref-based approach
    
    // Refs for maintaining focus
    const lrnInputRef = useRef(null);
    const addressInputRef = useRef(null);
    const guardianNameInputRef = useRef(null);
    const contactInputRef = useRef(null);
    const birthdateInputRef = useRef(null);
    const birthPlaceInputRef = useRef(null);
    const religionInputRef = useRef(null);
    const pwdIdInputRef = useRef(null);
    const emergencyContactNameInputRef = useRef(null);
    const emergencyContactNumberInputRef = useRef(null);
    const previousSchoolInputRef = useRef(null);
    const lastSyInputRef = useRef(null);
    const lastSchoolInputRef = useRef(null);

    // Check enrollment status periodically - reduced frequency and more intelligent checking
    useEffect(() => {
        const checkEnrollmentStatus = async () => {
            try {
                const response = await fetch('/student/enrollment-status', {
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.enrollment?.is_enrollment_open !== enrollmentOpen) {
                        console.log('Enrollment status changed, refreshing page...', data.enrollment);
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error('Error checking enrollment status:', error);
            }
        };

        const interval = setInterval(checkEnrollmentStatus, 60000);
        return () => clearInterval(interval);
    }, [enrollmentOpen]);

    // Unified input handler for text inputs - stable version to prevent typing interruption
    const handleTextInput = useCallback((field) => (e) => {
        const target = e.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev[field]) {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
            return prev;
        });
    }, []); // Empty dependency array for stable function

    // Handler for numeric inputs - stable version to prevent typing interruption
    const handleNumericInput = useCallback((field) => (e) => {
        const target = e.target;
        const value = target.value.replace(/\D/g, '');
        
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev[field]) {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
            return prev;
        });
    }, []); // Empty dependency array for stable function

    // Handle file uploads
    const handleFileChange = (field, file) => {
        if (!file) {
            setFormData(prev => ({
                ...prev,
                [field]: null,
                [`${field}_name`]: ''
            }));
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            Swal.fire({
                title: 'File Too Large',
                text: 'Please select a file smaller than 5MB',
                icon: 'warning',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                title: 'Invalid File Type',
                text: 'Please upload a PDF, JPEG, or PNG file',
                icon: 'warning',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: file,
            [`${field}_name`]: file.name
        }));
    };

    // Handle LRN input (numbers only, max 12) - stable version
    const handleLrnChange = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
        
        setFormData(prev => ({
            ...prev,
            lrn: value
        }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev.lrn) {
                const newErrors = { ...prev };
                delete newErrors.lrn;
                return newErrors;
            }
            return prev;
        });
    }, []);

    // Handle contact number input (numbers only) - stable version
    const handleContactChange = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        
        setFormData(prev => ({
            ...prev,
            guardian_contact: value
        }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev.guardian_contact) {
                const newErrors = { ...prev };
                delete newErrors.guardian_contact;
                return newErrors;
            }
            return prev;
        });
    }, []);

    // Handle emergency contact number input (numbers only) - stable version
    const handleEmergencyContactChange = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        
        setFormData(prev => ({
            ...prev,
            emergency_contact_number: value
        }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev.emergency_contact_number) {
                const newErrors = { ...prev };
                delete newErrors.emergency_contact_number;
                return newErrors;
            }
            return prev;
        });
    }, []);

    // Create stable individual handlers for each field to prevent focus loss
    const handleLrnInput = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
        e.target.value = value; // Update input directly for smooth typing
        
        // Update ref immediately (no re-render)
        formDataRef.current.lrn = value;
        
        if (errors.lrn) {
            setErrors(prev => {
                const { lrn, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleAddressInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.address = value;
        
        if (errors.address) {
            setErrors(prev => {
                const { address, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleGuardianNameInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.guardian_name = value;
        
        if (errors.guardian_name) {
            setErrors(prev => {
                const { guardian_name, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleGuardianContactInput = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        e.target.value = value; // Update input directly
        
        // Update ref immediately (no re-render)
        formDataRef.current.guardian_contact = value;
        
        if (errors.guardian_contact) {
            setErrors(prev => {
                const { guardian_contact, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleGuardianRelationshipInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, guardian_relationship: e.target.value }));
        setErrors(prev => {
            if (prev.guardian_relationship) {
                const { guardian_relationship, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleBirthPlaceInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.birth_place = value;
        
        if (errors.birth_place) {
            setErrors(prev => {
                const { birth_place, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleReligionInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.religion = value;
        
        if (errors.religion) {
            setErrors(prev => {
                const { religion, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handlePwdIdInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.pwd_id = value;
        
        if (errors.pwd_id) {
            setErrors(prev => {
                const { pwd_id, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleEmergencyNameInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.emergency_contact_name = value;
        
        if (errors.emergency_contact_name) {
            setErrors(prev => {
                const { emergency_contact_name, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleEmergencyNumberInput = useCallback((e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        e.target.value = value; // Update input directly
        
        // Update ref immediately (no re-render)
        formDataRef.current.emergency_contact_number = value;
        
        if (errors.emergency_contact_number) {
            setErrors(prev => {
                const { emergency_contact_number, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleEmergencyRelationshipInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, emergency_contact_relationship: e.target.value }));
        setErrors(prev => {
            if (prev.emergency_contact_relationship) {
                const { emergency_contact_relationship, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handlePreviousSchoolInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.previous_school = value;
        
        if (errors.previous_school) {
            setErrors(prev => {
                const { previous_school, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleLastGradeInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, last_grade: e.target.value }));
        setErrors(prev => {
            if (prev.last_grade) {
                const { last_grade, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleLastSyInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.last_sy = value;
        
        if (errors.last_sy) {
            setErrors(prev => {
                const { last_sy, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleLastSchoolInput = useCallback((e) => {
        const value = e.target.value;
        
        // Update ref immediately (no re-render)
        formDataRef.current.last_school = value;
        
        if (errors.last_school) {
            setErrors(prev => {
                const { last_school, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    const handleBirthdateInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, birthdate: e.target.value }));
        setErrors(prev => {
            if (prev.birthdate) {
                const { birthdate, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleSexInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, sex: e.target.value }));
        setErrors(prev => {
            if (prev.sex) {
                const { sex, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleIpCommunityInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, ip_community: e.target.value }));
        setErrors(prev => {
            if (prev.ip_community) {
                const { ip_community, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, []);

    const handleFourPsInput = useCallback((e) => {
        setFormData(prev => ({ ...prev, four_ps: e.target.checked }));
    }, []);

    const handleExtensionNameInput = useCallback((e) => {
        // Immediate update for dropdown (no debounce needed)
        setFormData(prev => ({ ...prev, extension_name: e.target.value }));
    }, []);

    // Handler for strand preferences (needs immediate state update for controlled component)
    const handleStrandChoice = useCallback((field, value) => {
        // Update both ref and state immediately
        formDataRef.current[field] = value;
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear error if exists
        if (errors[field]) {
            setErrors(prev => {
                const { [field]: removed, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    // Alias for backward compatibility
    const handleInputChange = handleTextInput;

    // Validate current step
    const validateStep = (step) => {
        const newErrors = {};
        const data = formDataRef.current; // Use ref data for validation

        switch (step) {
            case 1: // Personal Information
                if (!data.lrn) {
                    newErrors.lrn = 'LRN is required';
                } else if (!/^\d{12}$/.test(data.lrn)) {
                    newErrors.lrn = 'LRN must be exactly 12 numbers';
                }
                
                if (!data.birthdate) newErrors.birthdate = 'Birthdate is required';
                if (!data.sex) newErrors.sex = 'Sex is required';
                if (!data.address) newErrors.address = 'Address is required';
                if (!data.guardian_name) newErrors.guardian_name = 'Guardian name is required';
                
                if (!data.guardian_contact) {
                    newErrors.guardian_contact = 'Guardian contact is required';
                } else if (!/^\d{11}$/.test(data.guardian_contact)) {
                    newErrors.guardian_contact = 'Contact number must be exactly 11 numbers';
                }
                
                if (!data.guardian_relationship) newErrors.guardian_relationship = 'Guardian relationship is required';
                if (!data.birth_place) newErrors.birth_place = 'Birth place is required';
                if (!data.religion) newErrors.religion = 'Religion is required';
                
                if (!data.emergency_contact_name) newErrors.emergency_contact_name = 'Emergency contact name is required';
                if (!data.emergency_contact_number) {
                    newErrors.emergency_contact_number = 'Emergency contact number is required';
                } else if (!/^\d{11}$/.test(data.emergency_contact_number)) {
                    newErrors.emergency_contact_number = 'Contact number must be exactly 11 numbers';
                }
                if (!data.emergency_contact_relationship) newErrors.emergency_contact_relationship = 'Emergency contact relationship is required';
                
                // Transferee-specific validation
                if (data.student_type === 'transferee') {
                    if (!data.previous_school) newErrors.previous_school = 'Previous school is required for transferees';
                    if (!data.last_grade) newErrors.last_grade = 'Last grade completed is required for transferees';
                    if (!data.last_sy) newErrors.last_sy = 'Last school year is required for transferees';
                    if (!data.last_school) newErrors.last_school = 'Last school attended is required for transferees';
                }
                break;

            case 2: // Strand Preferences
                if (!data.first_strand_choice) newErrors.first_strand_choice = 'First strand choice is required';
                if (!data.second_strand_choice) newErrors.second_strand_choice = 'Second strand choice is required';
                if (!data.third_strand_choice) newErrors.third_strand_choice = 'Third strand choice is required';

                // Check for duplicate strand choices
                const choices = [data.first_strand_choice, data.second_strand_choice, data.third_strand_choice];
                if (new Set(choices).size !== choices.length) {
                    newErrors.strand_preferences = 'Strand choices must be unique';
                }
                break;

            case 3: // Documents and Review
                if (!data.intended_grade_level) newErrors.intended_grade_level = 'Grade level is required';
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

// Handle navigation between steps
const goToStep = (step) => {
    if (step < 1) step = 1;
    if (step > 3) step = 3;
    
    // Validate current step before proceeding
    if (step > currentStep && !validateStep(currentStep)) {
        // Scroll to the first error
        const firstError = Object.keys(errors)[0];
        if (firstError) {
            const element = document.getElementById(firstError) || 
                           document.querySelector(`[name="${firstError}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    setCurrentStep(step);
};

// Handle form submission
const handleEnrollment = async (e) => {
    e?.preventDefault();
    
    // Sync ref data to state for validation and submission
    setFormData(formDataRef.current);
    
    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Validate all steps using current ref data
    const isStep1Valid = validateStep(1);
    const isStep2Valid = validateStep(2);
    const isStep3Valid = validateStep(3);
    
    if (!isStep1Valid) {
        setCurrentStep(1);
        return;
    }
    if (!isStep2Valid) {
        setCurrentStep(2);
        return;
    }
    if (!isStep3Valid) {
        setCurrentStep(3);
        return;
    }

    setLoading(true);
    
    try {
        const formDataToSend = new FormData();
        
        // Append all form data
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                if (value instanceof File) {
                    formDataToSend.append(key, value, value.name);
                } else if (Array.isArray(value)) {
                    value.forEach(item => formDataToSend.append(`${key}[]`, item));
                } else if (key === 'four_ps') {
                    // Always include four_ps even if false
                    formDataToSend.append(key, value ? '1' : '0');
                } else if (typeof value === 'boolean') {
                    // Handle boolean values properly
                    formDataToSend.append(key, value ? '1' : '0');
                } else {
                    formDataToSend.append(key, value);
                }
            }
        });

        // Add school year ID
        formDataToSend.append('school_year_id', currentSchoolYear.id);

        // Debug: Log FormData contents
        console.log('FormData contents:');
        for (let [key, value] of formDataToSend.entries()) {
            console.log(key, ':', value);
        }

        console.log('Submitting enrollment to /student/enroll');
        console.log('Request headers:', {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        });

        const response = await fetch('/student/enroll', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            },
            body: formDataToSend
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Enrollment Submitted!',
                text: 'Your enrollment has been submitted successfully. Please wait for coordinator approval.',
                confirmButtonColor: '#059669'
            });

            // Refresh the page to show updated status
            router.reload();
        } else {
            // Handle validation errors specifically
            if (response.status === 422 && data.errors) {
                const errorMessages = Object.values(data.errors).flat();
                const errorText = errorMessages.join('\n');
                throw new Error(`Validation Error:\n${errorText}`);
            } else {
                throw new Error(data.message || data.error || 'Enrollment failed');
            }
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Enrollment Failed',
            text: error.message || 'An error occurred during enrollment. Please try again.',
            confirmButtonColor: '#dc2626'
        });
    } finally {
        setLoading(false);
    }
};

    // Determine enrollment status
    const getEnrollmentStatus = () => {
        if (!existingEnrollment) {
            return {
                status: 'Not Enrolled',
                message: 'You need to submit an enrollment application',
                color: 'blue',
                canEnroll: enrollmentOpen,
                icon: FaUserGraduate
            };
        }

        switch (existingEnrollment.status) {
            case 'pending':
                return {
                    status: 'Pending Approval',
                    message: 'Your enrollment is being reviewed by the coordinator',
                    color: 'yellow',
                    canEnroll: false,
                    icon: FaClock
                };
            case 'approved':
            case 'enrolled':
                return {
                    status: 'Enrolled',
                    message: 'You are successfully enrolled for this semester',
                    color: 'green',
                    canEnroll: false,
                    icon: FaCheckCircle
                };
            case 'rejected':
                return {
                    status: 'Enrollment Rejected',
                    message: 'Your enrollment was rejected. Please contact the coordinator',
                    color: 'red',
                    canEnroll: enrollmentOpen,
                    icon: FaExclamationTriangle
                };
            default:
                return {
                    status: 'Unknown Status',
                    message: 'Please contact the registrar for assistance',
                    color: 'gray',
                    canEnroll: false,
                    icon: FaInfoCircle
                };
        }
    };

    const statusInfo = getEnrollmentStatus();

    // HCI Principle 2: Match between system and real world - Academic terms
    const EnrollmentPeriodCard = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FaCalendarAlt className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enrollment Period</h3>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-500">School Year</label>
                    <p className="text-lg font-semibold text-gray-900">
                        {currentSchoolYear ? `${currentSchoolYear.year_start}-${currentSchoolYear.year_end}` : 'No Active School Year'}
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-500">Semester</label>
                    <p className="text-lg font-semibold text-gray-900">
                        {currentSchoolYear ? currentSchoolYear.semester : 'N/A'}
                    </p>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg border ${enrollmentOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`flex items-center gap-2 ${enrollmentOpen ? 'text-green-700' : 'text-red-700'}`}>
                        {enrollmentOpen ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        <span className="font-medium">
                            {enrollmentOpen ? 'Enrollment is Open' : 'Enrollment is Closed'}
                        </span>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-auto p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Refresh enrollment status"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Enrollment Period Information */}
                {currentSchoolYear && (currentSchoolYear.enrollment_start_date || currentSchoolYear.enrollment_end_date) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <FaCalendarAlt className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Enrollment Period</span>
                        </div>
                        <div className="text-xs text-blue-700 space-y-1">
                            {currentSchoolYear.enrollment_start_date && (
                                <div>Start: {new Date(currentSchoolYear.enrollment_start_date).toLocaleDateString()}</div>
                            )}
                            {currentSchoolYear.enrollment_end_date && (
                                <div>End: {new Date(currentSchoolYear.enrollment_end_date).toLocaleDateString()}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Show semester restriction message if applicable */}
                {semesterRestriction && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <FaInfoCircle className="text-yellow-600" />
                            <span className="text-sm text-yellow-800 font-medium">
                                {semesterRestriction}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // HCI Principle 4: Consistency and standards - Status display
    const EnrollmentStatusCard = () => {
        const StatusIcon = statusInfo.icon;

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 bg-${statusInfo.color}-500 rounded-lg flex items-center justify-center`}>
                        <FaUserGraduate className="text-white text-lg" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Enrollment Status</h3>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-lg border bg-${statusInfo.color}-50 border-${statusInfo.color}-200`}>
                    <StatusIcon className={`text-${statusInfo.color}-600`} />
                    <div className="flex-1">
                        <p className={`font-semibold text-${statusInfo.color}-800`}>{statusInfo.status}</p>
                        <p className={`text-sm mt-1 text-${statusInfo.color}-700`}>{statusInfo.message}</p>
                    </div>
                </div>

                {existingEnrollment && (
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Strand:</span>
                            <span className="font-medium text-gray-900">
                                {existingEnrollment.strand?.name || 'Not specified'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Grade Level:</span>
                            <span className="font-medium text-gray-900">
                                Grade {existingEnrollment.intended_grade_level}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Section:</span>
                            <span className="font-medium text-gray-900">
                                {existingEnrollment.assigned_section?.section_name || existingEnrollment.assignedSection?.section_name || 'Not assigned yet'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // HCI Principle 8: Aesthetic and minimalist design - Clean enrollment form
    const EnrollmentForm = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <FaBookOpen className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enrollment Application</h3>
            </div>

            <div className="space-y-6">
                {/* Student Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="fullName">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            value={`${user?.firstname || ''} ${user?.lastname || ''}`}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            aria-label="Full name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            aria-label="Email address"
                        />
                    </div>
                </div>

                {/* Student Type Selection */}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Type
                    </label>
                    <select
                        value={formData.student_type}
                        onChange={(e) => setFormData({...formData, student_type: e.target.value})}
                        disabled={!statusInfo.canEnroll}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value="new">New Student</option>
                        <option value="returnee">Returning Student</option>
                        <option value="transferee">Transferee</option>
                    </select>
                </div>

                {/* Enrollment Action */}
                <div className="pt-4 border-t border-gray-200">
                    {statusInfo.canEnroll ? (
                        <>
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <FaUserGraduate />
                                Start Enrollment Application
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Complete the multi-step enrollment process
                            </p>
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-sm text-blue-700 text-center">
                                    <p className="font-medium mb-2">📝 <strong>Note:</strong> The enrollment form will appear below after clicking the button above.</p>
                                    <p className="text-xs">You will provide your strand preferences and grade level in the detailed enrollment steps.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="text-gray-500 mb-2">
                                {!enrollmentOpen ? (
                                    <>
                                        <FaExclamationTriangle className="inline mr-2" />
                                        Enrollment is currently closed
                                    </>
                                ) : existingEnrollment ? (
                                    <>
                                        <FaCheckCircle className="inline mr-2" />
                                        You have already submitted an enrollment application
                                    </>
                                ) : (
                                    <>
                                        <FaInfoCircle className="inline mr-2" />
                                        Enrollment is not available
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">
                                {!enrollmentOpen 
                                    ? 'Please wait for the registrar to open enrollment'
                                    : existingEnrollment 
                                    ? 'Check your enrollment status above'
                                    : 'Contact the registrar for assistance'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Step indicator component
    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
                {[
                    { step: 1, title: 'Personal Info' },
                    { step: 2, title: 'Strand Preferences' },
                    { step: 3, title: 'Documents & Review' }
                ].map((item, index) => (
                    <React.Fragment key={item.step}>
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${
                                currentStep >= item.step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                                {item.step}
                            </div>
                            <span className="text-xs mt-1 text-gray-600">{item.title}</span>
                        </div>
                        {index < 2 && (
                            <div className={`w-16 h-1 ${currentStep > item.step ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    // Navigation buttons component
    const NavigationButtons = () => (
        <div className="flex justify-between mt-8">
            <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>

            {currentStep < 3 ? (
                <button
                    onClick={() => {
                        if (validateStep(currentStep)) {
                            setCurrentStep(currentStep + 1);
                        }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Next
                </button>
            ) : (
                <button
                    onClick={handleEnrollment}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <FaSpinner className="animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <FaUserGraduate />
                            Submit Enrollment
                        </>
                    )}
                </button>
            )}
        </div>
    );

    // Personal information step component
    const PersonalInfoStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
                <p className="text-gray-600">Please provide your personal details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="lrn">
                        LRN (Learner Reference Number) <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="lrn"
                        name="lrn"
                        ref={lrnInputRef}
                        type="text"
                        defaultValue={formData.lrn || ''}
                        onChange={handleLrnInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.lrn ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter 12-digit LRN"
                        maxLength={12}
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-required="true"
                        aria-invalid={!!errors.lrn}
                        aria-describedby={errors.lrn ? 'lrn-error' : undefined}
                    />
                    {errors.lrn && <p id="lrn-error" className="text-red-500 text-sm mt-1">{errors.lrn}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Birthdate <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="birthdate"
                        name="birthdate"
                        type="date"
                        value={formData.birthdate || ''}
                        onChange={handleBirthdateInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.birthdate ? 'border-red-500' : 'border-gray-300'
                        }`}
                        autoComplete="bday"
                        max={new Date().toISOString().split('T')[0]}
                        aria-required="true"
                        aria-invalid={!!errors.birthdate}
                        aria-describedby={errors.birthdate ? 'birthdate-error' : undefined}
                    />
                    {errors.birthdate && <p id="birthdate-error" className="text-red-500 text-sm mt-1">{errors.birthdate}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sex <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="sex"
                        name="sex"
                        value={formData.sex}
                        onChange={handleSexInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.sex ? 'border-red-500' : 'border-gray-300'
                        }`}
                        aria-required="true"
                        aria-invalid={!!errors.sex}
                        aria-describedby={errors.sex ? 'sex-error' : undefined}
                    >
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="address">
                        Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="address"
                        name="address"
                        ref={addressInputRef}
                        defaultValue={formData.address || ''}
                        onChange={handleAddressInput}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.address ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter complete address"
                        aria-required="true"
                        aria-invalid={!!errors.address}
                        aria-describedby={errors.address ? 'address-error' : undefined}
                    />
                    {errors.address && <p id="address-error" className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
            </div>

            <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="guardian_name">
                            Guardian Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="guardian_name"
                            name="guardian_name"
                            ref={guardianNameInputRef}
                            type="text"
                            defaultValue={formData.guardian_name || ''}
                            onChange={handleGuardianNameInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.guardian_name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Guardian's full name"
                            aria-required="true"
                            aria-invalid={!!errors.guardian_name}
                            aria-describedby={errors.guardian_name ? 'guardian-name-error' : undefined}
                        />
                        {errors.guardian_name && <p id="guardian-name-error" className="text-red-500 text-sm mt-1">{errors.guardian_name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="guardian_contact">
                            Guardian Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="guardian_contact"
                            name="guardian_contact"
                            type="tel"
                            defaultValue={formData.guardian_contact || ''}
                            onChange={handleGuardianContactInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.guardian_contact ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="11-digit phone number"
                            maxLength="11"
                            inputMode="numeric"
                            autoComplete="tel"
                            aria-required="true"
                            aria-invalid={!!errors.guardian_contact}
                            aria-describedby={errors.guardian_contact ? 'guardian-contact-error' : undefined}
                        />
                        {errors.guardian_contact && <p id="guardian-contact-error" className="text-red-500 text-sm mt-1">{errors.guardian_contact}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Guardian Relationship <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="guardian_relationship"
                            name="guardian_relationship"
                            value={formData.guardian_relationship}
                            onChange={handleGuardianRelationshipInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.guardian_relationship ? 'border-red-500' : 'border-gray-300'
                            }`}
                            aria-required="true"
                            aria-invalid={!!errors.guardian_relationship}
                            aria-describedby={errors.guardian_relationship ? 'guardian-relationship-error' : undefined}
                        >
                            <option value="">Select Relationship</option>
                            <option value="Parent">Parent</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Grandparent">Grandparent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Relative">Relative</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.guardian_relationship && <p id="guardian-relationship-error" className="text-red-500 text-sm mt-1">{errors.guardian_relationship}</p>}
                    </div>
                </div>
            </div>

            {/* Additional Personal Information */}
            <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Extension Name (Jr., Sr., III, etc.)
                    </label>
                    <select
                        id="extension_name"
                        name="extension_name"
                        value={formData.extension_name || ''}
                        onChange={handleExtensionNameInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">None</option>
                        <option value="Jr.">Jr. (Junior)</option>
                        <option value="Sr.">Sr. (Senior)</option>
                        <option value="II">II (The Second)</option>
                        <option value="III">III (The Third)</option>
                        <option value="IV">IV (The Fourth)</option>
                        <option value="V">V (The Fifth)</option>
                        <option value="VI">VI (The Sixth)</option>
                        <option value="VII">VII (The Seventh)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Birth Place <span className="text-red-500">*</span>
                    </label>
                    <input
                        ref={birthPlaceInputRef}
                        type="text"
                        defaultValue={formData.birth_place || ''}
                        onChange={handleBirthPlaceInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.birth_place ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="City/Municipality, Province"
                        autoComplete="off"
                    />
                    {errors.birth_place && <p className="text-red-500 text-sm mt-1">{errors.birth_place}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Religion <span className="text-red-500">*</span>
                    </label>
                    <input
                        ref={religionInputRef}
                        type="text"
                        defaultValue={formData.religion || ''}
                        onChange={handleReligionInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.religion ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Your religion"
                        autoComplete="off"
                    />
                    {errors.religion && <p className="text-red-500 text-sm mt-1">{errors.religion}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indigenous People (IP) Community
                    </label>
                    <select
                        value={formData.ip_community || ''}
                        onChange={handleIpCommunityInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        PWD ID Number
                    </label>
                    <input
                        ref={pwdIdInputRef}
                        type="text"
                        defaultValue={formData.pwd_id || ''}
                        onChange={handlePwdIdInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="If applicable, enter PWD ID"
                        autoComplete="off"
                    />
                </div>

                <div>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.four_ps || false}
                            onChange={handleFourPsInput}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            4Ps Beneficiary (Pantawid Pamilyang Pilipino Program)
                        </span>
                    </label>
                </div>
            </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        ref={emergencyContactNameInputRef}
                        type="text"
                        defaultValue={formData.emergency_contact_name || ''}
                        onChange={handleEmergencyNameInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Full name of emergency contact"
                        autoComplete="off"
                    />
                    {errors.emergency_contact_name && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        ref={emergencyContactNumberInputRef}
                        type="text"
                        defaultValue={formData.emergency_contact_number || ''}
                        onChange={handleEmergencyNumberInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.emergency_contact_number ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="11-digit phone number"
                        maxLength="11"
                        inputMode="numeric"
                        autoComplete="off"
                    />
                    {errors.emergency_contact_number && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_number}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.emergency_contact_relationship || ''}
                        onChange={handleEmergencyRelationshipInput}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.emergency_contact_relationship ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                        <option value="">Select Relationship</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                    </select>
                    {errors.emergency_contact_relationship && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_relationship}</p>}
                </div>
            </div>
        </div>

        {/* Previous School Information (for transferees) */}
        {formData.student_type === 'transferee' && (
            <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Previous School Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Previous School <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={previousSchoolInputRef}
                            type="text"
                            defaultValue={formData.previous_school || ''}
                            onChange={handlePreviousSchoolInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.previous_school ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Name of previous school"
                            autoComplete="off"
                        />
                        {errors.previous_school && <p className="text-red-500 text-sm mt-1">{errors.previous_school}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Grade Completed <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.last_grade || ''}
                            onChange={handleLastGradeInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.last_grade ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Select Grade</option>
                            <option value="Grade 10">Grade 10</option>
                            <option value="Grade 11">Grade 11</option>
                        </select>
                        {errors.last_grade && <p className="text-red-500 text-sm mt-1">{errors.last_grade}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last School Year <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={lastSyInputRef}
                            type="text"
                            defaultValue={formData.last_sy || ''}
                            onChange={handleLastSyInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.last_sy ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., 2023-2024"
                            autoComplete="off"
                        />
                        {errors.last_sy && <p className="text-red-500 text-sm mt-1">{errors.last_sy}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last School Attended <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={lastSchoolInputRef}
                            type="text"
                            defaultValue={formData.last_school || ''}
                            onChange={handleLastSchoolInput}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors.last_school ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Complete name of last school"
                            autoComplete="off"
                        />
                        {errors.last_school && <p className="text-red-500 text-sm mt-1">{errors.last_school}</p>}
                    </div>
                </div>
            </div>
        )}
        </div>
    );

    // Strand preferences step component
    const StrandPreferencesStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Strand Preferences</h3>
                <p className="text-gray-600">Choose your top 3 strand preferences in order</p>
            </div>

            {errors.strand_preferences && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600 text-sm">{errors.strand_preferences}</p>
                </div>
            )}

            <div className="space-y-4">
                {[
                    { key: 'first_strand_choice', label: '1st Choice', color: 'bg-green-500' },
                    { key: 'second_strand_choice', label: '2nd Choice', color: 'bg-blue-500' },
                    { key: 'third_strand_choice', label: '3rd Choice', color: 'bg-purple-500' }
                ].map((choice, index) => (
                    <div key={choice.key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-8 h-8 ${choice.color} rounded-full flex items-center justify-center text-white font-bold`}>
                                {index + 1}
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">{choice.label}</h4>
                        </div>

                        <select
                            value={formData[choice.key] || ''}
                            onChange={(e) => handleStrandChoice(choice.key, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                errors[choice.key] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Select a strand</option>
                            {strands && strands.map(strand => (
                                <option key={strand.id} value={strand.id}>
                                    {strand.name} - {strand.description || 'Academic Track'}
                                </option>
                            ))}
                        </select>
                        {errors[choice.key] && <p className="text-red-500 text-sm mt-1">{errors[choice.key]}</p>}

                        {formData[choice.key] && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    {strands && strands.find(s => s.id == formData[choice.key])?.description || 'Selected strand information'}
                                </p>
                            </div>
                        )}

                        {/* STEM Special Requirements Note - ENHANCED */}
                        {choice.key === 'first_strand_choice' && formData[choice.key] && strands && 
                         strands.find(s => s.id == formData[choice.key])?.name?.toUpperCase().includes('STEM') && (
                            <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-base font-bold text-yellow-800 mb-3 flex items-center gap-2">
                                            🧬 STEM Strand - Special Requirements
                                        </h5>
                                        <div className="bg-white rounded-lg p-3 mb-3 border border-yellow-200">
                                            <h6 className="font-semibold text-yellow-800 mb-2">📋 Admission Requirements:</h6>
                                            <div className="text-sm text-yellow-700 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-yellow-600 font-bold">1.</span>
                                                    <div>
                                                        <strong>Face-to-Face Examination:</strong> You must visit the school to take a qualifying exam in Mathematics and Science.
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-yellow-600 font-bold">2.</span>
                                                    <div>
                                                        <strong>Personal Interview:</strong> A one-on-one interview with STEM faculty to assess your interest and commitment to the program.
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-yellow-600 font-bold">3.</span>
                                                    <div>
                                                        <strong>Grade Requirements:</strong> Mathematics and Science grades must be 85 or above in your previous academic records.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-semibold text-red-800 text-sm">Important Notice:</span>
                                            </div>
                                            <p className="text-red-700 text-sm">
                                                <strong>All requirements are mandatory.</strong> Students who fail to meet these requirements will be automatically assigned to their 2nd or 3rd choice strand.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    // Documents and review step component
    const DocumentsAndReviewStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Documents & Final Review</h3>
                <p className="text-gray-600">Upload required documents and review your information</p>
            </div>

            {/* Grade Level Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Grade Level</h4>
                <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="intended_grade_level"
                            value={11}
                            checked={formData.intended_grade_level == 11}
                            onChange={(e) => handleInputChange('intended_grade_level', parseInt(e.target.value))}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Grade 11</div>
                            <div className="text-sm text-gray-600">First year Senior High School</div>
                        </div>
                    </label>

                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="intended_grade_level"
                            value={12}
                            checked={formData.intended_grade_level == 12}
                            onChange={(e) => handleInputChange('intended_grade_level', parseInt(e.target.value))}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium">Grade 12</div>
                            <div className="text-sm text-gray-600">Second year Senior High School</div>
                        </div>
                    </label>
                </div>
                {errors.intended_grade_level && <p className="text-red-500 text-sm mt-2">{errors.intended_grade_level}</p>}
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Required Documents</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            PSA Birth Certificate
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange('psa_birth_certificate', e.target.files[0])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {formData.psa_birth_certificate && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                ✓ Selected: {formData.psa_birth_certificate.name}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max: 5MB)</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Card (Form 138)
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange('report_card', e.target.files[0])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {formData.report_card && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                ✓ Selected: {formData.report_card.name}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max: 5MB)</p>
                    </div>
                </div>
            </div>

            {/* Review Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p><strong>Name:</strong> {user.firstname} {user.lastname}</p>
                        <p><strong>LRN:</strong> {formData.lrn}</p>
                        <p><strong>Grade Level:</strong> Grade {formData.intended_grade_level}</p>
                        <p><strong>Student Type:</strong> {formData.student_type}</p>
                    </div>
                    <div>
                        <p><strong>1st Choice:</strong> {strands && strands.find(s => s.id == formData.first_strand_choice)?.name || 'Not selected'}</p>
                        <p><strong>2nd Choice:</strong> {strands && strands.find(s => s.id == formData.second_strand_choice)?.name || 'Not selected'}</p>
                        <p><strong>3rd Choice:</strong> {strands && strands.find(s => s.id == formData.third_strand_choice)?.name || 'Not selected'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Head title="Enrollment" />

            <div className="min-h-screen bg-gray-50 flex">
                <StudentSidebar
                    auth={{ user }}
                    onToggle={setSidebarCollapsed}
                />

                {/* Main Content */}
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Semester Enrollment</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Enroll for the current academic semester
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Status and Period Info */}
                            <div className="space-y-6">
                                <EnrollmentStatusCard />
                                <EnrollmentPeriodCard />
                            </div>

                            {/* Right Column - Enrollment Form */}
                            <div className="lg:col-span-2">
                                <EnrollmentForm />
                            </div>
                        </div>

                        {/* Multi-step Enrollment Form */}
                        {statusInfo.canEnroll && currentStep > 0 && (
                            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Enrollment Application</h2>
                                        <p className="text-gray-600">Complete all steps to submit your enrollment</p>
                                    </div>
                                    <button
                                        onClick={() => setCurrentStep(0)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <StepIndicator />

                                {currentStep === 1 && <PersonalInfoStep />}
                                {currentStep === 2 && <StrandPreferencesStep />}
                                {currentStep === 3 && <DocumentsAndReviewStep />}

                                <NavigationButtons />

                                <p className="text-xs text-gray-500 text-center mt-4">
                                    By submitting, you agree to the terms and conditions of enrollment.
                                </p>
                            </div>
                        )}

                        {/* Information Panel */}
                        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Enrollment is subject to coordinator approval</li>
                                        <li>• You will be notified via email once your enrollment is processed</li>
                                        <li>• Section assignment will be done after approval</li>
                                        <li>• Contact the registrar if you have questions about enrollment</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                </div>
            </div>
        </div>
        
        {/* Additional CSS for form stability and input handling */}
        <style jsx="true">{`
            /* Prevent input movement and layout shifts */
            input, textarea, select {
                transition: none !important;
                transform: none !important;
                max-width: 100% !important;
            }
            
            /* Ensure consistent spacing */
            .space-y-6 > * + * {
                margin-top: 1.5rem !important;
            }
            
            .space-y-4 > * + * {
                margin-top: 1rem !important;
            }
            
            /* Enhanced focus styling for better UX (Nielsen's HCI Principle 1: Visibility of system status) */
            input:focus, textarea:focus, select:focus {
                outline: 2px solid #3B82F6;
                outline-offset: 2px;
            }
            
            /* Allow text wrapping and overflow */
            input[type="text"],
            input[type="number"],
            input[type="tel"],
            textarea {
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
        `}</style>
    </>
    );
}
