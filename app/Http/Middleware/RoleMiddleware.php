<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  mixed ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // If no user is authenticated
        if (!$user) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Unauthorized'], 401)
                : redirect()->route('login');
        }

        // Check if coordinator role is requested and user has coordinator privileges
        if (in_array('coordinator', $roles)) {
            // Allow if user is a coordinator OR if user is faculty with coordinator privileges
            $hasCoordinatorAccess = ($user->role === 'coordinator') || 
                                   ($user->role === 'faculty' && $user->is_coordinator);
            
            if (!$hasCoordinatorAccess) {
                return $request->expectsJson()
                    ? response()->json(['message' => 'Coordinator access required'], 403)
                    : abort(403, 'You need coordinator privileges to access this page.');
            }
            
            return $next($request);
        }

        // If user role is not allowed (standard role check)
        if (!in_array($user->role, $roles)) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Forbidden'], 403)
                : abort(403, 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}
