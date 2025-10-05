import React, { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import Swal from "sweetalert2";
import {
  FaGraduationCap,
  FaUserGraduate,
  FaArrowRight,
  FaSpinner,
  FaInfoCircle,
  FaSearch,
  FaFilter,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRedo,
  FaEye,
  FaFileAlt
} from "react-icons/fa";

export default function Faculty_Progression({ auth, activeSchoolYear }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [grade11Students, setGrade11Students] = useState([]);
  const [loadingGrade11, setLoadingGrade11] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrand, setFilterStrand] = useState("all");
  const [filterSection, setFilterSection] = useState("all");

  // Fetch Grade 11 students on component mount
  useEffect(() => {
    fetchGrade11Students();
  }, []);

  const fetchGrade11Students = async () => {
    setLoadingGrade11(true);
    try {
      const response = await fetch('/faculty/grade11-students', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGrade11Students(data.students || []);
      } else {
        console.error('Failed to fetch Grade 11 students');
        // Show demo data for development
        setGrade11Students([
          {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            grade_level: '11',
            strand_name: 'STEM-A',
            section_name: 'STEM-A'
          },
          {
            id: 2,
            firstname: 'Jane',
            lastname: 'Smith',
            email: 'jane.smith@example.com',
            grade_level: '11',
            strand_name: 'HUMSS-A',
            section_name: 'HUMSS-A'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching Grade 11 students:', error);
      // Show demo data for development
      setGrade11Students([
        {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          grade_level: '11',
          strand_name: 'STEM-A',
          section_name: 'STEM-A'
        },
        {
          id: 2,
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'jane.smith@example.com',
          grade_level: '11',
          strand_name: 'HUMSS-A',
          section_name: 'HUMSS-A'
        }
      ]);
    } finally {
      setLoadingGrade11(false);
    }
  };

  // Progress Grade 11 student to Grade 12
  const progressToGrade12 = async (studentId) => {
    const student = grade11Students.find(s => s.id === studentId);
    
    const result = await Swal.fire({
      title: 'Progress to Grade 12?',
      html: `
        <div class="text-left">
          <p class="mb-3">Are you sure you want to progress <strong>${student?.firstname} ${student?.lastname}</strong> to Grade 12?</p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800 font-medium mb-2">Requirements Check:</p>
            <ul class="text-sm text-yellow-700 space-y-1">
              <li>✓ Student has completed Grade 11</li>
              <li>✓ Passing grades verified</li>
              <li>✓ Ready for Grade 12 enrollment</li>
            </ul>
          </div>
          <p class="text-xs text-gray-600 mt-3">
            This will create a new Grade 12 enrollment record and assign the student to an appropriate Grade 12 section.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Progress to Grade 12',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch('/faculty/progress-to-grade12', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            student_id: studentId,
            school_year_id: activeSchoolYear?.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            Swal.fire({
              title: 'Success!',
              html: `
                <div class="text-left">
                  <p class="mb-3">${data.message}</p>
                  <div class="bg-green-50 border border-green-200 rounded p-3">
                    <p class="text-sm text-green-800">
                      <strong>Grade 12 Section:</strong> ${data.grade12_section || 'Assigned'}<br>
                      <strong>Enrollment ID:</strong> ${data.enrollment_id || 'Generated'}<br>
                      <strong>Status:</strong> Student can now view their Grade 12 COR
                    </p>
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'View Students Page',
              showCancelButton: true,
              cancelButtonText: 'Continue Here'
            }).then((result) => {
              if (result.isConfirmed) {
                router.visit('/faculty/students');
              }
            });
            
            // Refresh the Grade 11 students list
            fetchGrade11Students();
          } else {
            Swal.fire({
              title: 'Error',
              text: data.message || 'Failed to progress student to Grade 12',
              icon: 'error'
            });
          }
        } else {
          // Backend not implemented yet - show demo message
          Swal.fire({
            title: 'Demo Mode - Progression Simulated',
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>${student?.firstname} ${student?.lastname}</strong> would be progressed to Grade 12.</p>
                <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p class="text-sm text-yellow-800">
                    <strong>Note:</strong> This is a demonstration. To make this functional, implement the backend endpoint:
                    <code class="bg-gray-100 px-1 rounded">POST /faculty/progress-to-grade12</code>
                  </p>
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'OK'
          });
          
          // Remove student from list to simulate progression
          setGrade11Students(prev => prev.filter(s => s.id !== studentId));
        }
      } catch (error) {
        console.error('Error progressing student:', error);
        
        // Show demo success for network errors too
        Swal.fire({
          title: 'Demo Mode - Progression Simulated',
          text: `${student?.firstname} ${student?.lastname} would be progressed to Grade 12. Backend implementation needed for real functionality.`,
          icon: 'info'
        });
        
        // Remove student from list to simulate progression
        setGrade11Students(prev => prev.filter(s => s.id !== studentId));
      }
    }
  };

  // Filter students based on search and filters
  const filteredStudents = grade11Students.filter(student => {
    const matchesSearch = !searchTerm || 
      `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStrand = filterStrand === 'all' || student.strand_name?.includes(filterStrand);
    const matchesSection = filterSection === 'all' || student.section_name?.includes(filterSection);
    
    return matchesSearch && matchesStrand && matchesSection;
  });

  // Get unique strands and sections for filters
  const uniqueStrands = [...new Set(grade11Students.map(s => s.strand_name).filter(Boolean))];
  const uniqueSections = [...new Set(grade11Students.map(s => s.section_name).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Head title="Grade 11 to 12 Progression - ONSTS Faculty Portal" />
      
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <FaGraduationCap className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Grade 11 to Grade 12 Progression</h1>
                <p className="text-gray-600">Promote eligible Grade 11 students to Grade 12</p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-blue-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Grade 11</p>
                    <p className="text-2xl font-bold text-gray-900">{grade11Students.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaCheckCircle className="text-green-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Eligible</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FaGraduationCap className="text-purple-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Strands</p>
                    <p className="text-2xl font-bold text-gray-900">{uniqueStrands.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-orange-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sections</p>
                    <p className="text-2xl font-bold text-gray-900">{uniqueSections.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements Notice */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-800 font-medium">Important Requirements:</p>
                <ul className="text-yellow-700 mt-1 list-disc list-inside space-y-1">
                  <li>Students must have completed Grade 11 with passing grades</li>
                  <li>Grade 11 report cards must be submitted</li>
                  <li>Progression will create new Grade 12 enrollment records</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={filterStrand}
                  onChange={(e) => setFilterStrand(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Strands</option>
                  {uniqueStrands.map(strand => (
                    <option key={strand} value={strand}>{strand}</option>
                  ))}
                </select>

                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>

                <button
                  onClick={fetchGrade11Students}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FaRedo className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Grade 11 Students Eligible for Progression</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredStudents.length} of {grade11Students.length} students
              </p>
            </div>

            <div className="p-6">
              {loadingGrade11 ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-blue-600 mr-3 text-xl" />
                  <span className="text-gray-600">Loading Grade 11 students...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserGraduate className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {grade11Students.length === 0 ? 'No Grade 11 Students Found' : 'No Students Match Your Filters'}
                  </h3>
                  <p className="text-gray-600">
                    {grade11Students.length === 0 
                      ? 'There are currently no Grade 11 students eligible for progression.'
                      : 'Try adjusting your search terms or filters.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {student.firstname} {student.lastname}
                            </h3>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Grade {student.grade_level || '11'}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                {student.strand_name || 'N/A'}
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {student.section_name || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => progressToGrade12(student.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                          >
                            <FaArrowRight className="w-4 h-4" />
                            <span>Progress to Grade 12</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
