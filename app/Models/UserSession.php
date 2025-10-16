<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_token',
        'ip_address',
        'device_info',
        'browser_info',
        'login_time',
        'last_activity',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'login_time' => 'datetime',
        'last_activity' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Get the user that owns the session.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Generate a unique session token.
     */
    public static function generateSessionToken()
    {
        return Str::random(64) . '_' . time() . '_' . Str::random(16);
    }

    /**
     * Create a new session for a user.
     */
    public static function createSession($userId, $ipAddress = null, $deviceInfo = null, $browserInfo = null)
    {
        // Terminate any existing active sessions for this user
        self::terminateUserSessions($userId);

        // Create new session
        $sessionToken = self::generateSessionToken();
        $expiresAt = Carbon::now()->addHours(24); // 24-hour session

        return self::create([
            'user_id' => $userId,
            'session_token' => $sessionToken,
            'ip_address' => $ipAddress,
            'device_info' => $deviceInfo,
            'browser_info' => $browserInfo,
            'login_time' => Carbon::now(),
            'last_activity' => Carbon::now(),
            'status' => 'active',
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Terminate all active sessions for a user.
     */
    public static function terminateUserSessions($userId)
    {
        return self::where('user_id', $userId)
            ->where('status', 'active')
            ->update([
                'status' => 'terminated',
                'updated_at' => Carbon::now()
            ]);
    }

    /**
     * Check if a session is valid and active.
     */
    public function isValid()
    {
        return $this->status === 'active' && 
               $this->expires_at > Carbon::now() &&
               $this->last_activity > Carbon::now()->subMinutes(30); // 30-minute inactivity timeout
    }

    /**
     * Update session activity.
     */
    public function updateActivity()
    {
        $this->update([
            'last_activity' => Carbon::now()
        ]);
    }

    /**
     * Terminate this session.
     */
    public function terminate()
    {
        $this->update([
            'status' => 'terminated'
        ]);
    }

    /**
     * Mark session as expired.
     */
    public function expire()
    {
        $this->update([
            'status' => 'expired'
        ]);
    }

    /**
     * Get active session for a user.
     */
    public static function getActiveSession($userId)
    {
        return self::where('user_id', $userId)
            ->where('status', 'active')
            ->where('expires_at', '>', Carbon::now())
            ->first();
    }

    /**
     * Get session by token.
     */
    public static function getByToken($token)
    {
        return self::where('session_token', $token)
            ->where('status', 'active')
            ->first();
    }

    /**
     * Clean up expired sessions (for scheduled task).
     */
    public static function cleanupExpiredSessions()
    {
        return self::where('status', 'active')
            ->where(function($query) {
                $query->where('expires_at', '<', Carbon::now())
                      ->orWhere('last_activity', '<', Carbon::now()->subMinutes(30));
            })
            ->update([
                'status' => 'expired',
                'updated_at' => Carbon::now()
            ]);
    }

    /**
     * Scope for active sessions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where('expires_at', '>', Carbon::now());
    }

    /**
     * Scope for expired sessions.
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'expired')
                    ->orWhere('expires_at', '<', Carbon::now());
    }

    /**
     * Get device type from user agent.
     */
    public static function getDeviceType($userAgent)
    {
        if (preg_match('/mobile|android|iphone|ipad/i', $userAgent)) {
            return 'Mobile';
        } elseif (preg_match('/tablet/i', $userAgent)) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    }

    /**
     * Get browser name from user agent.
     */
    public static function getBrowserName($userAgent)
    {
        if (preg_match('/Chrome/i', $userAgent)) {
            return 'Chrome';
        } elseif (preg_match('/Firefox/i', $userAgent)) {
            return 'Firefox';
        } elseif (preg_match('/Safari/i', $userAgent)) {
            return 'Safari';
        } elseif (preg_match('/Edge/i', $userAgent)) {
            return 'Edge';
        } else {
            return 'Unknown';
        }
    }
}
