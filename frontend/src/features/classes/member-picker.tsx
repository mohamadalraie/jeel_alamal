'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Select-one-and-add control, reused for adding class teachers/students. */
export function MemberPicker({
  options,
  placeholder,
  actionLabel,
  onAdd,
}: {
  options: { id: string; name: string }[];
  placeholder: string;
  actionLabel: string;
  onAdd: (id: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  if (options.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={!selected || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd(selected);
            setSelected('');
          } finally {
            setBusy(false);
          }
        }}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
