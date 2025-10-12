import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Student_Sidebar from '../layouts/Student_Sidebar';
import {
  FaGraduationCap,
  FaPrint,
  FaDownload,
  FaCalendarAlt,
  FaUser,
  FaSchool,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaBookOpen,
  FaFileAlt
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function Student_COR({ corData, error, enrollment_status, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [loading, setLoading] = useState(false);

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  // HCI Principle 7: Flexibility and efficiency of use - Print functionality
  const handlePrint = () => {
    window.print();
  };

  // HCI Principle 7: Flexibility and efficiency of use - Download functionality
  const handleDownload = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/student/cor/download-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/pdf',
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `COR_${corData?.student?.name?.replace(/\s+/g, '_')}_${corData?.school_year?.year}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          icon: 'success',
          title: 'Download Complete!',
          text: 'Your Certificate of Registration has been downloaded.',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Unable to download your COR. Please try again or contact the registrar.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  if (error || enrollment_status === 'not_enrolled' || enrollment_status === 'error') {
    return (
      <>
        <Head title="Certificate of Registration - Student Portal" />
        <div className="flex h-screen bg-gray-50">
          <Student_Sidebar onToggle={handleSidebarToggle} />
          
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
            <header className="bg-white shadow-sm border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Certificate of Registration</h1>
                  <p className="text-gray-600">View and download your enrollment certificate</p>
                </div>
              </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md text-center">
                <div className="mb-6">
                  <FaExclamationTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {enrollment_status === 'not_enrolled' ? 'Not Enrolled' : 'Unable to Load COR'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {error || 'You are not currently enrolled for the academic year. Please complete your enrollment first.'}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/student/enroll'}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FaGraduationCap className="mr-2" />
                    Go to Enrollment
                  </button>
                  <button
                    onClick={() => window.location.href = '/student/dashboard'}
                    className="w-full bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // Group schedules by day for better display
  const groupSchedulesByDay = (schedules) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.day_of_week]) {
        acc[schedule.day_of_week] = [];
      }
      acc[schedule.day_of_week].push(schedule);
      return acc;
    }, {});
    
    return dayOrder.filter(day => grouped[day]).map(day => ({
      day,
      schedules: grouped[day]
    }));
  };

  return (
    <>
      <Head title="Certificate of Registration - Student Portal" />
      <div className="flex h-screen bg-gray-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Certificate of Registration</h1>
                <p className="text-gray-600">Your official enrollment certificate for {corData?.school_year?.year}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaUser className="w-4 h-4" />
                <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Action Buttons */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 print:hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Certificate Actions</h2>
                    <p className="text-gray-600">Print or download your Certificate of Registration</p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handlePrint}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <FaPrint className="mr-2" />
                      Print COR
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={loading}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FaDownload className="mr-2" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* COR Document */}
              <div className="bg-white rounded-lg shadow-sm border print:shadow-none print:border-none">
                {/* Document Header */}
                <div className="text-center p-8 border-b-2 border-blue-600 print:border-b-2">
                  <h1 className="text-2xl font-bold text-blue-800 mb-2">
                    OPOL NATIONAL SECONDARY TECHNICAL SCHOOL
                  </h1>
                  <h2 className="text-lg font-semibold text-blue-600 mb-4">
                    SENIOR HIGH SCHOOL PROGRAM
                  </h2>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    CERTIFICATE OF REGISTRATION
                  </h3>
                  <p className="text-gray-600">
                    {corData?.school_year?.full_name}
                  </p>
                </div>

                {/* Student Information */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FaUser className="mr-2 text-blue-500" />
                        Student Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium text-gray-600">Name:</span>
                          <span className="ml-2 text-gray-800">{corData?.student?.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">LRN:</span>
                          <span className="ml-2 text-gray-800">{corData?.student?.lrn}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Grade Level:</span>
                          <span className="ml-2 text-gray-800">{corData?.student?.grade_level}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Strand:</span>
                          <span className="ml-2 text-gray-800">{corData?.student?.strand?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FaSchool className="mr-2 text-green-500" />
                        Enrollment Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium text-gray-600">Section:</span>
                          <span className="ml-2 text-gray-800">{corData?.student?.section?.section_name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">School Year:</span>
                          <span className="ml-2 text-gray-800">{corData?.school_year?.year}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Status:</span>
                          <span className="ml-2 text-green-600 flex items-center">
                            <FaCheckCircle className="mr-1" />
                            Enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* First Semester Schedule */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
                      <FaBookOpen className="mr-2" />
                      {corData?.first_semester?.semester_name}
                    </h3>
                    
                    {corData?.first_semester?.schedules?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-blue-50">
                              <th className="border border-gray-300 px-4 py-3 text-left">Subject Code</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Subject Name</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Faculty</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Day</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Time</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupSchedulesByDay(corData.first_semester.schedules).map(({ day, schedules }) =>
                              schedules.map((schedule, index) => (
                                <tr key={`${day}-${index}`} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-3 font-mono text-sm">
                                    {schedule.subject_code}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.subject_name}</td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.faculty_name}</td>
                                  <td className="border border-gray-300 px-4 py-3">
                                    {index === 0 ? day : ''}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.time_display}</td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.room}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FaInfoCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>No schedules available for first semester</p>
                      </div>
                    )}
                  </div>

                  {/* Second Semester Schedule */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-green-600 mb-4 flex items-center">
                      <FaBookOpen className="mr-2" />
                      {corData?.second_semester?.semester_name}
                    </h3>
                    
                    {corData?.second_semester?.schedules?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-green-50">
                              <th className="border border-gray-300 px-4 py-3 text-left">Subject Code</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Subject Name</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Faculty</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Day</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Time</th>
                              <th className="border border-gray-300 px-4 py-3 text-left">Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupSchedulesByDay(corData.second_semester.schedules).map(({ day, schedules }) =>
                              schedules.map((schedule, index) => (
                                <tr key={`${day}-${index}`} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-3 font-mono text-sm">
                                    {schedule.subject_code}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.subject_name}</td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.faculty_name}</td>
                                  <td className="border border-gray-300 px-4 py-3">
                                    {index === 0 ? day : ''}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.time_display}</td>
                                  <td className="border border-gray-300 px-4 py-3">{schedule.room}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FaInfoCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>No schedules available for second semester</p>
                      </div>
                    )}
                  </div>

                  {/* Important Notes */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                      <FaInfoCircle className="mr-2" />
                      Important Notes:
                    </h4>
                    <ul className="text-yellow-700 text-sm space-y-2">
                      <li>• This Certificate of Registration covers the full academic year (both semesters)</li>
                      <li>• Students are enrolled in all subjects for both 1st and 2nd semester upon enrollment</li>
                      <li>• No midyear changes to enrollment or schedules are permitted</li>
                      <li>• Contact the registrar for any concerns regarding your enrollment</li>
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
                    <p>This is an official document generated by the ONSTS Student Information System</p>
                    <p className="mt-1">For verification purposes, contact the school registrar</p>
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
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          .print\\:border-b-2 {
            border-bottom: 2px solid #2563eb !important;
          }
          
          body {
            font-size: 11px;
          }
          
          .container {
            max-width: none;
            margin: 0;
            padding: 0.5in;
          }
        }
      `}</style>
    </>
  );
}
