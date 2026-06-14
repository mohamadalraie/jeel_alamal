'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap, Users, BookOpen, Building2, BarChart3 } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useInstitute } from './institute-context';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/dashboard/statistics', labelKey: 'statistics', icon: BarChart3 },
  { href: '/dashboard/institutes', labelKey: 'institutes', icon: Building2, superAdminOnly: true },
  { href: '/dashboard/teachers', labelKey: 'teachers', icon: GraduationCap },
  { href: '/dashboard/students', labelKey: 'students', icon: Users },
  { href: '/dashboard/classes', labelKey: 'classes', icon: BookOpen },
];

/**
 * Navigation links shared by the desktop sidebar and the mobile drawer.
 * `onNavigate` lets the mobile drawer close itself on selection.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('dashboard');
  const pathname = usePathname();
  const { user } = useInstitute();

  const items = ITEMS.filter(
    (i) => !i.superAdminOnly || user.role === 'super_admin',
  );

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
