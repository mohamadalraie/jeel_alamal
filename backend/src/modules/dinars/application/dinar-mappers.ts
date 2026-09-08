import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { DinarLedgerItem } from './dto/dinar.dto';

function formatTeacherName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('الأستاذ') ||
    trimmed.startsWith('الاستاذ') ||
    trimmed.startsWith('الشيخ') ||
    trimmed.startsWith('أ.') ||
    trimmed.startsWith('د.')
  ) {
    return trimmed;
  }
  return `الأستاذ ${trimmed}`;
}

/** Map a transaction to its ledger view, resolving the awarding staff name. */
export const toLedgerItem = (
  txn: DinarTransaction,
  nameOf: (userId: string) => string,
): DinarLedgerItem => ({
  id: txn.id,
  amount: txn.amount,
  context: txn.context,
  sourceType: txn.sourceType,
  label: txn.label,
  awardedByName: txn.awardedBy ? formatTeacherName(nameOf(txn.awardedBy)) : null,
  reversesId: txn.reversesId,
  reversedAt: txn.reversedAt ? txn.reversedAt.toISOString() : null,
  createdAt: txn.createdAt.toISOString(),
});
