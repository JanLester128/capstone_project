<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrarController;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Pages
|--------------------------------------------------------------------------
*/

// Student Login Page
Route::get('/student/login', fn() => Inertia::render('Auth/Student_Login'))
    ->name('student.login');

// Student Register Page (optional)
Route::get('/student/register', fn() => Inertia::render('Auth/Student_Register'))
    ->name('student.register');

// Registrar Login Page
Route::get('/login', fn() => Inertia::render('Auth/Login'))
    ->name('login');

// Registrar Register Page
Route::get('/register/registrar', fn() => Inertia::render('Auth/RegisterRegistrar'))
    ->name('register.registrar');

/*
|--------------------------------------------------------------------------
| Public Authentication
|--------------------------------------------------------------------------
*/

// Student login
Route::post('/auth/login/student', [AuthController::class, 'loginStudent'])
    ->name('auth.login.student');

// Student register
Route::post('/auth/register/student', [AuthController::class, 'registerStudent'])
    ->name('auth.register.student');

// Quick/simple student registration
Route::post('/auth/register/simple-student', [AuthController::class, 'simpleRegisterStudent'])
    ->name('auth.register.simple.student');

// Registrar login
Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');

// Registrar register
Route::post('/auth/register/registrar', [RegistrarController::class, 'register'])
    ->name('auth.register.registrar');

/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Login)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    // Logout
     Route::post('/auth/logout', [AuthController::class, 'logout'])
     ->name('auth.logout');

    // Current authenticated user
    Route::get('/user', fn(Request $request) => $request->user())
        ->name('user');

    /*
    |--------------------------------------------------------------------------
    | Registrar Pages & API
    |--------------------------------------------------------------------------
    */
    Route::prefix('registrar')->group(function () {
        Route::get('/dashboard', fn() => Inertia::render('Registrar/RegistrarDashboard'))
            ->name('registrar.dashboard');

        Route::get('/students', [RegistrarController::class, 'students'])
            ->name('registrar.students');

        Route::get('/sections', fn() => Inertia::render('Registrar/RegistrarSections'))
            ->name('registrar.sections');

        Route::get('/teachers', [RegistrarController::class, 'teachersPage'])
            ->name('registrar.teachers');

        Route::prefix('manage')->group(function () {
            Route::get('/', [RegistrarController::class, 'index'])->name('registrars.index');
            Route::get('/{id}', [RegistrarController::class, 'show'])->name('registrars.show');
            Route::post('/', [RegistrarController::class, 'store'])->name('registrars.store');
            Route::put('/{id}', [RegistrarController::class, 'update'])->name('registrars.update');
            Route::delete('/{id}', [RegistrarController::class, 'delete'])->name('registrars.delete');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Student Pages & API
    |--------------------------------------------------------------------------
    */
    Route::prefix('student')->group(function () {
        // Student Dashboard
        Route::get('/dashboard', fn() => Inertia::render('Student/Student_Dashboard'))
            ->name('student.dashboard');

        // Enroll Page
        Route::get('/enroll', fn() => Inertia::render('Student/Student_Enroll'))
            ->name('student.enroll');

        // Schedule Page
        Route::get('/schedule', fn() => Inertia::render('Student/Student_Schedule'))
            ->name('student.schedule');

        // Grades Page
        Route::get('/grades', fn() => Inertia::render('Student/Student_Grades'))
            ->name('student.grades');

        // Notifications Page
        Route::get('/notifications', fn() => Inertia::render('Student/Student_Notifications'))
            ->name('student.notifications');

        // (Optional) API endpoints
        Route::get('/', [AuthController::class, 'listStudents'])->name('students.index');
        Route::get('/{id}', [AuthController::class, 'showStudent'])->name('students.show');
        Route::put('/{id}', [AuthController::class, 'updateStudent'])->name('students.update');
        Route::delete('/{id}', [AuthController::class, 'deleteStudent'])->name('students.delete');
    });
});
