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

function renderCell<T>(col: Column<T>, row: T): React.ReactNode {
  return col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? '');
}

/**
 * One reusable data table for every list page (constitution V). Renders a
 * table on ≥sm and stacked cards on mobile (spec 006). Rows are clickable; an
 * optional `actions` column/footer is rendered per row.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
}) {
  const td = useTranslations('dashboard');

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="border-border hidden overflow-x-auto rounded-lg border sm:block">
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
                    {renderCell(c, row)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={`border-border bg-card flex flex-col gap-2 rounded-xl border p-4 ${
              onRowClick ? 'active:bg-muted/50' : ''
            }`}
          >
            {columns.map((c, i) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                {i === 0 ? (
                  <span className="font-semibold">{renderCell(c, row)}</span>
                ) : (
                  <>
                    <span className="text-muted-foreground text-xs">{c.header}</span>
                    <span className="text-sm">{renderCell(c, row)}</span>
                  </>
                )}
              </div>
            ))}
            {actions && (
              <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
