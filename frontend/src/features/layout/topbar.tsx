'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Menu, LogOut, Building2, ChevronDown } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { logout, resolveAsset } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocaleSwitcher } from '@/features/locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { SidebarNav } from './sidebar-nav';
import { useInstitute } from './institute-context';

/**
 * Top bar: mobile menu trigger, the selected-institute picker (the tenant
 * context for every page), theme + locale controls, and the user menu.
 */
export function Topbar() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const router = useRouter();
  const locale = useLocale();
  const { user, institutes, selected, selectInstitute } = useInstitute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Drawer opens from the start side: right in Arabic (RTL), left in English.
  const drawerSide = locale === 'ar' ? 'right' : 'left';

  return (
    <header className="bg-card border-border sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3 sm:px-4">
      {/* Mobile drawer trigger */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side={drawerSide} className="bg-sidebar w-72 p-0">
          <SheetHeader className="p-4">
            <SheetTitle className="text-sidebar-foreground">
              {tc('appName')}
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <span className="text-secondary dark:text-primary hidden text-lg font-bold sm:inline">
        {tc('appName')}
      </span>

      {/* Selected institute picker */}
      <div className="flex flex-1 items-center justify-center sm:justify-start sm:ps-4">
        {institutes.length > 0 && (
          <Select value={selected?.id ?? ''} onValueChange={selectInstitute}>
            <SelectTrigger className="h-9 max-w-[16rem] gap-2">
              {(() => {
                const src = resolveAsset(selected?.logoUrl);
                return src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    className="size-5 shrink-0 rounded object-cover"
                  />
                ) : (
                  <Building2 className="text-primary size-4 shrink-0" />
                );
              })()}
              <SelectValue placeholder={t('selectInstitute')} />
            </SelectTrigger>
            <SelectContent>
              {institutes.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LocaleSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <span className="hidden max-w-[8rem] truncate sm:inline">
                {user.firstName} {user.lastName}
              </span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {tr(user.role)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout().catch(() => undefined);
                router.replace('/login');
              }}
            >
              <LogOut className="size-4" />
              {tc('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
