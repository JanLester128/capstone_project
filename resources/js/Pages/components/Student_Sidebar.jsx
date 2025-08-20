import React from "react";
import { Link } from "@inertiajs/react";
import axios from "axios";
import { FaHome, FaBook, FaClipboardList, FaEnvelope, FaSignOutAlt } from "react-icons/fa";

export default function StudentSidebar({ active }) {
  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, route: "/student/dashboard" },
    { name: "Enroll", icon: <FaBook />, route: "/student/enroll" },
    { name: "Schedule", icon: <FaClipboardList />, route: "/student/schedule" },
    { name: "Grades", icon: <FaClipboardList />, route: "/student/grades" },
    { name: "Notifications", icon: <FaEnvelope />, route: "/student/notifications" },
  ];

  const handleLogout = async () => {
    const token = localStorage.getItem("student_token"); // student-specific token

    try {
      await axios.post(
        "/auth/logout",
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true,
        }
      );

      // Remove student token
      localStorage.removeItem("student_token");
      delete axios.defaults.headers.common["Authorization"];

      // Redirect to student login
      window.location.href = "/student/login";
    } catch (error) {
      console.error("Student logout failed:", error.response?.data || error.message);
      alert("Logout failed. Please try again.");
    }
  };

  const isActive = (route) => window.location.pathname.startsWith(route);

  return (
    <div className="h-screen bg-white shadow-md flex flex-col p-4">
      <h2 className="text-2xl font-bold text-indigo-600 mb-8 text-center">Student Panel</h2>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.route}
            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition
              ${active === item.name ? "bg-indigo-500 text-white font-semibold shadow" : "text-gray-700 hover:bg-gray-100"}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-100 transition mt-4"
      >
        <FaSignOutAlt />
        <span>Logout</span>
      </button>
    </div>
  );
}
