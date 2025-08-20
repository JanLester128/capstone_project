import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { FaSearch, FaUserPlus, FaEdit, FaEye, FaTimes } from 'react-icons/fa';
import Sidebar from "../components/sidebar";
import '../../../css/Registrar/RegistrarStudent.css';

const ApproveEnrolleeModal = ({ isOpen, onClose, pendingEnrollees }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredEnrollees = pendingEnrollees.filter(enrollee =>
    enrollee.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = (enrollee) => {
    router.post('/enrollees/approve', { id: enrollee.id }, {
      onSuccess: () => {
        alert(`Approved ${enrollee.name}`);
        onClose();
      },
      onError: () => alert('Approval failed.'),
    });
  };

  return (
    <div className="reg-student-modal-overlay" onClick={onClose}>
      <div className="reg-student-modal" onClick={e => e.stopPropagation()}>
        <header className="reg-student-modal-header">
          <h3>Pending Enrollees</h3>
          <button
            className="reg-student-close-btn"
            aria-label="Close modal"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </header>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by LRN (ID)..."
            aria-label="Search pending enrollees by ID"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="reg-student-modal-search"
          />
        </div>

        <div className="reg-student-modal-content">
          {filteredEnrollees.length === 0 ? (
            <p>No enrollees found.</p>
          ) : (
            <table className="reg-student-pending-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Grade</th>
                  <th>Strand</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollees.map(enrollee => (
                  <tr key={enrollee.id}>
                    <td>{enrollee.id}</td>
                    <td>{enrollee.name}</td>
                    <td>{enrollee.grade}</td>
                    <td>{enrollee.strand}</td>
                    <td>
                      <button
                        className="reg-student-approve-btn"
                        aria-label={`Approve enrollee ${enrollee.name}`}
                        onClick={() => handleApprove(enrollee)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const RegistrarStudent = () => {
  const { students = [], pendingEnrollees = [] } = usePage().props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const filteredStudents = students.filter(student => {
    const name = student.name?.toLowerCase() ?? '';
    const id = student.id?.toLowerCase() ?? '';
    const search = searchTerm.toLowerCase();

    return (
      (name.includes(search) || id.includes(search)) &&
      (filterGrade === '' || student.grade === filterGrade)
    );
  });

  return (
    <div className="reg-student-page-layout" style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />

      <main className="reg-student-main" style={{ flexGrow: 1, overflowY: 'auto' }}>
        <header className="reg-student-header">
          <div className="reg-student-welcome">
            <h2>Manage Students</h2>
          </div>
          <div className="reg-student-search-box">
            <input
              type="text"
              placeholder="Search Here ..."
              aria-label="Search students by name or ID"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="reg-student-content">
          <section className="reg-student-container">
            <header className="reg-student-section-header">
              <h2>Student Records</h2>
              <div className="reg-student-actions">
                <button
                  className="reg-student-add-btn"
                  aria-label="Open approve enrollee modal"
                  onClick={() => setIsModalOpen(true)}
                >
                  <FaUserPlus /> Approve Enrollee
                </button>
              </div>
            </header>

            <div className="reg-student-controls">
              <div className="reg-student-search-bar">
                <FaSearch className="reg-student-search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  aria-label="Filter students by name or ID"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="reg-student-filter-dropdown"
                aria-label="Filter students by grade level"
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
              >
                <option value="">All Levels</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div className="reg-student-table-container">
              <table className="reg-student-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Grade</th>
                    <th>Strand</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.name}</td>
                      <td>{student.grade}</td>
                      <td>{student.strand}</td>
                      <td className={`reg-student-status-${student.status.toLowerCase()}`}>
                        {student.status}
                      </td>
                      <td className="reg-student-action-icons">
                        <FaEye
                          title="View"
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.visit(`/students/${student.id}`)}
                        />
                        <FaEdit
                          title="Edit"
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.visit(`/students/${student.id}/edit`)}
                        />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center' }}>
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="reg-student-footer">{/* optional footer area */}</footer>

        <ApproveEnrolleeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pendingEnrollees={pendingEnrollees}
        />
      </main>
    </div>
  );
};

export default RegistrarStudent;
