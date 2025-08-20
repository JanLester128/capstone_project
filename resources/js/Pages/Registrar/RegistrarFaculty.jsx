import React, { useState } from "react";
import { Inertia } from "@inertiajs/inertia";
import Sidebar from "../components/sidebar";
import "../../../css/Registrar/RegistrarFaculty.css";

const RegistrarFaculty = ({ initialTeachers = [], flash }) => {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.department) return alert("Please select a position.");

    Inertia.post(
      "/registrar/manage",
      {
        name: formData.name,
        email: formData.email,
        role: formData.department.toLowerCase(),
      },
      {
        onSuccess: (page) => {
          const flashPassword = page.props.flash?.password || "N/A";
          const flashMessage = page.props.flash?.success;

          if (flashMessage) {
            setTeachers([
              ...teachers,
              {
                id: Date.now(),
                name: formData.name,
                email: formData.email,
                department: formData.department,
                password: flashPassword,
              },
            ]);
          }

          setFormData({ name: "", email: "", department: "" });
        },
      }
    );
  };

  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    Inertia.delete(`/registrar/manage/${id}`, {
      onSuccess: () => {
        setTeachers(teachers.filter((t) => t.id !== id));
      },
    });
  };

  return (
    <div className="teacher-page">
      <Sidebar />
      <main className="teacher-content">
        <h2>Teacher Account Management</h2>

        {flash?.success && (
          <div className="flash-success">
            {flash.success} <strong>Password: {flash.password}</strong>
          </div>
        )}

        <section className="teacher-form-container card">
          <h3>Add New Teacher</h3>
          <form className="teacher-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">Select Position</option>
              <option value="Faculty">Faculty</option>
              <option value="Coordinator">Coordinator</option>
            </select>
            <button type="submit" className="btn-add">
              Add Teacher
            </button>
          </form>
        </section>

        <section className="teacher-list-container">
          <h3>All Teachers</h3>
          {teachers.length === 0 ? (
            <p className="empty-message">No teachers found.</p>
          ) : (
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Password</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.department}</td>
                    <td>{t.email}</td>
                    <td>{t.password || "N/A"}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
};

export default RegistrarFaculty;
