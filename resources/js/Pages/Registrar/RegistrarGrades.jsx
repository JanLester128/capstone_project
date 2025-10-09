import React, { useState, useEffect } from "react";
import { Head } from "@inertiajs/react";
import Sidebar from "../layouts/Sidebar";
import Swal from "sweetalert2";
import { 
  FaGraduationCap, 
  FaSearch, 
  FaCheck,
  FaTimes,
  FaUsers,
  FaFilter,
  FaEdit,
  FaEye,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaSpinner,
  FaChartLine,
  FaBookOpen,
  FaUserGraduate
} from "react-icons/fa";

export default function RegistrarGrades() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [studentsWithPendingGrades, setStudentsWithPendingGrades] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingStudents, setProcessingStudents] = useState(new Set());

  // Load students with pending grades
  useEffect(() => {
    loadStudentsWithPendingGrades();
  }, []);

  const loadStudentsWithPendingGrades = async () => {
    try {
      setLoading(true);
      const response = await fetch('/registrar/grades/students/pending');
      const data = await response.json();
      
      if (data.success) {
        setStudentsWithPendingGrades(data.students);
      } else {
        console.error('Failed to load students:', data.error);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStudentGrades = async (studentId, studentName) => {
    const result = await Swal.fire({
      title: 'Approve All Grades?',
      html: `Are you sure you want to approve <strong>ALL grades</strong> for:<br><br><strong>${studentName}</strong><br><br>This will approve all pending subject grades for this student.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve All',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        setProcessingStudents(prev => new Set(prev).add(studentId));
        
        const response = await fetch(`/registrar/grades/students/${studentId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify({
            approval_notes: 'Bulk approved by registrar'
          })
        });

        const data = await response.json();

        if (data.success) {
          // Remove student from pending list
          setStudentsWithPendingGrades(prev => 
            prev.filter(student => student.student_id !== studentId)
          );
          
          Swal.fire({
            title: 'Success!',
            html: `Successfully approved <strong>${data.approved_count} grades</strong> for ${studentName}`,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            showConfirmButton: false
          });
        } else {
          throw new Error(data.error || 'Failed to approve grades');
        }
      } catch (error) {
        console.error('Error approving grades:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to approve grades. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setProcessingStudents(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }
    }
  };

  const handleRejectStudentGrades = async (studentId, studentName) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject All Grades',
      html: `Please provide a reason for rejecting <strong>ALL grades</strong> for:<br><br><strong>${studentName}</strong>`,
      input: 'textarea',
      inputPlaceholder: 'Enter rejection reason...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject All Grades',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason for rejection!';
        }
      }
    });

    if (reason) {
      try {
        setProcessingStudents(prev => new Set(prev).add(studentId));
        
        const response = await fetch(`/registrar/grades/students/${studentId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify({
            approval_notes: reason
          })
        });

        const data = await response.json();

        if (data.success) {
          // Remove student from pending list
          setStudentsWithPendingGrades(prev => 
            prev.filter(student => student.student_id !== studentId)
          );
          
          Swal.fire({
            title: 'Grades Rejected',
            html: `Successfully rejected <strong>${data.rejected_count} grades</strong> for ${studentName}.<br>Faculty has been notified.`,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            showConfirmButton: false
          });
        } else {
          throw new Error(data.error || 'Failed to reject grades');
        }
      } catch (error) {
        console.error('Error rejecting grades:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to reject grades. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setProcessingStudents(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }
    }
  };

  const filteredStudents = studentsWithPendingGrades.filter(student =>
    student.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.strand_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Head title="Grades Management - ONSTS" />
        <Sidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaSpinner className="text-4xl text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">Loading Grades...</p>
              <p className="text-sm text-gray-500">Please wait while we fetch the data</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Head title="Grades Management - ONSTS" />
      <Sidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <FaClipboardCheck className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Grades Management</h1>
                <p className="text-gray-600">Review and approve faculty grade submissions</p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Students Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{studentsWithPendingGrades.length}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <FaClock className="text-yellow-600 text-xl" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Pending Grades</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {studentsWithPendingGrades.reduce((sum, student) => sum + parseInt(student.pending_grades_count), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <FaBookOpen className="text-orange-600 text-xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Processing</p>
                    <p className="text-3xl font-bold text-blue-600">{processingStudents.size}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FaSpinner className={`text-blue-600 text-xl ${processingStudents.size > 0 ? 'animate-spin' : ''}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, LRN, section, or strand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mb-4">
                  <FaClipboardCheck className="text-4xl text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Students with Pending Grades
                </h3>
                <p className="text-gray-600">
                  All student grades have been reviewed and approved.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Student Information
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Section & Strand
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Pending Grades
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Latest Submission
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const isProcessing = processingStudents.has(student.student_id);
                      const studentName = `${student.firstname} ${student.lastname}`;
                      
                      return (
                        <tr key={student.student_id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{studentName}</div>
                                <div className="text-sm text-gray-500">LRN: {student.lrn}</div>
                                <div className="text-xs text-gray-400">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                                {student.section_name || 'No Section'}
                              </span>
                              <div className="text-sm text-gray-600">{student.strand_name || 'No Strand'}</div>
                              <div className="text-xs text-gray-500">Grade {student.grade_level}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-yellow-100 rounded-lg">
                                <FaBookOpen className="text-yellow-600 text-sm" />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-yellow-600">{student.pending_grades_count}</div>
                                <div className="text-xs text-gray-500">subjects</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(student.latest_submission).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(student.latest_submission).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveStudentGrades(student.student_id, studentName)}
                                disabled={isProcessing}
                                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm"
                                title={`Approve all ${student.pending_grades_count} grades for this student`}
                              >
                                {isProcessing ? (
                                  <FaSpinner className="text-sm animate-spin" />
                                ) : (
                                  <FaCheck className="text-sm" />
                                )}
                                Approve All
                              </button>
                              <button
                                onClick={() => handleRejectStudentGrades(student.student_id, studentName)}
                                disabled={isProcessing}
                                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm"
                                title={`Reject all ${student.pending_grades_count} grades for this student`}
                              >
                                <FaTimes className="text-sm" />
                                Reject All
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
