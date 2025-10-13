<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
      protected $except = [
        'auth/*',
        'api/*',
        'public/*',
        'student/check-enrollment-day',
        'student/enrollment-day-status',
        'student/test-day-check',
        'student/check-enrollment-eligibility',
        'student/enroll'
    ];


}
