import React, { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { 
  FaUsers, FaGraduationCap, FaCheckCircle, FaEye, FaFilter, FaSearch, FaDownload, FaFileExcel,
  FaUserPlus, FaUserCheck, FaExchangeAlt, FaChartPie, FaCalendarAlt, FaInfoCircle,
  FaTags, FaSort, FaArrowUp, FaArrowDown, FaBell, FaQuestionCircle
} from "react-icons/fa";
import Sidebar from "../layouts/Sidebar";

// Enhanced Student Management with HCI Principles
const RegistrarStudents = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { enrolledStudents = [], strands = [], sections = [], flash } = usePage().props;
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrand, setSelectedStrand] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  // Enhanced UI/UX States following HCI principles
  const [activeTab, setActiveTab] = useState('all'); // all, new, continuing, transferee
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Enhanced filtering and categorization logic
  const categorizeStudents = (students) => {
    return {
      all: students,
      new: students.filter(s => s.student_type === 'new' || s.enrollment_status === 'new'),
      continuing: students.filter(s => s.student_type === 'continuing' || s.grade_level === '12'),
      transferee: students.filter(s => s.student_type === 'transferee' || s.previous_school)
    };
  };

  const filteredStudents = enrolledStudents.filter((student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStrand = selectedStrand === "" || student.strand === selectedStrand;
    const matchesGrade = selectedGrade === "" || student.grade_level.toString() === selectedGrade;
    
    return matchesSearch && matchesStrand && matchesGrade;
  });

  const categorizedStudents = categorizeStudents(filteredStudents);
  const currentStudentList = categorizedStudents[activeTab] || [];

  // Statistics for dashboard cards
  const stats = {
    total: enrolledStudents.length,
    new: categorizedStudents.new.length,
    continuing: categorizedStudents.continuing.length,
    transferee: categorizedStudents.transferee.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} px-8 py-6 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          {/* HCI Principle 1: Visibility of System Status */}
          {flash?.success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
              <FaCheckCircle className="text-green-600" />
              {flash.success}
            </div>
          )}

          {/* Enhanced Header with Statistics - HCI Principle 1 */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                  <FaUsers className="text-blue-600" />
                  Student Management
                </h1>
                <p className="text-gray-600 mt-2">Manage and organize students by enrollment type</p>
              </div>
              
              {/* Help Button - HCI Principle 10 */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="Show help and keyboard shortcuts"
              >
                <FaQuestionCircle />
                Help
              </button>
            </div>

            {/* Statistics Cards - HCI Principle 1: Visibility of System Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <FaUsers className="text-2xl text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">New Students</p>
                    <p className="text-3xl font-bold text-green-700">{stats.new}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FaUserPlus className="text-2xl text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Continuing</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.continuing}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FaUserCheck className="text-2xl text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Transferees</p>
                    <p className="text-3xl font-bold text-orange-700">{stats.transferee}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <FaExchangeAlt className="text-2xl text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Type Tabs - HCI Principle 4: Consistency and Standards */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Student Types">
                {[
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
                })}
              </nav>
            </div>

            {/* Search and Controls */}
            <div className="p-6">
              <div className="flex gap-4 items-center mb-6">
                <div className="relative flex-1 max-w-md">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <FaFilter />
                </button>
              </div>

              {/* Collapsible Filters */}
              {showFilters && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                      <select
                        value={selectedStrand}
                        onChange={(e) => setSelectedStrand(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Strands</option>
                        {strands.map((strand) => (
                          <option key={strand.id} value={strand.name}>
                            {strand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Grades</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="name">Name</option>
                        <option value="grade_level">Grade Level</option>
                        <option value="enrollment_date">Enrollment Date</option>
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
                    <li>• <strong>New Students:</strong> First-time enrollees</li>
                    <li>• <strong>Continuing:</strong> Grade 12 students or returning</li>
                    <li>• <strong>Transferees:</strong> Students from other schools</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Quick Actions:</h4>
                  <ul className="space-y-1">
                    <li>• Click student cards to view details</li>
                    <li>• Use filters to narrow down results</li>
                    <li>• Switch between grid and list views</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Student Display */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-8">
              <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === 'all' ? 'All Students' : 
                 activeTab === 'new' ? 'New Students' :
                 activeTab === 'continuing' ? 'Continuing Students' : 'Transferee Students'}
              </h3>
              <p className="text-gray-600">
                Showing {currentStudentList.length} of {stats.total} students
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegistrarStudents;
