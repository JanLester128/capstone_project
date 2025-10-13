import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaSave,
  FaBookOpen,
  FaGraduationCap,
  FaCalendarAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function TransfereeCreditModal({ 
  isOpen, 
  onClose, 
  student, 
  strands = [], 
  onSuccess 
}) {
  const [subjects, setSubjects] = useState([]);
  const [subjectsByStrand, setSubjectsByStrand] = useState({});
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load subjects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSubjects();
      loadExistingCredits();
    }
  }, [isOpen]);

  const loadSubjects = async () => {
    try {
      const response = await fetch('/coordinator/subjects-for-crediting');
      const data = await response.json();
      
      if (data.success) {
        setSubjects(data.subjects);
        setSubjectsByStrand(data.subjectsByStrand);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadExistingCredits = async () => {
    try {
      const response = await fetch(`/coordinator/student/${student.id}/credited-subjects`);
      const data = await response.json();
      
      if (data.success && data.credits.length > 0) {
        const existingCredits = data.credits.map(credit => ({
          subject_id: credit.subject_id,
          grade: credit.grade,
          semester: credit.semester,
          school_year: credit.school_year,
          remarks: credit.remarks || ''
        }));
        setCredits(existingCredits);
      } else {
        // Initialize with one empty credit
        addCredit();
      }
    } catch (error) {
      console.error('Error loading existing credits:', error);
      addCredit();
    }
  };

  const addCredit = () => {
    setCredits([...credits, {
      subject_id: '',
      grade: '',
      semester: '1st Semester',
      school_year: '2023-2024',
      remarks: ''
    }]);
  };

  const removeCredit = (index) => {
    setCredits(credits.filter((_, i) => i !== index));
  };

  const updateCredit = (index, field, value) => {
    const updatedCredits = [...credits];
    updatedCredits[index][field] = value;
    setCredits(updatedCredits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate credits
    const validCredits = credits.filter(credit => 
      credit.subject_id && credit.grade && credit.semester && credit.school_year
    );

    if (validCredits.length === 0) {
      Swal.fire({
        title: 'No Valid Credits',
        text: 'Please add at least one complete credit entry.',
        icon: 'warning',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    setSubmitting(true);

    try {
      router.post(`/coordinator/student/${student.id}/credit-subjects`, {
        credits: validCredits
      }, {
        onSuccess: () => {
          Swal.fire({
            title: 'Credits Saved!',
            text: `Successfully credited ${validCredits.length} subjects for ${student.firstname} ${student.lastname}.`,
            icon: 'success',
            confirmButtonColor: '#10B981'
          });
          onSuccess && onSuccess();
          onClose();
        },
        onError: (errors) => {
          console.error('Credit submission errors:', errors);
          Swal.fire({
            title: 'Error',
            text: 'Failed to save credits. Please check your entries and try again.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        },
        onFinish: () => {
          setSubmitting(false);
        }
      });
    } catch (error) {
      console.error('Error submitting credits:', error);
      setSubmitting(false);
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? `${subject.code} - ${subject.name}` : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FaGraduationCap className="text-blue-500 text-xl" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Credit Transferee Subjects
              </h2>
              <p className="text-sm text-gray-600">
                {student.firstname} {student.lastname} - {student.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-blue-500 mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Select subjects that the transferee student has already completed</li>
                  <li>• Enter the grade received (75-100 scale)</li>
                  <li>• Specify the semester and school year when the subject was taken</li>
                  <li>• Add remarks if necessary (optional)</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            
            {/* Credits List */}
            <div className="space-y-4 mb-6">
              {credits.map((credit, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      Credit Entry #{index + 1}
                    </h4>
                    {credits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCredit(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Subject Selection */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <select
                        value={credit.subject_id}
                        onChange={(e) => updateCredit(index, 'subject_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name} ({subject.units} units)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Grade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade *
                      </label>
                      <input
                        type="number"
                        min="75"
                        max="100"
                        step="0.01"
                        value={credit.grade}
                        onChange={(e) => updateCredit(index, 'grade', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="75-100"
                        required
                      />
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Semester *
                      </label>
                      <select
                        value={credit.semester}
                        onChange={(e) => updateCredit(index, 'semester', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>

                    {/* School Year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        School Year *
                      </label>
                      <input
                        type="text"
                        value={credit.school_year}
                        onChange={(e) => updateCredit(index, 'school_year', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="2023-2024"
                        required
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={credit.remarks}
                        onChange={(e) => updateCredit(index, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Credit Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={addCredit}
                className="flex items-center px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors duration-200"
              >
                <FaPlus className="mr-2" />
                Add Another Credit
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || credits.length === 0}
                className={`flex items-center px-6 py-2 rounded-lg transition-colors duration-200 ${
                  submitting || credits.length === 0
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Credits
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
