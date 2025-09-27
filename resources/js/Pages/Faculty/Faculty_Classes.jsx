import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaGraduationCap, 
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaBook,
  FaSearch,
  FaChevronDown,
  FaDownload,
  FaUpload,
  FaFileExcel
} from "react-icons/fa";

export default function FacultyClasses({ classes = [], activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("current");
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [importSemester, setImportSemester] = useState("1st");

  const filteredClasses = classes.filter(cls =>
    (cls.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.section?.section_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.strand?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewStudents = (classId) => {
    // Navigate to student list for this class using Inertia
    router.visit(`/faculty/classes/${classId}/students`);
  };

  const handleExportClass = (classData, semester) => {
    // Export class record to Excel
    console.log('Export button clicked:', { classId: classData.id, semester });
    const url = `/faculty/classes/${classData.id}/export?semester=${semester}`;
    console.log('Export URL:', url);
    window.location.href = url;
  };

  const handleImportClick = (classData) => {
    setSelectedClass(classData);
    setShowImportModal(true);
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('semester', importSemester);

    // Submit import form
    router.post(`/faculty/classes/${selectedClass.id}/import`, formData, {
      onSuccess: () => {
        setShowImportModal(false);
        setSelectedClass(null);
      },
      onError: (errors) => {
        console.error('Import errors:', errors);
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              My Classes
            </h1>
            <button
              onClick={() => {
                console.log('🔴 TEST EXPORT BUTTON CLICKED!');
                console.log('🔴 Redirecting to: /faculty/test-export');
                
                // Try fetch method to see what's happening
                fetch('/faculty/test-export')
                  .then(response => {
                    console.log('🔴 Response status:', response.status);
                    console.log('🔴 Response headers:', response.headers);
                    
                    if (response.ok) {
                      return response.blob();
                    } else {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                  })
                  .then(blob => {
                    console.log('🔴 Blob received:', blob);
                    
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'test-export.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    console.log('🔴 Download initiated successfully!');
                  })
                  .catch(error => {
                    console.error('🔴 Fetch error:', error);
                    
                    // Fallback to window.location
                    console.log('🔴 Trying fallback method...');
                    window.location.href = '/faculty/test-export';
                  });
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
            >
              🔴 TEST EXPORT
            </button>
          </div>
          <p className="text-gray-600">View and manage your assigned classes and students</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Classes
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by subject, section, or strand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              >
                <option value="current">Current Semester</option>
                <option value="1st-2024">1st Semester 2024-2025</option>
                <option value="2nd-2024">2nd Semester 2024-2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Classes List View */}
        <div className="space-y-4">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{cls.subject?.name || 'Unknown Subject'}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <FaClock className="w-4 h-4 text-purple-500" />
                        <span>{cls.day_of_week} {cls.start_time} - {cls.end_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaGraduationCap className="w-4 h-4 text-indigo-500" />
                        <span>{cls.strand?.name || 'No Strand'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="w-4 h-4 text-green-500" />
                        <span>{cls.room || 'No Room Assigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {cls.section?.section_name || 'No Section'}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {cls.student_count || 0} students
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-6">
                    <button
                      onClick={() => handleViewStudents(cls.id)}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <FaUsers className="w-4 h-4" />
                      View Students
                    </button>
                    
                    {/* Export Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          console.log('🟢 1ST SEM BUTTON CLICKED for class:', cls);
                          alert(`1st Sem Export clicked for ${cls.subject?.name}!`);
                          handleExportClass(cls, '1st');
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        title="Export 1st Semester Class Record"
                      >
                        <FaDownload className="w-3 h-3" />
                        🟢 1st Sem
                      </button>
                      <button
                        onClick={() => {
                          console.log('2nd Sem button clicked for class:', cls);
                          handleExportClass(cls, '2nd');
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        title="Export 2nd Semester Class Record"
                      >
                        <FaDownload className="w-3 h-3" />
                        2nd Sem
                      </button>
                    </div>
                    
                    {/* Import Button */}
                    <button
                      onClick={() => handleImportClick(cls)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      title="Import Grades from Excel"
                    >
                      <FaUpload className="w-3 h-3" />
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Classes Found</h3>
            <p className="text-gray-600">No classes match your current search criteria</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Class Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{classes.length}</div>
              <div className="text-sm text-gray-600">Total Classes</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0) / classes.length) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg per Class</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-gray-600">Active Semester</div>
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FaFileExcel className="w-5 h-5 text-green-600" />
                  Import Grades
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Subject:</strong> {selectedClass?.subject?.name}<br/>
                  <strong>Section:</strong> {selectedClass?.section?.section_name || 'No Section'}
                </p>
              </div>

              <form onSubmit={handleImportSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester
                  </label>
                  <select
                    value={importSemester}
                    onChange={(e) => setImportSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excel File
                  </label>
                  <input
                    type="file"
                    name="excel_file"
                    accept=".xlsx,.xls"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload the completed class record Excel file
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <FaUpload className="w-4 h-4" />
                    Import Grades
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
