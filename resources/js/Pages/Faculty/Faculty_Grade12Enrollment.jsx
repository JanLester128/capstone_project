import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import {
  FaGraduationCap,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSpinner,
  FaSearch,
  FaUsers,
  FaArrowUp,
  FaClipboardCheck,
  FaEye
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Faculty_Grade12Enrollment({ auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSchoolYear, setCurrentSchoolYear] = useState('');

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Fetch eligible students on component mount
  useEffect(() => {
    fetchEligibleStudents();
  }, []);

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/faculty/grade12-eligible-students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEligibleStudents(data.eligible_students || []);
        setCurrentSchoolYear(data.current_school_year || '');
      } else {
        throw new Error('Failed to fetch eligible students');
      }
    } catch (err) {
      console.error('Error fetching eligible students:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Students',
        text: 'Unable to load eligible students. Please refresh the page.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  // HCI Principle 3: User control and freedom - Bulk selection
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // HCI Principle 6: Recognition rather than recall - Search functionality
  const filteredStudents = eligibleStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.grade11_strand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  const processAutoEnrollment = async (action) => {
    if (selectedStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Students Selected',
        text: 'Please select at least one student to process.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const actionText = action === 'approve' ? 'approve' : 'reject';
    const confirmResult = await Swal.fire({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Grade 12 Auto-Enrollment?`,
      html: `
        <div class="text-left">
          <p class="mb-3">You are about to ${actionText} Grade 12 auto-enrollment for:</p>
          <div class="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
            ${selectedStudents.map(id => {
              const student = eligibleStudents.find(s => s.id === id);
              return `<div class="text-sm mb-1">• ${student?.name} (${student?.grade11_strand})</div>`;
            }).join('')}
          </div>
          <p class="mt-3 text-sm text-gray-600">
            ${action === 'approve' 
              ? 'Students will be automatically enrolled in Grade 12 with their previous strand.' 
              : 'Students will need to manually enroll for Grade 12.'}
          </p>
        </div>
      `,
      icon: action === 'approve' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) return;

    try {
      setProcessing(true);
      
      const response = await fetch('/faculty/process-grade12-auto-enrollment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          student_ids: selectedStudents,
          action: action,
          notes: `${action === 'approve' ? 'Approved' : 'Rejected'} by ${auth?.user?.firstname} ${auth?.user?.lastname} on ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        Swal.fire({
          icon: 'success',
          title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)}ed Successfully!`,
          html: `
            <div class="text-left">
              <p class="mb-2">Processed ${result.processed_count} students successfully.</p>
              ${result.errors?.length > 0 ? `
                <div class="mt-3 p-3 bg-red-50 rounded">
                  <p class="text-red-800 font-medium mb-2">Errors encountered:</p>
                  <ul class="text-red-700 text-sm">
                    ${result.errors.map(error => `<li>• ${error}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `,
          confirmButtonColor: '#10b981'
        });

        // Refresh the list
        setSelectedStudents([]);
        fetchEligibleStudents();
        
      } else {
        throw new Error('Processing failed');
      }
    } catch (err) {
      console.error('Error processing auto-enrollment:', err);
      Swal.fire({
        icon: 'error',
        title: 'Processing Failed',
        text: 'Unable to process the auto-enrollment. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setProcessing(false);
    }
  };

  const viewStudentDetails = (student) => {
    Swal.fire({
      title: 'Student Details',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-blue-50 p-4 rounded">
            <h4 class="font-semibold text-blue-800 mb-2">Personal Information</h4>
            <p><strong>Name:</strong> ${student.name}</p>
            <p><strong>Email:</strong> ${student.email}</p>
          </div>
          <div class="bg-green-50 p-4 rounded">
            <h4 class="font-semibold text-green-800 mb-2">Grade 11 Information</h4>
            <p><strong>Strand:</strong> ${student.grade11_strand}</p>
            <p><strong>Section:</strong> ${student.grade11_section}</p>
            <p><strong>School Year:</strong> ${student.grade11_school_year}</p>
          </div>
          <div class="bg-yellow-50 p-4 rounded">
            <h4 class="font-semibold text-yellow-800 mb-2">Progression Status</h4>
            <p><strong>Status:</strong> ${student.progression_status.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Eligible for Auto-Enrollment:</strong> ${student.auto_enroll_eligible ? 'Yes' : 'No'}</p>
          </div>
        </div>
      `,
      width: '500px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#3b82f6'
    });
  };

  return (
    <>
      <Head title="Grade 12 Auto-Enrollment - Faculty Portal" />
      <div className="flex h-screen bg-gray-50">
        <Faculty_Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed}
          activePage="enrollment"
        />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Grade 12 Auto-Enrollment</h1>
                <p className="text-gray-600">Manage Grade 12 progression for eligible students - {currentSchoolYear}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaUser className="w-4 h-4" />
                <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading eligible students...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100">
                          <FaUsers className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Eligible Students</p>
                          <p className="text-2xl font-bold text-gray-900">{eligibleStudents.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100">
                          <FaArrowUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Selected for Processing</p>
                          <p className="text-2xl font-bold text-gray-900">{selectedStudents.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100">
                          <FaGraduationCap className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Target School Year</p>
                          <p className="text-lg font-bold text-gray-900">{currentSchoolYear}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 max-w-md">
                        <div className="relative">
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
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSelectAll}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                        </button>
                        
                        <button
                          onClick={() => processAutoEnrollment('approve')}
                          disabled={selectedStudents.length === 0 || processing}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          {processing ? (
                            <FaSpinner className="animate-spin mr-2" />
                          ) : (
                            <FaCheckCircle className="mr-2" />
                          )}
                          Approve Selected ({selectedStudents.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Students List */}
                  {filteredStudents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                      <FaInfoCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {eligibleStudents.length === 0 ? 'No Eligible Students Found' : 'No Students Match Your Search'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {eligibleStudents.length === 0 
                          ? 'There are currently no students eligible for Grade 12 auto-enrollment. This could mean all Grade 11 students have already been processed or there are no Grade 11 completers from the previous year.'
                          : 'Try adjusting your search terms to find students.'
                        }
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                  onChange={handleSelectAll}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Grade 11 Details
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.map((student) => (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(student.id)}
                                    onChange={() => handleStudentSelect(student.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-sm font-medium text-blue-800">
                                          {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                      <div className="text-sm text-gray-500">{student.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    <div><strong>Strand:</strong> {student.grade11_strand}</div>
                                    <div><strong>Section:</strong> {student.grade11_section}</div>
                                    <div className="text-xs text-gray-500">{student.grade11_school_year}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <FaClock className="mr-1" />
                                    Pending Auto-Enrollment
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => viewStudentDetails(student)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                  >
                                    <FaEye className="mr-1" />
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
