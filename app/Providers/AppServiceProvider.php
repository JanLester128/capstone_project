<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Grade;
use App\Observers\GradeObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Grade Observer for automatic semester grade calculation
        Grade::observe(GradeObserver::class);
    }
}
