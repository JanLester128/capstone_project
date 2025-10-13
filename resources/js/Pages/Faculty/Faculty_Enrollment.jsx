import React, { useState, useEffect } from "react";
import FacultySidebar from "../layouts/Faculty_Sidebar";
import TransfereeCreditModal from "./TransfereeCreditModal";
import CORPreviewModal from "./CORPreviewModal";
import { router } from "@inertiajs/react";
import Swal from "sweetalert2";
import { AuthManager } from '../../auth';
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
  FaSchool,
  FaAward,
  FaCreditCard,
  FaIdCard,
  FaClipboardCheck,
  FaPlus,
  FaTrash
} from "react-icons/fa";

export default function Faculty_Enrollment({ 
  newStudents: initialNewStudents = [], 
  transfereeStudents: initialTransfereeStudents = [], 
  continuingStudents: initialContinuingStudents = [], 
  rejectedStudents: initialRejectedStudents = [], 
  activeSchoolYear = null, 
  allowFacultyCorPrint = true, 
  strands = [], 
  sections = [], 
  sectionsByStrand = {}, 
  auth 
}) {

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('faculty-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [newStudents, setNewStudents] = useState(initialNewStudents);
  const [transfereeStudents, setTransfereeStudents] = useState(initialTransfereeStudents);
  const [continuingStudents, setContinuingStudents] = useState(initialContinuingStudents);
  const [rejectedStudents, setRejectedStudents] = useState(initialRejectedStudents);

  // Debug logging to see what data we're receiving
  console.log('Faculty_Enrollment: Student data received:', {
    newStudents: initialNewStudents.length,
    transfereeStudents: initialTransfereeStudents.length,
    continuingStudents: initialContinuingStudents.length,
    rejectedStudents: initialRejectedStudents.length,
    activeSchoolYear: activeSchoolYear?.id
  });
  const [selectedStudentForCOR, setSelectedStudentForCOR] = useState(null);
  const [showCORModal, setShowCORModal] = useState(false);
  
  
  // Student Details Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStrand, setFilterStrand] = useState("all");
  const [activeTab, setActiveTab] = useState("new");
  const [isLoading, setIsLoading] = useState(false);
  
  // Transferee Credit Modal states
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedTransferee, setSelectedTransferee] = useState(null);
  
  // COR Preview Modal states
  const [showCORPreviewModal, setShowCORPreviewModal] = useState(false);
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);

  // Authentication check on component mount
  useEffect(() => {
    const checkAuth = () => {
      const user = AuthManager.getUser();
      const token = AuthManager.getToken();
      
      if (!user || !token) {
        console.log('🚨 Faculty_Enrollment: No authentication found, redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      // Check if user is faculty/coordinator and has coordinator privileges
      if (user.role !== 'faculty' && user.role !== 'coordinator') {
        console.log('🚨 Faculty_Enrollment: Invalid role for coordinator access:', user.role);
        window.location.href = '/login';
        return;
      }
      
      // Check if faculty user has coordinator privileges
      if (user.role === 'faculty' && !user.is_coordinator) {
        console.log('🚨 Faculty_Enrollment: Faculty user lacks coordinator privileges');
        window.location.href = '/faculty/dashboard';
        return;
      }
      
      console.log('✅ Faculty_Enrollment: Authentication verified for coordinator access');
    };
    
    checkAuth();
  }, []);

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

  // Auto-fetch schedules when COR modal opens and strand/section are available
  useEffect(() => {
    if (showCORModal && selectedStudentForCOR && selectedStrand && selectedSection) {
      console.log('Auto-fetching schedules for COR modal:', {
        studentId: selectedStudentForCOR.id,
        strand: selectedStrand,
        section: selectedSection
      });
      fetchClassSchedulesForStudent(selectedStudentForCOR.id, selectedStrand, selectedSection);
    } else if (showCORModal && selectedStudentForCOR) {
      console.log('COR modal opened but missing strand/section:', {
        studentId: selectedStudentForCOR.id,
        strand: selectedStrand,
        section: selectedSection,
        studentData: {
          strand_preferences: selectedStudentForCOR.strand_preferences,
          assigned_section_id: selectedStudentForCOR.assigned_section_id
        }
      });
    }
  }, [showCORModal, selectedStudentForCOR, selectedStrand, selectedSection]);

  // Additional useEffect to handle cases where strand/section are set after modal opens
  useEffect(() => {
    if (showCORModal && selectedStudentForCOR && selectedStrand && selectedSection && classSchedules.length === 0) {
      console.log('Schedules empty, triggering fetch:', {
        studentId: selectedStudentForCOR.id,
        strand: selectedStrand,
        section: selectedSection
      });
      fetchClassSchedulesForStudent(selectedStudentForCOR.id, selectedStrand, selectedSection);
    }
  }, [selectedStrand, selectedSection]);
  
  // Transferee credit management states
  const [previousSchoolData, setPreviousSchoolData] = useState({
    last_school: ''
  });
  
  // Image viewing state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // COR Review and Subject Crediting states
  const [corReviewedStudents, setCORReviewedStudents] = useState(new Set());
  const [creditedSubjects, setCreditedSubjects] = useState({});
  const [subjectGrades, setSubjectGrades] = useState({});
  const [showCreditingModal, setShowCreditingModal] = useState(false);
  const [selectedStudentForCrediting, setSelectedStudentForCrediting] = useState(null);

  // Handle image viewing
  const handleImageClick = (imageUrl, title) => {
    setSelectedImage({ url: imageUrl, title });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // COR Review Functions
  const handleCORReview = (student) => {
    setSelectedStudentForCOR(student);
    setShowCORModal(true);
  };

  const markCORAsReviewed = (studentId) => {
    setCORReviewedStudents(prev => new Set([...prev, studentId]));
    Swal.fire({
      icon: 'success',
      title: 'COR Reviewed',
      text: 'Certificate of Registration has been reviewed and approved.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const isCORReviewed = (studentId) => {
    return corReviewedStudents.has(studentId);
  };

  // Subject Crediting Functions for Transferees
  const handleSubjectCrediting = (student) => {
    setSelectedStudentForCrediting(student);
    setShowCreditingModal(true);
    // Fetch available subjects for crediting
    fetchSubjectsForCrediting(student);
  };

  const fetchSubjectsForCrediting = async (student) => {
    try {
      // Get subjects that can be credited based on student's intended strand
      const strandCode = student.strand_preferences?.[0] || 'STEM';
      const response = await fetch(`/coordinator/subjects-for-strand/${strandCode}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Error fetching subjects for crediting:', error);
    }
  };

  const handleCreditSubject = (subjectId, grade, semester) => {
    setCreditedSubjects(prev => ({
      ...prev,
      [selectedStudentForCrediting.id]: {
        ...prev[selectedStudentForCrediting.id],
        [subjectId]: {
          grade: parseFloat(grade),
          semester: semester,
          is_credited: true
        }
      }
    }));
  };

  const removeCreditedSubject = (subjectId) => {
    setCreditedSubjects(prev => {
      const studentCredits = { ...prev[selectedStudentForCrediting.id] };
      delete studentCredits[subjectId];
      return {
        ...prev,
        [selectedStudentForCrediting.id]: studentCredits
      };
    });
  };

  const getStudentCreditedSubjects = (studentId) => {
    return creditedSubjects[studentId] || {};
  };

  // Handle transferee subject credit toggle
  const handleSubjectCreditToggle = (subjectId, isChecked) => {
    if (isChecked) {
      setCreditedSubjects(prev => ({
        ...prev,
        [subjectId]: true
      }));
      // Don't set automatic grade - let user input the actual grade
    } else {
      setCreditedSubjects(prev => {
        const newCredits = { ...prev };
        delete newCredits[subjectId];
        return newCredits;
      });
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
    if (Object.keys(creditedSubjects).length === 0 && !previousSchoolData.last_school.trim()) {
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
      const creditedSubjectIds = Object.keys(creditedSubjects);
      if (creditedSubjectIds.length > 0) {
        // Validate that all credited subjects have grades
        const missingGrades = creditedSubjectIds.filter(subjectId => 
          !subjectGrades[subjectId] || subjectGrades[subjectId] < 75 || subjectGrades[subjectId] > 100
        );
        
        if (missingGrades.length > 0) {
          throw new Error('Please enter valid grades (75-100) for all credited subjects');
        }
        
        const creditData = creditedSubjectIds.map(subjectId => {
          const subject = subjects.find(s => s.id == subjectId);
          return {
            subject_id: subjectId,
            grade: subjectGrades[subjectId],
            semester: subject?.semester || '1st Semester',
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

  // Enroll transferee student with credited subjects in one action
  const enrollTransfereeWithCredits = async () => {
    if (!selectedStudentForCOR || !selectedSection || !selectedStrand) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please select strand and section, and add at least one credited subject.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Check if credited subjects are selected
    const creditedSubjectIds = Object.keys(creditedSubjects);
    if (creditedSubjectIds.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No Credited Subjects',
        text: 'Please select at least one credited subject with a valid grade.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Validate that all credited subjects have valid grades
    const missingGrades = creditedSubjectIds.filter(subjectId => 
      !subjectGrades[subjectId] || subjectGrades[subjectId] < 75 || subjectGrades[subjectId] > 100
    );
    
    if (missingGrades.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Grades',
        text: 'Please enter valid grades (75-100) for all credited subjects.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare credited subjects data
      const creditData = creditedSubjectIds.map(subjectId => {
        const subject = subjects.find(s => s.id == subjectId);
        return {
          subject_id: subjectId,
          grade: subjectGrades[subjectId],
          semester: subject?.semester || '1st Semester'
        };
      });

      // Find the strand ID from the selected strand code
      const strandObj = availableStrands.find(s => s.code === selectedStrand);
      const strandId = strandObj ? strandObj.id : null;

      if (!strandId) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Strand',
          text: 'Please select a valid strand.',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }

      console.log('Enrolling transferee with data:', {
        student_id: selectedStudentForCOR.user.id,
        section_id: selectedSection,
        strand_id: strandId,
        strand_code: selectedStrand,
        credited_subjects: creditData,
        credited_subjects_count: creditData.length,
        creditedSubjects_array: creditedSubjectIds,
        creditedSubjects_length: creditedSubjectIds.length,
        subjectGrades: subjectGrades,
        school_year: '2023-2024'
      });

      // Use Inertia router for proper authentication handling
      router.post('/faculty/transferee/enroll-with-credits', {
        student_id: selectedStudentForCOR.user.id,
        section_id: selectedSection,
        strand_id: strandId, // Use strand ID instead of code
        credited_subjects: creditData,
        school_year: '2023-2024', // Previous school year for credits
        remarks: 'Transferred student with credited subjects'
      }, {
        onSuccess: (response) => {
          // Remove student from transferee list
          setTransfereeStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
          
          // Close modal and reset states
          setShowCORModal(false);
          setSelectedStudentForCOR(null);
          setSelectedStrand("");
          setSelectedSection("");
          setSelectedSubjects([]);
          setClassSchedules([]);
          setCreditedSubjects({});
          setSubjectGrades({});
          setIsStudentEnrolled(false);

          // Show success message
          Swal.fire({
            icon: 'success',
            title: 'Enrollment Successful!',
            text: `Student enrolled successfully with credited subjects.`,
            timer: 3000,
            showConfirmButton: false
          });
        },
        onError: (errors) => {
          console.error('Error enrolling transferee student:', errors);
          Swal.fire({
            icon: 'error',
            title: 'Enrollment Failed',
            text: errors.message || 'Failed to enroll student. Please try again.',
            confirmButtonColor: '#3b82f6'
          });
        },
        onFinish: () => {
          setIsSubmitting(false);
        }
      });

    } catch (error) {
      console.error('Error enrolling transferee student:', error);
      Swal.fire({
        icon: 'error',
        title: 'Enrollment Failed',
        text: error.message || 'Failed to enroll student. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
      setIsSubmitting(false);
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
      } else if (activeTab === 'transferee') {
        setTransfereeStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
      } else if (activeTab === 'continuing') {
        setContinuingStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
      }
      
      // Close modal and reset states
      setShowCORModal(false);
      setSelectedStudentForCOR(null);
      setSelectedStrand("");
      setSelectedSection("");
      setSelectedSubjects([]);
      setClassSchedules([]); // Clear schedules
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
    setTransfereeStudents(initialTransfereeStudents);
    setRejectedStudents(initialRejectedStudents);
  }, [initialNewStudents, initialTransfereeStudents, initialRejectedStudents]);

  // NEW: Auto-fetch subjects whenever the selected strand changes
  useEffect(() => {
    if (selectedStrand) {
      fetchSubjectsForStrand(selectedStrand);
    } else {
      setSubjects([]);
    }
    
    // Clear credited subjects when strand changes (since available subjects change)
    console.log('Clearing credited subjects due to strand change. Previous count:', Object.keys(creditedSubjects).length);
    setCreditedSubjects({});
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
    if (!strandCode || strandCode === 'No preferences specified' || strandCode === 'all') {
      setSubjects([]);
      return;
    }

    // Check if strandCode is a valid strand from availableStrands
    const validStrand = availableStrands.find(strand => strand.code === strandCode);
    if (!validStrand) {
      console.log('Invalid strand code, skipping subject fetch:', strandCode);
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


  const handleApproveStudent = async (studentId) => {
    let student = null;
    if (activeTab === 'new') {
      student = newStudents.find(s => s.id === studentId);
    } else if (activeTab === 'transferee') {
      student = transfereeStudents.find(s => s.id === studentId);
    } else if (activeTab === 'continuing') {
      student = continuingStudents.find(s => s.id === studentId);
    }
    
    if (student) {
      // For transferee students, fetch complete data including previous school info
      // TEMPORARILY DISABLED - Skip API call due to JSON parsing error
      if (false && (activeTab === 'transferee' || student.student_status === 'Transferee')) {
        try {
          const response = await fetch(`/faculty/student-details/${studentId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Student details API response:', data);
            // Merge the complete data with the existing student object
            const completeStudent = {
              ...student,
              ...(data.student || data),
              credited_subjects: data.credited_subjects || [],
              is_transferee: data.is_transferee || false,
              previous_school: data.previous_school || data.last_school,
              last_school: data.last_school || student.last_school,
              // Convert credited subjects to IDs for easy lookup
              credited_subject_ids: (data.credited_subjects || []).map(cs => cs.id)
            };
            
            setSelectedStudentForCOR(completeStudent);
            
            // Auto-select strand and section if available in student data
            console.log('Complete student data for auto-selection:', completeStudent);
            
            // Try multiple ways to get strand information
            let strandToSelect = null;
            if (completeStudent.strand_preferences && completeStudent.strand_preferences.length > 0) {
              const firstStrand = completeStudent.strand_preferences[0];
              const potentialStrand = typeof firstStrand === 'object' ? firstStrand.code : firstStrand;
              // Don't use if it's the default "No preferences specified" text
              if (potentialStrand && potentialStrand !== 'No preferences specified') {
                strandToSelect = potentialStrand;
              }
            } else if (completeStudent.strand_code) {
              strandToSelect = completeStudent.strand_code;
            } else if (completeStudent.strand_name) {
              // Find strand code by name
              const strand = availableStrands.find(s => s.name === completeStudent.strand_name);
              strandToSelect = strand ? strand.code : null;
            }
            
            if (strandToSelect) {
              console.log('Auto-selecting strand:', strandToSelect);
              setSelectedStrand(strandToSelect);
            }
            
            // Try multiple ways to get section information
            let sectionToSelect = null;
            if (completeStudent.assigned_section_id) {
              sectionToSelect = completeStudent.assigned_section_id;
            } else if (completeStudent.section_id) {
              sectionToSelect = completeStudent.section_id;
            }
            
            if (sectionToSelect) {
              console.log('Auto-selecting section:', sectionToSelect);
              setSelectedSection(sectionToSelect);
            }
          } else {
            // Log the error response
            console.error('API request failed:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url
            });
            
            try {
              const errorText = await response.text();
              console.error('Error response body:', errorText.substring(0, 500));
            } catch (e) {
              console.error('Could not read error response:', e);
            }
            
            // Fallback to original student data if fetch fails
            setSelectedStudentForCOR(student);
            
            // Try to auto-select from original student data
            if (student.strand_preferences && student.strand_preferences.length > 0) {
              const firstStrand = student.strand_preferences[0];
              const strandCode = typeof firstStrand === 'object' ? firstStrand.code : firstStrand;
              // Don't auto-select if it's the default "No preferences specified" text
              if (strandCode && strandCode !== 'No preferences specified') {
                setSelectedStrand(strandCode);
              }
            }
            
            if (student.assigned_section_id) {
              setSelectedSection(student.assigned_section_id);
            }
          }
        } catch (error) {
          console.error('Error fetching complete student data:', error);
          console.error('Response status:', response?.status);
          console.error('Response headers:', response?.headers);
          
          // Try to get the response text to see what was returned
          try {
            const responseText = await response?.text();
            console.error('Response text:', responseText?.substring(0, 500));
          } catch (textError) {
            console.error('Could not read response text:', textError);
          }
          
          // Fallback to original student data
          setSelectedStudentForCOR(student);
        }
      } else {
        // For non-transferee students, use original data
        setSelectedStudentForCOR(student);
        
        // Auto-select strand and section for non-transferee students too
        if (student.strand_preferences && student.strand_preferences.length > 0) {
          const firstStrand = student.strand_preferences[0];
          const strandCode = typeof firstStrand === 'object' ? firstStrand.code : firstStrand;
          // Don't auto-select if it's the default "No preferences specified" text
          if (strandCode && strandCode !== 'No preferences specified') {
            setSelectedStrand(strandCode);
          }
        }
        
        if (student.assigned_section_id) {
          setSelectedSection(student.assigned_section_id);
        }
      }
      
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
          } else if (activeTab === 'transferee') {
            student = transfereeStudents.find(s => s.id === studentId);
            setTransfereeStudents(prev => prev.filter(s => s.id !== studentId));
          } else if (activeTab === 'continuing') {
            student = continuingStudents.find(s => s.id === studentId);
            setContinuingStudents(prev => prev.filter(s => s.id !== studentId));
          }
          if (student) {
            setRejectedStudents(prev => [...prev, student]);
          }
        },
        onError: () => Swal.fire('Error', 'Failed to reject enrollment', 'error')
      });
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
        const data = await response.json();
        // Handle both old format (direct student) and new format (with credited_subjects)
        const student = data.student || data;
        student.credited_subjects = data.credited_subjects || [];
        student.is_transferee = data.is_transferee || false;
        student.previous_school = data.previous_school || student.last_school;
        
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

  const handleEnrollStudent = async (studentId) => {
    // Find the student
    let student = null;
    if (activeTab === 'new') {
      student = newStudents.find(s => s.id === studentId);
    } else if (activeTab === 'transferee') {
      student = transfereeStudents.find(s => s.id === studentId);
    } else if (activeTab === 'continuing') {
      student = continuingStudents.find(s => s.id === studentId);
    }

    if (!student) {
      Swal.fire({
        icon: 'error',
        title: 'Student Not Found',
        text: 'Unable to find student information.'
      });
      return;
    }

    // Check if COR has been reviewed
    if (!isCORReviewed(studentId)) {
      Swal.fire({
        icon: 'warning',
        title: 'COR Review Required',
        html: `
          <div class="text-left">
            <p class="mb-3"><strong>⚠️ Certificate of Registration (COR) must be reviewed before enrollment.</strong></p>
            <p class="text-sm text-gray-600">Please:</p>
            <ul class="text-sm text-gray-600 list-disc list-inside mt-2">
              <li>Click "Review COR" to examine the student's academic records</li>
              <li>Verify the appropriate strand and section selection</li>
              ${student.user?.student_type === 'transferee' ? '<li>Evaluate and credit applicable subjects from previous school</li>' : ''}
              <li>Mark COR as reviewed before proceeding with enrollment</li>
            </ul>
          </div>
        `,
        confirmButtonText: 'Review COR Now',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleCORReview(student);
        }
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Enroll Student',
      html: `
        <div class="text-left">
          <p><strong>Student:</strong> ${student.user?.firstname} ${student.user?.lastname}</p>
          <p><strong>Email:</strong> ${student.user?.email}</p>
          <p><strong>Preferred Strand:</strong> ${student.strand_preferences?.[0] || 'Not specified'}</p>
          <br>
          <p class="text-sm text-gray-600">This will enroll the student with their complete academic year schedule (1st and 2nd semester subjects) based on the registrar's class assignments.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Enroll Student',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    // Debug: Log available sections and strands
    console.log('Available strands:', availableStrands);
    console.log('Available sections:', availableSections);
    
    // Show strand and section selection dialog first
    const { value: formValues } = await Swal.fire({
      title: 'Select Section & Strand',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-blue-50 p-3 rounded">
            <p><strong>Student:</strong> ${student.user?.firstname} ${student.user?.lastname}</p>
            <p><strong>Email:</strong> ${student.user?.email}</p>
            <p><strong>Type:</strong> ${student.user?.student_type || 'New'}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Strand:</label>
            <select id="swal-strand" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Choose Strand</option>
              ${availableStrands.map(strand => 
                `<option value="${strand.code}">${strand.name} (${strand.code})</option>`
              ).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Section:</label>
            <select id="swal-section" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Choose Section</option>
              ${availableSections.map(section => 
                `<option value="${section.id}">${section.section_name || section.name || 'Section ' + section.id}</option>`
              ).join('')}
            </select>
            ${availableSections.length === 0 ? '<p class="text-sm text-red-600 mt-1">No sections available. Please create sections first.</p>' : ''}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enroll Student',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const strand = document.getElementById('swal-strand').value;
        const section = document.getElementById('swal-section').value;
        
        if (!strand || !section) {
          Swal.showValidationMessage('Please select both strand and section');
          return false;
        }
        
        return { strand, section };
      }
    });

    if (!formValues) return;

    try {
      // Get credited subjects for transferees
      const studentCreditedSubjects = getStudentCreditedSubjects(student.id);
      const creditedSubjectsArray = Object.entries(studentCreditedSubjects).map(([subjectId, creditData]) => ({
        subject_id: parseInt(subjectId),
        grade: creditData.grade,
        semester_completed: creditData.semester,
        is_credited: creditData.is_credited
      }));

      router.post(`/coordinator/students/${student.id}/finalize`, {
        strand: formValues.strand,
        section_id: parseInt(formValues.section),
        subjects: [], // Backend will automatically assign all subjects
        credited_subjects: creditedSubjectsArray // Include credited subjects for transferees
      }, {
        onSuccess: (response) => {
          console.log('Enrollment success response:', response);
          
          const selectedStrand = availableStrands.find(s => s.code === formValues.strand);
          const selectedSection = availableSections.find(s => s.id == formValues.section);
          
          // Use response data if available, fallback to local data
          const strandInfo = response?.props?.data?.strand || selectedStrand;
          const sectionInfo = response?.props?.data?.section || selectedSection;
          
          Swal.fire({
            icon: 'success',
            title: 'Student Enrolled Successfully!',
            html: `
              <div class="text-center">
                <p class="mb-2">${student.user?.firstname} ${student.user?.lastname} has been enrolled!</p>
                <p class="text-sm text-blue-600"><strong>Strand:</strong> ${strandInfo?.name || 'Unknown'} (${strandInfo?.code || 'N/A'})</p>
                <p class="text-sm text-blue-600"><strong>Section:</strong> ${sectionInfo?.section_name || sectionInfo?.name || 'Unknown'}</p>
                <p class="text-sm text-gray-600 mt-2">Complete academic year schedule assigned (1st & 2nd semester)</p>
              </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          });

          // Remove student from current list
          if (activeTab === 'new') {
            setNewStudents(prev => prev.filter(s => s.id !== student.id));
          } else if (activeTab === 'transferee') {
            setTransfereeStudents(prev => prev.filter(s => s.id !== student.id));
          } else if (activeTab === 'continuing') {
            setContinuingStudents(prev => prev.filter(s => s.id !== student.id));
          }
        },
        onError: (errors) => {
          console.error('Enrollment error:', errors);
          const errorMessage = Object.values(errors).flat().join('. ') || 'Failed to enroll student. Please try again.';
          Swal.fire({
            icon: 'error',
            title: 'Enrollment Failed',
            text: errorMessage,
            confirmButtonColor: '#ef4444'
          });
        }
      });
    } catch (error) {
      console.error('Error during enrollment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred. Please try again.'
      });
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

    // Validate transferee credits if any are selected
    const isTransferee = selectedStudentForCOR?.student_type === 'transferee' || 
                        selectedStudentForCOR?.user?.student_type === 'transferee' || 
                        selectedStudentForCOR?.student_status === 'Transferee';
    
    const creditedSubjectIds = Object.keys(creditedSubjects);
    if (isTransferee && creditedSubjectIds.length > 0) {
      // Check if all credited subjects have valid grades
      const missingGrades = creditedSubjectIds.filter(subjectId => 
        !subjectGrades[subjectId] || subjectGrades[subjectId] < 75 || subjectGrades[subjectId] > 100
      );
      
      if (missingGrades.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Grades',
          text: 'Please enter valid grades (75-100) for all credited subjects before enrolling the student.',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      router.post(`/coordinator/students/${selectedStudentForCOR.id}/finalize`, {
        strand: selectedStrand, // Keep as strand code for regular enrollment
        section_id: selectedSection,
        // Include subjects only if selected; backend accepts nullable array
        subjects: selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : undefined,
        // Include transferee credit information
        student_type: selectedStudentForCOR.user?.student_type || selectedStudentForCOR.student_status,
        credited_subjects: isTransferee ? Object.keys(creditedSubjects).map(subjectId => ({
          subject_id: subjectId,
          grade: subjectGrades[subjectId],
          semester_completed: subjects.find(s => s.id == subjectId)?.semester || '1st Semester',
          is_credited: true
        })) : []
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
      case 'transferee':
        students = transfereeStudents;
        break;
      case 'continuing':
        students = continuingStudents;
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

  const getStudentCount = (tab) => {
    switch (tab) {
      case 'new':
        return newStudents.length;
      case 'transferee':
        return transfereeStudents.length;
      case 'continuing':
        return continuingStudents.length;
      case 'rejected':
        return rejectedStudents.length;
      default:
        return 0;
    }
  };

  const handleCreditTransferee = (student) => {
    setSelectedTransferee(student);
    setShowCreditModal(true);
  };

  const handleViewCOR = (student) => {
    router.visit(`/coordinator/student/${student.id}/cor`);
  };

  const handleCreditSuccess = () => {
    router.reload();
  };

  // Handle COR preview
  const handlePreviewCOR = (student) => {
    setSelectedStudentForPreview(student);
    setShowCORPreviewModal(true);
  };

  // Handle enrollment confirmation from COR preview
  const handleConfirmEnrollmentFromPreview = (student, strandId, sectionId) => {
    // Close the preview modal first
    setShowCORPreviewModal(false);
    setSelectedStudentForPreview(null);

    // Proceed with enrollment using the selected strand and section
    router.post(`/coordinator/students/${student.id}/finalize`, {
      strand: strandId,
      section_id: sectionId
    }, {
      onSuccess: () => {
        Swal.fire({
          title: 'Student Enrolled!',
          text: `${student.firstname} ${student.lastname} has been successfully enrolled.`,
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
        // Refresh the page to show updated data
        router.reload();
      },
      onError: (errors) => {
        console.error('Enrollment errors:', errors);
        Swal.fire({
          title: 'Enrollment Failed',
          text: 'Failed to enroll student. Please try again.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <FacultySidebar onToggle={setIsCollapsed} />
        <main className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} p-8 bg-gray-50 min-h-screen transition-all duration-300`}>
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
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

        {/* Quick Access to Grade Progression */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
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
              onClick={() => router.visit('/faculty/progression')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FaArrowRight className="w-4 h-4" />
              <span>Go to Progression Page</span>
            </button>
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
                <p className="text-sm font-medium text-gray-600">Transferees</p>
                <p className="text-2xl font-bold text-purple-600">{transfereeStudents.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaUserGraduate className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Continuing Students</p>
                <p className="text-2xl font-bold text-green-600">{continuingStudents.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaSchool className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
                { key: 'transferee', label: 'Transferee Students', color: 'purple', icon: 'FaUserGraduate' },
                { key: 'continuing', label: 'Continuing Students', color: 'green', icon: 'FaSchool' },
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
                  {tab.label} ({getStudentCount(tab.key)})
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
                        {/* Transferee-specific buttons */}
                        {activeTab === 'transferee' && (
                          <button
                            onClick={() => handleCreditTransferee(student)}
                            title="Credit subjects from previous school"
                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <FaAward className="text-sm" />
                            <span>Credit Subjects</span>
                          </button>
                        )}
                        
                        {/* COR viewing for enrolled students */}
                        {student.enrollment_status === 'enrolled' && allowFacultyCorPrint && (
                          <button
                            onClick={() => handleViewCOR(student)}
                            title="View Certificate of Registration"
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <FaIdCard className="text-sm" />
                            <span>View COR</span>
                          </button>
                        )}

                        {(activeTab === 'new' || activeTab === 'transferee' || activeTab === 'continuing') && (
                          <>
                            <button
                              onClick={() => handlePreviewCOR(student)}
                              title="Preview Certificate of Registration before enrollment"
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <FaEye className="text-sm" />
                              <span>Preview COR</span>
                            </button>
                            
                            {/* COR Review Button */}
                            <button
                              onClick={() => handleCORReview(student)}
                              title="Review Certificate of Registration (Required before enrollment)"
                              className={`px-3 py-1 rounded-lg transition-colors duration-200 flex items-center space-x-1 ${
                                isCORReviewed(student.id) 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                            >
                              <FaClipboardCheck className="text-sm" />
                              <span>{isCORReviewed(student.id) ? 'COR Reviewed ✓' : 'Review COR'}</span>
                            </button>

                            {/* Subject Crediting Button for Transferees */}
                            {student.user?.student_type === 'transferee' && (
                              <button
                                onClick={() => handleSubjectCrediting(student)}
                                title="Evaluate and credit subjects from previous school"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center space-x-1"
                              >
                                <FaGraduationCap className="text-sm" />
                                <span>Credit Subjects</span>
                              </button>
                            )}
                            
                            {/* Enrollment Button - Only enabled after COR review */}
                            <button
                              onClick={() => handleEnrollStudent(student.id)}
                              title={isCORReviewed(student.id) 
                                ? "Enroll student and assign complete academic year schedule (1st & 2nd semester)" 
                                : "COR must be reviewed before enrollment"
                              }
                              disabled={!isCORReviewed(student.id)}
                              className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 font-medium ${
                                isCORReviewed(student.id)
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <FaUserCheck className="text-sm" />
                              <span>Enroll Student</span>
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
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FaUser className="text-blue-600 text-sm" />
                    </div>
                    Personal Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900 font-medium">{selectedStudent.user?.firstname} {selectedStudent.user?.lastname}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Name Extension</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.extension_name || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Row 2 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.user?.email}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Learner Reference Number (LRN)</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900 font-mono">{selectedStudent.lrn || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Row 3 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900 font-medium">{selectedStudent.grade_level || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Student Status</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedStudent.student_status === 'New Student' ? 'bg-green-100 text-green-800' :
                          selectedStudent.student_status === 'Transferee' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedStudent.student_status || 'New Student'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Row 4 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.age || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Sex</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.sex || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Row 5 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">
                          {selectedStudent.birthdate ?
                            new Date(selectedStudent.birthdate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.birth_place || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Row 6 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Religion</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.religion || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Complete Address</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <FaGraduationCap className="text-green-600 text-sm" />
                    </div>
                    Academic Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Strand Preferences</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[120px]">
                        <div className="space-y-2">
                          {selectedStudent.strand_preferences && selectedStudent.strand_preferences.length > 0 ? (
                            selectedStudent.strand_preferences.map((preference, index) => (
                              <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-gray-100">
                                <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="text-gray-800 font-medium">
                                  {typeof preference === 'object' ? preference.name : preference}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-gray-500 italic">No strand preferences submitted</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Last Grade Completed</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-gray-900 font-medium">{selectedStudent.last_grade || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Last School Year</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-gray-900 font-medium">{selectedStudent.last_sy || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <FaInfoCircle className="text-purple-600 text-sm" />
                    </div>
                    Additional Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">IP Community Member</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedStudent.ip_community === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedStudent.ip_community || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">4Ps Beneficiary</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedStudent.four_ps === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedStudent.four_ps || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Row 2 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">PWD ID</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.pwd_id || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Last School Attended</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{selectedStudent.last_school || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Row 3 - Guardian Information */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Guardian Name</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900 font-medium">{selectedStudent.guardian_name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Guardian Contact</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900 font-mono">{selectedStudent.guardian_contact || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transferee Credit Management - Only show for transferee students */}
              {selectedStudent.is_transferee && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <FaExchangeAlt className="text-indigo-600 text-sm" />
                      </div>
                      Transferee Credit Management
                    </h3>
                  </div>
                  <div className="p-6">
                    {/* Previous School Information */}
                    <div className="mb-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Previous School</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-gray-900 font-medium">{selectedStudent.previous_school || selectedStudent.last_school || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Credited Subjects */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-gray-800">Credited Subjects</h4>
                        <span className="text-sm text-gray-600">
                          {selectedStudent.credited_subjects?.length || 0} subjects credited
                        </span>
                      </div>
                      
                      {selectedStudent.credited_subjects && selectedStudent.credited_subjects.length > 0 ? (
                        <div className="space-y-3">
                          {selectedStudent.credited_subjects.map((subject, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="w-6 h-6 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center justify-center">
                                    ✓
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-900">{subject.name}</p>
                                    <p className="text-sm text-gray-600">Code: {subject.code}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-4">
                                  {subject.grade && (
                                    <div className="text-center">
                                      <p className="text-sm font-medium text-gray-700">Grade</p>
                                      <p className="text-lg font-bold text-green-600">{subject.grade}</p>
                                    </div>
                                  )}
                                  {subject.semester_completed && (
                                    <div className="text-center">
                                      <p className="text-sm font-medium text-gray-700">Semester</p>
                                      <p className="text-sm text-gray-900">{subject.semester_completed}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <FaInfoCircle className="mx-auto text-4xl text-gray-400 mb-4" />
                          <p className="text-gray-600 font-medium">No credited subjects found</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Credited subjects will be excluded from the student's COR when enrolled.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Note about COR exclusion */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <FaInfoCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Important Note</p>
                          <p className="text-sm text-blue-700 mt-1">
                            Credited subjects will automatically be excluded from this student's Certificate of Registration (COR) 
                            when they are enrolled. Only remaining subjects for their chosen strand will appear in their schedule.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents & Images */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <FaFileAlt className="text-orange-600 text-sm" />
                    </div>
                    Submitted Documents
                  </h3>
                </div>
                <div className="p-6">
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
                      (selectedStudentForCOR.student_type === 'new' || selectedStudentForCOR.user?.student_type === 'new' || selectedStudentForCOR.student_status === 'New Student') ? 'bg-blue-100 text-blue-800' :
                      (selectedStudentForCOR.student_type === 'transferee' || selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee') ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(selectedStudentForCOR.student_type === 'new' || selectedStudentForCOR.user?.student_type === 'new' || selectedStudentForCOR.student_status === 'New Student') ? '🆕 New Student' :
                       (selectedStudentForCOR.student_type === 'transferee' || selectedStudentForCOR.user?.student_type === 'transferee' || selectedStudentForCOR.student_status === 'Transferee') ? '🎓 Transferee Student' :
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

                {/* Transferee Credit Management Section - Integrated into Enrollment Process */}
                {(selectedStudentForCOR?.student_type === 'transferee' || selectedStudentForCOR?.user?.student_type === 'transferee' || selectedStudentForCOR?.student_status === 'Transferee') && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg print:hidden">
                    <h4 className="text-sm font-semibold mb-3 text-purple-800 flex items-center">
                      <FaUserGraduate className="mr-2" />
                      Transferee Credit Management
                    </h4>
                    {/* Previous School Information */}
                    <div className="mb-4 p-3 bg-white border border-purple-200 rounded">
                      <h5 className="text-sm font-medium text-purple-800 mb-2">Previous School Information</h5>
                      
                      {/* Show existing data if available */}
                      {(selectedStudentForCOR?.previous_school || selectedStudentForCOR?.last_school) ? (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-2">
                          <strong>Last School:</strong> {selectedStudentForCOR.previous_school || selectedStudentForCOR.last_school}
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
                                  
                                  const response = await fetch(`/faculty/transferee-previous-school/${selectedStudentForCOR.id}`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                      'Accept': 'application/json',
                                    },
                                    credentials: 'same-origin',
                                    body: JSON.stringify({
                                      previous_school: previousSchoolData.last_school.trim()
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
                                    
                                    // Update the student data to show the saved school
                                    setSelectedStudentForCOR(prev => ({
                                      ...prev,
                                      previous_school: previousSchoolData.last_school.trim()
                                    }));
                                    
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
                        const isAlreadyCredited = creditedSubjects[subject.id] || false;
                        return (
                        <div key={subject.id} className={`flex items-center justify-between p-2 border rounded ${
                          isAlreadyCredited ? 'bg-green-50 border-green-200' : 'bg-white border-purple-200'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={`credit-${subject.id}`}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  console.log('Adding subject to credited subjects:', subject.id, subject.name);
                                  setCreditedSubjects(prev => ({
                                    ...prev,
                                    [subject.id]: true
                                  }));
                                  
                                  // Set a default grade that the user can modify
                                  if (!subjectGrades[subject.id]) {
                                    setSubjectGrades(prev => ({ ...prev, [subject.id]: 85 }));
                                  }
                                } else {
                                  console.log('Removing subject from credited subjects:', subject.id, subject.name);
                                  setCreditedSubjects(prev => {
                                    const newCredits = { ...prev };
                                    delete newCredits[subject.id];
                                    return newCredits;
                                  });
                                  
                                  // Remove the grade as well
                                  setSubjectGrades(prev => {
                                    const newGrades = { ...prev };
                                    delete newGrades[subject.id];
                                    return newGrades;
                                  });
                                }
                              }}
                              checked={creditedSubjects[subject.id] || false}
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
                              onChange={(e) => {
                                setSubjectGrades(prev => ({
                                  ...prev, 
                                  [subject.id]: parseFloat(e.target.value) || ''
                                }));
                              }}
                              className={`w-16 px-2 py-1 text-xs border rounded focus:ring-purple-500 focus:border-purple-500 ${
                                creditedSubjects[subject.id] && !subjectGrades[subject.id] 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              id={`grade-${subject.id}`}
                              disabled={!creditedSubjects[subject.id]}
                              required={creditedSubjects[subject.id] || false}
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
                    
                    {/* Credits Summary */}
                    {Object.keys(creditedSubjects).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <div className="text-sm text-purple-700 mb-2">
                          <strong>{Object.keys(creditedSubjects).length}</strong> subject(s) selected for credit:
                        </div>
                        <div className="space-y-1 text-xs">
                          {Object.keys(creditedSubjects).map(subjectId => {
                            const subject = subjects.find(s => s.id == subjectId);
                            const grade = subjectGrades[subjectId];
                            return (
                              <div key={subjectId} className="flex justify-between items-center bg-green-50 px-2 py-1 rounded">
                                <span>{subject?.name} ({subject?.code})</span>
                                <span className={`font-medium ${grade >= 75 && grade <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {grade || 'No grade'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-xs text-purple-600">
                          ℹ️ These subjects will be marked as completed and excluded from the class schedule.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Class Schedules Section - Always show for printing */}
                <div className="mt-2">
                  <h4 className="text-xs font-semibold mb-1 text-gray-800">Class Schedule</h4>
                  {/* Transferee credit notes disabled - functionality removed */}
                  {!selectedStrand && (
                    <div className="text-center py-4 text-gray-500 border border-gray-300 rounded-lg print:hidden">
                      <p className="text-sm">Please select a strand to view class schedules</p>
                    </div>
                  )}
                  
                  {/* Manual Load Schedule Button - Show if no schedules loaded */}
                  {selectedStrand && selectedSection && classSchedules.length === 0 && !loadingSchedules && (
                    <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden mb-4">
                      <p className="text-sm text-yellow-800 mb-3">No schedules loaded. Click below to load the class schedule.</p>
                      <button
                        onClick={() => {
                          console.log('Manual schedule load triggered:', {
                            studentId: selectedStudentForCOR?.id,
                            strand: selectedStrand,
                            section: selectedSection
                          });
                          fetchClassSchedulesForStudent(selectedStudentForCOR?.id, selectedStrand, selectedSection);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Load Class Schedule
                      </button>
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
                                      
                                      // Transferee credit marking disabled - functionality removed
                                      // All subjects will display normally without credit markings

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
                      // Check if student is enrolled
                      if (isStudentEnrolled) {
                        // Show confirmation before closing
                        Swal.fire({
                          title: 'Student Already Enrolled',
                          text: 'This student is already enrolled. Do you want to close the COR view?',
                          icon: 'info',
                          showCancelButton: true,
                          confirmButtonColor: '#3085d6',
                          cancelButtonColor: '#d33',
                          confirmButtonText: 'Keep Enrolled & Close',
                          cancelButtonText: 'Stay Here'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            // Remove student from appropriate list
                            if (activeTab === 'new') {
                              setNewStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            } else if (activeTab === 'transferee') {
                              setTransfereeStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            } else if (activeTab === 'continuing') {
                              setContinuingStudents(prev => prev.filter(s => s.id !== selectedStudentForCOR.id));
                            }
                            setShowCORModal(false);
                            setSelectedStudentForCOR(null);
                            setSelectedStrand("");
                            setSelectedSection("");
                            setSelectedSubjects([]);
                            setClassSchedules([]); // Clear schedules
                            setIsStudentEnrolled(false);
                          }
                        });
                      } else {
                        // If not enrolled yet, just close modal normally
                        setShowCORModal(false);
                        setSelectedStudentForCOR(null);
                        setSelectedStrand("");
                        setSelectedSection("");
                        setSelectedSubjects([]);
                        setClassSchedules([]); // Clear schedules
                        setIsStudentEnrolled(false);
                      }
                    }}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  
                  {/* Mark as Reviewed Button */}
                  <button
                    onClick={() => {
                      markCORAsReviewed(selectedStudentForCOR.id);
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors flex items-center space-x-1 ${
                      isCORReviewed(selectedStudentForCOR.id)
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                    disabled={isCORReviewed(selectedStudentForCOR.id)}
                  >
                    <FaClipboardCheck className="w-3 h-3" />
                    <span>{isCORReviewed(selectedStudentForCOR.id) ? 'COR Reviewed ✓' : 'Mark as Reviewed'}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      // Check if this is a transferee student
                      const isTransferee = selectedStudentForCOR?.student_type === 'transferee' || 
                                          selectedStudentForCOR?.user?.student_type === 'transferee' || 
                                          selectedStudentForCOR?.student_status === 'Transferee';
                      
                      console.log('Enrollment button clicked:', {
                        isTransferee,
                        creditedSubjectsLength: Object.keys(creditedSubjects).length,
                        creditedSubjects: creditedSubjects,
                        selectedStrand,
                        selectedSection
                      });
                      
                      if (isTransferee && Object.keys(creditedSubjects).length > 0) {
                        console.log('Calling enrollTransfereeWithCredits for transferee with credits');
                        // Use new combined enrollment for transferees with credits
                        enrollTransfereeWithCredits();
                      } else {
                        console.log('Calling handleFinalizeEnrollment for regular enrollment');
                        // Use existing enrollment for other students
                        handleFinalizeEnrollment();
                      }
                    }}
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

      {/* Subject Crediting Modal for Transferees */}
      {showCreditingModal && selectedStudentForCrediting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaGraduationCap className="text-xl" />
                <div>
                  <h2 className="text-lg font-semibold">Subject Crediting - Transferee Student</h2>
                  <p className="text-sm opacity-90">
                    {selectedStudentForCrediting?.user?.firstname} {selectedStudentForCrediting?.user?.lastname}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreditingModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">📋 Subject Crediting Instructions</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Review the student's previous academic records</li>
                  <li>• Select subjects that are equivalent to current curriculum</li>
                  <li>• Enter the actual grade received (75-100)</li>
                  <li>• Credited subjects will be excluded from enrollment</li>
                  <li>• Double-check all entries before finalizing</li>
                </ul>
              </div>

              {/* Credited Subjects List */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Credited Subjects</h3>
                {Object.keys(getStudentCreditedSubjects(selectedStudentForCrediting.id)).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(getStudentCreditedSubjects(selectedStudentForCrediting.id)).map(([subjectId, creditData]) => {
                      const subject = subjects.find(s => s.id == subjectId);
                      return (
                        <div key={subjectId} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="font-medium text-green-800">
                              {subject?.subject_code} - {subject?.subject_name}
                            </p>
                            <p className="text-sm text-green-600">
                              Grade: {creditData.grade} | Semester: {creditData.semester}
                            </p>
                          </div>
                          <button
                            onClick={() => removeCreditedSubject(subjectId)}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Remove credited subject"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaGraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No subjects credited yet</p>
                    <p className="text-sm">Add subjects from the student's previous school</p>
                  </div>
                )}
              </div>

              {/* Add Credit Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Add Subject Credit</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Subject</option>
                      {subjects.filter(subject => 
                        !getStudentCreditedSubjects(selectedStudentForCrediting.id)[subject.id]
                      ).map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_code} - {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade (75-100)
                    </label>
                    <input
                      type="number"
                      min="75"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="85"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                    </select>
                  </div>
                </div>
                
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FaPlus className="w-4 h-4" />
                  <span>Add Credit</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setShowCreditingModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreditingModal(false);
                  Swal.fire({
                    icon: 'success',
                    title: 'Subject Credits Saved',
                    text: 'Credited subjects have been saved for this transferee student.',
                    timer: 2000,
                    showConfirmButton: false
                  });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <FaCheck className="w-4 h-4" />
                <span>Save Credits</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Transferee Credit Modal */}
      <TransfereeCreditModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        student={selectedTransferee}
        strands={strands}
        onSuccess={handleCreditSuccess}
      />

      {/* COR Preview Modal */}
      <CORPreviewModal
        isOpen={showCORPreviewModal}
        onClose={() => setShowCORPreviewModal(false)}
        student={selectedStudentForPreview}
        strands={strands}
        sections={sections}
        sectionsByStrand={sectionsByStrand}
        onConfirmEnrollment={handleConfirmEnrollmentFromPreview}
      />

    </div>
  );
}
