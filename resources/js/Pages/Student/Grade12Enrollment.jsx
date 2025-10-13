import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { 
    FaUser, 
    FaGraduationCap, 
    FaUpload, 
    FaInfoCircle,
    FaCheckCircle,
    FaExclamationTriangle,
    FaBan,
    FaClock
} from 'react-icons/fa';

export default function Grade12Enrollment({ 
    strands, 
    activeSchoolYear, 
    user, 
    hasGrade11Enrollment, 
    canSelfEnroll, 
    grade11Enrollment,
    notice 
}) {
    const { data, setData, post, processing, errors } = useForm({
        strand_id: grade11Enrollment?.strand_id || '',
        previous_school: '',
        grade_11_completion_year: '',
        documents: []
    });

    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        setData('documents', files);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!canSelfEnroll) {
            return;
        }
        
        const formData = new FormData();
        formData.append('strand_id', data.strand_id);
        formData.append('previous_school', data.previous_school);
        formData.append('grade_11_completion_year', data.grade_11_completion_year);
        
        selectedFiles.forEach((file, index) => {
            formData.append(`documents[${index}]`, file);
        });

        post(route('shs.grade12.enroll'), {
            data: formData,
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Grade 12 Enrollment" />
            
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-purple-600 rounded-full">
                                <FaGraduationCap className="text-white text-3xl" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Grade 12 Enrollment
                        </h1>
                        <p className="text-lg text-gray-600">
                            Senior High School Final Year - School Year {activeSchoolYear?.year_start}-{activeSchoolYear?.year_end}
                        </p>
                    </div>

                    {/* Status Notice */}
                    <div className={`border rounded-lg p-4 mb-6 ${
                        hasGrade11Enrollment 
                            ? 'bg-orange-50 border-orange-200' 
                            : 'bg-blue-50 border-blue-200'
                    }`}>
                        <div className="flex items-start">
                            {hasGrade11Enrollment ? (
                                <FaClock className="text-orange-500 text-xl mr-3 mt-1" />
                            ) : (
                                <FaInfoCircle className="text-blue-500 text-xl mr-3 mt-1" />
                            )}
                            <div>
                                <h3 className={`font-semibold mb-2 ${
                                    hasGrade11Enrollment ? 'text-orange-800' : 'text-blue-800'
                                }`}>
                                    {hasGrade11Enrollment ? 'Auto-Enrollment Status' : 'Self-Enrollment Available'}
                                </h3>
                                <p className={`${
                                    hasGrade11Enrollment ? 'text-orange-700' : 'text-blue-700'
                                }`}>
                                    {notice}
                                </p>
                                
                                {hasGrade11Enrollment && grade11Enrollment && (
                                    <div className="mt-3 p-3 bg-white rounded border">
                                        <h4 className="font-medium text-gray-800 mb-2">Your Grade 11 Information:</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Strand:</strong> {grade11Enrollment.assignedStrand?.name || 'N/A'}</p>
                                            <p><strong>Section:</strong> {grade11Enrollment.assignedSection?.section_name || 'TBA'}</p>
                                            <p><strong>Status:</strong> {grade11Enrollment.status}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enrollment Form or Disabled State */}
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FaUser className="mr-2" />
                                Grade 12 Enrollment Form
                            </h2>
                        </div>

                        {!canSelfEnroll ? (
                            /* Disabled State for Students with Grade 11 Enrollment */
                            <div className="p-6">
                                <div className="text-center py-12">
                                    <FaBan className="mx-auto text-gray-400 text-6xl mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                        Self-Enrollment Not Available
                                    </h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        You will be automatically enrolled in Grade 12 by your coordinator 
                                        based on your Grade 11 enrollment. Please wait for the auto-enrollment process.
                                    </p>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                                        <p className="text-yellow-800 text-sm">
                                            <strong>Next Steps:</strong> Your coordinator will review your Grade 11 
                                            completion and automatically enroll you in Grade 12 when ready.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Self-Enrollment Form */
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Student Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={`${user.firstname} ${user.middlename || ''} ${user.lastname}`}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={user.email}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                        />
                                    </div>
                                </div>

                                {/* Previous School Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Previous School (Grade 11) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.previous_school}
                                            onChange={(e) => setData('previous_school', e.target.value)}
                                            placeholder="Enter your previous school name"
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                                errors.previous_school ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            required
                                        />
                                        {errors.previous_school && (
                                            <p className="mt-1 text-sm text-red-600">{errors.previous_school}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Grade 11 Completion Year <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.grade_11_completion_year}
                                            onChange={(e) => setData('grade_11_completion_year', e.target.value)}
                                            placeholder="e.g., 2024"
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                                errors.grade_11_completion_year ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            required
                                        />
                                        {errors.grade_11_completion_year && (
                                            <p className="mt-1 text-sm text-red-600">{errors.grade_11_completion_year}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Strand Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Preferred Strand <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.strand_id}
                                        onChange={(e) => setData('strand_id', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                            errors.strand_id ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        required
                                    >
                                        <option value="">Select a strand</option>
                                        {strands.map((strand) => (
                                            <option key={strand.id} value={strand.id}>
                                                {strand.name} ({strand.code})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.strand_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.strand_id}</p>
                                    )}
                                </div>

                                {/* Document Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Supporting Documents <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Please upload your Grade 11 completion certificate, transcript, or report card
                                    </p>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <FaUpload className="mx-auto text-gray-400 text-3xl mb-4" />
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="documents"
                                        />
                                        <label
                                            htmlFor="documents"
                                            className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium"
                                        >
                                            Click to upload documents
                                        </label>
                                        <p className="text-sm text-gray-500 mt-2">
                                            PDF, JPG, PNG files up to 5MB each
                                        </p>
                                    </div>
                                    
                                    {selectedFiles.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
                                            <ul className="space-y-1">
                                                {selectedFiles.map((file, index) => (
                                                    <li key={index} className="flex items-center text-sm text-gray-600">
                                                        <FaCheckCircle className="text-green-500 mr-2" />
                                                        {file.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {errors.documents && (
                                        <p className="mt-1 text-sm text-red-600">{errors.documents}</p>
                                    )}
                                </div>

                                {/* Terms and Conditions */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <FaExclamationTriangle className="text-yellow-500 text-xl mr-3 mt-1" />
                                        <div>
                                            <h4 className="font-semibold text-yellow-800 mb-2">Important Notice</h4>
                                            <p className="text-yellow-700 text-sm">
                                                By submitting this enrollment, you acknowledge that:
                                            </p>
                                            <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                                                <li>• You did not complete Grade 11 in this school system</li>
                                                <li>• All information and documents provided are accurate</li>
                                                <li>• Your previous Grade 11 completion will be verified</li>
                                                <li>• Your enrollment is subject to coordinator approval</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Display */}
                                {errors.enrollment && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-red-700">{errors.enrollment}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing || !data.strand_id || !data.previous_school}
                                        className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                                            processing || !data.strand_id || !data.previous_school
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-purple-600 hover:bg-purple-700'
                                        }`}
                                    >
                                        {processing ? 'Submitting...' : 'Submit Grade 12 Enrollment'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
