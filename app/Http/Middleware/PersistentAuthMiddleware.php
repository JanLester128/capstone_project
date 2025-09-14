<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class PersistentAuthMiddleware
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
        // Skip authentication check for auth routes and public routes
        if ($request->is('auth/*') || $request->is('login') || $request->is('/') || $request->is('sanctum/csrf-cookie')) {
            return $next($request);
        }

        // Check if user is authenticated
        if (!Auth::check()) {
            // For AJAX requests, return JSON response
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'redirect' => '/login'
                ], 401);
            }

            // For regular requests, redirect to login
            return redirect('/login');
        }

        // User is authenticated, continue with request
        return $next($request);
    }
}
