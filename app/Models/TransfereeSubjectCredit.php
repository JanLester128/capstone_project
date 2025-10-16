<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransfereeSubjectCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'previous_school_id',
        'subject_id',
        'subject_name',
        'grade',
        'status',
        'remarks',
    ];

    protected $casts = [
        'grade' => 'decimal:2',
    ];

    /**
     * Get the previous school that owns the subject credit.
     */
    public function previousSchool()
    {
        return $this->belongsTo(TransfereePreviousSchool::class, 'previous_school_id');
    }

    /**
     * Get the subject that owns the subject credit.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Check if the subject credit is credited.
     */
    public function isCredited()
    {
        return $this->status === 'credited';
    }

    /**
     * Scope to get credited subjects.
     */
    public function scopeCredited($query)
    {
        return $query->where('status', 'credited');
    }

    /**
     * Scope to get not credited subjects.
     */
    public function scopeNotCredited($query)
    {
        return $query->where('status', 'not_credited');
    }
}
