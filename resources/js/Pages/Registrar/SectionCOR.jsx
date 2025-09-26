import React, { useState } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import { FaPrint, FaArrowLeft, FaBook, FaGraduationCap, FaClock, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import Sidebar from "../layouts/Sidebar";

const SectionCOR = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { section, subjectsByYear, activeSchoolYear, sections, scheduledSubjects } = usePage().props;

  const handlePrint = () => {
    window.print();
  };

  const handleBackToSubjects = () => {
    router.get('/registrar/subjects');
  };

  const handleSectionChange = (e) => {
    const selectedSectionId = e.target.value;
    if (selectedSectionId) {
      router.get(`/registrar/subjects/cor/${selectedSectionId}`);
    }
  };

  const getStrandColor = (strandCode) => {
    switch(strandCode) {
      case 'STEM': return 'from-blue-500 to-purple-600';
      case 'HUMSS': return 'from-purple-500 to-pink-600';
      case 'ABM': return 'from-blue-600 to-indigo-700';
      case 'GAS': return 'from-green-500 to-teal-600';
      case 'TVL': return 'from-orange-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderSubjectsTable = (subjects, yearLevel, semester) => {
    const semesterSubjects = subjects.filter(s => s.semester === semester);
    
    if (semesterSubjects.length === 0) {
      return (
        <tr>
          <td colSpan="7" className="border border-gray-400 px-3 py-4 text-center text-gray-500 text-sm">
            No scheduled subjects for {semester === 1 ? 'First' : 'Second'} Semester
          </td>
        </tr>
      );
    }

    return semesterSubjects.map((subject, index) => (
      <tr key={subject.id}>
        <td className="border border-gray-400 px-3 py-2 text-sm text-center">{subject.code}</td>
        <td className="border border-gray-400 px-3 py-2 text-sm">{subject.name}</td>
        <td className="border border-gray-400 px-3 py-2 text-sm text-center">3</td>
        <td className="border border-gray-400 px-3 py-2 text-sm text-center">
          {subject.day_of_week}
        </td>
        <td className="border border-gray-400 px-3 py-2 text-sm text-center">
          {formatTime(subject.start_time)} - {formatTime(subject.end_time)}
        </td>
        <td className="border border-gray-400 px-3 py-2 text-sm text-center">
          {subject.room || 'TBA'}
        </td>
        <td className="border border-gray-400 px-3 py-2 text-sm">
          {subject.faculty_name}
        </td>
      </tr>
    ));
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Sidebar onToggle={setIsCollapsed} />
      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 overflow-x-hidden`}>
        <div className="p-8">
          <Head title={`COR - ${section.name} (${section.strand?.name}) - ONSTS`} />
          
          {/* Header Controls - Hidden in print */}
          <div className="mb-8 print:hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Certificate of Registration (COR)
                </h1>
                <p className="text-gray-600 text-lg">
                  Section: {section.name} | Strand: {section.strand?.name} ({section.strand?.code})
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Showing actual scheduled subjects for this section
                </p>
              </div>
              
              <div className="flex gap-4 w-full lg:w-auto">
                <select
                  value={section.id}
                  onChange={handleSectionChange}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.strand?.name} ({s.strand?.code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBackToSubjects}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-200"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back to Subjects
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-200"
                >
                  <FaPrint className="w-4 h-4" />
                  Print COR
                </button>
              </div>
            </div>
          </div>

          {/* COR Document */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
            {/* Header */}
            <div className="bg-white p-8 border-b-2 border-gray-400 print:border-black">
              <div className="text-center">
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center print:bg-white print:border print:border-black">
                    <FaGraduationCap className="text-2xl text-gray-600" />
                  </div>
                  <div className="text-center flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase">Republic of the Philippines</h2>
                    <p className="text-lg text-gray-700">Department of Education</p>
                    <p className="text-sm text-gray-600">Region X - Northern Mindanao</p>
                    <p className="text-sm text-gray-600">Schools Division of Misamis Oriental</p>
                    <p className="text-lg font-bold text-gray-800 mt-2">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</p>
                    <p className="text-sm text-gray-600">Senior High School Department</p>
                    <p className="text-sm text-gray-600">Opol, Misamis Oriental</p>
                  </div>
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center print:bg-white print:border print:border-black">
                    <FaBook className="text-2xl text-gray-600" />
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t-2 border-gray-300 print:border-black">
                  <h3 className="text-xl font-bold text-gray-800 uppercase mb-2">Certificate of Registration</h3>
                  <p className="text-lg font-semibold text-gray-800">
                    Section: {section.name} | Academic Track: {section.strand?.name} ({section.strand?.code})
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    School Year: {activeSchoolYear?.year_start} - {activeSchoolYear?.year_end}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Based on Actual Section Schedule
                  </p>
                </div>
              </div>
            </div>

            {/* Subject Tables by Year Level */}
            <div className="p-8">
              {Object.entries(subjectsByYear).map(([yearLevel, subjects]) => (
                <div key={yearLevel} className="mb-12">
                  <div className={`bg-gradient-to-r ${getStrandColor(section.strand?.code)} p-4 rounded-t-lg print:bg-gray-100 print:border print:border-black`}>
                    <h4 className="text-xl font-bold text-white print:text-black text-center">
                      {yearLevel == 11 ? 'GRADE 11 (First Year)' : 'GRADE 12 (Second Year)'} - Section {section.name}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 bg-gray-50 p-6 print:bg-white print:border print:border-black print:border-t-0">
                    {/* First Semester */}
                    <div>
                      <h5 className="text-lg font-bold text-gray-800 mb-4 text-center bg-blue-100 py-2 rounded print:bg-gray-200 print:border print:border-black">
                        FIRST SEMESTER
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-400 print:border-black">
                          <thead>
                            <tr className="bg-gray-200 print:bg-gray-100">
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Subject Code
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Subject Title
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Units
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Day
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Time
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Room
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Faculty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderSubjectsTable(subjects, yearLevel, 1)}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Second Semester */}
                    <div>
                      <h5 className="text-lg font-bold text-gray-800 mb-4 text-center bg-green-100 py-2 rounded print:bg-gray-200 print:border print:border-black">
                        SECOND SEMESTER
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-400 print:border-black">
                          <thead>
                            <tr className="bg-gray-200 print:bg-gray-100">
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Subject Code
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Subject Title
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Units
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Day
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Time
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Room
                              </th>
                              <th className="border border-gray-400 print:border-black px-3 py-2 text-sm font-bold text-gray-800">
                                Faculty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderSubjectsTable(subjects, yearLevel, 2)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Section */}
            <div className="p-6 bg-blue-50 print:bg-white border-t border-gray-300 print:border-black">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:border print:border-black">
                  <FaBook className="mx-auto text-2xl text-blue-600 mb-2" />
                  <h4 className="font-bold text-gray-800">Total Subjects</h4>
                  <p className="text-2xl font-bold text-blue-600">{scheduledSubjects.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:border print:border-black">
                  <FaUser className="mx-auto text-2xl text-green-600 mb-2" />
                  <h4 className="font-bold text-gray-800">Faculty Count</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(scheduledSubjects.map(s => s.faculty_name)).size}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:border print:border-black">
                  <FaClock className="mx-auto text-2xl text-purple-600 mb-2" />
                  <h4 className="font-bold text-gray-800">Schedule Status</h4>
                  <p className="text-sm font-bold text-purple-600">Complete</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t-2 border-gray-300 print:border-black bg-gray-50 print:bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="border-b border-gray-400 print:border-black pb-1 mb-2">
                    <span className="text-sm text-gray-600">Student Signature</span>
                  </div>
                  <p className="text-xs text-gray-500">Student</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 print:border-black pb-1 mb-2">
                    <span className="text-sm text-gray-600">Registrar Signature</span>
                  </div>
                  <p className="text-xs text-gray-500">Registrar</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 print:border-black pb-1 mb-2">
                    <span className="text-sm text-gray-600">Date</span>
                  </div>
                  <p className="text-xs text-gray-500">Date Issued</p>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500">
                  This certificate shows actual scheduled subjects for Section {section.name} based on class schedules.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Generated on: {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
          .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border { border: 1px solid black !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:border-t-0 { border-top: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default SectionCOR;
