<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Enrollment;

class TransfereeEvaluationNeeded extends Notification implements ShouldQueue
{
    use Queueable;

    protected $enrollment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Enrollment $enrollment)
    {
        $this->enrollment = $enrollment;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable)
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable)
    {
        $student = $this->enrollment->studentPersonalInfo->user;
        $previousSchool = $this->enrollment->transfereePreviousSchool;
        
        return (new MailMessage)
            ->subject('New Transferee Evaluation Required - ONSTS')
            ->greeting('Hello ' . $notifiable->firstname . ',')
            ->line('A new transferee enrollment requires your evaluation.')
            ->line('**Student Information:**')
            ->line('Name: ' . $student->firstname . ' ' . $student->lastname)
            ->line('Email: ' . $student->email)
            ->line('Intended Grade Level: Grade ' . $this->enrollment->intended_grade_level)
            ->line('Preferred Strand: ' . $this->enrollment->strand->name)
            ->line('')
            ->line('**Previous School Information:**')
            ->line('School: ' . ($previousSchool->school_name ?? 'Not provided'))
            ->line('Address: ' . ($previousSchool->school_address ?? 'Not provided'))
            ->line('')
            ->line('Please review the student\'s academic records and complete the evaluation as soon as possible.')
            ->action('Evaluate Transferee', url('/faculty/enrollment?filter=transferee'))
            ->line('The student is waiting for your evaluation to proceed with their enrollment.')
            ->salutation('Best regards, ONSTS System');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable)
    {
        $student = $this->enrollment->studentPersonalInfo->user;
        
        return [
            'enrollment_id' => $this->enrollment->id,
            'student_id' => $student->id,
            'student_name' => $student->firstname . ' ' . $student->lastname,
            'student_email' => $student->email,
            'intended_grade_level' => $this->enrollment->intended_grade_level,
            'preferred_strand' => $this->enrollment->strand->name,
            'enrollment_date' => $this->enrollment->enrollment_date,
            'message' => 'New transferee enrollment requires evaluation',
            'action_url' => url('/faculty/enrollment?filter=transferee'),
            'priority' => 'high'
        ];
    }
}
