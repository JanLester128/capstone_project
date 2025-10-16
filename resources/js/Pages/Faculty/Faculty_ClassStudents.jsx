import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Faculty_Sidebar from '../layouts/Faculty_Sidebar';
import { 
    FaUsers, FaUser, FaEnvelope, FaIdCard, FaGraduationCap, 
    FaCalendarAlt, FaChalkboardTeacher, FaBook, FaSchool,
    FaSearch, FaFilter, FaDownload, FaPrint
} from 'react-icons/fa';

export default function Faculty_ClassStudents({ students, classInfo, academicCalendar, error }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    // Filter students based on search term and status
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.lrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'active' && student.enrollment_active) ||
                            (filterStatus === 'inactive' && !student.enrollment_active);
        
        return matchesSearch && matchesStatus;
    });

    if (error) {
        return (
            <>
                <Head title="Class Students - ONSTS" />
                <div className="flex min-h-screen bg-gray-50">
                    <Faculty_Sidebar onToggle={handleSidebarToggle} />
                    <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                        <div className="p-8">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                <div className="text-red-600 text-6xl mb-4">
                                    <FaUsers />
                                </div>
                                <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Class</h2>
                                <p className="text-red-600">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${classInfo?.subject_name} Students - ONSTS`} />
            <div className="flex min-h-screen bg-gray-50">
                <Faculty_Sidebar onToggle={handleSidebarToggle} />
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                                        <FaUsers className="mr-3 text-blue-600" />
                                        Class Students
                                    </h1>
                                    <p className="text-gray-600">Manage and view students in your class</p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                        <FaDownload className="w-4 h-4" />
                                        Export
                                    </button>
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                        <FaPrint className="w-4 h-4" />
                                        Print
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Class Information */}
                        {classInfo && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <FaChalkboardTeacher className="mr-2 text-blue-600" />
                                    Class Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-center">
                                        <FaBook className="w-5 h-5 text-green-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-600">Subject</p>
                                            <p className="font-medium">{classInfo.subject_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <FaSchool className="w-5 h-5 text-purple-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-600">Section</p>
                                            <p className="font-medium">{classInfo.section_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <FaGraduationCap className="w-5 h-5 text-orange-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-600">Strand</p>
                                            <p className="font-medium">{classInfo.strand_name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <FaCalendarAlt className="w-5 h-5 text-red-600 mr-3" />
                                        <div>
                                            <p className="text-sm text-gray-600">Semester</p>
                                            <p className="font-medium">{classInfo.semester}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search and Filter */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, LRN, or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-gray-500" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Students</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-12">
                                    <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                                    <p className="text-gray-600">
                                        {searchTerm || filterStatus !== 'all' 
                                            ? 'No students match your search criteria.' 
                                            : 'No students are enrolled in this class yet.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-medium text-gray-900">
                                                Students ({filteredStudents.length})
                                            </h3>
                                            <div className="text-sm text-gray-600">
                                                Total Enrolled: {students.length}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Students Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LRN</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredStudents.map((student) => (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-10 w-10">
                                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                        <FaUser className="text-blue-600" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {student.name}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {student.firstname} {student.lastname}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <FaIdCard className="w-4 h-4 text-gray-400 mr-2" />
                                                                <span className="text-sm text-gray-900">
                                                                    {student.lrn || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <FaEnvelope className="w-4 h-4 text-gray-400 mr-2" />
                                                                <span className="text-sm text-gray-900">
                                                                    {student.email}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                student.student_type === 'new' ? 'bg-green-100 text-green-800' :
                                                                student.student_type === 'transferee' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {student.student_type || 'Regular'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                student.student_status === 'active' ? 'bg-green-100 text-green-800' :
                                                                student.student_status === 'inactive' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {student.student_status || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Academic Calendar Info */}
                        {academicCalendar && (
                            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium text-blue-900 mb-2 flex items-center">
                                    <FaCalendarAlt className="mr-2" />
                                    Academic Calendar
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-blue-700">
                                            <strong>Current Quarter:</strong> {academicCalendar.current_quarter || 'Not Set'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700">
                                            <strong>School Year:</strong> {academicCalendar.year_start}-{academicCalendar.year_end}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
