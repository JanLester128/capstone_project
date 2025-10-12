import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import {
  FaUsers,
  FaGraduationCap,
  FaFileExport,
  FaFilePdf,
  FaFilter,
  FaSearch,
  FaDownload,
  FaEye,
  FaSpinner,
  FaChartBar,
  FaCalendarAlt,
  FaSchool,
  FaUserGraduate,
  FaClipboardList,
  FaPrint,
  FaChalkboardTeacher,
  FaBook
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function RegistrarReports({ strands, sections, subjects, teachers, schoolYears, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('registrar-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filter states for each report type
  const [studentFilters, setStudentFilters] = useState({
    strand_id: '',
    section_id: '',
    subject_id: '',
    school_year_id: '',
    year_level: ''
  });

  const [gradesFilters, setGradesFilters] = useState({
    section_id: '',
    subject_id: '',
    faculty_id: '',
    school_year_id: '',
    semester: '',
    sort_by: 'name'
  });

  const [subjectsFilters, setSubjectsFilters] = useState({
    section_id: '',
    strand_id: '',
    school_year_id: '',
    semester: ''
  });

  const [facultyFilters, setFacultyFilters] = useState({
    faculty_id: '',
    school_year_id: ''
  });

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // Generate report based on active tab
  const generateReport = async (format = 'view') => {
    try {
      setLoading(true);
      
      let endpoint = '';
      let filters = {};
      
      switch (activeTab) {
        case 'students':
          endpoint = '/registrar/reports/students';
          filters = { ...studentFilters, format };
          break;
        case 'grades':
          endpoint = '/registrar/reports/grades';
          filters = { ...gradesFilters, format };
          break;
        case 'subjects':
          endpoint = '/registrar/reports/subjects';
          filters = { ...subjectsFilters, format };
          break;
        case 'teachers':
          endpoint = '/registrar/reports/teachers';
          filters = { ...facultyFilters, format };
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        if (format === 'pdf') {
          // Handle PDF download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          
          Swal.fire({
            icon: 'success',
            title: 'Report Downloaded!',
            text: 'Your PDF report has been downloaded successfully.',
            timer: 3000,
            showConfirmButton: false
          });
        } else {
          const data = await response.json();
          setReportData(data);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Report Generation Failed',
        text: error.message || 'Unable to generate report. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  // Clear filters
  const clearFilters = () => {
    switch (activeTab) {
      case 'students':
        setStudentFilters({
          strand_id: '',
          section_id: '',
          subject_id: '',
          school_year_id: '',
          year_level: ''
        });
        break;
      case 'grades':
        setGradesFilters({
          section_id: '',
          subject_id: '',
          faculty_id: '',
          school_year_id: '',
          semester: '',
          sort_by: 'name'
        });
        break;
      case 'subjects':
        setSubjectsFilters({
          section_id: '',
          strand_id: '',
          school_year_id: '',
          semester: ''
        });
        break;
      case 'teachers':
        setFacultyFilters({
          faculty_id: '',
          school_year_id: ''
        });
        break;
    }
    setReportData(null);
  };

  // Filter sections by selected strand and remove duplicates
  const getFilteredSections = (strandId) => {
    let filteredSections = sections;
    
    if (strandId) {
      filteredSections = sections.filter(section => {
        // Check both strand_id and strand.id for compatibility
        return section.strand_id == strandId || (section.strand && section.strand.id == strandId);
      });
    }
    
    // Remove duplicates by section name
    const uniqueSections = filteredSections.filter((section, index, self) => 
      index === self.findIndex(s => s.section_name === section.section_name)
    );
    
    return uniqueSections;
  };

  // Remove duplicates from any array by a specific field
  const removeDuplicates = (array, field) => {
    return array.filter((item, index, self) => 
      index === self.findIndex(i => i[field] === item[field])
    );
  };

  // Get unique strands, sections, subjects, and teachers
  const uniqueStrands = removeDuplicates(strands || [], 'name');
  const uniqueSubjects = removeDuplicates(subjects || [], 'name');
  const uniqueTeachers = removeDuplicates(teachers || [], 'email');

  return (
    <>
      <Head title="Reports - Registrar Portal" />
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Reports Generation</h1>
                <p className="text-gray-600">Generate comprehensive reports for students, grades, subjects, and teachers</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaCalendarAlt className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Report Type Tabs */}
              <div className="bg-white rounded-lg shadow-sm border mb-6 print:hidden">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => { setActiveTab('students'); setReportData(null); }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'students'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaUsers className="inline mr-2" />
                      Student List
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('grades'); setReportData(null); }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'grades'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaGraduationCap className="inline mr-2" />
                      Grades Report
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('subjects'); setReportData(null); }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'subjects'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaBook className="inline mr-2" />
                      Subjects Report
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('teachers'); setReportData(null); }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'teachers'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaChalkboardTeacher className="inline mr-2" />
                      Teacher Report
                    </button>
                  </nav>
                </div>

                {/* Filters Section */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FaFilter className="mr-2 text-blue-500" />
                    Report Filters
                  </h3>
                  
                  {/* Student List Filters */}
                  {activeTab === 'students' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                      <select
                        value={studentFilters.school_year_id}
                        onChange={(e) => setStudentFilters({...studentFilters, school_year_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All School Years</option>
                        {schoolYears.map(year => (
                          <option key={year.id} value={year.id}>
                            {year.year_start}-{year.year_end}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={studentFilters.strand_id}
                        onChange={(e) => setStudentFilters({...studentFilters, strand_id: e.target.value, section_id: ''})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Strands</option>
                        {uniqueStrands.map(strand => (
                          <option key={strand.id} value={strand.id}>{strand.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={studentFilters.section_id}
                        onChange={(e) => setStudentFilters({...studentFilters, section_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Sections</option>
                        {getFilteredSections(studentFilters.strand_id).map(section => (
                          <option key={section.id} value={section.id}>{section.section_name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={studentFilters.subject_id}
                        onChange={(e) => setStudentFilters({...studentFilters, subject_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Subjects</option>
                        {uniqueSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={studentFilters.year_level}
                        onChange={(e) => setStudentFilters({...studentFilters, year_level: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Year Levels</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>
                  )}

                  {/* Grades Report Filters */}
                  {activeTab === 'grades' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                      <select
                        value={gradesFilters.school_year_id}
                        onChange={(e) => setGradesFilters({...gradesFilters, school_year_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All School Years</option>
                        {schoolYears.map(year => (
                          <option key={year.id} value={year.id}>
                            {year.year_start}-{year.year_end}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={gradesFilters.section_id}
                        onChange={(e) => setGradesFilters({...gradesFilters, section_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Sections</option>
                        {sections.map(section => (
                          <option key={section.id} value={section.id}>{section.section_name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={gradesFilters.subject_id}
                        onChange={(e) => setGradesFilters({...gradesFilters, subject_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Subjects</option>
                        {uniqueSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={gradesFilters.faculty_id}
                        onChange={(e) => setGradesFilters({...gradesFilters, faculty_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Faculty</option>
                        {uniqueTeachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.firstname} {teacher.lastname}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={gradesFilters.semester}
                        onChange={(e) => setGradesFilters({...gradesFilters, semester: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Both Semesters</option>
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                      </select>
                      
                      <select
                        value={gradesFilters.sort_by}
                        onChange={(e) => setGradesFilters({...gradesFilters, sort_by: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="name">Sort by Name</option>
                        <option value="grade">Sort by Grade</option>
                      </select>
                    </div>
                  )}

                  {/* Subjects Report Filters */}
                  {activeTab === 'subjects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <select
                        value={subjectsFilters.school_year_id}
                        onChange={(e) => setSubjectsFilters({...subjectsFilters, school_year_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All School Years</option>
                        {schoolYears.map(year => (
                          <option key={year.id} value={year.id}>
                            {year.year_start}-{year.year_end}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={subjectsFilters.strand_id}
                        onChange={(e) => setSubjectsFilters({...subjectsFilters, strand_id: e.target.value, section_id: ''})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Strands</option>
                        {uniqueStrands.map(strand => (
                          <option key={strand.id} value={strand.id}>{strand.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={subjectsFilters.section_id}
                        onChange={(e) => setSubjectsFilters({...subjectsFilters, section_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Sections</option>
                        {getFilteredSections(subjectsFilters.strand_id).map(section => (
                          <option key={section.id} value={section.id}>{section.section_name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={subjectsFilters.semester}
                        onChange={(e) => setSubjectsFilters({...subjectsFilters, semester: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Both Semesters</option>
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                      </select>
                    </div>
                  )}

                  {/* Teachers Report Filters */}
                  {activeTab === 'teachers' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <select
                        value={teacherFilters.school_year_id}
                        onChange={(e) => setTeacherFilters({...teacherFilters, school_year_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All School Years</option>
                        {schoolYears.map(year => (
                          <option key={year.id} value={year.id}>
                            {year.year_start}-{year.year_end}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={facultyFilters.faculty_id}
                        onChange={(e) => setFacultyFilters({...facultyFilters, faculty_id: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Faculty</option>
                        {uniqueTeachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.firstname} {teacher.lastname}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => generateReport('view')}
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        <FaEye className="mr-2" />
                      )}
                      Generate Report
                    </button>
                    
                    <button
                      onClick={() => generateReport('pdf')}
                      disabled={loading}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <FaFilePdf className="mr-2" />
                      Download PDF
                    </button>
                    
                    {reportData && (
                      <button
                        onClick={printReport}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      >
                        <FaPrint className="mr-2" />
                        Print Report
                      </button>
                    )}
                    
                    <button
                      onClick={clearFilters}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Display */}
              {reportData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="mb-6 print:mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{reportData.title}</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Generated on: {reportData.generated_at}</p>
                      <p>Generated by: {reportData.generated_by}</p>
                      <p>Total Records: {reportData.total_students || reportData.total_records || reportData.total_subjects || reportData.total_teachers}</p>
                    </div>
                  </div>

                  {/* Applied Filters */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg print:bg-white print:border">
                    <h3 className="font-semibold text-blue-800 mb-2">Applied Filters:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(reportData.filters).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium capitalize">{key.replace('_', ' ')}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student List Report Display */}
                  {activeTab === 'students' && reportData.students && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-3 text-left">Full Name</th>
                            <th className="border border-gray-300 px-4 py-3 text-left">LRN</th>
                            <th className="border border-gray-300 px-4 py-3 text-left">Strand</th>
                            <th className="border border-gray-300 px-4 py-3 text-left">Year Level</th>
                            <th className="border border-gray-300 px-4 py-3 text-left">Section</th>
                            <th className="border border-gray-300 px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.students.map((student, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-3">{student.full_name}</td>
                              <td className="border border-gray-300 px-4 py-3">{student.lrn}</td>
                              <td className="border border-gray-300 px-4 py-3">{student.strand}</td>
                              <td className="border border-gray-300 px-4 py-3">{student.year_level}</td>
                              <td className="border border-gray-300 px-4 py-3">{student.section}</td>
                              <td className="border border-gray-300 px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  student.enrollment_status === 'enrolled' || student.enrollment_status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {student.enrollment_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Empty State */}
                  {reportData && (
                    (reportData.students?.length === 0 || 
                     reportData.grades?.length === 0 || 
                     reportData.subjects?.length === 0 || 
                     reportData.teachers?.length === 0) && (
                    <div className="text-center py-12">
                      <FaClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Found</h3>
                      <p className="text-gray-500">No records match the selected filters. Try adjusting your filter criteria.</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Instructions */}
              {!reportData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 print:hidden">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">How to Generate Reports</h3>
                  <div className="space-y-3 text-blue-700">
                    <p>1. <strong>Select Report Type:</strong> Choose from Student List, Grades, Subjects, or Teacher reports using the tabs above.</p>
                    <p>2. <strong>Apply Filters:</strong> Use the filter dropdowns to narrow down your report data (optional).</p>
                    <p>3. <strong>Generate Report:</strong> Click "Generate Report" to view the data or "Download PDF" to save it.</p>
                    <p>4. <strong>Print Report:</strong> Use the "Print Report" button to print the displayed report.</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          
          body {
            font-size: 12px;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </>
  );
}
