import React, { useState, useEffect } from "react";
import StudentSidebar from "../layouts/Student_Sidebar";
import { 
  FaSun, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaCalendarAlt,
  FaClock,
  FaBookOpen,
  FaGraduationCap,
  FaUser,
  FaSpinner
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function StudentSummerEnrollment({ auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('student-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [summerData, setSummerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchSummerEligibility();
  }, []);

  const fetchSummerEligibility = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/student/summer-eligibility`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummerData(data);
      } else if (response.status === 404) {
        setError('No failed subjects found. You are not eligible for summer classes.');
      } else {
        setError('Failed to load summer enrollment data');
      }
    } catch (err) {
      setError('Error loading summer enrollment data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummerEnrollment = async () => {
    try {
      setEnrolling(true);
      
      const result = await Swal.fire({
        title: 'Confirm Summer Enrollment',
        html: `
          <div class="text-left">
            <p class="mb-3">You are about to enroll in summer classes for the following subjects:</p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              ${summerData.failed_subjects.map(subject => 
                `<li>${subject.subject_name} (${subject.semester}) - Grade: ${subject.failed_grade}</li>`
              ).join('')}
            </ul>
            <p class="mt-3 text-sm text-gray-600">
              <strong>Note:</strong> Your personal information is already on file. 
              You only need to confirm enrollment for these failed subjects.
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Enroll in Summer Classes',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await fetch('/student/summer-enrollment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            failed_subject_ids: summerData.failed_subjects.map(s => s.subject_id),
            schedule_preference: 'morning'
          })
        });

        if (response.ok) {
          const result = await response.json();
          await Swal.fire({
            icon: 'success',
            title: 'Summer Enrollment Complete!',
            html: `
              <div class="text-center">
                <p class="mb-2">Successfully enrolled in ${result.subjects_enrolled} summer classes.</p>
                <p class="text-sm text-gray-600">You will receive further instructions about class schedules.</p>
              </div>
            `,
            timer: 4000,
            showConfirmButton: false
          });
          
          // Refresh data to show enrollment status
          fetchSummerEligibility();
        } else {
          throw new Error('Failed to process summer enrollment');
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Enrollment Failed',
        text: 'Failed to process summer enrollment. Please try again or contact the registrar.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <StudentSidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed}
          activePage="summer-enrollment"
        />
        
        <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <FaSpinner className="animate-spin h-12 w-12 text-indigo-500 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Checking summer enrollment eligibility...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <StudentSidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        activePage="summer-enrollment"
      />
      
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-orange-400 to-yellow-500 p-4 rounded-full">
                  <FaSun className="h-12 w-12 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Summer Class Enrollment</h1>
              <p className="text-lg text-gray-600">
                Remedial classes for failed subjects - Academic Year {summerData?.school_year || '2024-2025'}
              </p>
            </div>
          </div>

          {error ? (
            /* Error State */
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 mb-4">Congratulations!</h2>
                <p className="text-lg text-gray-600 mb-6">{error}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    You have successfully passed all your subjects for this academic year. 
                    No summer classes are required.
                  </p>
                </div>
              </div>
            </div>
          ) : summerData?.enrollment_requirements?.personal_info_required === false ? (
            /* Already Enrolled State */
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <FaCheckCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-blue-600 mb-4">Already Enrolled</h2>
                <p className="text-lg text-gray-600 mb-6">
                  You are already enrolled in summer classes. Check your schedule for class times and locations.
                </p>
              </div>
            </div>
          ) : (
            /* Summer Enrollment Interface */
            <>
              {/* Student Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FaUser className="mr-3 text-indigo-500" />
                    Student Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{summerData?.student?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Student ID:</span>
                      <span className="font-medium">{summerData?.student?.student_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enrollment Type:</span>
                      <span className="font-medium text-orange-600">{summerData?.enrollment_type}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FaCalendarAlt className="mr-3 text-green-500" />
                    Enrollment Requirements
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Personal Information:</span>
                      <FaCheckCircle className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Academic Records:</span>
                      <FaCheckCircle className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment Required:</span>
                      <FaExclamationTriangle className="text-yellow-500" />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Your information is already on file. 
                      Only payment and schedule confirmation are needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Failed Subjects */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <h2 className="text-2xl font-bold text-red-600 mb-6 flex items-center">
                  <FaBookOpen className="mr-3" />
                  Failed Subjects Requiring Summer Classes
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="border border-gray-300 px-4 py-3 text-left">Subject Code</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Subject Name</th>
                        <th className="border border-gray-300 px-4 py-3 text-center">Semester</th>
                        <th className="border border-gray-300 px-4 py-3 text-center">Failed Grade</th>
                        <th className="border border-gray-300 px-4 py-3 text-center">Required Grade</th>
                        <th className="border border-gray-300 px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summerData?.failed_subjects?.map((subject, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 font-mono text-sm">
                            {subject.subject_code}
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            {subject.subject_name}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            {subject.semester}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="text-red-600 font-semibold">
                              {subject.failed_grade}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="text-green-600 font-semibold">
                              {subject.required_grade}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                              {subject.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="text-orange-500 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-orange-800 mb-2">Summer Class Requirements:</h3>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• Attend all scheduled summer classes (minimum 80% attendance)</li>
                        <li>• Complete all assignments and assessments</li>
                        <li>• Achieve a minimum grade of 75 to pass</li>
                        <li>• Summer classes run for 6 weeks with intensive scheduling</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment Action */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="mb-6">
                  <FaGraduationCap className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Enroll?</h2>
                  <p className="text-gray-600">
                    Confirm your enrollment in summer classes for the {summerData?.failed_subjects?.length} failed subject(s) above.
                  </p>
                </div>

                <button
                  onClick={handleSummerEnrollment}
                  disabled={enrolling}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                >
                  {enrolling ? (
                    <>
                      <FaSpinner className="animate-spin mr-3" />
                      Processing Enrollment...
                    </>
                  ) : (
                    <>
                      <FaSun className="mr-3" />
                      Enroll in Summer Classes
                    </>
                  )}
                </button>

                <p className="text-sm text-gray-500 mt-4">
                  By enrolling, you agree to attend all summer classes and meet the academic requirements.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
