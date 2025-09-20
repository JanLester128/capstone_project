import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { router } from "@inertiajs/react";
import Swal from "sweetalert2";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaGraduationCap,
  FaEye,
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaUsers,
  FaClipboardList,
  FaUserCheck,
  FaSpinner,
  FaFileAlt,
  FaInfoCircle
} from "react-icons/fa";

export default function FacultyEnrollment({ pendingStudents: initialPendingStudents = [], approvedStudents: initialApprovedStudents = [], rejectedStudents: initialRejectedStudents = [], activeSchoolYear = null, auth }) {

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [pendingStudents, setPendingStudents] = useState(initialPendingStudents);
  const [approvedStudents, setApprovedStudents] = useState(initialApprovedStudents);
  const [rejectedStudents, setRejectedStudents] = useState(initialRejectedStudents);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStrand, setFilterStrand] = useState("all");
  const [currentTab, setCurrentTab] = useState("pending");
  const [activeTab, setActiveTab] = useState("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // COR Modal states
  const [showCORModal, setShowCORModal] = useState(false);
  const [selectedStudentForCOR, setSelectedStudentForCOR] = useState(null);
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableStrands, setAvailableStrands] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [subjects, setSubjects] = useState([]);

  // existing: fetch sections/strands on mount
  useEffect(() => {
    // Initialize strands and sections on component mount
    fetchSectionsAndStrands();
  }, []);

  // existing: sync lists when props change
  useEffect(() => {
    // Update state when props change
    setPendingStudents(initialPendingStudents);
    setApprovedStudents(initialApprovedStudents);
    setRejectedStudents(initialRejectedStudents);
  }, [initialPendingStudents, initialApprovedStudents, initialRejectedStudents]);

  // NEW: Auto-fetch subjects whenever the selected strand changes
  useEffect(() => {
    if (selectedStrand) {
      fetchSubjectsForStrand(selectedStrand);
    } else {
      setSubjects([]);
    }
  }, [selectedStrand]);
  // Fetch sections and strands from API
  const fetchSectionsAndStrands = async (strandCode = null) => {
    try {
      const response = await fetch('/coordinator/sections-and-strands', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableStrands(data.strands || []);
        setAvailableSections(data.sections || []);
      } else {
        console.error('Failed to fetch sections and strands');
        // Fallback to mock data
        const mockStrands = [
          { id: 1, name: 'STEM', code: 'STEM' },
          { id: 2, name: 'ABM', code: 'ABM' },
          { id: 3, name: 'HUMSS', code: 'HUMSS' },
          { id: 4, name: 'GAS', code: 'GAS' }
        ];

        const mockSections = [
          { id: 1, name: 'Section A', strand_code: 'STEM' },
          { id: 2, name: 'Section B', strand_code: 'STEM' },
          { id: 3, name: 'Section A', strand_code: 'ABM' },
          { id: 4, name: 'Section B', strand_code: 'ABM' }
        ];

        setAvailableStrands(mockStrands);
        setAvailableSections(mockSections);
      }
    } catch (error) {
      console.error('Error fetching sections and strands:', error);
      // Fallback to mock data
      const mockStrands = [
        { id: 1, name: 'STEM', code: 'STEM' },
        { id: 2, name: 'ABM', code: 'ABM' },
        { id: 3, name: 'HUMSS', code: 'HUMSS' },
        { id: 4, name: 'GAS', code: 'GAS' }
      ];

      const mockSections = [
        { id: 1, name: 'Section A', strand_code: 'STEM' },
        { id: 2, name: 'Section B', strand_code: 'STEM' },
        { id: 3, name: 'Section A', strand_code: 'ABM' },
        { id: 4, name: 'Section B', strand_code: 'ABM' }
      ];

      setAvailableStrands(mockStrands);
      setAvailableSections(mockSections);
    }
  };

  // Fetch subjects for a specific strand from API
  const fetchSubjectsForStrand = async (strandCode) => {
    if (!strandCode) {
      setSubjects([]);
      return;
    }

    try {
      const response = await fetch(`/coordinator/subjects/${strandCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      } else {
        console.error('Failed to fetch subjects for strand:', strandCode);
        // Fallback to mock data
        const mockSubjects = [
          { id: 1, name: 'Mathematics', code: 'MATH101', strand_code: strandCode },
          { id: 2, name: 'Science', code: 'SCI101', strand_code: strandCode },
          { id: 3, name: 'English', code: 'ENG101', strand_code: strandCode },
          { id: 4, name: 'Filipino', code: 'FIL101', strand_code: strandCode }
        ];
        setSubjects(mockSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Fallback to mock data
      const mockSubjects = [
        { id: 1, name: 'Mathematics', code: 'MATH101', strand_code: strandCode },
        { id: 2, name: 'Science', code: 'SCI101', strand_code: strandCode },
        { id: 3, name: 'English', code: 'ENG101', strand_code: strandCode },
        { id: 4, name: 'Filipino', code: 'FIL101', strand_code: strandCode }
      ];
      setSubjects(mockSubjects);
    }
  };

  // Get student details from API instead of using mock data
  const handleViewStudent = async (studentId) => {
    try {
      const response = await fetch(`/coordinator/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const student = await response.json();
        setSelectedStudent(student);
        setShowModal(true);
      } else {
        console.error('Failed to fetch student details');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load student details. Please try again.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load student details. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  // Function to load document - display inline instead of opening new tab
  const loadDocument = (filename) => {
    try {
      const url = `/storage/enrollment_documents/${filename}`;
      return url; // Return URL for inline display
    } catch (error) {
      console.error('Error loading document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load document. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
      return null;
    }
  };

  const handleApproveStudent = async (studentId) => {
    // Find the student and open COR modal for section/strand assignment
    const student = pendingStudents.find(s => s.id === studentId);
    if (student) {
      setSelectedStudentForCOR(student);
      // Use first preference as default if available
      const defaultStrand = student.strand_preferences && student.strand_preferences.length > 0
        ? student.strand_preferences[0]
        : "";
      setSelectedStrand(defaultStrand);
      setShowCORModal(true);

      // Fetch sections for the selected strand
      // Fetch sections for the selected strand
      if (defaultStrand) {
        await fetchSectionsAndStrands(defaultStrand);
        // Preload subjects for the default strand to reduce friction
        await fetchSubjectsForStrand(defaultStrand);
      }
    }
  };

  // Fetch class schedules for enrolled student
  const fetchClassSchedulesForStudent = async (studentId, strandCode, sectionId) => {
    console.log('fetchClassSchedulesForStudent called with:', { studentId, strandCode, sectionId });

    if (!strandCode || !sectionId) {
      console.log('Missing strand or section:', { strandCode, sectionId });
      setClassSchedules([]);
      setLoadingSchedules(false);
      return;
    }

    try {
      setLoadingSchedules(true);

      // Find the strand ID from the selected strand code
      const strandObj = availableStrands.find(s => s.code === strandCode);
      const strandId = strandObj ? strandObj.id : null;

      console.log('Strand object found:', strandObj);

      if (!strandId) {
        console.error('Could not find strand ID for code:', strandCode);
        setClassSchedules([]);
        setLoadingSchedules(false);
        return;
      }

      // Get authentication token
      const token = localStorage.getItem('auth_token') || localStorage.getItem('faculty_token');

      if (!token) {
        console.error('No authentication token found');
        setClassSchedules([]);
        setLoadingSchedules(false);
        return;
      }

      // Use coordinator route for schedule fetching
      const apiUrl = `/coordinator/schedules/section/${sectionId}/strand/${strandId}`;
      console.log('Making request to:', apiUrl);

      // Fetch schedules for the selected section and strand
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Received schedule data:', data);
          setClassSchedules(data.schedules || []);
        } else {
          console.error('Response is not JSON:', contentType);
          const responseText = await response.text();
          console.error('Response text:', responseText.substring(0, 200));
          setClassSchedules([]);
        }
      } else {
        console.error('Failed to fetch schedules, status:', response.status);
        const responseText = await response.text();
        console.error('Error response:', responseText.substring(0, 200));

        // Check if it's an authentication error
        if (response.status === 401 || response.status === 403) {
          console.error('Authentication failed - user may not have coordinator permissions');
        }

        setClassSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setClassSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleRejectStudent = async (studentId) => {
    try {
      const { value: reason } = await Swal.fire({
        title: 'Reject Student Enrollment',
        input: 'textarea',
        inputLabel: 'Reason for rejection',
        inputPlaceholder: 'Please provide a reason for rejecting this enrollment...',
        inputAttributes: {
          'aria-label': 'Reason for rejection'
        },
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) {
            return 'You need to provide a reason for rejection!'
          }
        }
      });

      if (reason) {
        router.post(`/coordinator/students/${studentId}/reject`, {
          reason: reason
        }, {
          onSuccess: () => {
            Swal.fire({
              icon: 'success',
              title: 'Rejected!',
              text: 'Student enrollment has been rejected.',
              timer: 2000,
              showConfirmButton: false
            });
          },
          onError: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to reject student enrollment'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error rejecting student:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to reject student enrollment'
      });
    }
  };

  const handleFinalizeEnrollment = async () => {
    if (!selectedStudentForCOR || !selectedStrand || !selectedSection) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Information',
        text: 'Please select strand and section.'
      });
      return;
    }
    try {
      setIsSubmitting(true);

      router.post(`/coordinator/students/${selectedStudentForCOR.id}/finalize`, {
        strand: selectedStrand,
        section_id: selectedSection,
        // Include subjects only if selected; backend accepts nullable array
        subjects: selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : undefined
      }, {
        onSuccess: () => {
          Swal.fire({
            icon: 'success',
            title: 'Enrollment Finalized!',
            text: 'Student has been successfully enrolled.',
            timer: 2000,
            showConfirmButton: false
          });

          setShowCORModal(false);
          setSelectedStudentForCOR(null);
          setSelectedStrand("");
          setSelectedSection("");
          setSelectedSubjects([]);
          setIsSubmitting(false);
        },
        onError: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to finalize enrollment'
          });
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      console.error('Error finalizing enrollment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to finalize enrollment'
      });
      setIsSubmitting(false);
    }
  };

  const getFilteredStudents = () => {
    let students = [];
    switch (activeTab) {
      case 'pending':
        students = pendingStudents;
        break;
      case 'approved':
        students = approvedStudents;
        break;
      case 'rejected':
        students = rejectedStudents;
        break;
      default:
        students = pendingStudents;
    }

    return students.filter(student => {
      const studentName = `${student.user?.firstname || ''} ${student.user?.lastname || ''}`.trim();
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStrand = filterStrand === "all" || (student.strand?.name === filterStrand);

      return matchesSearch && matchesStrand;
    });
  };

  const getTabCount = (tab) => {
    switch (tab) {
      case 'pending':
        return pendingStudents.length;
      case 'approved':
        return approvedStudents.length;
      case 'rejected':
        return rejectedStudents.length;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-4xl text-purple-600" />
            <span className="ml-3 text-lg text-gray-600">Loading enrollment data...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <FacultySidebar onToggle={setIsCollapsed} />

      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Enrollment Management</h1>
          <p className="text-gray-600">Review and manage student enrollment applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{pendingStudents.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <FaClipboardList className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedStudents.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaUserCheck className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedStudents.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FaTimes className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={filterStrand}
                onChange={(e) => setFilterStrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Strands</option>
                {availableStrands.map(strand => (
                  <option key={strand.id} value={strand.code}>{strand.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'pending', label: 'Pending Review', color: 'orange' },
                { key: 'approved', label: 'Approved', color: 'green' },
                { key: 'rejected', label: 'Rejected', color: 'red' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.key
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label} ({getTabCount(tab.key)})
                </button>
              ))}
            </nav>
          </div>

          {/* Students List */}
          <div className="p-6">
            {getFilteredStudents().length === 0 ? (
              <div className="text-center py-12">
                <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-500">No students found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredStudents().map(student => (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {student.user?.firstname} {student.user?.lastname}
                          </h3>
                          <p className="text-sm text-gray-600">{student.user?.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {student.grade_level || 'N/A'}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              {student.strand?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStudent(student.id)}
                          title="View detailed student information"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center space-x-1"
                        >
                          <FaEye className="text-sm" />
                          <span>View</span>
                        </button>
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveStudent(student.id)}
                              title="Approve and assign strand/section (opens dialog)"
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <FaCheck className="text-sm" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectStudent(student.id)}
                              title="Reject pre-enrollment"
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <FaTimes className="text-sm" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <FaUser className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Student Enrollment Details</h2>
                    <p className="text-purple-100">{selectedStudent.user?.firstname} {selectedStudent.user?.lastname}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-white/20 rounded-full transition-colors duration-200"
                >
                  <FaTimes className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaUser className="mr-3 text-purple-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Full Name</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.user?.firstname} {selectedStudent.user?.lastname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Name Extension</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.extension_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">LRN</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.lrn || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Grade Level</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.grade_level || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Student Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedStudent.student_status === 'New Student' ? 'bg-green-100 text-green-800' :
                        selectedStudent.student_status === 'Continuing' ? 'bg-blue-100 text-blue-800' :
                        selectedStudent.student_status === 'Transferee' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudent.student_status || 'New Student'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Age</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.age || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sex</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Birthdate</label>
                    <p className="text-gray-800 font-medium mt-1">
                      {selectedStudent.birthdate ?
                        new Date(selectedStudent.birthdate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Birth Place</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.birth_place || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Religion</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.religion || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Address</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-blue-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaGraduationCap className="mr-3 text-blue-600" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Strand Preferences</label>
                    <div className="mt-2 space-y-2">
                      {selectedStudent.strand_preferences && selectedStudent.strand_preferences.length > 0 ? (
                        selectedStudent.strand_preferences.map((preference, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {index + 1}
                            </span>
                            <span className="text-gray-800 font-medium">
                              {typeof preference === 'object' ? preference.name : preference}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No strand preferences submitted</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last Grade Completed</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.last_grade || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last School Year</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.last_sy || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-purple-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaInfoCircle className="mr-3 text-purple-600" />
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">IP Community Member</label>
                    <p className="text-gray-800 font-medium mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStudent.ip_community === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudent.ip_community || 'Not specified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">4Ps Beneficiary</label>
                    <p className="text-gray-800 font-medium mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStudent.four_ps === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudent.four_ps || 'Not specified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PWD ID</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.pwd_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Special Needs</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.special_needs || 'None specified'}</p>
                  </div>
                </div>
              </div>

              {/* Documents & Images */}
              <div className="bg-green-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaEye className="mr-3 text-green-600" />
                  Submitted Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Student Photo */}
                  {selectedStudent.image && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Student Photo</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                        <img
                          src={`/storage/enrollment_documents/${selectedStudent.image}`}
                          alt="Student Photo"
                          className="w-32 h-32 object-cover rounded-lg mx-auto shadow-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="text-gray-500 hidden">
                          <FaUser className="text-4xl mx-auto mb-2" />
                          <p>Image not available</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PSA Birth Certificate */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PSA Birth Certificate</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                      {selectedStudent.psa_birth_certificate ? (
                        <div>
                          <img
                            src={`/storage/enrollment_documents/${selectedStudent.psa_birth_certificate}`}
                            alt="PSA Birth Certificate"
                            className="w-full h-32 object-cover rounded-lg shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="text-gray-500 hidden">
                            <FaFileAlt className="text-4xl mx-auto mb-2" />
                            <p>Document not available</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <FaEye className="text-4xl mx-auto mb-2" />
                          <p>No PSA Birth Certificate submitted</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Card */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Report Card</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                      {selectedStudent.report_card ? (
                        <div>
                          <img
                            src={`/storage/enrollment_documents/${selectedStudent.report_card}`}
                            alt="Report Card"
                            className="w-full h-32 object-cover rounded-lg shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="text-gray-500 hidden">
                            <FaFileAlt className="text-4xl mx-auto mb-2" />
                            <p>Document not available</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <FaEye className="text-4xl mx-auto mb-2" />
                          <p>No Report Card submitted</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-purple-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaClipboardList className="mr-3 text-purple-600" />
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">IP Community</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.ip_community || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">4Ps Beneficiary</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.four_ps || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PWD ID</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.pwd_id || 'N/A'}</p>
                  </div>
                  {selectedStudent.coordinator_notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Coordinator Notes</label>
                      <p className="text-gray-800 font-medium mt-1 bg-white p-3 rounded-lg border">{selectedStudent.coordinator_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COR Modal */}
      {showCORModal && selectedStudentForCOR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* COR Header */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="text-center py-4 border-b bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL - SENIOR HIGH SCHOOL</h3>
                <p className="text-sm text-gray-600 mt-1">Opol, Misamis Oriental</p>
                <div className="mt-3">
                  <p className="font-semibold">CLASS PROGRAM</p>
                  <p className="text-sm">School Year: [{activeSchoolYear?.year_start} - {activeSchoolYear?.year_end}]</p>
                  <p className="text-sm">Semester: {activeSchoolYear?.semester || '1st Semester'}</p>
                  <p className="text-sm font-medium">GRADE 11 - "{selectedSection ? availableSections.find(s => s.id == selectedSection)?.name || selectedSection : 'SECTION'}" ({selectedStrand} NAME)</p>
                </div>
              </div>

              {/* Student Information */}
              <div className="p-6 border-b">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p><strong>Student Name:</strong> {selectedStudentForCOR.user?.firstname} {selectedStudentForCOR.user?.lastname} {selectedStudentForCOR.extension_name || ''}</p>
                    <p><strong>Email:</strong> {selectedStudentForCOR.user?.email}</p>
                    <p><strong>Grade Level:</strong> {selectedStudentForCOR.grade_level || 'Grade 11'}</p>
                    <p><strong>Student Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStudentForCOR.student_status === 'New Student' ? 'bg-green-100 text-green-800' :
                        selectedStudentForCOR.student_status === 'Continuing' ? 'bg-blue-100 text-blue-800' :
                        selectedStudentForCOR.student_status === 'Transferee' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudentForCOR.student_status || 'New Student'}
                      </span>
                    </p>
                    <p><strong>Religion:</strong> {selectedStudentForCOR.religion || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Birthdate:</strong> {selectedStudentForCOR.birthdate ? new Date(selectedStudentForCOR.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    <p><strong>LRN:</strong> {selectedStudentForCOR.lrn || 'N/A'}</p>
                    <p><strong>IP Community:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStudentForCOR.ip_community === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudentForCOR.ip_community || 'N/A'}
                      </span>
                    </p>
                    <p><strong>4Ps Beneficiary:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStudentForCOR.four_ps === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStudentForCOR.four_ps || 'N/A'}
                      </span>
                    </p>
                    {selectedStudentForCOR.pwd_id && (
                      <p><strong>PWD ID:</strong> {selectedStudentForCOR.pwd_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="p-6 border-b bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Enrollment Assignment</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Strand
                    </label>
                    <select
                      value={selectedStrand}
                      onChange={(e) => {
                        console.log('Strand changed to:', e.target.value);
                        console.log('Current strand:', selectedStrand);
                        console.log('Available strands:', availableStrands);
                        setSelectedStrand(e.target.value);
                        setSelectedSection(""); // Reset section when strand changes
                        fetchSectionsAndStrands(e.target.value);
                        fetchSubjectsForStrand(e.target.value);
                        // Clear schedules when strand changes
                        setClassSchedules([]);
                        // Fetch class schedules when both strand and section are selected
                        if (e.target.value && selectedStudentForCOR) {
                          console.log('Calling fetchClassSchedulesForStudent with section:', selectedSection, 'strand:', e.target.value);
                          fetchClassSchedulesForStudent(selectedStudentForCOR?.id || 'no-student', e.target.value, selectedSection);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Strand</option>
                      {availableStrands.map(strand => (
                        <option key={strand.id} value={strand.code}>{strand.name} ({strand.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Section
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        console.log('Section changed to:', e.target.value);
                        console.log('Current strand:', selectedStrand);
                        console.log('Available strands:', availableStrands);
                        const newSectionId = e.target.value;
                        setSelectedSection(newSectionId);

                        // Fetch class schedules when both strand and section are selected
                        if (selectedStrand && newSectionId) {
                          console.log('Calling fetchClassSchedulesForStudent with section:', newSectionId, 'strand:', selectedStrand);
                          fetchClassSchedulesForStudent(selectedStudentForCOR?.id || 'no-student', selectedStrand, newSectionId);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!selectedStrand}
                    >
                      <option value="">Select Section</option>
                      {availableSections
                        .filter(section => !selectedStrand || section.strand_code === selectedStrand)
                        .map(section => (
                          <option key={section.id} value={section.id}>{section.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Class Schedules Section */}
                {selectedStrand && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-4 text-gray-800">Class Schedule</h4>

                    {/* Schedule Table */}
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        {loadingSchedules ? (
                          <div className="flex items-center justify-center py-8">
                            <FaSpinner className="animate-spin text-blue-600 mr-2" />
                            <span className="text-gray-600">Loading class schedules...</span>
                          </div>
                        ) : (
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Time</th>
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Monday</th>
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Tuesday</th>
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Wednesday</th>
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Thursday</th>
                                <th className="border border-gray-400 px-3 py-2 text-sm font-semibold">Friday</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Time slots */}
                              {[
                                { time: '7:30am to 8:00am', label: 'Flag Ceremony (Monday Only)', colspan: true },
                                { time: '8:00am to 10:00am', start: '08:00:00', end: '10:00:00' },
                                { time: '10:00am to 10:30am', label: 'Break Time (Recess)', colspan: true },
                                { time: '10:30am to 12:30pm', start: '10:30:00', end: '12:30:00' },
                                { time: '12:30pm to 1:30pm', label: 'Break Time (Lunch)', colspan: true },
                                { time: '1:30pm to 3:30pm', start: '13:30:00', end: '15:30:00' },
                                { time: '3:30pm to 4:30pm', start: '15:30:00', end: '16:30:00' },
                                { time: '4:30pm to 4:45pm', label: 'Flag Lowering (Friday Only)', colspan: true }
                              ].map((slot, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-400 px-2 py-1 text-xs font-medium bg-gray-50">
                                    {slot.time}
                                  </td>
                                  {slot.colspan ? (
                                    <td className="border border-gray-400 px-2 py-1 text-xs text-center bg-green-200" colSpan="5">
                                      {slot.label}
                                    </td>
                                  ) : (
                                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                      // Find all schedules that match this day and time slot
                                      const schedules = classSchedules.filter(s =>
                                        s.day_of_week === day &&
                                        s.start_time === slot.start
                                      );

                                      return (
                                        <td key={day} className="border border-gray-400 px-2 py-1 text-xs text-center">
                                          {schedules.length > 0 ? (
                                            schedules.map((schedule, idx) => (
                                              <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-300' : ''}>
                                                <div className="font-medium text-blue-800">{schedule.subject_name}</div>
                                                <div className="text-gray-600">({schedule.faculty_firstname} {schedule.faculty_lastname})</div>
                                                {schedule.room && <div className="text-gray-500 text-xs">{schedule.room}</div>}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="text-gray-400">-</div>
                                          )}
                                        </td>
                                      );
                                    })
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* No schedules message */}
                      {!loadingSchedules && classSchedules.length === 0 && selectedSection && (
                        <div className="text-center py-8 text-gray-500 border-t">
                          <FaFileAlt className="mx-auto text-3xl mb-3" />
                          <p className="font-medium">No class schedules available for this section yet.</p>
                          <p className="text-sm mt-1">Schedules will be available after enrollment is finalized.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Signature Section */}
              <div className="p-6 border-b">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="border-b border-gray-400 mb-2 pb-8"></div>
                    <p className="font-medium">Principal</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-400 mb-2 pb-8"></div>
                    <p className="font-medium">Academic Supervisor</p>
                  </div>
                </div>
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600">Prepared By: {auth?.user?.firstname} {auth?.user?.lastname} (Coordinator)</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 bg-gray-50 rounded-b-lg flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowCORModal(false);
                    setSelectedStudentForCOR(null);
                    setSelectedStrand("");
                    setSelectedSection("");
                    setSelectedSubjects([]);
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalizeEnrollment}
                  disabled={isSubmitting || !selectedStrand || !selectedSection}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && <FaSpinner className="animate-spin" />}
                  <span>{isSubmitting ? 'Finalizing...' : 'Finalize Enrollment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
