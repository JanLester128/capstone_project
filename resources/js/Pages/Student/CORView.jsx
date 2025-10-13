import React from 'react';
import { Head } from '@inertiajs/react';
import { 
    FaPrint, 
    FaDownload, 
    FaGraduationCap, 
    FaCalendarAlt,
    FaUser,
    FaSchool,
    FaIdCard,
    FaFileAlt
} from 'react-icons/fa';

export default function CORView({ enrollment, schedules, student, strand, section, school_year, generated_date }) {
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        window.open(`/cor/${student.id}/pdf`, '_blank');
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <>
            <Head title={`Certificate of Registration - ${student.firstname} ${student.lastname}`} />
            
            <div className="min-h-screen bg-gray-50">
                {/* Print Controls - Hidden when printing */}
                <div className="no-print bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Certificate of Registration</h1>
                            <p className="text-sm text-gray-600">
                                {student.firstname} {student.lastname} - {student.grade_level}
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FaPrint className="mr-2" />
                                Print COR
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FaDownload className="mr-2" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* COR Content */}
                <div className="max-w-4xl mx-auto py-8 px-6">
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
                        {/* Header */}
                        <div className="text-center py-8 px-6 border-b-2 border-gray-800">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-blue-600 rounded-full">
                                    <FaGraduationCap className="text-white text-3xl" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">SENIOR HIGH SCHOOL</h1>
                            <p className="text-gray-600 mb-4">Your School Address Here</p>
                            <h2 className="text-xl font-bold text-gray-900 underline mb-2">
                                CERTIFICATE OF REGISTRATION
                            </h2>
                            <p className="text-gray-700">
                                School Year {school_year?.year_start}-{school_year?.year_end}
                            </p>
                        </div>

                        {/* Student Information */}
                        <div className="px-8 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <FaUser className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Student Name</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {student.lastname}, {student.firstname} {student.middlename || ''}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center">
                                        <FaIdCard className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">LRN</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {student.lrn || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <FaGraduationCap className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {student.grade_level}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <FaSchool className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Strand</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {strand?.name || 'N/A'} ({strand?.code || 'N/A'})
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <FaFileAlt className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Section</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {section?.section_name || 'TBA'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <FaCalendarAlt className="text-gray-400 mr-3" />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {generated_date}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subjects Section */}
                            <div className="space-y-8">
                                {/* First Semester */}
                                {schedules.first_semester && schedules.first_semester.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-center bg-gray-100 py-3 mb-4 rounded">
                                            FIRST SEMESTER
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full border border-gray-300">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Subject Code
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Subject Name
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Units
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Teacher
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Schedule
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                    {schedules.first_semester.map((subject, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                                                                {subject.subject_code}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.subject_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                                                                {subject.units || 1}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.teacher}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.schedules.map((schedule, schedIndex) => (
                                                                    <div key={schedIndex} className="mb-1">
                                                                        {schedule.day} {schedule.time}
                                                                        {schedule.room && ` - ${schedule.room}`}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Second Semester */}
                                {schedules.second_semester && schedules.second_semester.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-center bg-gray-100 py-3 mb-4 rounded">
                                            SECOND SEMESTER
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full border border-gray-300">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Subject Code
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Subject Name
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Units
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Teacher
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border border-gray-300">
                                                            Schedule
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                    {schedules.second_semester.map((subject, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                                                                {subject.subject_code}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.subject_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                                                                {subject.units || 1}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.teacher}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                                                                {subject.schedules.map((schedule, schedIndex) => (
                                                                    <div key={schedIndex} className="mb-1">
                                                                        {schedule.day} {schedule.time}
                                                                        {schedule.room && ` - ${schedule.room}`}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* No Subjects Message */}
                                {(!schedules.first_semester || schedules.first_semester.length === 0) && 
                                 (!schedules.second_semester || schedules.second_semester.length === 0) && (
                                    <div className="text-center py-8 text-gray-600 italic">
                                        Subjects will be assigned upon section placement by the registrar.
                                    </div>
                                )}
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-8 mt-12 mb-8">
                                <div className="text-center">
                                    <div className="border-b border-gray-800 w-48 mx-auto mb-2 mt-8"></div>
                                    <p className="text-sm font-medium text-gray-700">Student Signature</p>
                                </div>
                                <div className="text-center">
                                    <div className="border-b border-gray-800 w-48 mx-auto mb-2 mt-8"></div>
                                    <p className="text-sm font-medium text-gray-700">Registrar Signature</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center text-sm text-gray-600 border-t border-gray-200 pt-4">
                                <p className="mb-1">
                                    This Certificate of Registration is issued on {formatDate(new Date())}
                                </p>
                                <p className="mb-1">
                                    Document ID: COR-{enrollment.id}-{new Date().getFullYear()}
                                </p>
                                {enrollment.enrollment_method === 'auto' && (
                                    <p className="italic text-blue-600">
                                        Auto-enrolled based on Grade 11 completion
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    
                    .print\\:rounded-none {
                        border-radius: 0 !important;
                    }
                }
            `}</style>
        </>
    );
}
