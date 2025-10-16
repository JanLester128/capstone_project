<?php

namespace App\Http\Middleware;

use App\Models\FacultyLoad;
use App\Models\SchoolYear;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UpdateFacultyLoads
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
        $response = $next($request);

        // Only update loads after successful POST, PUT, or DELETE requests
        if (in_array($request->method(), ['POST', 'PUT', 'DELETE']) && $response->getStatusCode() < 400) {
            $this->updateAllFacultyLoads();
        }

        return $response;
    }

    /**
     * Update all faculty load counts for the active school year.
     */
    private function updateAllFacultyLoads()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return;
            }

            // Get all faculty loads for the active school year
            $facultyLoads = FacultyLoad::where('school_year_id', $activeSchoolYear->id)->get();

            foreach ($facultyLoads as $load) {
                $load->updateLoadCount();
            }

            Log::info('Faculty loads updated automatically', [
                'school_year_id' => $activeSchoolYear->id,
                'updated_loads' => $facultyLoads->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update faculty loads automatically', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
