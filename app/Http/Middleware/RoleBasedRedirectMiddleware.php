<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RoleBasedRedirectMiddleware
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
        // If user is authenticated, redirect to appropriate dashboard
        if (Auth::check()) {
            $user = Auth::user();
            $currentPath = $request->path();
            
            Log::info('User already authenticated on login page, redirecting to dashboard', [
                'role' => $user->role
            ]);

            // Define role-based dashboard routes
            $dashboardRoutes = [
                'registrar' => '/registrar/dashboard',
                'faculty' => '/faculty/dashboard',
                'coordinator' => '/coordinator/dashboard',
                'student' => '/student/dashboard',
                'admin' => '/admin/dashboard'
            ];

            // Get the appropriate dashboard for user's role
            $dashboardRoute = $dashboardRoutes[$user->role] ?? '/dashboard';

            // Only redirect if user is on login page or root
            if (in_array($currentPath, ['login', '', '/'])) {
                return redirect($dashboardRoute);
            }

            // Store user data in session for consistency
            session([
                'user_data' => [
                    'id' => $user->id,
                    'role' => $user->role,
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'email' => $user->email
                ]
            ]);
        }

        return $next($request);
    }
}
