import React, { useState } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import Swal from "sweetalert2";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaGraduationCap,
  FaUserPlus,
  FaSpinner,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaIdCard,
  FaBook,
  FaSave,
  FaUsers,
  FaSchool
} from "react-icons/fa";

export default function Faculty_ManualEnrollment({ strands = [], sections = [], auth, flash }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [formData, setFormData] = useState({
    // Personal Information
    firstname: '',
    lastname: '',
    middlename: '',
    suffix: '',
    birthdate: '',
    gender: '',
    contact_number: '',
    email: '',
    
    // Address
    address: '',
    city: '',
    province: '',
    zip_code: '',
    
    // Guardian Information
    guardian_name: '',
    guardian_contact: '',
    guardian_relationship: '',
    
    // Academic Information
    lrn: '',
    strand_id: '',
    section_id: '',
    previous_school: '',
    student_type: 'new',
    
  });

  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.firstname.trim()) newErrors.firstname = 'First name is required';
    if (!formData.lastname.trim()) newErrors.lastname = 'Last name is required';
    if (!formData.birthdate) newErrors.birthdate = 'Birthdate is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.guardian_name.trim()) newErrors.guardian_name = 'Guardian name is required';
    if (!formData.guardian_contact.trim()) newErrors.guardian_contact = 'Guardian contact is required';
    if (!formData.lrn.trim()) newErrors.lrn = 'LRN is required';
    else if (!/^\d{12}$/.test(formData.lrn.trim())) newErrors.lrn = 'LRN must be exactly 12 digits';
    if (!formData.strand_id) newErrors.strand_id = 'Strand selection is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Manual Enrollment',
      html: `
        <div class="text-left">
          <p class="mb-3">Are you sure you want to manually enroll this student?</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-sm text-blue-800 font-medium mb-2">Student Details:</p>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• <strong>Name:</strong> ${formData.firstname} ${formData.lastname}</li>
              <li>• <strong>Strand:</strong> ${strands.find(s => s.id == formData.strand_id)?.name || 'Not selected'}</li>
              <li>• <strong>Type:</strong> Manual Enrollment (Coordinator)</li>
            </ul>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            This student will be directly enrolled without going through the online application process.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Enroll Student',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setProcessing(true);
      
      router.post('/faculty/manual-enrollment', {
        ...formData,
        enrolled_by: 'coordinator'
      }, {
        onSuccess: (page) => {
          Swal.fire({
            title: 'Student Enrolled Successfully!',
            html: `
              <div class="text-left">
                <p class="mb-3">✅ <strong>${formData.firstname} ${formData.lastname}</strong> has been successfully enrolled.</p>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p class="text-sm text-green-800 font-medium mb-2">Next Steps:</p>
                  <ul class="text-sm text-green-700 space-y-1">
                    <li>• Student ID will be generated automatically</li>
                    <li>• Student can be assigned to classes</li>
                    <li>• Documents can be submitted later</li>
                  </ul>
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
          
          // Reset form
          setFormData({
            firstname: '', lastname: '', middlename: '', suffix: '', birthdate: '', gender: '', 
            contact_number: '', email: '', address: '', city: '', province: '', zip_code: '',
            guardian_name: '', guardian_contact: '', guardian_relationship: '', lrn: '', strand_id: '', 
            section_id: '', previous_school: '', student_type: 'new'
          });
        },
        onError: (errors) => {
          const errorMessage = errors.message || Object.values(errors)[0] || 'Failed to enroll student.';
          Swal.fire({
            title: 'Enrollment Failed',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
        },
        onFinish: () => setProcessing(false)
      });
    }
  };

  return (
    <>
      <Head title="Manual Enrollment - Faculty" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        
        <main className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'} min-h-screen`}>
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <FaUserPlus className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manual Student Enrollment</h1>
                    <p className="text-gray-600">Enroll students who don't have internet access or email accounts</p>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">Manual Enrollment Guidelines:</p>
                      <ul className="text-blue-700 mt-2 space-y-1">
                        <li>• Use this form for students without internet access or Gmail accounts</li>
                        <li>• All required information must be collected from the student/guardian</li>
                        <li>• Documents can be submitted and uploaded later</li>
                        <li>• Student will be immediately enrolled and can be assigned to classes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-600" />
                      <p className="text-green-800 font-medium">{flash.success}</p>
                    </div>
                  </div>
                )}

                {flash?.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle className="text-red-600" />
                      <p className="text-red-800 font-medium">{flash.error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Enrollment Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FaUser className="text-blue-600" />
                        Personal Information
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            name="firstname"
                            value={formData.firstname}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.firstname ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter first name"
                          />
                          {errors.firstname && (
                            <p className="mt-1 text-sm text-red-600">{errors.firstname}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            name="lastname"
                            value={formData.lastname}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.lastname ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter last name"
                          />
                          {errors.lastname && (
                            <p className="mt-1 text-sm text-red-600">{errors.lastname}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            name="middlename"
                            value={formData.middlename}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter middle name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Suffix
                          </label>
                          <input
                            type="text"
                            name="suffix"
                            value={formData.suffix}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Jr., Sr., III, etc."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Birthdate *
                          </label>
                          <input
                            type="date"
                            name="birthdate"
                            value={formData.birthdate}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.birthdate ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors.birthdate && (
                            <p className="mt-1 text-sm text-red-600">{errors.birthdate}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender *
                          </label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.gender ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                          {errors.gender && (
                            <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Number *
                          </label>
                          <input
                            type="tel"
                            name="contact_number"
                            value={formData.contact_number}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.contact_number ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="09XXXXXXXXX"
                          />
                          {errors.contact_number && (
                            <p className="mt-1 text-sm text-red-600">{errors.contact_number}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="student@example.com"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Complete Address *
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          rows="3"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="House No., Street, Barangay, City, Province"
                        />
                        {errors.address && (
                          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                        )}
                      </div>
                    </div>

                    {/* Guardian Information & Academic Details */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FaUsers className="text-green-600" />
                        Guardian Information
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Guardian Name *
                        </label>
                        <input
                          type="text"
                          name="guardian_name"
                          value={formData.guardian_name}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.guardian_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter guardian's full name"
                        />
                        {errors.guardian_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.guardian_name}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Guardian Contact *
                          </label>
                          <input
                            type="tel"
                            name="guardian_contact"
                            value={formData.guardian_contact}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.guardian_contact ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="09XXXXXXXXX"
                          />
                          {errors.guardian_contact && (
                            <p className="mt-1 text-sm text-red-600">{errors.guardian_contact}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Relationship
                          </label>
                          <select
                            name="guardian_relationship"
                            value={formData.guardian_relationship}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Relationship</option>
                            <option value="Parent">Parent</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Grandparent">Grandparent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Academic Information */}
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mt-8">
                        <FaGraduationCap className="text-purple-600" />
                        Academic Information
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaIdCard className="inline mr-2 text-blue-600" />
                          LRN (Learner Reference Number) *
                        </label>
                        <input
                          type="text"
                          name="lrn"
                          value={formData.lrn}
                          onChange={handleChange}
                          maxLength="12"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.lrn ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter 12-digit LRN (e.g., 123456789012)"
                        />
                        {errors.lrn && (
                          <p className="mt-1 text-sm text-red-600">{errors.lrn}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          The student's existing LRN from DepEd records
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Strand *
                        </label>
                        <select
                          name="strand_id"
                          value={formData.strand_id}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.strand_id ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Strand</option>
                          {strands.map((strand) => (
                            <option key={strand.id} value={strand.id}>
                              {strand.name} - {strand.description}
                            </option>
                          ))}
                        </select>
                        {errors.strand_id && (
                          <p className="mt-1 text-sm text-red-600">{errors.strand_id}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Student Type
                        </label>
                        <select
                          name="student_type"
                          value={formData.student_type}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="new">New Student</option>
                          <option value="transferee">Transferee</option>
                        </select>
                      </div>

                      {formData.student_type === 'transferee' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Previous School
                          </label>
                          <input
                            type="text"
                            name="previous_school"
                            value={formData.previous_school}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter previous school name"
                          />
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            firstname: '', lastname: '', middlename: '', suffix: '', birthdate: '', gender: '', 
                            contact_number: '', email: '', address: '', city: '', province: '', zip_code: '',
                            guardian_name: '', guardian_contact: '', guardian_relationship: '', lrn: '', strand_id: '', 
                            section_id: '', previous_school: '', student_type: 'new'
                          });
                          setErrors({});
                        }}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear Form
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          <>
                            <FaSave />
                            Enroll Student
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
