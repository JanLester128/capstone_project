<?php

// Simple script to fix enrollment data
echo "Starting enrollment fix...\n";

// Database connection
$host = 'localhost';
$dbname = 'capstone_project'; // Adjust if different
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database successfully.\n";
    
    // Find the student with role 'student'
    $stmt = $pdo->prepare("SELECT id, firstname, lastname FROM users WHERE role = 'student' LIMIT 1");
    $stmt->execute();
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$student) {
        echo "ERROR: No student found!\n";
        exit(1);
    }
    
    echo "Student found: {$student['firstname']} {$student['lastname']} (ID: {$student['id']})\n";
    
    // Find the current enrollment
    $stmt = $pdo->prepare("SELECT id, student_id FROM enrollments LIMIT 1");
    $stmt->execute();
    $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$enrollment) {
        echo "ERROR: No enrollment found!\n";
        exit(1);
    }
    
    echo "Current enrollment student_id: {$enrollment['student_id']}\n";
    
    // Temporarily disable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Update the enrollment to point to the correct student
    $stmt = $pdo->prepare("UPDATE enrollments SET student_id = ? WHERE id = ?");
    $result = $stmt->execute([$student['id'], $enrollment['id']]);
    
    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    if ($result) {
        echo "✅ SUCCESS! Enrollment fixed!\n";
        echo "Enrollment now points to: {$student['firstname']} {$student['lastname']}\n";
        echo "Faculty Classes should now show the correct student!\n";
    } else {
        echo "ERROR: Failed to update enrollment!\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
