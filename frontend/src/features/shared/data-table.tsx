'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer; defaults to String(row[key]). */
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * One reusable data table for every list page (constitution V — no duplication).
 * Rows are clickable; an optional `actions` column is rendered at the end.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  actions,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  empty?: string;
}) {
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');

  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">{empty ?? tc('noData')}</p>;
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
            {actions && <TableHead className="text-end">{td('actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </TableCell>
              ))}
              {actions && (
                <TableCell
                  className="text-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions(row)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
