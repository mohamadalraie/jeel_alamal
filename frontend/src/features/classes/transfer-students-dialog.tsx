'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRightLeft, Check, Loader2, Users } from 'lucide-react';
import type { ClassItem } from '@/lib/types';
import { listClasses, transferClassStudents, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface StudentInfo {
  id: string;
  name: string;
}

interface TransferStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instituteId: string;
  sourceClass: {
    id: string;
    name: string;
    isIntensive: boolean;
  };
  selectedStudents: StudentInfo[];
  onSuccess: () => void;
}

export function TransferStudentsDialog({
  open,
  onOpenChange,
  instituteId,
  sourceClass,
  selectedStudents,
  onSuccess,
}: TransferStudentsDialogProps) {
  const tc = useTranslations('common');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTargetClassId('');
      setError(null);
      return;
    }

    setLoadingClasses(true);
    listClasses(instituteId, sourceClass.isIntensive ? 'intensive' : 'regular')
      .then((data) => {
        // Exclude current class
        const available = data.filter((c) => c.id !== sourceClass.id);
        setClasses(available);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [open, instituteId, sourceClass.id, sourceClass.isIntensive]);

  const handleTransfer = async () => {
    if (!targetClassId || selectedStudents.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const res = await transferClassStudents(sourceClass.id, {
        studentIds: selectedStudents.map((s) => s.id),
        targetClassId,
      });

      const count = res?.transferredCount ?? selectedStudents.length;
      notify.success(
        count === 1
          ? 'تم نقل الطالب بنجاح إلى الحلقة الجديدة'
          : `تم نقل ${count} طلاب بنجاح إلى الحلقة الجديدة`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'فشل نقل الطلاب. يرجى المحاولة لاحقاً.';
      setError(msg);
      notify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const isSingle = selectedStudents.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <ArrowRightLeft className="h-5 w-5" />
            </span>
            <span>
              {isSingle ? 'نقل الطالب إلى حلقة أخرى' : `نقل ${selectedStudents.length} طلاب إلى حلقة أخرى`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Current Class and Target Info */}
          <div className="rounded-xl border bg-muted/40 p-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">الحلقة الحالية:</span>
              <span className="font-semibold text-foreground">{sourceClass.name}</span>
            </div>
            {sourceClass.isIntensive && (
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                <span>مسار الحلقة:</span>
                <span className="font-semibold">المسار المكثف</span>
              </div>
            )}
          </div>

          {/* Students List Display */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {isSingle ? 'الطالب المحدد:' : `الطلاب المحددون (${selectedStudents.length}):`}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 rounded-lg border bg-background/50">
              {selectedStudents.map((s) => (
                <Badge
                  key={s.id}
                  variant="secondary"
                  className="px-2.5 py-1 text-xs font-medium gap-1"
                >
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span>{s.name}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Destination Class Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="target-class-select" className="text-xs font-semibold text-foreground">
              اختر الحلقة الوجهة للنقل:
            </label>
            {loadingClasses ? (
              <div className="flex items-center justify-center p-3 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>جاري تحميل الحلقات المتاحة...</span>
              </div>
            ) : classes.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                لا توجد حلقات {sourceClass.isIntensive ? 'مكثفة' : 'أساسية'} أخرى متاحة لنقل الطلاب إليها.
              </p>
            ) : (
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger id="target-class-select" className="w-full">
                  <SelectValue placeholder="-- اختر الحلقة المستهدفة --" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Context Explainer */}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            * ستبقى جميع تسميعات الطالب ودنانيره وسجل الحضور السابق محفوظة كما هي دون حذف.
          </p>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 font-medium">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {tc('cancel') || 'إلغاء'}
          </Button>
          <Button
            type="button"
            onClick={handleTransfer}
            disabled={!targetClassId || busy || classes.length === 0}
            className="gap-2 font-medium"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري النقل...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>تأكيد النقل</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
