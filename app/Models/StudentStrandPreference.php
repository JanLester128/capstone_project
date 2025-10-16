<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentStrandPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_personal_info_id',
        'strand_id',
        'preference_order',
    ];

    protected $casts = [
        'preference_order' => 'integer',
    ];

    /**
     * Get the student personal info that owns the preference.
     */
    public function studentPersonalInfo()
    {
        return $this->belongsTo(StudentPersonalInfo::class);
    }

    /**
     * Get the strand that owns the preference.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Scope to order by preference.
     */
    public function scopeOrderedByPreference($query)
    {
        return $query->orderBy('preference_order');
    }
}
