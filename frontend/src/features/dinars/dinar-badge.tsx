'use client';

import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** A signed dinar amount pill: success tokens when positive, destructive when negative. */
export function DinarBadge({
  amount,
  className,
  showIcon = true,
}: {
  amount: number;
  className?: string;
  showIcon?: boolean;
}) {
  const negative = amount < 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        negative
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-success/30 bg-success/10 text-success',
        className,
      )}
    >
      {showIcon && <Coins data-icon="inline-start" />}
      <bdi className="font-semibold tabular-nums">
        {amount > 0 ? '+' : ''}
        {amount}
      </bdi>
    </Badge>
  );
}
