'use client';

import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Users,
  Percent,
  Coins,
  BookOpen,
  Zap,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useClasses, useStudentsAchievementReport } from '@/lib/queries';
import type { StudentAchievementItem, StudentsAchievementReportResponse } from '@/lib/types';
import { GradeLabel } from '@/features/shared/grade-select';

interface Props {
  instituteId: string;
  instituteName?: string;
  intensiveTrackEnabled?: boolean;
  trigger?: React.ReactNode;
}

type PresetKey = 'last30' | 'thisMonth' | 'lastMonth' | 'last14' | 'last90' | 'custom';

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetDates(preset: PresetKey): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = toDateString(now);

  switch (preset) {
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toDateString(start), endDate: todayStr };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toDateString(start), endDate: toDateString(end) };
    }
    case 'last14': {
      const start = new Date();
      start.setDate(start.getDate() - 14);
      return { startDate: toDateString(start), endDate: todayStr };
    }
    case 'last90': {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { startDate: toDateString(start), endDate: todayStr };
    }
    case 'last30':
    default: {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { startDate: toDateString(start), endDate: todayStr };
    }
  }
}

export function StudentAchievementReportDialog({
  instituteId,
  instituteName = 'المعهد',
  intensiveTrackEnabled = false,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PresetKey>('last30');

  const initialDates = useMemo(() => getPresetDates('last30'), []);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [track, setTrack] = useState<'all' | 'regular' | 'intensive'>('all');
  const [classId, setClassId] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: classes } = useClasses(instituteId);

  // Fetch report only when dialog is open
  const { data: report, isLoading, isFetching } = useStudentsAchievementReport(
    instituteId,
    {
      startDate,
      endDate,
      classId: classId === 'all' ? undefined : classId,
      track,
    },
    { enabled: open && !!instituteId },
  );

  const handleSelectPreset = (key: PresetKey) => {
    setPreset(key);
    if (key !== 'custom') {
      const range = getPresetDates(key);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  // Filter students by name/username/grade
  const filteredStudents = useMemo(() => {
    if (!report?.students) return [];
    const q = search.trim().toLowerCase();
    if (!q) return report.students;
    return report.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.schoolGrade && s.schoolGrade.toLowerCase().includes(q)) ||
        s.className.toLowerCase().includes(q),
    );
  }, [report?.students, search]);

  // Export to CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleExportCsv = () => {
    if (!report) return;

    const escapeCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      '#',
      'اسم الطالب',
      'اسم المستخدم',
      'رقم الهاتف',
      'الصف الدراسي',
      'الحلقة',
      'المسار',
      'نسبة الحضور (%)',
      'جلسات حاضر',
      'جلسات متأخر',
      'غياب مبرر',
      'غياب غير مبرر',
      'إجمالي جلسات الحضور',
      'الدنانير المكتسبة (+)',
      'الدنانير المخصومة (-)',
      'صافي الدنانير',
      'إجمالي الآيات المسمعة',
      'عدد جلسات التسميع',
      'السور المسمعة ونسبتها خلال الفترة',
    ];

    const rows = filteredStudents.map((s, idx) => {
      const trackLabel = s.track === 'intensive' ? 'المسار المكثف' : 'الأساسي';
      return [
        escapeCell(idx + 1),
        escapeCell(s.name),
        escapeCell(s.username),
        escapeCell(s.phone ?? ''),
        escapeCell(s.schoolGrade ?? ''),
        escapeCell(s.className),
        escapeCell(trackLabel),
        escapeCell(`${s.attendance.rate}%`),
        escapeCell(s.attendance.present),
        escapeCell(s.attendance.late),
        escapeCell(s.attendance.justified),
        escapeCell(s.attendance.absent),
        escapeCell(s.attendance.totalSessions),
        escapeCell(s.dinars.gained),
        escapeCell(s.dinars.lost),
        escapeCell(s.dinars.net),
        escapeCell(s.recitation.totalAyahs),
        escapeCell(s.recitation.totalSessions),
        escapeCell(s.recitation.surahsSummary || 'لم يسمع خلال هذه الفترة'),
      ].join(',');
    });

    const summaryRow = [
      '#',
      'المتوسط العام / الإجمالي',
      '',
      '',
      '',
      '',
      '',
      escapeCell(`${report.summary.averageAttendanceRate}%`),
      '',
      '',
      '',
      '',
      '',
      escapeCell(report.summary.totalDinarsGained),
      escapeCell(report.summary.totalDinarsLost),
      escapeCell(report.summary.totalDinarsGained - report.summary.totalDinarsLost),
      escapeCell(report.summary.totalAyahsRecited),
      '',
      escapeCell(`طلاب سمعوا: ${report.summary.studentsWithRecitations} من ${report.totalStudents}`),
    ].join(',');

    const titleRows = [
      `"تقرير إنجاز الطلاب - ${instituteName.replace(/"/g, '""')}"`,
      `"الفترة المحددة: من ${report.startDate} إلى ${report.endDate}"`,
      `"تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}"`,
      '',
    ];

    // UTF-8 BOM (\uFEFF) ensures Arabic renders properly in Excel
    const csvContent = '\uFEFF' + [...titleRows, headers.join(','), ...rows, '', summaryRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_انجاز_الطلاب_${report.startDate}_${report.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open printable HTML view
  const handlePrint = () => {
    if (!report) return;
    const win = window.open('', '_blank');
    if (!win) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير إنجاز الطلاب - ${instituteName}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Arial, sans-serif; margin: 0; color: #0f172a; font-size: 11px; direction: rtl; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
          .header h1 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; }
          .header p { margin: 0; color: #64748b; font-size: 12px; }
          .kpis { display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; }
          .kpi { text-align: center; }
          .kpi .val { font-size: 15px; font-weight: bold; color: #0284c7; }
          .kpi .lbl { font-size: 10px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; }
          th { background: #f1f5f9; font-weight: bold; font-size: 10.5px; color: #334155; }
          .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e0f2fe; color: #0369a1; }
          .surah-chip { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 1px 4px; border-radius: 3px; font-size: 9.5px; margin: 1px; }
          .dinars-gain { color: #16a34a; font-weight: bold; }
          .dinars-loss { color: #dc2626; font-weight: bold; }
          .net-dinars { font-weight: bold; color: #0f172a; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير إنجاز الطلاب - ${instituteName}</h1>
          <p>الفترة المحددة: من <strong>${report.startDate}</strong> إلى <strong>${report.endDate}</strong> | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        <div class="kpis">
          <div class="kpi"><div class="val">${filteredStudents.length}</div><div class="lbl">الطلاب المشمولين</div></div>
          <div class="kpi"><div class="val">${report.summary.averageAttendanceRate}%</div><div class="lbl">متوسط الحضور</div></div>
          <div class="kpi"><div class="val dinars-gain">+${report.summary.totalDinarsGained}</div><div class="lbl">دنانير مكتسبة</div></div>
          <div class="kpi"><div class="val dinars-loss">-${report.summary.totalDinarsLost}</div><div class="lbl">دنانير مخصومة</div></div>
          <div class="kpi"><div class="val">${report.summary.totalAyahsRecited}</div><div class="lbl">آيات مسمعة</div></div>
          <div class="kpi"><div class="val">${report.summary.studentsWithRecitations}</div><div class="lbl">طلاب مسمعون</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>اسم الطالب</th>
              <th>الحلقة</th>
              <th>نسبة الحضور</th>
              <th>دنانير (+)</th>
              <th>دنانير (-)</th>
              <th>صافي الدنانير</th>
              <th>السور المسمعة ونسبة الإنجاز (خلال الفترة)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents
              .map(
                (s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${s.name}</strong><br><small style="color:#64748b">${s.username}</small></td>
                <td>${s.className}</td>
                <td><span class="badge">${s.attendance.rate}%</span></td>
                <td class="dinars-gain">+${s.dinars.gained}</td>
                <td class="dinars-loss">-${s.dinars.lost}</td>
                <td class="net-dinars">${s.dinars.net}</td>
                <td>
                  ${
                    s.recitation.surahs.length > 0
                      ? s.recitation.surahs
                          .map((surah) => `<span class="surah-chip">${surah.name} (${surah.percent}%)</span>`)
                          .join(' ')
                      : '<span style="color:#94a3b8">—</span>'
                  }
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            className="flex items-center gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>تقرير إنجاز الطلاب</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <span>تقرير إنجاز الطلاب</span>
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                تصدير ومراجعة الحضور، الدنانير المكتسبة والمخصومة، وتسميعات السور ونسبها خلال المدة المحددة.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isLoading || !report}
                className="gap-1.5"
                title="طباعة التقرير"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة</span>
              </Button>
              <Button
                size="sm"
                onClick={handleExportCsv}
                disabled={isLoading || !report}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                title="تحميل ملف Excel بصيغة CSV يدعم العربية"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>تصدير Excel (CSV)</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Controls */}
        <div className="p-4 border-b bg-card space-y-3 shrink-0">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground me-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>فترة التقرير:</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant={preset === 'last30' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('last30')}
            >
              آخر شهر (30 يوماً)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === 'thisMonth' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('thisMonth')}
            >
              هذا الشهر
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === 'lastMonth' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('lastMonth')}
            >
              الشهر الماضي
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === 'last14' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('last14')}
            >
              آخر أسبوعين
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === 'last90' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('last90')}
            >
              آخر 3 أشهر
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === 'custom' ? 'default' : 'outline'}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => handleSelectPreset('custom')}
            >
              تاريخ مخصص
            </Button>
          </div>

          {/* Date and Select Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-center">
            {/* Start Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground shrink-0 w-12">من:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset('custom');
                }}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground shrink-0 w-12">إلى:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset('custom');
                }}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Class filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground shrink-0">الحلقة:</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="جميع الحلقات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحلقات</SelectItem>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Track filter (if enabled) */}
            {intensiveTrackEnabled ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground shrink-0">المسار:</label>
                <Select value={track} onValueChange={(v) => setTrack(v as any)}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المسارات</SelectItem>
                    <SelectItem value="regular">الأساسي فقط</SelectItem>
                    <SelectItem value="intensive">المكثف فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="بحث عن طالب..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
              </div>
            )}
          </div>

          {/* If intensive is enabled, put search on separate line */}
          {intensiveTrackEnabled && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="بحث عن طالب بالاسم، اسم المستخدم، أو الحلقة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary KPI Cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-muted/10 border-b shrink-0 text-xs">
            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5 text-sky-500" />
                <span>الطلاب</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5">{report.totalStudents}</p>
            </div>

            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <Percent className="h-3.5 w-3.5 text-blue-500" />
                <span>متوسط الحضور</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5 text-blue-600 dark:text-blue-400">
                {report.summary.averageAttendanceRate}%
              </p>
            </div>

            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span>دنانير مكتسبة</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5 text-emerald-600 dark:text-emerald-400">
                +{report.summary.totalDinarsGained}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                <span>دنانير مخصومة</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5 text-rose-600 dark:text-rose-400">
                -{report.summary.totalDinarsLost}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span>صافي الدنانير</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5 text-amber-600 dark:text-amber-400">
                {report.summary.totalDinarsGained - report.summary.totalDinarsLost}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-2 text-center shadow-xs">
              <span className="text-muted-foreground flex items-center justify-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                <span>آيات مسمعة</span>
              </span>
              <p className="font-bold text-sm sm:text-base mt-0.5 text-indigo-600 dark:text-indigo-400">
                {report.summary.totalAyahsRecited}
              </p>
            </div>
          </div>
        )}

        {/* Students Table Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[280px]">
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">جاري تجميع بيانات إنجاز الطلاب...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-2">
              <Users className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">لا توجد بيانات طلاب مطابقة للفترة المحددة</p>
              <p className="text-xs">جرب توسيع نطاق التاريخ أو تغيير معايير التصفية</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-muted/40 text-muted-foreground border-b font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">الطالب</th>
                    <th className="py-2.5 px-3">الحلقة</th>
                    <th className="py-2.5 px-3 text-center">نسبة الحضور</th>
                    <th className="py-2.5 px-3 text-center">الدنانير (المكتسبة / المخصومة)</th>
                    <th className="py-2.5 px-3">السور المسمعة ونسبتها خلال الفترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((s, idx) => {
                    const isHighAttendance = s.attendance.rate >= 85;
                    const isMidAttendance = s.attendance.rate >= 70 && s.attendance.rate < 85;

                    return (
                      <tr
                        key={s.studentId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{idx + 1}</td>

                        {/* Student Name & Meta */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{s.name}</span>
                            {s.track === 'intensive' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Zap className="h-2.5 w-2.5 fill-amber-500" />
                                <span>مكثف</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span dir="ltr">@{s.username}</span>
                            {s.schoolGrade && (
                              <>
                                <span>•</span>
                                <GradeLabel grade={s.schoolGrade} />
                              </>
                            )}
                          </div>
                        </td>

                        {/* Class */}
                        <td className="py-2.5 px-3">
                          <span className="text-foreground font-medium">{s.className}</span>
                        </td>

                        {/* Attendance */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs"
                            style={{
                              backgroundColor: isHighAttendance
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isMidAttendance
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                              color: isHighAttendance
                                ? '#059669'
                                : isMidAttendance
                                ? '#d97706'
                                : '#dc2626',
                            }}
                          >
                            <span>{s.attendance.rate}%</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            ح: {s.attendance.present} | ت: {s.attendance.late} | غ: {s.attendance.absent}
                          </div>
                        </td>

                        {/* Dinars */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2 font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="دنانير مكتسبة">
                              +{s.dinars.gained}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold" title="دنانير مخصومة">
                              -{s.dinars.lost}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            الصافي: <strong className="text-foreground">{s.dinars.net}</strong> د.أ
                          </div>
                        </td>

                        {/* Recitations in Period */}
                        <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                          {s.recitation.surahs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {s.recitation.surahs.map((surah) => (
                                <span
                                  key={surah.number}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                  title={`سمع ${surah.ayahsRecited} آية من إجمالي ${surah.surahTotalAyahs} آية بالسورة (${surah.percent}%) خلال هذه الفترة`}
                                >
                                  <span>{surah.name}</span>
                                  <span className="font-mono text-[10px] opacity-90">({surah.percent}%)</span>
                                </span>
                              ))}
                              <span className="text-[10px] text-muted-foreground font-mono mr-1">
                                ({s.recitation.totalAyahs} آية)
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">
                              لم يسمع في هذه الفترة
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              نسب التسميع محتسبة <strong>حصراً للآيات المسمعة ضمن هذا التاريخ المحدد</strong> مقارنة بإجمالي السورة.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              إغلاق
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || !report}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>تصدير Excel (CSV)</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
