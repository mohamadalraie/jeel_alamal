'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Coins, Undo2 } from 'lucide-react';
import type { DinarLedgerItem } from '@/lib/types';
import { reverseDinar } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useStudentDinars, useQueryClient, qk } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { DinarBadge } from './dinar-badge';
import { AwardDinarDialog } from './award-dinar-dialog';

const MANUAL = new Set(['manual_rule', 'exceptional']);

/** Student profile "الدنانير" tab: balance summary + ledger. */
export function StudentDinarsView({
  studentId,
  instituteId,
  studentName,
  canManage = false,
}: {
  studentId: string;
  instituteId?: string;
  studentName?: string;
  canManage?: boolean;
}) {
  const t = useTranslations('dinars');
  const locale = useLocale();
  const qc = useQueryClient();
  const { data, isLoading } = useStudentDinars(studentId);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.studentDinars(studentId) });

  if (isLoading || !data) return <ListSkeleton />;
  const { summary, ledger } = data;

  return (
    <div className="flex flex-col gap-4">
      {canManage && instituteId && (
        <div className="flex justify-end">
          <AwardDinarDialog
            instituteId={instituteId}
            students={[{ id: studentId, name: studentName ?? '' }]}
            onDone={refresh}
          />
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="text-muted-foreground text-xs">{t('balance')}</span>
            <span
              className={`text-2xl font-bold tabular-nums ${summary.net < 0 ? 'text-destructive' : ''}`}
            >
              <bdi>{summary.net}</bdi>
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="text-muted-foreground text-xs">{t('positive')}</span>
            <span className="text-xl font-semibold tabular-nums">
              <bdi>+{summary.positive}</bdi>
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="text-muted-foreground text-xs">{t('negative')}</span>
            <span className="text-xl font-semibold tabular-nums">
              <bdi>{summary.negative}</bdi>
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Ledger */}
      {ledger.length === 0 ? (
        <EmptyState icon={Coins} title={t('noEntries')} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {ledger.map((item) => (
            <LedgerRow
              key={item.id}
              item={item}
              locale={locale}
              canManage={canManage}
              onReverse={refresh}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LedgerRow({
  item,
  locale,
  canManage,
  onReverse,
  t,
}: {
  item: DinarLedgerItem;
  locale: string;
  canManage: boolean;
  onReverse: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const reversible =
    canManage && MANUAL.has(item.sourceType) && !item.reversedAt && !item.reversesId;

  return (
    <Card>
      <CardContent
        className={`flex items-center justify-between gap-2 py-2.5 ${item.reversedAt ? 'opacity-60' : ''}`}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={`truncate text-sm font-medium ${item.reversedAt ? 'line-through' : ''}`}
          >
            {item.label}
          </span>
          <span className="text-muted-foreground text-xs">
            {t(`context_${item.context}`)}
            {item.awardedByName ? ` · ${item.awardedByName}` : ''} ·{' '}
            {new Date(item.createdAt).toLocaleDateString(locale)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DinarBadge amount={item.amount} showIcon={false} />
          {reversible && (
            <ConfirmDialog
              title={t('reverse')}
              message={t('reverseMsg')}
              onConfirm={async () => {
                try {
                  await reverseDinar(item.id);
                  onReverse();
                } catch (err) {
                  notify.error(err, t('reverseFailed'));
                }
              }}
              trigger={
                <Button variant="ghost" size="icon" className="size-7" aria-label={t('reverse')}>
                  <Undo2 className="size-4" />
                </Button>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
