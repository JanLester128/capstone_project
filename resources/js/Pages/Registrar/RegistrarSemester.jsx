import React, { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { FaPlay, FaPause, FaCalendarAlt, FaToggleOn, FaToggleOff, FaPlus, FaEdit, FaTrash, FaTimes, FaList, FaCalendarTimes, FaGraduationCap, FaClock } from "react-icons/fa";
import Sidebar from "../layouts/Sidebar";
import Swal from "sweetalert2";

const SemesterModal = ({ isOpen, onClose, semester }) => {
  const [semesterName, setSemesterName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customYearMode, setCustomYearMode] = useState(false);
  const [customStartYear, setCustomStartYear] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (semester) {
      setSemesterName(semester.semester || "");
      setYearStart(semester.year_start || "");
      setYearEnd(semester.year_end || "");
      setStartDate(semester.start_date || "");
      setEndDate(semester.end_date || "");
    } else {
      setSemesterName("");
      setYearStart("");
      setYearEnd("");
      setStartDate("");
      setEndDate("");
    }
  }, [semester, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!semesterName.trim() || !String(yearStart).trim() || !String(yearEnd).trim() || !startDate.trim() || !endDate.trim()) return;

    setProcessing(true);
    const data = {
      year_start: parseInt(yearStart),
      year_end: parseInt(yearEnd),
      semester: semesterName.trim(),
      start_date: startDate,
      end_date: endDate,
    };

    if (semester) {
      router.put(`/registrar/school-years/${semester.id}`, data, {
        onSuccess: (page) => {
          if (page.props.flash?.success) {
            Swal.fire({
              title: 'Success!',
              text: page.props.flash.success,
              icon: 'success',
              confirmButtonColor: '#10b981'
            });
          }
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || 'Failed to update semester';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    } else {
      router.post("/school-years", data, {
        onSuccess: (page) => {
          if (page.props.flash?.success) {
            Swal.fire({
              title: 'Success!',
              text: page.props.flash.success,
              icon: 'success',
              confirmButtonColor: '#10b981'
            });
          }
          onClose();
          setProcessing(false);
        },
        onError: (errors) => {
          const errorMessage = errors.error || 'Failed to create semester';
          Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
          setProcessing(false);
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-lg p-8 relative border border-white/30" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{semester ? "Edit Semester" : "Add New Semester"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Semester Name *</label>
            <select
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            >
              <option value="">Select semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Year Start *</label>
              <button
                type="button"
                onClick={() => {
                  setCustomYearMode(!customYearMode);
                  setYearStart("");
                  setYearEnd("");
                  setCustomStartYear("");
                }}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {customYearMode ? "Use Current Year" : "Enter Custom Year"}
              </button>
            </div>
            {customYearMode ? (
              <input
                type="number"
                value={customStartYear}
                onChange={(e) => {
                  setCustomStartYear(e.target.value);
                  setYearStart(e.target.value);
                  if (e.target.value) {
                    setYearEnd(String(parseInt(e.target.value) + 1));
                  } else {
                    setYearEnd("");
                  }
                }}
                placeholder="Enter start year (e.g., 2026)"
                min="2020"
                max="2050"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                required
              />
            ) : (
              <select
                value={yearStart}
                onChange={(e) => {
                  setYearStart(e.target.value);
                  if (e.target.value) {
                    setYearEnd(String(parseInt(e.target.value) + 1));
                  } else {
                    setYearEnd("");
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                required
              >
                <option value="">Select start year</option>
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Year End *</label>
            <input
              type="number"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-gray-50"
              required
              disabled
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-gray-500 mt-1">Automatically set to start year + 1</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {processing ? "Saving..." : semester ? "Update Semester" : "Create Semester"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RegistrarSemester = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('registrar-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const { schoolYears = [], flash } = usePage().props;
  const [modalOpen, setModalOpen] = useState(false);
  const [editSemester, setEditSemester] = useState(null);

  const openAddModal = () => {
    setEditSemester(null);
    setModalOpen(true);
  };

  const openEditModal = (semester) => {
    setEditSemester(semester);
    setModalOpen(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const title = currentStatus ? 'Deactivate Semester?' : 'Activate Semester?';
    const text = currentStatus 
      ? 'This will pause all academic activities for this semester.' 
      : 'This will make this semester active and deactivate others.';

    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: currentStatus ? '#EF4444' : '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Yes, ${action}!`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      router.put(`/school-years/${id}/toggle`, {}, {
        onSuccess: (page) => {
          const message = page.props.flash?.message || 'School year status updated successfully';
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            confirmButtonColor: '#10B981'
          });
          router.visit('/registrar/semesters', { 
            preserveState: false,
            preserveScroll: true 
          });
        },
        onError: (errors) => {
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to update school year status. Please try again.',
            confirmButtonColor: '#EF4444'
          });
        }
      });
    }
  };

  const handleDeleteSemester = (id) => {
    if (window.confirm("Are you sure you want to delete this semester?")) {
      router.delete(`/registrar/school-years/${id}`);
    }
  };

  const handleDeactivateExpired = async () => {
    const result = await Swal.fire({
      title: 'Deactivate Expired Semesters?',
      text: 'This will deactivate all expired semesters.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, deactivate!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      router.put('/registrar/school-years/deactivate-expired', {}, {
        onSuccess: (page) => {
          const message = page.props.flash?.message || 'Expired semesters deactivated successfully';
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            confirmButtonColor: '#10B981'
          });
        },
        onError: (errors) => {
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to deactivate expired semesters. Please try again.',
            confirmButtonColor: '#EF4444'
          });
        }
      });
    }
  };

  const activeSemester = schoolYears.find(s => s.is_active);
  const inactiveSemesters = schoolYears.filter(s => !s.is_active);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-72'} px-8 py-6 overflow-y-auto transition-all duration-300 overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto space-y-8">
          {flash?.success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-emerald-800">{flash.success}</p>
                </div>
              </div>
            </div>
          )}
          {flash?.error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{flash.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <FaCalendarAlt className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Semester Management</h1>
                    <p className="text-gray-600">Manage academic semesters and activation status</p>
                  </div>
                </div>
              </div>
              <button
                onClick={openAddModal}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaPlus className="text-lg" />
                Add New Semester
              </button>
              <button
                onClick={handleDeactivateExpired}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-6 py-4 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 hover:shadow-xl transform hover:-translate-y-0.5"
                title="Deactivate all expired school years"
              >
                <FaClock className="text-lg" />
                Deactivate Expired
              </button>
            </div>
          </div>


          {/* Semester Cards Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                <FaList className="text-white text-lg" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Semesters</h2>
            </div>
            
            {schoolYears.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FaCalendarTimes className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Semesters Found</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first academic semester</p>
                <button
                  onClick={openAddModal}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                >
                  <FaPlus className="inline mr-2" />
                  Create First Semester
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {schoolYears.map((semester) => (
                  <div key={semester.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                    {/* Header with icon and title */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FaCalendarAlt className="text-gray-600 text-lg" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{semester.semester}</h3>
                    </div>
                    
                    {/* School Year */}
                    <div className="flex items-center gap-2 mb-3">
                      <FaGraduationCap className="text-gray-400 text-sm" />
                      <span className="text-sm text-gray-600 font-medium">School Year:</span>
                      <span className="text-sm font-semibold text-gray-800">{semester.year_start}-{semester.year_end}</span>
                    </div>
                    
                    {/* Semester Duration */}
                    <div className="flex items-center gap-2 mb-3">
                      <FaClock className="text-gray-400 text-sm" />
                      <span className="text-sm text-gray-600 font-medium">Duration:</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {semester.start_date && semester.end_date ? (
                          `${new Date(semester.start_date).toLocaleDateString()} - ${new Date(semester.end_date).toLocaleDateString()}`
                        ) : (
                          <span className="text-red-500 italic">Dates not set</span>
                        )}
                      </span>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      {/* Status with slide toggle */}
                      <div className="flex items-center gap-3">
                        {/* Slide Toggle Switch */}
                        <button
                          onClick={() => handleToggleActive(semester.id, semester.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                            semester.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              semester.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(semester)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit Semester"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteSemester(semester.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete Semester"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Semesters</p>
                  <p className="text-3xl font-bold text-gray-900">{schoolYears.length}</p>
                  <p className="text-xs text-gray-400">Academic periods</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl">
                  <FaCalendarAlt className="text-purple-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Semester</p>
                  <p className="text-3xl font-bold text-emerald-600">{schoolYears.filter(s => s.is_active).length}</p>
                  <p className="text-xs text-gray-400">Currently running</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl">
                  <FaToggleOn className="text-emerald-600 text-2xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Inactive Semesters</p>
                  <p className="text-3xl font-bold text-gray-600">{schoolYears.filter(s => !s.is_active).length}</p>
                  <p className="text-xs text-gray-400">Not currently active</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-100 to-slate-100 rounded-2xl">
                  <FaToggleOff className="text-gray-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <SemesterModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        semester={editSemester}
      />
    </div>
  );
};

export default RegistrarSemester;
