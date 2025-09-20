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
    Route::get('/storage/enrollment_documents/{filename}', function (\Illuminate\Http\Request $request, $filename) {
        // Prevent path traversal by normalizing provided filename
        $safeFilename = basename($filename);
        $relativePath = 'enrollment_documents/' . $safeFilename;

        // Resolve to absolute filesystem path under storage/app/public
        $absolutePath = storage_path('app/public/' . $relativePath);

        if (!file_exists($absolutePath)) {
            abort(404);
        }

        // Stream the file inline; Laravel will set sensible headers
        return response()->file($absolutePath, [
            'Content-Disposition' => 'inline; filename="' . $safeFilename . '"'
        ]);
    })->name('storage.enrollment_documents');
});
