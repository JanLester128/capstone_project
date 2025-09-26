import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaLayerGroup, FaBookOpen, FaSearch, FaGraduationCap, FaChevronDown, FaChevronUp, FaCalendarAlt, FaUser, FaLink, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const StrandModal = ({ isOpen, onClose, strand }) => {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [strandName, setStrandName] = useState("");
  const [strandCode, setStrandCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isCustom, setIsCustom] = useState(false);

  // Predefined strand options
  const strandPresets = [
    { name: 'Science, Technology, Engineering and Mathematics', code: 'STEM' },
    { name: 'Humanities and Social Sciences', code: 'HUMSS' },
    { name: 'Accountancy, Business and Management', code: 'ABM' },
    { name: 'General Academic Strand', code: 'GAS' },
    { name: 'Technical-Vocational-Livelihood', code: 'TVL' },
    { name: 'Arts and Design Track', code: 'ADT' },
    { name: 'Sports Track', code: 'SPORTS' }
  ];

  useEffect(() => {
    if (strand) {
      setStrandName(strand.name || "");
      setStrandCode(strand.code || "");
      setSelectedPreset('custom');
      setIsCustom(true);
    } else {
      setStrandName("");
      setStrandCode("");
      setSelectedPreset('');
      setIsCustom(false);
    }
  }, [strand, isOpen]);

  // Handle preset selection
  const handlePresetChange = (e) => {
    const value = e.target.value;
    setSelectedPreset(value);
    
    if (value === 'custom') {
      setIsCustom(true);
      setStrandName('');
      setStrandCode('');
    } else if (value) {
      setIsCustom(false);
      const preset = strandPresets.find(p => p.code === value);
      if (preset) {
        setStrandName(preset.name);
        setStrandCode(preset.code);
      }
    } else {
      setIsCustom(false);
      setStrandName('');
      setStrandCode('');
    }
  };

  // Auto-generate code from name for custom entries
  useEffect(() => {
    if (isCustom && strandName && !strand) {
      const generatedCode = strandName
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 6);
      setStrandCode(generatedCode);
    }
  }, [strandName, isCustom, strand]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!strandName.trim()) {
      newErrors.name = 'Strand name is required';
    } else if (strandName.trim().length < 3) {
      newErrors.name = 'Strand name must be at least 3 characters';
    }
    
    if (!strandCode.trim()) {
      newErrors.code = 'Strand code is required';
    } else if (strandCode.trim().length < 2) {
      newErrors.code = 'Strand code must be at least 2 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fix the errors before submitting',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    setProcessing(true);
    const data = {
      name: strandName.trim(),
      code: strandCode.trim().toUpperCase(),
    };

    if (strand) {
      router.put(`/registrar/strands/${strand.id}`, data, {
        onSuccess: (page) => {
          Swal.fire({
            title: 'Success!',
            text: 'Strand updated successfully',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || Object.values(errors).flat().join(', ') || 'Failed to update strand';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    } else {
      router.post("/registrar/strands", data, {
        onSuccess: (page) => {
          Swal.fire({
            title: 'Success!',
            text: 'Strand created successfully',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || Object.values(errors).flat().join(', ') || 'Failed to create strand';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative border border-white/20" onClick={(e) => e.stopPropagation()}
           style={{
             backdropFilter: 'blur(20px) saturate(180%)',
             WebkitBackdropFilter: 'blur(20px) saturate(180%)'
           }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{strand ? "Edit Academic Strand" : "Create New Academic Strand"}</h3>
            <p className="text-gray-600 mt-1">Define the academic track for Senior High School</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaBookOpen className="text-blue-500" />
                Strand Code *
              </label>
              <select
                value={selectedPreset}
                onChange={handlePresetChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select a preset</option>
                {strandPresets.map(preset => (
                  <option key={preset.code} value={preset.code}>{preset.name}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
              {isCustom && (
                <input
                  type="text"
                  value={strandCode}
                  onChange={(e) => {
                    setStrandCode(e.target.value.toUpperCase());
                    setTouched(prev => ({...prev, code: true}));
                    if (errors.code) {
                      const newErrors = {...errors};
                      delete newErrors.code;
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={() => setTouched(prev => ({...prev, code: true}))}
                  placeholder="STEM, HUMSS, ABM, GAS, TVL"
                  className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 ${
                    errors.code && touched.code ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  required
                  maxLength="10"
                  aria-describedby="code-help code-error"
                />
              )}
              {errors.code && touched.code && (
                <p id="code-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <FaExclamationTriangle className="text-red-500" />
                  {errors.code}
                </p>
              )}
              <p id="code-help" className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <FaInfoCircle className="text-blue-500" />
                Acronym for the academic strand (2-10 characters)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level</label>
              <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-600">
                Grade 11 & 12
              </div>
              <p className="text-xs text-gray-500 mt-1">Senior High School level</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaGraduationCap className="text-purple-500" />
              Strand Name *
            </label>
            <input
              type="text"
              value={strandName}
              onChange={(e) => {
                setStrandName(e.target.value);
                setTouched(prev => ({...prev, name: true}));
                if (errors.name) {
                  const newErrors = {...errors};
                  delete newErrors.name;
                  setErrors(newErrors);
                }
              }}
              onBlur={() => setTouched(prev => ({...prev, name: true}))}
              placeholder="Science, Technology, Engineering and Mathematics"
              className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 ${
                errors.name && touched.name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
              aria-describedby="name-help name-error"
            />
            {errors.name && touched.name && (
              <p id="name-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <FaExclamationTriangle className="text-red-500" />
                {errors.name}
              </p>
            )}
            <p id="name-help" className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <FaInfoCircle className="text-blue-500" />
              Full descriptive name of the academic strand (min 3 characters)
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing || !strandName.trim() || !strandCode.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  {strand ? "Update Strand" : "Create Strand"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubjectModal = ({ isOpen, onClose, subject, selectedStrand }) => {
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [semester, setSemester] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (subject) {
      setSubjectName(subject.name || "");
      setSubjectCode(subject.code || "");
      setSemester(subject.semester?.toString() || "");
    } else {
      setSubjectName("");
      setSubjectCode("");
      setSemester("");
    }
  }, [subject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim() || !semester || !selectedStrand) return;

    setProcessing(true);

    const data = {
      name: subjectName.trim(),
      code: subjectCode.trim().toUpperCase(),
      semester: parseInt(semester),
      strand_id: selectedStrand.id
    };

    if (subject) {
      router.put(`/registrar/subjects/${subject.id}`, data, {
        onSuccess: (page) => {
          if (page.props.flash?.success) {
            Swal.fire({
              title: 'Success!',
              text: page.props.flash.success,
              icon: 'success',
              confirmButtonColor: '#10b981'
            });
          }
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || 'Failed to update subject';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    } else {
      router.post("/registrar/subjects", data, {
        onSuccess: (page) => {
          if (page.props.flash?.success) {
            Swal.fire({
              title: 'Success!',
              text: page.props.flash.success,
              icon: 'success',
              confirmButtonColor: '#10b981'
            });
          }
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || 'Failed to create subject';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative border border-white/20" onClick={(e) => e.stopPropagation()}
           style={{
             backdropFilter: 'blur(20px) saturate(180%)',
             WebkitBackdropFilter: 'blur(20px) saturate(180%)'
           }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white drop-shadow-lg">{subject ? "Edit Subject" : "Create New Subject"}</h3>
            <p className="text-white/80 mt-1 drop-shadow">
              {selectedStrand ? `For ${selectedStrand.code} - ${selectedStrand.name}` : 'Academic subject definition'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl hover:bg-white/10 p-2 rounded-full transition-all">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-white drop-shadow mb-2">Subject Code *</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="GENMATH, ORALCOM"
                className="w-full border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-white placeholder-white/60"
                required
                maxLength="15"
              />
              <p className="text-xs text-white/60 mt-1">Unique identifier (max 15 chars)</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Semester *</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">Select semester</option>
                <option value="1">1st Semester (Q1 & Q2)</option>
                <option value="2">2nd Semester (Q3 & Q4)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Name *</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="General Mathematics, Oral Communication"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Full descriptive name of the subject</p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {processing ? "Saving..." : subject ? "Update Subject" : "Create Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RegistrarClass = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { strands = [], subjects = [], flash } = usePage().props;
  const [activeTab, setActiveTab] = useState('overview');
  const [strandModalOpen, setStrandModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editStrand, setEditStrand] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [selectedStrand, setSelectedStrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStrands, setExpandedStrands] = useState({});

  const filteredStrands = strands.filter(
    (strand) =>
      strand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strand.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddStrandModal = () => {
    setEditStrand(null);
    setStrandModalOpen(true);
  };

  const openEditStrandModal = (strand) => {
    setEditStrand(strand);
    setStrandModalOpen(true);
  };

  const openAddSubjectModal = (strand = null) => {
    setEditSubject(null);
    setSelectedStrand(strand);
    setSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subject) => {
    setEditSubject(subject);
    setSelectedStrand(strands.find(s => s.id === subject.strand_id));
    setSubjectModalOpen(true);
  };

  const handleDeleteStrand = (strand) => {
    Swal.fire({
      title: 'Delete Strand?',
      html: `Are you sure you want to delete <strong>${strand.name} (${strand.code})</strong>?<br><br><span class="text-red-600">⚠️ This will also remove all associated subjects and cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(`/registrar/strands/${strand.id}`, {
          onSuccess: () => {
            Swal.fire({
              title: 'Deleted!',
              text: 'Strand has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#10b981',
              timer: 2000,
              showConfirmButton: false
            });
          },
          onError: () => {
            Swal.fire({
              title: 'Error!',
              text: 'Failed to delete strand. Please try again.',
              icon: 'error',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  };

  const handleDeleteSubject = (subject) => {
    Swal.fire({
      title: 'Delete Subject?',
      html: `Are you sure you want to delete <strong>${subject.name} (${subject.code})</strong>?<br><br><span class="text-red-600">⚠️ This action cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(`/registrar/subjects/${subject.id}`, {
          onSuccess: () => {
            Swal.fire({
              title: 'Deleted!',
              text: 'Subject has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#10b981',
              timer: 2000,
              showConfirmButton: false
            });
          },
          onError: () => {
            Swal.fire({
              title: 'Error!',
              text: 'Failed to delete subject. Please try again.',
              icon: 'error',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  };

  const toggleStrandExpansion = (strandId) => {
    setExpandedStrands(prev => ({
      ...prev,
      [strandId]: !prev[strandId]
    }));
  };

  const getStrandSubjects = (strandId) => {
    return subjects.filter(subject => subject.strand_id === strandId);
  };

  const getSubjectsBySemester = (strandId, semester) => {
    return subjects.filter(subject => subject.strand_id === strandId && subject.semester === semester);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Head title="Academic Programs - ONSTS" />
      <Sidebar onToggle={setIsCollapsed} />
      
      <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          
          {flash?.success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-3" />
                <p className="text-green-800 font-medium">{flash.success}</p>
              </div>
            </div>
          )}
          
          {flash?.error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-3" />
                <p className="text-red-800 font-medium">{flash.error}</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <FaGraduationCap className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    Academic Programs Management
                  </h1>
                  <p className="text-gray-600">Manage Senior High School strands and subjects</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full sm:w-80 bg-white shadow-sm transition-all duration-200"
                  />
                </div>
                <button
                  onClick={openAddStrandModal}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 transition-all duration-200"
                >
                  <FaPlus className="text-sm" />
                  Add Strand
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Strands</p>
                  <p className="text-3xl font-bold text-blue-600">{strands.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FaLayerGroup className="text-blue-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Subjects</p>
                  <p className="text-3xl font-bold text-purple-600">{subjects.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FaBookOpen className="text-purple-600 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">1st Semester</p>
                  <p className="text-3xl font-bold text-green-600">{subjects.filter(s => s.semester === 1).length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <FaCalendarAlt className="text-green-600 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">2nd Semester</p>
                  <p className="text-3xl font-bold text-orange-600">{subjects.filter(s => s.semester === 2).length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <FaCalendarAlt className="text-orange-600 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Strands Grid */}
          <div className="space-y-6">
            {strands.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="mb-6">
                  <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <FaGraduationCap className="text-blue-600 text-3xl" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Academic Programs</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Start by creating academic strands for your Senior High School program. Each strand represents a specialized track of study.</p>
                <button
                  onClick={openAddStrandModal}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-lg shadow-sm hover:shadow-md flex items-center gap-3 mx-auto transition-all duration-200"
                >
                  <FaPlus className="text-sm" />
                  Create First Strand
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStrands.map((strand) => {
                  const strandSubjects = getStrandSubjects(strand.id);
                  const firstSemCount = getSubjectsBySemester(strand.id, 1).length;
                  const secondSemCount = getSubjectsBySemester(strand.id, 2).length;
                  const isExpanded = expandedStrands[strand.id];
                  
                  return (
                    <div key={strand.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2 line-clamp-2">{strand.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1 rounded-full">
                                {strand.code}
                              </span>
                              <span className="text-blue-100 text-sm">Grade 11 & 12</span>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <button
                              onClick={() => openEditStrandModal(strand)}
                              className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
                              title="Edit strand"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteStrand(strand)}
                              className="text-white hover:bg-red-500/50 p-2 rounded-lg transition-all duration-200"
                              title="Delete strand"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                            <div className="text-2xl font-bold text-green-600 mb-1">{firstSemCount}</div>
                            <div className="text-sm font-medium text-green-700">1st Semester</div>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                            <div className="text-2xl font-bold text-orange-600 mb-1">{secondSemCount}</div>
                            <div className="text-sm font-medium text-orange-700">2nd Semester</div>
                          </div>
                        </div>

                        <div className="text-center text-sm text-gray-600 mb-6 font-medium">
                          Total: {strandSubjects.length} subjects
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => openAddSubjectModal(strand)}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                          >
                            <FaPlus className="text-sm" />
                            Add Subject
                          </button>
                          
                          {strandSubjects.length > 0 && (
                            <button
                              onClick={() => toggleStrandExpansion(strand.id)}
                              className="w-full bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                              {isExpanded ? <FaChevronUp className="text-sm" /> : <FaChevronDown className="text-sm" />}
                              {isExpanded ? 'Hide' : 'View'} Subjects ({strandSubjects.length})
                            </button>
                          )}
                        </div>

                        {/* Expanded Subject List */}
                        {isExpanded && strandSubjects.length > 0 && (
                          <div className="mt-6 space-y-4 max-h-64 overflow-y-auto border-t border-gray-200 pt-4">
                            {[1, 2].map(sem => {
                              const semSubjects = getSubjectsBySemester(strand.id, sem);
                              if (semSubjects.length === 0) return null;
                              
                              return (
                                <div key={sem}>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-500 text-xs" />
                                    {sem === 1 ? '1st Semester' : '2nd Semester'} ({semSubjects.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {semSubjects.map(subject => (
                                      <div key={subject.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100 hover:bg-gray-100 transition-colors duration-200">
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900 mb-1">{subject.name}</div>
                                          <div className="text-xs text-gray-500 font-mono">{subject.code}</div>
                                        </div>
                                        <div className="flex gap-1 ml-3">
                                          <button
                                            onClick={() => openEditSubjectModal(subject)}
                                            className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-all duration-200"
                                            title="Edit subject"
                                          >
                                            <FaEdit className="text-xs" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubject(subject)}
                                            className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-all duration-200"
                                            title="Delete subject"
                                          >
                                            <FaTrash className="text-xs" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <StrandModal
          isOpen={strandModalOpen}
          onClose={() => setStrandModalOpen(false)}
          strand={editStrand}
        />

        <SubjectModal
          isOpen={subjectModalOpen}
          onClose={() => setSubjectModalOpen(false)}
          subject={editSubject}
          selectedStrand={selectedStrand}
        />
      </main>
    </div>
  );
};

export default RegistrarClass;
