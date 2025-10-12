<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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
        // FIXED: Simple single session enforcement - only prevent different users
        if (Auth::check()) {
            $currentUser = Auth::user();
            $currentUserId = $currentUser->id;
            $currentUserRole = $currentUser->role;
            
            // Check if there's a different user stored in session
            $sessionUserId = session('user_data.id');
            $sessionUserRole = session('user_data.role');
            
            // If session has different user data, clear it and force re-authentication
            if ($sessionUserId && $sessionUserRole && 
                ($sessionUserId != $currentUserId || $sessionUserRole != $currentUserRole)) {
                
                Log::info('Different user detected in session', [
                    'current_user' => $currentUserId,
                    'current_role' => $currentUserRole,
                    'session_user' => $sessionUserId,
                    'session_role' => $sessionUserRole
                ]);
                
                // Clear session and logout
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'message' => 'Session conflict detected. Please log in again.',
                        'session_conflict' => true,
                        'redirect' => '/login'
                    ], 401);
                }
                
                return redirect('/login')->with('error', 'Session conflict detected. Please log in again.');
            }
        }
        
        return $next($request);
    }
}
