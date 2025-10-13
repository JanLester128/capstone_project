<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Registration - {{ $student->firstname }} {{ $student->lastname }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .school-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .school-address {
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .document-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 15px;
            text-decoration: underline;
        }
        
        .student-info {
            margin: 20px 0;
            display: table;
            width: 100%;
        }
        
        .info-row {
            display: table-row;
        }
        
        .info-label {
            display: table-cell;
            width: 150px;
            font-weight: bold;
            padding: 5px 0;
        }
        
        .info-value {
            display: table-cell;
            padding: 5px 0;
            border-bottom: 1px solid #ccc;
        }
        
        .subjects-section {
            margin: 30px 0;
        }
        
        .semester-title {
            font-size: 14px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            background-color: #f0f0f0;
            padding: 8px;
            text-align: center;
        }
        
        .subjects-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .subjects-table th,
        .subjects-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }
        
        .subjects-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        .subject-code {
            width: 100px;
            text-align: center;
        }
        
        .subject-name {
            width: 300px;
        }
        
        .subject-units {
            width: 60px;
            text-align: center;
        }
        
        .signature-section {
            margin-top: 40px;
            display: table;
            width: 100%;
        }
        
        .signature-left,
        .signature-right {
            display: table-cell;
            width: 50%;
            text-align: center;
            vertical-align: top;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            width: 200px;
            margin: 30px auto 5px auto;
        }
        
        .signature-label {
            font-size: 11px;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">SENIOR HIGH SCHOOL</div>
        <div class="school-address">Your School Address Here</div>
        <div class="document-title">CERTIFICATE OF REGISTRATION</div>
        <div style="font-size: 12px; margin-top: 10px;">
            School Year {{ $school_year->year_start }}-{{ $school_year->year_end }}
        </div>
    </div>

    <div class="student-info">
        <div class="info-row">
            <div class="info-label">Student Name:</div>
            <div class="info-value">{{ $student['lastname'] }}, {{ $student['firstname'] }} {{ $student['middlename'] ?? '' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">LRN:</div>
            <div class="info-value">{{ $student['lrn'] ?? 'N/A' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Grade Level:</div>
            <div class="info-value">{{ $student['grade_level'] }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Strand:</div>
            <div class="info-value">{{ $strand->name ?? 'N/A' }} ({{ $strand->code ?? 'N/A' }})</div>
        </div>
        <div class="info-row">
            <div class="info-label">Section:</div>
            <div class="info-value">{{ $section->section_name ?? 'TBA' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Enrollment Date:</div>
            <div class="info-value">{{ $generated_date }}</div>
        </div>
    </div>

    <div class="subjects-section">
        @if(isset($schedules['first_semester']) && count($schedules['first_semester']) > 0)
        <div class="semester-title">FIRST SEMESTER</div>
        <table class="subjects-table">
            <thead>
                <tr>
                    <th class="subject-code">Subject Code</th>
                    <th class="subject-name">Subject Name</th>
                    <th class="subject-units">Units</th>
                    <th>Teacher</th>
                    <th>Schedule</th>
                </tr>
            </thead>
            <tbody>
                @foreach($schedules['first_semester'] as $subject)
                <tr>
                    <td class="subject-code">{{ $subject['subject_code'] }}</td>
                    <td class="subject-name">{{ $subject['subject_name'] }}</td>
                    <td class="subject-units">{{ $subject['units'] ?? 1 }}</td>
                    <td>{{ $subject['teacher'] }}</td>
                    <td>
                        @foreach($subject['schedules'] as $schedule)
                            {{ $schedule['day'] }} {{ $schedule['time'] }}
                            @if($schedule['room']) - {{ $schedule['room'] }}@endif
                            @if(!$loop->last)<br>@endif
                        @endforeach
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        @if(isset($schedules['second_semester']) && count($schedules['second_semester']) > 0)
        <div class="semester-title">SECOND SEMESTER</div>
        <table class="subjects-table">
            <thead>
                <tr>
                    <th class="subject-code">Subject Code</th>
                    <th class="subject-name">Subject Name</th>
                    <th class="subject-units">Units</th>
                    <th>Teacher</th>
                    <th>Schedule</th>
                </tr>
            </thead>
            <tbody>
                @foreach($schedules['second_semester'] as $subject)
                <tr>
                    <td class="subject-code">{{ $subject['subject_code'] }}</td>
                    <td class="subject-name">{{ $subject['subject_name'] }}</td>
                    <td class="subject-units">{{ $subject['units'] ?? 1 }}</td>
                    <td>{{ $subject['teacher'] }}</td>
                    <td>
                        @foreach($subject['schedules'] as $schedule)
                            {{ $schedule['day'] }} {{ $schedule['time'] }}
                            @if($schedule['room']) - {{ $schedule['room'] }}@endif
                            @if(!$loop->last)<br>@endif
                        @endforeach
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        @if((!isset($schedules['first_semester']) || count($schedules['first_semester']) == 0) && 
            (!isset($schedules['second_semester']) || count($schedules['second_semester']) == 0))
        <div style="text-align: center; padding: 20px; font-style: italic;">
            Subjects will be assigned upon section placement by the registrar.
        </div>
        @endif
    </div>

    <div class="signature-section">
        <div class="signature-left">
            <div class="signature-line"></div>
            <div class="signature-label">Student Signature</div>
        </div>
        <div class="signature-right">
            <div class="signature-line"></div>
            <div class="signature-label">Registrar Signature</div>
        </div>
    </div>

    <div class="footer">
        <p>This Certificate of Registration is issued on {{ $generatedAt }}</p>
        <p>Document ID: COR-{{ $enrollment->id }}-{{ date('Y') }}</p>
        @if($enrollment->enrollment_method === 'auto')
        <p><em>Auto-enrolled based on Grade 11 completion</em></p>
        @endif
    </div>

    <script>
        // Auto-print functionality for web view
        function printCOR() {
            window.print();
        }
        
        // Add print button for web view (hidden in PDF)
        if (window.location.pathname.includes('/cor/') && !window.location.pathname.includes('/pdf')) {
            document.addEventListener('DOMContentLoaded', function() {
                const printButton = document.createElement('button');
                printButton.textContent = 'Print COR';
                printButton.className = 'no-print';
                printButton.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; z-index: 1000;';
                printButton.onclick = printCOR;
                document.body.appendChild(printButton);
            });
        }
    </script>
</body>
</html>
