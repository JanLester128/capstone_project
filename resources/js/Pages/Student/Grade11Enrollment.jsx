import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { 
    FaUser, 
    FaGraduationCap, 
    FaUpload, 
    FaInfoCircle,
    FaCheckCircle,
    FaExclamationTriangle
} from 'react-icons/fa';

export default function Grade11Enrollment({ strands, activeSchoolYear, user }) {
    const { data, setData, post, processing, errors } = useForm({
        strand_id: '',
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
        
        const formData = new FormData();
        formData.append('strand_id', data.strand_id);
        
        selectedFiles.forEach((file, index) => {
            formData.append(`documents[${index}]`, file);
        });

        post(route('shs.grade11.enroll'), {
            data: formData,
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Grade 11 Enrollment" />
            
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-blue-600 rounded-full">
                                <FaGraduationCap className="text-white text-3xl" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Grade 11 Enrollment
                        </h1>
                        <p className="text-lg text-gray-600">
                            Senior High School Entry Point - School Year {activeSchoolYear?.year_start}-{activeSchoolYear?.year_end}
                        </p>
                    </div>

                    {/* Info Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <FaInfoCircle className="text-blue-500 text-xl mr-3 mt-1" />
                            <div>
                                <h3 className="font-semibold text-blue-800 mb-2">Grade 11 Enrollment Information</h3>
                                <ul className="text-blue-700 space-y-1">
                                    <li>• This is your entry point to Senior High School</li>
                                    <li>• Choose your preferred strand carefully</li>
                                    <li>• Your enrollment will be reviewed by the coordinator</li>
                                    <li>• Upon approval, you'll be eligible for Grade 12 auto-enrollment</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Enrollment Form */}
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FaUser className="mr-2" />
                                Student Information
                            </h2>
                        </div>

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

                            {/* Strand Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Strand <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.strand_id}
                                    onChange={(e) => setData('strand_id', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                                    Supporting Documents
                                </label>
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
                                        className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
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
                                            <li>• All information provided is accurate and complete</li>
                                            <li>• You understand the requirements of your chosen strand</li>
                                            <li>• You agree to follow all school policies and regulations</li>
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
                                    disabled={processing || !data.strand_id}
                                    className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                                        processing || !data.strand_id
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {processing ? 'Submitting...' : 'Submit Grade 11 Enrollment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
