import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
  FaToggleOn, 
  FaToggleOff, 
  FaUserGraduate, 
  FaCalendarAlt, 
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSave,
  FaUsers,
  FaFileAlt,
  FaPrint,
  FaClock
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function RegistrarSettings() {
  const { auth, activeSchoolYear, enrollmentSettings, flash } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check if enrollment is actually available based on dates
  const isEnrollmentDateActive = () => {
    if (!enrollmentSettings?.enrollment_start || !enrollmentSettings?.enrollment_end) {
      return false;
    }
    
    const now = new Date();
    const startDate = new Date(enrollmentSettings.enrollment_start);
    const endDate = new Date(enrollmentSettings.enrollment_end);
    
    return now >= startDate && now <= endDate;
  };

  // Get the actual enrollment status (considering both toggle and dates)
  const getActualEnrollmentStatus = () => {
    const isToggleOpen = enrollmentSettings.enrollment_open;
    const isDateActive = isEnrollmentDateActive();
    
    return {
      isOpen: isToggleOpen && isDateActive,
      toggleStatus: isToggleOpen,
      dateStatus: isDateActive,
      canToggle: true // Always allow toggle when there's an active school year
    };
  };

  const enrollmentStatus = getActualEnrollmentStatus();

  const handleToggleCoordinatorCORPrint = async () => {
    if (processing) return;

    const result = await Swal.fire({
      title: activeSchoolYear?.allow_coordinator_cor_print ? 'Disable Coordinator COR Printing?' : 'Enable Coordinator COR Printing?',
      html: `
        <div class="text-left">
          <p class="mb-3">
            ${activeSchoolYear?.allow_coordinator_cor_print 
              ? 'This will <strong>disable</strong> coordinators from printing student COR documents.' 
              : 'This will <strong>enable</strong> coordinators to print student COR documents.'
            }
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-sm text-blue-800 font-medium mb-2">📋 Current Status:</p>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• Coordinator COR Printing: ${activeSchoolYear?.allow_coordinator_cor_print ? '🟢 Enabled' : '🔴 Disabled'}</li>
              <li>• Affects: Coordinator enrollment page print functionality</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: activeSchoolYear?.allow_coordinator_cor_print ? '#dc2626' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: activeSchoolYear?.allow_coordinator_cor_print ? 'Yes, Disable It' : 'Yes, Enable It',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setProcessing(true);
      
      router.post('/registrar/settings/toggle-coordinator-cor-print', {}, {
        preserveState: false,
        preserveScroll: false,
        onSuccess: (page) => {
          // Show success message with the actual response from backend
          const successMessage = page.props.flash?.success || 'Coordinator COR printing setting updated successfully.';
          Swal.fire({
            title: 'Success!',
            text: successMessage,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
          });
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.general || Object.values(errors)[0] || 'Failed to update coordinator COR printing setting.';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        }
      });
    }
  };


  const handleToggleEnrollment = async () => {
    if (processing) return;

    // Remove date restriction - allow toggle anytime when there's an active school year
    // The date range is for information only, not for restricting toggle functionality

    const result = await Swal.fire({
      title: enrollmentSettings.enrollment_open ? 'Close Enrollment?' : 'Open Enrollment?',
      html: `
        <div class="text-left">
          <p class="mb-3">
            ${enrollmentSettings.enrollment_open 
              ? 'This will <strong>close enrollment</strong> for new Grade 11 students.' 
              : 'This will <strong>open enrollment</strong> for new Grade 11 students.'
            }
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-sm text-blue-800 font-medium mb-2">📋 Current Status:</p>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• School Year: ${activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : 'None Active'}</li>
              <li>• Enrollment: ${enrollmentSettings.enrollment_open ? '🟢 Open' : '🔴 Closed'}</li>
              <li>• Grade 12 Progression: Always handled by coordinator</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: enrollmentSettings.enrollment_open ? '#dc2626' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: enrollmentSettings.enrollment_open ? 'Yes, Close It' : 'Yes, Open It',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setProcessing(true);
      
      router.post('/registrar/settings/toggle-enrollment', {}, {
        preserveState: false,
        onSuccess: (page) => {
          Swal.fire({
            title: 'Success!',
            text: page.props.flash?.success || 'Enrollment status updated successfully.',
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
        },
        onError: (errors) => {
          const errorMessage = errors.general || Object.values(errors)[0] || 'Failed to update enrollment status.';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
        },
        onFinish: () => setProcessing(false)
      });
    }
  };

  return (
    <>
      <Head title="Settings - ONSTS" />
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Sidebar 
          userRole="registrar" 
          isCollapsed={isCollapsed} 
          onToggle={setIsCollapsed}
        />
        
        <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} p-6`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <FaUserGraduate className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600">Manage enrollment and system configuration</p>
              </div>
            </div>
          </div>

          {/* Flash Messages */}
          {flash?.success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <p className="text-green-800 font-medium">{flash.success}</p>
              </div>
            </div>
          )}

          {flash?.error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-red-500" />
                <p className="text-red-800 font-medium">{flash.error}</p>
              </div>
            </div>
          )}

          {/* Settings Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Enrollment Control */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FaUsers className="text-white text-xl" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Enrollment Control</h3>
                    <p className="text-blue-100 text-sm">Manage new student enrollment</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Grade 11 Enrollment</h4>
                    <p className="text-sm text-gray-600">
                      Control whether new students can enroll in Grade 11
                    </p>
                  </div>
                  <button
                    onClick={handleToggleEnrollment}
                    disabled={processing || !activeSchoolYear}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      enrollmentStatus.toggleStatus
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } ${processing || !activeSchoolYear ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    {enrollmentStatus.toggleStatus ? (
                      <>
                        <FaToggleOn className="text-xl" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="text-xl" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-blue-500 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">Current Status:</p>
                      <ul className="space-y-1 mb-3">
                        <li>• <strong>Toggle Status:</strong> {enrollmentStatus.toggleStatus ? '🟢 Enabled' : '🔴 Disabled'}</li>
                        <li>• <strong>Date Status:</strong> {enrollmentStatus.dateStatus ? '🟢 Within Period' : '🔴 Outside Period'}</li>
                        <li>• <strong>Actual Status:</strong> {enrollmentStatus.isOpen ? '🟢 Open for Students' : '🔴 Closed for Students'}</li>
                      </ul>
                      
                      {activeSchoolYear?.enrollment_start_date && activeSchoolYear?.enrollment_end_date && (
                        <div className="border-t pt-2 mt-2">
                          <p className="font-medium mb-1">Enrollment Period:</p>
                          <p className="text-xs text-gray-600">
                            {new Date(activeSchoolYear.enrollment_start_date).toLocaleDateString()} - {new Date(activeSchoolYear.enrollment_end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-medium mb-1">How it works:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>Toggle Status:</strong> Controls whether enrollment is enabled/disabled</li>
                          <li>• <strong>Date Status:</strong> Shows if current date is within enrollment period</li>
                          <li>• <strong>Actual Status:</strong> Students can enroll only when both toggle is enabled AND within date period</li>
                          <li>• You can toggle enrollment anytime, but students can only enroll during the date period</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {!activeSchoolYear && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle className="text-yellow-500" />
                      <p className="text-yellow-800 text-sm font-medium">
                        No active school year found. Please activate a school year first.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* School Year Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="text-white text-xl" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Active School Year</h3>
                    <p className="text-purple-100 text-sm">Current academic year information</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {activeSchoolYear ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Academic Year</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {activeSchoolYear.year_start}-{activeSchoolYear.year_end}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Semester</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {activeSchoolYear.semester}
                        </p>
                      </div>
                    </div>
                    
                    {activeSchoolYear.start_date && activeSchoolYear.end_date && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Duration</p>
                        <p className="text-sm text-gray-700">
                          {new Date(activeSchoolYear.start_date).toLocaleDateString()} - {new Date(activeSchoolYear.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <FaCheckCircle className="text-green-500" />
                        <p className="text-green-800 text-sm font-medium">School year is active and ready</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FaExclamationTriangle className="text-yellow-500 text-3xl mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No Active School Year</p>
                    <p className="text-sm text-gray-500 mt-1">Please activate a school year to enable enrollment</p>
                  </div>
                )}
              </div>
            </div>


            {/* Coordinator COR Printing Settings */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FaFileAlt className="text-white text-xl" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Coordinator COR Printing</h3>
                    <p className="text-orange-100 text-sm">Control coordinator access to student documents</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Allow Coordinator COR Printing</h4>
                    <p className="text-sm text-gray-600">Enable coordinators to print student Certificate of Registration</p>
                  </div>
                  <button
                    onClick={handleToggleCoordinatorCORPrint}
                    disabled={processing || !activeSchoolYear}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeSchoolYear?.allow_coordinator_cor_print
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } ${processing || !activeSchoolYear ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    {activeSchoolYear?.allow_coordinator_cor_print ? (
                      <>
                        <FaToggleOn className="text-xl" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="text-xl" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-blue-500 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">How it works:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Enabled:</strong> Coordinators can print student COR from enrollment pages</li>
                        <li>• <strong>Disabled:</strong> Print COR button is hidden from coordinator interface</li>
                        <li>• <strong>Note:</strong> This affects coordinator enrollment management pages</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!activeSchoolYear && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle className="text-yellow-500" />
                      <p className="text-yellow-800 text-sm font-medium">
                        No active school year found. Please activate a school year first.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enrollment Day Restrictions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <FaClock className="text-blue-600 text-xl" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Enrollment Day Restrictions</h3>
                    <p className="text-gray-600 text-sm">Control which days students can submit enrollment applications</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-2">Current Enrollment Schedule:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Available Days:</strong> Monday through Saturday</li>
                        <li>• <strong>Restricted Days:</strong> Sundays</li>
                        <li>• <strong>Current Day:</strong> {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                        <li>• <strong>Status:</strong> {
                          new Date().getDay() === 0 
                            ? <span className="text-red-600 font-medium">Enrollment Not Available (Sunday)</span>
                            : <span className="text-green-600 font-medium">Enrollment Available</span>
                        }</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">How it works:</p>
                      <ul className="space-y-1">
                        <li>• Students can only submit enrollment applications Monday through Saturday</li>
                        <li>• Sunday enrollments are automatically blocked with informative messages</li>
                        <li>• Students see clear notifications about next available enrollment day</li>
                        <li>• This helps manage enrollment workload and provides staff rest days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="text-green-500" />
                    <div className="text-sm text-green-700">
                      <p className="font-medium">Day restrictions are automatically enforced</p>
                      <p>No additional configuration required. The system automatically blocks Sunday enrollments and provides helpful guidance to students.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
