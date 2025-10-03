import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaChalkboardTeacher, FaGraduationCap, FaSearch, FaFilter, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import Sidebar from '../layouts/Sidebar';
import SchoolYearWarning from '../../Components/SchoolYearWarning';
import Swal from 'sweetalert2';

const RegistrarSections = ({ sections = [], faculties = [], facultiesByStrand = {}, strands = [], flash, hasActiveSchoolYear = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [strandFilter, setStrandFilter] = useState('all');

  // Filter sections based on search and strand
  const filteredSections = sections.filter(section => {
    const matchesSearch = section.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         section.strand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (section.teacher_name && section.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStrand = strandFilter === 'all' || section.strand === strands.find(s => s.id === parseInt(strandFilter))?.name;
    return matchesSearch && matchesStrand;
  });

  const openAddModal = () => {
    setEditSection(null);
    setModalOpen(true);
  };

  const openEditModal = (section) => {
    setEditSection(section);
    setModalOpen(true);
  };

  const handleDeleteSection = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Section?',
      text: 'This action cannot be undone. All associated data will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      router.delete(`/registrar/sections/${id}`, {
        onSuccess: () => {
          Swal.fire({
            title: 'Deleted!',
            text: 'Section has been successfully deleted.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
          router.reload({ only: ['sections'] });
        },
        onError: () => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to delete section. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Head title="Manage Sections - ONSTS" />
      <Sidebar onToggle={setIsCollapsed} />
      
      <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          {/* School Year Warning */}
          <SchoolYearWarning 
            show={!hasActiveSchoolYear}
            title="No Active School Year Found"
            message="You need to create and activate a school year before creating or managing sections. Sections must be associated with an active academic year."
            actionText="Create School Year"
            actionLink="/registrar/school-years"
          />

          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <FaUsers className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Section Management</h1>
                  <p className="text-gray-600">Create and manage class sections with teacher assignments</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={openAddModal}
              disabled={!hasActiveSchoolYear}
              className={`font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 ${
                hasActiveSchoolYear 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl transform hover:-translate-y-0.5' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!hasActiveSchoolYear ? 'Create an active school year first' : 'Add new section'}
            >
              <FaPlus className="text-lg" />
              Add New Section
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sections, strands, or teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              
              {/* Strand Filter */}
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={strandFilter}
                  onChange={(e) => setStrandFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white min-w-[200px]"
                >
                  <option value="all">All Strands</option>
                  {strands.map(strand => (
                    <option key={strand.id} value={strand.id}>{strand.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>{filteredSections.length} sections found</span>
              {(searchTerm || strandFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStrandFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Sections Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                <FaUsers className="text-white text-lg" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Sections</h2>
            </div>

            {filteredSections.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FaUsers className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {searchTerm || strandFilter !== 'all' ? 'No Sections Found' : 'No Sections Available'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || strandFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by creating your first section'
                  }
                </p>
                {!searchTerm && strandFilter === 'all' && (
                  <button
                    onClick={openAddModal}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                  >
                    <FaPlus className="inline mr-2" />
                    Create First Section
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSections.map((section) => (
                  <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FaUsers className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{section.section_name}</h3>
                          <p className="text-sm text-gray-600">Grade {section.year_level}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <FaGraduationCap className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-600 font-medium">Strand:</span>
                        <span className="text-sm font-semibold text-gray-800">{section.strand}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FaChalkboardTeacher className="text-gray-400 text-sm" />
                        <span className="text-sm text-gray-600 font-medium">Teacher:</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {section.teacher_name || 'Not Assigned'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => openEditModal(section)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Edit Section"
                      >
                        <FaEdit className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete Section"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Section Modal */}
      {modalOpen && (
        <SectionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          section={editSection}
          faculties={faculties}
          facultiesByStrand={facultiesByStrand}
          strands={strands}
          sections={sections}
        />
      )}
    </div>
  );
};

// Section Modal Component
const SectionModal = ({ isOpen, onClose, section, faculties, facultiesByStrand, strands, sections }) => {
  const [formData, setFormData] = useState({
    section_name: section?.section_name || '',
    year_level: section?.year_level || '11',
    strand_id: section?.strand_id || '',
    teacher_id: section?.teacher_id || ''
  });
  const [processing, setProcessing] = useState(false);
  const [teacherWarning, setTeacherWarning] = useState('');
  const [strandSuggestion, setStrandSuggestion] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Debug: Log the data being received
  React.useEffect(() => {
    console.log('SectionModal Debug Data:', {
      totalFaculties: faculties?.length || 0,
      facultiesByStrand: facultiesByStrand,
      facultiesByStrandKeys: Object.keys(facultiesByStrand || {}),
      sampleFaculty: faculties?.[0],
      strands: strands?.map(s => ({ id: s.id, name: s.name })),
      currentStrandId: formData.strand_id,
      teachersForCurrentStrand: formData.strand_id ? facultiesByStrand[formData.strand_id] : null
    });
  }, [faculties, facultiesByStrand, strands, formData.strand_id]);

  // Auto-detect strand based on section name prefix
  const detectStrandFromName = (sectionName) => {
    if (!sectionName) return '';
    
    const upperName = sectionName.toUpperCase();
    const strandCodes = {
      'STEM': 'Science, Technology, Engineering and Mathematics',
      'HUMSS': 'Humanities and Social Sciences',
      'ABM': 'Accountancy, Business and Management',
      'TVL': 'Technical-Vocational-Livelihood'
    };

    for (const [code, fullName] of Object.entries(strandCodes)) {
      if (upperName.startsWith(code)) {
        const matchingStrand = strands.find(s => s.code === code || s.name === fullName);
        if (matchingStrand) {
          return {
            strandId: matchingStrand.id,
            suggestion: `Auto-detected: ${code} strand based on section name`
          };
        }
      }
    }
    return { strandId: '', suggestion: '' };
  };

  // Handle section name changes with auto-detection
  const handleSectionNameChange = (e) => {
    const name = e.target.value;
    setFormData({...formData, section_name: name});
    
    // Clear previous validation errors
    setValidationErrors(prev => ({...prev, section_name: ''}));
    
    // Auto-detect strand if not editing an existing section
    if (!section) {
      const detection = detectStrandFromName(name);
      if (detection.strandId) {
        setFormData(prev => ({...prev, section_name: name, strand_id: detection.strandId}));
        setStrandSuggestion(detection.suggestion);
      } else {
        setStrandSuggestion('');
      }
    }
  };

  // Check for duplicate teacher assignment
  const checkTeacherAssignment = (teacherId) => {
    if (!teacherId) {
      setTeacherWarning('');
      return;
    }

    const assignedSection = sections.find(sec => 
      sec.teacher_id === parseInt(teacherId) && 
      sec.id !== section?.id
    );

    if (assignedSection) {
      const teacher = faculties.find(t => t.id === parseInt(teacherId));
      setTeacherWarning(`${teacher?.firstname} ${teacher?.lastname} is already assigned to section ${assignedSection.section_name}`);
    } else {
      setTeacherWarning('');
    }
  };

  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setFormData({...formData, teacher_id: teacherId});
    checkTeacherAssignment(teacherId);
    setValidationErrors(prev => ({...prev, teacher_id: ''}));
  };

  const handleStrandChange = (e) => {
    setFormData({...formData, strand_id: e.target.value});
    setStrandSuggestion(''); // Clear suggestion when manually changed
    setValidationErrors(prev => ({...prev, strand_id: ''}));
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.section_name.trim()) {
      errors.section_name = 'Section name is required';
    } else if (formData.section_name.length < 2) {
      errors.section_name = 'Section name must be at least 2 characters';
    }
    
    if (!formData.strand_id) {
      errors.strand_id = 'Please select a strand';
    }
    
    if (teacherWarning) {
      errors.teacher_id = 'Please resolve teacher assignment conflict';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fix the errors in the form before submitting.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    setProcessing(true);

    const url = section 
      ? `/registrar/sections/${section.id}`
      : '/registrar/sections';
    
    const method = section ? 'put' : 'post';

    router[method](url, formData, {
      onSuccess: (page) => {
        Swal.fire({
          title: 'Success!',
          text: `Section ${section ? 'updated' : 'created'} successfully!`,
          icon: 'success',
          confirmButtonColor: '#10b981',
          timer: 2000,
          showConfirmButton: false
        });
        onClose();
        router.reload({ only: ['sections'] });
      },
      onError: (errors) => {
        console.log('Validation errors:', errors);
        
        // Set validation errors for form display
        if (errors) {
          setValidationErrors(errors);
        }
        
        let errorMessage = `Failed to ${section ? 'update' : 'create'} section.`;
        
        // Handle specific validation errors
        if (errors.teacher_id) {
          errorMessage = Array.isArray(errors.teacher_id) ? errors.teacher_id[0] : errors.teacher_id;
        } else if (errors.section_name) {
          errorMessage = Array.isArray(errors.section_name) ? errors.section_name[0] : errors.section_name;
        } else if (errors.message) {
          errorMessage = errors.message;
        }

        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
        setProcessing(false);
      },
      onFinish: () => {
        setProcessing(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl sticky top-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <FaUsers className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {section ? 'Edit Section' : 'Add New Section'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {section ? 'Update section information' : 'Create a new class section with teacher assignment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            disabled={processing}
            title="Close modal"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Help Text */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Quick Tips:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Start section names with strand codes (STEM, HUMSS, ABM, TVL) for auto-detection</li>
                  <li>• Example: "STEM-A" will automatically select STEM strand</li>
                  <li>• Teacher assignment is optional but recommended</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Name *
              <span className="text-xs text-gray-500 ml-1">(e.g., STEM-A, HUMSS-1)</span>
            </label>
            <input
              type="text"
              value={formData.section_name}
              onChange={handleSectionNameChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                validationErrors.section_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter section name (e.g., STEM-A)"
              required
              disabled={processing}
            />
            {validationErrors.section_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FaExclamationTriangle className="text-xs" />
                {validationErrors.section_name}
              </p>
            )}
            {strandSuggestion && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {strandSuggestion}
              </p>
            )}
          </div>

          {/* Year Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year Level *
            </label>
            <select
              value={formData.year_level}
              onChange={(e) => setFormData({...formData, year_level: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
              disabled={processing}
            >
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>

          {/* Strand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strand *
            </label>
            <select
              value={formData.strand_id}
              onChange={handleStrandChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                validationErrors.strand_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              required
              disabled={processing}
            >
              <option value="">Select a strand</option>
              {strands.map(strand => (
                <option key={strand.id} value={strand.id}>
                  {strand.code ? `${strand.code} - ${strand.name}` : strand.name}
                </option>
              ))}
            </select>
            {validationErrors.strand_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FaExclamationTriangle className="text-xs" />
                {validationErrors.strand_id}
              </p>
            )}
          </div>

          {/* Assigned Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Teacher
              <span className="text-xs text-gray-500 ml-1">(Optional)</span>
            </label>
            <select
              value={formData.teacher_id}
              onChange={handleTeacherChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                teacherWarning ? 'border-amber-300 bg-amber-50' : validationErrors.teacher_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={processing}
            >
              <option value="">No teacher assigned</option>
              {(() => {
                // Convert strand_id to string for comparison since object keys are strings
                const strandId = String(formData.strand_id);
                
                // If a strand is selected and has assigned teachers, show only those teachers
                if (formData.strand_id && facultiesByStrand[strandId] && facultiesByStrand[strandId].length > 0) {
                  console.log(`Showing ${facultiesByStrand[strandId].length} teachers for strand ID ${strandId}`);
                  return facultiesByStrand[strandId].map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstname} {teacher.lastname}
                      {teacher.role === 'coordinator' && ' (Coordinator)'}
                    </option>
                  ));
                }
                // If no strand selected or no teachers assigned to strand, show all teachers
                console.log(`Showing all ${faculties.length} teachers (no strand filter or no teachers for strand ${strandId})`);
                return faculties.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstname} {teacher.lastname}
                    {teacher.role === 'coordinator' && ' (Coordinator)'}
                  </option>
                ));
              })()}
            </select>
            {formData.strand_id && facultiesByStrand[String(formData.strand_id)] && facultiesByStrand[String(formData.strand_id)].length > 0 && (
              <p className="mt-1 text-xs text-blue-600">
                Showing {facultiesByStrand[String(formData.strand_id)].length} teachers assigned to selected strand only
              </p>
            )}
            {formData.strand_id && (!facultiesByStrand[String(formData.strand_id)] || facultiesByStrand[String(formData.strand_id)].length === 0) && (
              <p className="mt-1 text-xs text-amber-600">
                No teachers assigned to this strand. Showing all available teachers.
              </p>
            )}
            {teacherWarning && (
              <div className="mt-2 flex items-start gap-2 text-amber-700 text-sm bg-amber-50 p-2 rounded-lg border border-amber-200">
                <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                <span>{teacherWarning}</span>
              </div>
            )}
            {validationErrors.teacher_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FaExclamationTriangle className="text-xs" />
                {validationErrors.teacher_id}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Teachers can be assigned later if not available now
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing || teacherWarning}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                section ? 'Update Section' : 'Create Section'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrarSections;