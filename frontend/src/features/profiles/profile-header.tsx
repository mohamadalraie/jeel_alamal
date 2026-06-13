'use client';

import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Initials from a full name (first letters of the first two words). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');
}

/**
 * Friendly profile header: back button, an initials avatar, the person's name,
 * username, and a role/section badge. Shared by teacher & student profiles.
 */
export function ProfileHeader({
  name,
  username,
  badge,
  backHref,
}: {
  name: string;
  username: string;
  badge: string;
  backHref: string;
}) {
  const locale = useLocale();
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild aria-label="back">
        <Link href={backHref}>
          <Back />
        </Link>
      </Button>
      <div className="bg-primary/15 text-primary grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-bold">
        {initials(name)}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{name}</h1>
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <span className="text-muted-foreground text-sm" dir="ltr">
          @{username}
        </span>
      </div>
    </div>
  );
}
