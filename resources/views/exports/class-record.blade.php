<table>
    <!-- Header Section -->
    <tr>
        <td colspan="8" style="text-align: center; font-size: 18px; font-weight: bold; padding: 10px;">
            Senior High School Class Record
        </td>
    </tr>
    <tr><td colspan="8"></td></tr>
    
    <!-- School Information -->
    <tr>
        <td><strong>REGION:</strong></td>
        <td>XI</td>
        <td><strong>DIVISION:</strong></td>
        <td>Davao City</td>
        <td><strong>SCHOOL ID:</strong></td>
        <td>301216</td>
        <td><strong>SCHOOL YEAR:</strong></td>
        <td>{{ $schoolYear->year_start }}-{{ $schoolYear->year_end }}</td>
    </tr>
    <tr>
        <td><strong>SCHOOL NAME:</strong></td>
        <td colspan="7">Obrero National High School</td>
    </tr>
    <tr><td colspan="8"></td></tr>
    
    <!-- Class Information -->
    <tr>
        <td><strong>{{ strtoupper($semester) }} QUARTER</strong></td>
        <td><strong>GRADE & SECTION:</strong></td>
        <td colspan="2">{{ $classData->section->section_name ?? 'Grade 11' }}</td>
        <td><strong>TEACHER:</strong></td>
        <td colspan="3">{{ $classData->faculty->firstname }} {{ $classData->faculty->lastname }}</td>
    </tr>
    <tr>
        <td></td>
        <td><strong>SEMESTER:</strong></td>
        <td>{{ $semester === '1st' ? '1ST' : '2ND' }}</td>
        <td><strong>SUBJECT:</strong></td>
        <td colspan="2">{{ $classData->subject->name }}</td>
        <td><strong>TRACK:</strong></td>
        <td>{{ $classData->subject->strand->name ?? 'Core Subject (All Tracks)' }}</td>
    </tr>
    <tr><td colspan="8"></td></tr>
    
    <!-- Grade Headers -->
    <tr style="background-color: #f0f0f0; font-weight: bold; text-align: center;">
        <td style="border: 1px solid black;">No.</td>
        <td style="border: 1px solid black;">LEARNER'S NAMES</td>
        <td style="border: 1px solid black;">1ST QUARTER</td>
        <td style="border: 1px solid black;">2ND QUARTER</td>
        <td style="border: 1px solid black;">3RD QUARTER</td>
        <td style="border: 1px solid black;">4TH QUARTER</td>
        <td style="border: 1px solid black;">SEMESTER GRADE</td>
        <td style="border: 1px solid black;">REMARKS</td>
    </tr>
    
    <!-- Instructions Row -->
    <tr style="background-color: #ffffcc; font-size: 10px; text-align: center;">
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black; font-style: italic;">Enter grades 0-100</td>
        <td style="border: 1px solid black; color: blue;">Enter grade</td>
        <td style="border: 1px solid black; color: blue;">Enter grade</td>
        <td style="border: 1px solid black; color: blue;">Enter grade</td>
        <td style="border: 1px solid black; color: blue;">Enter grade</td>
        <td style="border: 1px solid black; color: green;">Auto-calculated</td>
        <td style="border: 1px solid black; color: blue;">Optional remarks</td>
    </tr>
    
    <!-- Student Data Rows -->
    @foreach($students as $index => $student)
    <tr>
        <td style="border: 1px solid black; text-align: center;">{{ $index + 1 }}</td>
        <td style="border: 1px solid black; padding-left: 5px;">{{ $student->lastname }}, {{ $student->firstname }}</td>
        <td style="border: 1px solid black; text-align: center; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; text-align: center; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; text-align: center; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; text-align: center; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; text-align: center; background-color: #e6ffe6;">
            =IF(AND(C{{ $index + 12 }}<>"",D{{ $index + 12 }}<>"",E{{ $index + 12 }}<>"",F{{ $index + 12 }}<>""),(C{{ $index + 12 }}+D{{ $index + 12 }}+E{{ $index + 12 }}+F{{ $index + 12 }})/4,
            IF(AND(C{{ $index + 12 }}<>"",D{{ $index + 12 }}<>"",E{{ $index + 12 }}<>""),((C{{ $index + 12 }}+D{{ $index + 12 }}+E{{ $index + 12 }})/3),
            IF(AND(C{{ $index + 12 }}<>"",D{{ $index + 12 }}<>""),((C{{ $index + 12 }}+D{{ $index + 12 }})/2),
            IF(C{{ $index + 12 }}<>"",C{{ $index + 12 }},""))))
        </td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
    </tr>
    @endforeach
    
    <!-- Empty rows for additional students -->
    @for($i = count($students); $i < 50; $i++)
    <tr>
        <td style="border: 1px solid black; text-align: center;">{{ $i + 1 }}</td>
        <td style="border: 1px solid black;"></td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
        <td style="border: 1px solid black; background-color: #e6ffe6;">
            =IF(AND(C{{ $i + 12 }}<>"",D{{ $i + 12 }}<>"",E{{ $i + 12 }}<>"",F{{ $i + 12 }}<>""),(C{{ $i + 12 }}+D{{ $i + 12 }}+E{{ $i + 12 }}+F{{ $i + 12 }})/4,
            IF(AND(C{{ $i + 12 }}<>"",D{{ $i + 12 }}<>"",E{{ $i + 12 }}<>""),((C{{ $i + 12 }}+D{{ $i + 12 }}+E{{ $i + 12 }})/3),
            IF(AND(C{{ $i + 12 }}<>"",D{{ $i + 12 }}<>""),((C{{ $i + 12 }}+D{{ $i + 12 }})/2),
            IF(C{{ $i + 12 }}<>"",C{{ $i + 12 }},""))))
        </td>
        <td style="border: 1px solid black; background-color: #f9f9f9;"></td>
    </tr>
    @endfor
    
    <!-- Footer Information -->
    <tr><td colspan="8"></td></tr>
    <tr>
        <td colspan="8" style="font-size: 10px; color: #666;">
            <strong>Instructions:</strong> 
            1. Enter grades in the blue columns (0-100) 
            2. Semester grade will auto-calculate 
            3. Save and upload this file back to the system 
            4. Passing grade: 75 and above
        </td>
    </tr>
    <tr>
        <td colspan="8" style="font-size: 10px; color: #666;">
            <strong>Generated:</strong> {{ date('F j, Y g:i A') }} | 
            <strong>Class:</strong> {{ $classData->subject->name }} | 
            <strong>Semester:</strong> {{ $semester }} | 
            <strong>School Year:</strong> {{ $schoolYear->year_start }}-{{ $schoolYear->year_end }}
        </td>
    </tr>
</table>
