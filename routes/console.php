<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule automatic deactivation of expired school years
Schedule::command('schoolyears:deactivate-expired')
    ->daily()
    ->at('00:01')
    ->description('Automatically deactivate school years that have passed their end date');
