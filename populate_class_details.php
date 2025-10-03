<?php

echo "Starting class_details population...\n";

try {
    // Direct PDO connection
    $host = 'localhost';
    $dbname = 'capstone_project';
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Database connected successfully\n";
    
    // Check if class_details table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'class_details'");
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo "ERROR: class_details table does not exist!\n";
        echo "Please run: php artisan migrate\n";
        exit(1);
    }
    
    echo "class_details table exists\n";
    
    // Get enrolled students
    $stmt = $pdo->prepare("
        SELECT id, student_id, assigned_section_id, school_year_id 
        FROM enrollments 
        WHERE status = 'enrolled' 
        AND assigned_section_id IS NOT NULL
    ");
    $stmt->execute();
    $enrollments = $stmt->fetchAll(PDO::FETCH_OBJ);
    
    echo "Found " . count($enrollments) . " enrolled students with sections\n";
    
    $totalInserted = 0;
    
    foreach ($enrollments as $enrollment) {
        echo "Processing enrollment ID: {$enrollment->id}\n";
        echo "  - Student ID: {$enrollment->student_id}\n";
        echo "  - Section ID: {$enrollment->assigned_section_id}\n";
        echo "  - School Year ID: {$enrollment->school_year_id}\n";
        
        // Get classes for this section and school year
        $stmt = $pdo->prepare("
            SELECT id 
            FROM class 
            WHERE section_id = ? 
            AND school_year_id = ?
        ");
        $stmt->execute([$enrollment->assigned_section_id, $enrollment->school_year_id]);
        $classes = $stmt->fetchAll(PDO::FETCH_OBJ);
        
        echo "  - Found " . count($classes) . " classes for this section\n";
        
        foreach ($classes as $class) {
            // Check if record already exists
            $stmt = $pdo->prepare("
                SELECT id 
                FROM class_details 
                WHERE class_id = ? 
                AND student_id = ?
            ");
            $stmt->execute([$class->id, $enrollment->student_id]);
            $existing = $stmt->fetchAll();
            
            if (empty($existing)) {
                // Insert class_details record
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO class_details 
                        (class_id, student_id, created_at, updated_at) 
                        VALUES (?, ?, NOW(), NOW())
                    ");
                    $result = $stmt->execute([$class->id, $enrollment->student_id]);
                    
                    if ($result) {
                        echo "    ✓ Inserted class_details for class {$class->id}\n";
                        $totalInserted++;
                    } else {
                        echo "    ✗ Failed to insert class_details for class {$class->id}\n";
                    }
                } catch (Exception $e) {
                    echo "    ✗ Error inserting class_details for class {$class->id}: " . $e->getMessage() . "\n";
                }
            } else {
                echo "    - Record already exists for class {$class->id}\n";
            }
        }
    }
    
    // Get final count
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM class_details");
    $stmt->execute();
    $finalCount = $stmt->fetch(PDO::FETCH_OBJ)->count;
    
    echo "\nCompleted!\n";
    echo "Total records inserted: {$totalInserted}\n";
    echo "Final class_details count: {$finalCount}\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
