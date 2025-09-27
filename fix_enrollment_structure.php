<?php

// Fix enrollment structure to point to student_personal_info instead of users
echo "Fixing enrollment structure...\n";

// Database connection
$host = 'localhost';
$dbname = 'capstone_project';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database successfully.\n";
    
    // Find the student's personal info record
    $stmt = $pdo->prepare("SELECT id, user_id FROM student_personal_info WHERE user_id = 3 LIMIT 1");
    $stmt->execute();
    $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$personalInfo) {
        echo "ERROR: No student_personal_info found for user_id 3!\n";
        exit(1);
    }
    
    echo "Student personal info found: ID {$personalInfo['id']} for user_id {$personalInfo['user_id']}\n";
    
    // Find the current enrollment
    $stmt = $pdo->prepare("SELECT id, student_id FROM enrollments LIMIT 1");
    $stmt->execute();
    $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$enrollment) {
        echo "ERROR: No enrollment found!\n";
        exit(1);
    }
    
    echo "Current enrollment student_id: {$enrollment['student_id']}\n";
    
    // Update the enrollment to point to student_personal_info.id instead of users.id
    $stmt = $pdo->prepare("UPDATE enrollments SET student_id = ? WHERE id = ?");
    $result = $stmt->execute([$personalInfo['id'], $enrollment['id']]);
    
    if ($result) {
        echo "✅ SUCCESS! Enrollment fixed!\n";
        echo "Enrollment now points to student_personal_info.id: {$personalInfo['id']}\n";
        echo "This corresponds to user_id: {$personalInfo['user_id']} (Jan Lester Camus)\n";
    } else {
        echo "ERROR: Failed to update enrollment!\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
