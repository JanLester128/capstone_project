import React from "react";
import Student_Sidebar from "../components/Student_Sidebar";
import { FaClipboardList } from "react-icons/fa";

export default function Student_Grades() {
  const grades = [
    { course: "Mathematics", grade: "A", semester: "1st Semester" },
    { course: "Biology", grade: "B+", semester: "1st Semester" },
    { course: "Computer Science", grade: "A-", semester: "2nd Semester" },
    { course: "English", grade: "B", semester: "2nd Semester" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 h-screen fixed top-0 left-0 bg-white shadow-md">
        <Student_Sidebar active="Grades" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 ml-64 flex justify-center">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg rounded-2xl p-8 mb-10 text-center">
            <h1 className="text-5xl font-bold mb-3 flex justify-center items-center gap-3">
              <FaClipboardList className="text-white" />
              Grades
            </h1>
            <p className="text-white/90 text-xl">View your academic performance</p>
          </div>

          {/* Grades Table */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Course</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Semester</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Grade</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">{g.course}</td>
                    <td className="px-6 py-4">{g.semester}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{g.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
