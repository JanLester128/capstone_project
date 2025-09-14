import React, { useState, useEffect } from 'react';
import { FaLayerGroup, FaTimes, FaCheck, FaSearch, FaFilter, FaBookOpen } from 'react-icons/fa';
import Swal from 'sweetalert2';

const AssignSubjectModal = ({ isOpen, onClose, strand, subjects, onAssign }) => {
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setSelectedSubjects([]);
      setSearchTerm('');
      setSemesterFilter('all');
    }
  }, [isOpen]);

  const availableSubjects = subjects.filter(subject => !subject.strand_id);

  const filteredSubjects = availableSubjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = semesterFilter === 'all' || subject.semester === parseInt(semesterFilter);
    return matchesSearch && matchesSemester;
  });

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === filteredSubjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(filteredSubjects.map(s => s.id));
    }
  };

  const handleAssign = async () => {
    if (selectedSubjects.length === 0) {
      Swal.fire({
        title: 'No Subjects Selected',
        text: 'Please select at least one subject to assign.',
        icon: 'warning',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'OK'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Assignment',
      text: `Assign ${selectedSubjects.length} subject(s) to ${strand.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Assign',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      await onAssign(selectedSubjects);
      
      Swal.fire({
        title: 'Success!',
        text: `Successfully assigned ${selectedSubjects.length} subject(s) to ${strand.name}`,
        icon: 'success',
        confirmButtonColor: '#10b981',
        timer: 2000,
        showConfirmButton: false
      });
      
      onClose();
    } catch (error) {
      Swal.fire({
        title: 'Assignment Failed',
        text: 'There was an error assigning the subjects. Please try again.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !strand) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
              <FaLayerGroup className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Assign Subjects</h3>
              <p className="text-gray-600 flex items-center gap-2">
                <FaBookOpen className="text-sm" />
                {strand.name} ({strand.code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            disabled={processing}
          >
            <FaTimes className="text-gray-500 text-xl" />
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            {/* Semester Filter */}
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="all">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
            <span>{filteredSubjects.length} subjects available</span>
            <span>{selectedSubjects.length} selected</span>
          </div>
        </div>

        {/* Subject List */}
        <div className="flex-1 overflow-y-auto max-h-96 p-6">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaBookOpen className="text-gray-400 text-2xl" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">No Subjects Found</h4>
              <p className="text-gray-500">
                {searchTerm || semesterFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'All subjects are already assigned to strands'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Select All Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-700">Select All Subjects</span>
                <button
                  onClick={handleSelectAll}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedSubjects.length === filteredSubjects.length
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {selectedSubjects.length === filteredSubjects.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Subject Cards */}
              <div className="grid gap-3">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => handleSubjectToggle(subject.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSubjects.includes(subject.id)
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            selectedSubjects.includes(subject.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedSubjects.includes(subject.id) && (
                              <FaCheck className="text-white text-xs" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="bg-gray-100 px-2 py-1 rounded">{subject.code}</span>
                              <span>Grade {subject.year_level}</span>
                              <span>{subject.semester === 1 ? '1st' : '2nd'} Semester</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedSubjects.length > 0 && (
              <span className="font-medium text-blue-600">
                {selectedSubjects.length} subject(s) selected for assignment
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={processing || selectedSubjects.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <FaCheck />
                  Assign Subjects
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignSubjectModal;
