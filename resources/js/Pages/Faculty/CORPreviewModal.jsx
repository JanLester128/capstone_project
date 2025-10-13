import React, { useState } from 'react';
import {
  FaTimes,
  FaPrint,
  FaGraduationCap,
  FaUser,
  FaSchool,
  FaIdCard,
  FaBookOpen,
  FaAward,
  FaSpinner,
  FaEye,
  FaUsers
} from 'react-icons/fa';

export default function CORPreviewModal({ 
  isOpen, 
  onClose, 
  student, 
  strands = [], 
  sections = [], 
  sectionsByStrand = {},
  onConfirmEnrollment 
}) {
  const [selectedStrand, setSelectedStrand] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter sections by selected strand
  const availableSections = selectedStrand && sectionsByStrand[selectedStrand] 
    ? sectionsByStrand[selectedStrand] 
    : [];

  const handleStrandChange = (strandId) => {
    setSelectedStrand(strandId);
    setSelectedSection(''); // Reset section when strand changes
    setPreviewData(null); // Clear preview when strand changes
  };

  const handlePreviewCOR = async () => {
    if (!selectedStrand || !selectedSection) {
      setError('Please select both strand and section');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/coordinator/student/${student.id}/preview-cor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          strand_id: selectedStrand,
          section_id: selectedSection
        })
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData(data.preview_data);
      } else {
        setError(data.message || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating COR preview:', error);
      setError('Failed to generate COR preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmAndEnroll = () => {
    if (onConfirmEnrollment && selectedStrand && selectedSection) {
      onConfirmEnrollment(student, selectedStrand, selectedSection);
      onClose();
    }
  };

  // Group schedule by semester
  const scheduleBySemester = previewData?.schedule?.reduce((acc, item) => {
    const semester = item.semester || '1st Semester';
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(item);
    return acc;
  }, {}) || {};

  // Group credited subjects by semester
  const creditedBySemester = previewData?.creditedSubjects?.reduce((acc, item) => {
    const semester = item.semester || '1st Semester';
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(item);
    return acc;
  }, {}) || {};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b no-print">
          <div className="flex items-center space-x-3">
            <FaEye className="text-blue-500 text-xl" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                COR Preview - {student.firstname} {student.lastname}
              </h2>
              <p className="text-sm text-gray-600">
                Preview the Certificate of Registration before enrollment
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
        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          
          {/* Selection Form */}
          {!previewData && (
            <div className="p-6 border-b no-print">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Strand and Section for Preview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Strand Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strand *
                  </label>
                  <select
                    value={selectedStrand}
                    onChange={(e) => handleStrandChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Strand</option>
                    {strands.map(strand => (
                      <option key={strand.id} value={strand.id}>
                        {strand.name} ({strand.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section *
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedStrand}
                  >
                    <option value="">Select Section</option>
                    {availableSections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handlePreviewCOR}
                disabled={loading || !selectedStrand || !selectedSection}
                className={`flex items-center px-6 py-2 rounded-lg transition-colors duration-200 ${
                  loading || !selectedStrand || !selectedSection
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <FaEye className="mr-2" />
                    Generate COR Preview
                  </>
                )}
              </button>
            </div>
          )}

          {/* COR Preview */}
          {previewData && (
            <div className="p-6">
              
              {/* Preview Actions */}
              <div className="flex justify-between items-center mb-6 no-print">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">COR Preview Generated</span>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Change Selection
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                  >
                    <FaPrint className="mr-2" />
                    Print Preview
                  </button>
                </div>
              </div>

              {/* COR Content */}
              <div className="bg-white border rounded-lg p-8 print:shadow-none print:border-none">
                
                {/* School Header */}
                <div className="text-center mb-8 border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900">SENIOR HIGH SCHOOL</h2>
                  <h3 className="text-xl font-semibold text-gray-700">CERTIFICATE OF REGISTRATION</h3>
                  <p className="text-gray-600 mt-2">School Year {previewData.schoolYear.year_start}-{previewData.schoolYear.year_end}</p>
                  <div className="mt-2 px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-lg inline-block">
                    <p className="text-sm font-medium text-yellow-800">PREVIEW MODE</p>
                  </div>
                </div>

                {/* Student Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <FaUser className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Student Name</p>
                        <p className="font-semibold text-gray-900">
                          {previewData.student.lastname}, {previewData.student.firstname} {previewData.student.middlename}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaIdCard className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">LRN</p>
                        <p className="font-semibold text-gray-900">{previewData.student.lrn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaGraduationCap className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Grade Level</p>
                        <p className="font-semibold text-gray-900">{previewData.student.grade_level}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <FaSchool className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Strand</p>
                        <p className="font-semibold text-gray-900">
                          {previewData.strand.name} ({previewData.strand.code})
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaUsers className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Section</p>
                        <p className="font-semibold text-gray-900">{previewData.section.section_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <FaUser className="text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Student Type</p>
                        <p className="font-semibold text-gray-900 capitalize">{previewData.student.student_type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transferee Credits Section */}
                {previewData.student.student_type === 'transferee' && previewData.creditedSubjects.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaAward className="text-yellow-500 mr-2" />
                      Credited Subjects (Previous School)
                    </h3>
                    
                    {Object.entries(creditedBySemester).map(([semester, subjects]) => (
                      <div key={semester} className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3 bg-yellow-50 px-3 py-2 rounded">
                          {semester}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Subject Code</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Subject Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Units</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {subjects.map((credit, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">{credit.subject?.code || 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">{credit.subject?.name || 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">{credit.subject?.units || 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {credit.grade}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enrollment Schedule */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaBookOpen className="text-green-500 mr-2" />
                    Enrollment Schedule (Preview)
                  </h3>
                  
                  {Object.entries(scheduleBySemester).map(([semester, subjects]) => (
                    <div key={semester} className="mb-6">
                      <h4 className="font-medium text-gray-800 mb-3 bg-green-50 px-3 py-2 rounded">
                        {semester}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Subject Code</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Subject Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Units</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Schedule</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Faculty</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">Room</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {subjects.map((subject, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b">{subject.subject_code}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">{subject.subject_name}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">{subject.units}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.day_of_week} {subject.start_time}-{subject.end_time}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {subject.faculty_firstname} {subject.faculty_lastname}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 border-b">{subject.room || 'TBA'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview Footer */}
                <div className="border-t pt-6 mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    This is a preview of the Certificate of Registration.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {previewData && (
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50 no-print">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAndEnroll}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <FaGraduationCap className="mr-2" />
              Confirm & Enroll Student
            </button>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            font-size: 12px;
          }
          
          .bg-white {
            background: white !important;
          }
          
          .text-gray-900 {
            color: #000 !important;
          }
          
          .text-gray-600 {
            color: #333 !important;
          }
          
          .border {
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
