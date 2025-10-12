import React, { useState, useEffect } from "react";
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
  FaEye,
  FaPrint,
  FaSearch,
  FaFilter,
  FaUsers,
  FaUserCheck,
  FaUserPlus,
  FaExchangeAlt,
  FaSpinner,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaIdCard,
  FaUserGraduate,
  FaBook,
  FaTable,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaDownload,
  FaFileExport,
  FaArrowUp,
  FaLevelUpAlt,
  FaCheckCircle,
  FaQuestionCircle,
  FaInfoCircle
} from "react-icons/fa";

export default function Faculty_Students({ enrolledStudents, allowFacultyCorPrint = true, auth }) {
  // Debug logging
  console.log('Faculty_Students Debug:', {
    enrolledStudents: enrolledStudents,
    enrolledStudentsLength: enrolledStudents ? enrolledStudents.length : 'undefined',
    allowFacultyCorPrint: allowFacultyCorPrint,
    auth: auth
  });
  const { user, flash } = usePage().props;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrand, setFilterStrand] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('lastname');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Enhanced UI/UX States following HCI principles
  const [activeTab, setActiveTab] = useState('all'); // all, new, continuing, transferee
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  


  const printModalContent = () => {
    window.print();
  };

  const printModalContent2 = () => {
    window.print();
  };

  // Grade Progression Functions
  const fetchGrade11Students = async () => {
    try {
      setLoadingProgression(true);
      const response = await fetch('/faculty/grade11-students-for-progression', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGrade11Students(data.students);
          setProgressionAllowed(data.allow_progression);
        }
      }
    } catch (error) {
      console.error('Error fetching Grade 11 students:', error);
    } finally {
      setLoadingProgression(false);
    }
  };

  const handleProgressStudent = async (studentId) => {
    const result = await Swal.fire({
      title: 'Progress Student to Grade 12?',
      text: 'This will move the student to Grade 12 and create a new enrollment that requires coordinator approval.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Progress Student',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        setLoadingProgression(true);
        const response = await fetch('/faculty/students/progress-grade', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          body: JSON.stringify({
            student_id: studentId,
            current_grade: 11
          })
        });

        const data = await response.json();
        
        if (data.success) {
          Swal.fire('Success!', data.message, 'success');
          // Refresh the Grade 11 students list
          fetchGrade11Students();
        } else {
          Swal.fire('Error', data.message, 'error');
        }
      } catch (error) {
        console.error('Error progressing student:', error);
        Swal.fire('Error', 'Failed to progress student', 'error');
      } finally {
        setLoadingProgression(false);
      }
    }
  };

  const openProgressionModal = () => {
    fetchGrade11Students();
    setShowProgressionModal(true);
  };

  // Enhanced filtering and categorization logic
  const categorizeStudents = (students) => {
    // Ensure students is an array to prevent errors
    const safeStudents = Array.isArray(students) ? students : [];
    
    const newStudents = safeStudents.filter(s => s?.student_type === 'new' || s?.enrollment_status === 'new');
    const transfereeStudents = safeStudents.filter(s => s?.student_type === 'transferee' || s?.previous_school);
    const continuingStudents = safeStudents.filter(s => 
      s?.student_type === 'continuing' || 
      (s?.student_type !== 'new' && s?.student_type !== 'transferee' && !s?.previous_school)
    );
    
    return {
      all: safeStudents,
      new: newStudents,
      continuing: continuingStudents,
      transferee: transfereeStudents
    };
  };

  const handleViewStudent = (student) => {
    setSelectedStudent({
      ...student,
      scheduleData: student.schedules || []
    });
    setShowModal(true);
  };

  const getFilteredStudents = () => {
    const baseFiltered = (enrolledStudents || []).filter(student => {
      if (!student) return false;
      
      const matchesSearch = !searchTerm ||
        `${student.firstname || ''} ${student.lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.lrn && student.lrn.includes(searchTerm));

      const matchesStrand = filterStrand === "all" || student.strand_name === filterStrand;
      const matchesSection = filterSection === "all" || student.section_name === filterSection;
      const matchesGrade = filterGrade === "all" || student.grade_level === filterGrade;

      return matchesSearch && matchesStrand && matchesSection && matchesGrade;
    });

    const categorized = categorizeStudents(baseFiltered);
    return categorized[activeTab] || [];
  };

  const getSortedStudents = (studentsToSort) => {
    const safeStudents = Array.isArray(studentsToSort) ? studentsToSort : [];
    return [...safeStudents].sort((a, b) => {
      if (!a || !b) return 0;
      
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="opacity-50" />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handlePopulateClassDetails = async () => {
    try {
      const response = await fetch('/faculty/populate-class-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          title: 'Success!',
          text: data.message,
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          // Refresh the page to show the populated data
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: data.message || 'Failed to populate class_details table',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Error populating class_details:', error);
      Swal.fire({
        title: 'Error!',
        text: 'An error occurred while populating the class_details table',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const filteredStudents = getFilteredStudents();
  const sortedStudents = getSortedStudents(filteredStudents);

  const getUniqueValues = (field) => {
    return [...new Set((enrolledStudents || []).map(student => student[field]).filter(Boolean))];
  };

  return (
    <>
      <Head title="Faculty - Students" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <FacultySidebar
          onToggle={setIsCollapsed}
        />

        <main className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'} min-h-screen overflow-hidden`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-full">
              {/* Enhanced Header with Statistics - HCI Principle 1 */}
              <div className="mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                      <FaUsers className="text-blue-600" />
                      Student Management
                    </h1>
                    <p className="text-gray-600 mt-2">View and manage enrolled students by type and section</p>
                  </div>
                  
                  {/* Help Button - HCI Principle 10 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Show help and keyboard shortcuts"
                    >
                      <FaQuestionCircle />
                      Help
                    </button>
                    
                    <button
                      onClick={() => router.visit('/faculty/grade-progression')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                      title="Progress Grade 11 students to Grade 12"
                    >
                      <FaLevelUpAlt />
                      <span>Grade Progression</span>
                    </button>
                    
                    <button
                      onClick={handlePopulateClassDetails}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                      title="Populate class_details table with existing enrollment data"
                    >
                      <FaCheckCircle />
                      <span>Populate Data</span>
                    </button>
                  </div>
                </div>

                {/* Statistics Cards - HCI Principle 1: Visibility of System Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {(() => {
                    const allStudents = enrolledStudents || [];
                    const categorized = categorizeStudents(allStudents);
                    const stats = {
                      total: allStudents.length,
                      new: categorized.new.length,
                      continuing: categorized.continuing.length,
                      transferee: categorized.transferee.length
                    };

                    return [
                      { key: 'total', label: 'Total Students', count: stats.total, color: 'gray', icon: FaUsers },
                      { key: 'new', label: 'New Students', count: stats.new, color: 'green', icon: FaUserPlus },
                      { key: 'continuing', label: 'Continuing', count: stats.continuing, color: 'blue', icon: FaUserCheck },
                      { key: 'transferee', label: 'Transferees', count: stats.transferee, color: 'orange', icon: FaExchangeAlt }
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.key} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-medium text-${stat.color}-600`}>{stat.label}</p>
                              <p className={`text-3xl font-bold text-${stat.color}-700`}>{stat.count}</p>
                            </div>
                            <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                              <Icon className={`text-2xl text-${stat.color}-600`} />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Student Type Tabs - HCI Principle 4: Consistency and Standards */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6" aria-label="Student Types">
                    {(() => {
                      const allStudents = enrolledStudents || [];
                      const categorized = categorizeStudents(allStudents);
                      const stats = {
                        total: allStudents.length,
                        new: categorized.new.length,
                        continuing: categorized.continuing.length,
                        transferee: categorized.transferee.length
                      };

                      return [
                        { key: 'all', label: 'All Students', icon: FaUsers, color: 'gray', count: stats.total },
                        { key: 'new', label: 'New Students', icon: FaUserPlus, color: 'green', count: stats.new },
                        { key: 'continuing', label: 'Continuing', icon: FaUserCheck, color: 'blue', count: stats.continuing },
                        { key: 'transferee', label: 'Transferees', icon: FaExchangeAlt, color: 'orange', count: stats.transferee }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-3 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                              isActive
                                ? `border-${tab.color}-500 text-${tab.color}-600`
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <Icon className={`text-lg ${isActive ? `text-${tab.color}-600` : 'text-gray-400'}`} />
                            {tab.label}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              isActive 
                                ? `bg-${tab.color}-100 text-${tab.color}-800` 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tab.count}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </nav>
                </div>

                {/* Enhanced Search and Filter Controls - HCI Principle 6: Recognition rather than recall */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students by name, email, or LRN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Filter Toggle */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FaFilter />
                      Filters
                    </button>
                  </div>

                  {/* Collapsible Filters - HCI Principle 3: User control and freedom */}
                  {showFilters && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                          <select
                            value={filterStrand}
                            onChange={(e) => setFilterStrand(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Strands</option>
                            {getUniqueValues('strand_name').map((strand) => (
                              <option key={strand} value={strand}>
                                {strand}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                          <select
                            value={filterSection}
                            onChange={(e) => setFilterSection(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Sections</option>
                            {getUniqueValues('section_name').map((section) => (
                              <option key={section} value={section}>
                                {section}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                          <select
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Grades</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Help Panel - HCI Principle 10: Help and documentation */}
              {showHelp && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Student Management Help</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
                    <div>
                      <h4 className="font-semibold mb-2">Student Types:</h4>
                      <ul className="space-y-1">
                        <li>• <strong>New Students:</strong> First-time enrollees (Grade 11)</li>
                        <li>• <strong>Continuing:</strong> Grade 12 students or returning</li>
                        <li>• <strong>Transferees:</strong> Students from other schools</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Quick Actions:</h4>
                      <ul className="space-y-1">
                        <li>• Click "View" to see student details and COR</li>
                        <li>• Use filters to narrow down results</li>
                        <li>• Sort by clicking column headers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Filters for backward compatibility */}
              <div className="hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or LRN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Strand</label>
                    <select
                      value={filterStrand}
                      onChange={(e) => setFilterStrand(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Strands</option>
                      {getUniqueValues('strand_name').map(strand => (
                        <option key={strand} value={strand}>{strand}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Section</label>
                    <select
                      value={filterSection}
                      onChange={(e) => setFilterSection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Sections</option>
                      {getUniqueValues('section_name').map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Grade</label>
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Grades</option>
                      {getUniqueValues('grade_level').map(grade => (
                        <option key={grade} value={grade}>Grade {grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Students Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('lastname')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Name</span>
                            {getSortIcon('lastname')}
                          </div>
                        </th>
                        <th
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Email</span>
                            {getSortIcon('email')}
                          </div>
                        </th>
                        <th
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('strand_name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Strand</span>
                            {getSortIcon('strand_name')}
                          </div>
                        </th>
                        <th
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('section_name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Section</span>
                            {getSortIcon('section_name')}
                          </div>
                        </th>
                        <th
                          className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                          onClick={() => handleSort('grade_level')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Grade</span>
                            {getSortIcon('grade_level')}
                          </div>
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedStudents.map((student, index) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-xs sm:text-sm">
                                  {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {student.firstname} {student.lastname}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  LRN: {student.lrn || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                            <div className="text-xs sm:text-sm text-gray-900 truncate">{student.email || 'N/A'}</div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {student.strand_name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {student.section_name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                            <span className="text-xs sm:text-sm text-gray-900">Grade {student.grade_level || 'N/A'}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-medium">
                            <button
                              onClick={() => handleViewStudent(student)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                            >
                              <FaEye className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">View COR</span>
                              <span className="sm:hidden">View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sortedStudents.length === 0 && (
                  <div className="text-center py-12">
                    <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                    {(enrolledStudents || []).length === 0 ? (
                      <div className="text-gray-600">
                        <p className="mb-2">No students have been enrolled yet.</p>
                        <p className="text-sm">Students need to be approved and enrolled through the <strong>Enrollment Management</strong> page first.</p>
                      </div>
                    ) : (
                      <p className="text-gray-600">No enrolled students match your current filters.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Enhanced Student COR Modal */}
        {showModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col cor-printable">
              {/* COR Header */}
              <div className="bg-white border-b flex-shrink-0">
                <div className="text-center py-4 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL - SENIOR HIGH SCHOOL</h3>
                  <p className="text-sm text-gray-600">Opol, Misamis Oriental</p>
                  <div className="mt-2">
                    <p className="text-sm font-semibold">CLASS PROGRAM</p>
                    <p className="text-sm">School Year: [2025 - 2026] • Semester: 1st Semester</p>
                    <p className="text-sm font-medium">GRADE 11 - "{selectedStudent.section_name || 'SECTION'}" ({selectedStudent.strand_name || 'STRAND'})</p>
                  </div>
                </div>
              </div>

              {/* Main Content - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                {/* Student Information */}
                <div className="p-3 border-b">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Student Name:</strong> {selectedStudent.firstname} {selectedStudent.lastname}</p>
                      <p><strong>Email:</strong> {selectedStudent.email}</p>
                      <p><strong>Grade Level:</strong> {selectedStudent.grade_level || 'Grade 11'}</p>
                    </div>
                    <div>
                      <p><strong>Student Status:</strong> <span className="ml-1 px-1 py-0.5 rounded text-xs bg-green-100 text-green-800">{selectedStudent.student_status || 'New Student'}</span></p>
                      <p><strong>LRN:</strong> {selectedStudent.lrn || 'N/A'}</p>
                      <p><strong>Birthdate:</strong> {selectedStudent.birthdate ? new Date(selectedStudent.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Class Schedule */}
                <div className="p-3">
                  <h4 className="text-base font-semibold mb-2 text-gray-800">Class Schedule</h4>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Time</th>
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Monday</th>
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Tuesday</th>
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Wednesday</th>
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Thursday</th>
                            <th className="border border-gray-400 px-2 py-1 text-sm font-semibold">Friday</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Time slots */}
                          {[
                            { time: '7:30-8:00am', label: 'Flag Ceremony (Monday Only)', colspan: true },
                            { time: '8:00-10:00am', start: '08:00:00', end: '10:00:00' },
                            { time: '10:00-10:30am', label: 'Break Time (Recess)', colspan: true },
                            { time: '10:30am-12:30pm', start: '10:30:00', end: '12:30:00' },
                            { time: '12:30-1:30pm', label: 'Break Time (Lunch)', colspan: true },
                            { time: '1:30-3:30pm', start: '13:30:00', end: '15:30:00' },
                            { time: '3:30-4:30pm', start: '15:30:00', end: '16:30:00' },
                            { time: '4:30-4:45pm', label: 'Flag Lowering (Friday Only)', colspan: true }
                          ].map((slot, index) => (
                            <tr key={index}>
                              <td className="border border-gray-400 px-2 py-1 text-sm font-medium bg-gray-50">
                                {slot.time}
                              </td>
                              {slot.colspan ? (
                                <td className="border border-gray-400 px-2 py-1 text-sm text-center bg-green-200" colSpan="5">
                                  {slot.label}
                                </td>
                              ) : (
                                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                  // Find schedules that match this day and time slot
                                  const schedules = (selectedStudent.scheduleData || []).filter(s =>
                                    s.day_of_week === day &&
                                    s.start_time === slot.start
                                  );

                                  return (
                                    <td key={day} className="border border-gray-400 px-2 py-1 text-sm text-center">
                                      {schedules.length > 0 ? (
                                        schedules.map((schedule, idx) => (
                                          <div key={idx} className={idx > 0 ? 'mt-1 pt-1 border-t border-gray-300' : ''}>
                                            <div className="font-medium text-blue-800 text-sm leading-tight">{schedule.subject_name}</div>
                                            <div className="text-gray-600 text-sm leading-tight">({schedule.faculty_firstname} {schedule.faculty_lastname})</div>
                                            {schedule.room && <div className="text-gray-500 text-sm leading-tight">{schedule.room}</div>}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-gray-400 text-sm">-</div>
                                      )}
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons - Fixed Footer */}
              <div className="p-3 border-t bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                {allowFacultyCorPrint ? (
                  <button
                    onClick={printModalContent}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FaPrint className="w-4 h-4" />
                    <span>Print COR</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-end space-y-2">
                    <button
                      disabled
                      className="px-4 py-2 text-sm bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center space-x-2"
                      title="COR printing has been disabled by the Registrar"
                    >
                      <FaPrint className="w-4 h-4" />
                      <span>Print COR</span>
                    </button>
                    <p className="text-sm text-red-600 font-medium">
                      COR printing disabled by Registrar
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Styles for Faculty COR */}
        <style>{`
          @media print {
            /* Hide everything first */
            body * { visibility: hidden !important; }
            
            /* Show only COR content */
            .cor-printable, .cor-printable * { visibility: visible !important; }
            
            /* Position COR properly */
            .cor-printable { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important; 
              height: auto !important;
              max-height: none !important;
              background: white !important;
              margin: 0 !important;
              padding: 20px !important;
              overflow: visible !important;
            }
            
            /* Ensure content is visible */
            .cor-printable .overflow-y-auto {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            
            /* Hide modal buttons during print */
            .cor-printable .border-t.bg-gray-50 {
              display: none !important;
            }
            
            /* Clean styling */
            .print\\:hidden { display: none !important; }
            .shadow-xl { box-shadow: none !important; }
            .rounded-lg { border-radius: 0 !important; }
            
            /* Table styling */
            table { 
              border-collapse: collapse !important; 
              width: 100% !important;
              font-size: 12px !important;
            }
            th, td { 
              border: 1px solid black !important; 
              padding: 6px 4px !important; 
              text-align: center !important;
            }
            
            /* Ensure all text is black */
            .cor-printable * {
              color: black !important;
            }
            
            /* Page breaks */
            .cor-printable {
              page-break-inside: avoid;
            }
          }
          
          /* Screen styles for better modal visibility */
          @media screen {
            .cor-printable {
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            
            .cor-printable .overflow-y-auto {
              flex: 1;
              min-height: 0;
            }
          }
        `}</style>

      </div>
    </>
  );
}
