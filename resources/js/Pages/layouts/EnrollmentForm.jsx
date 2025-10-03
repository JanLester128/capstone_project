import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import Swal from "sweetalert2";
import {
  FaUpload,
  FaFileImage,
  FaFilePdf,
  FaTimes,
  FaUser,
  FaGraduationCap,
  FaFileAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaIdCard,
  FaMapMarkerAlt,
  FaClipboardCheck,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaEnvelope,
  FaUsers,
  FaUserPlus,
  FaSchool
} from "react-icons/fa";

export default function EnrollmentForm({ isOpen, onClose, user, availableStrands = [], activeSchoolYear = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    // Pre-fill student name from authenticated user
    studentName: user ? `${user.firstname || ''} ${user.middlename ? user.middlename + ' ' : ''}${user.lastname || ''}` : '',
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    middlename: user?.middlename || '',
    firstName: user?.firstname || '',
    lastName: user?.lastname || '',
    middleName: user?.middlename || '',
    // Use active school year from registrar
    schoolYear: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '',
    lastSY: activeSchoolYear ? `${activeSchoolYear.year_start - 1}-${activeSchoolYear.year_start}` : '',
    // Initialize strand choices so selects are controlled and values are posted
    firstChoice: '',
    secondChoice: '',
    thirdChoice: '',
    // Add student status with default value - HCI Principle 5: Error prevention
    studentStatus: 'New Student',
    extensionName: '',
    religion: '',
    // Additional fields for complete database coverage
    ipCommunity: '',
    fourPs: '',
    pwdId: '',
    guardianName: '',
    guardianContact: '',
    guardianRelationship: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    lastSchool: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({
    reportCard: null,
    psaBirthCertificate: null
  });
  const [showValidation, setShowValidation] = useState(false);

  // Enforce allowed grade levels on the client to match server validation
  const allowedGrades = ["Grade 11", "Grade 12"];

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

  // HCI Principle 5: Error prevention - Real-time validation
  const validateStep = (step) => {
    const stepErrors = {};

    switch (step) {
      case 1:
        if (!form.lrn || form.lrn.length !== 12) stepErrors.lrn = "LRN must be exactly 12 digits";
        if (!form.studentStatus) stepErrors.studentStatus = "Student status is required";
        if (!form.gradeLevel) stepErrors.gradeLevel = "Grade level is required";
        if (!form.birthdate) stepErrors.birthdate = "Birthdate is required";
        if (!form.sex) stepErrors.sex = "Sex is required";
        if (!form.birthPlace) stepErrors.birthPlace = "Place of birth is required";
        if (!form.address) stepErrors.address = "Address is required";
        // Guardian information validation
        if (!form.guardianName) stepErrors.guardianName = "Guardian name is required";
        if (!form.guardianContact) stepErrors.guardianContact = "Guardian contact number is required";
        if (!form.guardianRelationship) stepErrors.guardianRelationship = "Guardian relationship is required";
        break;
      case 2:
        if (!form.firstChoice) stepErrors.firstChoice = "First choice is required";
        if (!form.secondChoice) stepErrors.secondChoice = "Second choice is required";
        if (!form.thirdChoice) stepErrors.thirdChoice = "Third choice is required";
        break;
      case 3:
        if (!form.lastGrade) stepErrors.lastGrade = "Last grade completed is required";
        break;
      case 4:
        if (!uploadedFiles.reportCard) stepErrors.reportCard = "Report card is required";
        if (!uploadedFiles.psaBirthCertificate) stepErrors.psaBirthCertificate = "PSA Birth certificate is required";
        break;
    }

    return stepErrors;
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const handleChoiceChange = (name, value) => {
    const others = {
      firstChoice: [form.secondChoice, form.thirdChoice],
      secondChoice: [form.firstChoice, form.thirdChoice],
      thirdChoice: [form.firstChoice, form.secondChoice]
    }[name].filter(Boolean);

    if (value && others.includes(value)) {
      Swal.fire({
        title: 'Duplicate Strand Selection',
        text: 'You cannot select the same strand more than once. Please choose a different strand for each preference.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'I Understand'
      });
      setForm(prev => ({ ...prev, [name]: '' }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));

    // Clear error when user makes valid selection
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Disable options already chosen in other selects
  const isOptionDisabled = (optionId, currentName) => {
    const idStr = String(optionId);
    if (currentName !== 'firstChoice' && form.firstChoice === idStr) return true;
    if (currentName !== 'secondChoice' && form.secondChoice === idStr) return true;
    if (currentName !== 'thirdChoice' && form.thirdChoice === idStr) return true;
    return false;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear error when user starts typing - HCI Principle 3: User control and freedom
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Auto-calculate age when birthdate changes
  useEffect(() => {
    if (form.birthdate) {
      const birthDate = new Date(form.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      setForm(prev => ({
        ...prev,
        age: age
      }));
    }
  }, [form.birthdate]);

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: 'Invalid File Type',
          text: 'Please upload only JPG, PNG, or PDF files.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'File Too Large',
          text: 'Please upload files smaller than 5MB.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
        return;
      }

      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));

      setForm(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  const removeFile = (fieldName) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fieldName]: null
    }));

    setForm(prev => {
      const newForm = { ...prev };
      delete newForm[fieldName];
      return newForm;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Client-side guards
    if (!allowedGrades.includes(form.gradeLevel || '')) {
      setLoading(false);
      Swal.fire({
        title: 'Invalid Grade Level',
        text: 'Please select a valid grade level (Grade 11 or Grade 12).',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const picks = [form.firstChoice, form.secondChoice, form.thirdChoice].filter(Boolean);
    if ((new Set(picks)).size !== picks.length) {
      setLoading(false);
      Swal.fire({
        title: 'Duplicate Strand',
        text: 'Please choose three distinct strand preferences.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const formData = new FormData();

    // Add all form fields to FormData
    Object.keys(form).forEach(key => {
      if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
        formData.append(key, form[key]);
      }
    });

    // Add strand preferences directly (ensure they exist on payload)
    formData.append('firstChoice', form.firstChoice || '');
    formData.append('secondChoice', form.secondChoice || '');
    formData.append('thirdChoice', form.thirdChoice || '');

    router.post('/student/enroll', formData, {
      forceFormData: true,
      onSuccess: (page) => {
        setLoading(false);
        
        // Show success message
        const successTitle = page.props.flash?.success ? 'Pre-Enrollment Submitted Successfully!' : 'Enrollment Submitted!';
        
        Swal.fire({
          title: successTitle,
          html: `
            <div class="text-left">
              <p class="mb-3"><strong>Your enrollment application has been submitted successfully!</strong></p>
              <p class="mb-2">📋 <strong>What happens next:</strong></p>
              <ul class="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Your application will be reviewed by the coordinator</li>
                <li>You will receive an email notification about your enrollment status</li>
                <li>Check your student dashboard regularly for updates</li>
              </ul>
              <p class="mt-3 text-sm text-blue-600"><strong>Thank you for choosing ONSTS!</strong></p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Continue to Dashboard',
          confirmButtonColor: '#10B981',
          width: '500px'
        }).then(() => {
          onClose();
          // Reset form
          setForm({
            studentName: user ? `${user.firstname || ''} ${user.middlename ? user.middlename + ' ' : ''}${user.lastname || ''}` : '',
            firstname: user?.firstname || '',
            lastname: user?.lastname || '',
            middlename: user?.middlename || '',
            firstName: user?.firstname || '',
            lastName: user?.lastname || '',
            middleName: user?.middlename || '',
            schoolYear: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '',
            lastSY: activeSchoolYear ? `${activeSchoolYear.year_start - 1}-${activeSchoolYear.year_start}` : '',
            firstChoice: '',
            secondChoice: '',
            thirdChoice: '',
            studentStatus: 'New Student',
            extensionName: '',
            religion: '',
            ipCommunity: '',
            fourPs: '',
            pwdId: '',
            guardianName: '',
            guardianContact: '',
            lastSchool: ''
          });
          setUploadedFiles({});
          setCurrentStep(1);
        });
      },
      onError: (errors) => {
        setLoading(false);
        setErrors(errors);
        
        // Show error message
        const errorMessage = errors.general || Object.values(errors)[0] || 'An error occurred during enrollment submission.';
        Swal.fire({
          title: 'Enrollment Failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  };

  const renderAdditionalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Last Grade Completed */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaGraduationCap className="inline mr-2 text-blue-600" />
            Last Grade Completed *
          </label>
          <select
            name="lastGrade"
            value={form.lastGrade || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.lastGrade ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select Last Grade</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
          </select>
          {showValidation && errors.lastGrade && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.lastGrade}
            </p>
          )}
        </div>

        {/* Last School Attended */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Last School Attended
          </label>
          <input
            type="text"
            name="lastSchool"
            value={form.lastSchool || ''}
            onChange={handleChange}
            placeholder="Enter last school attended"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Guardian Information */}
        <div className="md:col-span-2">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Guardian Information
          </h4>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Guardian Name *
          </label>
          <input
            type="text"
            name="guardianName"
            value={form.guardianName || ''}
            onChange={handleChange}
            placeholder="Enter guardian's full name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.guardianName ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.guardianName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.guardianName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Guardian Contact Number *
          </label>
          <input
            type="tel"
            name="guardianContact"
            value={form.guardianContact || ''}
            onChange={handleChange}
            placeholder="Enter contact number"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.guardianContact ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.guardianContact && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.guardianContact}
            </p>
          )}
        </div>

        {/* Additional Information */}
        <div className="md:col-span-2">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Additional Information
          </h4>
        </div>

        {/* Indigenous People Community */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Indigenous People (IP) Community
          </label>
          <select
            name="ipCommunity"
            value={form.ipCommunity || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Select IP Community Status</option>
            <option value="Yes">Yes, I belong to an IP community</option>
            <option value="No">No, I do not belong to an IP community</option>
          </select>
        </div>

        {/* 4Ps Beneficiary */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            4Ps Beneficiary
          </label>
          <select
            name="fourPs"
            value={form.fourPs || ''}
            onChange={handleChange}
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

        {/* PWD ID */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            PWD ID Number
          </label>
          <input
            type="text"
            name="pwdId"
            value={form.pwdId || ''}
            onChange={handleChange}
            placeholder="Enter PWD ID number if applicable"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <p className="mt-1 text-xs text-gray-500">
            Person with Disability ID number (if applicable)
          </p>
        </div>
      </div>
    </div>
  );

  const renderDocumentUpload = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-yellow-800 mb-1">Document Requirements</h4>
            <p className="text-sm text-yellow-700">
              Please upload clear, readable copies of the required documents. Accepted formats: JPEG, PNG, PDF (Max 5MB each)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Report Card Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <FaFileAlt className="inline mr-2 text-blue-600" />
            Report Card (Grade 10 or Latest) *
          </label>

          {!uploadedFiles.reportCard ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Click to upload or drag and drop</p>
              <input
                type="file"
                name="reportCard"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileUpload(e, 'reportCard')}
                className="hidden"
                id="reportCard"
              />
              <label
                htmlFor="reportCard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <FaUpload className="mr-2" />
                Choose File
              </label>
            </div>
          ) : (
            <div className="border border-green-300 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">{uploadedFiles.reportCard.name}</p>
                    <p className="text-sm text-green-600">
                      {(uploadedFiles.reportCard.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile('reportCard')}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}

          {showValidation && errors.reportCard && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.reportCard}
            </p>
          )}
        </div>

        {/* PSA Birth Certificate Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <FaFileAlt className="inline mr-2 text-green-600" />
            PSA Birth Certificate *
          </label>

          {!uploadedFiles.psaBirthCertificate ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Click to upload or drag and drop</p>
              <input
                type="file"
                name="psaBirthCertificate"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileUpload(e, 'psaBirthCertificate')}
                className="hidden"
                id="psaBirthCertificate"
              />
              <label
                htmlFor="psaBirthCertificate"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
              >
                <FaUpload className="mr-2" />
                Choose File
              </label>
            </div>
          ) : (
            <div className="border border-green-300 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">{uploadedFiles.psaBirthCertificate.name}</p>
                    <p className="text-sm text-green-600">
                      {(uploadedFiles.psaBirthCertificate.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile('psaBirthCertificate')}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}

          {showValidation && errors.psaBirthCertificate && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.psaBirthCertificate}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonalInformation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LRN Field */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaIdCard className="inline mr-2 text-blue-600" />
            Learner Reference Number (LRN) *
          </label>
          <input
            type="text"
            name="lrn"
            value={form.lrn || ''}
            onChange={handleChange}
            maxLength="12"
            placeholder="Enter your 12-digit LRN"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.lrn ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.lrn && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.lrn}
            </p>
          )}
        </div>

        {/* Student Status - HCI Principle 6: Recognition rather than recall */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaUser className="inline mr-2 text-purple-600" />
            Student Status *
          </label>
          <select
            name="studentStatus"
            value={form.studentStatus || 'New Student'}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.studentStatus ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="New Student">New Student</option>
            <option value="Continuing">Continuing</option>
            <option value="Transferee">Transferee</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Select your enrollment status for this academic year
          </p>
          {showValidation && errors.studentStatus && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.studentStatus}
            </p>
          )}
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaGraduationCap className="inline mr-2 text-green-600" />
            Grade Level *
          </label>
          <select
            name="gradeLevel"
            value={form.gradeLevel || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.gradeLevel ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select Grade Level</option>
            {allowedGrades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          {showValidation && errors.gradeLevel && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.gradeLevel}
            </p>
          )}
        </div>

        {/* Birthdate */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaCalendarAlt className="inline mr-2 text-purple-600" />
            Birthdate *
          </label>
          <input
            type="date"
            name="birthdate"
            value={form.birthdate || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.birthdate ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.birthdate && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.birthdate}
            </p>
          )}
        </div>

        {/* Age (Auto-calculated) */}
        {form.age && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Age
            </label>
            <input
              type="number"
              value={form.age}
              readOnly
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>
        )}

        {/* Sex */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sex *
          </label>
          <select
            name="sex"
            value={form.sex || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.sex ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {showValidation && errors.sex && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.sex}
            </p>
          )}
        </div>

        {/* Name Extension */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Name Extension
          </label>
          <select
            name="extensionName"
            value={form.extensionName || ''}
            onChange={handleChange}
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
          <p className="mt-1 text-xs text-gray-500">
            Select if applicable (Jr., Sr., III, etc.)
          </p>
        </div>

        {/* Religion */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Religion
          </label>
          <input
            type="text"
            name="religion"
            value={form.religion || ''}
            onChange={handleChange}
            placeholder="Enter your religion"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Place of Birth */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaMapMarkerAlt className="inline mr-2 text-red-600" />
            Place of Birth *
          </label>
          <input
            type="text"
            name="birthPlace"
            value={form.birthPlace || ''}
            onChange={handleChange}
            placeholder="Enter place of birth"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.birthPlace ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.birthPlace && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.birthPlace}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FaMapMarkerAlt className="inline mr-2 text-indigo-600" />
            Complete Address *
          </label>
          <textarea
            name="address"
            value={form.address || ''}
            onChange={handleChange}
            rows="3"
            placeholder="Enter your complete address"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${showValidation && errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          />
          {showValidation && errors.address && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.address}
            </p>
          )}
        </div>

        {/* Guardian Information Section */}
        <div className="md:col-span-2 mt-8">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="mr-2 text-blue-600" />
              Guardian Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guardian Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FaUser className="inline mr-2 text-green-600" />
                  Guardian Name *
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={form.guardianName || ''}
                  onChange={handleChange}
                  placeholder="Enter guardian's full name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.guardianName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                />
                {showValidation && errors.guardianName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FaExclamationTriangle className="mr-1" />
                    {errors.guardianName}
                  </p>
                )}
              </div>

              {/* Guardian Contact */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FaPhone className="inline mr-2 text-purple-600" />
                  Guardian Contact Number *
                </label>
                <input
                  type="tel"
                  name="guardianContact"
                  value={form.guardianContact || ''}
                  onChange={handleChange}
                  placeholder="Enter guardian's contact number"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.guardianContact ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                />
                {showValidation && errors.guardianContact && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FaExclamationTriangle className="mr-1" />
                    {errors.guardianContact}
                  </p>
                )}
              </div>

              {/* Guardian Relationship */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FaUsers className="inline mr-2 text-indigo-600" />
                  Relationship to Student *
                </label>
                <select
                  name="guardianRelationship"
                  value={form.guardianRelationship || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.guardianRelationship ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <FaExclamationTriangle className="mr-1" />
                    {errors.guardianRelationship}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="md:col-span-2 mt-6">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaPhone className="mr-2 text-red-600" />
              Emergency Contact (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emergency Contact Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={form.emergencyContactName || ''}
                  onChange={handleChange}
                  placeholder="Enter emergency contact name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Emergency Contact Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Contact Number
                </label>
                <input
                  type="tel"
                  name="emergencyContactNumber"
                  value={form.emergencyContactNumber || ''}
                  onChange={handleChange}
                  placeholder="Enter emergency contact number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Emergency Contact Relationship */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relationship
                </label>
                <select
                  name="emergencyContactRelationship"
                  value={form.emergencyContactRelationship || ''}
                  onChange={handleChange}
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
      </div>
    </div>
  );

  const renderStrandPreferences = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <FaInfoCircle className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Strand Selection Guide</h4>
            <p className="text-sm text-blue-700">
              Choose three different strands in order of preference. Your first choice will be prioritized during enrollment.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* First Choice */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full mr-2">1</span>
            First Choice *
          </label>
          <select
            name="firstChoice"
            value={form.firstChoice || ''}
            onChange={(e) => handleChoiceChange('firstChoice', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.firstChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select your first choice</option>
            {availableStrands.map(strand => (
              <option
                key={strand.id}
                value={strand.id}
                disabled={isOptionDisabled(strand.id, 'firstChoice')}
              >
                {strand.name}
              </option>
            ))}
          </select>
          {showValidation && errors.firstChoice && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.firstChoice}
            </p>
          )}
        </div>

        {/* Second Choice */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-600 text-white text-xs font-bold rounded-full mr-2">2</span>
            Second Choice *
          </label>
          <select
            name="secondChoice"
            value={form.secondChoice || ''}
            onChange={(e) => handleChoiceChange('secondChoice', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.secondChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select your second choice</option>
            {availableStrands.map(strand => (
              <option
                key={strand.id}
                value={strand.id}
                disabled={isOptionDisabled(strand.id, 'secondChoice')}
              >
                {strand.name}
              </option>
            ))}
          </select>
          {showValidation && errors.secondChoice && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.secondChoice}
            </p>
          )}
        </div>

        {/* Third Choice */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-600 text-white text-xs font-bold rounded-full mr-2">3</span>
            Third Choice *
          </label>
          <select
            name="thirdChoice"
            value={form.thirdChoice || ''}
            onChange={(e) => handleChoiceChange('thirdChoice', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${showValidation && errors.thirdChoice ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
          >
            <option value="">Select your third choice</option>
            {availableStrands.map(strand => (
              <option
                key={strand.id}
                value={strand.id}
                disabled={isOptionDisabled(strand.id, 'thirdChoice')}
              >
                {strand.name}
              </option>
            ))}
          </select>
          {showValidation && errors.thirdChoice && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="mr-1" />
              {errors.thirdChoice}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInformation();
      case 2:
        return renderStrandPreferences();
      case 3:
        return (
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Additional Information</h3>
            {renderAdditionalDetails()}
          </section>
        );
      case 4:
        return (
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Required Documents</h3>
            {renderDocumentUpload()}
          </section>
        );
      default:
        return null;
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const nextStep = () => {
    console.log('nextStep called, current step:', currentStep);
    console.log('Total steps:', steps.length);
    
    const stepErrors = validateStep(currentStep);
    console.log('Step errors:', stepErrors);
    
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShowValidation(true);
      console.log('Validation failed, staying on step:', currentStep);
      return;
    }
    
    console.log('Moving to next step:', currentStep + 1);
    setCurrentStep(prev => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[95vh] overflow-hidden shadow-2xl animate-in fade-in duration-300 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Student Enrollment Form</h2>
                <p className="text-blue-100 mt-1">
                  School Year: {activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : 'N/A'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
                disabled={loading}
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicators - HCI Principle 1: Visibility of system status */}
        <div className="bg-gray-50 px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                      ${isActive
                        ? `bg-${step.color}-600 border-${step.color}-600 text-white`
                        : isCompleted
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <FaCheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-semibold ${isActive ? `text-${step.color}-600` : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'
                      }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 overflow-y-auto p-6">
            {/* HCI Principle 6: Recognition rather than recall - Clear step content */}
            {renderStepContent()}
          </div>

          {/* Navigation Buttons - HCI Principle 3: User control and freedom */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              className={`
                flex items-center px-4 py-2 rounded-lg font-medium transition-colors
                ${currentStep === 1 || loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
                }
              `}
            >
              <FaArrowLeft className="mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}
              </span>
            </div>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked, currentStep:', currentStep, 'steps.length:', steps.length);
                  nextStep();
                }}
                disabled={loading}
                className={`
                  flex items-center px-6 py-2 rounded-lg font-medium transition-colors
                  ${loading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {loading ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Next
                    <FaArrowRight className="ml-2" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex items-center px-6 py-2 rounded-lg font-medium transition-colors
                  ${loading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }
                `}
              >
                {loading ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="mr-2" />
                    Submit Enrollment
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
