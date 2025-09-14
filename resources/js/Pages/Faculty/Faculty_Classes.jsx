import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaUsers, 
  FaSearch, 
  FaEye,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaFilter
} from "react-icons/fa";

export default function FacultyClasses() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("current");
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Fetch faculty classes data
  }, []);

  const filteredClasses = classes.filter(cls =>
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.strand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewStudents = (classId) => {
    // Navigate to student list for this class
    console.log(`Viewing students for class ${classId}`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            My Classes
          </h1>
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

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{cls.subject}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {cls.section}
                      </span>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                        {cls.strand}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{cls.students}</div>
                    <div className="text-sm text-gray-600">students</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-600">
                    <FaClock className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">{cls.schedule}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <FaMapMarkerAlt className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">{cls.room}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <FaCalendarAlt className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">{cls.semester}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewStudents(cls.id)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FaUsers className="w-4 h-4" />
                    View Students
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2">
                    <FaGraduationCap className="w-4 h-4" />
                    Input Grades
                  </button>
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
                {classes.reduce((sum, cls) => sum + cls.students, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(classes.reduce((sum, cls) => sum + cls.students, 0) / classes.length)}
              </div>
              <div className="text-sm text-gray-600">Avg per Class</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-gray-600">Active Semester</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
