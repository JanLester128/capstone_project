<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use Illuminate\Contracts\View\View;

class ClassRecordExport implements FromView, WithEvents
{
    protected $classData;
    protected $students;
    protected $semester;
    protected $schoolYear;

    public function __construct($classData, $students, $semester, $schoolYear)
    {
        $this->classData = $classData;
        $this->students = $students;
        $this->semester = $semester;
        $this->schoolYear = $schoolYear;
    }

    public function view(): View
    {
        return view('exports.class-record', [
            'classData' => $this->classData,
            'students' => $this->students,
            'semester' => $this->semester,
            'schoolYear' => $this->schoolYear
        ]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                // Set column widths
                $event->sheet->getDelegate()->getColumnDimension('A')->setWidth(5);  // No.
                $event->sheet->getDelegate()->getColumnDimension('B')->setWidth(30); // Learner's Names
                $event->sheet->getDelegate()->getColumnDimension('C')->setWidth(12); // 1st Quarter
                $event->sheet->getDelegate()->getColumnDimension('D')->setWidth(12); // 2nd Quarter
                $event->sheet->getDelegate()->getColumnDimension('E')->setWidth(12); // 3rd Quarter
                $event->sheet->getDelegate()->getColumnDimension('F')->setWidth(12); // 4th Quarter
                $event->sheet->getDelegate()->getColumnDimension('G')->setWidth(15); // Semester Grade
                $event->sheet->getDelegate()->getColumnDimension('H')->setWidth(20); // Remarks
                
                // Set row heights
                $event->sheet->getDelegate()->getDefaultRowDimension()->setRowHeight(25);
                
                // Style the header
                $event->sheet->getDelegate()->getStyle('A1:H20')->getFont()->setBold(true);
                $event->sheet->getDelegate()->getStyle('A1:H20')->getAlignment()->setHorizontal('center');
                
                // Add borders to data area
                $lastRow = count($this->students) + 25; // Adjust based on header rows
                $event->sheet->getDelegate()->getStyle("A20:H{$lastRow}")->getBorders()->getAllBorders()->setBorderStyle('thin');
                
                // Protect formulas but allow data entry
                $event->sheet->getDelegate()->getProtection()->setSheet(true);
                $event->sheet->getDelegate()->getStyle("C25:F{$lastRow}")->getProtection()->setLocked(false); // Grade columns
                $event->sheet->getDelegate()->getStyle("H25:H{$lastRow}")->getProtection()->setLocked(false); // Remarks column
            },
        ];
    }
}
