import React from "react";
import Student_Sidebar from "../components/Student_Sidebar";
import { FaBell } from "react-icons/fa";

export default function Student_Notifications() {
  const notifications = [
    {
      id: 1,
      title: "Enrollment Open",
      message: "Enrollment for the 1st Semester is now open until August 30.",
      time: "2 hours ago",
    },
    {
      id: 2,
      title: "Exam Schedule",
      message: "Midterm exams will start on September 15. Check your schedule.",
      time: "1 day ago",
    },
    {
      id: 3,
      title: "Holiday Notice",
      message: "No classes on August 21 (Ninoy Aquino Day).",
      time: "3 days ago",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 h-screen fixed top-0 left-0 bg-white shadow-md">
        <Student_Sidebar active="Notifications" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 ml-64 flex justify-center">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg rounded-2xl p-8 mb-10 text-center">
            <h1 className="text-5xl font-bold mb-3 flex justify-center items-center gap-3">
              <FaBell className="text-white" />
              Notifications
            </h1>
            <p className="text-white/90 text-xl">Stay updated with the latest announcements</p>
          </div>

          {/* Notifications List */}
          <div className="space-y-5">
            {notifications.length > 0 ? (
              notifications.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition"
                >
                  <h2 className="text-xl font-semibold text-gray-800">
                    {note.title}
                  </h2>
                  <p className="text-gray-600 mt-1">{note.message}</p>
                  <span className="text-sm text-gray-400 mt-2 block">
                    {note.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
