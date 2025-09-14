import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaCalendarAlt, 
  FaClock, 
  FaMapMarkerAlt,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaBook
} from "react-icons/fa";

export default function FacultySchedule({ classSchedules: initialSchedules = [], user }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewType, setViewType] = useState("week");
  const [schedules, setSchedules] = useState(initialSchedules);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  // Color palette for different subjects
  const subjectColors = [
    { bg: 'from-blue-50 to-blue-100', border: 'border-blue-500', text: 'text-blue-900', accent: 'text-blue-700' },
    { bg: 'from-green-50 to-green-100', border: 'border-green-500', text: 'text-green-900', accent: 'text-green-700' },
    { bg: 'from-purple-50 to-purple-100', border: 'border-purple-500', text: 'text-purple-900', accent: 'text-purple-700' },
    { bg: 'from-orange-50 to-orange-100', border: 'border-orange-500', text: 'text-orange-900', accent: 'text-orange-700' },
    { bg: 'from-pink-50 to-pink-100', border: 'border-pink-500', text: 'text-pink-900', accent: 'text-pink-700' },
    { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900', accent: 'text-indigo-700' },
    { bg: 'from-teal-50 to-teal-100', border: 'border-teal-500', text: 'text-teal-900', accent: 'text-teal-700' },
    { bg: 'from-red-50 to-red-100', border: 'border-red-500', text: 'text-red-900', accent: 'text-red-700' },
  ];

  // Get color for subject based on subject ID
  const getSubjectColor = (subjectId) => {
    const index = subjectId ? subjectId % subjectColors.length : 0;
    return subjectColors[index];
  };

  // Reduced time slots for more compact display
  const timeSlots = [
    "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"
  ];

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const formatTime12Hour = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));
    
    return weekDays.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return {
        day,
        date: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        fullDate: date
      };
    });
  };

  const weekDates = getCurrentWeekDates();

  // Filter schedules for current week
  const getSchedulesForWeek = () => {
    const startOfWeek = weekDates[0].fullDate;
    const endOfWeek = weekDates[5].fullDate;
    
    // For now, we'll show all schedules since we don't have specific dates in the schedule data
    // In a real implementation, you'd filter by actual schedule dates
    return schedules;
  };

  const weekSchedules = getSchedulesForWeek();

  // Get schedules for a specific day and time, consolidated by subject
  const getConsolidatedSchedulesForTimeSlot = (day, timeSlot) => {
    const schedulesAtTime = weekSchedules.filter(schedule => {
      if (schedule.day_of_week !== day) return false;
      
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const slotTime = parseTime(timeSlot);
      const startTime = parseTime(schedule.start_time);
      const endTime = parseTime(schedule.end_time);
      
      return slotTime >= startTime && slotTime < endTime;
    });

    // Group by subject to consolidate
    const groupedSchedules = {};
    schedulesAtTime.forEach(schedule => {
      const key = `${schedule.subject?.id || 'unknown'}-${schedule.section?.id || 'unknown'}`;
      if (!groupedSchedules[key]) {
        groupedSchedules[key] = {
          ...schedule,
          sections: [schedule.section]
        };
      } else {
        // Add section if not already included
        const existingSection = groupedSchedules[key].sections.find(s => s?.id === schedule.section?.id);
        if (!existingSection && schedule.section) {
          groupedSchedules[key].sections.push(schedule.section);
        }
      }
    });

    return Object.values(groupedSchedules);
  };

  // Create unified timetable grid with consolidated schedules
  const createTimetableGrid = () => {
    const grid = {};
    
    weekDays.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(time => {
        const consolidatedSchedules = getConsolidatedSchedulesForTimeSlot(day, time);
        grid[day][time] = consolidatedSchedules.length > 0 ? consolidatedSchedules : null;
      });
    });
    
    return grid;
  };

  const timetableGrid = createTimetableGrid();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-72'} p-6 transition-all duration-300`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            My Schedule
          </h1>
          <p className="text-gray-600">View your weekly class schedule and manage your time</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentWeek(currentWeek - 1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-lg font-semibold text-gray-800">
                Week of {weekDates[0].month} {weekDates[0].date} - {weekDates[5].month} {weekDates[5].date}
              </div>
              <button
                onClick={() => setCurrentWeek(currentWeek + 1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewType("week")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewType === "week" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewType("list")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewType === "list" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {viewType === "week" ? (
          /* Compact Weekly Schedule Grid */
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 p-2 text-left font-semibold text-gray-700 text-xs">Time</th>
                    {weekDates.map(({ day, date, month }) => (
                      <th key={day} className="p-2 text-center font-semibold text-gray-700 text-xs">
                        <div className="text-sm">{day}</div>
                        <div className="text-xs text-gray-500">{month} {date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <tr key={timeIndex} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border-r">
                        {formatTime12Hour(timeSlot)}
                      </td>
                      {weekDays.map((day, dayIndex) => {
                        const consolidatedSchedules = timetableGrid[day][timeSlot];
                        return (
                          <td key={dayIndex} className="px-1 py-1 border-l border-gray-100 relative">
                            {consolidatedSchedules ? (
                              <div className="space-y-1">
                                {consolidatedSchedules.map((schedule, idx) => {
                                  const subjectColor = getSubjectColor(schedule.subject?.id);
                                  return (
                                    <div 
                                      key={`${schedule.id}-${idx}`}
                                      className={`bg-gradient-to-r ${subjectColor.bg} border-l-3 ${subjectColor.border} p-1.5 rounded-r-md shadow-sm hover:shadow-md transition-all duration-200`}
                                    >
                                      <div className={`font-semibold ${subjectColor.text} text-xs mb-0.5 truncate`}>
                                        {schedule.subject?.name || 'Subject TBA'}
                                      </div>
                                      <div className={`text-xs ${subjectColor.accent} mb-0.5 flex items-center`}>
                                        <FaClock className="mr-1 w-2.5 h-2.5" />
                                        <span className="truncate">{schedule.start_time}-{schedule.end_time}</span>
                                      </div>
                                      <div className={`text-xs ${subjectColor.accent} mb-0.5 flex items-center`}>
                                        <FaUsers className="mr-1 w-2.5 h-2.5" />
                                        <span className="truncate">{schedule.section?.section_name || 'Section TBA'}</span>
                                      </div>
                                      <div className={`text-xs ${subjectColor.accent} mb-0.5 flex items-center`}>
                                        <FaBook className="mr-1 w-2.5 h-2.5" />
                                        <span className="truncate">{schedule.subject?.strand?.strand_name || 'No Strand'}</span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Room: TBA
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-12 flex items-center justify-center text-gray-300">
                                <span className="text-xs">Free</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* List View - All Schedules */
          <div className="space-y-4">
            {weekSchedules.map((schedule) => {
              const subjectColor = getSubjectColor(schedule.subject?.id);
              return (
                <div key={schedule.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {schedule.subject?.subject_name || 'Subject TBA'}
                      </h3>
                      <div className="flex items-center gap-4 text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <FaClock className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">{schedule.day_of_week} {schedule.start_time} - {schedule.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaUsers className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">{schedule.section?.section_name || 'Section TBA'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">Room TBA</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 bg-gradient-to-r ${subjectColor.bg} text-${subjectColor.text} rounded-full text-sm font-medium`}>
                          {schedule.subject?.strand?.strand_name || 'No Strand'}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {schedule.semester || '1st Semester'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm">
                        View Class
                      </button>
                      <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm">
                        Input Grades
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Summary */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Schedule Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{weekSchedules.length}</div>
              <div className="text-sm text-gray-600">Total Classes</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {[...new Set(weekSchedules.map(s => s.section?.section_name))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Sections Taught</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {[...new Set(weekSchedules.map(s => s.subject?.subject_name))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Subjects Taught</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {[...new Set(weekSchedules.map(s => s.subject?.strand?.strand_name))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Strands Covered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
