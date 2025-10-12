import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Student_Sidebar from '../layouts/Student_Sidebar';
import { 
  FaCalendarAlt, 
  FaUser, 
  FaClock, 
  FaMapMarkerAlt, 
  FaBookOpen,
  FaChalkboardTeacher,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaListAlt
} from 'react-icons/fa';

export default function Student_Schedule() {
  console.log('📅 Student_Schedule: Component loaded successfully!');
  const { auth, scheduleData = [], academicInfo = {}, error } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('weekly'); // weekly or daily

  const handleSidebarToggle = (collapsed) => {
    setIsCollapsed(collapsed);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const getScheduleByDay = (day) => {
    if (!scheduleData) return [];
    return scheduleData.filter(item => item.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const formatTime = (time) => {
    if (!time) return '';
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTotalSubjects = () => {
    if (!scheduleData) return 0;
    const uniqueSubjects = new Set(scheduleData.map(item => item.subject_code));
    return uniqueSubjects.size;
  };

  const getTotalHours = () => {
    if (!scheduleData) return 0;
    return scheduleData.reduce((total, item) => {
      const start = new Date(`2000-01-01 ${item.start_time}`);
      const end = new Date(`2000-01-01 ${item.end_time}`);
      const hours = (end - start) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  return (
    <>
      <Head title="My Classes - Student Portal" />
      <div className="flex h-screen bg-gray-50">
        <Student_Sidebar onToggle={handleSidebarToggle} />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {/* HCI Principle 1: Visibility of system status - Clear header with context */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600" />
                  My Class Schedule
                </h1>
                <p className="text-gray-600 mt-1">
                  {academicInfo.school_year} • {academicInfo.current_semester} • {academicInfo.grade_level}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{getTotalSubjects()} Subjects</p>
                  <p className="text-xs text-gray-500">{getTotalHours().toFixed(1)} hours/week</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaUser className="w-4 h-4" />
                  <span>{auth?.user?.firstname} {auth?.user?.lastname}</span>
                </div>
              </div>
            </div>
          </header>

          {/* HCI Principle 8: Aesthetic and minimalist design - Clean main content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* HCI Principle 9: Help users recognize, diagnose, and recover from errors */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <FaExclamationTriangle className="text-red-500 text-xl" />
                    <div>
                      <h3 className="text-red-800 font-semibold">Unable to Load Schedule</h3>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                      <p className="text-red-600 text-sm mt-2">Please refresh the page or contact the registrar if the problem persists.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HCI Principle 2: Match between system and real world - Familiar academic layout */}
              {!error && scheduleData.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <FaInfoCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Schedule Available Yet</h3>
                  <p className="text-gray-600">Your class schedule will appear here once you are enrolled and assigned to classes.</p>
                  <p className="text-gray-500 text-sm mt-2">Check back after enrollment is complete and sections are assigned.</p>
                </div>
              )}

              {/* HCI Principle 6: Recognition rather than recall - Clear schedule overview */}
              {!error && scheduleData.length > 0 && (
                <>
                  {/* Schedule Summary */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <FaListAlt className="text-blue-600 text-xl" />
                      <h2 className="text-xl font-semibold text-gray-800">Schedule Overview</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                        <FaBookOpen className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Subjects</p>
                        <p className="text-2xl font-bold text-blue-600">{getTotalSubjects()}</p>
                      </div>
                      <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
                        <FaClock className="w-8 h-8 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Weekly Hours</p>
                        <p className="text-2xl font-bold text-green-600">{getTotalHours().toFixed(1)}</p>
                      </div>
                      <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-100">
                        <FaCalendarAlt className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Active Days</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {[...new Set(scheduleData.map(item => item.day_of_week))].length}
                        </p>
                      </div>
                      <div className="text-center p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                        <FaGraduationCap className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Section</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {scheduleData[0]?.section_name || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* HCI Principle 4: Consistency and standards - Familiar weekly layout */}
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Weekly Class Schedule</h2>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Your complete weekly timetable</p>
                    </div>
                    <div className="p-6">
                      <div className="grid gap-4">
                        {daysOfWeek.map(day => {
                          const daySchedule = getScheduleByDay(day);
                          return (
                            <div key={day} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                                <h3 className="font-bold text-gray-800 text-lg">{day}</h3>
                                <p className="text-sm text-gray-600">
                                  {daySchedule.length} {daySchedule.length === 1 ? 'class' : 'classes'}
                                </p>
                              </div>
                              <div className="p-4">
                                {daySchedule.length === 0 ? (
                                  <div className="text-center py-8">
                                    <FaInfoCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">No classes scheduled</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {daySchedule.map((item, index) => (
                                      <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-lg mb-1">{item.subject_name}</h4>
                                            <p className="text-sm text-gray-600 mb-2">{item.subject_code} • {item.semester} Semester</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                              <div className="flex items-center gap-1">
                                                <FaChalkboardTeacher className="text-blue-500" />
                                                <span>{item.faculty_name || 'TBA'}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <FaMapMarkerAlt className="text-green-500" />
                                                <span>{item.room || 'TBA'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
                                              <div className="flex items-center gap-1 font-semibold">
                                                <FaClock className="text-blue-600" />
                                                <span>{formatTime(item.start_time)}</span>
                                              </div>
                                              <div className="text-xs text-blue-600 text-center mt-1">to</div>
                                              <div className="text-sm font-medium text-blue-700">
                                                {formatTime(item.end_time)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
