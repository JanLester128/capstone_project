<?php

namespace App\Services;

use App\Models\SchoolYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * SchoolYearService
 * 
 * Centralized service for managing school year dependencies and validation.
 * Implements caching for better performance and consistent school year checks.
 */
class SchoolYearService
{
    const CACHE_KEY_ACTIVE = 'active_school_year';
    const CACHE_TTL = 300; // 5 minutes

    /**
     * Get the active school year with caching
     */
    public static function getActive(): ?SchoolYear
    {
        return Cache::remember(self::CACHE_KEY_ACTIVE, self::CACHE_TTL, function () {
            return SchoolYear::where('is_active', true)->first();
        });
    }

    /**
     * Check if there's an active school year
     */
    public static function hasActive(): bool
    {
        return self::getActive() !== null;
    }

    /**
     * Clear the active school year cache
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY_ACTIVE);
    }

    /**
     * Validate that an active school year exists for operations that require it
     * 
     * @param string $operation The operation being performed (for logging)
     * @throws \Exception if no active school year exists
     */
    public static function requireActive(string $operation = 'operation'): SchoolYear
    {
        $activeSchoolYear = self::getActive();
        
        if (!$activeSchoolYear) {
            Log::warning("Attempted {$operation} without active school year", [
                'operation' => $operation,
                'user_id' => Auth::check() ? Auth::id() : null,
                'timestamp' => now()
            ]);
            
            throw new \Exception("No active school year found. Please create and activate a school year before performing this {$operation}.");
        }
        
        return $activeSchoolYear;
    }

    /**
     * Get school year status for frontend components
     */
    public static function getStatusForFrontend(): array
    {
        $activeSchoolYear = self::getActive();
        
        return [
            'hasActiveSchoolYear' => $activeSchoolYear !== null,
            'activeSchoolYear' => $activeSchoolYear,
            'schoolYearDisplay' => $activeSchoolYear ? 
                $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end : null,
            'currentSemester' => $activeSchoolYear ? $activeSchoolYear->current_semester : null,
            'isEnrollmentOpen' => $activeSchoolYear ? $activeSchoolYear->enrollment_open : false
        ];
    }

    /**
     * Validate school year dependency for specific operations
     */
    public static function validateForOperation(string $operation): array
    {
        $status = self::getStatusForFrontend();
        
        $operationRequirements = [
            'section_creation' => [
                'requires_active' => true,
                'message' => 'Sections must be associated with an active school year'
            ],
            'schedule_creation' => [
                'requires_active' => true,
                'message' => 'Class schedules must be associated with an active school year'
            ],
            'subject_creation' => [
                'requires_active' => true,
                'message' => 'Subjects must be associated with an active school year'
            ],
            'faculty_creation' => [
                'requires_active' => false,
                'message' => 'Faculty accounts can be created without an active school year'
            ]
        ];

        $requirement = $operationRequirements[$operation] ?? ['requires_active' => true, 'message' => 'This operation requires an active school year'];
        
        return [
            'allowed' => !$requirement['requires_active'] || $status['hasActiveSchoolYear'],
            'hasActiveSchoolYear' => $status['hasActiveSchoolYear'],
            'message' => $requirement['message'],
            'redirectUrl' => '/registrar/school-years'
        ];
    }

    /**
     * Get validation response for API endpoints
     */
    public static function getValidationResponse(string $operation): array
    {
        $validation = self::validateForOperation($operation);
        
        if (!$validation['allowed']) {
            return [
                'success' => false,
                'error' => 'No active school year found',
                'message' => $validation['message'],
                'redirect' => $validation['redirectUrl'],
                'code' => 'MISSING_ACTIVE_SCHOOL_YEAR'
            ];
        }
        
        return [
            'success' => true,
            'activeSchoolYear' => self::getActive()
        ];
    }

    /**
     * Activate a school year and clear cache
     */
    public static function activate(SchoolYear $schoolYear): void
    {
        // Deactivate all other school years
        SchoolYear::where('is_active', true)->update(['is_active' => false]);
        
        // Activate the specified school year
        $schoolYear->update(['is_active' => true]);
        
        // Clear cache to ensure fresh data
        self::clearCache();
        
        Log::info('School year activated', [
            'school_year_id' => $schoolYear->id,
            'year' => $schoolYear->year_start . '-' . $schoolYear->year_end,
            'user_id' => Auth::check() ? Auth::id() : null
        ]);
    }

    /**
     * Deactivate all school years
     */
    public static function deactivateAll(): void
    {
        SchoolYear::where('is_active', true)->update(['is_active' => false]);
        self::clearCache();
        
        Log::info('All school years deactivated', [
            'user_id' => Auth::check() ? Auth::id() : null
        ]);
    }

    /**
     * Get school year options for dropdowns
     */
    public static function getOptionsForDropdown(): array
    {
        return SchoolYear::orderBy('year_start', 'desc')
            ->get()
            ->map(function ($schoolYear) {
                return [
                    'id' => $schoolYear->id,
                    'value' => $schoolYear->year_start . '-' . $schoolYear->year_end,
                    'label' => $schoolYear->year_start . '-' . $schoolYear->year_end . 
                              ($schoolYear->is_active ? ' (Active)' : ''),
                    'is_active' => $schoolYear->is_active
                ];
            })
            ->toArray();
    }
}
