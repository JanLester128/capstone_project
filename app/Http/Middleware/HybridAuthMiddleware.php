<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class HybridAuthMiddleware
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
        // Prevent infinite redirects - if already on login page or any auth route, allow access
        if ($request->is('login') || $request->is('auth/*') || $request->is('register/*')) {
            return $next($request);
        }

        // Skip authentication for POST requests to auth endpoints
        if ($request->isMethod('POST') && ($request->is('auth/*') || $request->is('login'))) {
            return $next($request);
        }

        // Skip authentication for school-years operations (already protected by auth:sanctum)
        if ($request->is('school-years/*')) {
            return $next($request);
        }

        // First check session authentication
        if (Auth::check()) {
            return $next($request);
        }

        // Then check Sanctum token authentication
        if (Auth::guard('sanctum')->check()) {
            return $next($request);
        }

        // Check for Bearer token in Authorization header
        $token = $request->bearerToken();
        
        // If no Bearer token in header, check for token in session or cookies
        if (!$token) {
            $token = $request->session()->get('auth_token') ?? $request->cookie('auth_token');
        }
        
        if ($token) {
            try {
                $accessToken = PersonalAccessToken::findToken($token);
                if ($accessToken && $accessToken->tokenable && !$accessToken->tokenable->is_disabled) {
                    // Manually authenticate the user
                    Auth::login($accessToken->tokenable);
                    
                    // Store token in session for future requests
                    $request->session()->put('auth_token', $token);
                    
                    return $next($request);
                }
            } catch (\Exception $e) {
                // Token is invalid, clear it
                $request->session()->forget('auth_token');
            }
        }

        // If not authenticated and this is an AJAX request, return JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'redirect' => '/login'
            ], 401);
        }

        // Only redirect to login if not already there
        if (!$request->is('login')) {
            return redirect('/login');
        }

        return $next($request);
    }
}
