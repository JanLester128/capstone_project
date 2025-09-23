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
  FaBook,
  FaList,
  FaTable
} from "react-icons/fa";

export default function FacultySchedule({ classSchedules: initialSchedules = [], user }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewType, setViewType] = useState("timetable"); 
  const [schedules, setSchedules] = useState(initialSchedules);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const formatTime12Hour = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getCurrentWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));
    
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

  const getSchedulesForWeek = () => {
    return schedules;
  };

  const weekSchedules = getSchedulesForWeek();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-72'} p-6 transition-all duration-300`}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            My Schedule
          </h1>
          <p className="text-gray-600">View your weekly class schedule and manage your time</p>
        </div>

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
                onClick={() => setViewType("timetable")}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewType === "timetable" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FaTable className="w-4 h-4" />
                Timetable
              </button>
              <button
                onClick={() => setViewType("list")}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewType === "list" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FaList className="w-4 h-4" />
                List View
              </button>
            </div>
          </div>
        </div>

        {viewType === "timetable" ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300 w-24">
                      Time
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Monday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Tuesday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Wednesday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Thursday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Friday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">
                      Saturday
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Sunday
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const timeSlots = [
                      '7:30 - 8:00', '8:00 - 8:30', '8:30 - 9:00', '9:00 - 9:30', '9:30 - 10:00',
                      '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00', '12:00 - 12:30',
                      '12:30 - 1:00', '1:00 - 1:30', '1:30 - 2:00', '2:00 - 2:30', '2:30 - 3:00',
                      '3:00 - 3:30', '3:30 - 4:00', '4:00 - 4:30', '4:30 - 5:00', '5:00 - 5:30',
                      '5:30 - 6:00', '6:00 - 6:30', '6:30 - 7:00', '7:00 - 7:30', '7:30 - 8:00',
                      '8:00 - 8:30', '8:30 - 9:00'
                    ];
                    
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    
                    const grid = {};
                    days.forEach(day => {
                      grid[day] = {};
                    });
                    
                    const timeToSlotIndex = (timeStr) => {
                      const [time, period] = timeStr.split(' ');
                      let [hours, minutes] = time.split(':').map(Number);
                      
                      if (period === 'PM' && hours !== 12) hours += 12;
                      if (period === 'AM' && hours === 12) hours = 0;
                      
                      const totalMinutes = hours * 60 + minutes;
                      const startMinutes = 7 * 60 + 30; 
                      const slotMinutes = (totalMinutes - startMinutes) / 30;
                      
                      return Math.floor(slotMinutes);
                    };
                    
                    if (weekSchedules && weekSchedules.length > 0) {
                      weekSchedules.forEach(schedule => {
                        if (schedule.start_time && schedule.end_time && schedule.day_of_week) {
                          const startTime = formatTime12Hour(schedule.start_time);
                          const endTime = formatTime12Hour(schedule.end_time);
                          const startSlot = timeToSlotIndex(startTime);
                          const endSlot = timeToSlotIndex(endTime);
                          
                          if (startSlot >= 0 && startSlot < timeSlots.length && endSlot > startSlot) {
                            const duration = endSlot - startSlot;
                            grid[schedule.day_of_week][startSlot] = {
                              ...schedule,
                              duration: duration
                            };
                            
                            for (let i = startSlot + 1; i < endSlot; i++) {
                              grid[schedule.day_of_week][i] = 'occupied';
                            }
                          }
                        }
                      });
                    }
                    
                    const getSubjectColor = (subject) => {
                      const colors = {
                        'IT Elective 6: Internet of Things': 'bg-green-400',
                        'Capstone Project and Research 2': 'bg-yellow-400',
                        'Systems Administration and Maintenance': 'bg-yellow-300',
                        'IT Elective 5: Cloud Computing': 'bg-green-300'
                      };
                      return colors[subject] || 'bg-blue-300';
                    };
                    
                    return timeSlots.map((timeSlot, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-2 py-2 text-xs text-center font-medium text-gray-700 border-r border-gray-300 bg-gray-50">
                          {timeSlot}
                        </td>
                        {days.map(day => {
                          const cell = grid[day][index];
                          
                          if (cell === 'occupied') {
                            return null; 
                          }
                          
                          if (cell && typeof cell === 'object') {
                            return (
                              <td 
                                key={day} 
                                className={`px-2 py-1 text-xs text-center border-r border-gray-300 ${getSubjectColor(cell.subject?.name)} text-gray-800`}
                                rowSpan={cell.duration}
                              >
                                <div className="font-semibold leading-tight">
                                  {cell.subject?.name || 'Subject TBA'}
                                </div>
                                <div className="text-xs mt-1">
                                  Room: TBA
                                </div>
                                <div className="text-xs">
                                  {cell.section?.section_name || 'Section TBA'}
                                </div>
                              </td>
                            );
                          }
                          
                          return (
                            <td key={day} className="px-2 py-2 border-r border-gray-300 bg-white">
                              {/* Empty cell */}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {weekSchedules.map((schedule) => (
              <div key={schedule.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {schedule.subject?.name || 'Subject TBA'}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <FaClock className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">{schedule.day_of_week} {formatTime12Hour(schedule.start_time)} - {formatTime12Hour(schedule.end_time)}</span>
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
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {schedule.subject?.strand?.name || 'No Strand'}
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
            ))}
          </div>
        )}

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
                {[...new Set(weekSchedules.map(s => s.subject?.name))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Subjects Taught</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {[...new Set(weekSchedules.map(s => s.subject?.strand?.name))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Strands Covered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
