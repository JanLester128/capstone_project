<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\UserSession;

class ValidateUserSession
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
        // Skip validation for login and logout routes
        if ($request->routeIs('login') || $request->routeIs('logout')) {
            return $next($request);
        }

        $user = Auth::user();
        
        if (!$user) {
            return $next($request);
        }

        // Get session token from session data
        $sessionData = session('user_data');
        $sessionToken = $sessionData['session_token'] ?? null;

        if (!$sessionToken) {
            Log::warning('User session missing token', [
                'user_id' => $user->id,
                'route' => $request->route()->getName()
            ]);
            
            Auth::logout();
            $request->session()->invalidate();
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Session invalid',
                    'message' => 'Your session is invalid. Please log in again.',
                    'redirect_url' => '/login'
                ], 401);
            }
            
            return redirect('/login')->withErrors(['session' => 'Your session is invalid. Please log in again.']);
        }

        // Validate session in database
        $userSession = UserSession::getByToken($sessionToken);
        
        if (!$userSession || !$userSession->isValid()) {
            Log::warning('User session invalid or expired', [
                'user_id' => $user->id,
                'session_token' => $sessionToken,
                'route' => $request->route()->getName()
            ]);
            
            // Clean up invalid session
            if ($userSession) {
                $userSession->expire();
            }
            
            Auth::logout();
            $request->session()->invalidate();
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Session expired',
                    'message' => 'Your session has expired. Please log in again.',
                    'redirect_url' => '/login'
                ], 401);
            }
            
            return redirect('/login')->withErrors(['session' => 'Your session has expired. Please log in again.']);
        }

        // Update session activity
        $userSession->updateActivity();
        
        // Update session data with latest activity
        session(['user_data.last_activity' => now()]);

        return $next($request);
    }
}
