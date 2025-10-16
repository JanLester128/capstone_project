<?php

namespace App\Http\Controllers;

use App\Models\FacultyLoad;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get faculty load notifications.
     */
    public function getFacultyLoadNotifications()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['notifications' => []], 403);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['notifications' => []]);
        }

        $facultyLoad = FacultyLoad::where('faculty_id', $user->id)
                                 ->where('school_year_id', $activeSchoolYear->id)
                                 ->first();

        $notifications = [];

        if ($facultyLoad) {
            // Overload notification
            if ($facultyLoad->is_overloaded) {
                $notifications[] = [
                    'id' => 'overload_' . $facultyLoad->id,
                    'type' => 'error',
                    'title' => 'Teaching Load Exceeded',
                    'message' => "You have {$facultyLoad->total_loads} loads assigned, exceeding the maximum of {$facultyLoad->max_loads}. Contact the registrar to adjust your assignments.",
                    'priority' => 'high',
                    'created_at' => now(),
                ];
            }
            // Near limit notification
            elseif ($facultyLoad->utilization_percentage >= 80) {
                $notifications[] = [
                    'id' => 'near_limit_' . $facultyLoad->id,
                    'type' => 'warning',
                    'title' => 'Approaching Load Limit',
                    'message' => "You are using {$facultyLoad->utilization_percentage}% of your teaching capacity. {$facultyLoad->remaining_loads} slots remaining.",
                    'priority' => 'medium',
                    'created_at' => now(),
                ];
            }

            // New assignment notification
            if ($facultyLoad->assigned_at && $facultyLoad->assigned_at->isToday()) {
                $notifications[] = [
                    'id' => 'new_assignment_' . $facultyLoad->id,
                    'type' => 'info',
                    'title' => 'New Teaching Assignment',
                    'message' => 'You have been assigned new teaching loads. Check your schedule for updates.',
                    'priority' => 'medium',
                    'created_at' => $facultyLoad->assigned_at,
                ];
            }
        } else {
            // No loads assigned
            $notifications[] = [
                'id' => 'no_loads_' . $user->id,
                'type' => 'info',
                'title' => 'No Teaching Loads Assigned',
                'message' => 'You don\'t have any teaching loads assigned for the current school year. Contact the registrar for class assignments.',
                'priority' => 'low',
                'created_at' => now(),
            ];
        }

        return response()->json(['notifications' => $notifications]);
    }

    /**
     * Get registrar load management notifications.
     */
    public function getRegistrarLoadNotifications()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['notifications' => []], 403);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['notifications' => []]);
        }

        $notifications = [];

        // Get overloaded faculty
        $overloadedFaculty = FacultyLoad::with('faculty')
                                      ->where('school_year_id', $activeSchoolYear->id)
                                      ->where('is_overloaded', true)
                                      ->get();

        foreach ($overloadedFaculty as $load) {
            $notifications[] = [
                'id' => 'faculty_overload_' . $load->id,
                'type' => 'error',
                'title' => 'Faculty Overloaded',
                'message' => "{$load->faculty->firstname} {$load->faculty->lastname} has {$load->total_loads} loads (max: {$load->max_loads}). Please redistribute assignments.",
                'priority' => 'high',
                'faculty_id' => $load->faculty_id,
                'created_at' => now(),
            ];
        }

        // Get faculty with no loads
        $facultyWithoutLoads = User::whereIn('role', ['faculty', 'coordinator'])
                                  ->whereDoesntHave('facultyLoads', function ($query) use ($activeSchoolYear) {
                                      $query->where('school_year_id', $activeSchoolYear->id)
                                            ->where('total_loads', '>', 0);
                                  })
                                  ->get();

        foreach ($facultyWithoutLoads as $faculty) {
            $notifications[] = [
                'id' => 'no_loads_' . $faculty->id,
                'type' => 'warning',
                'title' => 'Faculty Without Loads',
                'message' => "{$faculty->firstname} {$faculty->lastname} has no teaching loads assigned for the current school year.",
                'priority' => 'medium',
                'faculty_id' => $faculty->id,
                'created_at' => now(),
            ];
        }

        // Get faculty near capacity
        $nearCapacityFaculty = FacultyLoad::with('faculty')
                                         ->where('school_year_id', $activeSchoolYear->id)
                                         ->where('is_overloaded', false)
                                         ->get()
                                         ->filter(function ($load) {
                                             return $load->utilization_percentage >= 80;
                                         });

        foreach ($nearCapacityFaculty as $load) {
            $notifications[] = [
                'id' => 'near_capacity_' . $load->id,
                'type' => 'info',
                'title' => 'Faculty Near Capacity',
                'message' => "{$load->faculty->firstname} {$load->faculty->lastname} is at {$load->utilization_percentage}% capacity ({$load->remaining_loads} slots remaining).",
                'priority' => 'low',
                'faculty_id' => $load->faculty_id,
                'created_at' => now(),
            ];
        }

        return response()->json(['notifications' => $notifications]);
    }

    /**
     * Get academic calendar notifications.
     */
    public function getAcademicCalendarNotifications()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['notifications' => []]);
        }

        $notifications = [];
        $now = now();

        // Enrollment period notifications
        if ($activeSchoolYear->enrollment_start && $activeSchoolYear->enrollment_end) {
            $enrollmentStart = $activeSchoolYear->enrollment_start;
            $enrollmentEnd = $activeSchoolYear->enrollment_end;

            if ($now->lt($enrollmentStart)) {
                $daysUntil = $now->diffInDays($enrollmentStart);
                $notifications[] = [
                    'id' => 'enrollment_upcoming',
                    'type' => 'info',
                    'title' => 'Enrollment Period Upcoming',
                    'message' => "Enrollment opens in {$daysUntil} days ({$enrollmentStart->format('M d, Y')}).",
                    'priority' => 'medium',
                    'created_at' => now(),
                ];
            } elseif ($now->between($enrollmentStart, $enrollmentEnd)) {
                $daysRemaining = $now->diffInDays($enrollmentEnd);
                $notifications[] = [
                    'id' => 'enrollment_active',
                    'type' => 'success',
                    'title' => 'Enrollment Period Active',
                    'message' => "Enrollment is currently open. Closes in {$daysRemaining} days ({$enrollmentEnd->format('M d, Y')}).",
                    'priority' => 'high',
                    'created_at' => now(),
                ];
            }
        }

        // Grading deadline notification
        if ($activeSchoolYear->grading_deadline) {
            $gradingDeadline = $activeSchoolYear->grading_deadline;
            $daysUntilDeadline = $now->diffInDays($gradingDeadline, false);

            if ($daysUntilDeadline > 0 && $daysUntilDeadline <= 7) {
                $notifications[] = [
                    'id' => 'grading_deadline_soon',
                    'type' => 'warning',
                    'title' => 'Grading Deadline Approaching',
                    'message' => "Grade submission deadline is in {$daysUntilDeadline} days ({$gradingDeadline->format('M d, Y')}).",
                    'priority' => 'high',
                    'created_at' => now(),
                ];
            } elseif ($daysUntilDeadline < 0) {
                $daysOverdue = abs($daysUntilDeadline);
                $notifications[] = [
                    'id' => 'grading_deadline_passed',
                    'type' => 'error',
                    'title' => 'Grading Deadline Passed',
                    'message' => "Grade submission deadline was {$daysOverdue} days ago ({$gradingDeadline->format('M d, Y')}).",
                    'priority' => 'high',
                    'created_at' => now(),
                ];
            }
        }

        // Quarter notifications
        $currentQuarter = $activeSchoolYear->getCurrentQuarter();
        if ($currentQuarter) {
            $quarterEndField = "quarter_{$currentQuarter}_end";
            $quarterEnd = $activeSchoolYear->$quarterEndField;
            
            if ($quarterEnd) {
                $daysUntilEnd = $now->diffInDays($quarterEnd, false);
                
                if ($daysUntilEnd > 0 && $daysUntilEnd <= 14) {
                    $notifications[] = [
                        'id' => "quarter_{$currentQuarter}_ending",
                        'type' => 'info',
                        'title' => "Quarter {$currentQuarter} Ending Soon",
                        'message' => "Quarter {$currentQuarter} ends in {$daysUntilEnd} days ({$quarterEnd->format('M d, Y')}).",
                        'priority' => 'medium',
                        'created_at' => now(),
                    ];
                }
            }
        }

        return response()->json(['notifications' => $notifications]);
    }
}
