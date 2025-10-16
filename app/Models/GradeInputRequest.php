<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class GradeInputRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'faculty_id',
        'class_id',
        'school_year_id',
        'quarter',
        'status',
        'reason',
        'registrar_notes',
        'approved_by',
        'approved_at',
        'expires_at',
        'is_urgent',
        'student_list',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_urgent' => 'boolean',
        'student_list' => 'array',
    ];

    /**
     * Get the faculty that made the request.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the class for this request.
     */
    public function class()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    /**
     * Get the school year for this request.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    /**
     * Get the registrar who approved/rejected the request.
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if the request is pending.
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the request is approved.
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if the request is rejected.
     */
    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if the approval has expired.
     */
    public function isExpired()
    {
        return $this->expires_at && Carbon::now()->isAfter($this->expires_at);
    }

    /**
     * Check if the request is still valid for grade input.
     */
    public function isValidForGradeInput()
    {
        return $this->isApproved() && !$this->isExpired();
    }

    /**
     * Get the status color for UI display.
     */
    public function getStatusColor()
    {
        switch ($this->status) {
            case 'pending':
                return 'yellow';
            case 'approved':
                return $this->isExpired() ? 'gray' : 'green';
            case 'rejected':
                return 'red';
            default:
                return 'gray';
        }
    }

    /**
     * Get the status text for UI display.
     */
    public function getStatusText()
    {
        switch ($this->status) {
            case 'pending':
                return 'Pending Approval';
            case 'approved':
                return $this->isExpired() ? 'Expired' : 'Approved';
            case 'rejected':
                return 'Rejected';
            default:
                return 'Unknown';
        }
    }

    /**
     * Approve the request.
     */
    public function approve($registrarId, $notes = null, $expiresInDays = 7)
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $registrarId,
            'approved_at' => now(),
            'expires_at' => now()->addDays($expiresInDays),
            'registrar_notes' => $notes,
        ]);
    }

    /**
     * Reject the request.
     */
    public function reject($registrarId, $notes = null)
    {
        $this->update([
            'status' => 'rejected',
            'approved_by' => $registrarId,
            'approved_at' => now(),
            'registrar_notes' => $notes,
        ]);
    }

    /**
     * Scope for pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope for a specific faculty.
     */
    public function scopeForFaculty($query, $facultyId)
    {
        return $query->where('faculty_id', $facultyId);
    }

    /**
     * Scope for a specific class and quarter.
     */
    public function scopeForClassAndQuarter($query, $classId, $quarter)
    {
        return $query->where('class_id', $classId)->where('quarter', $quarter);
    }
}
