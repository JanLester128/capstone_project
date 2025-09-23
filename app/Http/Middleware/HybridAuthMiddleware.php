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
        // COMPLETELY BYPASS all authentication for login page - NO REDIRECTS
        if ($request->is('login')) {
            return $next($request);
        }
        
        // Also bypass for auth routes to prevent conflicts
        if ($request->is('auth/*') || $request->is('register/*')) {
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
        
        // If no Bearer token in header, check for token in session 
        if (!$token) {
            $token = $request->session()->get('auth_token');
        }
        
        // Also check for token in cookies (for browser refresh scenarios)
        if (!$token && $request->hasCookie('auth_token')) {
            $token = $request->cookie('auth_token');
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

        // For dashboard routes, check if this is a browser request and allow through
        if ($request->is('*/dashboard') || 
            $request->is('registrar/*') || 
            $request->is('faculty/*') || 
            $request->is('student/*') ||
            $request->is('dashboard')) {
            
            $userAgent = $request->header('User-Agent');
            $acceptHeader = $request->header('Accept');
            
            // If this is a browser request (not API), allow through
            // Frontend will handle authentication
            if ($userAgent && !$request->expectsJson() && !$request->is('api/*')) {
                if ($acceptHeader && str_contains($acceptHeader, 'text/html')) {
                    return $next($request);
                }
                // Even without proper Accept header, allow browser requests
                return $next($request);
            }
        }

        // If not authenticated and this is an AJAX request, return JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'redirect' => '/login'
            ], 401);
        }

        // VERY CONSERVATIVE redirect - only for specific non-dashboard routes
        if (!$request->is('login') && 
            !$request->is('*/dashboard') && 
            !$request->is('registrar/*') && 
            !$request->is('faculty/*') && 
            !$request->is('student/*') &&
            !$request->is('dashboard')) {
            
            // Check if this might be causing a redirect loop
            $referer = $request->header('Referer');
            if ($referer && str_contains($referer, '/login')) {
                // Don't redirect if coming from login page - allow through
                return $next($request);
            }
            
            return redirect('/login');
        }

        // Default: allow through
        return $next($request);
    }
}
