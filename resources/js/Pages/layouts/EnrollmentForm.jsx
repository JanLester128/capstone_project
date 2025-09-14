import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import Swal from "sweetalert2";
import { FaUpload, FaFileImage, FaFilePdf, FaTimes } from "react-icons/fa";

export default function EnrollmentForm({ isOpen, onClose, user, availableStrands = [], activeSchoolYear = null }) {
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
    lastSY: activeSchoolYear ? `${activeSchoolYear.year_start - 1}-${activeSchoolYear.year_start}` : ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({
    psaBirthCertificate: null,
    reportCard: null
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
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

    const formData = new FormData();
    
    // Add all form fields to FormData
    Object.keys(form).forEach(key => {
      if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
        formData.append(key, form[key]);
      }
    });

    // Add strand preferences directly
    formData.append('firstChoice', form.firstChoice);
    formData.append('secondChoice', form.secondChoice);
    formData.append('thirdChoice', form.thirdChoice);

    router.post('/student/enroll', formData, {
      forceFormData: true,
      onError: (err) => {
        setErrors(err);
        setLoading(false);
        Swal.fire({
          title: 'Enrollment Failed',
          text: 'Please check the form for errors and try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onSuccess: (page) => {
        setLoading(false);
        // Check for success message in flash data
        if (page.props.flash?.success) {
          Swal.fire({
            title: 'Pre-Enrollment Submitted Successfully!',
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>Your pre-enrollment application has been submitted successfully!</strong></p>
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
            setForm({
              studentName: user ? `${user.firstname || ''} ${user.middlename ? user.middlename + ' ' : ''}${user.lastname || ''}` : '',
              firstname: user?.firstname || '',
              lastname: user?.lastname || '',
              middlename: user?.middlename || '',
              firstName: user?.firstname || '',
              lastName: user?.lastname || '',
              middleName: user?.middlename || '',
              schoolYear: activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : '',
              lastSY: activeSchoolYear ? `${activeSchoolYear.year_start - 1}-${activeSchoolYear.year_start}` : ''
            });
            setUploadedFiles({
              psaBirthCertificate: null,
              reportCard: null
            });
          });
        } else if (page.props.flash?.error) {
          Swal.fire({
            title: 'Enrollment Failed',
            text: page.props.flash.error,
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4 sm:px-6">
      {/* Background */}
      <div className="absolute inset-0 backdrop-blur-xl"></div>

      {/* Modal */}
      <div className="relative bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Basic Education Enrollment Form</h2>
          <button
            className="text-red-500 font-bold text-xl sm:text-2xl hover:text-red-700 transition"
            onClick={onClose}
          >
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Front Page */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Front Page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                { label: "School Year", name: "schoolYear", required: true, value: form.schoolYear, readonly: true },
                { label: "LRN (12 digits)", name: "lrn", required: true, maxLength: 12, pattern: "[0-9]{12}", title: "Please enter exactly 12 digits" },
                { label: "Grade Level to Enroll", name: "gradeLevel", required: true, type: "select", options: ["Select Grade Level", "Grade 11", "Grade 12"] },
                { label: "Non-Graded (SPED only)", name: "nongraded", type: "select", options: ["Yes", "No"] },
                { label: "PSA Birth Certificate No.", name: "psa" },
                { label: "Last Name", name: "lastName", required: true, value: form.lastName, readonly: true },
                { label: "First Name", name: "firstName", required: true, value: form.firstName, readonly: true },
                { label: "Middle Name", name: "middleName", value: form.middleName, readonly: true },
                { label: "Extension Name (Jr., III)", name: "extensionName", type: "select", options: ["Jr.", "Sr.", "II", "III", "IV", "V"] },
                { label: "Birthdate", name: "birthdate", type: "date", required: true },
                { label: "Age", name: "age", required: true, readonly: true },
                { label: "Sex", name: "sex", type: "select", options: ["Select Sex", "Male", "Female"], required: true },
                { label: "Place of Birth", name: "birthPlace", required: true },
                { label: "Address", name: "address", required: true },
                { label: "Religion", name: "religion" },
                { label: "Indigenous Peoples Community", name: "ipCommunity", type: "select", options: ["Yes", "No", "Prefer not to say"] },
                { label: "4Ps Beneficiary? (Pantawid Pamilyang Pilipino Program)", name: "fourPs", type: "select", options: ["Yes", "No", "Unknown"] },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={field.value || form[field.name] || ''}
                      onChange={handleChange}
                      className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    >
                      {!field.required && <option value="">Select {field.label}</option>}
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      value={field.value || form[field.name] || ''}
                      onChange={handleChange}
                      readOnly={field.readonly}
                      maxLength={field.maxLength}
                      pattern={field.pattern}
                      title={field.title}
                      className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                        errors[field.name] ? 'border-red-500' : 'border-gray-300'
                      } ${field.readonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  )}
                  {errors[field.name] && (
                    <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Strand Preferences */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Strand Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please select your top 3 preferred strands in order of preference. Note that STEM requires an entrance exam.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "1st Choice", name: "firstChoice" },
                { label: "2nd Choice", name: "secondChoice" },
                { label: "3rd Choice", name: "thirdChoice" }
              ].map((choice) => (
                <div key={choice.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {choice.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name={choice.name}
                    onChange={handleChange}
                    required
                    className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                      errors[choice.name] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Strand</option>
                    {availableStrands.length > 0 ? (
                      availableStrands.map(strand => (
                        <option key={strand.id} value={strand.id}>
                          {strand.code} - {strand.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No strands available - Wait for registrar to create strands</option>
                    )}
                  </select>
                  {errors[choice.name] && (
                    <p className="text-sm text-red-500 mt-1">{errors[choice.name]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> STEM strand requires passing an entrance examination. 
                If you don't pass the STEM exam, you will be enrolled in your next preferred strand.
              </p>
            </div>
          </section>

          {/* Back Page */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Additional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                { label: "PWD ID?", name: "pwdId", type: "select", options: ["Yes (With ID)", "No (But PWD)", "No", "Applied / Pending"] },
                { label: "Last Grade Level Completed", name: "lastGrade", required: true },
                { label: "Last School Year Completed", name: "lastSY", value: form.lastSY, readonly: true },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={field.value || form[field.name] || ''}
                      onChange={handleChange}
                      className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                        errors[field.name] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {!field.required && <option value="">Select {field.label}</option>}
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={field.name}
                      value={field.value || form[field.name] || ''}
                      onChange={handleChange}
                      readOnly={field.readonly}
                      className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                        errors[field.name] ? 'border-red-500' : 'border-gray-300'
                      } ${field.readonly ? 'bg-gray-100' : ''}`}
                    />
                  )}
                  {errors[field.name] && (
                    <p className="text-sm text-red-500 mt-1">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

          </section>

          {/* Document Upload Section */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Required Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* PSA Birth Certificate Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PSA Birth Certificate <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {uploadedFiles.psaBirthCertificate ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        {uploadedFiles.psaBirthCertificate.type.includes('pdf') ? (
                          <FaFilePdf className="w-8 h-8" />
                        ) : (
                          <FaFileImage className="w-8 h-8" />
                        )}
                        <span className="font-medium">File uploaded successfully</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {uploadedFiles.psaBirthCertificate.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFiles.psaBirthCertificate.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFile('psaBirthCertificate')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium mx-auto"
                      >
                        <FaTimes className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FaUpload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-gray-600 font-medium">Upload PSA Birth Certificate</p>
                        <p className="text-sm text-gray-500">JPG, PNG, or PDF (Max 5MB)</p>
                      </div>
                      <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors">
                        Choose File
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileUpload(e, 'psaBirthCertificate')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                {errors.psaBirthCertificate && (
                  <p className="text-sm text-red-500 mt-1">{errors.psaBirthCertificate}</p>
                )}
              </div>

              {/* Report Card Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Card <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {uploadedFiles.reportCard ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        {uploadedFiles.reportCard.type.includes('pdf') ? (
                          <FaFilePdf className="w-8 h-8" />
                        ) : (
                          <FaFileImage className="w-8 h-8" />
                        )}
                        <span className="font-medium">File uploaded successfully</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {uploadedFiles.reportCard.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFiles.reportCard.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFile('reportCard')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium mx-auto"
                      >
                        <FaTimes className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FaUpload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-gray-600 font-medium">Upload Report Card</p>
                        <p className="text-sm text-gray-500">JPG, PNG, or PDF (Max 5MB)</p>
                      </div>
                      <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors">
                        Choose File
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileUpload(e, 'reportCard')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                {errors.reportCard && (
                  <p className="text-sm text-red-500 mt-1">{errors.reportCard}</p>
                )}
              </div>
            </div>

            {/* Upload Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Document Upload Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ensure documents are clear and readable</li>
                <li>• PSA Birth Certificate must be an official copy</li>
                <li>• Report Card should be from your most recent completed grade level</li>
                <li>• Accepted formats: JPG, PNG, PDF (Maximum 5MB per file)</li>
                <li>• All documents are required for enrollment processing</li>
              </ul>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-md font-semibold transition duration-200 shadow"
            >
              {loading ? 'Submitting...' : 'Submit Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
