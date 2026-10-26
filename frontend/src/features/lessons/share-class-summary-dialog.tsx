'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Share2,
  Copy,
  Check,
  Download,
  School,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { formatTeacherName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notify } from '@/lib/toast';

export interface ClassGroupSummary {
  classKey: string;
  className: string;
  classId?: string;
  entries: ProgramEntry[];
  total: number;
  completed: number;
  started: number;
  pending: number;
  notGiven: number;
  completionRate: number;
  teachers: string[];
}

export function ShareClassSummaryDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ClassGroupSummary | null;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!group) return null;

  const teacherNames =
    group.teachers.length > 0
      ? group.teachers.map((teach) => formatTeacherName(teach)).join('، ')
      : 'غير محدد';

  // Build formatted text for WhatsApp
  const buildWhatsAppText = () => {
    const lines: string[] = [
      `🌿 *معهد جيل العمل • تقرير إنجاز الحلقة* 🌿`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📖 *الحلقة:* ${group.className}`,
      `👤 *المعلّم:* ${teacherNames}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📊 *نسبة الإنجاز:* ${group.completionRate}%`,
      `✅ *دروس مكتملة:* ${group.completed} من أصل ${group.total}`,
    ];

    if (group.started > 0) lines.push(`⚡ *قيد الإعطاء:* ${group.started}`);
    if (group.pending > 0) lines.push(`⏳ *في الانتظار:* ${group.pending}`);
    if (group.notGiven > 0) lines.push(`❌ *لم تُعطَ:* ${group.notGiven}`);

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📚 *جدول الدروس:*`);

    group.entries.forEach((entry, idx) => {
      const statusEmoji =
        entry.status === 'finished' ||
        entry.status === 'over_time' ||
        entry.status === 'under_time'
          ? '✅'
          : entry.status === 'started'
          ? '⚡'
          : entry.status === 'not_given'
          ? '❌'
          : '⏳';

      const title =
        entry.name ||
        entry.subjectName ||
        entry.category?.name ||
        'درس مجدول';

      lines.push(`${idx + 1}. ${statusEmoji} ${title} (${entry.date})`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`جيل العمل • معاً نحو جيلٍ قرآنيٍ واعٍ`);

    return lines.join('\n');
  };

  const handleCopyText = async () => {
    try {
      const text = buildWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify.success(t('summaryCopiedSuccess'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify.error(tc('error'));
    }
  };

  const handleShareNative = async () => {
    const text = buildWhatsAppText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `تقرير حلقة ${group.className}`,
          text,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      await handleCopyText();
    }
  };

  // Generate high-resolution image card on canvas
  const handleDownloadImage = useCallback(() => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1000;
      const baseHeight = 650;
      const lessonRowHeight = 44;
      const maxLessons = Math.min(group.entries.length, 8);
      const height = baseHeight + maxLessons * lessonRowHeight;

      canvas.width = width;
      canvas.height = height;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0f172a'); // slate-900
      bgGrad.addColorStop(0.5, '#091522');
      bgGrad.addColorStop(1, '#061019');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle top glow
      const glowGrad = ctx.createRadialGradient(
        width / 2,
        0,
        10,
        width / 2,
        0,
        600
      );
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)'); // emerald glow
      glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, 400);

      // Frame border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';

      // Header Brand
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('معهد جيل العمل القرآني 🌿', width - 70, 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('تقرير إنجاز ومتابعة الحلقة', width - 70, 115);

      // Class Name Big
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText(`حلقة: ${group.className}`, width - 70, 175);

      // Teacher Name
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.fillText(`المعلّم: ${teacherNames}`, width - 70, 215);

      // Stat Cards Row
      const statsY = 260;
      const statsH = 100;
      const cardW = 200;
      const gap = 20;

      const stats = [
        { label: 'نسبة الإنجاز', val: `${group.completionRate}%`, color: '#10b981' },
        { label: 'الدروس المنجزة', val: `${group.completed}`, color: '#34d399' },
        { label: 'في الانتظار', val: `${group.pending}`, color: '#f59e0b' },
        { label: 'إجمالي الدروس', val: `${group.total}`, color: '#38bdf8' },
      ];

      stats.forEach((st, idx) => {
        const x = width - 70 - (idx + 1) * cardW - idx * gap + cardW;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x - cardW, statsY, cardW, statsH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeRect(x - cardW, statsY, cardW, statsH);

        ctx.fillStyle = st.color;
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText(st.val, x - 20, statsY + 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '15px system-ui, -apple-system, sans-serif';
        ctx.fillText(st.label, x - 20, statsY + 82);
      });

      // Lessons Section Header
      const lessonsStartY = statsY + statsH + 50;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('قائمة الدروس والمقررات:', width - 70, lessonsStartY);

      // Lesson Rows
      group.entries.slice(0, maxLessons).forEach((entry, idx) => {
        const rowY = lessonsStartY + 25 + (idx + 1) * lessonRowHeight;

        // Alternating row background
        ctx.fillStyle =
          idx % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)';
        ctx.fillRect(70, rowY - 30, width - 140, 36);

        const title =
          entry.name ||
          entry.subjectName ||
          entry.category?.name ||
          'درس مجدول';

        const isDone =
          entry.status === 'finished' ||
          entry.status === 'over_time' ||
          entry.status === 'under_time';

        ctx.fillStyle = isDone ? '#10b981' : '#f59e0b';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(isDone ? '✓ مكتمل' : '⏳ في الانتظار', 160, rowY - 6);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${idx + 1}. ${title}`, width - 90, rowY - 6);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText(entry.date, width - 420, rowY - 6);
      });

      // Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `تم استخراج التقرير في ${new Date().toLocaleDateString('ar-EG')}`,
        width - 70,
        height - 50
      );

      // Convert and download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `تقرير_حلقة_${group.className.replace(/\s+/g, '_')}.png`;
      a.click();
      notify.success(t('summaryImageDownloaded'));
    } catch {
      notify.error(tc('error'));
    } finally {
      setDownloading(false);
    }
  }, [group, teacherNames, t, tc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Share2 className="text-primary size-5" />
            {t('shareClassSummaryTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t('shareClassSummaryDesc', { className: group.className })}
          </DialogDescription>
        </DialogHeader>

        {/* Visual Preview Card (High Aesthetics) */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-5 text-white shadow-lg">
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-emerald-400">
                🌿 معهد جيل العمل القرآني
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                حلقة: {group.className}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                المعلّم: {teacherNames}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-400">نسبة الإنجاز</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">
                {group.completionRate}%
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 py-3.5 text-center">
            <div className="rounded-xl bg-white/5 p-2 border border-white/10">
              <span className="text-[11px] text-slate-300 block">المكتملة</span>
              <span className="text-lg font-bold text-emerald-400">{group.completed}</span>
            </div>
            <div className="rounded-xl bg-white/5 p-2 border border-white/10">
              <span className="text-[11px] text-slate-300 block">في الانتظار</span>
              <span className="text-lg font-bold text-amber-400">{group.pending}</span>
            </div>
            <div className="rounded-xl bg-white/5 p-2 border border-white/10">
              <span className="text-[11px] text-slate-300 block">الإجمالي</span>
              <span className="text-lg font-bold text-sky-400">{group.total}</span>
            </div>
          </div>

          {/* Mini list of lessons */}
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            <span className="text-xs font-semibold text-slate-300 block mb-1">
              الدروس الأخيرة:
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs">
              {group.entries.slice(0, 6).map((entry, idx) => {
                const isDone =
                  entry.status === 'finished' ||
                  entry.status === 'over_time' ||
                  entry.status === 'under_time';

                const title =
                  entry.name ||
                  entry.subjectName ||
                  entry.category?.name ||
                  'درس مجدول';

                return (
                  <div
                    key={entry.lessonClassId || idx}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isDone ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="size-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate text-slate-200">{title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {entry.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="size-3.5 text-primary" />
            <span>{t('downloadSummaryImage')}</span>
          </Button>

          <Button
            type="button"
            onClick={handleCopyText}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                <span>{t('summaryCopied')}</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>{t('copyWhatsAppSummary')}</span>
              </>
            )}
          </Button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleShareNative}
              className="gap-1.5 text-xs font-semibold"
            >
              <Share2 className="size-3.5" />
              <span>{t('shareViaApp')}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
