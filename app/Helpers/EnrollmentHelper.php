<?php

namespace App\Helpers;

use App\Models\Enrollment;
use App\Models\StudentPersonalInfo;

class EnrollmentHelper
{
    /**
     * Check if a student enrollment is for a transferee
     *
     * @param Enrollment $enrollment
     * @return bool
     */
    public static function isTransferee(Enrollment $enrollment): bool
    {
        return $enrollment->enrollment_type === 'transferee';
    }

    /**
     * Check if a student is a transferee by student personal info
     *
     * @param StudentPersonalInfo $studentInfo
     * @return bool
     */
    public static function isTransfereeByStudentInfo(StudentPersonalInfo $studentInfo): bool
    {
        return $studentInfo->student_status === 'transferee';
    }

    /**
     * Get transferee information for display
     *
     * @param Enrollment $enrollment
     * @return array
     */
    public static function getTransfereeInfo(Enrollment $enrollment): array
    {
        if (!self::isTransferee($enrollment)) {
            return [];
        }

        $studentInfo = $enrollment->studentPersonalInfo;
        
        return [
            'is_transferee' => true,
            'previous_school' => $studentInfo->previous_school ?? null,
            'last_grade' => $studentInfo->last_grade ?? null,
            'last_sy' => $studentInfo->last_sy ?? null,
            'last_school' => $studentInfo->last_school ?? null,
        ];
    }

    /**
     * Get enrollment type badge information
     *
     * @param Enrollment $enrollment
     * @return array
     */
    public static function getEnrollmentTypeBadge(Enrollment $enrollment): array
    {
        if (self::isTransferee($enrollment)) {
            return [
                'type' => 'transferee',
                'label' => 'Transferee Student',
                'color' => 'blue',
                'bg_color' => 'bg-blue-100',
                'text_color' => 'text-blue-800',
                'dot_color' => 'bg-blue-500'
            ];
        }

        return [
            'type' => 'regular',
            'label' => 'Regular Student',
            'color' => 'green',
            'bg_color' => 'bg-green-100',
            'text_color' => 'text-green-800',
            'dot_color' => 'bg-green-500'
        ];
    }

    /**
     * Filter enrollments by student type
     *
     * @param \Illuminate\Database\Eloquent\Collection $enrollments
     * @param string $type ('all', 'transferee', 'regular')
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function filterByStudentType($enrollments, string $type)
    {
        if ($type === 'all') {
            return $enrollments;
        }

        return $enrollments->filter(function ($enrollment) use ($type) {
            if ($type === 'transferee') {
                return self::isTransferee($enrollment);
            }
            
            if ($type === 'regular') {
                return !self::isTransferee($enrollment);
            }

            return true;
        });
    }
}
