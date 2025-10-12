<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Registration - {{ $corData['student']['name'] }}</title>
    <style>
        /* PDF-optimized styles following HCI Principle 8: Aesthetic and minimalist design */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #333;
            background: white;
        }
        
        .container {
            padding: 20px;
            background: white;
        }
        
        /* Header Styles */
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
        }
        
        .school-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 4px;
        }
        
        .school-subtitle {
            font-size: 14px;
            font-weight: 600;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        
        .document-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-top: 12px;
        }
        
        /* Student Info Section */
        .student-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        
        .info-group {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
        }
        
        .info-group h3 {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 8px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 3px;
        }
        
        .info-item {
            margin-bottom: 6px;
        }
        
        .info-label {
            font-weight: 600;
            color: #4b5563;
            display: inline-block;
            width: 100px;
        }
        
        .info-value {
            color: #1f2937;
        }
        
        /* Schedule Tables */
        .semester-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .semester-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 12px;
            padding: 8px;
            background: #dbeafe;
            border-radius: 4px;
            border-left: 3px solid #2563eb;
        }
        
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        
        .schedule-table th {
            background: #f1f5f9;
            color: #374151;
            font-weight: 600;
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #d1d5db;
            font-size: 10px;
        }
        
        .schedule-table td {
            padding: 6px;
            border: 1px solid #e5e7eb;
            font-size: 10px;
            vertical-align: top;
        }
        
        .schedule-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        /* Day grouping */
        .day-group {
            background: #eff6ff !important;
            font-weight: 600;
            color: #1e40af;
        }
        
        /* Footer Signatures */
        .signatures {
            margin-top: 40px;
            display: table;
            width: 100%;
            text-align: center;
        }
        
        .signature-block {
            display: table-cell;
            width: 33.33%;
            padding: 15px 10px;
            vertical-align: top;
        }
        
        .signature-line {
            border-top: 1px solid #374151;
            margin-top: 30px;
            padding-top: 6px;
        }
        
        .signature-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 10px;
        }
        
        .signature-title {
            font-size: 9px;
            color: #6b7280;
            margin-top: 2px;
        }
        
        .signature-label {
            font-size: 9px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        /* Notes Section */
        .notes-section {
            margin: 25px 0;
            padding: 12px;
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
            border-radius: 3px;
        }
        
        .notes-title {
            color: #92400e;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .notes-list {
            color: #92400e;
            font-size: 10px;
            margin-left: 15px;
        }
        
        .notes-list li {
            margin-bottom: 3px;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #6b7280;
        }
        
        /* Prevent page breaks */
        .no-break {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header no-break">
            <div class="school-name">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</div>
            <div class="school-subtitle">SENIOR HIGH SCHOOL PROGRAM</div>
            <div class="document-title">CERTIFICATE OF REGISTRATION</div>
            <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                {{ $corData['school_year']['full_name'] }}
            </div>
        </div>

        <!-- Student Information -->
        <div class="student-info no-break">
            <div class="info-row">
                <div class="info-group">
                    <h3>Student Information</h3>
                    <div class="info-item">
                        <span class="info-label">Name:</span>
                        <span class="info-value">{{ $corData['student']['name'] }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">LRN:</span>
                        <span class="info-value">{{ $corData['student']['lrn'] }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Grade Level:</span>
                        <span class="info-value">{{ $corData['student']['grade_level'] }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Strand:</span>
                        <span class="info-value">{{ $corData['student']['strand']['name'] ?? 'N/A' }}</span>
                    </div>
                </div>
                
                <div class="info-group">
                    <h3>Enrollment Details</h3>
                    <div class="info-item">
                        <span class="info-label">Section:</span>
                        <span class="info-value">{{ $corData['student']['section']['section_name'] ?? 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">School Year:</span>
                        <span class="info-value">{{ $corData['school_year']['year'] }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date Issued:</span>
                        <span class="info-value">{{ $corData['prepared_by']['date'] }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- First Semester Schedule -->
        <div class="semester-section">
            <div class="semester-title">{{ $corData['first_semester']['semester_name'] }}</div>
            
            @if(count($corData['first_semester']['schedules']) > 0)
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 12%">Subject Code</th>
                            <th style="width: 28%">Subject Name</th>
                            <th style="width: 22%">Faculty</th>
                            <th style="width: 12%">Day</th>
                            <th style="width: 16%">Time</th>
                            <th style="width: 10%">Room</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $groupedSchedules = collect($corData['first_semester']['schedules'])->groupBy('day_of_week');
                            $dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        @endphp
                        
                        @foreach($dayOrder as $day)
                            @if(isset($groupedSchedules[$day]))
                                @foreach($groupedSchedules[$day] as $index => $schedule)
                                    <tr>
                                        <td>{{ $schedule['subject_code'] }}</td>
                                        <td>{{ $schedule['subject_name'] }}</td>
                                        <td>{{ $schedule['faculty_name'] }}</td>
                                        <td>{{ $index === 0 ? $day : '' }}</td>
                                        <td>{{ $schedule['time_display'] }}</td>
                                        <td>{{ $schedule['room'] }}</td>
                                    </tr>
                                @endforeach
                            @endif
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="text-align: center; color: #6b7280; font-style: italic; padding: 15px;">
                    No schedules available for first semester
                </p>
            @endif
        </div>

        <!-- Second Semester Schedule -->
        <div class="semester-section">
            <div class="semester-title">{{ $corData['second_semester']['semester_name'] }}</div>
            
            @if(count($corData['second_semester']['schedules']) > 0)
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 12%">Subject Code</th>
                            <th style="width: 28%">Subject Name</th>
                            <th style="width: 22%">Faculty</th>
                            <th style="width: 12%">Day</th>
                            <th style="width: 16%">Time</th>
                            <th style="width: 10%">Room</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $groupedSchedules = collect($corData['second_semester']['schedules'])->groupBy('day_of_week');
                        @endphp
                        
                        @foreach($dayOrder as $day)
                            @if(isset($groupedSchedules[$day]))
                                @foreach($groupedSchedules[$day] as $index => $schedule)
                                    <tr>
                                        <td>{{ $schedule['subject_code'] }}</td>
                                        <td>{{ $schedule['subject_name'] }}</td>
                                        <td>{{ $schedule['faculty_name'] }}</td>
                                        <td>{{ $index === 0 ? $day : '' }}</td>
                                        <td>{{ $schedule['time_display'] }}</td>
                                        <td>{{ $schedule['room'] }}</td>
                                    </tr>
                                @endforeach
                            @endif
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="text-align: center; color: #6b7280; font-style: italic; padding: 15px;">
                    No schedules available for second semester
                </p>
            @endif
        </div>

        <!-- Important Notes -->
        <div class="notes-section no-break">
            <div class="notes-title">Important Notes:</div>
            <ul class="notes-list">
                <li>This Certificate of Registration covers the full academic year (both semesters)</li>
                <li>Students are enrolled in all subjects for both 1st and 2nd semester upon enrollment</li>
                <li>No midyear changes to enrollment or schedules are permitted</li>
                <li>Contact the registrar for any concerns regarding your enrollment</li>
            </ul>
        </div>

        <!-- Signatures -->
        <div class="signatures no-break">
            <div class="signature-block">
                <div class="signature-label">Prepared by:</div>
                <div class="signature-line">
                    <div class="signature-name">{{ $corData['prepared_by']['name'] }}</div>
                    <div class="signature-title">{{ $corData['prepared_by']['position'] }}</div>
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature-label">Reviewed by:</div>
                <div class="signature-line">
                    <div class="signature-name">_________________________</div>
                    <div class="signature-title">Academic Supervisor</div>
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature-label">Approved by:</div>
                <div class="signature-line">
                    <div class="signature-name">_________________________</div>
                    <div class="signature-title">School Registrar</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            This is an official document generated by the ONSTS Student Information System<br>
            Generated on {{ now()->format('F j, Y \a\t g:i A') }}
        </div>
    </div>
</body>
</html>
