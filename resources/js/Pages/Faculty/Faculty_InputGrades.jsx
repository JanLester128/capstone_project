import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { 
  FaGraduationCap, 
  FaArrowLeft,
  FaUser,
  FaBook,
  FaClock,
  FaMapMarkerAlt,
  FaUsers,
  FaSave,
  FaCalculator
} from "react-icons/fa";

export default function FacultyInputGrades({ class: classData, student, existingGrades = {}, activeSchoolYear, displaySchoolYear, auth }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [gradeData, setGradeData] = useState({
    first_quarter: '',
    second_quarter: '',
    third_quarter: '',
    fourth_quarter: '',
    semester_grade: 0,
    semester: '1st',
    status: 'ongoing',
    remarks: ''
  });

  // Load existing grades when semester changes
  useEffect(() => {
    const currentSemesterGrades = existingGrades[gradeData.semester];
    if (currentSemesterGrades) {
      setGradeData(prev => ({
        ...prev,
        id: currentSemesterGrades.id || null,                    // ✅ ADDED: Grade ID
        first_quarter: currentSemesterGrades.first_quarter || '',
        second_quarter: currentSemesterGrades.second_quarter || '',
        third_quarter: currentSemesterGrades.third_quarter || '',
        fourth_quarter: currentSemesterGrades.fourth_quarter || '',
        semester_grade: currentSemesterGrades.semester_grade || 0,
        remarks: currentSemesterGrades.remarks || '',
        approval_status: currentSemesterGrades.approval_status || null,     // ✅ ADDED: Approval status
        is_locked: currentSemesterGrades.is_locked || false,                // ✅ ADDED: Lock status
        lock_reason: currentSemesterGrades.lock_reason || null,             // ✅ ADDED: Lock reason
        approval_notes: currentSemesterGrades.approval_notes || null,       // ✅ ADDED: Registrar notes
        submitted_for_approval_at: currentSemesterGrades.submitted_for_approval_at || null, // ✅ ADDED: Submission date
        approved_at: currentSemesterGrades.approved_at || null              // ✅ ADDED: Approval date
      }));
    } else {
      // Clear form for new semester
      setGradeData(prev => ({
        ...prev,
        id: null,
        first_quarter: '',
        second_quarter: '',
        third_quarter: '',
        fourth_quarter: '',
        semester_grade: 0,
        remarks: '',
        approval_status: null,
        is_locked: false,
        lock_reason: null,
        approval_notes: null,
        submitted_for_approval_at: null,
        approved_at: null
      }));
    }
  }, [gradeData.semester, existingGrades]);

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGradeChange = (period, value) => {
    const newGradeData = { ...gradeData, [period]: value };
    
    // Calculate semester grade (average of 4 quarters)
    const q1 = parseFloat(newGradeData.first_quarter) || 0;
    const q2 = parseFloat(newGradeData.second_quarter) || 0;
    const q3 = parseFloat(newGradeData.third_quarter) || 0;
    const q4 = parseFloat(newGradeData.fourth_quarter) || 0;
    
    const quarters = [q1, q2, q3, q4].filter(grade => grade > 0);
    const semesterGrade = quarters.length > 0 ? quarters.reduce((sum, grade) => sum + grade, 0) / quarters.length : 0;
    newGradeData.semester_grade = semesterGrade;
    
    setGradeData(newGradeData);
  };

  const handleSaveGrades = async () => {
    // Count how many quarters have grades
    const quartersWithGrades = [
      gradeData.first_quarter,
      gradeData.second_quarter,
      gradeData.third_quarter,
      gradeData.fourth_quarter
    ].filter(grade => grade && parseFloat(grade) > 0).length;

    if (quartersWithGrades === 0) {
      alert('Please enter at least one quarter grade before saving.');
      return;
    }

    // Show confirmation with current progress
    const progressMessage = `Save ${quartersWithGrades} quarter grade(s) for ${gradeData.semester} semester?\n\n` +
      `Student: ${student?.firstname} ${student?.lastname}\n` +
      `Subject: ${classData?.subject?.name}\n` +
      `Current Semester Grade: ${gradeData.semester_grade.toFixed(1)} (${getGradeLetter(gradeData.semester_grade)})`;

    if (confirm(progressMessage)) {
      try {
        // Prepare data for API
        const saveData = {
          first_quarter: gradeData.first_quarter || null,
          second_quarter: gradeData.second_quarter || null,
          third_quarter: gradeData.third_quarter || null,
          fourth_quarter: gradeData.fourth_quarter || null,
          semester: gradeData.semester,
          remarks: gradeData.remarks || null
        };

        // Call the API to save grades
        const response = await fetch(`/faculty/classes/${classData.id}/student/${student.id}/grades`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify(saveData)
        });

        const result = await response.json();

        if (result.success) {
          alert(`✅ Grades saved successfully!\n\n` +
            `Quarters saved: ${result.data.quarters_saved}\n` +
            `Semester Grade: ${result.data.semester_grade?.toFixed(1) || 'N/A'}\n` +
            `Status: ${result.data.is_passing ? 'PASSED' : 'ONGOING'}\n\n` +
            `You can continue adding more quarter grades later.`);
        } else {
          alert(`❌ Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error saving grades:', error);
        alert('❌ Failed to save grades. Please check your connection and try again.');
      }
    }
  };

  const getGradeLetter = (score) => {
    if (score === 0 || !score) return 'NG'; // No Grade
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+'; // Passing grade in Philippine SHS
    if (score >= 70) return 'C';
    if (score >= 65) return 'D';
    return 'F';
  };

  const getGradeColor = (score) => {
    if (score === 0 || !score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600'; // Passing grade
    if (score >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isPassing = (score) => {
    return score >= 75; // Philippine SHS passing grade
  };

  // ✅ NEW: Submit grades for registrar approval
  const handleSubmitForApproval = async () => {
    if (gradeData.semester_grade === 0) {
      alert('Please save grades first before submitting for approval.');
      return;
    }

    const confirmMessage = `Submit ${gradeData.semester} semester grade for registrar approval?\n\n` +
      `Student: ${student?.firstname} ${student?.lastname}\n` +
      `Subject: ${classData?.subject?.name}\n` +
      `Semester Grade: ${gradeData.semester_grade.toFixed(1)} (${getGradeLetter(gradeData.semester_grade)})\n\n` +
      `Once submitted, you cannot modify this grade until registrar approval.`;

    if (confirm(confirmMessage)) {
      try {
        // First, save the current grades
        await handleSaveGrades();
        
        // Then submit for approval (assuming we have a grade ID from existing grades)
        const response = await fetch(`/faculty/students/${student.id}/submit-grades-for-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        });

        const result = await response.json();

        if (result.success) {
          alert(`✅ Grades submitted for approval!\n\n` +
            `${result.submitted_count} grade(s) submitted to registrar.\n` +
            `You will be notified once the registrar reviews your submission.`);
          
          // Optionally redirect back to class students page
          window.history.back();
        } else {
          alert(`❌ Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error submitting grades for approval:', error);
        alert('❌ Failed to submit grades for approval. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <FacultySidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Input Grades
          </h1>
          <p className="text-gray-600">Enter and manage student grades for this subject</p>
        </div>

        {/* Class and Student Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Class Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Class Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FaBook className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-sm text-gray-500">Subject</span>
                  <div className="font-medium">{classData?.subject?.name || 'Unknown Subject'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FaClock className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-sm text-gray-500">Schedule</span>
                  <div className="font-medium">{classData?.day_of_week} {classData?.start_time} - {classData?.end_time}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FaUsers className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-sm text-gray-500">Section</span>
                  <div className="font-medium">{classData?.section?.section_name || 'No Section'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-sm text-gray-500">Room</span>
                  <div className="font-medium">{classData?.room || 'No Room Assigned'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Student Information</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {student?.firstname?.charAt(0) || '?'}{student?.lastname?.charAt(0) || ''}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-800">
                  {student?.firstname || 'Unknown'} {student?.lastname || 'Student'}
                </h4>
                <p className="text-gray-600">{student?.email || 'No email'}</p>
                <p className="text-sm text-gray-500">ID: {student?.student_id || 'Not assigned'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Input Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Philippine SHS Quarterly Grades</h3>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Semester:</label>
                <select
                  value={gradeData.semester}
                  onChange={(e) => setGradeData({...gradeData, semester: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="1st">1st Semester (Aug-Dec)</option>
                  <option value="2nd">2nd Semester (Jan-May)</option>
                </select>
              </div>
            </div>
            
            {/* Grading System Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Philippine SHS Grading System</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    • Each semester has 4 quarters • You can input grades progressively (1st quarter, then 2nd, etc.)
                  </p>
                  <p className="text-sm text-blue-700">
                    • Semester Grade = Average of 4 quarters • Passing Grade = 75 or higher
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* ✅ NEW: Grade Lock Status Display */}
          {gradeData.is_locked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-red-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">🔒 Grade Locked</h4>
                  <p className="text-sm text-red-700 mb-2">{gradeData.lock_reason}</p>
                  {gradeData.approval_status === 'approved' && (
                    <p className="text-sm text-red-700">
                      <strong>To request changes:</strong> Submit a written request to the registrar with proper justification for the grade modification.
                    </p>
                  )}
                  {gradeData.approval_notes && (
                    <div className="mt-2 p-2 bg-white rounded border border-red-200">
                      <p className="text-sm font-medium text-gray-700">Registrar Notes:</p>
                      <p className="text-sm text-gray-600">{gradeData.approval_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1st Quarter {gradeData.is_locked && <span className="text-red-500">🔒</span>}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gradeData.first_quarter}
                onChange={(e) => handleGradeChange('first_quarter', e.target.value)}
                disabled={gradeData.is_locked}
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${
                  gradeData.is_locked 
                    ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="0-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2nd Quarter {gradeData.is_locked && <span className="text-red-500">🔒</span>}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gradeData.second_quarter}
                onChange={(e) => handleGradeChange('second_quarter', e.target.value)}
                disabled={gradeData.is_locked}
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${
                  gradeData.is_locked 
                    ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="0-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3rd Quarter {gradeData.is_locked && <span className="text-red-500">🔒</span>}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gradeData.third_quarter}
                onChange={(e) => handleGradeChange('third_quarter', e.target.value)}
                disabled={gradeData.is_locked}
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${
                  gradeData.is_locked 
                    ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="0-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4th Quarter {gradeData.is_locked && <span className="text-red-500">🔒</span>}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gradeData.fourth_quarter}
                onChange={(e) => handleGradeChange('fourth_quarter', e.target.value)}
                disabled={gradeData.is_locked}
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${
                  gradeData.is_locked 
                    ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="0-100"
              />
            </div>
          </div>

          {/* Remarks Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher Remarks (Optional) {gradeData.is_locked && <span className="text-red-500">🔒</span>}
            </label>
            <textarea
              value={gradeData.remarks}
              onChange={(e) => setGradeData({...gradeData, remarks: e.target.value})}
              disabled={gradeData.is_locked}
              className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${
                gradeData.is_locked 
                  ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
              }`}
              rows="3"
              placeholder={gradeData.is_locked ? "Grade is locked - remarks cannot be edited" : "Enter any remarks or comments about the student's performance..."}
            />
          </div>

          {/* Grade Summary */}
          {(gradeData.first_quarter || gradeData.second_quarter || gradeData.third_quarter || gradeData.fourth_quarter) && (
            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <FaCalculator className="w-5 h-5" />
                Grade Summary - {gradeData.semester} Semester
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{gradeData.first_quarter || '—'}</div>
                  <div className="text-sm text-gray-600">1st Quarter</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{gradeData.second_quarter || '—'}</div>
                  <div className="text-sm text-gray-600">2nd Quarter</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{gradeData.third_quarter || '—'}</div>
                  <div className="text-sm text-gray-600">3rd Quarter</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{gradeData.fourth_quarter || '—'}</div>
                  <div className="text-sm text-gray-600">4th Quarter</div>
                </div>
                <div className="text-center border-l-2 border-purple-200 pl-4">
                  <div className={`text-3xl font-bold ${getGradeColor(gradeData.semester_grade)}`}>
                    {gradeData.semester_grade.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Semester Grade ({getGradeLetter(gradeData.semester_grade)})
                  </div>
                  <div className={`text-xs mt-1 font-medium ${isPassing(gradeData.semester_grade) ? 'text-green-600' : 'text-red-600'}`}>
                    {isPassing(gradeData.semester_grade) ? 'PASSED' : 'FAILED'}
                  </div>
                </div>
              </div>
              
              {gradeData.remarks && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                  <div className="text-sm font-medium text-gray-700 mb-1">Teacher Remarks:</div>
                  <div className="text-sm text-gray-600">{gradeData.remarks}</div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {gradeData.is_locked ? (
                <span className="text-red-600">
                  🔒 <strong>Grade Locked:</strong> {gradeData.lock_reason}
                </span>
              ) : (
                <span>
                  💡 <strong>Tip:</strong> You can save partial grades (e.g., just 1st quarter) and add more quarters later.
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {/* Save Button - Disabled when locked */}
              <button
                onClick={handleSaveGrades}
                disabled={gradeData.is_locked}
                className={`px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  gradeData.is_locked
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                }`}
              >
                <FaSave className="w-4 h-4" />
                {gradeData.is_locked ? 'Grade Locked' : `Save Grades (${gradeData.semester} Semester)`}
              </button>
              
              {/* Submit for Approval Button - Only show if not locked and has grades */}
              {!gradeData.is_locked && gradeData.semester_grade > 0 && (
                <button
                  onClick={handleSubmitForApproval}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Submit for Approval
                </button>
              )}

              {/* Status Display for Locked Grades */}
              {gradeData.is_locked && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg border border-red-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">
                    {gradeData.approval_status === 'pending_approval' ? 'Pending Approval' : 
                     gradeData.approval_status === 'approved' ? 'Approved' : 'Locked'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
