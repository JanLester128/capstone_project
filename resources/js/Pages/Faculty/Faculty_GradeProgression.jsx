import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import FacultySidebar from '../layouts/Faculty_Sidebar';
import { 
    FaGraduationCap, 
    FaLevelUpAlt, 
    FaUsers, 
    FaSearch,
    FaFilter,
    FaChartLine,
    FaUserCheck,
    FaExclamationTriangle
} from 'react-icons/fa';

export default function FacultyGradeProgression({ students = [], schoolYear, user, error }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStrand, setFilterStrand] = useState('all');

    // Get unique strands from students
    const strands = [...new Set(students.map(student => student.strand_name))].filter(Boolean);

    // Filter students based on search and filters
    const filteredStudents = students.filter(student => {
        const matchesSearch = searchTerm === '' || 
            `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.lrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStrand = filterStrand === 'all' || student.strand_name === filterStrand;
        
        return matchesSearch && matchesStrand;
    });

    return (
        <>
            <Head title="Grade Progression - Faculty" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <FacultySidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Grade Progression</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Monitor Grade 11 students eligible for progression to Grade 12
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {filteredStudents.length} Students
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Grade 11 Eligible
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {error ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                                <FaExclamationTriangle className="mx-auto text-red-500 text-3xl mb-4" />
                                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                                <p className="text-red-700">{error}</p>
                            </div>
                        ) : (
                            <>
                                {/* School Year Info */}
                                {schoolYear && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                                        <div className="flex items-center gap-3">
                                            <FaChartLine className="text-blue-600 text-2xl" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-blue-900">
                                                    Academic Year {schoolYear.year_start}-{schoolYear.year_end}
                                                </h3>
                                                <p className="text-blue-700">
                                                    Current Semester: {schoolYear.semester} | Quarter: {schoolYear.current_quarter}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Filters */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Search */}
                                        <div className="flex-1">
                                            <div className="relative">
                                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, LRN, or email..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Strand Filter */}
                                        <div className="sm:w-48">
                                            <select
                                                value={filterStrand}
                                                onChange={(e) => setFilterStrand(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="all">All Strands</option>
                                                {strands.map(strand => (
                                                    <option key={strand} value={strand}>
                                                        {strand}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Students List */}
                                {filteredStudents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaUsers className="mx-auto text-gray-300 text-5xl mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
                                        <p className="text-gray-600">
                                            {searchTerm || filterStrand !== 'all' 
                                                ? 'No students match your current filters.' 
                                                : 'No Grade 11 students are eligible for progression at this time.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <FaLevelUpAlt className="text-blue-600" />
                                                Grade 11 Students Eligible for Progression
                                            </h3>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Student
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            LRN
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Strand
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Section
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredStudents.map((student, index) => (
                                                        <tr key={student.student_id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                        {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {student.firstname} {student.lastname}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {student.email}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {student.lrn || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    {student.strand_name}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {student.section_name || 'Not Assigned'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    <FaUserCheck className="mr-1" />
                                                                    Eligible
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Info Panel */}
                                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <div className="flex items-start gap-3">
                                        <FaGraduationCap className="text-blue-600 mt-1 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-blue-900 mb-2">Grade Progression Information</h4>
                                            <ul className="text-sm text-blue-800 space-y-1">
                                                <li>• Students listed here are currently in Grade 11 and eligible for progression to Grade 12</li>
                                                <li>• Progression is based on successful completion of Grade 11 requirements</li>
                                                <li>• Students must maintain good academic standing to be eligible</li>
                                                <li>• Contact the registrar's office for specific progression requirements</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
