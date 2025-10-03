<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class RequireActiveSchoolYear
{
    /**
     * Handle an incoming request.
     * Ensures an active school year exists before allowing certain registrar operations.
     */
    public function handle(Request $request, Closure $next)
    {
        // Check if there's an active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            Log::warning('Attempt to access school-year-dependent feature without active school year', [
                'route' => $request->route()->getName(),
                'url' => $request->url(),
                'user_id' => Auth::check() ? Auth::id() : null
            ]);

            // For AJAX/API requests, return JSON error
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'error' => 'No active school year found.',
                    'message' => 'Please create and activate a school year before performing this action.',
                    'redirect' => '/registrar/school-years'
                ], 422);
            }

            // For regular requests, redirect with error message
            return redirect()->route('registrar.school-years')
                ->with('error', 'No active school year found. Please create and activate a school year first.')
                ->with('info', 'You need to set up an active school year before creating sections, schedules, or managing academic data.');
        }

        // Add active school year to request for easy access
        $request->merge(['active_school_year' => $activeSchoolYear]);
        
        return $next($request);
    }
}
