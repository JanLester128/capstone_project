import React, { useState } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaGraduationCap, 
  FaSearch, 
  FaSave,
  FaUsers,
  FaFilter,
  FaEdit,
  FaCheck,
  FaTimes
} from "react-icons/fa";

export default function FacultyGrades({ classes: initialClasses = [], students: initialStudents = [], user }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingGrade, setEditingGrade] = useState(null);
  const [tempGrade, setTempGrade] = useState("");

  const [classes, setClasses] = useState(initialClasses);

  const [students, setStudents] = useState(initialStudents);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGradeEdit = (studentId, period) => {
    const student = students.find(s => s.id === studentId);
    setEditingGrade(`${studentId}-${period}`);
    setTempGrade(student[period]);
  };

  const handleGradeSave = (studentId, period) => {
    // Here you would typically save to backend
    console.log(`Saving grade: Student ${studentId}, ${period}: ${tempGrade}`);
    setEditingGrade(null);
    setTempGrade("");
  };

  const handleGradeCancel = () => {
    setEditingGrade(null);
    setTempGrade("");
  };

  const getGradeColor = (grade) => {
    if (!grade) return "text-gray-400";
    if (grade.startsWith('A')) return "text-green-600";
    if (grade.startsWith('B')) return "text-blue-600";
    if (grade.startsWith('C')) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Grade Input
          </h1>
          <p className="text-gray-600">Manage and input grades for your assigned classes</p>
        </div>

        {/* Class Selection and Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              >
                <option value="">Choose a class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section} ({cls.students} students)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grades Table */}
        {selectedClass && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FaGraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {classes.find(c => c.id == selectedClass)?.name} - {classes.find(c => c.id == selectedClass)?.section}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {filteredStudents.length} students
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Student ID</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Student Name</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Prelim</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Midterm</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Final</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Average</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="p-4 font-medium text-gray-800">{student.studentId}</td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{student.name}</div>
                      </td>
                      
                      {/* Prelim Grade */}
                      <td className="p-4 text-center">
                        {editingGrade === `${student.id}-prelim` ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="text"
                              value={tempGrade}
                              onChange={(e) => setTempGrade(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-center"
                              placeholder="Grade"
                            />
                            <button
                              onClick={() => handleGradeSave(student.id, 'prelim')}
                              className="text-green-600 hover:text-green-800"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={handleGradeCancel}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`font-semibold ${getGradeColor(student.prelim)}`}>
                              {student.prelim || "N/A"}
                            </span>
                            <button
                              onClick={() => handleGradeEdit(student.id, 'prelim')}
                              className="text-gray-400 hover:text-purple-600"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Midterm Grade */}
                      <td className="p-4 text-center">
                        {editingGrade === `${student.id}-midterm` ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="text"
                              value={tempGrade}
                              onChange={(e) => setTempGrade(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-center"
                              placeholder="Grade"
                            />
                            <button
                              onClick={() => handleGradeSave(student.id, 'midterm')}
                              className="text-green-600 hover:text-green-800"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={handleGradeCancel}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`font-semibold ${getGradeColor(student.midterm)}`}>
                              {student.midterm || "N/A"}
                            </span>
                            <button
                              onClick={() => handleGradeEdit(student.id, 'midterm')}
                              className="text-gray-400 hover:text-purple-600"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Final Grade */}
                      <td className="p-4 text-center">
                        {editingGrade === `${student.id}-final` ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="text"
                              value={tempGrade}
                              onChange={(e) => setTempGrade(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-center"
                              placeholder="Grade"
                            />
                            <button
                              onClick={() => handleGradeSave(student.id, 'final')}
                              className="text-green-600 hover:text-green-800"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={handleGradeCancel}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`font-semibold ${getGradeColor(student.final)}`}>
                              {student.final || "N/A"}
                            </span>
                            <button
                              onClick={() => handleGradeEdit(student.id, 'final')}
                              className="text-gray-400 hover:text-purple-600"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-bold text-gray-800">{student.average}</span>
                      </td>
                      
                      <td className="p-4 text-center">
                        <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filteredStudents.length} students
                </div>
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2">
                  <FaSave />
                  Submit to Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedClass && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FaUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Class</h3>
            <p className="text-gray-600">Choose a class from the dropdown above to start inputting grades</p>
          </div>
        )}
      </div>
    </div>
  );
}
