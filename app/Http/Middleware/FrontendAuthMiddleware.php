<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class FrontendAuthMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Check if user is authenticated via session
        if (Auth::check()) {
            return $next($request);
        }

        // Check for Authorization header (Bearer token)
        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $accessToken = PersonalAccessToken::findToken($token);
            
            if ($accessToken && $accessToken->tokenable) {
                Auth::setUser($accessToken->tokenable);
                return $next($request);
            }
        }

        // Check for token in request (for frontend validation)
        $token = $request->input('token') ?: $request->header('X-Auth-Token');
        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            
            if ($accessToken && $accessToken->tokenable) {
                Auth::setUser($accessToken->tokenable);
                return $next($request);
            }
        }

        return $next($request);
    }
}
