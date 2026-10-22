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
  X,
  ChevronDown,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { downloadStudentsAchievementExcel } from '@/lib/api';
import type { StudentAchievementItem, StudentsAchievementReportResponse } from '@/lib/types';
import { GradeLabel } from '@/features/shared/grade-select';
import { notify } from '@/lib/toast';

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
  const [downloadingExcel, setDownloadingExcel] = useState(false);

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

  // Filter students by name/username/grade/class
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

  // Professional Excel Download (.xlsx) via backend ExcelJS engine
  const handleExportExcel = async () => {
    try {
      setDownloadingExcel(true);
      await downloadStudentsAchievementExcel(instituteId, {
        startDate,
        endDate,
        classId: classId === 'all' ? undefined : classId,
        track,
      });
      notify.success('تم تصدير ملف الإكسل المنسق بنجاح');
    } catch (err) {
      notify.error('حدث خطأ أثناء تنزيل ملف الإكسل، جاري التصدير بصيغة CSV كبديل');
      handleExportCsv();
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Export to CSV with UTF-8 BOM
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
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Arial, sans-serif; margin: 0; color: #0f172a; font-size: 11px; direction: rtl; }
          .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
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

      {/* 
        Responsive Dialog Content:
        On Mobile: takes full screen inset-0 with h-[100dvh] so nothing gets clipped off-screen!
        On Desktop (sm:): centered dialog with sm:max-w-5xl sm:max-h-[90vh] rounded-2xl
      */}
      <DialogContent
        showCloseButton={false}
        className="fixed inset-auto top-2 bottom-2 left-2 right-2 translate-y-0 translate-x-0 w-auto max-h-[calc(100vh-1rem)] max-h-[calc(100dvh-1rem)] sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-5xl sm:h-[88vh] sm:max-h-[88vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden z-50 border shadow-2xl"
      >
        {/* Sticky Header with Title and Quick Actions */}
        <div className="sticky top-0 z-30 bg-card border-b px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                تقرير إنجاز الطلاب
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                حساب الحضور، الدنانير المكتسبة والمخصومة، ونسب السور المسمعة خلال الفترة المحددة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Export Button in Header for instant access */}
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || !report || downloadingExcel}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 shadow-sm"
              title="تصدير ملف إكسل منسق وجاهز للقراءة"
            >
              {downloadingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>تصدير Excel</span>
            </Button>

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* 
          Main Scrollable Body:
          min-h-0 and touch-scroll ensure smooth scrolling on all WebKit / mobile browsers!
        */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll p-3 sm:p-5 space-y-4">
          {/* Filter Card */}
          <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-3 shadow-xs">
            {/* Horizontal scrollable presets row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1 me-1">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>المدة:</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant={preset === 'last30' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('last30')}
              >
                آخر شهر (30 يوماً)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={preset === 'thisMonth' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('thisMonth')}
              >
                هذا الشهر
              </Button>
              <Button
                type="button"
                size="sm"
                variant={preset === 'lastMonth' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('lastMonth')}
              >
                الشهر الماضي
              </Button>
              <Button
                type="button"
                size="sm"
                variant={preset === 'last14' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('last14')}
              >
                آخر أسبوعين
              </Button>
              <Button
                type="button"
                size="sm"
                variant={preset === 'last90' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('last90')}
              >
                آخر 3 أشهر
              </Button>
              <Button
                type="button"
                size="sm"
                variant={preset === 'custom' ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-3 shrink-0"
                onClick={() => handleSelectPreset('custom')}
              >
                تاريخ مخصص
              </Button>
            </div>

            {/* Date Inputs & Selects Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">من تاريخ:</label>
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
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">إلى تاريخ:</label>
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
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">الحلقة:</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="h-8 text-xs w-full">
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

              {/* Track filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">المسار:</label>
                {intensiveTrackEnabled ? (
                  <Select value={track} onValueChange={(v) => setTrack(v as any)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المسارات</SelectItem>
                      <SelectItem value="regular">الأساسي فقط</SelectItem>
                      <SelectItem value="intensive">المكثف فقط</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8 px-2 flex items-center text-xs text-muted-foreground bg-muted/40 rounded-lg border">
                    الأساسي
                  </div>
                )}
              </div>
            </div>

            {/* Student Search */}
            <div className="relative pt-1">
              <Search className="absolute right-2.5 top-3.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث عن طالب بالاسم، اسم المستخدم، أو الحلقة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pr-8"
              />
            </div>
          </div>

          {/* KPI Summary Cards */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="h-3 w-3 text-sky-500" />
                  <span>الطلاب</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5">{report.totalStudents}</p>
              </div>

              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Percent className="h-3 w-3 text-blue-500" />
                  <span>متوسط الحضور</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5 text-blue-600 dark:text-blue-400">
                  {report.summary.averageAttendanceRate}%
                </p>
              </div>

              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span>دنانير مكتسبة</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5 text-emerald-600 dark:text-emerald-400 font-mono">
                  +{report.summary.totalDinarsGained}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                  <span>دنانير مخصومة</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5 text-rose-600 dark:text-rose-400 font-mono">
                  -{report.summary.totalDinarsLost}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Coins className="h-3 w-3 text-amber-500" />
                  <span>صافي الدنانير</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5 text-amber-600 dark:text-amber-400 font-mono">
                  {report.summary.totalDinarsGained - report.summary.totalDinarsLost}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-2.5 text-center shadow-2xs">
                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <BookOpen className="h-3 w-3 text-purple-500" />
                  <span>آيات مسمعة</span>
                </span>
                <p className="font-bold text-base sm:text-lg mt-0.5 text-purple-600 dark:text-purple-400 font-mono">
                  {report.summary.totalAyahsRecited}
                </p>
              </div>
            </div>
          )}

          {/* Student Data Section */}
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs sm:text-sm">جاري احتساب نسب التسميع والحضور والدنانير...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">لا توجد بيانات مطابقة للفترة المحددة</p>
              <p className="text-xs">جرب اختيار فترة زمنية أخرى أو حلقة مختلفة</p>
            </div>
          ) : (
            <div>
              {/* 
                MOBILE VIEW: Elegant responsive cards (< sm)
              */}
              <div className="block sm:hidden space-y-2.5">
                {filteredStudents.map((s, idx) => {
                  const isHighAtt = s.attendance.rate >= 85;
                  const isMidAtt = s.attendance.rate >= 70 && s.attendance.rate < 85;

                  return (
                    <div
                      key={s.studentId}
                      className="rounded-xl border bg-card p-3 shadow-2xs space-y-2.5 text-xs"
                    >
                      {/* Top Row: Name, Class, Track */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-sm">{s.name}</span>
                            {s.track === 'intensive' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Zap className="h-2.5 w-2.5 fill-amber-500" />
                                <span>مكثف</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{s.className}</span>
                            <span>•</span>
                            <span dir="ltr">@{s.username}</span>
                            {s.schoolGrade && (
                              <>
                                <span>•</span>
                                <GradeLabel grade={s.schoolGrade} />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Attendance Badge */}
                        <div
                          className="shrink-0 px-2 py-0.5 rounded-full font-bold text-xs"
                          style={{
                            backgroundColor: isHighAtt
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isMidAtt
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: isHighAtt
                              ? '#059669'
                              : isMidAtt
                              ? '#d97706'
                              : '#dc2626',
                          }}
                        >
                          {s.attendance.rate}% حضور
                        </div>
                      </div>

                      {/* Middle Row: Dinars & Attendance Breakdown */}
                      <div className="grid grid-cols-2 gap-2 bg-muted/20 rounded-lg p-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">الدنانير في المدة:</span>
                          <div className="font-mono mt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{s.dinars.gained}</span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold">-{s.dinars.lost}</span>
                            <span className="text-muted-foreground mx-1">(صافي: {s.dinars.net})</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[10px]">تفصيل الجلسات:</span>
                          <span className="font-mono text-muted-foreground mt-0.5 block">
                            ح: {s.attendance.present} | ت: {s.attendance.late} | غ: {s.attendance.absent}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Recitations in period */}
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium block mb-1">
                          التسميعات في هذه الفترة:
                        </span>
                        {s.recitation.surahs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {s.recitation.surahs.map((surah) => (
                              <span
                                key={surah.number}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              >
                                <span>{surah.name}</span>
                                <span className="font-mono text-[9.5px]">({surah.percent}%)</span>
                              </span>
                            ))}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({s.recitation.totalAyahs} آية)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10.5px] italic">
                            لم يسمع خلال هذه الفترة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 
                DESKTOP VIEW: Full Wide Data Table (>= sm)
              */}
              <div className="hidden sm:block border rounded-xl overflow-hidden bg-card shadow-xs">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground border-b font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">الطالب</th>
                      <th className="py-2.5 px-3">الحلقة</th>
                      <th className="py-2.5 px-3 text-center">نسبة الحضور</th>
                      <th className="py-2.5 px-3 text-center">الدنانير (+ / -)</th>
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
                          <td className="py-2.5 px-3 font-mono text-muted-foreground text-center">
                            {idx + 1}
                          </td>

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
                            <div
                              className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs"
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
                              الصافي: <strong className="text-foreground font-mono">{s.dinars.net}</strong> د.أ
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
                                    title={`سمع ${surah.ayahsRecited} آية من أصل ${surah.surahTotalAyahs} بالسورة (${surah.percent}%) في هذه الفترة`}
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
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-30 bg-card border-t px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="hidden sm:inline">
              نسب التسميع محتسبة <strong>حصراً للآيات المسمعة ضمن هذا التاريخ المحدد</strong> مقارنة بإجمالي السورة.
            </span>
            <span className="sm:hidden font-medium">
              الطلاب: <strong>{filteredStudents.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading || !report}
              className="gap-1.5 h-8 text-xs"
              title="طباعة التقرير"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || !report}
              className="gap-1.5 h-8 text-xs"
              title="تصدير كملف CSV"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || !report || downloadingExcel}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-8 text-xs shadow-xs"
            >
              {downloadingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              <span>تصدير Excel (.xlsx)</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
