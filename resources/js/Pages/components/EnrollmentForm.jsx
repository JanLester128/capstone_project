import React, { useState } from "react";

export default function EnrollmentForm({ onClose }) {
  const [form, setForm] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Data:", form);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4 sm:px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>

      {/* Modal */}
      <div className="relative bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Basic Education Enrollment Form</h2>
          <button
            className="text-red-500 font-bold text-xl sm:text-2xl hover:text-red-700 transition"
            onClick={onClose}
          >
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Front Page */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Front Page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                { label: "School Year", name: "schoolYear" },
                { label: "Learner Reference No. (LRN)", name: "lrn" },
                { label: "Grade Level to Enroll", name: "gradeLevel" },
                { label: "Non-Graded (SPED only)", name: "nongraded" },
                { label: "PSA Birth Certificate No.", name: "psa" },
                { label: "Last Name", name: "lastName" },
                { label: "First Name", name: "firstName" },
                { label: "Middle Name", name: "middleName" },
                { label: "Extension Name (Jr., III)", name: "extensionName" },
                { label: "Birthdate", name: "birthdate", type: "date" },
                { label: "Age", name: "age" },
                { label: "Sex", name: "sex", type: "select", options: ["Male", "Female"] },
                { label: "Place of Birth", name: "birthPlace" },
                { label: "Religion", name: "religion" },
                { label: "Mother Tongue", name: "motherTongue" },
                { label: "Indigenous Peoples Community", name: "ipCommunity" },
                { label: "4Ps Beneficiary?", name: "fourPs" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      onChange={handleChange}
                      className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    >
                      <option value="">Select</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      onChange={handleChange}
                      className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Back Page */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-1">Back Page</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                { label: "Special Needs", name: "specialNeeds" },
                { label: "PWD ID?", name: "pwdId" },
                { label: "Last Grade Level Completed", name: "lastGrade" },
                { label: "Last School Year Completed", name: "lastSY" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    name={field.name}
                    onChange={handleChange}
                    className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <h4 className="font-semibold mt-6 mb-3">Preferred Learning Modalities</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: "Blended", name: "modalityBlended" },
                { label: "Homeschooling", name: "modalityHomeschool" },
                { label: "Modular (Print)", name: "modalityPrint" },
                { label: "Modular (Digital)", name: "modalityDigital" },
                { label: "Online", name: "modalityOnline" },
                { label: "Radio-Based", name: "modalityRadio" },
                { label: "Educational TV", name: "modalityTV" },
              ].map((modality) => (
                <label key={modality.name} className="flex items-center space-x-2 text-gray-700">
                  <input type="checkbox" name={modality.name} onChange={handleChange} className="w-4 h-4" />
                  <span>{modality.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold transition duration-200 shadow"
            >
              Submit Enrollment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
