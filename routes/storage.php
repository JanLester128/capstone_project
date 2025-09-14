<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Storage Routes
|--------------------------------------------------------------------------
|
| These routes handle file access for uploaded documents.
| Only authenticated users can access enrollment documents.
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/storage/enrollment_documents/{filename}', function (Request $request, $filename) {
        $filePath = 'enrollment_documents/' . $filename;
        
        if (!Storage::disk('public')->exists($filePath)) {
            abort(404);
        }
        
        $file = Storage::disk('public')->get($filePath);
        $mimeType = Storage::disk('public')->mimeType($filePath);
        
        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="' . $filename . '"');
    })->name('storage.enrollment_documents');
});
