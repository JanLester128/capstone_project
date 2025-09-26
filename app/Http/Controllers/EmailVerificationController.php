<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class EmailVerificationController extends Controller
{
    /**
     * Send verification code to email
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendVerificationCode(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:users,email',
                'firstname' => 'required|string|max:255',
                'lastname' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = $request->input('email');
            $firstname = $request->input('firstname');
            $lastname = $request->input('lastname');

            // Generate 6-digit verification code
            $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            // Store verification code in cache for 10 minutes
            $cacheKey = "email_verification_{$email}";
            Cache::put($cacheKey, [
                'code' => $verificationCode,
                'email' => $email,
                'firstname' => $firstname,
                'lastname' => $lastname,
                'attempts' => 0,
                'created_at' => now()
            ], now()->addMinutes(10));

            // Send verification email
            try {
                Mail::send('emails.email_verification', [
                    'code' => $verificationCode,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'email' => $email
                ], function ($message) use ($email, $firstname, $lastname) {
                    $message->to($email, "{$firstname} {$lastname}")
                           ->subject('ONSTS - Email Verification Code');
                });

                Log::info("Verification code sent to: {$email}");

                return response()->json([
                    'success' => true,
                    'message' => 'Verification code sent to your email address. Please check your inbox.',
                    'email' => $email
                ]);

            } catch (\Exception $mailError) {
                Log::error("Failed to send verification email: " . $mailError->getMessage());
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send verification email. Please try again.'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Send verification code error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while sending verification code. Please try again.'
            ], 500);
        }
    }

    /**
     * Verify the email verification code
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyCode(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'code' => 'required|string|size:6',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = $request->input('email');
            $inputCode = $request->input('code');
            $cacheKey = "email_verification_{$email}";

            // Get verification data from cache
            $verificationData = Cache::get($cacheKey);

            if (!$verificationData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verification code has expired or does not exist. Please request a new code.'
                ], 400);
            }

            // Check attempts limit (max 3 attempts)
            if ($verificationData['attempts'] >= 3) {
                Cache::forget($cacheKey);
                return response()->json([
                    'success' => false,
                    'message' => 'Too many failed attempts. Please request a new verification code.'
                ], 400);
            }

            // Verify the code
            if ($inputCode !== $verificationData['code']) {
                // Increment attempts
                $verificationData['attempts']++;
                Cache::put($cacheKey, $verificationData, now()->addMinutes(10));

                $remainingAttempts = 3 - $verificationData['attempts'];
                
                return response()->json([
                    'success' => false,
                    'message' => "Invalid verification code. {$remainingAttempts} attempts remaining."
                ], 400);
            }

            // Code is correct - mark email as verified
            $verifiedCacheKey = "email_verified_{$email}";
            Cache::put($verifiedCacheKey, [
                'email' => $email,
                'firstname' => $verificationData['firstname'],
                'lastname' => $verificationData['lastname'],
                'verified_at' => now()
            ], now()->addMinutes(30)); // Give 30 minutes to complete registration

            // Remove verification code from cache
            Cache::forget($cacheKey);

            Log::info("Email verified successfully: {$email}");

            return response()->json([
                'success' => true,
                'message' => 'Email verified successfully! You can now complete your registration.',
                'email' => $email
            ]);

        } catch (\Exception $e) {
            Log::error('Verify code error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying code. Please try again.'
            ], 500);
        }
    }

    /**
     * Resend verification code
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function resendVerificationCode(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = $request->input('email');
            $cacheKey = "email_verification_{$email}";

            // Get existing verification data
            $verificationData = Cache::get($cacheKey);

            if (!$verificationData) {
                return response()->json([
                    'success' => false,
                    'message' => 'No pending verification found for this email. Please start the registration process again.'
                ], 400);
            }

            // Generate new verification code
            $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            // Update verification data with new code and reset attempts
            $verificationData['code'] = $verificationCode;
            $verificationData['attempts'] = 0;
            $verificationData['created_at'] = now();

            Cache::put($cacheKey, $verificationData, now()->addMinutes(10));

            // Send new verification email
            try {
                Mail::send('emails.email_verification', [
                    'code' => $verificationCode,
                    'firstname' => $verificationData['firstname'],
                    'lastname' => $verificationData['lastname'],
                    'email' => $email
                ], function ($message) use ($email, $verificationData) {
                    $message->to($email, "{$verificationData['firstname']} {$verificationData['lastname']}")
                           ->subject('ONSTS - Email Verification Code (Resent)');
                });

                Log::info("Verification code resent to: {$email}");

                return response()->json([
                    'success' => true,
                    'message' => 'New verification code sent to your email address.',
                    'email' => $email
                ]);

            } catch (\Exception $mailError) {
                Log::error("Failed to resend verification email: " . $mailError->getMessage());
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to resend verification email. Please try again.'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Resend verification code error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while resending verification code. Please try again.'
            ], 500);
        }
    }

    /**
     * Check if email is verified
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkVerificationStatus(Request $request)
    {
        try {
            $email = $request->input('email');
            
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email is required'
                ], 400);
            }

            $verifiedCacheKey = "email_verified_{$email}";
            $verificationData = Cache::get($verifiedCacheKey);

            return response()->json([
                'success' => true,
                'verified' => $verificationData !== null,
                'email' => $email
            ]);

        } catch (\Exception $e) {
            Log::error('Check verification status error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while checking verification status.'
            ], 500);
        }
    }
}
