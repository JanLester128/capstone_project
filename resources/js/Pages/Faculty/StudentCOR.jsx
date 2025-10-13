import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import FacultySidebar from '../layouts/Faculty_Sidebar';
import {
  FaGraduationCap,
  FaPrint,
  FaDownload,
  FaCalendarAlt,
  FaUser,
  FaSchool,
  FaInfoCircle,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaBookOpen,
  FaFileAlt,
  FaIdCard,
  FaEnvelope,
  FaAward,
  FaChevronLeft
} from 'react-icons/fa';
import { router } from '@inertiajs/react';

export default function StudentCOR({ 
  student, 
  enrollment, 
  schedule, 
  creditedSubjects, 
  section, 
  strand, 
  schoolYear, 
  allowPrint, 
  auth 
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.visit('/faculty/enrollment');
  };

  // Group schedule by semester
  const scheduleBySemester = schedule.reduce((acc, item) => {
    const semester = item.semester || '1st Semester';
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(item);
    return acc;
  }, {});

  // Group credited subjects by semester
  const creditedBySemester = creditedSubjects.reduce((acc, item) => {
    const semester = item.semester || '1st Semester';
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(item);
    return acc;
  }, {});

  return (
    <>
      <Head title={`COR - ${student.firstname} ${student.lastname}`} />
      
      <div className="flex h-screen bg-gray-100">
        <FacultySidebar 
          isCollapsed={isCollapsed} 
          onToggle={handleSidebarToggle}
        />
        
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            <div className="container mx-auto px-6 py-8">
              
              {/* Header */}
              <div className="mb-8 no-print">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleBack}
                      className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <FaChevronLeft className="mr-2" />
                      Back to Enrollment
                    </button>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Certificate of Registration</h1>
                      <p className="text-gray-600">
                        {student.firstname} {student.middlename} {student.lastname}
                      </p>
                    </div>
                  </div>
                  
                  {allowPrint && (
                    <div className="flex space-x-3">
                      <button
                        onClick={handlePrint}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <FaPrint className="mr-2" />
                        Print COR
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* COR Content */}
              <div className="bg-white rounded-lg shadow-sm border p-8 print:shadow-none print:border-none">
                
                {/* School Header */}
                <div className="text-center mb-8 border-b pb-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">SENIOR HIGH SCHOOL</h2>
                    <h3 className="text-xl font-semibold text-gray-700">CERTIFICATE OF REGISTRATION</h3>
                    <p className="text-gray-600 mt-2">School Year {schoolYear.year_start}-{schoolYear.year_end}</p>
                  </div>
                </div>

                {/* Student Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <FaUser className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Student Name</p>
                        <p className="font-semibold text-gray-900">
                          {student.lastname}, {student.firstname} {student.middlename}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaIdCard className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">LRN</p>
                        <p className="font-semibold text-gray-900">{student.lrn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaGraduationCap className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Grade Level</p>
                        <p className="font-semibold text-gray-900">{student.grade_level}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <FaSchool className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Strand</p>
                        <p className="font-semibold text-gray-900">
                          {strand ? `${strand.name} (${strand.code})` : 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaUsers className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Section</p>
                        <p className="font-semibold text-gray-900">
                          {section ? section.section_name : 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Student Type</p>
                        <p className="font-semibold text-gray-900 capitalize">{student.student_type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transferee Credits Section */}
                {student.student_type === 'transferee' && creditedSubjects.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaAward className="text-yellow-500 mr-2" />
                      Credited Subjects (Previous School)
                    </h3>
                    
                    {Object.entries(creditedBySemester).map(([semester, subjects]) => (
                      <div key={semester} className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3 bg-yellow-50 px-3 py-2 rounded">
                          {semester}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                  Subject Code
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                  Subject Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                  Units
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                  Grade
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                  Remarks
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {subjects.map((credit, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                    {credit.subject?.code || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                    {credit.subject?.name || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                    {credit.subject?.units || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      credit.grade >= 90 ? 'bg-green-100 text-green-800' :
                                      credit.grade >= 85 ? 'bg-blue-100 text-blue-800' :
                                      credit.grade >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                      credit.grade >= 75 ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {credit.grade}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 border-b">
                                    {credit.remarks || 'Credited'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Enrollment Schedule */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaBookOpen className="text-green-500 mr-2" />
                    Current Enrollment Schedule
                  </h3>
                  
                  {Object.entries(scheduleBySemester).map(([semester, subjects]) => (
                    <div key={semester} className="mb-6">
                      <h4 className="font-medium text-gray-800 mb-3 bg-green-50 px-3 py-2 rounded">
                        {semester}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Subject Code
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Subject Name
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Units
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Schedule
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Faculty
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Room
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {subjects.map((subject, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b">
                                  {subject.subject_code}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.subject_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.units}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.day_of_week} {subject.start_time}-{subject.end_time}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.faculty_firstname} {subject.faculty_lastname}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.room || 'TBA'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t pt-6 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Date Enrolled:</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(enrollment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Enrollment Status:</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                        enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                      This is an official Certificate of Registration issued by the Senior High School.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            font-size: 12px;
          }
          
          .container {
            max-width: none;
            margin: 0;
            padding: 0;
          }
          
          .bg-white {
            background: white !important;
          }
          
          .shadow-sm {
            box-shadow: none !important;
          }
          
          .border {
            border: 1px solid #000 !important;
          }
          
          .text-gray-900 {
            color: #000 !important;
          }
          
          .text-gray-600 {
            color: #333 !important;
          }
          
          .text-gray-500 {
            color: #666 !important;
          }
        }
      `}</style>
    </>
  );
}
