import { Button } from '@/components/ui/button';
import { RAGFlowTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { NavItem, useActiveNavigation } from './navigation';
import { useSidebarCollapse } from './use-sidebar-collapse';

function NavItemTooltip({
  children,
  collapsed,
  label,
}: PropsWithChildren<{ collapsed: boolean; label: string }>) {
  if (!collapsed) {
    return children;
  }

  return (
    <RAGFlowTooltip asChild tooltip={label}>
      {children}
    </RAGFlowTooltip>
  );
}

export function NavItemLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const { activeNavKey } = useActiveNavigation();
  const { collapsed } = useSidebarCollapse();
  const isActive = activeNavKey === item.key;
  const Icon = item.icon;

  return (
    <NavItemTooltip collapsed={collapsed} label={t(item.labelKey)}>
      <Button
        asLink
        to={item.path}
        block
        variant="ghost"
        aria-label={t(item.labelKey)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'h-10 justify-start gap-2.5 px-3 text-base',
          collapsed
            ? 'size-10 justify-center p-0'
            : 'max-md:size-10 max-md:justify-center max-md:p-0',
          isActive && 'bg-bg-card text-text-primary',
        )}
      >
        <Icon className="size-5 shrink-0 stroke-[1.5]" />
        <span className={cn('hidden truncate', !collapsed && 'md:inline')}>
          {t(item.labelKey)}
        </span>
      </Button>
    </NavItemTooltip>
  );
}
