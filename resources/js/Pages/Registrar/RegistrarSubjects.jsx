import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { 
  FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaBook, 
  FaGraduationCap, FaSpinner, FaBookOpen, FaCalendarAlt
} from 'react-icons/fa';

const SubjectModal = ({ isOpen, onClose, subject, strands, semester, gradeLevel }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    strand_id: '',
    year_level: '11',
    semester: semester || '1'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name || '', code: subject.code || '',
        description: subject.description || '', strand_id: subject.strand_id || '',
        year_level: subject.year_level || gradeLevel || '11', semester: subject.semester || semester || '1'
      });
    } else {
      setFormData({
        name: '', code: '', description: '', strand_id: '',
        year_level: gradeLevel || '11', semester: semester || '1'
      });
    }
  }, [subject, semester, gradeLevel, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const url = subject ? `/registrar/subjects/${subject.id}` : '/registrar/subjects';
    const method = subject ? 'PUT' : 'POST';
    
    router[method.toLowerCase()](url, formData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Success!', text: `Subject ${subject ? 'updated' : 'created'} successfully!`,
          icon: 'success', confirmButtonColor: '#10b981'
        });
        onClose();
      },
      onError: () => {
        Swal.fire({
          title: 'Error!', text: 'Failed to save subject.',
          icon: 'error', confirmButtonColor: '#dc2626'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {subject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label>
                <input type="text" value={formData.code} 
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., STEM-101" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
              <input type="text" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subject name" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Strand *</label>
                <select value={formData.strand_id}
                  onChange={(e) => setFormData({...formData, strand_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Strand</option>
                  {strands.map(strand => (
                    <option key={strand.id} value={strand.id}>{strand.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level *</label>
                <select value={formData.year_level}
                  onChange={(e) => setFormData({...formData, year_level: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {loading && <FaSpinner className="animate-spin" />}
                {subject ? 'Update Subject' : 'Create Subject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function RegistrarSubjects({ subjects = [], strands = [], faculty = [], sections = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [activeTab, setActiveTab] = useState('1st-semester');
  const [activeGrade, setActiveGrade] = useState('11');
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStrand, setSelectedStrand] = useState('all');

  const firstSemesterSubjects = useMemo(() => {
    return subjects.filter(subject => subject.semester === '1' || subject.semester === 1);
  }, [subjects]);

  const secondSemesterSubjects = useMemo(() => {
    return subjects.filter(subject => subject.semester === '2' || subject.semester === 2);
  }, [subjects]);

  const firstSemesterGrade11 = useMemo(() => {
    return firstSemesterSubjects.filter(subject => subject.year_level === '11' || subject.year_level === 11);
  }, [firstSemesterSubjects]);

  const firstSemesterGrade12 = useMemo(() => {
    return firstSemesterSubjects.filter(subject => subject.year_level === '12' || subject.year_level === 12);
  }, [firstSemesterSubjects]);

  const secondSemesterGrade11 = useMemo(() => {
    return secondSemesterSubjects.filter(subject => subject.year_level === '11' || subject.year_level === 11);
  }, [secondSemesterSubjects]);

  const secondSemesterGrade12 = useMemo(() => {
    return secondSemesterSubjects.filter(subject => subject.year_level === '12' || subject.year_level === 12);
  }, [secondSemesterSubjects]);

  const currentSemesterSubjects = useMemo(() => {
    if (activeTab === '1st-semester') {
      return activeGrade === '11' ? firstSemesterGrade11 : firstSemesterGrade12;
    }
    if (activeTab === '2nd-semester') {
      return activeGrade === '11' ? secondSemesterGrade11 : secondSemesterGrade12;
    }
    return subjects;
  }, [activeTab, activeGrade, firstSemesterGrade11, firstSemesterGrade12, secondSemesterGrade11, secondSemesterGrade12, subjects]);

  const filteredSubjects = useMemo(() => {
    return currentSemesterSubjects.filter(subject => {
      const matchesSearch = searchTerm === '' || 
        (subject.name && subject.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStrand = selectedStrand === 'all' || 
        (subject.strand_id && subject.strand_id.toString() === selectedStrand.toString());
      return matchesSearch && matchesStrand;
    });
  }, [currentSemesterSubjects, searchTerm, selectedStrand]);

  const handleAddSubject = () => {
    setEditSubject(null);
    setSubjectModalOpen(true);
  };

  const handleEditSubject = (subject) => {
    setEditSubject(subject);
    setSubjectModalOpen(true);
  };

  const handleDeleteSubject = async (subjectId) => {
    const result = await Swal.fire({
      title: 'Are you sure?', text: 'This will permanently delete the subject.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      router.delete(`/registrar/subjects/${subjectId}`, {
        onSuccess: () => Swal.fire({
          title: 'Deleted!', text: 'Subject has been deleted successfully.',
          icon: 'success', confirmButtonColor: '#10b981'
        }),
        onError: () => Swal.fire({
          title: 'Error!', text: 'Failed to delete subject.',
          icon: 'error', confirmButtonColor: '#dc2626'
        })
      });
    }
  };

  const getStrandName = (strandId) => {
    const strand = strands.find(s => s.id === strandId);
    return strand ? strand.name : 'Unknown';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Head title="Subject Management" />
      <Sidebar onToggle={setIsCollapsed} />
      
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} px-8 py-6 overflow-y-auto transition-all duration-300`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <FaBook className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
                    <p className="text-gray-600">Manage subjects by semester</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button onClick={() => setActiveTab('1st-semester')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === '1st-semester'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    <FaBookOpen />
                    1st Semester ({firstSemesterSubjects.length})
                  </div>
                </button>
                <button onClick={() => setActiveTab('2nd-semester')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === '2nd-semester'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    <FaGraduationCap />
                    2nd Semester ({secondSemesterSubjects.length})
                  </div>
                </button>
              </nav>
            </div>

            {/* Grade Level Sub-tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex">
                <button onClick={() => setActiveGrade('11')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeGrade === '11'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">11</span>
                    Grade 11 ({activeTab === '1st-semester' ? firstSemesterGrade11.length : secondSemesterGrade11.length})
                  </div>
                </button>
                <button onClick={() => setActiveGrade('12')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeGrade === '12'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">12</span>
                    Grade 12 ({activeTab === '1st-semester' ? firstSemesterGrade12.length : secondSemesterGrade12.length})
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search subjects by name or code..."
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <select value={selectedStrand} onChange={(e) => setSelectedStrand(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="all">All Strands</option>
                    {strands.map(strand => (
                      <option key={strand.id} value={strand.id}>{strand.name}</option>
                    ))}
                  </select>
                  <button onClick={handleAddSubject}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <FaPlus /> Add Subject
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {filteredSubjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Semester</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Code</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Subject Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Strand</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Grade</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map(subject => (
                        <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              subject.semester === 1 || subject.semester === '1' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {subject.semester === 1 || subject.semester === '1' ? '1st Sem' : '2nd Sem'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {subject.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{subject.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {subject.semester === 1 || subject.semester === '1' ? 'August - December' : 'January - May'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">{getStrandName(subject.strand_id)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">Grade {subject.year_level}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditSubject(subject)}
                                className="text-blue-600 hover:text-blue-800 p-1" title="Edit Subject">
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteSubject(subject.id)}
                                className="text-red-600 hover:text-red-800 p-1" title="Delete Subject">
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaBook className="mx-auto text-4xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No subjects found for Grade {activeGrade} - {activeTab === '1st-semester' ? '1st' : '2nd'} Semester
                  </h3>
                  <p className="text-gray-500 mb-4">Start by adding subjects for Grade {activeGrade} in this semester.</p>
                  <button onClick={handleAddSubject}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                    <FaPlus /> Add First Subject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SubjectModal isOpen={subjectModalOpen} onClose={() => setSubjectModalOpen(false)}
        subject={editSubject} strands={strands} semester={activeTab === '1st-semester' ? '1' : '2'} gradeLevel={activeGrade} />
    </div>
  );
};
