import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import FacultySidebar from '../layouts/Faculty_Sidebar';
import { 
    FaUserGraduate, 
    FaClipboardCheck,
    FaEye,
    FaEdit,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaSearch,
    FaFilter,
    FaFileAlt,
    FaSchool
} from 'react-icons/fa';

export default function TransfereeManagement({ transfereeEnrollments, stats }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredEnrollments = transfereeEnrollments.filter(enrollment => {
        const matchesSearch = searchTerm === '' || 
            enrollment.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enrollment.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enrollment.previous_school?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusInfo = (status) => {
        const statusMap = {
            'pending_evaluation': {
                color: 'bg-yellow-100 text-yellow-800',
                icon: FaClock,
                text: 'Pending Evaluation',
                description: 'Awaiting coordinator evaluation'
            },
            'evaluated': {
                color: 'bg-blue-100 text-blue-800',
                icon: FaClipboardCheck,
                text: 'Evaluated',
                description: 'Evaluation completed, pending registrar approval'
            },
            'approved': {
                color: 'bg-green-100 text-green-800',
                icon: FaCheckCircle,
                text: 'Approved',
                description: 'Enrollment approved by registrar'
            },
            'rejected': {
                color: 'bg-red-100 text-red-800',
                icon: FaTimesCircle,
                text: 'Rejected',
                description: 'Enrollment rejected'
            },
            'returned': {
                color: 'bg-orange-100 text-orange-800',
                icon: FaExclamationTriangle,
                text: 'Returned for Revision',
                description: 'Registrar returned for corrections'
            }
        };
        
        return statusMap[status] || statusMap['pending_evaluation'];
    };

    return (
        <>
            <Head title="Transferee Management - Faculty" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <FacultySidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaUserGraduate className="text-blue-600" />
                                    Transferee Management
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Evaluate and manage transferee student applications
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <FaClock className="text-yellow-500 text-2xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Pending Evaluation</p>
                                        <p className="text-2xl font-bold text-yellow-600">
                                            {stats?.pending_evaluation || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <FaClipboardCheck className="text-blue-500 text-2xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Evaluated</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {stats?.evaluated || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <FaCheckCircle className="text-green-500 text-2xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Approved</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {stats?.approved || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="text-orange-500 text-2xl mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-600">Need Revision</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            {stats?.returned || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by student name, email, or previous school..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="sm:w-48">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending_evaluation">Pending Evaluation</option>
                                        <option value="evaluated">Evaluated</option>
                                        <option value="returned">Returned for Revision</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Transferee Applications List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Transferee Applications ({filteredEnrollments.length})
                                </h3>
                            </div>

                            {filteredEnrollments.length === 0 ? (
                                <div className="text-center py-12">
                                    <FaUserGraduate className="mx-auto text-gray-300 text-5xl mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Found</h3>
                                    <p className="text-gray-600">
                                        {searchTerm || statusFilter !== 'all' 
                                            ? 'No applications match your current filters.' 
                                            : 'No transferee applications have been submitted yet.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredEnrollments.map((enrollment) => {
                                        const statusInfo = getStatusInfo(enrollment.status);
                                        const StatusIcon = statusInfo.icon;

                                        return (
                                            <div key={enrollment.id} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {enrollment.student_name?.charAt(0).toUpperCase() || 'T'}
                                                        </div>
                                                        
                                                        <div className="flex-1">
                                                            <h4 className="text-lg font-semibold text-gray-900">
                                                                {enrollment.student_name || 'Unknown Student'}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">{enrollment.student_email}</p>
                                                            
                                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <FaSchool className="text-gray-400" />
                                                                    {enrollment.previous_school || 'No previous school info'}
                                                                </span>
                                                                <span>Grade {enrollment.intended_grade_level}</span>
                                                                <span>{enrollment.strand_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                                <StatusIcon className="mr-1" />
                                                                {statusInfo.text}
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {statusInfo.description}
                                                            </p>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Link
                                                                href={`/enrollment/${enrollment.id}/evaluate`}
                                                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                                            >
                                                                <FaEye className="mr-1" />
                                                                View
                                                            </Link>
                                                            
                                                            {(enrollment.status === 'pending_evaluation' || enrollment.status === 'returned') && (
                                                                <Link
                                                                    href={`/enrollment/${enrollment.id}/evaluate`}
                                                                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                                >
                                                                    <FaEdit className="mr-1" />
                                                                    Evaluate
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* evaluation_notes removed - no longer available */}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Help Information */}
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <FaFileAlt className="text-blue-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-2">Transferee Evaluation Process</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• <strong>Pending Evaluation:</strong> New applications awaiting your review</li>
                                        <li>• <strong>Evaluate:</strong> Review student records, credit subjects, and recommend placement</li>
                                        <li>• <strong>Submit to Registrar:</strong> Forward completed evaluations for final approval</li>
                                        <li>• <strong>Returned for Revision:</strong> Registrar has requested changes to your evaluation</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
