import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import Sidebar from "../components/sidebar";

const SectionModal = ({ isOpen, onClose, onSave, section, advisers }) => {
  const [name, setName] = useState("");
  const [adviser, setAdviser] = useState("");

  useEffect(() => {
    setName(section?.name || "");
    setAdviser(section?.adviser || "");
  }, [section, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !adviser.trim()) return;
    onSave({ ...section, name: name.trim(), adviser: adviser.trim() });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            {section ? "Edit Section" : "Add Section"}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-gray-700">Section Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter section name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Adviser</label>
            <select
              value={adviser}
              onChange={(e) => setAdviser(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="" disabled>Select adviser</option>
              {advisers.map((adv, idx) => (
                <option key={idx} value={adv.name}>{adv.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition"
          >
            Save Section
          </button>
        </form>
      </div>
    </div>
  );
};

const RegistrarSections = () => {
  const { sections: initialSections = [], advisers = [] } = usePage().props;
  const [sections, setSections] = useState(initialSections);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSections = sections.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.adviser.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditSection(null);
    setModalOpen(true);
  };

  const openEditModal = (section) => {
    setEditSection(section);
    setModalOpen(true);
  };

  const handleSaveSection = (section) => {
    if (section.id) {
      setSections((prev) => prev.map((s) => (s.id === section.id ? section : s)));
    } else {
      const newId = sections.length ? Math.max(...sections.map((s) => s.id)) + 1 : 1;
      setSections((prev) => [...prev, { ...section, id: newId }]);
    }
    setModalOpen(false);
  };

  const handleDeleteSection = (id) => {
    if (window.confirm("Are you sure you want to delete this section?")) {
      setSections((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 px-8 py-6 overflow-y-auto w-full">
        <div className="max-w-[2000px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-3xl font-bold text-gray-800">Manage Sections</h2>
            <input
              type="text"
              placeholder="Search sections or advisers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-96"
            />
          </div>

          {/* Sections Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">No sections found.</p>
            ) : (
              filteredSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition relative"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{section.name}</h3>
                  <p className="text-gray-600 mb-4"><span className="font-medium">Adviser:</span> {section.adviser}</p>

                  <div className="absolute top-4 right-4 flex gap-2">
                    <FaEdit
                      title="Edit"
                      onClick={() => openEditModal(section)}
                      className="cursor-pointer text-blue-600 hover:text-blue-800"
                    />
                    <FaTrash
                      title="Delete"
                      onClick={() => handleDeleteSection(section.id)}
                      className="cursor-pointer text-red-500 hover:text-red-700"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Section Button */}
          <div className="fixed bottom-6 right-6">
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
            >
              <FaPlus /> Add Section
            </button>
          </div>
        </div>
      </main>

      <SectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSection}
        section={editSection}
        advisers={advisers}
      />
    </div>
  );
};

export default RegistrarSections;
