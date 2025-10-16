// ============================================================================
// Semester Progression Management Component
// ============================================================================
// Purpose: Manage student semester and grade progressions
// Features: 2nd semester enrollment, grade advancement, summer classes
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

// Components
import FacultySidebar from '../layouts/Faculty_Sidebar';

// Utils
import { AuthManager } from '../../auth';

// Icons
import { 
    FaUsers, FaUserGraduate, FaCalendarAlt, FaSun,
    FaArrowRight, FaCheck, FaTimes, FaSpinner,
    FaGraduationCap, FaBookOpen, FaClipboardList
} from 'react-icons/fa';

export default function SemesterProgression() {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('semester'); // semester, grade, summer
    
    // Data State
    const [semesterEligible, setSemesterEligible] = useState([]);
    const [gradeEligible, setGradeEligible] = useState([]);
    const [summerStudents, setSummerStudents] = useState([]);
    const [sections, setSections] = useState([]);
    const [currentSchoolYear, setCurrentSchoolYear] = useState(null);

    // ========================================================================
    // INITIALIZATION & EFFECTS
    // ========================================================================
    
    useEffect(() => {
        loadEligibleStudents();
        loadSections();
    }, []);

    // ========================================================================
    // API CALLS
    // ========================================================================
    
    const loadEligibleStudents = async () => {
        setLoading(true);
        try {
            const token = AuthManager.getToken();
            const response = await fetch('/coordinator/progression/eligible', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            const data = await response.json();

            if (response.ok) {
                setSemesterEligible(data.semester_progression || []);
                setGradeEligible(data.grade_progression || []);
                setCurrentSchoolYear(data.current_school_year);
            } else {
                throw new Error(data.message || 'Failed to load eligible students');
            }
        } catch (error) {
            console.error('Error loading eligible students:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to load eligible students'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadSummerStudents = async () => {
        setLoading(true);
        try {
            const token = AuthManager.getToken();
            const response = await fetch('/coordinator/summer-class/students', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            const data = await response.json();

            if (response.ok) {
                setSummerStudents(data.students || []);
            } else {
                throw new Error(data.message || 'Failed to load summer students');
            }
        } catch (error) {
            console.error('Error loading summer students:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to load summer students'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadSections = async () => {
        try {
            const token = AuthManager.getToken();
            const response = await fetch('/coordinator/sections', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });

            const data = await response.json();
            if (response.ok) {
                setSections(data.sections || []);
            }
        } catch (error) {
            console.error('Error loading sections:', error);
        }
    };

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    
    const handleEnrollProgression = async (enrollmentId, progressionType) => {
        const student = progressionType === 'semester' 
            ? semesterEligible.find(s => s.id === enrollmentId)
            : gradeEligible.find(s => s.id === enrollmentId);

        if (!student) return;

        // Get section assignment
        const { value: formData } = await Swal.fire({
            title: `Enroll for ${progressionType === 'semester' ? '2nd Semester' : 'Next Grade'}`,
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-2">Student Information</h4>
                        <p><strong>Name:</strong> ${student.student_name}</p>
                        <p><strong>Current:</strong> Grade ${student.current_grade} - Semester ${student.current_semester}</p>
                        <p><strong>Strand:</strong> ${student.strand}</p>
                        <p><strong>Current Section:</strong> ${student.section}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-green-800 mb-2">Progression Details</h4>
                        <p><strong>Next:</strong> Grade ${student.next_grade} - Semester ${student.next_semester}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Assign Section: <span class="text-red-500">*</span>
                        </label>
                        <select id="section-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Section</option>
                            ${sections.filter(section => 
                                section.year_level === student.next_grade && 
                                section.strand?.name === student.strand
                            ).map(section => 
                                `<option value="${section.id}">
                                    ${section.section_name} - ${section.strand?.name || 'No Strand'} (Grade ${section.year_level})
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Coordinator Notes (Optional)
                        </label>
                        <textarea id="notes-input" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="Add any notes about this progression..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Enroll Student',
            cancelButtonText: 'Cancel',
            width: '600px',
            preConfirm: () => {
                const sectionId = document.getElementById('section-select').value;
                const notes = document.getElementById('notes-input').value;
                
                if (!sectionId) {
                    Swal.showValidationMessage('Please select a section');
                    return false;
                }
                
                return { sectionId, notes };
            }
        });

        if (formData) {
            setLoading(true);
            try {
                const token = AuthManager.getToken();
                const response = await fetch('/coordinator/progression/enroll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                    body: JSON.stringify({
                        enrollment_id: enrollmentId,
                        assigned_section_id: formData.sectionId,
                        progression_type: progressionType
                        // coordinator_notes removed - no longer needed
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: `Student successfully enrolled for ${progressionType} progression`,
                        timer: 3000
                    });
                    
                    // Refresh data
                    loadEligibleStudents();
                } else {
                    throw new Error(data.message || 'Failed to enroll student');
                }
            } catch (error) {
                console.error('Error enrolling student:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to enroll student for progression'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'summer' && summerStudents.length === 0) {
            loadSummerStudents();
        }
    };

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================
    
    const renderStudentCard = (student, type) => (
        <div key={student.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{student.student_name}</h3>
                    <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                </div>
                <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.strand}
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-sm text-gray-500">Current</p>
                    <p className="font-medium">Grade {student.current_grade} - Sem {student.current_semester}</p>
                    <p className="text-sm text-gray-600">{student.section}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Next</p>
                    <p className="font-medium text-green-600">Grade {student.next_grade} - Sem {student.next_semester}</p>
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-500">
                    <FaArrowRight className="mr-2" />
                    {type === 'semester' ? '2nd Semester' : 'Grade Advancement'}
                </div>
                <button
                    onClick={() => handleEnrollProgression(student.id, student.progression_type)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? <FaSpinner className="animate-spin" /> : 'Enroll'}
                </button>
            </div>
        </div>
    );

    // ========================================================================
    // COMPONENT RENDER
    // ========================================================================
    
    return (
        <>
            <Head title="Semester Progression - Faculty" />
            
            <div className="min-h-screen bg-gray-50 flex">
                <FacultySidebar onToggle={setSidebarCollapsed} />
                
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                    {/* Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200">
                        <div className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Semester Progression</h1>
                                    <p className="text-gray-600 mt-1">Manage student semester and grade progressions</p>
                                </div>
                                {currentSchoolYear && (
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">School Year</p>
                                        <p className="font-semibold text-gray-900">
                                            {currentSchoolYear.year_start} - {currentSchoolYear.year_end}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="bg-white border-b border-gray-200">
                        <div className="px-6">
                            <nav className="flex space-x-8">
                                <button
                                    onClick={() => handleTabChange('semester')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'semester'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <FaCalendarAlt className="mr-2" />
                                        2nd Semester ({semesterEligible.length})
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleTabChange('grade')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'grade'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <FaGraduationCap className="mr-2" />
                                        Grade Advancement ({gradeEligible.length})
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleTabChange('summer')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'summer'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <FaSun className="mr-2" />
                                        Summer Classes ({summerStudents.length})
                                    </div>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading && (
                            <div className="flex justify-center items-center py-12">
                                <FaSpinner className="animate-spin text-3xl text-blue-600" />
                                <span className="ml-3 text-lg text-gray-600">Loading...</span>
                            </div>
                        )}

                        {/* Semester Progression Tab */}
                        {activeTab === 'semester' && !loading && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Students Eligible for 2nd Semester</h2>
                                    <p className="text-gray-600">Students who completed 1st semester and can progress to 2nd semester</p>
                                </div>
                                
                                {semesterEligible.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                                        <p className="text-gray-600">No students are currently eligible for 2nd semester progression.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {semesterEligible.map(student => renderStudentCard(student, 'semester'))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grade Progression Tab */}
                        {activeTab === 'grade' && !loading && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Students Eligible for Grade Advancement</h2>
                                    <p className="text-gray-600">Grade 11 students who completed 2nd semester and can advance to Grade 12</p>
                                </div>
                                
                                {gradeEligible.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaUserGraduate className="mx-auto text-4xl text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                                        <p className="text-gray-600">No students are currently eligible for grade advancement.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {gradeEligible.map(student => renderStudentCard(student, 'grade'))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summer Classes Tab */}
                        {activeTab === 'summer' && !loading && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Students Needing Summer Classes</h2>
                                    <p className="text-gray-600">Students with failed subjects who need remedial classes</p>
                                </div>
                                
                                {summerStudents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaSun className="mx-auto text-4xl text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                                        <p className="text-gray-600">No students currently need summer classes.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {summerStudents.map(student => (
                                            <div key={student.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">{student.student_name}</h3>
                                                        <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                                                    </div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {student.failed_count} Failed
                                                    </span>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <p className="text-sm text-gray-500 mb-2">Failed Subjects:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {student.failed_subjects?.map((subject, index) => (
                                                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                {subject}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => {/* Handle summer enrollment */}}
                                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Enroll for Summer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
