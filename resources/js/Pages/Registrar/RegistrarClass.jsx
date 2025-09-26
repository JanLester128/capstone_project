import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import Sidebar from '../layouts/Sidebar';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaTimes, 
  FaLayerGroup, 
  FaGraduationCap, 
  FaChevronDown, 
  FaChevronUp
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const RegistrarClass = () => {
  const { strands = [], flash } = usePage().props;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // State management - only strand related
  const [strandModalOpen, setStrandModalOpen] = useState(false);
  const [editStrand, setEditStrand] = useState(null);
  const [expandedStrands, setExpandedStrands] = useState({});

  useEffect(() => {
    if (flash?.success) {
      Swal.fire({
        title: 'Success!',
        text: flash.success,
        icon: 'success',
        timer: 2000,
        timerProgressBar: true
      });
    } else if (flash?.error) {
      Swal.fire({
        title: 'Error!',
        text: flash.error,
        icon: 'error',
        timer: 2000,
        timerProgressBar: true
      });
    }
  }, [flash]);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const toggleStrandExpansion = (strandId) => {
    setExpandedStrands(prev => ({
      ...prev,
      [strandId]: !prev[strandId]
    }));
  };

  const handleAddStrand = () => {
    setEditStrand(null);
    setStrandModalOpen(true);
  };

  const handleEditStrand = (strand) => {
    setEditStrand(strand);
    setStrandModalOpen(true);
  };

  const handleDeleteStrand = async (strandId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the strand and all associated data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      router.delete(`/registrar/strands/${strandId}`);
    }
  };

  // Strand Modal Component
  const StrandModal = ({ isOpen, onClose, strand }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [isCustom, setIsCustom] = useState(false);

    const presetStrands = [
      { name: 'Science, Technology, Engineering and Mathematics', code: 'STEM' },
      { name: 'Humanities and Social Sciences', code: 'HUMSS' },
      { name: 'Accountancy, Business and Management', code: 'ABM' },
      { name: 'General Academic Strand', code: 'GAS' },
      { name: 'Technical-Vocational-Livelihood', code: 'TVL' },
      { name: 'Arts and Design Track', code: 'ADT' },
      { name: 'Sports Track', code: 'SPORTS' }
    ];

    // Reset form when modal opens/closes
    useEffect(() => {
      if (isOpen) {
        if (strand) {
          setName(strand.name || '');
          setCode(strand.code || '');
          setDescription(strand.description || '');
          setSelectedType('');
          setIsCustom(true);
        } else {
          setName('');
          setCode('');
          setDescription('');
          setSelectedType('');
          setIsCustom(false);
        }
      }
    }, [isOpen, strand]);

    const handleTypeChange = (e) => {
      const value = e.target.value;
      setSelectedType(value);
      
      if (value === 'custom') {
        setIsCustom(true);
        setName('');
        setCode('');
      } else if (value) {
        setIsCustom(false);
        const preset = presetStrands.find(p => p.code === value);
        if (preset) {
          setName(preset.name);
          setCode(preset.code);
        }
      } else {
        setIsCustom(false);
        setName('');
        setCode('');
      }
    };

    // Auto-generate code from name for custom entries
    useEffect(() => {
      if (isCustom && name && !strand) {
        const generatedCode = name
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, '')
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .substring(0, 10);
        setCode(generatedCode);
      }
    }, [name, isCustom, strand]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim() || !code.trim()) return;

      const data = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
      };

      if (strand) {
        router.put(`/registrar/strands/${strand.id}`, data);
      } else {
        router.post('/registrar/strands', data);
      }
      
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {strand ? 'Edit Strand' : 'Create New Academic Strand'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!strand && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Strand Type</label>
                <select
                  value={selectedType}
                  onChange={handleTypeChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                >
                  <option value="">Choose a strand type...</option>
                  {presetStrands.map((preset) => (
                    <option key={preset.code} value={preset.code}>
                      {preset.name} ({preset.code})
                    </option>
                  ))}
                  <option value="custom">🎨 Custom Strand (Manual Entry)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Strand Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                placeholder="Enter strand name"
                required
                disabled={!isCustom && !strand}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Strand Code *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                placeholder="Enter strand code"
                maxLength="10"
                required
                disabled={!isCustom && !strand}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                placeholder="Enter strand description (optional)"
                rows="3"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
              >
                {strand ? 'Update Strand' : 'Create Strand'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Head title="Academic Strands - ONSTS" />
      <Sidebar onToggle={handleSidebarToggle} />
      
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} px-8 py-6 overflow-y-auto transition-all duration-300`}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <FaLayerGroup className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Academic Strands</h1>
                    <p className="text-gray-600">Manage academic strands and programs</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddStrand}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaPlus className="text-lg" />
                Add New Strand
              </button>
            </div>
          </div>

          {/* Strands Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                <FaGraduationCap className="text-white text-lg" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Strands ({strands.length})</h2>
            </div>
            
            {strands.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FaLayerGroup className="text-gray-400 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Strands Found</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first academic strand</p>
                <button
                  onClick={handleAddStrand}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                >
                  <FaPlus className="inline mr-2" />
                  Create First Strand
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {strands.map((strand) => {
                  const isExpanded = expandedStrands[strand.id];
                  
                  return (
                    <div key={strand.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      {/* Strand header */}
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {strand.code}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditStrand(strand)}
                              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                              title="Edit Strand"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteStrand(strand.id)}
                              className="p-2 bg-white/20 hover:bg-red-500/50 rounded-lg transition-colors"
                              title="Delete Strand"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{strand.name}</h3>
                        {strand.description && (
                          <p className="text-white/80 text-sm">{strand.description}</p>
                        )}
                      </div>

                      {/* Strand content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">Active</div>
                            <div className="text-xs text-gray-500">Status</div>
                          </div>
                          <button
                            onClick={() => toggleStrandExpansion(strand.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </div>

                        {isExpanded && strand.description && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-gray-600 text-sm">{strand.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <StrandModal
        isOpen={strandModalOpen}
        onClose={() => setStrandModalOpen(false)}
        strand={editStrand}
      />
    </div>
  );
};

export default RegistrarClass;
