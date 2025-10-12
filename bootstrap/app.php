<?php

use Illuminate\Foundation\Application;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        then: function () {
            // Load auth routes without any middleware to prevent conflicts
            Route::group([], base_path('routes/auth.php'));
            
            // Load student routes with web middleware (required for sessions)
            Route::middleware(['web'])
                ->group(base_path('routes/student.php'));
        },
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
        
        // Register custom middleware aliases
        $middleware->alias([
            'single.session' => \App\Http\Middleware\SingleSessionMiddleware::class,
            'persistent.auth' => \App\Http\Middleware\PersistentAuthMiddleware::class,
            'hybrid.auth' => \App\Http\Middleware\HybridAuthMiddleware::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'require.active.school.year' => \App\Http\Middleware\RequireActiveSchoolYear::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
