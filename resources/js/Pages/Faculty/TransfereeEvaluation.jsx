import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import FacultySidebar from '../layouts/Faculty_Sidebar';
import { 
    FaUserGraduate, 
    FaSchool, 
    FaClipboardCheck,
    FaPlus,
    FaTrash,
    FaSave,
    FaEye,
    FaFileAlt,
    FaGraduationCap,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaSpinner
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function TransfereeEvaluation({ enrollment, strands, subjects, standardSubjects }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [evaluationStatus, setEvaluationStatus] = useState(enrollment.status || 'pending_evaluation');
    const [formData, setFormData] = useState({
        recommended_strand_id: enrollment.strand_id || '',
        recommended_grade_level: enrollment.intended_grade_level || 11,
        subject_credits: enrollment.transferee_subject_credits || []
    });

    // Enhanced subject evaluation with standard subjects matching
    const [subjectEvaluations, setSubjectEvaluations] = useState(
        standardSubjects?.map(subject => ({
            standard_subject_id: subject.id,
            standard_subject_name: subject.name,
            standard_units: subject.units,
            is_credited: false,
            previous_subject_name: '',
            equivalent_grade: '',
            remarks: ''
        })) || []
    );

    // State for subjects based on recommended strand
    const [availableSubjects, setAvailableSubjects] = useState([]);

    // Update available subjects when recommended strand changes
    useEffect(() => {
        if (formData.recommended_strand_id && subjects) {
            const strandSubjects = subjects.filter(subject => 
                subject.strand_id === parseInt(formData.recommended_strand_id) &&
                subject.year_level === formData.recommended_grade_level.toString()
            );
            setAvailableSubjects(strandSubjects);
            
            // Reset subject evaluations for new strand
            setSubjectEvaluations(strandSubjects.map(subject => ({
                standard_subject_id: subject.id,
                standard_subject_name: subject.name,
                standard_subject_code: subject.code,
                standard_units: subject.units || 1,
                is_credited: false,
                previous_subject_name: '',
                equivalent_grade: '',
                remarks: ''
            })));
        }
    }, [formData.recommended_strand_id, formData.recommended_grade_level, subjects]);

    const student = enrollment.student_personal_info?.user;
    const previousSchool = enrollment.transferee_previous_school;

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubjectEvaluationChange = (index, field, value) => {
        setSubjectEvaluations(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            
            // Auto-generate remarks based on grade input
            if (field === 'equivalent_grade' && value) {
                const grade = parseFloat(value);
                let remarks = '';
                
                if (grade >= 90) {
                    remarks = 'Excellent - Full credit granted';
                } else if (grade >= 85) {
                    remarks = 'Very Good - Full credit granted';
                } else if (grade >= 80) {
                    remarks = 'Good - Full credit granted';
                } else if (grade >= 75) {
                    remarks = 'Satisfactory - Full credit granted';
                } else if (grade >= 70) {
                    remarks = 'Passing - Full credit granted';
                } else if (grade < 70 && grade > 0) {
                    remarks = 'Below passing - Credit not granted';
                }
                
                updated[index] = { ...updated[index], remarks: remarks };
            }
            
            // Clear remarks if not credited
            if (field === 'is_credited' && !value) {
                updated[index] = { ...updated[index], remarks: 'Not credited', equivalent_grade: '' };
            }
            
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.recommended_strand_id) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a recommended strand.'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Submit Evaluation',
            text: 'Are you sure you want to submit this transferee evaluation?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Submit',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        setLoading(true);

        try {
            const response = await fetch(`/enrollment/${enrollment.id}/evaluate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    ...formData,
                    subject_evaluations: subjectEvaluations
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Evaluation Submitted',
                    text: 'The transferee evaluation has been completed successfully.',
                    timer: 2000
                });

                // Redirect back to enrollment management
                window.location.href = '/faculty/enrollment';
            } else {
                throw new Error(data.message || 'Failed to submit evaluation');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: error.message || 'Failed to submit evaluation. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Transferee Evaluation - Faculty" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <FacultySidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaClipboardCheck className="text-blue-600" />
                                    Transferee Evaluation
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Evaluate transferee student's academic records and recommend placement
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Student Information */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FaUserGraduate className="text-blue-600" />
                                        Student Information
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {student?.firstname?.charAt(0)}{student?.lastname?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {student?.firstname} {student?.lastname}
                                                </p>
                                                <p className="text-sm text-gray-600">{student?.email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <FaGraduationCap className="text-gray-400" />
                                                <span>Intended Grade: Grade {enrollment.intended_grade_level}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <FaCalendarAlt className="text-gray-400" />
                                                <span>Applied: {new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Previous School Information */}
                                {previousSchool && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <FaSchool className="text-green-600" />
                                            Previous School
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{previousSchool.school_name}</p>
                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                    <FaMapMarkerAlt className="text-gray-400" />
                                                    {previousSchool.school_address}
                                                </p>
                                            </div>
                                            
                                            {previousSchool.last_grade_level && (
                                                <p className="text-sm text-gray-600">
                                                    Last Grade Level: Grade {previousSchool.last_grade_level}
                                                </p>
                                            )}
                                            
                                            {previousSchool.last_school_year && (
                                                <p className="text-sm text-gray-600">
                                                    School Year: {previousSchool.last_school_year}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Evaluation Form */}
                            <div className="lg:col-span-2">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Recommendations */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Coordinator Recommendations
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Recommended Strand *
                                                </label>
                                                <select
                                                    value={formData.recommended_strand_id}
                                                    onChange={(e) => handleInputChange('recommended_strand_id', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Strand</option>
                                                    {strands.map(strand => (
                                                        <option key={strand.id} value={strand.id}>
                                                            {strand.name} ({strand.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Recommended Grade Level *
                                                </label>
                                                <select
                                                    value={formData.recommended_grade_level}
                                                    onChange={(e) => handleInputChange('recommended_grade_level', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                >
                                                    <option value={11}>Grade 11</option>
                                                    <option value={12}>Grade 12</option>
                                                </select>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Subject Credits Evaluation */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Subject Credits Evaluation
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Evaluate which subjects from the recommended strand the student should be credited for based on their previous academic records.
                                        </p>

                                        {/* Subject Evaluations Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Code</th>
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Units</th>
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Credit Status</th>
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Grade</th>
                                                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectEvaluations.map((evaluation, index) => (
                                                        <tr key={evaluation.standard_subject_id} className="hover:bg-gray-50">
                                                            <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                                                                {evaluation.standard_subject_name}
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                                                                {evaluation.standard_subject_code}
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                                                                {evaluation.standard_units}
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-3">
                                                                <select
                                                                    value={evaluation.is_credited ? 'credited' : 'not_credited'}
                                                                    onChange={(e) => handleSubjectEvaluationChange(index, 'is_credited', e.target.value === 'credited')}
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                >
                                                                    <option value="not_credited">Not Credited</option>
                                                                    <option value="credited">Credited</option>
                                                                </select>
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    value={evaluation.equivalent_grade}
                                                                    onChange={(e) => handleSubjectEvaluationChange(index, 'equivalent_grade', e.target.value)}
                                                                    placeholder="Grade"
                                                                    min="0"
                                                                    max="100"
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    disabled={!evaluation.is_credited}
                                                                />
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={evaluation.remarks}
                                                                    readOnly
                                                                    placeholder="Auto-generated based on grade"
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-700"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {subjectEvaluations.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <FaGraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                <p>No subjects available for the selected strand and grade level.</p>
                                                <p className="text-sm">Please select a recommended strand first.</p>
                                            </div>
                                        )}

                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => window.history.back()}
                                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <FaSpinner className="animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <FaSave />
                                                    Submit Evaluation
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
