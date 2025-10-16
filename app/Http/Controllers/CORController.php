<?php

namespace App\Http\Controllers;

use App\Models\CertificateOfRegistration;
use App\Models\Enrollment;
use App\Services\CORService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
// PDF functionality will be added when DomPDF package is installed

class CORController extends Controller
{
    protected $corService;

    public function __construct(CORService $corService)
    {
        $this->corService = $corService;
    }

    /**
     * Display COR for a student
     */
    public function show($corId)
    {
        $user = Auth::user();
        
        $cor = CertificateOfRegistration::with([
            'classDetails.class.subject',
            'classDetails.class.faculty',
            'student',
            'section',
            'strand',
            'schoolYear',
            'enrollment.studentPersonalInfo'
        ])->findOrFail($corId);

        // Check permissions
        if ($user->role === 'student' && $cor->student_id !== $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        if (!in_array($user->role, ['student', 'registrar', 'coordinator', 'faculty'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        return Inertia::render('COR/ViewCOR', [
            'cor' => [
                'id' => $cor->id,
                'cor_number' => $cor->cor_number,
                'registration_date' => $cor->registration_date->format('F d, Y'),
                'semester' => $cor->semester,
                'year_level' => $cor->year_level,
                'status' => $cor->status,
                'print_count' => $cor->print_count,
                'student' => [
                    'id' => $cor->student->id,
                    'name' => $cor->student->firstname . ' ' . $cor->student->lastname,
                    'email' => $cor->student->email,
                    'lrn' => $cor->studentPersonalInfo->lrn ?? 'N/A'
                ],
                'section' => [
                    'id' => $cor->section->id,
                    'name' => $cor->section->section_name,
                    'year_level' => $cor->section->year_level
                ],
                'strand' => [
                    'id' => $cor->strand->id,
                    'name' => $cor->strand->name,
                    'code' => $cor->strand->code ?? $cor->strand->name
                ],
                'school_year' => [
                    'id' => $cor->schoolYear->id,
                    'year_range' => $cor->schoolYear->year_start . '-' . $cor->schoolYear->year_end,
                    'semester' => $cor->schoolYear->semester
                ],
                'subjects' => $cor->classDetails->map(function ($classDetail) {
                    $class = $classDetail->class;
                    $subject = $class->subject;
                    $faculty = $class->faculty;
                    
                    return [
                        'id' => $classDetail->id,
                        'subject_code' => $subject->code ?? 'N/A',
                        'subject_name' => $subject->name ?? 'N/A',
                        'units' => 1.0, // Default units
                        'schedule' => $class->day_of_week . ' ' . 
                            date('g:i A', strtotime($class->start_time)) . ' - ' . 
                            date('g:i A', strtotime($class->end_time)),
                        'faculty_name' => $faculty ? $faculty->firstname . ' ' . $faculty->lastname : 'TBA',
                        'room' => 'TBA',
                        'is_credited' => false
                    ];
                })
            ],
            'user' => $user,
            'canPrint' => true
        ]);
    }

    /**
     * Get student's current COR
     */
    public function studentCOR()
    {
        $user = Auth::user();
        
        if ($user->role !== 'student') {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $cor = $this->corService->getCORForStudent($user->id);

        if (!$cor) {
            return response()->json([
                'message' => 'No COR found. Please ensure your enrollment has been approved.',
                'cor' => null
            ]);
        }

        return response()->json([
            'cor' => [
                'id' => $cor->id,
                'cor_number' => $cor->cor_number,
                'registration_date' => $cor->registration_date->format('F d, Y'),
                'semester' => $cor->semester,
                'year_level' => $cor->year_level,
                'status' => $cor->status,
                'section_name' => $cor->section->section_name,
                'strand_name' => $cor->strand->name,
                'school_year' => $cor->schoolYear->year_start . '-' . $cor->schoolYear->year_end,
                'subjects_count' => $cor->classDetails->count()
            ]
        ]);
    }

    /**
     * Print COR as PDF
     */
    public function printCOR($corId)
    {
        $user = Auth::user();
        
        $cor = CertificateOfRegistration::with([
            'classDetails.class.subject',
            'classDetails.class.faculty',
            'student',
            'section',
            'strand',
            'schoolYear',
            'enrollment.studentPersonalInfo'
        ])->findOrFail($corId);

        // Check permissions
        if ($user->role === 'student' && $cor->student_id !== $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        // Mark as printed
        $cor->markAsPrinted();

        // Prepare data for PDF
        $data = [
            'cor' => $cor,
            'student' => $cor->student,
            'studentInfo' => $cor->enrollment->studentPersonalInfo,
            'section' => $cor->section,
            'strand' => $cor->strand,
            'schoolYear' => $cor->schoolYear,
            'subjects' => $cor->classDetails->map(function ($classDetail) {
                $class = $classDetail->class;
                $subject = $class->subject;
                $faculty = $class->faculty;
                
                return (object) [
                    'subject_code' => $subject->code ?? 'N/A',
                    'subject_name' => $subject->name ?? 'N/A',
                    'units' => 1.0,
                    'day_of_week' => $class->day_of_week,
                    'start_time' => $class->start_time,
                    'end_time' => $class->end_time,
                    'faculty_name' => $faculty ? $faculty->firstname . ' ' . $faculty->lastname : 'TBA',
                    'is_credited' => false
                ];
            }),
            'printDate' => now()->format('F d, Y'),
            'printTime' => now()->format('h:i A')
        ];

        // TODO: Install DomPDF package: composer require barryvdh/laravel-dompdf
        // For now, return the view directly
        Log::info('COR printed', [
            'cor_id' => $cor->id,
            'printed_by' => $user->id,
            'print_count' => $cor->print_count
        ]);

        // Return HTML view for now (can be printed from browser)
        return view('cor.print', $data);
    }

    /**
     * Generate COR for an enrollment (admin only)
     */
    public function generateCOR(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        try {
            $enrollment = Enrollment::findOrFail($enrollmentId);
            
            if ($enrollment->status !== 'enrolled') {
                return response()->json([
                    'error' => 'Cannot generate COR for non-enrolled student'
                ], 422);
            }

            $cor = $this->corService->generateCOR($enrollment, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'COR generated successfully',
                'cor' => [
                    'id' => $cor->id,
                    'cor_number' => $cor->cor_number
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate COR', [
                'enrollment_id' => $enrollmentId,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to generate COR: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Regenerate COR (admin only)
     */
    public function regenerateCOR($corId)
    {
        $user = Auth::user();
        
        if (!in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        try {
            $cor = CertificateOfRegistration::findOrFail($corId);
            $updatedCOR = $this->corService->regenerateCOR($cor, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'COR regenerated successfully',
                'cor' => [
                    'id' => $updatedCOR->id,
                    'cor_number' => $updatedCOR->cor_number
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to regenerate COR', [
                'cor_id' => $corId,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to regenerate COR: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List CORs for admin
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        if (!in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $query = CertificateOfRegistration::with([
            'student',
            'section',
            'strand',
            'schoolYear'
        ]);

        // Apply filters
        if ($request->school_year_id) {
            $query->where('school_year_id', $request->school_year_id);
        }

        if ($request->semester) {
            $query->where('semester', $request->semester);
        }

        if ($request->strand_id) {
            $query->where('strand_id', $request->strand_id);
        }

        if ($request->section_id) {
            $query->where('section_id', $request->section_id);
        }

        $cors = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'cors' => $cors->items(),
            'pagination' => [
                'current_page' => $cors->currentPage(),
                'last_page' => $cors->lastPage(),
                'per_page' => $cors->perPage(),
                'total' => $cors->total()
            ]
        ]);
    }
}
