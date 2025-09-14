<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Cache;

class SingleSessionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            $currentSessionId = Session::getId();
            $cacheKey = "user_session_{$user->id}";
            $storedSessionId = Cache::get($cacheKey);

            // If there's a stored session and it's different from current session
            if ($storedSessionId && $storedSessionId !== $currentSessionId) {
                // Only enforce single session for login requests, not for page refreshes
                if ($request->is('auth/login*') || $request->is('login*')) {
                    // Force logout the current session
                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    
                    // Clear the cache
                    Cache::forget($cacheKey);
                    
                    return response()->json([
                        'message' => 'Your account is already logged in from another session. Please try logging in again.',
                        'session_conflict' => true,
                        'redirect' => '/login'
                    ], 409);
                } else {
                    // For regular page requests, update the session ID to current one
                    Cache::put($cacheKey, $currentSessionId, now()->addHours(24));
                }
            } else {
                // Store current session ID for this user
                Cache::put($cacheKey, $currentSessionId, now()->addHours(24));
            }
        }

        return $next($request);
    }
}
