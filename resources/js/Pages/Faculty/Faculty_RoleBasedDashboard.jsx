import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import {
  FaUsers,
  FaUser,
  FaChalkboardTeacher,
  FaUserTie,
  FaGraduationCap,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaEye,
  FaClipboardCheck,
  FaSpinner,
  FaBook,
  FaSchool
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Faculty_RoleBasedDashboard({ auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState('overview');
  const [schoolYears, setSchoolYears] = useState([]);

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Fetch dashboard data
  const fetchDashboardData = async (schoolYearId = null) => {
    try {
      setLoading(true);
      const url = schoolYearId 
        ? `/faculty/dashboard-data?school_year_id=${schoolYearId}`
        : '/faculty/dashboard-data';
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Dashboard',
        text: 'Unable to load dashboard data. Please refresh the page.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch school years for filtering
  const fetchSchoolYears = async () => {
    try {
      const response = await fetch('/registrar/school-years/data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchoolYears(data.school_years || []);
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSchoolYears();
  }, []);

  useEffect(() => {
    if (selectedSchoolYear) {
      fetchDashboardData(selectedSchoolYear);
    }
  }, [selectedSchoolYear]);

  // Handle pre-enrollment approval/rejection (Coordinator only)
  const handlePreEnrollmentAction = async (enrollmentId, action, notes = '') => {
    try {
      const response = await fetch('/faculty/process-pre-enrollment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          action: action,
          notes: notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        Swal.fire({
          icon: 'success',
          title: `Pre-enrollment ${action}d!`,
          text: result.message,
          timer: 3000,
          showConfirmButton: false
        });
        
        // Refresh data
        fetchDashboardData(selectedSchoolYear);
      } else {
        throw new Error('Failed to process pre-enrollment');
      }
    } catch (error) {
      console.error('Error processing pre-enrollment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Processing Failed',
        text: 'Unable to process the pre-enrollment. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Show confirmation dialog for pre-enrollment actions
  const confirmPreEnrollmentAction = (enrollment, action) => {
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Pre-enrollment?`,
      html: `
        <div class="text-left">
          <p class="mb-3">Student: <strong>${enrollment.student_name}</strong></p>
          <p class="mb-3">Strand: <strong>${enrollment.strand}</strong></p>
          <p class="mb-3">Section: <strong>${enrollment.section}</strong></p>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes (optional):</label>
            <textarea id="coordinator-notes" class="w-full p-2 border border-gray-300 rounded-md" rows="3" placeholder="Add any notes about this decision..."></textarea>
          </div>
        </div>
      `,
      icon: action === 'approve' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const notes = document.getElementById('coordinator-notes').value;
        return { notes };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handlePreEnrollmentAction(enrollment.id, action, result.value.notes);
      }
    });
  };

  // Filter students based on search term
  const filterStudents = (students) => {
    if (!searchTerm) return students;
    return students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.strand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return (
      <>
        <Head title="Faculty Dashboard - Role-Based View" />
        <div className="flex h-screen bg-gray-50">
          <Faculty_Sidebar onToggle={handleSidebarToggle} />
          
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title="Faculty Dashboard - Role-Based View" />
      <div className="flex h-screen bg-gray-50">
        <Faculty_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Faculty Dashboard</h1>
                <p className="text-gray-600">{dashboardData?.role_description}</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* School Year Filter */}
                <select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Current School Year</option>
                  {schoolYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.year_start}-{year.year_end} ({year.semester})
                    </option>
                  ))}
                </select>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaUser className="w-4 h-4" />
                  <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Role-based Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Adviser Card */}
                {dashboardData?.adviser_section && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <FaUserTie className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Section Adviser</p>
                        <p className="text-2xl font-bold text-gray-900">{dashboardData.adviser_section.section_name}</p>
                        <p className="text-sm text-gray-500">{dashboardData.adviser_section.strand?.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teaching Assignments Card */}
                {dashboardData?.teaching_assignments?.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100">
                        <FaChalkboardTeacher className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Teaching Subjects</p>
                        <p className="text-2xl font-bold text-gray-900">{dashboardData.teaching_assignments.length}</p>
                        <p className="text-sm text-gray-500">Assigned subjects</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Students Count Card */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100">
                      <FaUsers className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData?.students?.length || 0}</p>
                      <p className="text-sm text-gray-500">Under your supervision</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Toggle Tabs */}
              <div className="bg-white rounded-lg shadow-sm border mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => setSelectedView('overview')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        selectedView === 'overview'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaEye className="inline mr-2" />
                      Overview
                    </button>
                    
                    {dashboardData?.is_coordinator && (
                      <button
                        onClick={() => setSelectedView('pre-enrollments')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          selectedView === 'pre-enrollments'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <FaClipboardCheck className="inline mr-2" />
                        Pre-enrollments ({dashboardData?.pre_enrollments?.length || 0})
                      </button>
                    )}
                    
                    {dashboardData?.is_coordinator && (
                      <button
                        onClick={() => setSelectedView('by-section')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          selectedView === 'by-section'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <FaSchool className="inline mr-2" />
                        By Section
                      </button>
                    )}
                  </nav>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-gray-200">
                  <div className="relative max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students by name, email, or strand..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Content based on selected view */}
                <div className="p-6">
                  {selectedView === 'overview' && (
                    <div>
                      {/* Students List */}
                      {dashboardData?.students?.length > 0 ? (
                        <div className="space-y-4">
                          {filterStudents(dashboardData.students).map((student) => (
                            <div key={student.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-800">
                                      {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-900">{student.name}</h3>
                                    <p className="text-sm text-gray-500">{student.email}</p>
                                    <div className="flex items-center space-x-4 mt-1">
                                      <span className="text-xs text-gray-600">
                                        <FaGraduationCap className="inline mr-1" />
                                        {student.strand}
                                      </span>
                                      {student.subject && (
                                        <span className="text-xs text-gray-600">
                                          <FaBook className="inline mr-1" />
                                          {student.subject}
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        student.enrollment_status === 'enrolled' || student.enrollment_status === 'approved'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {student.enrollment_status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {student.view_type === 'adviser' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Adviser View</span>}
                                  {student.view_type === 'teacher' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Teacher View</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FaUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Students Found</h3>
                          <p className="text-gray-500">
                            {searchTerm 
                              ? 'No students match your search criteria.'
                              : 'No students are currently assigned to you for this school year.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedView === 'pre-enrollments' && dashboardData?.is_coordinator && (
                    <div>
                      {dashboardData?.pre_enrollments?.length > 0 ? (
                        <div className="space-y-4">
                          {filterStudents(dashboardData.pre_enrollments).map((enrollment) => (
                            <div key={enrollment.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-yellow-800">
                                      {enrollment.student_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-900">{enrollment.student_name}</h3>
                                    <p className="text-sm text-gray-500">{enrollment.email}</p>
                                    <div className="flex items-center space-x-4 mt-1">
                                      <span className="text-xs text-gray-600">
                                        <FaGraduationCap className="inline mr-1" />
                                        {enrollment.strand}
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        <FaSchool className="inline mr-1" />
                                        {enrollment.section}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Submitted: {new Date(enrollment.submitted_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => confirmPreEnrollmentAction(enrollment, 'approve')}
                                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center"
                                  >
                                    <FaCheckCircle className="mr-1" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => confirmPreEnrollmentAction(enrollment, 'reject')}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center"
                                  >
                                    <FaTimesCircle className="mr-1" />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FaClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pre-enrollments</h3>
                          <p className="text-gray-500">No pre-enrollments are currently pending your review.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedView === 'by-section' && dashboardData?.is_coordinator && (
                    <div>
                      {dashboardData?.enrolled_by_section && Object.keys(dashboardData.enrolled_by_section).length > 0 ? (
                        <div className="space-y-6">
                          {Object.entries(dashboardData.enrolled_by_section).map(([sectionName, students]) => (
                            <div key={sectionName} className="bg-white border border-gray-200 rounded-lg">
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                  <FaSchool className="mr-2 text-blue-600" />
                                  Section {sectionName}
                                  <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                                    {students.length} students
                                  </span>
                                </h3>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {students.map((student) => (
                                    <div key={student.id} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-blue-800">
                                            {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                          </span>
                                        </div>
                                        <div className="ml-3">
                                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                          <p className="text-xs text-gray-500">{student.strand}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FaSchool className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Enrolled Students by Section</h3>
                          <p className="text-gray-500">No students are enrolled and grouped by sections for this school year.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
