<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Enrollment;

class EnrollmentStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    protected $enrollment;
    protected $previousStatus;
    protected $newStatus;

    /**
     * Create a new notification instance.
     */
    public function __construct(Enrollment $enrollment, $previousStatus, $newStatus)
    {
        $this->enrollment = $enrollment;
        $this->previousStatus = $previousStatus;
        $this->newStatus = $newStatus;
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
        $schoolYear = $this->enrollment->schoolYear;
        
        $message = (new MailMessage)
            ->subject('Enrollment Status Update - ONSTS')
            ->greeting('Hello ' . $student->firstname . ',')
            ->line('Your enrollment application status has been updated.');

        switch ($this->newStatus) {
            case 'approved':
                $message->line('🎉 Congratulations! Your enrollment has been approved.')
                       ->line('School Year: ' . $schoolYear->display_name)
                       ->line('Strand: ' . $this->enrollment->strand->name);
                
                if ($this->enrollment->assignedSection) {
                    $message->line('Assigned Section: ' . $this->enrollment->assignedSection->name);
                }
                
                $message->action('View Enrollment Details', url('/student/enrollment'))
                       ->line('Welcome to ONSTS! We look forward to having you in our school.');
                break;

            case 'rejected':
                $message->line('❌ Unfortunately, your enrollment application has been rejected.')
                       ->line('Reason: ' . ($this->enrollment->rejection_reason ?? 'Please contact the registrar for more information.'))
                       ->action('Contact Registrar', url('/contact'))
                       ->line('You may reapply during the next enrollment period or contact our registrar for assistance.');
                break;

            case 'pending_evaluation':
                $message->line('📋 Your transferee application is being evaluated by our coordinator.')
                       ->line('This process may take 3-5 business days.')
                       ->line('We will notify you once the evaluation is complete.')
                       ->action('Check Status', url('/student/enrollment'));
                break;

            case 'evaluated':
                $message->line('✅ Your transferee evaluation has been completed.')
                       ->line('Your application is now pending final approval from the registrar.')
                       ->action('View Status', url('/student/enrollment'));
                break;

            default:
                $message->line('Your enrollment status has been updated to: ' . ucfirst($this->newStatus))
                       ->action('View Details', url('/student/enrollment'));
        }

        return $message->line('If you have any questions, please contact our registrar\'s office.')
                      ->salutation('Best regards, ONSTS Registrar');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable)
    {
        return [
            'enrollment_id' => $this->enrollment->id,
            'previous_status' => $this->previousStatus,
            'new_status' => $this->newStatus,
            'student_name' => $this->enrollment->studentPersonalInfo->user->firstname . ' ' . $this->enrollment->studentPersonalInfo->user->lastname,
            'school_year' => $this->enrollment->schoolYear->display_name,
            'strand' => $this->enrollment->strand->name,
            'message' => $this->getStatusMessage(),
            'action_url' => url('/student/enrollment')
        ];
    }

    /**
     * Get status-specific message
     */
    private function getStatusMessage()
    {
        switch ($this->newStatus) {
            case 'approved':
                return 'Your enrollment has been approved! Welcome to ONSTS.';
            case 'rejected':
                return 'Your enrollment application has been rejected. Please contact the registrar for more information.';
            case 'pending_evaluation':
                return 'Your transferee application is being evaluated by our coordinator.';
            case 'evaluated':
                return 'Your transferee evaluation is complete and pending final approval.';
            default:
                return 'Your enrollment status has been updated to: ' . ucfirst($this->newStatus);
        }
    }
}
