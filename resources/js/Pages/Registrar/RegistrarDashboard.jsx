import React, { useEffect, useState } from "react";
import Sidebar from "../components/sidebar";
import "../../../css/Registrar/RegistrarDashboard.css";
import axios from "axios";

import { FaUserGraduate, FaChalkboardTeacher, FaLayerGroup } from "react-icons/fa";

const RegistrarDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // You may add states for dynamic counts here
  const [studentCount, setStudentCount] = useState(null);
  const [sectionCount, setSectionCount] = useState(null);
  const [teacherCount, setTeacherCount] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await axios.get("/user");
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    // You can add fetch calls here for counts and set them accordingly
    // For example:
    // async function fetchCounts() {
    //   const studentsRes = await axios.get("/api/students/count");
    //   setStudentCount(studentsRes.data.count);
    //
    //   const sectionsRes = await axios.get("/api/sections/count");
    //   setSectionCount(sectionsRes.data.count);
    //
    //   const teachersRes = await axios.get("/api/teachers/count");
    //   setTeacherCount(teachersRes.data.count);
    // }
    //
    // fetchCounts();

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="main-content">Loading...</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="main-content">
          <h2 style={{ color: "#e74c3c" }}>Unauthorized - Please login</h2>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="main-content">
        <header className="header">
          <div className="welcome">
            <h2>Registrar Dashboard</h2>
            <span>Welcome back, {user.name}!</span>
          </div>
          <input type="text" placeholder="Search students or sections..." />
        </header>

        <div className="content">
          {/* Cards Section */}
          <section className="children-section">
            <div className="child-card">
              <div className="child-info">
                <p>Students</p>
                <small>View and manage all registered students.</small>
              </div>
              <div className="child-actions">
                <FaUserGraduate size={30} color="#0d2d52" />
              </div>
            </div>

            <div className="child-card">
              <div className="child-info">
                <p>Sections</p>
                <small>Organize and manage class sections.</small>
              </div>
              <div className="child-actions">
                <FaLayerGroup size={30} color="#0d2d52" />
              </div>
            </div>

            <div className="child-card">
              <div className="child-info">
                <p>Teachers</p>
                <small>Assign subjects and view teacher information.</small>
              </div>
              <div className="child-actions">
                <FaChalkboardTeacher size={30} color="#0d2d52" />
              </div>
            </div>
          </section>

          {/* Summary Cards */}
          <section className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon"><FaUserGraduate /></div>
              <div className="summary-info">
                <h3>{studentCount !== null ? studentCount : "-"}</h3>
                <p>Total Students</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon"><FaLayerGroup /></div>
              <div className="summary-info">
                <h3>{sectionCount !== null ? sectionCount : "-"}</h3>
                <p>Total Sections</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon"><FaChalkboardTeacher /></div>
              <div className="summary-info">
                <h3>{teacherCount !== null ? teacherCount : "-"}</h3>
                <p>Total Teachers</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer spacing */}
        <div className="footer-spacer" />
      </main>
    </div>
  );
};

export default RegistrarDashboard;
