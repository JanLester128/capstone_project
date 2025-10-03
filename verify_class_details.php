<?php

try {
    $pdo = new PDO("mysql:host=localhost;dbname=capstone_project", 'root', '');
    
    echo "Verifying class_details records...\n";
    
    $stmt = $pdo->query("SELECT * FROM class_details");
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total class_details records: " . count($records) . "\n";
    
    foreach ($records as $record) {
        echo "- ID: {$record['id']}, Class: {$record['class_id']}, Student: {$record['student_id']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
