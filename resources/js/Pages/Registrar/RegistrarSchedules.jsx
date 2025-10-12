import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaClock, 
  FaUser, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaSearch, 
  FaFilter,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBookOpen,
  FaChalkboardTeacher,
  FaUsers
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const ScheduleModal = ({ isOpen, onClose, schedule, subjects, faculties, sections, schoolYears, activeSchoolYear, onScheduleCreated, onScheduleUpdated }) => {
  const [selectedSubject, setSelectedSubject] = useState(schedule?.subject_id || "");
  const [selectedFaculty, setSelectedFaculty] = useState(schedule?.faculty_id || "");
  const [selectedSection, setSelectedSection] = useState(schedule?.section_id || "");
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week || "");
  const [startTime, setStartTime] = useState(schedule?.start_time || "");
  const [endTime, setEndTime] = useState(schedule?.end_time || "");
  const [duration, setDuration] = useState(schedule?.duration || 60);
  
  // Auto-calculate duration based on start and end time
  const calculateDuration = (start, end) => {
    if (!start || !end) return 60;
    
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);
    const diffMs = endTime - startTime;
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    // Round to nearest valid duration (60, 90, 120)
    if (diffMinutes <= 75) return 60;
    if (diffMinutes <= 105) return 90;
    return 120;
  };
  
  // Auto-update duration when start or end time changes
  React.useEffect(() => {
    if (startTime && endTime) {
      const newDuration = calculateDuration(startTime, endTime);
      setDuration(newDuration);
    }
  }, [startTime, endTime]);
  
  const [semester, setSemester] = useState(schedule?.semester || "1st Semester");
  const [schoolYear, setSchoolYear] = useState(schedule?.school_year || (activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : "2024-2025"));
  const [schoolYearId, setSchoolYearId] = useState(schedule?.school_year_id || (activeSchoolYear?.id || ""));
  const [processing, setProcessing] = useState(false);

  // Get filtered teachers and subjects based on selected section
  const getFilteredTeachers = () => {
    if (!selectedSection) return faculties;
    
    const section = sections.find(s => s.id == selectedSection);
    if (!section) return faculties;
    
    // Return teachers assigned to this section or teachers with matching strand expertise
    return faculties.filter(faculty => {
      // Include section's assigned adviser
      if (section.adviser_id && faculty.id == section.adviser_id) return true;
      
      // Include teachers who can teach subjects in this section's strand
      const sectionStrand = section.strand_id;
      const teacherSubjects = subjects.filter(subject => 
        subject.strand_id == sectionStrand && 
        faculty.subjects && faculty.subjects.some(fs => fs.id == subject.id)
      );
      
      return teacherSubjects.length > 0;
    });
  };

  const getFilteredSubjects = () => {
    if (!selectedSection) return subjects;
    
    const section = sections.find(s => s.id == selectedSection);
    if (!section || !section.strand_id) return subjects;
    
    // Return subjects that belong to the section's strand
    return subjects.filter(subject => subject.strand_id == section.strand_id);
  };

  React.useEffect(() => {
    if (schedule) {
      setSelectedSubject(schedule.subject_id || "");
      setSelectedFaculty(schedule.faculty_id || "");
      setSelectedSection(schedule.section_id || "");
      setDayOfWeek(schedule.day_of_week || "");
      setStartTime(schedule.start_time || "");
      setEndTime(schedule.end_time || "");
      setDuration(schedule.duration || 60);
      setSemester(schedule.semester || "1st Semester");
      setSchoolYear(schedule.school_year || (activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : "2024-2025"));
      setSchoolYearId(schedule.school_year_id || (activeSchoolYear?.id || ""));
    } else {
      setSelectedSubject("");
      setSelectedFaculty("");
      setSelectedSection("");
      setDayOfWeek("");
      setStartTime("");
      setEndTime("");
      setDuration(60);
      setSemester("1st Semester");
      setSchoolYear(activeSchoolYear ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}` : "2024-2025");
      setSchoolYearId(activeSchoolYear?.id || "");
    }
  }, [schedule, isOpen, activeSchoolYear]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedSubject || !selectedFaculty || !selectedSection || !dayOfWeek || !startTime || !endTime) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    setProcessing(true);

    const data = {
      subject_id: selectedSubject,
      faculty_id: selectedFaculty,
      section_id: selectedSection,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      duration: duration,
      semester: semester,
      school_year: schoolYear,
      school_year_id: schoolYearId
    };

    if (schedule) {
      router.put(`/registrar/schedules/${schedule.id}`, data, {
        onSuccess: () => {
          Swal.fire({
            title: 'Success!',
            text: 'Schedule updated successfully.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to update schedule. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
          setProcessing(false);
        }
      });
    } else {
      router.post('/registrar/schedules', data, {
        onSuccess: () => {
          Swal.fire({
            title: 'Success!',
            text: 'Schedule created successfully.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to create schedule. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
          setProcessing(false);
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-white text-xl" />
            <h2 className="text-xl font-bold text-white">
              {schedule ? 'Edit Schedule' : 'Create New Schedule'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaUsers className="text-blue-500 text-sm" />
                Section *
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              >
                <option value="">Select Section</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name} - {section.strand?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaBookOpen className="text-blue-500 text-sm" />
                Subject *
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              >
                <option value="">Select Subject</option>
                {getFilteredSubjects().map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaChalkboardTeacher className="text-blue-500 text-sm" />
                Faculty *
              </label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              >
                <option value="">Select Faculty</option>
                {getFilteredTeachers().map(faculty => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-500 text-sm" />
                Day of Week *
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              >
                <option value="">Select Day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaClock className="text-blue-500 text-sm" />
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaClock className="text-blue-500 text-sm" />
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
              <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-700 font-medium">
                {duration} minutes
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from start and end time</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  {schedule ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  {schedule ? 'Update Schedule' : 'Create Schedule'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RegistrarSchedules = () => {
  const { schedules, subjects, faculties, sections, schoolYears, activeSchoolYear } = usePage().props;
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { flash } = usePage().props;
  
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [viewType, setViewType] = useState('table');

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.subject?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.faculty?.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.faculty?.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.section?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.room?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDay = selectedDay === "" || schedule.day_of_week === selectedDay;
    
    // Filter by grade level (check section's grade_level)
    const matchesGrade = selectedGrade === "" || 
      schedule.section?.grade_level?.toString() === selectedGrade ||
      schedule.section?.year_level?.toString() === selectedGrade;
    
    // Filter by semester
    const matchesSemester = selectedSemester === "" || schedule.semester === selectedSemester;
    
    return matchesSearch && matchesDay && matchesGrade && matchesSemester;
  });

  const handleDeleteSchedule = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(`/registrar/schedules/${id}`);
      }
    });
  };

  const openEditScheduleModal = (schedule) => {
    setEditSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const openAddScheduleModal = () => {
    setEditSchedule(null);
    setScheduleModalOpen(true);
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const groupSchedulesByDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};
    
    days.forEach(day => {
      grouped[day] = filteredSchedules.filter(schedule => schedule.day_of_week === day);
    });
    
    return grouped;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`${isCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          <Head title="Schedule Management - ONSTS" />
          
          {flash?.success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {flash.success}
            </div>
          )}
          
          {flash?.error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {flash.error}
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Schedule Management
                </h1>
                <p className="text-gray-600 text-lg">Assign teachers to subjects and manage class schedules</p>
              </div>
              
              <div className="flex gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-none">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-full lg:w-80 bg-white shadow-sm"
                  />
                </div>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white shadow-sm"
                >
                  <option value="">All Days</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white shadow-sm"
                >
                  <option value="">All Grades</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white shadow-sm"
                >
                  <option value="">All Semesters</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
                <button
                  onClick={openAddScheduleModal}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105"
                >
                  <FaPlus className="w-4 h-4" />
                  Create Schedule
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Schedules</p>
                  <p className="text-3xl font-bold text-purple-600">{schedules.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <FaClock className="text-purple-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Active Teachers</p>
                  <p className="text-3xl font-bold text-blue-600">{faculties.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaUser className="text-blue-600 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Available Subjects</p>
                  <p className="text-3xl font-bold text-green-600">{subjects.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCalendarAlt className="text-green-600 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Active Sections</p>
                  <p className="text-3xl font-bold text-orange-600">{sections.length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FaMapMarkerAlt className="text-orange-600 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Class Schedules</h3>
                
                {/* View Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewType('table')}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      viewType === 'table' 
                        ? "bg-purple-600 text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FaFilter className="w-4 h-4" />
                    Table View
                  </button>
                  <button
                    onClick={() => setViewType('timetable')}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      viewType === 'timetable' 
                        ? "bg-purple-600 text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FaCalendarAlt className="w-4 h-4" />
                    Timetable
                  </button>
                </div>
              </div>
              
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <FaClock className="text-gray-300 text-6xl mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-gray-600 mb-2">No Schedules Found</h4>
                  <p className="text-gray-500 mb-6">
                    {schedules.length === 0 
                      ? "Start by creating your first class schedule."
                      : "No schedules match your current filters."
                    }
                  </p>
                  {schedules.length === 0 && (
                    <button
                      onClick={openAddScheduleModal}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 mx-auto transition-all duration-200 transform hover:scale-105"
                    >
                      <FaPlus className="w-4 h-4" />
                      Create Your First Schedule
                    </button>
                  )}
                </div>
              ) : viewType === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Teacher</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Section</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Room</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map(schedule => (
                        <tr key={schedule.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-gray-800">{schedule.subject?.name}</div>
                              <div className="text-sm text-gray-500">{schedule.subject?.code}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-800">
                              {schedule.faculty?.firstname} {schedule.faculty?.lastname}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-800">{schedule.section?.name}</div>
                            <div className="text-sm text-gray-500">Grade {schedule.section?.year_level}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                              {schedule.day_of_week}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-600">{schedule.room || 'Not specified'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditScheduleModal(schedule)}
                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                                title="Edit Schedule"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                title="Delete Schedule"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Timetable Grid View */
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
                        
                        // Create a grid to track occupied cells
                        const grid = {};
                        days.forEach(day => {
                          grid[day] = {};
                        });
                        
                        // Function to convert time to slot index
                        const timeToSlotIndex = (timeStr) => {
                          const [time, period] = timeStr.split(' ');
                          let [hours, minutes] = time.split(':').map(Number);
                          
                          if (period === 'PM' && hours !== 12) hours += 12;
                          if (period === 'AM' && hours === 12) hours = 0;
                          
                          const totalMinutes = hours * 60 + minutes;
                          const startMinutes = 7 * 60 + 30; // 7:30 AM
                          const slotMinutes = (totalMinutes - startMinutes) / 30;
                          
                          return Math.floor(slotMinutes);
                        };
                        
                        // Parse schedule data and fill grid
                        if (filteredSchedules && filteredSchedules.length > 0) {
                          filteredSchedules.forEach(schedule => {
                            if (schedule.start_time && schedule.end_time && schedule.day_of_week) {
                              const startTime = formatTime(schedule.start_time);
                              const endTime = formatTime(schedule.end_time);
                              const startSlot = timeToSlotIndex(startTime);
                              const endSlot = timeToSlotIndex(endTime);
                              
                              if (startSlot >= 0 && startSlot < timeSlots.length && endSlot > startSlot) {
                                const duration = endSlot - startSlot;
                                grid[schedule.day_of_week][startSlot] = {
                                  ...schedule,
                                  duration: duration
                                };
                                
                                // Mark occupied slots
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
                                return null; // This cell is part of a multi-slot class
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
                                      {cell.room || 'TBA'}
                                    </div>
                                    <div className="text-xs">
                                      {cell.faculty?.firstname} {cell.faculty?.lastname}
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
              )}
            </div>
          </div>
        </div>

        {/* Schedule Modal */}
        <ScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setEditSchedule(null);
          }}
          schedule={editSchedule}
          subjects={subjects}
          faculties={faculties}
          sections={sections}
          schoolYears={schoolYears}
          activeSchoolYear={activeSchoolYear}
          onScheduleCreated={() => {
            setScheduleModalOpen(false);
            setEditSchedule(null);
            router.reload();
          }}
          onScheduleUpdated={() => {
            setScheduleModalOpen(false);
            setEditSchedule(null);
            router.reload();
          }}
        />
      </main>
    </div>
  );
};

export default RegistrarSchedules;
