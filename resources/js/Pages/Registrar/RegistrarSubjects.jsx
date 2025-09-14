import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import Swal from 'sweetalert2';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaTimes, 
  FaFilter, 
  FaSort, 
  FaSortUp, 
  FaSortDown, 
  FaBook, 
  FaGraduationCap, 
  FaInfoCircle, 
  FaCheckSquare, 
  FaSquare, 
  FaSpinner,
  FaBookOpen,
  FaLayerGroup,
  FaClock,
  FaDownload,
  FaEye,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

export default function RegistrarSubjects({ subjects = [], strands = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('registrar-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const page = usePage();
  const { flash } = page.props;
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStrand, setSelectedStrand] = useState('all');

  // Enhanced state for HCI improvements
  const [loading, setLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState(new Set());
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Auto-save filter preferences
  useEffect(() => {
    const filters = {
      selectedStrand,
      filterYear,
      filterSemester,
      sortBy,
      sortOrder,
      viewMode
    };
    localStorage.setItem('registrar-subjects-filters', JSON.stringify(filters));
  }, [selectedStrand, filterYear, filterSemester, sortBy, sortOrder, viewMode]);

  // Load saved filter preferences
  useEffect(() => {
    const saved = localStorage.getItem('registrar-subjects-filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        setSelectedStrand(filters.selectedStrand || 'all');
        setFilterYear(filters.filterYear || 'all');
        setFilterSemester(filters.filterSemester || 'all');
        setSortBy(filters.sortBy || 'name');
        setSortOrder(filters.sortOrder || 'asc');
        setViewMode(filters.viewMode || 'grid');
      } catch (e) {
        console.warn('Failed to load saved filters:', e);
      }
    }
  }, []);

  // Enhanced filtering and sorting with memoization for performance
  const filteredAndSortedSubjects = useMemo(() => {
    let filtered = subjects.filter(subject => {
      // Safe search matching with null checks
      const matchesSearch = searchTerm === '' || 
        (subject.name && subject.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Safe strand matching with proper type conversion
      const matchesStrand = selectedStrand === 'all' || 
        (subject.strand_id && subject.strand_id.toString() === selectedStrand.toString());
      
      // Safe year level matching with proper type conversion
      const matchesYear = filterYear === 'all' || 
        (subject.year_level && subject.year_level.toString() === filterYear.toString());
      
      // Safe semester matching with proper type conversion
      const matchesSemester = filterSemester === 'all' || 
        (subject.semester && subject.semester.toString() === filterSemester.toString());
      
      return matchesSearch && matchesStrand && matchesYear && matchesSemester;
    });

    // Sort subjects with null safety
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'code':
          aValue = (a.code || '').toLowerCase();
          bValue = (b.code || '').toLowerCase();
          break;
        case 'year_level':
          aValue = a.year_level || 0;
          bValue = b.year_level || 0;
          break;
        case 'strand':
          const strandA = strands.find(s => s.id === a.strand_id);
          const strandB = strands.find(s => s.id === b.strand_id);
          aValue = strandA ? strandA.name.toLowerCase() : 'zzz';
          bValue = strandB ? strandB.name.toLowerCase() : 'zzz';
          break;
        default:
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  }, [subjects, strands, searchTerm, selectedStrand, filterYear, filterSemester, sortBy, sortOrder]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedSubjects.size === filteredAndSortedSubjects.length) {
      setSelectedSubjects(new Set());
    } else {
      setSelectedSubjects(new Set(filteredAndSortedSubjects.map(s => s.id)));
    }
  };

  const handleSelectSubject = (subjectId) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }
    setSelectedSubjects(newSelected);
  };

  // Enhanced delete with undo functionality
  const handleDeleteSubject = async (id, showUndo = true) => {
    const subject = subjects.find(s => s.id === id);
    if (!subject) return;

    const result = await Swal.fire({
      title: 'Delete Subject?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Subject:</strong> ${subject.name}</p>
          <p class="mb-2"><strong>Code:</strong> ${subject.code}</p>
          <p class="text-red-600 text-sm">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      setLoading(true);
      router.delete(`/registrar/subjects/${id}`, {
        onSuccess: () => {
          setLastAction({ type: 'delete', subject: subject });
          Swal.fire({
            title: 'Subject Deleted!',
            text: `${subject.name} has been successfully deleted.`,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false
          });
        },
        onError: (errors) => {
          Swal.fire({
            title: 'Delete Failed',
            text: Object.values(errors).flat().join('\n'),
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        },
        onFinish: () => setLoading(false)
      });
    }
  };

  // Bulk delete operation
  const handleBulkDelete = async () => {
    if (selectedSubjects.size === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedSubjects.size} Subject${selectedSubjects.size > 1 ? 's' : ''}?`,
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, delete ${selectedSubjects.size} subject${selectedSubjects.size > 1 ? 's' : ''}!`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setBulkOperationLoading(true);
      
      try {
        const deletePromises = Array.from(selectedSubjects).map(id =>
          new Promise((resolve, reject) => {
            router.delete(`/registrar/subjects/${id}`, {
              onSuccess: () => resolve(id),
              onError: (errors) => reject({ id, errors })
            });
          })
        );

        await Promise.all(deletePromises);
        
        setSelectedSubjects(new Set());
        Swal.fire({
          title: 'Subjects Deleted!',
          text: `Successfully deleted ${selectedSubjects.size} subject${selectedSubjects.size > 1 ? 's' : ''}.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          title: 'Bulk Delete Failed',
          text: 'Some subjects could not be deleted. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setBulkOperationLoading(false);
      }
    }
  };

  // Modal handlers
  const openEditSubjectModal = (subject) => {
    setEditSubject(subject);
    setSubjectModalOpen(true);
  };

  const openAddSubjectModal = () => {
    setEditSubject(null);
    setSubjectModalOpen(true);
  };

  const getSubjectsByStrand = (strandId) => {
    return filteredAndSortedSubjects.filter(subject => subject.strand_id === strandId);
  };

  const getUnassignedSubjects = () => {
    return filteredAndSortedSubjects.filter(subject => !subject.strand_id);
  };

  const handleSubjectCreated = () => {
    setSubjectModalOpen(false);
    setEditSubject(null);
    // Refresh the page to get updated data
    router.reload();
  };

  const handleSubjectUpdated = () => {
    setSubjectModalOpen(false);
    setEditSubject(null);
    // Refresh the page to get updated data
    router.reload();
  };

  const SubjectModal = ({ isOpen, onClose, subject, onSubjectCreated, onSubjectUpdated, strands }) => {
    const [name, setName] = useState(subject ? subject.name : '');
    const [code, setCode] = useState(subject ? subject.code : '');
    const [strandId, setStrandId] = useState(subject ? subject.strand_id : '');
    const [yearLevel, setYearLevel] = useState(subject ? subject.year_level : '');
    const [semester, setSemester] = useState(subject ? subject.semester : '');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (subject) {
        router.put(`/registrar/subjects/${subject.id}`, {
          name,
          code,
          strand_id: strandId,
          year_level: yearLevel,
          semester
        }, {
          onSuccess: onSubjectUpdated
        });
      } else {
        router.post('/registrar/subjects', {
          name,
          code,
          strand_id: strandId,
          year_level: yearLevel,
          semester
        }, {
          onSuccess: onSubjectCreated
        });
      }
    };

    return (
      <div className={`fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center ${isOpen ? 'block' : 'hidden'}`}>
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-4">{subject ? 'Edit Subject' : 'Create Subject'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Subject Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Subject Code:</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Academic Strand:</label>
                <select
                  value={strandId}
                  onChange={(e) => setStrandId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Strand</option>
                  {strands.map(strand => (
                    <option key={strand.id} value={strand.id}>{strand.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Grade Level:</label>
                <select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Grade Level</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Semester:</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Semester</option>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-4 py-2 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
              >
                {subject ? 'Update Subject' : 'Create Subject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Head title="Subject Management" />
      
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggle={setIsCollapsed} 
      />
      
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Flash Messages */}
          {flash?.success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <FaCheckSquare className="text-green-600" />
                <span className="font-medium">{flash.success}</span>
              </div>
            </div>
          )}

          {flash?.error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <FaTimes className="text-red-600" />
                <span className="font-medium">{flash.error}</span>
              </div>
            </div>
          )}
          
          {/* Enhanced Header with Status Visibility */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Subject Management
                </h1>
                <p className="text-gray-600 text-lg mt-2">Create and manage academic subjects for Senior High School</p>
                
                {/* System Status Visibility (HCI Principle 1) */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600">System Active</span>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <FaSpinner className="animate-spin text-sm" />
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-auto">
                {/* Enhanced Search with Clear Feedback (HCI Principles 1, 6) */}
                <div className="relative flex-1 lg:flex-none">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search subjects by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full lg:w-80 bg-white shadow-sm transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                  {/* Search Results Indicator */}
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                      {filteredAndSortedSubjects.length} result{filteredAndSortedSubjects.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                </div>

                {/* View Mode Toggle with Clear Labels (HCI Principle 4) */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'grid' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Grid view - Cards layout"
                    aria-label="Switch to grid view"
                  >
                    <FaLayerGroup />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'table' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Table view - List layout"
                    aria-label="Switch to table view"
                  >
                    <FaEye />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>

                {/* Create Button with Clear Action (HCI Principle 2) */}
                <button
                  onClick={openAddSubjectModal}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                  title="Create a new subject"
                  aria-label="Create new subject"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  <span className="hidden sm:inline">Create Subject</span>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters and Bulk Operations */}
          <div className="mb-8 space-y-4">
            {/* Enhanced Filter Controls with Better UX */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaFilter className="text-blue-500" />
                  Filter & Sort Options
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaInfoCircle className="text-blue-400" />
                  <span>Filters are automatically saved</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Strand Filter with Visual Indicators */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <FaLayerGroup className="text-purple-500 text-xs" />
                    Academic Strand
                  </label>
                  <select
                    value={selectedStrand}
                    onChange={(e) => setSelectedStrand(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-200"
                  >
                    <option value="all">All Strands ({subjects.length})</option>
                    {strands.map(strand => (
                      <option key={strand.id} value={strand.id}>
                        {strand.name} ({subjects.filter(s => s.strand_id === strand.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Level Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <FaGraduationCap className="text-green-500 text-xs" />
                    Grade Level
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-200"
                  >
                    <option value="all">All Grades</option>
                    <option value="11">Grade 11 ({subjects.filter(s => s.year_level == 11).length})</option>
                    <option value="12">Grade 12 ({subjects.filter(s => s.year_level == 12).length})</option>
                  </select>
                </div>

                {/* Semester Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <FaClock className="text-orange-500 text-xs" />
                    Semester
                  </label>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-200"
                  >
                    <option value="all">All Semesters</option>
                    <option value="1">1st Semester ({subjects.filter(s => s.semester === 1).length})</option>
                    <option value="2">2nd Semester ({subjects.filter(s => s.semester === 2).length})</option>
                  </select>
                </div>

                {/* Sort Controls with Better UX */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <FaSort className="text-indigo-500 text-xs" />
                    Sort By
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-200"
                    >
                      <option value="name">Subject Name</option>
                      <option value="code">Subject Code</option>
                      <option value="year_level">Grade Level</option>
                      <option value="strand">Strand</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                      title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                      aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      {sortOrder === 'asc' ? <FaSortUp className="text-blue-500" /> : <FaSortDown className="text-blue-500" />}
                    </button>
                  </div>
                </div>

                {/* Clear Filters with Confirmation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 opacity-0">Actions</label>
                  <button
                    onClick={() => {
                      setSelectedStrand('all');
                      setFilterYear('all');
                      setFilterSemester('all');
                      setSearchTerm('');
                      setSortBy('name');
                      setSortOrder('asc');
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    title="Reset all filters to default"
                  >
                    <FaTimes className="text-xs" />
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Active Filters Summary */}
              {(selectedStrand !== 'all' || filterYear !== 'all' || filterSemester !== 'all' || searchTerm) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <FaFilter className="text-blue-500" />
                    <span className="font-medium">Active Filters:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStrand !== 'all' && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        Strand: {strands.find(s => s.id == selectedStrand)?.name}
                        <button onClick={() => setSelectedStrand('all')} className="hover:text-purple-900">
                          <FaTimes className="text-xs" />
                        </button>
                      </span>
                    )}
                    {filterYear !== 'all' && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        Grade: {filterYear}
                        <button onClick={() => setFilterYear('all')} className="hover:text-green-900">
                          <FaTimes className="text-xs" />
                        </button>
                      </span>
                    )}
                    {filterSemester !== 'all' && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        Semester: {filterSemester}
                        <button onClick={() => setFilterSemester('all')} className="hover:text-orange-900">
                          <FaTimes className="text-xs" />
                        </button>
                      </span>
                    )}
                    {searchTerm && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        Search: "{searchTerm}"
                        <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                          <FaTimes className="text-xs" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Operations Toolbar */}
            {selectedSubjects.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedSubjects.size} subject{selectedSubjects.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedSubjects(new Set())}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkOperationLoading}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      {bulkOperationLoading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FaTrash />
                          Delete Selected
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredAndSortedSubjects.length} of {subjects.length} subjects
                {searchTerm && ` matching "${searchTerm}"`}
              </span>
              {viewMode === 'grid' && filteredAndSortedSubjects.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  {selectedSubjects.size === filteredAndSortedSubjects.length ? (
                    <>
                      <FaCheckSquare />
                      Deselect all
                    </>
                  ) : (
                    <>
                      <FaSquare />
                      Select all
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Modern Subject Cards Layout */}
          {filteredAndSortedSubjects.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-12 text-center border border-white/40">
              <div className="text-center py-16">
                <div className="mb-6">
                  <FaBook className="text-blue-600 text-6xl mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Subjects Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? `No subjects match "${searchTerm}"` : "Start by creating your first subject for the curriculum."}
                </p>
                <button
                  onClick={openAddSubjectModal}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 mx-auto transition-all duration-200 transform hover:scale-105"
                >
                  <FaPlus className="w-4 h-4" />
                  Create First Subject
                </button>
              </div>
            </div>
          ) : selectedStrand === 'all' ? (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Subjects</p>
                      <p className="text-3xl font-bold">{subjects.length}</p>
                    </div>
                    <FaBook className="text-4xl text-blue-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Grade 11</p>
                      <p className="text-3xl font-bold">{subjects.filter(s => s.year_level == 11).length}</p>
                    </div>
                    <FaGraduationCap className="text-4xl text-green-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Grade 12</p>
                      <p className="text-3xl font-bold">{subjects.filter(s => s.year_level == 12).length}</p>
                    </div>
                    <FaGraduationCap className="text-4xl text-purple-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Unassigned</p>
                      <p className="text-3xl font-bold">{getUnassignedSubjects().length}</p>
                    </div>
                    <FaInfoCircle className="text-4xl text-orange-200" />
                  </div>
                </div>
              </div>

              {/* Subjects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedSubjects.map(subject => {
                  const strand = strands.find(s => s.id === subject.strand_id);
                  const getStrandColor = (strandCode) => {
                    switch(strandCode) {
                      case 'STEM': return 'from-blue-500 to-purple-600';
                      case 'HUMSS': return 'from-purple-500 to-pink-600';
                      case 'ABM': return 'from-blue-600 to-indigo-700';
                      case 'GAS': return 'from-green-500 to-teal-600';
                      case 'TVL': return 'from-orange-500 to-red-600';
                      default: return 'from-gray-500 to-gray-600';
                    }
                  };

                  return (
                    <div key={subject.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      {/* Header */}
                      <div className={`bg-gradient-to-r ${strand ? getStrandColor(strand.code) : 'from-gray-400 to-gray-500'} p-4 text-white`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1 leading-tight">{subject.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                                {subject.code}
                              </span>
                              <span className="text-white/90 text-xs">
                                Grade {subject.year_level}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditSubjectModal(subject)}
                              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
                              title="Edit Subject"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="text-white/80 hover:text-white hover:bg-red-500/30 p-2 rounded-lg transition-all duration-200"
                              title="Delete Subject"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSelectSubject(subject.id)}
                              className={`text-white/80 hover:text-white hover:bg-blue-500/30 p-2 rounded-lg transition-all duration-200 ${
                                selectedSubjects.has(subject.id) ? 'bg-blue-500/30' : ''
                              }`}
                              title="Select Subject"
                            >
                              {selectedSubjects.has(subject.id) ? <FaCheckSquare className="w-4 h-4" /> : <FaSquare className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Academic Strand:</span>
                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                              strand 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {strand ? strand.name : 'Unassigned'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Semester:</span>
                            <span className="text-sm font-medium text-gray-800">
                              {subject.semester ? `${subject.semester}${subject.semester == 1 ? 'st' : 'nd'} Semester` : 'Auto-assigned'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Year Level:</span>
                            <span className="text-sm font-medium text-gray-800">
                              Grade {subject.year_level}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                          <button
                            onClick={() => openEditSubjectModal(subject)}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                          >
                            <FaEdit className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                          >
                            <FaTrash className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Individual Strand View */}
              {(() => {
                const strand = strands.find(s => s.id === parseInt(selectedStrand));
                const strandSubjects = getSubjectsByStrand(parseInt(selectedStrand));
                const grade11Subjects = strandSubjects.filter(s => s.year_level == 11);
                const grade12Subjects = strandSubjects.filter(s => s.year_level == 12);
                
                return (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${(() => {
                      switch(strand?.code) {
                        case 'STEM': return 'from-blue-500 to-purple-600';
                        case 'HUMSS': return 'from-purple-500 to-pink-600';
                        case 'ABM': return 'from-blue-600 to-indigo-700';
                        case 'GAS': return 'from-green-500 to-teal-600';
                        case 'TVL': return 'from-orange-500 to-red-600';
                        default: return 'from-gray-500 to-gray-700';
                      }
                    })()} p-6 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2 leading-tight">{strand?.name}</h3>
                            <div className="flex items-center gap-3">
                              <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-full border border-white/30">
                                {strand?.code}
                              </span>
                              <span className="text-white/80 text-sm font-medium">
                                Major in {strand?.name}
                              </span>
                            </div>
                            <p className="text-white/90 text-sm mt-2">Prospectus for Student Evaluation</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.get(`/registrar/subjects/cor/${strand.id}`)}
                              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
                              title="View COR"
                            >
                              <FaBookOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={openAddSubjectModal}
                              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
                              title="Add Subject"
                            >
                              <FaPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content - Grade 11 and 12 Sections */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Grade 11 Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold text-gray-800">First year</h4>
                          </div>
                          
                          {/* First Semester */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-700 mb-3">First Semester</h5>
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                                <span>Code</span>
                                <span>Subject Name</span>
                                <span>Action</span>
                              </div>
                              {grade11Subjects.filter(s => s.semester === 1).length > 0 ? (
                                grade11Subjects.filter(s => s.semester === 1).map(subject => (
                                  <div key={subject.id} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-gray-200">
                                    <span className="font-mono text-blue-600">{subject.code}</span>
                                    <span className="text-gray-800">{subject.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openEditSubjectModal(subject)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete"
                                      >
                                        <FaTrash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-4">No subjects for first semester</p>
                              )}
                            </div>
                          </div>

                          {/* Second Semester */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-700 mb-3">Second Semester</h5>
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                                <span>Code</span>
                                <span>Subject Name</span>
                                <span>Action</span>
                              </div>
                              {grade11Subjects.filter(s => s.semester === 2).length > 0 ? (
                                grade11Subjects.filter(s => s.semester === 2).map(subject => (
                                  <div key={subject.id} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-gray-200">
                                    <span className="font-mono text-blue-600">{subject.code}</span>
                                    <span className="text-gray-800">{subject.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openEditSubjectModal(subject)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete"
                                      >
                                        <FaTrash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-4">No subjects for second semester</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grade 12 Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold text-gray-800">Second year</h4>
                          </div>
                          
                          {/* First Semester */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-700 mb-3">First Semester</h5>
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                                <span>Code</span>
                                <span>Subject Name</span>
                                <span>Action</span>
                              </div>
                              {grade12Subjects.filter(s => s.semester === 1).length > 0 ? (
                                grade12Subjects.filter(s => s.semester === 1).map(subject => (
                                  <div key={subject.id} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-gray-200">
                                    <span className="font-mono text-blue-600">{subject.code}</span>
                                    <span className="text-gray-800">{subject.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openEditSubjectModal(subject)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete"
                                      >
                                        <FaTrash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-4">No subjects for first semester</p>
                              )}
                            </div>
                          </div>

                          {/* Second Semester */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-700 mb-3">Second Semester</h5>
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                                <span>Code</span>
                                <span>Subject Name</span>
                                <span>Action</span>
                              </div>
                              {grade12Subjects.filter(s => s.semester === 2).length > 0 ? (
                                grade12Subjects.filter(s => s.semester === 2).map(subject => (
                                  <div key={subject.id} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-gray-200">
                                    <span className="font-mono text-blue-600">{subject.code}</span>
                                    <span className="text-gray-800">{subject.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openEditSubjectModal(subject)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete"
                                      >
                                        <FaTrash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-4">No subjects for second semester</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {/* Subject Modal */}
          <SubjectModal
            isOpen={subjectModalOpen}
            onClose={() => setSubjectModalOpen(false)}
            subject={editSubject}
            onSubjectCreated={handleSubjectCreated}
            onSubjectUpdated={handleSubjectUpdated}
            strands={strands}
          />
        </div>
      </main>
    </div>
  );
}
