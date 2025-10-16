<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Registration - {{ $cor->cor_number }}</title>
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
            border-bottom: 2px solid #000;
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
        }
        
        .student-info {
            margin-bottom: 20px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        
        .info-label {
            width: 150px;
            font-weight: bold;
        }
        
        .info-value {
            flex: 1;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
        }
        
        .subjects-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .subjects-table th,
        .subjects-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        
        .subjects-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .summary {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
        }
        
        .summary-item {
            font-weight: bold;
        }
        
        .signatures {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-block {
            text-align: center;
            width: 200px;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
            height: 40px;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        
        .credited {
            background-color: #fffacd;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">OLONGAPO NATIONAL SENIOR TECHNICAL SCHOOL</div>
        <div class="school-address">Olongapo City, Zambales</div>
        <div class="document-title">CERTIFICATE OF REGISTRATION</div>
        <div style="margin-top: 10px;">
            <strong>School Year:</strong> {{ $schoolYear->year_start }}-{{ $schoolYear->year_end }} | 
            <strong>Semester:</strong> {{ $schoolYear->semester == 1 ? '1st' : '2nd' }} Semester
        </div>
    </div>

    <div class="student-info">
        <div class="info-row">
            <div class="info-label">Student Name:</div>
            <div class="info-value">{{ strtoupper($student->firstname . ' ' . ($studentInfo->extension_name ? $studentInfo->extension_name . ' ' : '') . $student->lastname) }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">LRN:</div>
            <div class="info-value">{{ $studentInfo->lrn ?? 'N/A' }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">Grade Level:</div>
            <div class="info-value">Grade {{ $cor->year_level }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">Section:</div>
            <div class="info-value">{{ $section->section_name }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">Strand:</div>
            <div class="info-value">{{ $strand->name }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">Registration Date:</div>
            <div class="info-value">{{ $cor->registration_date->format('F d, Y') }}</div>
        </div>
        
        <div class="info-row">
            <div class="info-label">COR Number:</div>
            <div class="info-value">{{ $cor->cor_number }}</div>
        </div>
    </div>

    <table class="subjects-table">
        <thead>
            <tr>
                <th style="width: 15%;">Subject Code</th>
                <th style="width: 35%;">Subject Name</th>
                <th style="width: 10%;">Units</th>
                <th style="width: 20%;">Schedule</th>
                <th style="width: 20%;">Faculty</th>
            </tr>
        </thead>
        <tbody>
            @foreach($subjects as $subject)
            <tr class="{{ $subject->is_credited ? 'credited' : '' }}">
                <td class="text-center">{{ $subject->subject_code }}</td>
                <td>{{ $subject->subject_name }}{{ $subject->is_credited ? ' (CREDITED)' : '' }}</td>
                <td class="text-center">{{ number_format($subject->units, 1) }}</td>
                <td class="text-center">
                    @if($subject->day_of_week && $subject->start_time)
                        {{ $subject->day_of_week }}<br>
                        {{ date('g:i A', strtotime($subject->start_time)) }} - {{ date('g:i A', strtotime($subject->end_time)) }}
                    @else
                        {{ $subject->is_credited ? 'N/A' : 'TBA' }}
                    @endif
                </td>
                <td class="text-center">{{ $subject->faculty_name }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-item">
            Total Subjects: {{ $subjects->count() }}
        </div>
        <div class="summary-item">
            Total Units: {{ number_format($cor->total_units, 1) }}
        </div>
        <div class="summary-item">
            Credited Subjects: {{ $subjects->where('is_credited', true)->count() }}
        </div>
    </div>

    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line"></div>
            <div>Student Signature</div>
            <div style="font-size: 10px; margin-top: 5px;">Date: _______________</div>
        </div>
        
        <div class="signature-block">
            <div class="signature-line"></div>
            <div>Registrar</div>
            <div style="font-size: 10px; margin-top: 5px;">Date: _______________</div>
        </div>
    </div>

    <div class="footer">
        <p>This is an official document. Any alteration or falsification is punishable by law.</p>
        <p>Generated on: {{ $printDate }} at {{ $printTime }} | Print Count: {{ $cor->print_count }}</p>
        <p>COR ID: {{ $cor->id }} | Generated by: {{ $cor->generator->firstname ?? 'System' }} {{ $cor->generator->lastname ?? '' }}</p>
    </div>
</body>
</html>
