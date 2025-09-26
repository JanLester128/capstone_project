import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { usePage, Head } from "@inertiajs/react";
import Sidebar from "../layouts/Sidebar";
import Swal from "sweetalert2";
import { 
  FaUserPlus, 
  FaUsers, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaKey,
  FaEnvelope,
  FaUser,
  FaBriefcase,
  FaCheck,
  FaTimes,
  FaPaperPlane,
  FaBell,
  FaToggleOn,
  FaToggleOff,
  FaUserTie,
  FaBan,
  FaUserCheck,
  FaSearch,
  FaChalkboardTeacher,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";

const EditModal = ({ isOpen, onClose, teacher }) => {
  const [editData, setEditData] = useState({
    firstname: "",
    lastname: "",
    middlename: "",
    email: "",
  });
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    if (teacher && isOpen) {
      const nameParts = teacher.name.split(' ');
      setEditData({
        firstname: nameParts[0] || "",
        lastname: nameParts[nameParts.length - 1] || "",
        middlename: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : "",
        email: teacher.email || "",
      });
    }
  }, [teacher, isOpen]);

  if (!isOpen || !teacher) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.put(`/registrar/faculty/${teacher.id}`, editData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Success!',
          text: `${editData.firstname} ${editData.lastname}'s information has been updated successfully.`,
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
          title: 'Update Failed',
          text: 'Failed to update teacher information. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
        setProcessing(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FaUserTie className="text-white text-xl" />
            <h2 className="text-xl font-bold text-white">Edit Teacher</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaUser className="text-blue-500 text-sm" />
              First Name *
            </label>
            <input
              type="text"
              value={editData.firstname}
              onChange={(e) => setEditData({...editData, firstname: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
            <input
              type="text"
              value={editData.middlename}
              onChange={(e) => setEditData({...editData, middlename: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
            <input
              type="text"
              value={editData.lastname}
              onChange={(e) => setEditData({...editData, lastname: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaEnvelope className="text-blue-500 text-sm" />
              Email Address *
            </label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({...editData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              required
            />
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
                  Updating...
                </>
              ) : (
                <>
                  <FaCheck />
                  Update Teacher
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RegistrarFaculty = ({ initialTeachers = [], strands: initialStrands = [], flash }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    middlename: "",
    email: "",
    assigned_strand_id: "",
  });
  const [strands, setStrands] = useState(initialStrands);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [addTeacherModalOpen, setAddTeacherModalOpen] = useState(false);

  // Use Inertia's page props for flash messages and updates
  const { props } = usePage();

  // Load strands from props instead of mock data
  React.useEffect(() => {
    if (initialStrands && initialStrands.length > 0) {
      setStrands(initialStrands);
    }
  }, [initialStrands]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();

    router.post(
      "/registrar/faculty",
      {
        firstname: formData.firstname,
        lastname: formData.lastname,
        middlename: formData.middlename,
        email: formData.email,
        assigned_strand_id: formData.assigned_strand_id,
        send_email: true, // Automatically send email
      },
      {
        onSuccess: (page) => {
          // Get the generated password from flash message
          const generatedPassword = page.props.flash?.password;
          const emailSent = page.props.flash?.email_sent;
          
          if (generatedPassword) {
            Swal.fire({
              title: 'Account Created Successfully!',
              html: `
                <div class="text-left">
                  <p class="mb-4">✅ <strong>${formData.firstname} ${formData.lastname}</strong> has been added as Faculty.</p>
                  <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <h4 class="font-semibold text-blue-800 mb-2">Login Credentials:</h4>
                    <p class="text-sm text-blue-700 mb-1"><strong>Email:</strong> ${formData.email}</p>
                    <p class="text-sm text-blue-700 mb-3"><strong>Password:</strong> <span class="font-mono bg-blue-100 px-2 py-1 rounded">${generatedPassword}</span></p>
                  </div>
                  ${emailSent ? 
                    `<div class="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                      <h4 class="font-semibold text-green-800 mb-2">📧 Email Sent Successfully!</h4>
                      <p class="text-sm text-green-700">Login credentials have been automatically sent to <strong>${formData.email}</strong></p>
                    </div>` : 
                    `<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <h4 class="font-semibold text-yellow-800 mb-2">⚠️ Email Not Sent</h4>
                      <p class="text-sm text-yellow-700">Please manually share the credentials with the faculty member.</p>
                    </div>`
                  }
                  <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <h4 class="font-semibold text-blue-800 mb-2">Account Status:</h4>
                    <ul class="text-sm text-blue-700 space-y-1">
                      <li>• Faculty account is immediately active</li>
                      <li>• Can access the system with provided credentials</li>
                      <li>• Default role: Faculty (can be changed to Coordinator)</li>
                    </ul>
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Got it!',
              confirmButtonColor: '#16a34a',
              width: '600px'
            });
          } else {
            Swal.fire({
              title: 'Account Created!',
              text: `${formData.firstname} ${formData.lastname} has been added as Faculty successfully.`,
              icon: 'success',
              confirmButtonColor: '#16a34a'
            });
          }
          
          // Update teachers list from server response
          if (page.props.initialTeachers) {
            setTeachers(page.props.initialTeachers);
          } else {
            // Fallback: add new teacher to existing list with generated password and strand info
            const selectedStrand = strands.find(s => s.id === parseInt(formData.assigned_strand_id));
            const newTeacher = {
              id: Date.now(), // temporary ID
              faculty_id: Date.now(),
              name: `${formData.firstname} ${formData.lastname}`,
              email: formData.email,
              department: 'Faculty',
              status: 'faculty',
              password: generatedPassword || 'Generated',
              is_disabled: false,
              assigned_strand: selectedStrand ? {
                id: selectedStrand.id,
                code: selectedStrand.code,
                name: selectedStrand.name
              } : null
            };
            setTeachers(prev => [...prev, newTeacher]);
          }
          
          // Update existing teachers with password if they don't have one
          if (generatedPassword) {
            setTeachers(prev => prev.map(teacher => {
              if (teacher.name === `${formData.firstname} ${formData.lastname}` && teacher.email === formData.email && !teacher.password) {
                return { ...teacher, password: generatedPassword };
              }
              return teacher;
            }));
          }
          
          setFormData({ firstname: "", lastname: "", middlename: "", email: "", assigned_strand_id: "" });
          setAddTeacherModalOpen(false);
        },
        onError: (errors) => {
          Swal.fire({
            title: 'Failed to Create Account',
            html: `
              <div class="text-left">
                <p class="mb-3">❌ Unable to create account for <strong>${formData.firstname} ${formData.lastname}</strong></p>
                <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-3">
                  <h4 class="font-semibold text-red-800 mb-2">Error Details:</h4>
                  <ul class="text-sm text-red-700 space-y-1">
                    ${Object.entries(errors).map(([field, messages]) => 
                      `<li>• <strong>${field}:</strong> ${Array.isArray(messages) ? messages.join(', ') : messages}</li>`
                    ).join('')}
                  </ul>
                </div>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <h4 class="font-semibold text-yellow-800 mb-2">Please check:</h4>
                  <ul class="text-sm text-yellow-700 space-y-1">
                    <li>• All required fields are filled</li>
                    <li>• Email format is valid</li>
                    <li>• Email is not already in use</li>
                  </ul>
                </div>
              </div>
            `,
            icon: 'error',
            confirmButtonText: 'Try Again',
            confirmButtonColor: '#dc2626',
            width: '500px'
          });
        }
      }
    );
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (teacher) => {
    const result = await Swal.fire({
      title: 'Change Faculty Status',
      html: `
        <div class="text-left">
          <p class="mb-3">Change <strong>${teacher.name}</strong>'s status to ${teacher.status === 'coordinator' ? 'Faculty' : 'Coordinator'}?</p>
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
            <h4 class="font-semibold text-blue-800 mb-2">${teacher.status === 'coordinator' ? 'Faculty' : 'Coordinator'} Access Includes:</h4>
            <ul class="text-sm text-blue-700 space-y-1">
              ${teacher.status === 'coordinator' ? 
                '<li>• Schedule Management</li><li>• Class Lists</li><li>• Grade Input</li>' :
                '<li>• Enrollment Management</li><li>• Student Assignment</li><li>• All Faculty Features</li>'
              }
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Change to ${teacher.status === 'coordinator' ? 'Faculty' : 'Coordinator'}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6'
    });

    if (result.isConfirmed) {
      // Use Inertia router instead of axios
      router.post(`/registrar/faculty/${teacher.id}/toggle-status`, {}, {
        onSuccess: (page) => {
          // Get the new status from the response or calculate it
          const newStatus = page.props.flash?.new_status || (teacher.status === 'coordinator' ? 'faculty' : 'coordinator');
          const newIsCoordinator = newStatus === 'coordinator';
          
          // Update the teacher in the local state
          setTeachers(prev => prev.map(t => 
            t.id === teacher.id 
              ? { 
                  ...t, 
                  status: newStatus,
                  is_coordinator: newIsCoordinator
                }
              : t
          ));

          Swal.fire({
            title: 'Success!',
            text: `${teacher.name} is now a ${newStatus === 'coordinator' ? 'Coordinator' : 'Faculty member'}`,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            showConfirmButton: false
          });
        },
        onError: (errors) => {
          console.error('Toggle status error:', errors);
          Swal.fire({
            title: 'Error!',
            text: 'Failed to update faculty status. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  };

  const handleSendCredentials = (teacher) => {
    if (!confirm(`Send login credentials to ${teacher.name} at ${teacher.email}?`)) return;

    router.post('/registrar/faculty/send-credentials', {
      teacherId: teacher.id,
      email: teacher.email,
      name: teacher.name,
      password: teacher.password
    }, {
      onSuccess: () => {
        Swal.fire({
          title: 'Email Sent Successfully!',
          html: `
            <div class="text-left">
              <p class="mb-3">📧 Login credentials have been sent to:</p>
              <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-3">
                <p class="font-semibold text-blue-800">${teacher.email}</p>
              </div>
              <div class="bg-green-50 border-l-4 border-green-400 p-4">
                <h4 class="font-semibold text-green-800 mb-2">Email Contents:</h4>
                <ul class="text-sm text-green-700 space-y-1">
                  <li>• Login credentials for ${teacher.name}</li>
                  <li>• System access instructions</li>
                  <li>• Welcome message</li>
                </ul>
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Great!',
          confirmButtonColor: '#16a34a',
          width: '450px'
        });
      },
      onError: (errors) => {
        Swal.fire({
          title: 'Email Failed',
          text: 'Failed to send credentials email. Please try again or contact the teacher directly.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  };

  const handleToggleDisable = async (teacher) => {
    const isCurrentlyDisabled = teacher.is_disabled;
    const action = isCurrentlyDisabled ? 'enable' : 'disable';
    const actionText = isCurrentlyDisabled ? 'Enable' : 'Disable';
    
    const result = await Swal.fire({
      title: `${actionText} Account`,
      html: `
        <div class="text-left">
          <p class="mb-3">${actionText} <strong>${teacher.name}</strong>'s account?</p>
          <div class="bg-${isCurrentlyDisabled ? 'green' : 'red'}-50 border-l-4 border-${isCurrentlyDisabled ? 'green' : 'red'}-400 p-4">
            <h4 class="font-semibold text-${isCurrentlyDisabled ? 'green' : 'red'}-800 mb-2">${actionText} Effects:</h4>
            <ul class="text-sm text-${isCurrentlyDisabled ? 'green' : 'red'}-700 space-y-1">
              ${isCurrentlyDisabled ? 
                '<li>• User can login to the system</li><li>• Full access to assigned features</li><li>• Account will be active</li>' :
                '<li>• User cannot login to the system</li><li>• All access will be blocked</li><li>• Account will be inactive</li>'
              }
            </ul>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `${actionText} Account`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: isCurrentlyDisabled ? '#16a34a' : '#dc2626'
    });

    if (result.isConfirmed) {
      // Use Inertia router instead of axios
      router.put(`/registrar/faculty/${teacher.id}/toggle-disable`, {}, {
        onSuccess: (page) => {
          const isDisabled = page.props.flash?.is_disabled ?? !teacher.is_disabled;
          
          // Update the teacher in the local state
          setTeachers(prev => prev.map(t => 
            t.id === teacher.id 
              ? { ...t, is_disabled: isDisabled }
              : t
          ));

          Swal.fire({
            title: 'Success!',
            text: `${teacher.name} has been ${isDisabled ? 'disabled' : 'enabled'}`,
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
        },
        onError: () => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to update faculty status. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  };

  const flashSuccess = props.flash?.success || flash?.success;
  const flashPassword = props.flash?.password || flash?.password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`p-8 ${isCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <FaChalkboardTeacher className="text-purple-600" />
                Teacher Management
              </h1>
              <p className="text-gray-600">Create and manage faculty and coordinator accounts</p>
            </div>
            {/* System Status Indicator - Visibility of System Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">System Online</span>
              </div>
              <div className="text-sm text-gray-500">
                Total Teachers: <span className="font-semibold text-gray-800">{teachers.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls Section - User Control and Freedom */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setAddTeacherModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 focus:ring-4 focus:ring-purple-300 focus:outline-none"
                aria-label="Add new teacher to the system"
              >
                <FaUserPlus className="w-5 h-5" />
                Add New Teacher
              </button>
              
              {/* Quick Actions - Flexibility and Efficiency of Use */}
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center gap-2 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                  title="Refresh teacher list"
                  onClick={() => window.location.reload()}
                >
                  <FaSpinner className="w-4 h-4" />
                  Refresh
                </button>
                <button 
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center gap-2 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                  title="Export teacher data"
                >
                  <FaPaperPlane className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            
            {/* Search and Filter - Recognition Rather Than Recall */}
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  aria-label="Search teachers by name or email"
                />
              </div>
            </div>
          </div>
          
          {/* Quick Stats - Visibility of System Status */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Active: <span className="font-semibold">{teachers.filter(t => !t.is_disabled).length}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Disabled: <span className="font-semibold">{teachers.filter(t => t.is_disabled).length}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Unassigned: <span className="font-semibold">{teachers.filter(t => !t.assigned_strand_id).length}</span></span>
            </div>
          </div>
        </div>

        {teachers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FaUsers className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Teachers Found</h3>
              <p className="text-gray-600 mb-4">Start by adding your first faculty or coordinator account.</p>
              {/* Help and Documentation - Provide Clear Next Steps */}
              <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FaCheckCircle className="w-4 h-4" />
                  Getting Started
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Click "Add New Teacher" to create faculty accounts</li>
                  <li>• Assign teachers to specific strands</li>
                  <li>• Manage coordinator permissions</li>
                  <li>• Enable/disable accounts as needed</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Teachers by Strand */}
            {(() => {
              // Group teachers by strand
              const teachersByStrand = teachers.reduce((groups, teacher) => {
                const strandKey = teacher.assigned_strand 
                  ? `${teacher.assigned_strand.code}-${teacher.assigned_strand.name}` 
                  : 'unassigned';
                if (!groups[strandKey]) {
                  groups[strandKey] = [];
                }
                groups[strandKey].push(teacher);
                return groups;
              }, {});

              // Get strand colors
              const getStrandColor = (strandCode) => {
                const colors = {
                  'STEM': 'from-blue-500 to-cyan-500',
                  'ABM': 'from-green-500 to-emerald-500', 
                  'HUMSS': 'from-purple-500 to-violet-500',
                  'GAS': 'from-orange-500 to-amber-500',
                  'TVL': 'from-red-500 to-pink-500',
                  'ICT': 'from-indigo-500 to-blue-500',
                  'unassigned': 'from-gray-500 to-slate-500'
                };
                return colors[strandCode] || 'from-teal-500 to-cyan-500';
              };

              const getStrandIcon = (strandCode) => {
                const icons = {
                  'STEM': '🔬',
                  'ABM': '💼', 
                  'HUMSS': '📚',
                  'GAS': '🎯',
                  'TVL': '🔧',
                  'ICT': '💻',
                  'unassigned': '👥'
                };
                return icons[strandCode] || '📖';
              };

              return Object.entries(teachersByStrand).map(([strandKey, strandTeachers]) => {
                const isUnassigned = strandKey === 'unassigned';
                const strandCode = isUnassigned ? 'unassigned' : strandKey.split('-')[0];
                const strandName = isUnassigned ? 'Unassigned Teachers' : strandKey.split('-')[1];
                
                return (
                  <div key={strandKey} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Strand Header */}
                    <div className={`bg-gradient-to-r ${getStrandColor(strandCode)} p-6`}>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{getStrandIcon(strandCode)}</div>
                        <div className="text-white">
                          <h2 className="text-2xl font-bold">
                            {isUnassigned ? 'Unassigned Teachers' : `${strandCode} - ${strandName}`}
                          </h2>
                          <p className="text-white/90">
                            {strandTeachers.length} {strandTeachers.length === 1 ? 'teacher' : 'teachers'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Teachers Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {strandTeachers.map((teacher) => (
                          <div key={teacher.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 hover:shadow-md border border-transparent hover:border-gray-200">
                            {/* Enhanced Teacher Info with Better Visual Hierarchy */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                teacher.is_disabled 
                                  ? 'bg-red-100' 
                                  : teacher.role === 'coordinator' 
                                    ? 'bg-blue-100' 
                                    : 'bg-purple-100'
                              }`}>
                                <FaUser className={`w-5 h-5 ${
                                  teacher.is_disabled 
                                    ? 'text-red-600' 
                                    : teacher.role === 'coordinator' 
                                      ? 'text-blue-600' 
                                      : 'text-purple-600'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 flex items-center gap-2">
                                  {teacher.name}
                                  {teacher.role === 'coordinator' && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Coordinator</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">ID: {teacher.id}</div>
                              </div>
                              {/* Status Indicator */}
                              <div className={`w-3 h-3 rounded-full ${
                                teacher.is_disabled ? 'bg-red-500' : 'bg-green-500'
                              }`} title={teacher.is_disabled ? 'Disabled' : 'Active'}></div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-2 mb-3">
                              <FaEnvelope className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600 truncate">{teacher.email}</span>
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-2 mb-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                teacher.is_disabled 
                                  ? 'bg-red-100 text-red-800' 
                                  : teacher.department === 'Faculty' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {teacher.is_disabled ? 'Disabled' : teacher.department}
                              </span>
                              
                              <button
                                onClick={() => handleToggleStatus(teacher)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  teacher.status === 'coordinator'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={`Toggle to ${teacher.status === 'coordinator' ? 'Faculty' : 'Coordinator'}`}
                                disabled={teacher.is_disabled}
                              >
                                {teacher.status === 'coordinator' ? (
                                  <>
                                    <FaToggleOn className="w-3 h-3" />
                                    <FaUserTie className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    <FaToggleOff className="w-3 h-3" />
                                    <FaUser className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Enhanced Actions - Error Prevention & Help Users Recognize */}
                            <div className="flex gap-2">
                              <button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm focus:ring-4 focus:ring-blue-300 focus:outline-none hover:shadow-md"
                                onClick={() => handleEdit(teacher)}
                                aria-label={`Edit ${teacher.name}'s information`}
                                title="Edit teacher information"
                              >
                                <FaEdit className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                className={`flex-1 ${
                                  teacher.is_disabled 
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300' 
                                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                                } text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm focus:ring-4 focus:outline-none hover:shadow-md`}
                                onClick={() => handleToggleDisable(teacher)}
                                aria-label={`${teacher.is_disabled ? 'Enable' : 'Disable'} ${teacher.name}`}
                                title={`${teacher.is_disabled ? 'Enable' : 'Disable'} this teacher account`}
                              >
                                {teacher.is_disabled ? (
                                  <>
                                    <FaUserCheck className="w-3 h-3" />
                                    Enable
                                  </>
                                ) : (
                                  <>
                                    <FaBan className="w-3 h-3" />
                                    Disable
                                  </>
                                )}
                              </button>
                            </div>
                            
                            {/* Last Activity Indicator - Visibility of System Status */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>
                                  Last seen: {teacher.last_login_at 
                                    ? new Date(teacher.last_login_at).toLocaleDateString() 
                                    : 'Never'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    teacher.is_disabled 
                                      ? 'bg-gray-400' 
                                      : teacher.is_online 
                                        ? 'bg-green-400' 
                                        : 'bg-red-400'
                                  }`}></div>
                                  {teacher.is_disabled 
                                    ? 'Disabled' 
                                    : teacher.is_online 
                                      ? 'Online' 
                                      : 'Offline'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
        
        {/* Add Teacher Modal */}
        {addTeacherModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-4xl w-full mx-4 border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <FaUserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Teacher</h2>
                    <p className="text-white/90 text-sm">Create faculty or coordinator accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setAddTeacherModalOpen(false)}
                  className="text-white hover:text-gray-200 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaUser className="w-4 h-4 text-purple-500" />
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstname"
                      placeholder="Enter first name"
                      value={formData.firstname}
                      onChange={handleChange}
                      required
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaUser className="w-4 h-4 text-purple-500" />
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastname"
                      placeholder="Enter last name"
                      value={formData.lastname}
                      onChange={handleChange}
                      required
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaUser className="w-4 h-4 text-purple-500" />
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middlename"
                      placeholder="Enter middle name (optional)"
                      value={formData.middlename}
                      onChange={handleChange}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaEnvelope className="w-4 h-4 text-purple-500" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaBriefcase className="w-4 h-4 text-purple-500" />
                    Assigned Strand
                  </label>
                  <select
                    name="assigned_strand_id"
                    value={formData.assigned_strand_id}
                    onChange={handleChange}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
                  >
                    <option value="">Select Strand (Optional)</option>
                    {strands.map((strand) => (
                      <option key={strand.id} value={strand.id}>
                        {strand.code} - {strand.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <strong>Note:</strong> Faculty assigned to a strand will be the coordinator for that strand when promoted to coordinator role.
                  </p>
                </div>
                
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setAddTeacherModalOpen(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FaUserPlus className="w-4 h-4" />
                    Create Teacher Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          teacher={editingTeacher}
        />
      </main>
    </div>
  );
};

export default RegistrarFaculty;
