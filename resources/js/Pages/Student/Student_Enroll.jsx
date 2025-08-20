import React, { useState } from "react";
import Student_Sidebar from "../components/Student_Sidebar";
import EnrollmentForm from "../components/EnrollmentForm";

export default function Student_Enroll() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 h-screen fixed top-0 left-0 bg-white shadow-md">
        <Student_Sidebar active="Enroll" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 ml-64 flex justify-center">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg rounded-2xl p-8 mb-10 text-center">
            <h1 className="text-5xl font-bold mb-3">📚 Enrollment Information</h1>
            <p className="text-white/90 text-xl">
              Important reminders for upcoming and senior high school students
            </p>
          </div>

          {/* Notes / Reminders */}
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">🔔 Reminders</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Enrollment for the upcoming school year will open soon.
              Senior High School students are advised to prepare their requirements,
              such as report cards, good moral certificates, and other documents needed
              for enrollment. Please stay updated with official announcements from
              the registrar’s office.
            </p>

            {/* Enroll Button */}
            <button
              className="bg-teal-500 text-white text-lg font-medium px-6 py-3 rounded-lg shadow hover:bg-teal-600 transition"
              onClick={() => setIsFormOpen(true)}
            >
              Enroll Now
            </button>
          </div>
        </div>
      </div>

      {/* Enrollment Form Modal */}
      {isFormOpen && (
        <EnrollmentForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
