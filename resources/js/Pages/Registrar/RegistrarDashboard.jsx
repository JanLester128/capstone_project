import React, { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import Sidebar from "../layouts/Sidebar";
import useAuth from "../../hooks/useAuth";
import { useAuthMiddleware } from "../../middleware/AuthMiddleware";
import Swal from 'sweetalert2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  FaUsers, 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaCalendarAlt,
  FaClipboardList,
  FaChartLine,
  FaBell,
  FaEye,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaArrowRight,
  FaPlus,
  FaCog,
  FaDownload,
  FaGraduationCap,
  FaBookOpen,
  FaArrowUp
} from "react-icons/fa";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function RegistrarDashboard() {
  const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
  
  // Use auth middleware to handle page persistence and authentication
  useAuthMiddleware(['registrar']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingEnrollments: 0,
    activeClasses: 0,
    facultyMembers: 0,
    activeSections: 0,
    totalStrands: 0
  });
  const [strandChartData, setStrandChartData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      try {
        // Fetch real dashboard statistics
        const statsResponse = await fetch('/registrar/dashboard-stats', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          credentials: 'same-origin'
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStats(statsData.data);
          }
        }

        // Fetch enrolled students per strand for chart
        const chartResponse = await fetch('/registrar/enrolled-students-per-strand', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          credentials: 'same-origin'
        });

        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          if (chartData.success) {
            // Prepare chart data
            const labels = chartData.data.map(item => item.strand);
            const data = chartData.data.map(item => item.students);
            const backgroundColors = [
              'rgba(59, 130, 246, 0.8)',   // Blue
              'rgba(16, 185, 129, 0.8)',   // Green
              'rgba(245, 158, 11, 0.8)',   // Yellow
              'rgba(239, 68, 68, 0.8)',    // Red
              'rgba(139, 92, 246, 0.8)',   // Purple
              'rgba(236, 72, 153, 0.8)',   // Pink
            ];
            const borderColors = [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)',
            ];

            setStrandChartData({
              labels: labels,
              datasets: [
                {
                  label: 'Enrolled Students',
                  data: data,
                  backgroundColor: backgroundColors.slice(0, labels.length),
                  borderColor: borderColors.slice(0, labels.length),
                  borderWidth: 2,
                  borderRadius: 8,
                  borderSkipped: false,
                }
              ]
            });
          }
        }

        // Set sample activities and notifications
        setRecentActivities([
          {
            id: 1,
            type: 'enrollment',
            message: 'New student enrollment submitted',
            time: '2 minutes ago',
            icon: FaUserGraduate,
            color: 'blue'
          },
          {
            id: 2,
            type: 'class',
            message: 'Class schedule updated for STEM-A',
            time: '15 minutes ago',
            icon: FaCalendarAlt,
            color: 'green'
          },
          {
            id: 3,
            type: 'faculty',
            message: 'New faculty member added',
            time: '1 hour ago',
            icon: FaChalkboardTeacher,
            color: 'purple'
          },
          {
            id: 4,
            type: 'system',
            message: 'System backup completed successfully',
            time: '2 hours ago',
            icon: FaCheck,
            color: 'emerald'
          }
        ]);

        setNotifications([
          {
            id: 1,
            title: 'Pending Enrollments',
            message: `${stats.pendingEnrollments || 0} new enrollment applications need review`,
            type: 'warning',
            time: '5 minutes ago'
          },
          {
            id: 2,
            title: 'Active School Year',
            message: stats.activeSchoolYear ? `Current: ${stats.activeSchoolYear.year_start}-${stats.activeSchoolYear.year_end}` : 'No active school year set',
            type: stats.activeSchoolYear ? 'info' : 'error',
            time: '1 hour ago'
          }
        ]);
      } catch (error) {
        console.error('Dashboard loading error:', error);
        Swal.fire({
          title: 'Error Loading Dashboard',
          text: 'Failed to load dashboard data. Please refresh the page.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleQuickAction = async (action) => {
    const result = await Swal.fire({
      title: `${action} Action`,
      text: `Are you sure you want to proceed with ${action.toLowerCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Proceed',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Success!',
        text: `${action} completed successfully.`,
        icon: 'success',
        confirmButtonColor: '#10b981',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleFixEnrollmentIssues = async () => {
    const result = await Swal.fire({
      title: 'Fix Enrollment Issues',
      text: 'This will automatically fix students without assigned sections and create missing class details. Continue?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Fix Issues',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Processing...',
          text: 'Fixing enrollment issues, please wait...',
          icon: 'info',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await fetch('/registrar/fix-enrollment-issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: 'Success!',
            text: data.message,
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: data.message || 'Failed to fix enrollment issues',
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
        }
      } catch (error) {
        console.error('Error fixing enrollment issues:', error);
        Swal.fire({
          title: 'Error!',
          text: 'An unexpected error occurred while fixing enrollment issues',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <FaArrowUp className={`text-xs ${trend === 'down' ? 'rotate-180' : ''}`} />
              <span>{trendValue}% from last month</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${color}`}>
          <Icon className="text-white text-2xl" />
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
      <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
        <activity.icon className={`text-${activity.color}-600 text-lg`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
        <p className="text-xs text-gray-500">{activity.time}</p>
      </div>
    </div>
  );

  const NotificationItem = ({ notification }) => (
    <div className={`p-4 rounded-lg border-l-4 ${
      notification.type === 'error' ? 'border-red-500 bg-red-50' :
      notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
      'border-blue-500 bg-blue-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
          <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <FaTimes className="text-sm" />
        </button>
      </div>
    </div>
  );

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Head title="Dashboard - ONSTS" />
      <Sidebar onToggle={handleSidebarToggle} />
      
      <main className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} p-8 transition-all duration-300 overflow-x-hidden min-h-screen`}>
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <FaChartLine className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user?.name || 'Registrar'}!
                </h1>
                <p className="text-gray-600">Here's what's happening at your school today</p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.visit('/registrar/students')}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaUsers className="text-sm" />
                Manage Students
              </button>
              <button
                onClick={() => router.visit('/registrar/sections')}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaClipboardList className="text-sm" />
                View Sections
              </button>
              <button
                onClick={() => router.visit('/registrar/schedules')}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaCalendarAlt className="text-sm" />
                Class Schedules
              </button>
              <button
                onClick={() => handleQuickAction('Export Report')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaDownload className="text-sm" />
                Export Report
              </button>
              <button
                onClick={handleFixEnrollmentIssues}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaCog className="text-sm" />
                Fix Enrollment Issues
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={FaUserGraduate}
              color="from-blue-500 to-blue-600"
              trend="up"
              trendValue="12"
            />
            <StatCard
              title="Pending Enrollments"
              value={stats.pendingEnrollments}
              icon={FaClipboardList}
              color="from-yellow-500 to-orange-500"
              trend="down"
              trendValue="5"
            />
            <StatCard
              title="Active Classes"
              value={stats.activeClasses}
              icon={FaBookOpen}
              color="from-green-500 to-emerald-500"
              trend="up"
              trendValue="8"
            />
            <StatCard
              title="Faculty Members"
              value={stats.facultyMembers}
              icon={FaChalkboardTeacher}
              color="from-purple-500 to-indigo-500"
            />
            <StatCard
              title="Active Sections"
              value={stats.activeSections}
              icon={FaUsers}
              color="from-pink-500 to-rose-500"
            />
            <StatCard
              title="Academic Strands"
              value={stats.totalStrands}
              icon={FaGraduationCap}
              color="from-teal-500 to-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Enrolled Students Per Strand Chart */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <FaChartLine className="text-white text-lg" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Enrolled Students per Strand</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    Current Academic Year
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <FaSpinner className="animate-spin text-blue-500 text-2xl" />
                  </div>
                ) : strandChartData ? (
                  <div className="h-64">
                    <Bar
                      data={strandChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          title: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                              label: function(context) {
                                return `Students: ${context.parsed.y}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                              color: '#6b7280'
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            }
                          },
                          x: {
                            ticks: {
                              color: '#6b7280',
                              font: {
                                weight: 'bold'
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        },
                        animation: {
                          duration: 1000,
                          easing: 'easeInOutQuart'
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <FaChartLine className="text-4xl mb-2 mx-auto" />
                      <p>No enrollment data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activities */}
              <div className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                        <FaClipboardList className="text-white text-lg" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
                    </div>
                    <button
                      onClick={() => router.visit('/registrar/activities')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      View All
                      <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
                      <FaBell className="text-white text-lg" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {notifications.length}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
