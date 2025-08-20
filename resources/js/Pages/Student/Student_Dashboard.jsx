import React from "react";
import Student_Sidebar from "../components/Student_Sidebar";

export default function Student_Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar fixed to LEFT */}
      <div className="w-64 h-screen fixed top-0 left-0 bg-white shadow-md">
        <Student_Sidebar active="Dashboard" />
      </div>

      {/* Main Content shifted to the right */}
      <div className="flex-1 p-10 ml-64 flex justify-center">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg rounded-2xl p-8 mb-10 text-center">
            <h1 className="text-5xl font-bold mb-3 flex items-center justify-center gap-2">
              🎓 Welcome, Student!
            </h1>
            <p className="text-white/90 text-xl">
              Here&apos;s your dashboard overview
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold text-gray-700">Courses</h2>
              <p className="text-5xl font-extrabold text-blue-600 mt-3">5</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold text-gray-700">Assignments</h2>
              <p className="text-5xl font-extrabold text-purple-600 mt-3">12</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold text-gray-700">Messages</h2>
              <p className="text-5xl font-extrabold text-green-600 mt-3">3</p>
            </div>
          </div>

          {/* Quick Info Section */}
          <div className="mt-10 bg-gradient-to-r from-gray-50 to-gray-100 shadow-lg rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-5 text-center">
              Quick Info
            </h2>
            <ul className="space-y-3 text-lg text-gray-700 text-center">
              <li>
                You are currently enrolled in{" "}
                <span className="font-semibold text-blue-600">5 courses</span>.
              </li>
              <li>
                Your next assignment is due in{" "}
                <span className="font-semibold text-purple-600">3 days</span>.
              </li>
              <li>
                You have{" "}
                <span className="font-semibold text-green-600">3 unread messages</span>{" "}
                from instructors.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
