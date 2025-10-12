import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import Student_Sidebar from '../layouts/Student_Sidebar';
import {
  FaGraduationCap, FaUser, FaSpinner, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaArrowRight, FaArrowLeft, FaFileAlt, FaClipboardCheck, FaUpload, FaInfoCircle
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Student_Enroll() {
  const { auth, enrollmentStatus, availableStrands, activeSchoolYear } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [enrollmentDayStatus, setEnrollmentDayStatus] = useState(null);
  const [checkingDay, setCheckingDay] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState({
    reportCard: null,
    psaBirthCertificate: null
  });
  const [formData, setFormData] = useState({
    // Pre-fill with user data - COMPLETE ORIGINAL FIELDS
    studentName: auth?.user ? `${auth.user.firstname || ''} ${auth.user.middlename ? auth.user.middlename + ' ' : ''}${auth.user.lastname || ''}` : '',
    firstname: auth?.user?.firstname || '',
    lastname: auth?.user?.lastname || '',
    middlename: auth?.user?.middlename || '',
    firstName: auth?.user?.firstname || '',
    lastName: auth?.user?.lastname || '',
    middleName: auth?.user?.middlename || '',
    schoolYear: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '',
    lastSY: activeSchoolYear ? `${activeSchoolYear.year_start - 1}-${activeSchoolYear.year_start}` : '',
    // Strand choices
    firstChoice: '',
    secondChoice: '',
    thirdChoice: '',
    // Student information
    studentStatus: 'New Student',
    gradeLevel: 'Grade 11',
    lrn: '',
    birthdate: '',
    birthPlace: '',
    sex: '',
    extensionName: '',
    religion: '',
    address: '',
    // Guardian information
    guardianName: '',
    guardianContact: '',
    guardianRelationship: '',
    // Emergency contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    // Academic information
    lastGrade: '',
    lastSchool: '',
    // Special categories
    ipCommunity: '',
    fourPs: '',
    pwdId: '',
    // Additional required fields
    age: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [enrollmentEligibility, setEnrollmentEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // HCI Principle 8: Aesthetic and minimalist design - Clear step structure
  const steps = [
    {
      id: 1,
      title: "Personal Information",
      icon: FaUser,
      description: "Basic student details",
      color: "blue"
    },
    {
      id: 2,
      title: "Strand Preferences",
      icon: FaGraduationCap,
      description: "Choose your academic track",
      color: "green"
    },
    {
      id: 3,
      title: "Additional Details",
      icon: FaFileAlt,
      description: "Complete your information",
      color: "purple"
    },
    {
      id: 4,
      title: "Document Upload",
      icon: FaClipboardCheck,
      description: "Submit required documents",
      color: "indigo"
    }
  ];

  // Check enrollment eligibility based on grade level selection
  const checkEnrollmentEligibility = async (gradeLevel) => {
    try {
      setCheckingEligibility(true);
      const response = await fetch('/student/check-enrollment-eligibility', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ grade_level: gradeLevel })
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnrollmentEligibility(data);
        
        // Show appropriate message based on eligibility
        if (!data.eligible) {
          Swal.fire({
            title: 'Enrollment Not Available',
            html: `
              <div class="text-left space-y-3">
                <p class="text-gray-700">${data.reason}</p>
                ${data.enrollment_status ? `
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p class="text-blue-800 font-medium">Current Status:</p>
                    <p class="text-blue-700">${data.enrollment_status}</p>
                  </div>
                ` : ''}
              </div>
            `,
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Understood'
          });
        } else if (data.enrollment_type === 'auto_enroll') {
          Swal.fire({
            title: 'Auto-Enrollment Available',
            html: `
              <div class="text-left space-y-3">
                <p class="text-gray-700">${data.reason}</p>
                ${data.grade11_info ? `
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p class="text-green-800 font-medium">Your Grade 11 Information:</p>
                    <p class="text-green-700">School Year: ${data.grade11_info.school_year}</p>
                    <p class="text-green-700">Strand: ${data.grade11_info.strand}</p>
                  </div>
                ` : ''}
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p class="text-yellow-800 font-medium">Next Steps:</p>
                  <p class="text-yellow-700">Please wait for faculty to process your Grade 12 enrollment.</p>
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Got it!'
          });
        } else if (data.notice) {
          Swal.fire({
            title: 'Enrollment Notice',
            html: `
              <div class="text-left space-y-3">
                <p class="text-gray-700">${data.reason}</p>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-blue-800 font-medium">Important Notice:</p>
                  <p class="text-blue-700">${data.notice}</p>
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Continue with Enrollment'
          });
        }
      }
    } catch (error) {
      console.error('Error checking enrollment eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Check enrollment day availability on component mount
  React.useEffect(() => {
    const checkEnrollmentDay = async () => {
      try {
        // Use public route that bypasses authentication
        const response = await fetch('/public/enrollment-day-check', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setEnrollmentDayStatus(data);
        setCheckingDay(false);
        
        // Show restriction message if applicable
        if (!data.allowed && data.reason === 'day_restriction') {
          Swal.fire({
            title: 'Enrollment Not Available Today',
            html: `
              <div class="text-left space-y-3">
                <p class="text-gray-700">${data.message}</p>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-blue-800 font-medium">Available Days:</p>
                  <p class="text-blue-700">Monday through Saturday</p>
                  <p class="text-blue-700">Current day: ${data.current_day}</p>
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Understood'
          });
        }
        
      } catch (error) {
        console.error('Error checking enrollment day:', error);
        // Fallback: allow enrollment if we can't check (since restrictions are removed)
        setEnrollmentDayStatus({
          allowed: true,
          message: 'Enrollment is available (unable to verify restrictions)',
          reason: 'fallback'
        });
        setCheckingDay(false);
      }
    };
    
    checkEnrollmentDay();
  }, []);

  // Check initial enrollment eligibility for default grade level
  React.useEffect(() => {
    // Check eligibility for the default grade level on component mount
    if (formData.gradeLevel) {
      checkEnrollmentEligibility(formData.gradeLevel);
    }
  }, []); // Run once on mount

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Check enrollment eligibility when grade level changes
    if (name === 'gradeLevel' && value) {
      checkEnrollmentEligibility(value);
    }
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const handleChoiceChange = (name, value) => {
    const others = {
      firstChoice: [formData.secondChoice, formData.thirdChoice],
      secondChoice: [formData.firstChoice, formData.thirdChoice],
      thirdChoice: [formData.firstChoice, formData.secondChoice]
    }[name].filter(Boolean);

    if (others.includes(value)) {
      Swal.fire({
        title: 'Duplicate Selection',
        text: 'You have already selected this strand as another choice. Please choose a different strand.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // HCI Principle 5: Error prevention - Real-time validation
  const validateStep = (step) => {
    const stepErrors = {};

    switch (step) {
      case 1:
        if (!formData.lrn || formData.lrn.length !== 12) stepErrors.lrn = "LRN must be exactly 12 digits";
        if (!formData.studentStatus) stepErrors.studentStatus = "Student status is required";
        if (!formData.gradeLevel) stepErrors.gradeLevel = "Grade level is required";
        if (!formData.birthdate) stepErrors.birthdate = "Birthdate is required";
        if (!formData.sex) stepErrors.sex = "Sex is required";
        if (!formData.birthPlace) stepErrors.birthPlace = "Place of birth is required";
        if (!formData.address) stepErrors.address = "Address is required";
        if (!formData.guardianRelationship) stepErrors.guardianRelationship = "Guardian relationship is required";
        break;
      case 2:
        if (!formData.firstChoice) stepErrors.firstChoice = "First choice is required";
        if (!formData.secondChoice) stepErrors.secondChoice = "Second choice is required";
        break;
      case 3:
        if (!formData.lastGrade) stepErrors.lastGrade = "Last grade completed is required";
        break;
      case 4:
        if (!uploadedFiles.reportCard) stepErrors.reportCard = "Report card is required";
        if (!uploadedFiles.psaBirthCertificate) stepErrors.psaBirthCertificate = "PSA birth certificate is required";
        break;
    }

    return stepErrors;
  };

  const handleFileUpload = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'File Too Large',
          text: 'Please select a file smaller than 5MB.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: 'Invalid File Type',
          text: 'Please select a JPG, PNG, or PDF file.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        return;
      }

      setUploadedFiles(prev => ({ ...prev, [fileType]: file }));
      if (errors[fileType]) {
        setErrors(prev => ({ ...prev, [fileType]: null }));
      }
    }
  };

  const nextStep = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShowValidation(true);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
    setShowValidation(false);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setShowValidation(false);
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate current step first
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShowValidation(true);
      return;
    }
    
    setSubmitting(true);

    // Create FormData for file uploads
    const submitData = new FormData();
    
    // Add all form fields (including empty ones for validation)
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key] || '');
    });
    
    // Add uploaded files - these are required
    if (uploadedFiles.reportCard) {
      submitData.append('reportCard', uploadedFiles.reportCard);
    }
    if (uploadedFiles.psaBirthCertificate) {
      submitData.append('psaBirthCertificate', uploadedFiles.psaBirthCertificate);
    }

    // Debug: Log what we're sending
    console.log('Submitting enrollment with files:', {
      reportCard: uploadedFiles.reportCard?.name,
      psaBirthCertificate: uploadedFiles.psaBirthCertificate?.name,
      formDataKeys: Object.keys(formData)
    });

    // Use Inertia to submit the form with files
    router.post('/student/enroll', submitData, {
      onSuccess: (page) => {
        // Show success message
        Swal.fire({
          title: 'Enrollment Submitted!',
          html: `
            <div class="text-left space-y-3">
              <p class="text-gray-700">Your enrollment application has been successfully submitted.</p>
              <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">Next Steps:</h4>
                <ul class="text-sm text-blue-700 space-y-1">
                  <li>• Your application is now under review</li>
                  <li>• You will be notified once approved</li>
                  <li>• Check your email for updates</li>
                  <li>• Contact the registrar if you have questions</li>
                </ul>
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Continue',
          confirmButtonColor: '#10B981',
          width: '500px'
        }).then(() => {
          setShowEnrollmentForm(false);
        });
        setSubmitting(false);
      },
      onError: (errors) => {
        console.log('Enrollment errors:', errors);
        
        // Set form errors for display
        setErrors(errors);
        setShowValidation(true);
        
        // Show error message
        const errorMessages = Object.values(errors).flat();
        Swal.fire({
          title: 'Enrollment Failed',
          html: `
            <div class="text-left">
              <p class="mb-3">Please fix the following issues:</p>
              <ul class="text-sm text-red-600 space-y-1">
                ${errorMessages.map(msg => `<li>• ${msg}</li>`).join('')}
              </ul>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'Fix Issues',
          confirmButtonColor: '#EF4444'
        });
        setSubmitting(false);
      }
    });
  };

  const getStatusDisplay = () => {
    // Check day restriction first
    if (enrollmentDayStatus && !enrollmentDayStatus.allowed && enrollmentDayStatus.reason === 'day_restriction') {
      return {
        icon: <FaClock className="w-12 h-12 text-orange-500" />,
        title: "Enrollment Not Available Today",
        message: `Enrollment is only available Monday through Saturday. Next available: ${enrollmentDayStatus.next_available_day}`,
        color: "orange",
        showEnrollButton: false
      };
    }
    
    if (!enrollmentStatus) {
      return {
        icon: <FaExclamationTriangle className="w-12 h-12 text-blue-500" />,
        title: "Ready to Enroll",
        message: "Start your enrollment process for the upcoming academic year.",
        color: "blue",
        showEnrollButton: true
      };
    }

    switch (enrollmentStatus.status) {
      case 'pending':
        return {
          icon: <FaClock className="w-12 h-12 text-yellow-500" />,
          title: "Enrollment Under Review",
          message: "Your enrollment application is being reviewed by the coordinator.",
          color: "yellow",
          showEnrollButton: false
        };
      case 'approved':
      case 'enrolled':
        return {
          icon: <FaCheckCircle className="w-12 h-12 text-green-500" />,
          title: "Enrollment Approved",
          message: "Congratulations! Your enrollment has been approved.",
          color: "green",
          showEnrollButton: false
        };
      default:
        return {
          icon: <FaExclamationTriangle className="w-12 h-12 text-blue-500" />,
          title: "Ready to Enroll",
          message: "Start your enrollment process for the upcoming academic year.",
          color: "blue",
          showEnrollButton: true
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <>
      <Head title="Enrollment - Student Portal" />
      <div className="flex h-screen bg-gray-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Student Enrollment</h1>
                <p className="text-gray-600">Manage your enrollment for the academic year</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaUser className="w-4 h-4" />
                <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6">
                {/* Status Card */}
                <div className={`bg-${statusDisplay.color}-50 border border-${statusDisplay.color}-200 rounded-lg p-8 text-center`}>
                  <div className="flex justify-center mb-4">
                    {statusDisplay.icon}
                  </div>
                  <h2 className={`text-2xl font-bold text-${statusDisplay.color}-800 mb-2`}>
                    {statusDisplay.title}
                  </h2>
                  <p className={`text-${statusDisplay.color}-700 mb-6`}>
                    {statusDisplay.message}
                  </p>
                  
                  {statusDisplay.showEnrollButton && (
                    <button
                      onClick={() => {
                        // Double-check day restriction before allowing enrollment
                        if (enrollmentDayStatus && !enrollmentDayStatus.allowed && enrollmentDayStatus.reason === 'day_restriction') {
                          Swal.fire({
                            title: 'Enrollment Not Available',
                            text: enrollmentDayStatus.message,
                            icon: 'warning',
                            confirmButtonColor: '#F59E0B'
                          });
                          return;
                        }
                        
                        // Check if Grade 12 auto-enrollment is available
                        if (enrollmentEligibility && enrollmentEligibility.enrollment_type === 'auto_enroll') {
                          Swal.fire({
                            title: 'Auto-Enrollment Available',
                            text: 'You are eligible for Grade 12 auto-enrollment. Please wait for faculty to process your enrollment.',
                            icon: 'info',
                            confirmButtonColor: '#3b82f6'
                          });
                          return;
                        }
                        
                        setShowEnrollmentForm(true);
                      }}
                      disabled={checkingDay || (enrollmentDayStatus && !enrollmentDayStatus.allowed) || (enrollmentEligibility && !enrollmentEligibility.eligible)}
                      className={`inline-flex items-center px-6 py-3 font-semibold rounded-lg transition-colors duration-200 ${
                        checkingDay || (enrollmentDayStatus && !enrollmentDayStatus.allowed) || (enrollmentEligibility && !enrollmentEligibility.eligible)
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {checkingDay ? (
                        <>
                          <FaSpinner className="mr-2 animate-spin" />
                          Checking Availability...
                        </>
                      ) : (
                        <>
                          <FaGraduationCap className="mr-2" />
                          Start Enrollment Process
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Enrollment Form */}
                {showEnrollmentForm && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-800">Enrollment Application</h3>
                      <button
                        onClick={() => setShowEnrollmentForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Step Progress Indicator */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                          {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                                currentStep >= step.id
                                  ? `bg-${step.color}-500 border-${step.color}-500 text-white`
                                  : 'border-gray-300 text-gray-400'
                              }`}>
                                {currentStep > step.id ? (
                                  <FaCheckCircle className="w-5 h-5" />
                                ) : (
                                  <step.icon className="w-4 h-4" />
                                )}
                              </div>
                              {index < steps.length - 1 && (
                                <div className={`w-16 h-1 mx-2 transition-all duration-200 ${
                                  currentStep > step.id ? `bg-${step.color}-500` : 'bg-gray-300'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Step {currentStep}: {steps[currentStep - 1].title}
                          </h3>
                          <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
                        </div>
                      </div>

                      {/* Step Content */}
                      {currentStep === 1 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                LRN (Learner Reference Number) *
                              </label>
                              <input
                                type="text"
                                name="lrn"
                                value={formData.lrn}
                                onChange={handleInputChange}
                                maxLength="12"
                                required
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.lrn ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="12-digit LRN"
                              />
                              {showValidation && errors.lrn && (
                                <p className="text-red-500 text-xs mt-1">{errors.lrn}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student Status *
                              </label>
                              <select
                                name="studentStatus"
                                value={formData.studentStatus}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.studentStatus ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="New Student">New Student</option>
                                <option value="Transferee">Transferee</option>
                              </select>
                              {showValidation && errors.studentStatus && (
                                <p className="text-red-500 text-xs mt-1">{errors.studentStatus}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Grade Level *
                              </label>
                              <div className="relative">
                                <select
                                  name="gradeLevel"
                                  value={formData.gradeLevel}
                                  onChange={handleInputChange}
                                  required
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                    showValidation && errors.gradeLevel ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select Grade Level</option>
                                  <option value="Grade 11">Grade 11</option>
                                  <option value="Grade 12">Grade 12</option>
                                </select>
                                {checkingEligibility && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <FaSpinner className="animate-spin text-blue-500" />
                                  </div>
                                )}
                              </div>
                              
                              {/* SHS Enrollment Logic Notice */}
                              {formData.gradeLevel && enrollmentEligibility && (
                                <div className={`mt-2 p-3 rounded-lg text-sm ${
                                  enrollmentEligibility.eligible 
                                    ? (enrollmentEligibility.enrollment_type === 'auto_enroll' 
                                        ? 'bg-green-50 border border-green-200 text-green-800'
                                        : 'bg-blue-50 border border-blue-200 text-blue-800')
                                    : 'bg-red-50 border border-red-200 text-red-800'
                                }`}>
                                  <div className="flex items-start">
                                    <FaInfoCircle className="mr-2 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium mb-1">
                                        {enrollmentEligibility.enrollment_type === 'auto_enroll' 
                                          ? 'Auto-Enrollment Available' 
                                          : enrollmentEligibility.eligible 
                                            ? 'Self-Enrollment Required'
                                            : 'Enrollment Not Available'}
                                      </p>
                                      <p>{enrollmentEligibility.reason}</p>
                                      {enrollmentEligibility.notice && (
                                        <p className="mt-1 text-xs opacity-90">{enrollmentEligibility.notice}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {showValidation && errors.gradeLevel && (
                                <p className="text-red-500 text-xs mt-1">{errors.gradeLevel}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Birth Date *
                              </label>
                              <input
                                type="date"
                                name="birthdate"
                                value={formData.birthdate}
                                onChange={(e) => {
                                  handleInputChange(e);
                                  // Auto-calculate age when birthdate changes
                                  const age = calculateAge(e.target.value);
                                  setFormData(prev => ({ ...prev, age }));
                                }}
                                required
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.birthdate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              />
                              {showValidation && errors.birthdate && (
                                <p className="text-red-500 text-xs mt-1">{errors.birthdate}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sex *
                              </label>
                              <select
                                name="sex"
                                value={formData.sex}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.sex ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select Sex</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                              </select>
                              {showValidation && errors.sex && (
                                <p className="text-red-500 text-xs mt-1">{errors.sex}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name Extension
                              </label>
                              <select
                                name="extensionName"
                                value={formData.extensionName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="">Select Extension (Optional)</option>
                                <option value="Jr.">Jr.</option>
                                <option value="Sr.">Sr.</option>
                                <option value="II">II</option>
                                <option value="III">III</option>
                                <option value="IV">IV</option>
                                <option value="V">V</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Religion
                              </label>
                              <input
                                type="text"
                                name="religion"
                                value={formData.religion}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter your religion"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Place of Birth *
                              </label>
                              <input
                                type="text"
                                name="birthPlace"
                                value={formData.birthPlace}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.birthPlace ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="Enter place of birth"
                              />
                              {showValidation && errors.birthPlace && (
                                <p className="text-red-500 text-xs mt-1">{errors.birthPlace}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Complete Address *
                            </label>
                            <textarea
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              required
                              rows={3}
                              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                showValidation && errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="Enter your complete address"
                            />
                            {showValidation && errors.address && (
                              <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                            )}
                          </div>
                          
                          {/* Guardian Information */}
                          <div className="border-t pt-6">
                            <h4 className="text-lg font-medium text-gray-800 mb-4">Guardian Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Guardian Name *
                                </label>
                                <input
                                  type="text"
                                  name="guardianName"
                                  value={formData.guardianName}
                                  onChange={handleInputChange}
                                  required
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                    showValidation && errors.guardianName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                  }`}
                                  placeholder="Enter guardian's full name"
                                />
                                {showValidation && errors.guardianName && (
                                  <p className="text-red-500 text-xs mt-1">{errors.guardianName}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Guardian Contact *
                                </label>
                                <input
                                  type="tel"
                                  name="guardianContact"
                                  value={formData.guardianContact}
                                  onChange={handleInputChange}
                                  required
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                    showValidation && errors.guardianContact ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                  }`}
                                  placeholder="Enter guardian's contact number"
                                />
                                {showValidation && errors.guardianContact && (
                                  <p className="text-red-500 text-xs mt-1">{errors.guardianContact}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Relationship to Student *
                                </label>
                                <select
                                  name="guardianRelationship"
                                  value={formData.guardianRelationship}
                                  onChange={handleInputChange}
                                  required
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                    showValidation && errors.guardianRelationship ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select Relationship</option>
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Grandfather">Grandfather</option>
                                  <option value="Grandmother">Grandmother</option>
                                  <option value="Uncle">Uncle</option>
                                  <option value="Aunt">Aunt</option>
                                  <option value="Brother">Brother</option>
                                  <option value="Sister">Sister</option>
                                  <option value="Cousin">Cousin</option>
                                  <option value="Legal Guardian">Legal Guardian</option>
                                  <option value="Other">Other</option>
                                </select>
                                {showValidation && errors.guardianRelationship && (
                                  <p className="text-red-500 text-xs mt-1">{errors.guardianRelationship}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Emergency Contact */}
                          <div className="border-t pt-6">
                            <h4 className="text-lg font-medium text-gray-800 mb-4">Emergency Contact</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Emergency Contact Name
                                </label>
                                <input
                                  type="text"
                                  name="emergencyContactName"
                                  value={formData.emergencyContactName}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter emergency contact name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Emergency Contact Number
                                </label>
                                <input
                                  type="tel"
                                  name="emergencyContactNumber"
                                  value={formData.emergencyContactNumber}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter emergency contact number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Relationship
                                </label>
                                <select
                                  name="emergencyContactRelationship"
                                  value={formData.emergencyContactRelationship}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="">Select Relationship</option>
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Sibling">Sibling</option>
                                  <option value="Relative">Relative</option>
                                  <option value="Family Friend">Family Friend</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="space-y-6">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center mb-2">
                              <FaInfoCircle className="text-green-500 mr-2" />
                              <h4 className="font-semibold text-green-800">Choose Your Academic Track</h4>
                            </div>
                            <p className="text-sm text-green-700">
                              Select your preferred strands in order of preference. Each choice should be different.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Choice *
                              </label>
                              <select
                                name="firstChoice"
                                value={formData.firstChoice}
                                onChange={(e) => handleChoiceChange('firstChoice', e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.firstChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select your first choice</option>
                                {availableStrands?.map(strand => (
                                  <option key={strand.id} value={strand.id}>
                                    {strand.name} ({strand.code})
                                  </option>
                                ))}
                              </select>
                              {showValidation && errors.firstChoice && (
                                <p className="text-red-500 text-xs mt-1">{errors.firstChoice}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Second Choice *
                              </label>
                              <select
                                name="secondChoice"
                                value={formData.secondChoice}
                                onChange={(e) => handleChoiceChange('secondChoice', e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.secondChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select your second choice</option>
                                {availableStrands?.map(strand => (
                                  <option key={strand.id} value={strand.id}>
                                    {strand.name} ({strand.code})
                                  </option>
                                ))}
                              </select>
                              {showValidation && errors.secondChoice && (
                                <p className="text-red-500 text-xs mt-1">{errors.secondChoice}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Third Choice *
                              </label>
                              <select
                                name="thirdChoice"
                                value={formData.thirdChoice}
                                onChange={(e) => handleChoiceChange('thirdChoice', e.target.value)}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  showValidation && errors.thirdChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select your third choice</option>
                                {availableStrands?.map(strand => (
                                  <option key={strand.id} value={strand.id}>
                                    {strand.name} ({strand.code})
                                  </option>
                                ))}
                              </select>
                              {showValidation && errors.thirdChoice && (
                                <p className="text-red-500 text-xs mt-1">{errors.thirdChoice}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="space-y-6">
                          {/* Academic Information */}
                          <div>
                            <h4 className="text-lg font-medium text-gray-800 mb-4">Academic Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Last Grade Completed *
                                </label>
                                <select
                                  name="lastGrade"
                                  value={formData.lastGrade}
                                  onChange={handleInputChange}
                                  required
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                    showValidation && errors.lastGrade ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select Last Grade</option>
                                  <option value="Grade 10">Grade 10</option>
                                  <option value="Grade 11">Grade 11</option>
                                </select>
                                {showValidation && errors.lastGrade && (
                                  <p className="text-red-500 text-xs mt-1">{errors.lastGrade}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Last School Attended
                                </label>
                                <input
                                  type="text"
                                  name="lastSchool"
                                  value={formData.lastSchool}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter last school attended"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Special Categories */}
                          <div className="border-t pt-6">
                            <h4 className="text-lg font-medium text-gray-800 mb-4">Special Categories</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Indigenous People (IP) Community
                                </label>
                                <select
                                  name="ipCommunity"
                                  value={formData.ipCommunity}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="">Select IP Community Status</option>
                                  <option value="Yes">Yes, I belong to an IP community</option>
                                  <option value="No">No, I do not belong to an IP community</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  4Ps Beneficiary
                                </label>
                                <select
                                  name="fourPs"
                                  value={formData.fourPs}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="">Select 4Ps Status</option>
                                  <option value="Yes">Yes, I am a 4Ps beneficiary</option>
                                  <option value="No">No, I am not a 4Ps beneficiary</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                  Pantawid Pamilyang Pilipino Program beneficiary status
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  PWD ID Number
                                </label>
                                <input
                                  type="text"
                                  name="pwdId"
                                  value={formData.pwdId}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter PWD ID number if applicable"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="space-y-6">
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center mb-2">
                              <FaClipboardCheck className="text-indigo-500 mr-2" />
                              <h4 className="font-semibold text-indigo-800">Required Documents</h4>
                            </div>
                            <p className="text-sm text-indigo-700">
                              Please upload the following required documents. Files must be in JPG, PNG, or PDF format (Max 5MB each).
                            </p>
                          </div>

                          {/* Report Card Upload */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Report Card *
                            </label>
                            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                              showValidation && errors.reportCard ? 'border-red-300 bg-red-50' : 
                              uploadedFiles.reportCard ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                            }`}>
                              {uploadedFiles.reportCard ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <FaCheckCircle className="text-green-500" />
                                  <span className="text-green-700 font-medium">{uploadedFiles.reportCard.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setUploadedFiles(prev => ({ ...prev, reportCard: null }))}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                  <div className="text-sm text-gray-600">
                                    <label className="cursor-pointer">
                                      <span className="text-blue-600 hover:text-blue-500 font-medium">Click to upload</span>
                                      <span> or drag and drop</span>
                                      <input
                                        type="file"
                                        className="sr-only"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={(e) => handleFileUpload(e, 'reportCard')}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF up to 5MB</p>
                                </div>
                              )}
                            </div>
                            {showValidation && errors.reportCard && (
                              <p className="text-red-500 text-xs mt-1">{errors.reportCard}</p>
                            )}
                          </div>

                          {/* PSA Birth Certificate Upload */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              PSA Birth Certificate *
                            </label>
                            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                              showValidation && errors.psaBirthCertificate ? 'border-red-300 bg-red-50' : 
                              uploadedFiles.psaBirthCertificate ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                            }`}>
                              {uploadedFiles.psaBirthCertificate ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <FaCheckCircle className="text-green-500" />
                                  <span className="text-green-700 font-medium">{uploadedFiles.psaBirthCertificate.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setUploadedFiles(prev => ({ ...prev, psaBirthCertificate: null }))}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                  <div className="text-sm text-gray-600">
                                    <label className="cursor-pointer">
                                      <span className="text-blue-600 hover:text-blue-500 font-medium">Click to upload</span>
                                      <span> or drag and drop</span>
                                      <input
                                        type="file"
                                        className="sr-only"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={(e) => handleFileUpload(e, 'psaBirthCertificate')}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF up to 5MB</p>
                                </div>
                              )}
                            </div>
                            {showValidation && errors.psaBirthCertificate && (
                              <p className="text-red-500 text-xs mt-1">{errors.psaBirthCertificate}</p>
                            )}
                          </div>

                          {/* Upload Status Message */}
                          {(!uploadedFiles.reportCard || !uploadedFiles.psaBirthCertificate) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <FaExclamationTriangle className="text-yellow-500 mr-2" />
                                <div>
                                  <h4 className="font-semibold text-yellow-800">Documents Required</h4>
                                  <p className="text-sm text-yellow-700">
                                    Please upload both required documents before submitting your enrollment.
                                  </p>
                                  <ul className="text-xs text-yellow-600 mt-2 space-y-1">
                                    {!uploadedFiles.reportCard && <li>• Report Card is required</li>}
                                    {!uploadedFiles.psaBirthCertificate && <li>• PSA Birth Certificate is required</li>}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Summary Information */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Enrollment Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Name:</span>
                                <span className="ml-2 font-medium">{formData.firstname} {formData.middlename} {formData.lastname}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">LRN:</span>
                                <span className="ml-2 font-medium">{formData.lrn}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Grade Level:</span>
                                <span className="ml-2 font-medium">{formData.gradeLevel}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Student Status:</span>
                                <span className="ml-2 font-medium">{formData.studentStatus}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Navigation Buttons */}
                      <div className="flex justify-between pt-6 border-t">
                        <button
                          type="button"
                          onClick={currentStep === 1 ? () => setShowEnrollmentForm(false) : prevStep}
                          className="flex items-center px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          <FaArrowLeft className="mr-2" />
                          {currentStep === 1 ? 'Cancel' : 'Previous'}
                        </button>
                        
                        {currentStep < 4 ? (
                          <button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            Next
                            <FaArrowRight className="ml-2" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={submitting || !uploadedFiles.reportCard || !uploadedFiles.psaBirthCertificate}
                            className={`flex items-center px-6 py-2 rounded-lg transition-colors duration-200 ${
                              submitting || !uploadedFiles.reportCard || !uploadedFiles.psaBirthCertificate
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {submitting && <FaSpinner className="w-4 h-4 mr-2 animate-spin" />}
                            {submitting ? 'Submitting...' : 'Submit Enrollment'}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Current Enrollment Info */}
                {enrollmentStatus && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Enrollment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium text-gray-800 capitalize">{enrollmentStatus.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Grade Level</p>
                        <p className="font-medium text-gray-800">{enrollmentStatus.grade_level || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
