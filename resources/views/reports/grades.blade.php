<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grades Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
        }
        
        .container {
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
        }
        
        .school-name {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            margin-top: 10px;
        }
        
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px;
        }
        
        .grades-table th {
            background: #f1f5f9;
            color: #374151;
            font-weight: 600;
            padding: 6px 4px;
            text-align: left;
            border: 1px solid #d1d5db;
        }
        
        .grades-table td {
            padding: 4px;
            border: 1px solid #e5e7eb;
            vertical-align: top;
        }
        
        .grades-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .grade-cell {
            text-align: center;
            font-weight: 600;
        }
        
        .grade-excellent { color: #059669; }
        .grade-good { color: #0891b2; }
        .grade-satisfactory { color: #d97706; }
        .grade-needs-improvement { color: #dc2626; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="school-name">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</div>
            <div class="report-title">{{ $reportData['title'] }}</div>
        </div>

        @if(count($reportData['grades']) > 0)
            <table class="grades-table">
                <thead>
                    <tr>
                        <th style="width: 20%">Student Name</th>
                        <th style="width: 12%">LRN</th>
                        <th style="width: 15%">Subject</th>
                        <th style="width: 15%">Teacher</th>
                        <th style="width: 8%">Q1</th>
                        <th style="width: 8%">Q2</th>
                        <th style="width: 8%">Q3</th>
                        <th style="width: 8%">Q4</th>
                        <th style="width: 6%">Final</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($reportData['grades'] as $grade)
                        <tr>
                            <td>{{ $grade['student_name'] }}</td>
                            <td>{{ $grade['lrn'] }}</td>
                            <td>{{ $grade['subject'] }}</td>
                            <td>{{ $grade['teacher'] }}</td>
                            <td class="grade-cell">{{ $grade['first_quarter'] ?? '-' }}</td>
                            <td class="grade-cell">{{ $grade['second_quarter'] ?? '-' }}</td>
                            <td class="grade-cell">{{ $grade['third_quarter'] ?? '-' }}</td>
                            <td class="grade-cell">{{ $grade['fourth_quarter'] ?? '-' }}</td>
                            <td class="grade-cell">{{ $grade['semester_grade'] ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div style="text-align: center; padding: 40px;">
                <p>No grades found for the selected criteria.</p>
            </div>
        @endif
    </div>
</body>
</html>
