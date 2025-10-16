<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtp extends Mailable
{
    use Queueable, SerializesModels;

    public $name;
    public $email;
    public $otp;
    public $role;
    public $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct($name, $email, $otp, $role, $resetUrl = null)
    {
        $this->name = $name;
        $this->email = $email;
        $this->otp = $otp;
        $this->role = $role;
        $this->resetUrl = $resetUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Password Reset OTP - ONSTS',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.password_reset_otp',
            with: [
                'name' => $this->name,
                'email' => $this->email,
                'otp' => $this->otp,
                'role' => $this->role,
                'resetUrl' => $this->resetUrl,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
