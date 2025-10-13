<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class StoreGradeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();
        return $user && in_array($user->role, ['faculty', 'coordinator']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $semester = $this->input('semester');
        
        $rules = [
            'student_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'required|exists:users,id',
            'school_year_id' => 'required|exists:school_years,id',
            'class_id' => 'nullable|exists:class,id',
            'semester' => 'required|in:1st,2nd',
            'remarks' => 'nullable|string|max:1000',
            'status' => 'required|in:ongoing,completed,incomplete,dropped,pending_approval,approved',
            'approval_status' => 'required|in:draft,pending_approval,approved,rejected',
        ];

        // Semester-specific quarter validation
        if ($semester === '1st') {
            // 1st Semester: Only Q1 and Q2 allowed
            $rules['first_quarter'] = 'nullable|numeric|min:60|max:100';
            $rules['second_quarter'] = 'nullable|numeric|min:60|max:100';
            $rules['third_quarter'] = 'prohibited'; // Not allowed for 1st semester
            $rules['fourth_quarter'] = 'prohibited'; // Not allowed for 1st semester
        } elseif ($semester === '2nd') {
            // 2nd Semester: Only Q3 and Q4 allowed
            $rules['first_quarter'] = 'prohibited'; // Not allowed for 2nd semester
            $rules['second_quarter'] = 'prohibited'; // Not allowed for 2nd semester
            $rules['third_quarter'] = 'nullable|numeric|min:60|max:100';
            $rules['fourth_quarter'] = 'nullable|numeric|min:60|max:100';
        }

        return $rules;
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'first_quarter.prohibited' => 'First quarter grades are not allowed for 2nd semester subjects.',
            'second_quarter.prohibited' => 'Second quarter grades are not allowed for 2nd semester subjects.',
            'third_quarter.prohibited' => 'Third quarter grades are not allowed for 1st semester subjects.',
            'fourth_quarter.prohibited' => 'Fourth quarter grades are not allowed for 1st semester subjects.',
            'first_quarter.min' => 'First quarter grade must be at least 60.',
            'first_quarter.max' => 'First quarter grade cannot exceed 100.',
            'second_quarter.min' => 'Second quarter grade must be at least 60.',
            'second_quarter.max' => 'Second quarter grade cannot exceed 100.',
            'third_quarter.min' => 'Third quarter grade must be at least 60.',
            'third_quarter.max' => 'Third quarter grade cannot exceed 100.',
            'fourth_quarter.min' => 'Fourth quarter grade must be at least 60.',
            'fourth_quarter.max' => 'Fourth quarter grade cannot exceed 100.',
            'semester.required' => 'Semester selection is required.',
            'semester.in' => 'Semester must be either 1st or 2nd.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $semester = $this->input('semester');
        
        // Auto-clear invalid quarters based on semester
        if ($semester === '1st') {
            $this->merge([
                'third_quarter' => null,
                'fourth_quarter' => null,
            ]);
        } elseif ($semester === '2nd') {
            $this->merge([
                'first_quarter' => null,
                'second_quarter' => null,
            ]);
        }
    }

    /**
     * Get validated data with calculated semester grade.
     */
    public function getValidatedWithCalculatedGrade(): array
    {
        $validated = $this->validated();
        
        // Calculate semester grade based on available quarters
        $semester = $validated['semester'];
        $quarters = [];
        
        if ($semester === '1st') {
            if (!empty($validated['first_quarter'])) {
                $quarters[] = $validated['first_quarter'];
            }
            if (!empty($validated['second_quarter'])) {
                $quarters[] = $validated['second_quarter'];
            }
        } elseif ($semester === '2nd') {
            if (!empty($validated['third_quarter'])) {
                $quarters[] = $validated['third_quarter'];
            }
            if (!empty($validated['fourth_quarter'])) {
                $quarters[] = $validated['fourth_quarter'];
            }
        }
        
        // Calculate semester grade as average of available quarters
        if (!empty($quarters)) {
            $validated['semester_grade'] = round(array_sum($quarters) / count($quarters), 2);
        } else {
            $validated['semester_grade'] = null;
        }
        
        return $validated;
    }
}
