import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import {
  FaUserTie,
  FaChalkboardTeacher,
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaBook,
  FaSchool,
  FaCalendarAlt,
  FaSpinner,
  FaSave,
  FaEye
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function RegistrarFacultyAssignments({ auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('registrar-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [activeTab, setActiveTab] = useState('advisers');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [faculty, setFaculty] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  
  // Assignment states
  const [adviserAssignments, setAdviserAssignments] = useState([]);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrand, setSelectedStrand] = useState('');
  
  // Modal states
  const [showAdviserModal, setShowAdviserModal] = useState(false);
  const [showTeachingModal, setShowTeachingModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Fetch all necessary data
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedSchoolYear) {
      fetchAssignments();
    }
  }, [selectedSchoolYear]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data in parallel
      const [facultyRes, sectionsRes, subjectsRes, schedulesRes, schoolYearsRes] = await Promise.all([
        fetch('/registrar/faculty/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch('/registrar/sections/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch('/registrar/subjects/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch('/registrar/schedules/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch('/registrar/school-years/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ]);

      if (facultyRes.ok) {
        const data = await facultyRes.json();
        setFaculty(data.faculty || []);
      }

      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(data.sections || []);
      }

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setClassSchedules(data.schedules || []);
      }

      if (schoolYearsRes.ok) {
        const data = await schoolYearsRes.json();
        setSchoolYears(data.school_years || []);
        // Set current active school year as default
        const activeYear = data.school_years.find(year => year.is_active);
        if (activeYear) {
          setSelectedSchoolYear(activeYear.id);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Data',
        text: 'Unable to load assignment data. Please refresh the page.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/registrar/faculty-assignments?school_year_id=${selectedSchoolYear}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAdviserAssignments(data.adviser_assignments || []);
        setTeachingAssignments(data.teaching_assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Handle adviser assignment
  const handleAdviserAssignment = async (formData) => {
    try {
      setSaving(true);
      
      const response = await fetch('/registrar/assign-adviser', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          faculty_id: formData.faculty_id,
          section_id: formData.section_id,
          school_year_id: selectedSchoolYear
        })
      });

      if (response.ok) {
        const result = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Adviser Assigned!',
          text: result.message,
          timer: 3000,
          showConfirmButton: false
        });
        
        setShowAdviserModal(false);
        fetchAssignments();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign adviser');
      }
    } catch (error) {
      console.error('Error assigning adviser:', error);
      Swal.fire({
        icon: 'error',
        title: 'Assignment Failed',
        text: error.message || 'Unable to assign adviser. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle teaching assignment
  const handleTeachingAssignment = async (formData) => {
    try {
      setSaving(true);
      
      const response = await fetch('/registrar/assign-teaching', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          faculty_id: formData.faculty_id,
          subject_ids: formData.subject_ids, // Array of up to 4 subjects
          section_id: formData.section_id,
          school_year_id: selectedSchoolYear
        })
      });

      if (response.ok) {
        const result = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Teaching Assignment Complete!',
          text: result.message,
          timer: 3000,
          showConfirmButton: false
        });
        
        setShowTeachingModal(false);
        fetchAssignments();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign teaching subjects');
      }
    } catch (error) {
      console.error('Error assigning teaching subjects:', error);
      Swal.fire({
        icon: 'error',
        title: 'Assignment Failed',
        text: error.message || 'Unable to assign teaching subjects. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove assignment
  const removeAssignment = async (assignmentId, type) => {
    const result = await Swal.fire({
      title: `Remove ${type} Assignment?`,
      text: 'This will remove the faculty assignment. Students will still be able to see their data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const endpoint = type === 'adviser' ? '/registrar/remove-adviser' : '/registrar/remove-teaching';
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ assignment_id: assignmentId })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Assignment Removed!',
          timer: 2000,
          showConfirmButton: false
        });
        
        fetchAssignments();
      } else {
        throw new Error('Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Removal Failed',
        text: 'Unable to remove assignment. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  if (loading) {
    return (
      <>
        <Head title="Faculty Assignments - Registrar Portal" />
        <div className="flex h-screen bg-gray-50">
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading faculty assignments...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="Faculty Assignments - Registrar Portal" />
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Faculty Assignments</h1>
                <p className="text-gray-600">Manage adviser assignments and teaching schedules</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* School Year Filter */}
                <select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select School Year</option>
                  {schoolYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.year_start}-{year.year_end} ({year.semester})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100">
                      <FaUsers className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Faculty</p>
                      <p className="text-2xl font-bold text-gray-900">{faculty.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100">
                      <FaUserTie className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Advisers Assigned</p>
                      <p className="text-2xl font-bold text-gray-900">{adviserAssignments.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100">
                      <FaChalkboardTeacher className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Teaching Assignments</p>
                      <p className="text-2xl font-bold text-gray-900">{teachingAssignments.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-orange-100">
                      <FaSchool className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Sections</p>
                      <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="bg-white rounded-lg shadow-sm border mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveTab('advisers')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'advisers'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaUserTie className="inline mr-2" />
                      Section Advisers
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('teaching')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'teaching'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaChalkboardTeacher className="inline mr-2" />
                      Teaching Assignments
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'advisers' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search advisers..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowAdviserModal(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <FaPlus className="mr-2" />
                          Assign Adviser
                        </button>
                      </div>

                      {/* Adviser Assignments List */}
                      <div className="space-y-4">
                        {adviserAssignments.length > 0 ? (
                          adviserAssignments.map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FaUserTie className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div className="ml-4">
                                    <h3 className="text-lg font-semibold text-gray-900">{assignment.faculty_name}</h3>
                                    <p className="text-sm text-gray-600">Section {assignment.section_name}</p>
                                    <p className="text-xs text-gray-500">{assignment.strand_name} • {assignment.student_count} students</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => removeAssignment(assignment.id, 'adviser')}
                                    className="text-red-600 hover:text-red-800 p-2"
                                    title="Remove Assignment"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <FaUserTie className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Adviser Assignments</h3>
                            <p className="text-gray-500 mb-4">No faculty members have been assigned as section advisers yet.</p>
                            <button
                              onClick={() => setShowAdviserModal(true)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Assign First Adviser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'teaching' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search teaching assignments..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowTeachingModal(true)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <FaPlus className="mr-2" />
                          Assign Teaching
                        </button>
                      </div>

                      {/* Teaching Assignments List */}
                      <div className="space-y-4">
                        {teachingAssignments.length > 0 ? (
                          teachingAssignments.map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <FaChalkboardTeacher className="w-6 h-6 text-green-600" />
                                  </div>
                                  <div className="ml-4">
                                    <h3 className="text-lg font-semibold text-gray-900">{assignment.faculty_name}</h3>
                                    <p className="text-sm text-gray-600">{assignment.subject_count} subjects assigned</p>
                                    <p className="text-xs text-gray-500">{assignment.subjects.join(', ')}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => removeAssignment(assignment.id, 'teaching')}
                                    className="text-red-600 hover:text-red-800 p-2"
                                    title="Remove Assignment"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <FaChalkboardTeacher className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Teaching Assignments</h3>
                            <p className="text-gray-500 mb-4">No faculty members have been assigned teaching subjects yet.</p>
                            <button
                              onClick={() => setShowTeachingModal(true)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Assign First Teaching
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Rules Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <FaInfoCircle className="mr-2" />
                  Faculty Assignment Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
                  <div>
                    <h4 className="font-semibold mb-2">Adviser Assignment:</h4>
                    <ul className="space-y-1">
                      <li>• Each section has exactly one adviser</li>
                      <li>• Adviser can view all students in that section</li>
                      <li>• Adviser role allows full section management</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Teaching Assignment:</h4>
                    <ul className="space-y-1">
                      <li>• Faculty can be assigned up to 4 subjects maximum</li>
                      <li>• Each subject has a fixed schedule for the school year</li>
                      <li>• Teachers see only students enrolled in their subjects</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modals would go here - AdviserModal and TeachingModal components */}
      {/* These would be separate components for better organization */}
    </>
  );
}
