<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Registration - {{ $corData['student']['name'] }}</title>
    <style>
        /* Following HCI Principle 8: Aesthetic and minimalist design */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
        }
        
        /* Header Styles */
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }
        
        .school-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .school-subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        
        .document-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-top: 15px;
        }
        
        /* Student Info Section */
        .student-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-group h3 {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-label {
            font-weight: 600;
            color: #4b5563;
            display: inline-block;
            width: 120px;
        }
        
        .info-value {
            color: #1f2937;
        }
        
        /* Schedule Tables */
        .semester-section {
            margin-bottom: 40px;
        }
        
        .semester-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 15px;
            padding: 10px;
            background: #dbeafe;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }
        
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .schedule-table th {
            background: #f1f5f9;
            color: #374151;
            font-weight: 600;
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #d1d5db;
            font-size: 11px;
        }
        
        .schedule-table td {
            padding: 10px 8px;
            border: 1px solid #e5e7eb;
            font-size: 11px;
        }
        
        .schedule-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .schedule-table tbody tr:hover {
            background: #f3f4f6;
        }
        
        /* Day grouping */
        .day-group {
            background: #eff6ff !important;
            font-weight: 600;
            color: #1e40af;
        }
        
        /* Footer Signatures */
        .signatures {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
            text-align: center;
        }
        
        .signature-block {
            padding: 20px 0;
        }
        
        .signature-line {
            border-top: 1px solid #374151;
            margin-top: 40px;
            padding-top: 8px;
        }
        
        .signature-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        .signature-title {
            font-size: 10px;
            color: #6b7280;
            margin-top: 2px;
        }
        
        .signature-label {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        /* Print Styles */
        @media print {
            body {
                font-size: 11px;
            }
            
            .container {
                padding: 0.3in;
                max-width: none;
            }
            
            .no-print {
                display: none !important;
            }
            
            .schedule-table {
                page-break-inside: avoid;
            }
            
            .semester-section {
                page-break-inside: avoid;
            }
        }
        
        /* Action Buttons */
        .action-buttons {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 0 10px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }
        
        .btn-primary {
            background: #2563eb;
            color: white;
        }
        
        .btn-primary:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="school-name">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</div>
            <div class="school-subtitle">SENIOR HIGH SCHOOL PROGRAM</div>
            <div class="document-title">CERTIFICATE OF REGISTRATION</div>
            <div style="margin-top: 10px; font-size: 14px; color: #6b7280;">
                {{ $corData['school_year']['full_name'] }}
            </div>
        </div>

        <!-- Action Buttons (Hidden in print) -->
        <div class="action-buttons no-print">
            <button onclick="window.print()" class="btn btn-primary">
                🖨️ Print COR
            </button>
            <a href="{{ route('cor.download-pdf', $corData['student']['id']) }}" class="btn btn-secondary">
                📄 Download PDF
            </a>
        </div>

        <!-- Student Information -->
        <div class="student-info">
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

        <!-- First Semester Schedule -->
        <div class="semester-section">
            <div class="semester-title">{{ $corData['first_semester']['semester_name'] }}</div>
            
            @if(count($corData['first_semester']['schedules']) > 0)
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 12%">Subject Code</th>
                            <th style="width: 25%">Subject Name</th>
                            <th style="width: 20%">Faculty</th>
                            <th style="width: 12%">Day</th>
                            <th style="width: 15%">Time</th>
                            <th style="width: 16%">Room</th>
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
                <p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">
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
                            <th style="width: 25%">Subject Name</th>
                            <th style="width: 20%">Faculty</th>
                            <th style="width: 12%">Day</th>
                            <th style="width: 15%">Time</th>
                            <th style="width: 16%">Room</th>
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
                <p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">
                    No schedules available for second semester
                </p>
            @endif
        </div>

        <!-- Important Notes -->
        <div style="margin: 30px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <h4 style="color: #92400e; margin-bottom: 10px; font-size: 14px;">Important Notes:</h4>
            <ul style="color: #92400e; font-size: 11px; margin-left: 20px;">
                <li>This Certificate of Registration covers the full academic year (both semesters)</li>
                <li>Students are enrolled in all subjects for both 1st and 2nd semester upon enrollment</li>
                <li>No midyear changes to enrollment or schedules are permitted</li>
                <li>Contact the registrar for any concerns regarding your enrollment</li>
            </ul>
        </div>

        <!-- Signatures -->
        <div class="signatures">
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
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">
            This is an official document generated by the ONSTS Student Information System
        </div>
    </div>

    <script>
        // Following HCI Principle 7: Flexibility and efficiency of use
        document.addEventListener('keydown', function(e) {
            // Ctrl+P for print
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
    </script>
</body>
</html>
