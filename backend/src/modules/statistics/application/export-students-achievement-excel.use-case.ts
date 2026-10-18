import { Inject, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Actor } from '../../../shared/application/actor';
import { GetStudentsAchievementReportUseCase } from './get-students-achievement-report.use-case';
import { INSTITUTE_REPOSITORY } from '../../institutes/domain/institute.repository';
import type { InstituteRepository } from '../../institutes/domain/institute.repository';

interface ExportParams {
  startDate?: string;
  endDate?: string;
  classId?: string;
  track?: 'all' | 'regular' | 'intensive';
}

@Injectable()
export class ExportStudentsAchievementExcelUseCase {
  constructor(
    private readonly getReport: GetStudentsAchievementReportUseCase,
    @Inject(INSTITUTE_REPOSITORY)
    private readonly instituteRepo: InstituteRepository,
  ) {}

  async execute(actor: Actor, instituteId: string, params: ExportParams): Promise<Buffer> {
    const report = await this.getReport.execute(actor, instituteId, params);
    const institute = await this.instituteRepo.findById(instituteId);
    const instituteName = institute?.name ?? 'المعهد';

    const wb = new ExcelJS.Workbook();
    wb.creator = 'جيل الأمل - Jeel Al Amal';
    wb.created = new Date();

    const ws = wb.addWorksheet('تقرير إنجاز الطلاب', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 7 }],
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    // Configure explicit column widths
    ws.columns = [
      { key: 'index', width: 6 },
      { key: 'name', width: 25 },
      { key: 'username', width: 18 },
      { key: 'phone', width: 16 },
      { key: 'schoolGrade', width: 16 },
      { key: 'className', width: 22 },
      { key: 'track', width: 16 },
      { key: 'attendanceRate', width: 16 },
      { key: 'present', width: 11 },
      { key: 'late', width: 11 },
      { key: 'justified', width: 12 },
      { key: 'absent', width: 12 },
      { key: 'totalSessions', width: 14 },
      { key: 'dinarsGained', width: 18 },
      { key: 'dinarsLost', width: 18 },
      { key: 'netDinars', width: 16 },
      { key: 'totalAyahs', width: 16 },
      { key: 'recitationSessions', width: 14 },
      { key: 'surahsSummary', width: 55 },
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // 1. Title Banner (Row 1)
    ws.mergeCells('A1:S1');
    const r1 = ws.getCell('A1');
    r1.value = `تقرير إنجاز الطلاب - ${instituteName}`;
    r1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.getRow(1).height = 42;

    // 2. Subtitle Banner (Row 2)
    ws.mergeCells('A2:S2');
    const r2 = ws.getCell('A2');
    const nowStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    r2.value = `الفترة المحددة: من ${report.startDate} إلى ${report.endDate}   |   تاريخ التصدير: ${nowStr}`;
    r2.font = { name: 'Arial', size: 10.5, color: { argb: 'FFCBD5E1' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    ws.getRow(2).height = 24;

    // 3. Separator (Row 3)
    ws.getRow(3).height = 10;

    // 4. Executive KPI Dashboard Cards (Rows 4-5)
    ws.getRow(4).height = 18;
    ws.getRow(5).height = 28;

    const kpis = [
      {
        cols: 'A4:C4',
        valCols: 'A5:C5',
        label: 'إجمالي الطلاب',
        val: `${report.totalStudents}`,
        color: 'FF0284C7',
      },
      {
        cols: 'D4:F4',
        valCols: 'D5:F5',
        label: 'متوسط الحضور',
        val: `${report.summary.averageAttendanceRate}%`,
        color: 'FF2563EB',
      },
      {
        cols: 'G4:I4',
        valCols: 'G5:I5',
        label: 'دنانير مكتسبة (+)',
        val: `+${report.summary.totalDinarsGained}`,
        color: 'FF16A34A',
      },
      {
        cols: 'J4:L4',
        valCols: 'J5:L5',
        label: 'دنانير مخصومة (-)',
        val: `-${report.summary.totalDinarsLost}`,
        color: 'FFDC2626',
      },
      {
        cols: 'M4:O4',
        valCols: 'M5:O5',
        label: 'صافي الدنانير',
        val: `${report.summary.totalDinarsGained - report.summary.totalDinarsLost}`,
        color: 'FFD97706',
      },
      {
        cols: 'P4:S4',
        valCols: 'P5:S5',
        label: 'إجمالي الآيات المسمعة',
        val: `${report.summary.totalAyahsRecited} آية`,
        color: 'FF7C3AED',
      },
    ];

    for (const k of kpis) {
      ws.mergeCells(k.cols);
      const lCell = ws.getCell(k.cols.split(':')[0]);
      lCell.value = k.label;
      lCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      lCell.alignment = { vertical: 'middle', horizontal: 'center' };
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      lCell.border = thinBorder;

      ws.mergeCells(k.valCols);
      const vCell = ws.getCell(k.valCols.split(':')[0]);
      vCell.value = k.val;
      vCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: k.color } };
      vCell.alignment = { vertical: 'middle', horizontal: 'center' };
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      vCell.border = thinBorder;
    }

    // 5. Separator (Row 6)
    ws.getRow(6).height = 12;

    // 6. Data Table Headers (Row 7)
    const headerRow = ws.getRow(7);
    headerRow.height = 32;

    const headers = [
      '#',
      'اسم الطالب',
      'اسم المستخدم',
      'رقم الهاتف',
      'الصف الدراسي',
      'الحلقة',
      'المسار',
      'نسبة الحضور',
      'حاضر',
      'متأخر',
      'غياب مبرر',
      'غياب غير مبرر',
      'إجمالي الجلسات',
      'دنانير مكتسبة (+)',
      'دنانير مخصومة (-)',
      'صافي الدنانير',
      'الآيات المسمعة',
      'جلسات التسميع',
      'السور المسمعة ونسبة الإنجاز (خلال الفترة)',
    ];

    headerRow.values = headers;
    for (let c = 1; c <= headers.length; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    }

    // Enable Excel AutoFilter
    ws.autoFilter = { from: 'A7', to: 'S7' };

    // 7. Student Rows (Rows 8 to N)
    report.students.forEach((s, idx) => {
      const rowNum = 8 + idx;
      const row = ws.getRow(rowNum);
      row.height = 26;

      const isEven = idx % 2 === 0;
      const baseRowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
      const trackLabel = s.track === 'intensive' ? 'المسار المكثف' : 'الأساسي';

      row.values = [
        idx + 1,
        s.name,
        `@${s.username}`,
        s.phone ?? '—',
        s.schoolGrade ?? '—',
        s.className,
        trackLabel,
        `${s.attendance.rate}%`,
        s.attendance.present,
        s.attendance.late,
        s.attendance.justified,
        s.attendance.absent,
        s.attendance.totalSessions,
        s.dinars.gained,
        s.dinars.lost,
        s.dinars.net,
        s.recitation.totalAyahs,
        s.recitation.totalSessions,
        s.recitation.surahsSummary || 'لم يسمع خلال هذه الفترة',
      ];

      for (let c = 1; c <= headers.length; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseRowBg } };
        cell.border = thinBorder;

        // Specific column styling
        if (c === 2) {
          // Student Name
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
        } else if (c === 3) {
          // Username
          cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF64748B' } };
        } else if (c === 6) {
          // Class name
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 7 && s.track === 'intensive') {
          // Track
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
        } else if (c === 8) {
          // Attendance Rate color coding
          if (s.attendance.rate >= 85) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF15803D' } };
          } else if (s.attendance.rate >= 70) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB45309' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
          }
        } else if (c === 14) {
          // Dinars Gained
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF16A34A' } };
        } else if (c === 15) {
          // Dinars Lost
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
        } else if (c === 16) {
          // Net Dinars
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        } else if (c === 19) {
          // Surahs Summary
          cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
          if (!s.recitation.surahsSummary) {
            cell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
          }
        }
      }
    });

    // 8. Total Summary Row
    const totalRowNum = 8 + report.students.length;
    const totalRow = ws.getRow(totalRowNum);
    totalRow.height = 32;

    totalRow.values = [
      '#',
      'المتوسط العام / الإجمالي',
      '',
      '',
      '',
      '',
      '',
      `${report.summary.averageAttendanceRate}%`,
      '',
      '',
      '',
      '',
      '',
      `+${report.summary.totalDinarsGained}`,
      `-${report.summary.totalDinarsLost}`,
      `${report.summary.totalDinarsGained - report.summary.totalDinarsLost}`,
      report.summary.totalAyahsRecited,
      '',
      `طلاب مسمعون: ${report.summary.studentsWithRecitations} من أصل ${report.totalStudents}`,
    ];

    for (let c = 1; c <= headers.length; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF475569' } },
        bottom: { style: 'thick', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      if (c === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (c === 14) {
        cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF16A34A' } };
      } else if (c === 15) {
        cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFDC2626' } };
      } else if (c === 19) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
