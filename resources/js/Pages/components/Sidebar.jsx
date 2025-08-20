import React from "react";
import { Link, router } from "@inertiajs/react";
import axios from "axios";
import "../../../css/sidebar.css";

const Sidebar = () => {
  const currentPath = window.location.pathname;

  const isActive = (path) => currentPath.startsWith(path);

  const handleLogout = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("auth_token");

    try {
      if (!token) {
        throw new Error("No auth token found");
      }

      // Send logout request with Authorization header
      await axios.post(
        "/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      // Clear token from localStorage
      localStorage.removeItem("auth_token");

      // Remove Authorization header for future axios requests
      delete axios.defaults.headers.common["Authorization"];

      // Redirect to login page
      router.visit("/login");
    } catch (error) {
      console.error(
        "Logout failed:",
        error.response?.data || error.message || error
      );
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <img src="/onsts.png" alt="ONSTS Logo" className="sidebar-logo" />
        <div className="sidebar-title-texts">
          <h1>ONSTS</h1>
          <span>School Management System</span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link
              href="/registrar/dashboard"
              className={isActive("/registrar/dashboard") ? "active" : ""}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/registrar/students"
              className={isActive("/registrar/students") ? "active" : ""}
            >
              Student
            </Link>
          </li>
          <li>
            <Link
              href="/registrar/sections"
              className={isActive("/registrar/sections") ? "active" : ""}
            >
              Sections
            </Link>
          </li>
          <li>
            <Link
              href="/registrar/teachers"
              className={isActive("/registrar/teachers") ? "active" : ""}
            >
              Teachers
            </Link>
          </li>

          {/* Disabled Menu Items */}
          <li className="disabled">Subject</li>
          <li className="disabled">Curriculum</li>
          <li className="disabled">Account</li>
          <li className="disabled">Class</li>
          <li className="disabled">Reports</li>
        </ul>
      </nav>

      {/* Logout Button */}
      <button className="sidebar-logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
