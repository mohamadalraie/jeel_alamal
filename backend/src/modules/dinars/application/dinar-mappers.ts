import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { DinarLedgerItem } from './dto/dinar.dto';

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
  awardedByName: txn.awardedBy ? nameOf(txn.awardedBy) : null,
  reversesId: txn.reversesId,
  reversedAt: txn.reversedAt ? txn.reversedAt.toISOString() : null,
  createdAt: txn.createdAt.toISOString(),
});
