<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Enrollment;

class EvaluationReturnedForRevision extends Notification implements ShouldQueue
{
    use Queueable;

    protected $enrollment;
    protected $revisionNotes;

    /**
     * Create a new notification instance.
     */
    public function __construct(Enrollment $enrollment, $revisionNotes)
    {
        $this->enrollment = $enrollment;
        $this->revisionNotes = $revisionNotes;
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
        
        return (new MailMessage)
            ->subject('Transferee Evaluation Returned for Revision - ONSTS')
            ->greeting('Hello ' . $notifiable->firstname . ',')
            ->line('A transferee evaluation you completed has been returned for revision by the registrar.')
            ->line('**Student Information:**')
            ->line('Name: ' . $student->firstname . ' ' . $student->lastname)
            ->line('Email: ' . $student->email)
            ->line('Intended Grade Level: Grade ' . $this->enrollment->intended_grade_level)
            ->line('')
            ->line('**Revision Notes from Registrar:**')
            ->line($this->revisionNotes)
            ->line('')
            ->line('Please review the registrar\'s feedback and update your evaluation accordingly.')
            ->action('Review and Update Evaluation', url('/enrollment/' . $this->enrollment->id . '/evaluate'))
            ->line('The student is waiting for the updated evaluation to proceed with their enrollment.')
            ->salutation('Best regards, ONSTS Registrar');
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
            'revision_notes' => $this->revisionNotes,
            'message' => 'Transferee evaluation returned for revision',
            'action_url' => url('/enrollment/' . $this->enrollment->id . '/evaluate'),
            'priority' => 'high'
        ];
    }
}
