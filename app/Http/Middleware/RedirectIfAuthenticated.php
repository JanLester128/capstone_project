<?php

namespace App\Http\Middleware;

use App\Providers\RouteServiceProvider;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $user = Auth::user();
                
                Log::info('User already authenticated, redirecting to appropriate dashboard', [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'current_path' => $request->path()
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

                // Store user session data
                session([
                    'user_data' => [
                        'id' => $user->id,
                        'role' => $user->role,
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'email' => $user->email,
                        'last_activity' => now()
                    ]
                ]);

                return redirect($dashboardRoute);
            }
        }

        return $next($request);
    }
}
