<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\PasswordReset;
use Carbon\Carbon;
use Inertia\Inertia;

class PasswordResetController extends Controller
{
    /**
     * Show forgot password form
     */
    public function showForgotPasswordForm()
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    /**
     * Show reset password form with OTP
     */
    public function showResetPasswordForm(Request $request)
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->query('email')
        ]);
    }

    /**
     * Send OTP to user's email
     */
    public function sendOTP(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'message' => 'User not found with this email address.'
            ], 404);
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Delete any existing password reset requests for this email
        PasswordReset::where('email', $request->email)->delete();
        
        // Create new password reset record
        PasswordReset::create([
            'email' => $request->email,
            'otp' => $otp,
            'expires_at' => Carbon::now()->addMinutes(15),
            'used' => false
        ]);

        // Determine email address based on role
        $emailAddress = $user->role === 'registrar' ? 'onsts.registrar@gmail.com' : $request->email;
        
        try {
            // Send OTP email
            Mail::send('emails.password_reset_otp', [
                'name' => $user->name,
                'email' => $request->email,
                'otp' => $otp,
                'role' => $user->role
            ], function ($message) use ($emailAddress, $user) {
                $message->to($emailAddress)
                        ->subject('Password Reset OTP - ONSTS')
                        ->from('onsts.registrar@gmail.com', 'ONSTS System');
            });

            return response()->json([
                'message' => 'OTP has been sent to your email address.',
                'email_sent_to' => $emailAddress
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send OTP email. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify OTP and reset password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed'
        ]);

        // Find the password reset record
        $passwordReset = PasswordReset::where('email', $request->email)
                                    ->where('otp', $request->otp)
                                    ->where('used', false)
                                    ->first();

        if (!$passwordReset) {
            return response()->json([
                'message' => 'Invalid OTP code.'
            ], 400);
        }

        if ($passwordReset->isExpired()) {
            return response()->json([
                'message' => 'OTP has expired. Please request a new one.'
            ], 400);
        }

        // Find the user
        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'message' => 'User not found.'
            ], 404);
        }

        // Update user password
        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Mark OTP as used
        $passwordReset->update(['used' => true]);

        return response()->json([
            'message' => 'Password has been reset successfully.',
            'redirect' => '/login'
        ]);
    }

    /**
     * Verify OTP without resetting password
     */
    public function verifyOTP(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6'
        ]);

        $passwordReset = PasswordReset::where('email', $request->email)
                                    ->where('otp', $request->otp)
                                    ->where('used', false)
                                    ->first();

        if (!$passwordReset) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid OTP code.'
            ], 400);
        }

        if ($passwordReset->isExpired()) {
            return response()->json([
                'valid' => false,
                'message' => 'OTP has expired. Please request a new one.'
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'message' => 'OTP is valid.'
        ]);
    }
}
