import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import { router } from "@inertiajs/react";
import Swal from "sweetalert2";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaGraduationCap,
  FaEye,
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaUsers,
  FaClipboardList,
  FaUserCheck,
  FaSpinner,
  FaFileAlt,
  FaInfoCircle,
  FaPrint,
  FaCheckCircle,
  FaArrowRight,
  FaUserGraduate,
  FaUserPlus,
  FaExchangeAlt,
  FaSchool
} from "react-icons/fa";

export default function Faculty_Enrollment({ newStudents: initialNewStudents = [], continuingStudents: initialContinuingStudents = [], transfereeStudents: initialTransfereeStudents = [], rejectedStudents: initialRejectedStudents = [], activeSchoolYear = null, allowFacultyCorPrint = true, auth }) {

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [newStudents, setNewStudents] = useState(initialNewStudents);
  const [continuingStudents, setContinuingStudents] = useState(initialContinuingStudents);
  const [transfereeStudents, setTransfereeStudents] = useState(initialTransfereeStudents);
  const [rejectedStudents, setRejectedStudents] = useState(initialRejectedStudents);
  const [selectedStudentForCOR, setSelectedStudentForCOR] = useState(null);
  const [showCORModal, setShowCORModal] = useState(false);
  
  // Grade 11 to Grade 12 progression states
  const [grade11Students, setGrade11Students] = useState([]);
  const [loadingGrade11, setLoadingGrade11] = useState(false);
  const [showProgressionModal, setShowProgressionModal] = useState(false);
  
  // Student Details Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStrand, setFilterStrand] = useState("all");
  const [currentTab, setCurrentTab] = useState("new");
  const [activeTab, setActiveTab] = useState("new");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // COR Modal states (already declared above)
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableStrands, setAvailableStrands] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [isStudentEnrolled, setIsStudentEnrolled] = useState(false);
  
  // Transferee credit management states
  const [creditedSubjects, setCreditedSubjects] = useState([]);
  const [subjectGrades, setSubjectGrades] = useState({});
  const [previousSchoolData, setPreviousSchoolData] = useState({
    last_school: ''
  });
  
  // Image viewing state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Handle image viewing
  const handleImageClick = (imageUrl, title) => {
    setSelectedImage({ url: imageUrl, title });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Handle transferee subject credit toggle
  const handleSubjectCreditToggle = (subjectId, isChecked) => {
    if (isChecked) {
      setCreditedSubjects(prev => [...prev, subjectId]);
      // Don't set automatic grade - let user input the actual grade
    } else {
      setCreditedSubjects(prev => prev.filter(id => id !== subjectId));
      setSubjectGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[subjectId];
        return newGrades;
      });
    }
  };

  // Handle grade input change for credited subjects
  const handleGradeChange = (subjectId, grade) => {
    setSubjectGrades(prev => ({
      ...prev,
      [subjectId]: parseFloat(grade) || 0
    }));
  };

  // Save credited subjects for transferee student
  const saveCreditedSubjects = async () => {
    if (creditedSubjects.length === 0 && !previousSchoolData.last_school.trim()) {
      return; // No credits or school info to save
    }

    try {
      let schoolSaved = false;
      
      // Save previous school information first if provided
      if (previousSchoolData.last_school.trim()) {
        const schoolResponse = await fetch('/coordinator/transferee/previous-school', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            'Accept': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            student_id: selectedStudentForCOR.user.id,
            last_school: previousSchoolData.last_school.trim()
          })
        });

        if (!schoolResponse.ok) {
          const errorData = await schoolResponse.json();
          throw new Error(errorData.message || 'Failed to save previous school information');
        }
        
        schoolSaved = true;
        console.log('Previous school saved successfully');
      }

      // Save credited subjects if any
      if (creditedSubjects.length > 0) {
        // Validate that all credited subjects have grades
        const missingGrades = creditedSubjects.filter(subjectId => 
          !subjectGrades[subjectId] || subjectGrades[subjectId] < 75 || subjectGrades[subjectId] > 100
        );
        
        if (missingGrades.length > 0) {
          throw new Error('Please enter valid grades (75-100) for all credited subjects');
        }
        
        const creditData = creditedSubjects.map(subjectId => {
          const subject = subjects.find(s => s.id === subjectId);
          return {
            subject_id: subjectId,
            grade: subjectGrades[subjectId],
            semester: subject?.semester || '1st',
            school_year: '2023-2024', // Previous school year
            remarks: 'Credited from previous school'
          };
        });

        const response = await fetch('/coordinator/transferee/credited-subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            student_id: selectedStudentForCOR.user.id,
            credited_subjects: creditData
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save credits');
        }
      }

      // Update the student's credited subject IDs for immediate UI filtering
      if (creditedSubjects.length > 0) {
        setSelectedStudentForCOR(prev => ({
          ...prev,
          credited_subject_ids: [...(prev.credited_subject_ids || []), ...creditedSubjects]
        }));
      }

      // Show appropriate success message
      let successMessage = '';
      if (schoolSaved && creditedSubjects.length > 0) {
        successMessage = `Successfully saved previous school information and ${creditedSubjects.length} subject credit(s).`;
      } else if (schoolSaved) {
        successMessage = 'Successfully saved previous school information.';
      } else if (creditedSubjects.length > 0) {
        successMessage = `Successfully saved ${creditedSubjects.length} subject credit(s).`;
      }

      Swal.fire({
        icon: 'success',
        title: 'Transferee Information Saved!',
        text: successMessage,
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving transferee information:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save transferee information. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
    }
  };


  // Print handler - removes student from pending list after successful print
  const handlePrintCOR = () => {
    // Just trigger print - CSS handles everything
    window.print();
    
    // After printing, remove student from pending list and close modal
    setTimeout(() => {
      // Move student from current list to enrolled (remove from current list)
      if (activeTab === 'new') {
        setNewStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
      } else if (activeTab === 'continuing') {
        setContinuingStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
      } else if (activeTab === 'transferee') {
        setTransfereeStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
      }
      
      // Close modal and reset states
      setShowCORModal(false);
      setSelectedStudentForCOR(null);
      setSelectedStrand("");
      setSelectedSection("");
      setSelectedSubjects([]);
      setIsStudentEnrolled(false); // Reset enrollment status
      
      // Show completion message
      Swal.fire({
        icon: 'success',
        title: 'Process Complete!',
        text: 'Student has been moved to Enrolled Students.',
        timer: 2000,
        showConfirmButton: false
      });
    }, 1000);
  };

  // existing: fetch sections/strands on mount
  useEffect(() => {
    // Initialize strands and sections on component mount
    fetchSectionsAndStrands();
  }, []);

  // existing: sync lists when props change
  useEffect(() => {
    // Update state when props change
    setNewStudents(initialNewStudents);
    setContinuingStudents(initialContinuingStudents);
    setTransfereeStudents(initialTransfereeStudents);
    setRejectedStudents(initialRejectedStudents);
  }, [initialNewStudents, initialContinuingStudents, initialTransfereeStudents, initialRejectedStudents]);

  // NEW: Auto-fetch subjects whenever the selected strand changes
  useEffect(() => {
    if (selectedStrand) {
      fetchSubjectsForStrand(selectedStrand);
    } else {
      setSubjects([]);
    }
    
    // Clear credited subjects when strand changes (since available subjects change)
    setCreditedSubjects([]);
    setSubjectGrades({});
  }, [selectedStrand]);
  // Fetch sections and strands from API
  const fetchSectionsAndStrands = async (strandCode = null) => {
    try {
      const response = await fetch('/coordinator/sections-and-strands', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableStrands(data.strands || []);
        setAvailableSections(data.sections || []);
      } else {
        console.error('Failed to fetch sections and strands');
        // Fallback to mock data
        const mockStrands = [
          { id: 1, name: 'STEM', code: 'STEM' },
          { id: 2, name: 'ABM', code: 'ABM' },
          { id: 3, name: 'HUMSS', code: 'HUMSS' },
          { id: 4, name: 'GAS', code: 'GAS' }
        ];

        const mockSections = [
          { id: 1, name: 'Section A', strand_code: 'STEM' },
          { id: 2, name: 'Section B', strand_code: 'STEM' },
          { id: 3, name: 'Section A', strand_code: 'ABM' },
          { id: 4, name: 'Section B', strand_code: 'ABM' }
        ];

        setAvailableStrands(mockStrands);
        setAvailableSections(mockSections);
      }
    } catch (error) {
      console.error('Error fetching sections and strands:', error);
      // Fallback to mock data
      const mockStrands = [
        { id: 1, name: 'STEM', code: 'STEM' },
        { id: 2, name: 'ABM', code: 'ABM' },
        { id: 3, name: 'HUMSS', code: 'HUMSS' },
        { id: 4, name: 'GAS', code: 'GAS' }
      ];

      const mockSections = [
        { id: 1, name: 'Section A', strand_code: 'STEM' },
        { id: 2, name: 'Section B', strand_code: 'STEM' },
        { id: 3, name: 'Section A', strand_code: 'ABM' },
        { id: 4, name: 'Section B', strand_code: 'ABM' }
      ];

      setAvailableStrands(mockStrands);
      setAvailableSections(mockSections);
    }
  };

  // Fetch subjects for a specific strand from API
  const fetchSubjectsForStrand = async (strandCode) => {
    if (!strandCode) {
      setSubjects([]);
      return;
    }

    try {
      const response = await fetch(`/coordinator/subjects/${strandCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      } else {
        console.error('Failed to fetch subjects for strand:', strandCode);
        // Fallback to mock data
        const mockSubjects = [
          { id: 1, name: 'Mathematics', code: 'MATH101', strand_code: strandCode },
          { id: 2, name: 'Science', code: 'SCI101', strand_code: strandCode },
          { id: 3, name: 'English', code: 'ENG101', strand_code: strandCode },
          { id: 4, name: 'Filipino', code: 'FIL101', strand_code: strandCode }
        ];
        setSubjects(mockSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Fallback to mock data
      const mockSubjects = [
        { id: 1, name: 'Mathematics', code: 'MATH101', strand_code: strandCode },
        { id: 2, name: 'Science', code: 'SCI101', strand_code: strandCode },
        { id: 3, name: 'English', code: 'ENG101', strand_code: strandCode },
        { id: 4, name: 'Filipino', code: 'FIL101', strand_code: strandCode }
      ];
      setSubjects(mockSubjects);
    }
  };

  // Get student details from API instead of using mock data
  const handleViewStudent = async (studentId) => {
    try {
      const response = await fetch(`/coordinator/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const student = await response.json();
        setSelectedStudent(student);
        setShowModal(true);
      } else {
        console.error('Failed to fetch student details');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load student details. Please try again.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load student details. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  // Function to load document - display inline instead of opening new tab
  const loadDocument = (filename) => {
    try {
      const url = `/storage/enrollment_documents/${filename}`;
      return url; // Return URL for inline display
    } catch (error) {
      console.error('Error loading document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load document. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
      return null;
    }
  };

  const handleApproveStudent = (studentId) => {
    let student = null;
    if (activeTab === 'new') {
      student = newStudents.find(s => s.id === studentId);
    } else if (activeTab === 'continuing') {
      student = continuingStudents.find(s => s.id === studentId);
    } else if (activeTab === 'transferee') {
      student = transfereeStudents.find(s => s.id === studentId);
    }
    
    if (student) {
      // Debug logging to see what student data we have
      console.log('Selected student for COR:', {
        id: student.id,
        name: student.user?.firstname + ' ' + student.user?.lastname,
        user_student_type: student.user?.student_type,
        student_status: student.student_status,
        student_type: student.student_type,
        activeTab: activeTab
      });
      
      setSelectedStudentForCOR(student);
      setIsStudentEnrolled(false); // Reset enrollment status
      setShowCORModal(true);
    }
  };

  const handleRejectStudent = async (studentId) => {
    const result = await Swal.fire({
      title: 'Reject Enrollment?',
      text: 'Are you sure you want to reject this student\'s enrollment?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, reject it'
    });

    if (result.isConfirmed) {
      router.post(`/coordinator/students/${studentId}/reject`, {}, {
        onSuccess: () => {
          Swal.fire('Rejected!', 'Student enrollment has been rejected.', 'success');
          // Move student from current tab to rejected
          let student = null;
          if (activeTab === 'new') {
            student = newStudents.find(s => s.id === studentId);
            setNewStudents(prev => prev.filter(s => s.id !== studentId));
          } else if (activeTab === 'continuing') {
            student = continuingStudents.find(s => s.id === studentId);
            setContinuingStudents(prev => prev.filter(s => s.id !== studentId));
          } else if (activeTab === 'transferee') {
            student = transfereeStudents.find(s => s.id === studentId);
            setTransfereeStudents(prev => prev.filter(s => s.id !== studentId));
          }
          if (student) {
            setRejectedStudents(prev => [...prev, student]);
          }
        },
        onError: () => Swal.fire('Error', 'Failed to reject enrollment', 'error')
      });
    }
  };

  // Fetch Grade 11 students for progression
  const fetchGrade11Students = async () => {
    setLoadingGrade11(true);
    try {
      // Try to fetch from backend first
      const response = await fetch('/faculty/grade11-students', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGrade11Students(data.students || []);
      } else {
        // Fallback: Use mock Grade 11 students data
        console.log('Backend not ready, using mock data');
        const mockGrade11Students = [
          {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            grade_level: '11',
            strand_name: 'STEM',
            section_name: 'STEM-A',
            lrn: '123456789012',
            student_status: 'regular'
          },
          {
            id: 2,
            firstname: 'Jane',
            lastname: 'Smith',
            email: 'jane.smith@example.com',
            grade_level: '11',
            strand_name: 'HUMSS',
            section_name: 'HUMSS-A',
            lrn: '123456789013',
            student_status: 'regular'
          },
          {
            id: 3,
            firstname: 'Mark',
            lastname: 'Johnson',
            email: 'mark.johnson@example.com',
            grade_level: '11',
            strand_name: 'ABM',
            section_name: 'ABM-A',
            lrn: '123456789014',
            student_status: 'regular'
          }
        ];
        setGrade11Students(mockGrade11Students);
        
        // Show info message about using demo data
        Swal.fire({
          title: 'Demo Mode',
          text: 'Showing sample Grade 11 students. Backend endpoints need to be implemented for real data.',
          icon: 'info',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error fetching Grade 11 students:', error);
      
      // Fallback: Use mock data on network error too
      const mockGrade11Students = [
        {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          grade_level: '11',
          strand_name: 'STEM',
          section_name: 'STEM-A',
          lrn: '123456789012',
          student_status: 'regular'
        },
        {
          id: 2,
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'jane.smith@example.com',
          grade_level: '11',
          strand_name: 'HUMSS',
          section_name: 'HUMSS-A',
          lrn: '123456789013',
          student_status: 'regular'
        }
      ];
      setGrade11Students(mockGrade11Students);
      
      Swal.fire({
        title: 'Demo Mode',
        text: 'Using sample data. Please implement backend endpoints for full functionality.',
        icon: 'info',
        timer: 3000,
        showConfirmButton: false
      });
    } finally {
      setLoadingGrade11(false);
    }
  };

  // Fetch student details for modal
  const fetchStudentDetails = async (studentId) => {
    try {
      const response = await fetch(`/faculty/student-details/${studentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (response.ok) {
        const student = await response.json();
        setSelectedStudent(student);
        setShowModal(true);
      } else {
        console.error('Failed to fetch student details');
        Swal.fire({
          title: 'Error',
          text: 'Failed to load student details',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while loading student details',
        icon: 'error'
      });
    }
  };

  // Progress Grade 11 student to Grade 12
  const progressToGrade12 = async (studentId) => {
    const result = await Swal.fire({
      title: 'Progress to Grade 12?',
      text: 'This will enroll the student into Grade 12. Make sure they have completed Grade 11 with passing grades.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Progress to Grade 12',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch('/faculty/progress-to-grade12', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            student_id: studentId,
            school_year_id: activeSchoolYear?.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            Swal.fire({
              title: 'Success!',
              html: `
                <div class="text-left">
                  <p class="mb-3">${data.message}</p>
                  <div class="bg-green-50 border border-green-200 rounded p-3">
                    <p class="text-sm text-green-800">
                      <strong>Grade 12 Section:</strong> ${data.grade12_section || 'Assigned'}<br>
                      <strong>Enrollment ID:</strong> ${data.enrollment_id || 'Generated'}<br>
                      <strong>Status:</strong> Student can now view their Grade 12 COR
                    </p>
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'View Students Page',
              showCancelButton: true,
              cancelButtonText: 'Close'
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.href = '/faculty/students';
              }
            });
            // Refresh the Grade 11 students list
            fetchGrade11Students();
          } else {
            Swal.fire({
              title: 'Error',
              text: data.message || 'Failed to progress student to Grade 12',
              icon: 'error'
            });
          }
        } else {
          // Backend not implemented yet - show demo message
          const student = grade11Students.find(s => s.id === studentId);
          Swal.fire({
            title: 'Demo Mode - Progression Simulated',
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>${student?.firstname} ${student?.lastname}</strong> would be progressed to Grade 12.</p>
                <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p class="text-sm text-yellow-800">
                    <strong>Note:</strong> This is a demonstration. To make this functional, implement the backend endpoint:
                    <code class="bg-gray-100 px-1 rounded">POST /faculty/progress-to-grade12</code>
                  </p>
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'OK'
          });
          
          // Remove student from list to simulate progression
          setGrade11Students(prev => prev.filter(s => s.id !== studentId));
        }
      } catch (error) {
        console.error('Error progressing student:', error);
        
        // Show demo success for network errors too
        const student = grade11Students.find(s => s.id === studentId);
        Swal.fire({
          title: 'Demo Mode - Progression Simulated',
          text: `${student?.firstname} ${student?.lastname} would be progressed to Grade 12. Backend implementation needed for real functionality.`,
          icon: 'info'
        });
        
        // Remove student from list to simulate progression
        setGrade11Students(prev => prev.filter(s => s.id !== studentId));
      }
    }
  };

  // Fetch class schedules for enrolled student
  const fetchClassSchedulesForStudent = async (studentId, strandCode, sectionId) => {
    console.log('fetchClassSchedulesForStudent called with:', { studentId, strandCode, sectionId });

    if (!strandCode || !sectionId) {
      console.log('Missing strand or section:', { strandCode, sectionId });
      setClassSchedules([]);
      setLoadingSchedules(false);
      return;
    }

    try {
      setLoadingSchedules(true);

      // Find the strand ID from the selected strand code
      const strandObj = availableStrands.find(s => s.code === strandCode);
      const strandId = strandObj ? strandObj.id : null;

      console.log('Strand object found:', strandObj);

      if (!strandId) {
        console.error('Could not find strand ID for code:', strandCode);
        setClassSchedules([]);
        setLoadingSchedules(false);
        return;
      }

      // Get authentication token
      const token = localStorage.getItem('auth_token') || localStorage.getItem('faculty_token');

      if (!token) {
        console.error('No authentication token found');
        setClassSchedules([]);
        setLoadingSchedules(false);
        return;
      }

      // Use coordinator route for schedule fetching
      const apiUrl = `/coordinator/schedules/section/${sectionId}/strand/${strandId}`;
      console.log('Making request to:', apiUrl);

      // Fetch schedules for the selected section and strand
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Received schedule data:', data);
          setClassSchedules(data.schedules || []);
        } else {
          console.error('Response is not JSON:', contentType);
          const responseText = await response.text();
          console.error('Response text:', responseText.substring(0, 200));
          setClassSchedules([]);
        }
      } else {
        console.error('Failed to fetch schedules, status:', response.status);
        const responseText = await response.text();
        console.error('Error response:', responseText.substring(0, 200));

        // Check if it's an authentication error
        if (response.status === 401 || response.status === 403) {
          console.error('Authentication failed - user may not have coordinator permissions');
        }

        setClassSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setClassSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleFinalizeEnrollment = async () => {
    if (!selectedStudentForCOR || !selectedStrand || !selectedSection) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Information',
        text: 'Please select strand and section.'
      });
      return;
    }

    // For transferee students, save credits first if any are selected
    if ((selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee') && creditedSubjects.length > 0) {
      await saveCreditedSubjects();
    }

    try {
      setIsSubmitting(true);

      router.post(`/coordinator/students/${selectedStudentForCOR.id}/finalize`, {
        strand: selectedStrand,
        section_id: selectedSection,
        // Include subjects only if selected; backend accepts nullable array
        subjects: selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : undefined,
        // Include transferee credit information
        student_type: selectedStudentForCOR.user?.student_type || selectedStudentForCOR.student_status,
        credited_subjects: (selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee') ? creditedSubjects : []
      }, {
        onSuccess: () => {
          Swal.fire({
            icon: 'success',
            title: 'Student Enrolled Successfully!',
            text: 'Student has been enrolled. You can now print the COR.',
            timer: 3000,
            showConfirmButton: false
          });

          // Enable printing after successful enrollment
          // DON'T remove student from pending list yet - wait until COR is printed/saved
          setIsStudentEnrolled(true);

          // Keep modal open for printing COR
          setIsSubmitting(false);
        },
        onError: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to finalize enrollment'
          });
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      console.error('Error finalizing enrollment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to finalize enrollment'
      });
      setIsSubmitting(false);
    }
  };

  const getFilteredStudents = () => {
    let students = [];
    switch (activeTab) {
      case 'new':
        students = newStudents;
        break;
      case 'continuing':
        students = continuingStudents;
        break;
      case 'transferee':
        students = transfereeStudents;
        break;
      case 'rejected':
        students = rejectedStudents;
        break;
      default:
        students = newStudents;
    }

    return students.filter(student => {
      const studentName = `${student.user?.firstname || ''} ${student.user?.lastname || ''}`.trim();
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStrand = filterStrand === "all" || (student.strand?.name === filterStrand);

      return matchesSearch && matchesStrand;
    });
  };

  const getTabCount = (tab) => {
    switch (tab) {
      case 'new':
        return newStudents.length;
      case 'continuing':
        return continuingStudents.length;
      case 'transferee':
        return transfereeStudents.length;
      case 'rejected':
        return rejectedStudents.length;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-4xl text-purple-600" />
            <span className="ml-3 text-lg text-gray-600">Loading enrollment data...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <FacultySidebar onToggle={setIsCollapsed} />

      <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Enrollment Management</h1>
          <p className="text-gray-600">Review and manage student enrollment applications</p>
        </div>

        {/* Grade 11 to Grade 12 Progression Section */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <FaGraduationCap className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">Grade 11 to Grade 12 Progression</h2>
                <p className="text-blue-700 text-sm">Promote eligible Grade 11 students to Grade 12</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowProgressionModal(true);
                fetchGrade11Students();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FaArrowRight className="w-4 h-4" />
              <span>Start Progression</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-medium text-gray-800">Step 1: Verify Grades</span>
              </div>
              <p className="text-sm text-gray-600">Check Grade 11 completion and passing grades</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2 mb-2">
                <FaFileAlt className="text-blue-600" />
                <span className="font-medium text-gray-800">Step 2: Documentation</span>
              </div>
              <p className="text-sm text-gray-600">Collect Grade 11 report cards and requirements</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2 mb-2">
                <FaUserGraduate className="text-purple-600" />
                <span className="font-medium text-gray-800">Step 3: Enroll Grade 12</span>
              </div>
              <p className="text-sm text-gray-600">Process Grade 12 enrollment with Registrar</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Students</p>
                <p className="text-2xl font-bold text-blue-600">{newStudents.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaUserPlus className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Continuing</p>
                <p className="text-2xl font-bold text-green-600">{continuingStudents.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaUserCheck className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transferees</p>
                <p className="text-2xl font-bold text-purple-600">{transfereeStudents.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaUserGraduate className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedStudents.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FaTimes className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={filterStrand}
                onChange={(e) => setFilterStrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Strands</option>
                {availableStrands.map(strand => (
                  <option key={strand.id} value={strand.code}>{strand.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'new', label: 'New Students', color: 'blue', icon: 'FaUserPlus' },
                { key: 'continuing', label: 'Continuing Students', color: 'green', icon: 'FaUserCheck' },
                { key: 'transferee', label: 'Transferee Students', color: 'purple', icon: 'FaUserGraduate' },
                { key: 'rejected', label: 'Rejected', color: 'red', icon: 'FaTimes' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.key
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label} ({getTabCount(tab.key)})
                </button>
              ))}
            </nav>
          </div>

          {/* Students List */}
          <div className="p-6">
            {getFilteredStudents().length === 0 ? (
              <div className="text-center py-12">
                <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-500">No students found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredStudents().map(student => (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {student.user?.firstname} {student.user?.lastname}
                          </h3>
                          <p className="text-sm text-gray-600">{student.user?.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {student.grade_level || 'N/A'}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              {student.strand?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStudent(student.id)}
                          title="View detailed student information"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center space-x-1"
                        >
                          <FaEye className="text-sm" />
                          <span>View</span>
                        </button>
                        {(activeTab === 'new' || activeTab === 'continuing' || activeTab === 'transferee') && (
                          <>
                            <button
                              onClick={() => handleApproveStudent(student.id)}
                              title="Approve and assign strand/section (opens dialog)"
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <FaCheck className="text-sm" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectStudent(student.id)}
                              title="Reject pre-enrollment"
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <FaTimes className="text-sm" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <FaUser className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Student Enrollment Details</h2>
                    <p className="text-purple-100">{selectedStudent.user?.firstname} {selectedStudent.user?.lastname}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-white/20 rounded-full transition-colors duration-200"
                >
                  <FaTimes className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaUser className="mr-3 text-purple-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Full Name</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.user?.firstname} {selectedStudent.user?.lastname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Name Extension</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.extension_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">LRN</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.lrn || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Grade Level</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.grade_level || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Student Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedStudent.student_status === 'New Student' ? 'bg-green-100 text-green-800' :
                        selectedStudent.student_status === 'Continuing' ? 'bg-blue-100 text-blue-800' :
                          selectedStudent.student_status === 'Transferee' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {selectedStudent.student_status || 'New Student'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Age</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.age || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sex</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Birthdate</label>
                    <p className="text-gray-800 font-medium mt-1">
                      {selectedStudent.birthdate ?
                        new Date(selectedStudent.birthdate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Birth Place</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.birth_place || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Religion</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.religion || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Address</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-blue-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaGraduationCap className="mr-3 text-blue-600" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Strand Preferences</label>
                    <div className="mt-2 space-y-2">
                      {selectedStudent.strand_preferences && selectedStudent.strand_preferences.length > 0 ? (
                        selectedStudent.strand_preferences.map((preference, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {index + 1}
                            </span>
                            <span className="text-gray-800 font-medium">
                              {typeof preference === 'object' ? preference.name : preference}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No strand preferences submitted</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last Grade Completed</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.last_grade || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last School Year</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.last_sy || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-purple-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaInfoCircle className="mr-3 text-purple-600" />
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">IP Community Member</label>
                    <p className="text-gray-800 font-medium mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedStudent.ip_community === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {selectedStudent.ip_community || 'Not specified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">4Ps Beneficiary</label>
                    <p className="text-gray-800 font-medium mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedStudent.four_ps === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {selectedStudent.four_ps || 'Not specified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PWD ID</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.pwd_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Guardian Name</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.guardian_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Guardian Contact</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.guardian_contact || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last School Attended</label>
                    <p className="text-gray-800 font-medium mt-1">{selectedStudent.last_school || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Documents & Images */}
              <div className="bg-green-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaEye className="mr-3 text-green-600" />
                  Submitted Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Student Photo */}
                  {selectedStudent.image && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Student Photo</label>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                        <img
                          src={`/storage/enrollment_documents/${selectedStudent.image}`}
                          alt="Student Photo"
                          className="w-32 h-32 object-cover rounded-lg mx-auto shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 border-2 border-white"
                          onClick={() => handleImageClick(`/storage/enrollment_documents/${selectedStudent.image}`, 'Student Photo')}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="text-gray-500 hidden">
                          <FaUser className="text-4xl mx-auto mb-2" />
                          <p>Image not available</p>
                        </div>
                        <p className="text-xs text-blue-600 mt-2 font-medium">Click to view full size</p>
                      </div>
                    </div>
                  )}

                  {/* PSA Birth Certificate */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PSA Birth Certificate</label>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 text-center">
                      {selectedStudent.psa_birth_certificate ? (
                        <div>
                          <img
                            src={`/storage/enrollment_documents/${selectedStudent.psa_birth_certificate}`}
                            alt="PSA Birth Certificate"
                            className="w-full h-32 object-cover rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 border-2 border-white"
                            onClick={() => handleImageClick(`/storage/enrollment_documents/${selectedStudent.psa_birth_certificate}`, 'PSA Birth Certificate')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="text-gray-500 hidden">
                            <FaFileAlt className="text-4xl mx-auto mb-2" />
                            <p>Document not available</p>
                          </div>
                          <p className="text-xs text-green-600 mt-2 font-medium">Click to view full size</p>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <FaEye className="text-4xl mx-auto mb-2" />
                          <p>No PSA Birth Certificate submitted</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Card */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Report Card</label>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 text-center">
                      {selectedStudent.report_card ? (
                        <div>
                          <img
                            src={`/storage/enrollment_documents/${selectedStudent.report_card}`}
                            alt="Report Card"
                            className="w-full h-32 object-cover rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 border-2 border-white"
                            onClick={() => handleImageClick(`/storage/enrollment_documents/${selectedStudent.report_card}`, 'Report Card')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="text-gray-500 hidden">
                            <FaFileAlt className="text-4xl mx-auto mb-2" />
                            <p>Document not available</p>
                          </div>
                          <p className="text-xs text-orange-600 mt-2 font-medium">Click to view full size</p>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <FaEye className="text-4xl mx-auto mb-2" />
                          <p>No Report Card submitted</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COR Modal */}
      {showCORModal && selectedStudentForCOR && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col cor-printable">
            {/* COR Header */}
            <div className="bg-white border-b flex-shrink-0">
              <div className="text-center py-1 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL - SENIOR HIGH SCHOOL</h3>
                <p className="text-xs text-gray-600">Opol, Misamis Oriental</p>
                <div className="mt-1">
                  <p className="text-xs font-semibold">CLASS PROGRAM</p>
                  <p className="text-xs">School Year: [{activeSchoolYear?.year_start} - {activeSchoolYear?.year_end}] • Semester: {activeSchoolYear?.semester || '1st Semester'}</p>
                  <p className="text-xs font-medium">GRADE 11 - "{selectedSection ? availableSections.find(s => s.id == selectedSection)?.name || selectedSection : 'SECTION'}" ({selectedStrand})</p>
                </div>
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Student Information */}
              <div className="p-1 border-b">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p><strong>Student Name:</strong> {selectedStudentForCOR.user?.firstname} {selectedStudentForCOR.user?.lastname} {selectedStudentForCOR.extension_name || ''}</p>
                    <p><strong>Email:</strong> {selectedStudentForCOR.user?.email}</p>
                    <p><strong>Grade Level:</strong> {selectedStudentForCOR.grade_level || 'Grade 11'}</p>
                  </div>
                  <div>
                    <p><strong>Student Type:</strong> <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                      (selectedStudentForCOR.user?.student_type === 'new' || selectedStudentForCOR.student_status === 'New' || selectedStudentForCOR.student_type === 'New') ? 'bg-blue-100 text-blue-800' :
                      (selectedStudentForCOR.user?.student_type === 'continuing' || selectedStudentForCOR.student_status === 'Continuing' || selectedStudentForCOR.student_type === 'Continuing') ? 'bg-green-100 text-green-800' :
                      (selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee' || selectedStudentForCOR.student_type === 'Transferee') ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(selectedStudentForCOR.user?.student_type === 'new' || selectedStudentForCOR.student_status === 'New' || selectedStudentForCOR.student_type === 'New') ? '🆕 New Student' :
                       (selectedStudentForCOR.user?.student_type === 'continuing' || selectedStudentForCOR.student_status === 'Continuing' || selectedStudentForCOR.student_type === 'Continuing') ? '🔄 Continuing Student' :
                       (selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee' || selectedStudentForCOR.student_type === 'Transferee') ? '🎓 Transferee Student' :
                       'Student'}
                    </span></p>
                    <p><strong>LRN:</strong> {selectedStudentForCOR.lrn || 'N/A'}</p>
                    <p><strong>Birthdate:</strong> {selectedStudentForCOR.birthdate ? new Date(selectedStudentForCOR.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Section - Hidden during printing */}
              <div className="p-1 border-b bg-blue-50 print:hidden">
                <h4 className="text-xs font-semibold mb-1">Enrollment Assignment</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Strand
                    </label>
                    <select
                      value={selectedStrand}
                      onChange={(e) => {
                        console.log('Strand changed to:', e.target.value);
                        console.log('Current strand:', selectedStrand);
                        console.log('Available strands:', availableStrands);
                        setSelectedStrand(e.target.value);
                        setSelectedSection(""); // Reset section when strand changes
                        fetchSectionsAndStrands(e.target.value);
                        fetchSubjectsForStrand(e.target.value);
                        // Clear schedules when strand changes
                        setClassSchedules([]);
                        // Fetch class schedules when both strand and section are selected
                        if (e.target.value && selectedStudentForCOR) {
                          console.log('Calling fetchClassSchedulesForStudent with section:', selectedSection, 'strand:', e.target.value);
                          fetchClassSchedulesForStudent(selectedStudentForCOR?.id || 'no-student', e.target.value, selectedSection);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Strand</option>
                      {availableStrands.map(strand => (
                        <option key={strand.id} value={strand.code}>{strand.name} ({strand.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Section
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        console.log('Section changed to:', e.target.value);
                        console.log('Current strand:', selectedStrand);
                        console.log('Available strands:', availableStrands);
                        const newSectionId = e.target.value;
                        setSelectedSection(newSectionId);

                        // Fetch class schedules when both strand and section are selected
                        if (selectedStrand && newSectionId) {
                          console.log('Calling fetchClassSchedulesForStudent with section:', newSectionId, 'strand:', selectedStrand);
                          fetchClassSchedulesForStudent(selectedStudentForCOR?.id || 'no-student', selectedStrand, newSectionId);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!selectedStrand}
                    >
                      <option value="">Select Section</option>
                      {availableSections
                        .filter(section => !selectedStrand || section.strand_code === selectedStrand)
                        .map(section => (
                          <option key={section.id} value={section.id}>{section.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Transferee Credit Management Section - Only show for transferee students */}
                {(selectedStudentForCOR?.user?.student_type === 'transferee' || selectedStudentForCOR?.student_status === 'Transferee' || selectedStudentForCOR?.student_type === 'Transferee') && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg print:hidden">
                    <h4 className="text-sm font-semibold mb-3 text-purple-800 flex items-center">
                      <FaUserGraduate className="mr-2" />
                      Transferee Credit Management
                    </h4>
                    {/* Previous School Information */}
                    <div className="mb-4 p-3 bg-white border border-purple-200 rounded">
                      <h5 className="text-sm font-medium text-purple-800 mb-2">Previous School Information</h5>
                      
                      {/* Show existing data if available */}
                      {selectedStudentForCOR?.previous_schools && selectedStudentForCOR.previous_schools.length > 0 ? (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-2">
                          <strong>Last School:</strong> {selectedStudentForCOR.previous_schools[0].last_school}
                        </div>
                      ) : (
                        /* Input form for new previous school info */
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Previous school name *"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            value={previousSchoolData.last_school}
                            onChange={(e) => setPreviousSchoolData(prev => ({...prev, last_school: e.target.value}))}
                          />
                          {previousSchoolData.last_school.trim() && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  console.log('Saving previous school for student:', selectedStudentForCOR.user.id);
                                  console.log('School name:', previousSchoolData.last_school.trim());
                                  
                                  const response = await fetch('/coordinator/transferee/previous-school', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                      'Accept': 'application/json',
                                    },
                                    credentials: 'same-origin',
                                    body: JSON.stringify({
                                      student_id: selectedStudentForCOR.user.id,
                                      last_school: previousSchoolData.last_school.trim()
                                    })
                                  });

                                  console.log('Response status:', response.status);
                                  const responseData = await response.json();
                                  console.log('Response data:', responseData);

                                  if (response.ok) {
                                    Swal.fire({
                                      icon: 'success',
                                      title: 'Previous School Saved!',
                                      text: 'Previous school information has been saved successfully.',
                                      timer: 2000,
                                      showConfirmButton: false
                                    });
                                    
                                    // Clear the input after successful save
                                    setPreviousSchoolData({last_school: ''});
                                  } else {
                                    throw new Error(responseData.message || 'Failed to save');
                                  }
                                } catch (error) {
                                  console.error('Error saving previous school:', error);
                                  Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: error.message || 'Failed to save previous school information.',
                                    confirmButtonColor: '#3b82f6'
                                  });
                                }
                              }}
                              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            >
                              Save School Info
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-purple-700 mb-3">
                      Check subjects from the <strong>{selectedStrand || 'selected strand'}</strong> curriculum that the transferee student has already completed at their previous school.
                      These subjects will be credited and marked as completed.
                    </p>
                    
                    {/* Subject Credits List - Only show subjects for selected strand */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {subjects.filter(subject => 
                        !selectedStrand || subject.strand_code === selectedStrand || subject.strand_id === selectedStrand
                      ).map(subject => {
                        const isAlreadyCredited = selectedStudentForCOR?.credited_subject_ids?.includes(subject.id);
                        return (
                        <div key={subject.id} className={`flex items-center justify-between p-2 border rounded ${
                          isAlreadyCredited ? 'bg-green-50 border-green-200' : 'bg-white border-purple-200'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={`credit-${subject.id}`}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              onChange={(e) => handleSubjectCreditToggle(subject.id, e.target.checked)}
                              disabled={isAlreadyCredited}
                              checked={isAlreadyCredited || creditedSubjects.includes(subject.id)}
                            />
                            <label htmlFor={`credit-${subject.id}`} className={`text-sm font-medium ${
                              isAlreadyCredited ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {subject.name} ({subject.code})
                              {isAlreadyCredited && <span className="ml-2 text-xs text-green-600">✓ Already Credited</span>}
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {subject.semester} Semester
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              placeholder="Grade"
                              min="75"
                              max="100"
                              step="0.01"
                              value={subjectGrades[subject.id] || ''}
                              onChange={(e) => handleGradeChange(subject.id, e.target.value)}
                              className={`w-16 px-2 py-1 text-xs border rounded focus:ring-purple-500 focus:border-purple-500 ${
                                creditedSubjects.includes(subject.id) && !subjectGrades[subject.id] 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              id={`grade-${subject.id}`}
                              disabled={isAlreadyCredited || !creditedSubjects.includes(subject.id)}
                              required={creditedSubjects.includes(subject.id)}
                            />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    
                    {!selectedStrand ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Please select a strand first to view available subjects for credit</p>
                      </div>
                    ) : subjects.filter(subject => 
                      subject.strand_code === selectedStrand || subject.strand_id === selectedStrand
                    ).length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No subjects available for the selected strand ({selectedStrand})</p>
                        <p className="text-xs text-gray-400 mt-1">Subjects will appear here once the strand curriculum is loaded</p>
                      </div>
                    ) : null}
                    
                    {/* Save Credits Button */}
                    {creditedSubjects.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-purple-700">
                            <strong>{creditedSubjects.length}</strong> subject(s) selected for credit
                          </div>
                          <button
                            onClick={saveCreditedSubjects}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            Save Credits
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Class Schedules Section - Always show for printing */}
                <div className="mt-2">
                  <h4 className="text-xs font-semibold mb-1 text-gray-800">Class Schedule</h4>
                  {/* Show note for transferee students about credited subjects */}
                  {(selectedStudentForCOR?.user?.student_type === 'transferee' || 
                    selectedStudentForCOR?.student_status === 'Transferee' || 
                    selectedStudentForCOR?.student_type === 'Transferee') && 
                   selectedStudentForCOR?.credited_subject_ids?.length > 0 && (
                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <p className="text-green-800">
                        <strong>Note:</strong> {selectedStudentForCOR.credited_subject_ids.length} credited subject(s) from previous school are excluded from this schedule.
                      </p>
                    </div>
                  )}
                  {!selectedStrand && (
                    <div className="text-center py-4 text-gray-500 border border-gray-300 rounded-lg print:hidden">
                      <p className="text-sm">Please select a strand to view class schedules</p>
                    </div>
                  )}
                  {/* Always show schedule table structure for printing */}
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      {loadingSchedules && selectedStrand ? (
                        <div className="flex items-center justify-center py-8 print:hidden">
                          <FaSpinner className="animate-spin text-blue-600 mr-2" />
                          <span className="text-gray-600">Loading class schedules...</span>
                        </div>
                      ) : null}
                      
                      {/* Always show table for printing */}
                      <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Time</th>
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Monday</th>
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Tuesday</th>
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Wednesday</th>
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Thursday</th>
                                <th className="border border-gray-400 px-1 py-0.5 text-xs font-semibold">Friday</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Time slots */}
                              {[
                                { time: '7:30-8:00am', label: 'Flag Ceremony (Monday Only)', colspan: true },
                                { time: '8:00-10:00am', start: '08:00:00', end: '10:00:00' },
                                { time: '10:00-10:30am', label: 'Break Time (Recess)', colspan: true },
                                { time: '10:30am-12:30pm', start: '10:30:00', end: '12:30:00' },
                                { time: '12:30-1:30pm', label: 'Break Time (Lunch)', colspan: true },
                                { time: '1:30-3:30pm', start: '13:30:00', end: '15:30:00' },
                                { time: '3:30-4:30pm', start: '15:30:00', end: '16:30:00' },
                                { time: '4:30-4:45pm', label: 'Flag Lowering (Friday Only)', colspan: true }
                              ].map((slot, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-400 px-1 py-0.5 text-xs font-medium bg-gray-50">
                                    {slot.time}
                                  </td>
                                  {slot.colspan ? (
                                    <td className="border border-gray-400 px-1 py-0.5 text-xs text-center bg-green-200" colSpan="5">
                                      {slot.label}
                                    </td>
                                  ) : (
                                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                      // Find all schedules that match this day and time slot
                                      let schedules = classSchedules.filter(s =>
                                        s.day_of_week === day &&
                                        s.start_time === slot.start
                                      );
                                      
                                      // For transferee students, exclude credited subjects from COR display
                                      if (selectedStudentForCOR?.credited_subject_ids && 
                                          (selectedStudentForCOR?.user?.student_type === 'transferee' || 
                                           selectedStudentForCOR?.student_status === 'Transferee' || 
                                           selectedStudentForCOR?.student_type === 'Transferee')) {
                                        schedules = schedules.filter(s => 
                                          !selectedStudentForCOR.credited_subject_ids.includes(s.subject_id)
                                        );
                                      }

                                      return (
                                        <td key={day} className="border border-gray-400 px-1 py-0.5 text-xs text-center">
                                          {schedules.length > 0 ? (
                                            schedules.map((schedule, idx) => (
                                              <div key={idx} className={idx > 0 ? 'mt-1 pt-1 border-t border-gray-300' : ''}>
                                                <div className="font-medium text-blue-800 text-xs leading-tight">{schedule.subject_name}</div>
                                                <div className="text-gray-600 text-xs leading-tight">({schedule.faculty_firstname} {schedule.faculty_lastname})</div>
                                                {schedule.room && <div className="text-gray-500 text-xs leading-tight">{schedule.room}</div>}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="text-gray-400 text-xs" style={{color: 'black'}}>-</div>
                                          )}
                                        </td>
                                      );
                                    }))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      </div>

                      {/* No schedules message */}
                      {!loadingSchedules && classSchedules.length === 0 && selectedSection && (
                        <div className="text-center py-8 text-gray-500 border-t print:hidden">
                          <FaFileAlt className="mx-auto text-3xl mb-3" />
                          <p className="font-medium">No class schedules available for this section yet.</p>
                          <p className="text-sm mt-1">Schedules will be available after enrollment is finalized.</p>
                        </div>
                      )}
                    </div>
                </div>

                {/* Signature Section */}
                <div className="p-6 border-b">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <div className="border-b border-gray-400 mb-2 pb-8"></div>
                      <p className="font-medium">Principal</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-gray-400 mb-2 pb-8"></div>
                      <p className="font-medium">Academic Supervisor</p>
                    </div>
                  </div>
                  <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">Prepared By: {auth?.user?.firstname} {auth?.user?.lastname} (Coordinator)</p>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-2 bg-gray-50 rounded-b-lg flex justify-end space-x-2 print:hidden flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isStudentEnrolled) {
                        // If student is already enrolled, ask for confirmation
                        Swal.fire({
                          title: 'Student Already Enrolled',
                          text: 'The student has been enrolled but COR has not been printed. What would you like to do?',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#3085d6',
                          cancelButtonColor: '#d33',
                          confirmButtonText: 'Keep Enrolled & Close',
                          cancelButtonText: 'Stay Here'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            // Keep student enrolled and remove from current list
                            if (activeTab === 'new') {
                              setNewStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            } else if (activeTab === 'continuing') {
                              setContinuingStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            } else if (activeTab === 'transferee') {
                              setTransfereeStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            }
                            
                            // Close modal and reset states
                            setShowCORModal(false);
                            setSelectedStudentForCOR(null);
                            setSelectedStrand("");
                            setSelectedSection("");
                            setSelectedSubjects([]);
                            setIsStudentEnrolled(false);
                            
                            Swal.fire({
                              icon: 'info',
                              title: 'Student Kept Enrolled',
                              text: 'Student has been moved to Enrolled Students without printing COR.',
                              timer: 2000,
                              showConfirmButton: false
                            });
                          }
                          // If cancelled, stay in modal
                        });
                      } else {
                        // If not enrolled yet, just close modal normally
                        setShowCORModal(false);
                        setSelectedStudentForCOR(null);
                        setSelectedStrand("");
                        setSelectedSection("");
                        setSelectedSubjects([]);
                        setIsStudentEnrolled(false);
                      }
                    }}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalizeEnrollment}
                    disabled={isSubmitting || !selectedStrand || !selectedSection}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {isSubmitting && <FaSpinner className="animate-spin w-3 h-3" />}
                    <span>{isSubmitting ? 'Enrolling...' : 'Enroll Student'}</span>
                  </button>
                  {allowFacultyCorPrint ? (
                    <button
                      onClick={handlePrintCOR}
                      disabled={!isStudentEnrolled}
                      className={`px-3 py-1 text-xs text-white rounded transition-colors flex items-center space-x-1 ${isStudentEnrolled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      title={isStudentEnrolled ? 'Print or Save COR' : 'Please enroll student first'}
                    >
                      <FaPrint className="w-3 h-3" />
                      <span>Print COR</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-end space-y-1">
                      <button
                        disabled
                        className="px-3 py-1 text-xs bg-gray-400 text-white rounded cursor-not-allowed flex items-center space-x-1"
                        title="COR printing has been disabled by the Registrar"
                      >
                        <FaPrint className="w-3 h-3" />
                        <span>Print COR</span>
                      </button>
                      <p className="text-xs text-red-600 font-medium">
                        COR printing disabled by Registrar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Print Styles for Faculty COR */}
      <style>{`
        @media print {
          /* Hide everything first */
          body * { visibility: hidden !important; }
          
          /* Show only COR content */
          .cor-printable, .cor-printable * { visibility: visible !important; }
          
          /* Position COR properly */
          .cor-printable { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            height: auto !important;
            max-height: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Ensure modal content is visible */
          .cor-printable > div {
            max-height: none !important;
            overflow: visible !important;
          }
          
          /* Ensure schedule table is always visible when printing */
          .cor-printable table {
            visibility: visible !important;
            display: table !important;
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: avoid !important;
          }
          
          .cor-printable th, .cor-printable td {
            visibility: visible !important;
            border: 1px solid black !important;
            padding: 4px !important;
            page-break-inside: avoid !important;
          }
          
          /* Hide loading and no-schedule messages when printing */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Force table content to be visible */
          .cor-printable tbody, .cor-printable thead, .cor-printable tr {
            visibility: visible !important;
            display: table-row-group !important;
          }
          
          .cor-printable thead {
            display: table-header-group !important;
          }
          
          .cor-printable tbody {
            display: table-row-group !important;
          }
          
          .cor-printable tr {
            display: table-row !important;
          }
          
          .cor-printable td, .cor-printable th {
            display: table-cell !important;
          }
          
          /* Clean styling */
          .shadow-xl { box-shadow: none !important; }
          .rounded-lg { border-radius: 0 !important; }
          
          /* Ensure text is visible */
          .cor-printable * { 
            color: black !important; 
          }
          
          /* Page breaks */
          .page-break { page-break-before: always !important; }
          
          /* Fix any flex issues */
          .cor-printable .flex { display: block !important; }
          .cor-printable .flex-col { display: block !important; }
        }
      `}</style>

      {/* Image Viewing Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">{selectedImage.title}</h3>
              <button
                onClick={closeImageModal}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors duration-200"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            {/* Image Container */}
            <div className="p-4 bg-gray-50">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-center py-8">
                <FaFileAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Image could not be loaded</p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-100 p-4 flex justify-center">
              <button
                onClick={closeImageModal}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <FaTimes className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade 11 to Grade 12 Progression Modal */}
      {showProgressionModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaGraduationCap className="text-2xl" />
                  <div>
                    <h2 className="text-xl font-bold">Grade 11 to Grade 12 Progression</h2>
                    <p className="text-blue-100">Enroll eligible Grade 11 students into Grade 12</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProgressionModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingGrade11 ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-blue-600 mr-3 text-xl" />
                  <span className="text-gray-600">Loading Grade 11 students...</span>
                </div>
              ) : grade11Students.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserGraduate className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Grade 11 Students Found</h3>
                  <p className="text-gray-600">There are currently no Grade 11 students eligible for progression.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-yellow-800 font-medium">Important Requirements:</p>
                        <ul className="text-yellow-700 mt-1 list-disc list-inside space-y-1">
                          <li>Students must have completed Grade 11 with passing grades</li>
                          <li>Grade 11 report cards must be submitted</li>
                          <li>Progression will create new Grade 12 enrollment records</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {grade11Students.map((student) => (
                      <div key={student.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {student.firstname} {student.lastname}
                              </h3>
                              <p className="text-sm text-gray-600">{student.email}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Grade {student.grade_level || '11'}
                                </span>
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                  {student.strand_name || 'N/A'}
                                </span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  {student.section_name || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => progressToGrade12(student.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            >
                              <FaArrowRight className="w-4 h-4" />
                              <span>Progress to Grade 12</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowProgressionModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => fetchGrade11Students()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FaSpinner className="w-4 h-4" />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
