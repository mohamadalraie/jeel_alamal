import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

/** Friendly empty state: icon + message + optional action (spec 006). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <Icon className="size-9 opacity-40" />
      <p className="text-sm">{title}</p>
      {action}
    </div>
  );
}
