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
  const [pendingGrades, setPendingGrades] = useState([]);
  const [approvedGrades, setApprovedGrades] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  const mockPendingGrades = [
    {
      id: 1,
      faculty: "John Smith",
      subject: "Mathematics Grade 11",
      section: "STEM-A",
      submittedAt: "2024-08-30 14:30:00",
      studentsCount: 32,
      status: "pending",
      grades: [
        { studentId: "2024-001", name: "Juan Dela Cruz", prelim: "A", midterm: "A-", final: "B+", average: "92.5" },
        { studentId: "2024-002", name: "Maria Santos", prelim: "B+", midterm: "A", final: "A-", average: "90.0" }
      ]
    },
    {
      id: 2,
      faculty: "Sarah Johnson",
      subject: "Physics",
      section: "STEM-B",
      submittedAt: "2024-08-30 10:15:00",
      studentsCount: 28,
      status: "pending",
      grades: [
        { studentId: "2024-003", name: "Pedro Garcia", prelim: "B", midterm: "B+", final: "A-", average: "88.5" }
      ]
    }
  ];

  const mockApprovedGrades = [
    {
      id: 3,
      faculty: "Lisa Brown",
      subject: "Chemistry",
      section: "STEM-A",
      approvedAt: "2024-08-29 16:45:00",
      studentsCount: 30,
      status: "approved"
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPendingGrades(mockPendingGrades);
      setApprovedGrades(mockApprovedGrades);
      setLoading(false);
    }, 1000);
  }, []);

  const handleApproveGrades = async (gradeSubmissionId) => {
    const result = await Swal.fire({
      title: 'Approve Grades?',
      text: 'Are you sure you want to approve these grades? This action cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // API call to approve grades
        console.log(`Approving grades for submission ${gradeSubmissionId}`);
        
        // Update local state
        const submission = pendingGrades.find(g => g.id === gradeSubmissionId);
        if (submission) {
          setApprovedGrades([...approvedGrades, { ...submission, status: 'approved', approvedAt: new Date().toISOString() }]);
          setPendingGrades(pendingGrades.filter(g => g.id !== gradeSubmissionId));
          
          Swal.fire({
            title: 'Success!',
            text: 'Grades have been approved successfully.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to approve grades. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handleRejectGrades = async (gradeSubmissionId) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Grades',
      text: 'Please provide a reason for rejecting these grades:',
      input: 'textarea',
      inputPlaceholder: 'Enter rejection reason...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject Grades',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason for rejection!';
        }
      }
    });

    if (reason) {
      try {
        // API call to reject grades
        console.log(`Rejecting grades for submission ${gradeSubmissionId}:`, reason);
        
        // Remove from pending
        setPendingGrades(pendingGrades.filter(g => g.id !== gradeSubmissionId));
        
        Swal.fire({
          title: 'Grades Rejected',
          text: 'The grades have been rejected and faculty has been notified.',
          icon: 'success',
          confirmButtonColor: '#10b981',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to reject grades. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const filteredGrades = (selectedTab === "pending" ? pendingGrades : approvedGrades).filter(grade =>
    grade.faculty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grade.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grade.section.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Reviews</p>
                    <p className="text-3xl font-bold text-yellow-600">{pendingGrades.length}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <FaClock className="text-yellow-600 text-xl" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Approved Grades</p>
                    <p className="text-3xl font-bold text-green-600">{approvedGrades.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FaCheckCircle className="text-green-600 text-xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {[...pendingGrades, ...approvedGrades].reduce((sum, grade) => sum + grade.studentsCount, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FaUserGraduate className="text-blue-600 text-xl" />
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
                  placeholder="Search by faculty, subject, or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 bg-white rounded-t-2xl">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setSelectedTab("pending")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    selectedTab === "pending"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FaClock className="text-sm" />
                    Pending Review ({pendingGrades.length})
                  </div>
                </button>
                <button
                  onClick={() => setSelectedTab("approved")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    selectedTab === "approved"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FaCheckCircle className="text-sm" />
                    Approved ({approvedGrades.length})
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Grades List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredGrades.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mb-4">
                  <FaClipboardCheck className="text-4xl text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedTab === "pending" ? "No Pending Grades" : "No Approved Grades"}
                </h3>
                <p className="text-gray-600">
                  {selectedTab === "pending" 
                    ? "All grade submissions have been reviewed." 
                    : "No grades have been approved yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Faculty & Subject
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Section
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {selectedTab === "pending" ? "Submitted" : "Approved"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGrades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{grade.faculty}</div>
                            <div className="text-sm text-gray-500">{grade.subject}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {grade.section}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FaUsers className="text-gray-400 text-sm" />
                            <span className="text-sm font-medium text-gray-900">{grade.studentsCount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(selectedTab === "pending" ? grade.submittedAt : grade.approvedAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(selectedTab === "pending" ? grade.submittedAt : grade.approvedAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200">
                              <FaEye className="text-sm" />
                            </button>
                            {selectedTab === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApproveGrades(grade.id)}
                                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all duration-200"
                                  title="Approve grades"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleRejectGrades(grade.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                                  title="Reject grades"
                                >
                                  <FaTimes className="text-sm" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
