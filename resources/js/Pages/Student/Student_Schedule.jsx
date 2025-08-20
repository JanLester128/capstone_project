import React from "react";
import Student_Sidebar from "../components/Student_Sidebar";

export default function Student_Schedule() {
  const schedule = [
    { day: "Monday", subject: "Mathematics", time: "9:00 AM - 10:30 AM", room: "Room 101" },
    { day: "Tuesday", subject: "Biology", time: "11:00 AM - 12:30 PM", room: "Room 202" },
    { day: "Wednesday", subject: "History", time: "1:00 PM - 2:30 PM", room: "Room 303" },
    { day: "Thursday", subject: "Computer Science", time: "10:00 AM - 11:30 AM", room: "Lab 1" },
    { day: "Friday", subject: "English", time: "2:00 PM - 3:30 PM", room: "Room 404" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 h-screen fixed top-0 left-0 bg-white shadow-md">
        <Student_Sidebar active="Schedule" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 ml-64 flex justify-center">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg rounded-2xl p-8 mb-10 text-center">
            <h1 className="text-5xl font-bold mb-3">📅 Weekly Schedule</h1>
            <p className="text-white/90 text-xl">Keep track of your classes easily</p>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-md rounded-2xl overflow-hidden">
              <thead className="bg-indigo-500 text-white text-lg">
                <tr>
                  <th className="p-4 text-left">Day</th>
                  <th className="p-4 text-left">Subject</th>
                  <th className="p-4 text-left">Time</th>
                  <th className="p-4 text-left">Room</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {schedule.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold">{item.day}</td>
                    <td className="p-4">{item.subject}</td>
                    <td className="p-4">{item.time}</td>
                    <td className="p-4">{item.room}</td>
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
