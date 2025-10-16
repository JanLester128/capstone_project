<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\User;
use App\Mail\PasswordResetOtp;
use Carbon\Carbon;

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
     * Show reset password form
     */
    public function showResetPasswordForm()
    {
        return Inertia::render('Auth/ResetPassword');
    }

    /**
     * Handle forgot password request
     */
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Don't reveal if email exists for security, but still show the email they entered
            return response()->json([
                'success' => true,
                'message' => 'If an account with that email exists, we have sent a password reset link.',
                'email_sent_to' => $request->email // Show the email they entered, even if account doesn't exist
            ]);
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        
        // Delete any existing OTP for this email
        DB::table('password_resets')->where('email', $user->email)->delete();
        
        // Store OTP in password_resets table (expires in 15 minutes)
        DB::table('password_resets')->insert([
            'email' => $user->email,
            'otp' => $otp,
            'expires_at' => Carbon::now()->addMinutes(15),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Log the reset request
        Log::info('Password reset OTP requested', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        // Generate reset URL (without token, user will enter OTP)
        $resetUrl = url("/reset-password?email=" . urlencode($user->email));

        // Send email with OTP
        try {
            Mail::to($user->email)->send(new PasswordResetOtp(
                $user->firstname . ' ' . $user->lastname,
                $user->email,
                $otp,
                $user->role,
                $resetUrl
            ));

            Log::info('Password reset OTP email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            $emailSent = true;
        } catch (\Exception $e) {
            Log::error('Failed to send password reset OTP email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);

            $emailSent = false;
        }
        
        return response()->json([
            'success' => true,
            'message' => $emailSent 
                ? 'A 6-digit OTP has been sent to your email. Please check your inbox.' 
                : 'OTP generated, but email could not be sent. Please check the debug info below.',
            'email_sent_to' => $user->email,
            'email_actually_sent' => $emailSent,
            'reset_url' => $resetUrl,
            'debug_info' => config('app.debug') ? [
                'otp_code' => $otp,
                'expires_at' => Carbon::now()->addMinutes(15)->toDateTimeString(),
                'reset_url' => $resetUrl,
                'email_sent' => $emailSent
            ] : null
        ]);
    }

    /**
     * Handle password reset with OTP verification
     */
    public function reset(Request $request)
    {
        $request->validate([
            'otp' => 'required|string|size:6',
            'email' => 'required|email',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ]
        ], [
            'otp.required' => 'OTP is required.',
            'otp.size' => 'OTP must be exactly 6 digits.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        ]);

        // Find user by email
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found with this email address.'
            ], 422);
        }

        // Verify OTP from password_resets table
        $passwordReset = DB::table('password_resets')
            ->where('email', $request->email)
            ->where('otp', $request->otp)
            ->first();

        if (!$passwordReset) {
            Log::warning('Invalid OTP attempt', [
                'email' => $request->email,
                'otp_provided' => $request->otp,
                'ip' => $request->ip()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP. Please check the code sent to your email.'
            ], 422);
        }

        // Check if OTP has expired (15 minutes)
        if (Carbon::parse($passwordReset->expires_at)->isPast()) {
            // Delete expired OTP
            DB::table('password_resets')
                ->where('email', $request->email)
                ->delete();
                
            return response()->json([
                'success' => false,
                'message' => 'OTP has expired. Please request a new one.'
            ], 422);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
            'password_change_required' => false,
            'password_changed' => true
        ]);

        // Delete used OTP
        DB::table('password_resets')
            ->where('email', $request->email)
            ->delete();

        // Log successful password reset
        Log::info('Password reset completed with OTP', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully. You can now log in with your new password.',
            'redirect_url' => '/login'
        ]);
    }
}
